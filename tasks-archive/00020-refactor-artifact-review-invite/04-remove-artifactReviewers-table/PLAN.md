# Plan: Remove artifactReviewers Table

## Problem Summary

There are TWO parallel systems for managing reviewer access:
1. **access.ts** - Uses `artifactAccess` + `userInvites` tables (CORRECT, actively used)
2. **sharing.ts** - Uses `artifactReviewers` table (LEGACY, table is EMPTY, must be removed)

The frontend calls `api.sharing.getUserPermission` which queries the empty `artifactReviewers` table, causing "access denied" for invited users who have valid `artifactAccess` records.

## Root Cause

- `ArtifactViewerPage.tsx` line 32: calls `api.sharing.getUserPermission`
- `sharing.ts` line 256: queries `artifactReviewers` table which is EMPTY
- Users have records in `artifactAccess` table but NOT in `artifactReviewers`
- Result: Permission check returns `null` instead of `"can-comment"`

## Solution Overview

Replace all uses of `sharing.ts` functions with equivalent `access.ts` functions:

| Old (sharing.ts) | New (access.ts) | Status |
|-----------------|-----------------|---------|
| `getUserPermission` | `getPermission` | Direct replacement |
| `inviteReviewer` | `grant` | Direct replacement |
| `removeReviewer` | `revoke` | Direct replacement |
| `getReviewers` | `listReviewers` | Direct replacement |

## Files to Delete

1. `/app/convex/sharing.ts` - Entire file (538 lines)
2. `/app/convex/__tests__/sharing.test.ts` - Entire test file (1192 lines)
3. Schema: Remove `artifactReviewers` table from `/app/convex/schema.ts`

## Files to Modify

### 1. Frontend Components (2 files)

#### `/app/src/components/artifact/ArtifactViewerPage.tsx`
**Line 32:** Change from `api.sharing.getUserPermission` to `api.access.getPermission`

```typescript
// OLD (line 31-34):
const userPermission = useQuery(
  api.sharing.getUserPermission,
  artifact ? { artifactId: artifact._id } : "skip"
);

// NEW:
const userPermission = useQuery(
  api.access.getPermission,
  artifact ? { artifactId: artifact._id } : "skip"
);
```

#### `/app/src/components/artifact/ShareModal.tsx`
**Lines 49-59:** Change from `api.sharing.*` to `api.access.*`

```typescript
// OLD (lines 49-59):
const backendReviewers = useQuery(
  api.sharing.getReviewers,
  isOpen ? { artifactId: artifact._id } : "skip"
);
const inviteReviewer = useMutation(api.sharing.inviteReviewer);
const removeReviewer = useMutation(api.sharing.removeReviewer);

// NEW:
const backendReviewers = useQuery(
  api.access.listReviewers,
  isOpen ? { artifactId: artifact._id } : "skip"
);
const inviteReviewer = useMutation(api.access.grant);
const removeReviewer = useMutation(api.access.revoke);
```

**Lines 97-98:** Update mutation call to match new API

```typescript
// OLD:
await removeReviewer({
  reviewerId: id as Id<"artifactReviewers">,
});

// NEW:
await removeReviewer({
  accessId: id as Id<"artifactAccess">,
});
```

**CRITICAL:** The `ShareModal` expects reviewers in a specific shape. Need to verify `access.listReviewers` returns compatible data:

Expected shape (lines 21-29):
```typescript
interface Reviewer {
  _id: string;
  email: string;
  status: "pending" | "accepted";
  invitedAt: number;
  user?: {
    name?: string;
  } | null;
}
```

`access.listReviewers` returns (lines 361-370 in access.ts):
```typescript
{
  accessId: v.id("artifactAccess"),
  email: v.string(),
  displayName: v.string(),
  status: v.union(v.literal("pending"), v.literal("accepted")),
  sendCount: v.number(),
  lastSentAt: v.number(),
}
```

**Mismatch:** Need to adapt the data structure. Options:
- A. Update `ShareModal` to use new shape (better - aligns with new system)
- B. Create adapter in component (quick fix)

**Decision:** Update `ShareModal` to use new data shape (`accessId`, `displayName`, `lastSentAt` instead of `invitedAt`).

### 2. Permission Libraries (2 files)

#### `/app/convex/lib/permissions.ts`
**Lines 47-59:** Update `getArtifactPermission` to use `artifactAccess` instead of `artifactReviewers`

```typescript
// OLD (lines 46-59):
// Reviewer check
if (userId) {
  const reviewer = await ctx.db
    .query("artifactReviewers")
    .withIndex("by_artifactId_active", (q) =>
      q.eq("artifactId", artifactId).eq("isDeleted", false)
    )
    .filter((q) => q.eq(q.field("userId"), userId))
    .first();

  if (reviewer) {
    return "reviewer";
  }
}

// NEW:
// Reviewer check
if (userId) {
  const access = await ctx.db
    .query("artifactAccess")
    .withIndex("by_artifactId_userId", (q) =>
      q.eq("artifactId", artifactId).eq("userId", userId)
    )
    .unique();

  if (access && !access.isDeleted) {
    return "reviewer";
  }
}
```

**IMPORTANT:** Replace `.filter()` with index lookup (follows Convex rules - no filter in queries).

#### `/app/convex/lib/commentPermissions.ts`
**Lines 57-64:** Update `requireCommentPermission` to use `artifactAccess` instead of `artifactReviewers`

```typescript
// OLD (lines 54-69):
// Check if user is an invited reviewer
// NOTE: We use withIndex + .some() because there's no index on userId
// The by_artifact_active index narrows the search first
const reviewers = await ctx.db
  .query("artifactReviewers")
  .withIndex("by_artifactId_active", (q) =>
    q.eq("artifactId", artifact._id).eq("isDeleted", false)
  )
  .collect();

const isReviewer = reviewers.some((r) => r.userId === userId);
if (isReviewer) {
  return "can-comment";
}

// NEW:
// Check if user is an invited reviewer
const access = await ctx.db
  .query("artifactAccess")
  .withIndex("by_artifactId_userId", (q) =>
    q.eq("artifactId", artifact._id).eq("userId", userId)
  )
  .unique();

if (access && !access.isDeleted) {
  return "can-comment";
}
```

**IMPORTANT:** The new code uses the proper index (`by_artifactId_userId`) which is O(1) lookup instead of collecting all reviewers and filtering.

### 3. Schema

#### `/app/convex/schema.ts`
**Lines 486-603:** Remove entire `artifactReviewers` table definition

Delete from line 486 (`// ARTIFACT REVIEWERS TABLE`) through line 603 (end of table definition including all indexes).

## Data Migration

**None required** - The `artifactReviewers` table is confirmed EMPTY in production. No data to migrate.

## Testing Strategy

### Manual Testing
1. Create test artifact as User A
2. Invite User B via ShareModal
3. Verify User B receives email
4. Sign in as User B
5. Access artifact - should see "can-comment" permission (NOT access denied)
6. Add comment - should succeed
7. Sign in as User A
8. Verify User B appears in reviewers list in ShareModal

### Automated Tests
- All existing `access.ts` tests should continue to pass
- Remove `sharing.test.ts` entirely (it's already skipped)
- Verify no other tests reference `artifactReviewers` table

## Rollout Plan

1. **Deploy schema change** - Remove `artifactReviewers` table
2. **Deploy backend changes** - Remove `sharing.ts`
3. **Deploy frontend changes** - Update components to use `access` API
4. **Monitor** - Check error logs for any remaining references

## Risk Assessment

**Low Risk:**
- Table is EMPTY (confirmed)
- All logic already exists in `access.ts`
- Tests are already skipped (`.skip`)
- Direct 1:1 function replacements

**Rollback Plan:**
- If issues arise, revert schema change (re-add table definition)
- Revert component changes
- No data loss since table was empty

## Success Criteria

- [ ] `sharing.ts` deleted
- [ ] `sharing.test.ts` deleted
- [ ] `artifactReviewers` table removed from schema
- [ ] `ArtifactViewerPage` uses `api.access.getPermission`
- [ ] `ShareModal` uses `api.access.grant/revoke/listReviewers`
- [ ] `permissions.ts` uses `artifactAccess` table
- [ ] `commentPermissions.ts` uses `artifactAccess` table
- [ ] Invited users can access artifacts (manual test passes)
- [ ] No references to `artifactReviewers` in codebase
- [ ] All existing tests pass

## Implementation Order

1. Update `permissions.ts` (backend)
2. Update `commentPermissions.ts` (backend)
3. Update `ArtifactViewerPage.tsx` (frontend - critical fix)
4. Update `ShareModal.tsx` (frontend)
5. Remove `artifactReviewers` from schema
6. Delete `sharing.ts`
7. Delete `sharing.test.ts`
8. Deploy and test

This order ensures permission checks work immediately, then UI follows, then cleanup.
