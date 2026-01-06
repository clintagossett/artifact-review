# Step 2: Frontend Migration Plan

**Task:** Migrate frontend from `api.sharing.*` to `api.access.*`

## Status: ALREADY COMPLETE ✓

### Investigation Results

Searched the entire codebase for `api.sharing` references:
```bash
grep -r "api\.sharing" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.next
```

**Result:** No references found in any frontend files.

### Backend State

- `convex/sharing.ts` - DELETED ✓
- `convex/access.ts` - EXISTS with all required functions ✓
  - `getPermission({ artifactId })` → `"owner" | "can-comment" | null`
  - `grant({ artifactId, email })` → `v.id("artifactAccess")`
  - `revoke({ accessId })` → `v.null()`
  - `listReviewers({ artifactId })` → array of reviewer objects

### Remaining Cleanup

Found ONE outdated comment in `convex/schema.ts:141`:
```typescript
* @see convex/sharing.ts - Reviewer invitations and permissions
```

This comment references the deleted `sharing.ts` file and should be updated to reference `access.ts` instead.

## Frontend Files Verified

### ArtifactViewerPage.tsx
**Location:** `app/src/components/artifact/ArtifactViewerPage.tsx:32`
```typescript
const userPermission = useQuery(
  api.access.getPermission,
  artifact ? { artifactId: artifact._id } : "skip"
);
```
**Status:** ✓ Already using `api.access.getPermission`

### ShareModal.tsx
**Location:** `app/src/components/artifact/ShareModal.tsx:66-67`
```typescript
const inviteReviewer = useMutation(api.access.grant);
const removeReviewer = useMutation(api.access.revoke);
```
**Status:** ✓ Already using `api.access.grant` and `api.access.revoke`

**Usage verified:**
- Line 78: `await inviteReviewer({ artifactId, email })`
- Calls `api.access.grant` with correct signature

## Actions Taken

1. ✓ Verified no `api.sharing` references in frontend
2. ✓ Confirmed `sharing.ts` has been deleted
3. ✓ Confirmed `access.ts` exists with all required functions
4. ✓ Updated schema comment from `convex/sharing.ts` to `convex/access.ts`
5. ✓ Verified frontend components use new API:
   - `api.access.getPermission` in ArtifactViewerPage.tsx
   - `api.access.grant` in ShareModal.tsx
   - `api.access.revoke` in ShareModal.tsx

## Build Verification

Ran type check - no errors related to missing `api.sharing` functions. All errors are pre-existing linting issues (unused vars, `any` types, etc.) unrelated to this migration.

## Conclusion

**The frontend migration was already completed in a previous step.** All components are using the new `api.access.*` functions. The only work needed was updating one outdated schema comment, which has been completed.
