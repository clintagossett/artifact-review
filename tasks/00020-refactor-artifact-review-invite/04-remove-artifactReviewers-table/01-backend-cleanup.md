# Backend Cleanup Plan - Step 1

**Task:** Remove duplicate `artifactReviewers` system from backend
**Date:** 2026-01-03

---

## Current State Assessment

After investigation, most of the cleanup has ALREADY been done:

| Item | Status |
|------|--------|
| `convex/sharing.ts` | Already deleted |
| `convex/schema.ts` (artifactReviewers table) | Already removed |
| `convex/lib/permissions.ts` | Already using `artifactAccess` |
| `convex/lib/commentPermissions.ts` | Already using `artifactAccess` |

**Remaining work:**
1. Delete obsolete test file: `app/__tests__/convex/sharing.test.ts`
2. Fix 3 test files that still insert into `artifactReviewers` table

---

## Files to Delete

### 1. Delete sharing.test.ts
- **File:** `/app/__tests__/convex/sharing.test.ts`
- **Reason:** Tests deleted `sharing.ts` functions
- **Impact:** None - `sharing.ts` already deleted

---

## Files to Update

### 2. Update phase2-permissions.test.ts

**File:** `/app/convex/__tests__/phase2-permissions.test.ts`

**Line 86-94:** Change reviewer setup from `artifactReviewers` to `artifactAccess`

```typescript
// BEFORE (lines 86-94):
return await ctx.db.insert("artifactReviewers", {
  artifactId,
  email: "reviewer@example.com",
  userId: reviewerId,
  status: "accepted",
  invitedBy: ownerId,
  invitedAt: Date.now(),
  isDeleted: false,
});

// AFTER:
// Create user invite first
const inviteId = await ctx.db.insert("userInvites", {
  email: "reviewer@example.com",
  artifactId,
  invitedBy: ownerId,
  status: "accepted",
  sendCount: 1,
  lastSentAt: Date.now(),
  isDeleted: false,
});

// Create access record
return await ctx.db.insert("artifactAccess", {
  artifactId,
  userId: reviewerId,
  userInviteId: inviteId,
  createdBy: ownerId,
  lastSentAt: Date.now(),
  sendCount: 1,
  isDeleted: false,
});
```

### 3. Update comments.test.ts (2 occurrences)

**File:** `/app/convex/__tests__/comments.test.ts`

**Line 131-138:** Change reviewer setup

```typescript
// BEFORE:
await ctx.db.insert("artifactReviewers", {
  artifactId,
  email: "bob@example.com",
  userId: reviewerId,
  status: "accepted",
  invitedBy: ownerId,
  invitedAt: Date.now(),
  isDeleted: false,
})

// AFTER:
const inviteId = await ctx.db.insert("userInvites", {
  email: "bob@example.com",
  artifactId,
  invitedBy: ownerId,
  status: "accepted",
  sendCount: 1,
  lastSentAt: Date.now(),
  isDeleted: false,
});

await ctx.db.insert("artifactAccess", {
  artifactId,
  userId: reviewerId,
  userInviteId: inviteId,
  createdBy: ownerId,
  lastSentAt: Date.now(),
  sendCount: 1,
  isDeleted: false,
})
```

**Line 350-357:** Same change (second occurrence)

```typescript
// BEFORE:
await ctx.db.insert("artifactReviewers", {
  artifactId: (await ctx.db.get(versionId))!.artifactId,
  email: "reviewer2@example.com",
  userId: reviewer2Id,
  status: "accepted",
  invitedBy: ownerId,
  invitedAt: Date.now(),
  isDeleted: false,
})

// AFTER:
const artifactId = (await ctx.db.get(versionId))!.artifactId;
const inviteId = await ctx.db.insert("userInvites", {
  email: "reviewer2@example.com",
  artifactId,
  invitedBy: ownerId,
  status: "accepted",
  sendCount: 1,
  lastSentAt: Date.now(),
  isDeleted: false,
});

await ctx.db.insert("artifactAccess", {
  artifactId,
  userId: reviewer2Id,
  userInviteId: inviteId,
  createdBy: ownerId,
  lastSentAt: Date.now(),
  sendCount: 1,
  isDeleted: false,
})
```

### 4. Update phase2-retrieval.test.ts (comment only)

**File:** `/app/convex/__tests__/phase2-retrieval.test.ts`

**Line 186:** Update comment to reference correct table

```typescript
// BEFORE:
//    - Reviewer: user in artifactReviewers

// AFTER:
//    - Reviewer: user in artifactAccess
```

---

## Schema Reference

### artifactAccess Table Structure

```typescript
{
  artifactId: v.id("artifacts"),
  userId: v.id("users"),
  userInviteId: v.id("userInvites"),
  createdBy: v.id("users"),
  lastSentAt: v.number(),
  sendCount: v.number(),
  isDeleted: v.boolean(),
}
```

### userInvites Table Structure

```typescript
{
  email: v.string(),
  artifactId: v.id("artifacts"),
  invitedBy: v.id("users"),
  status: v.union(v.literal("pending"), v.literal("accepted")),
  sendCount: v.number(),
  lastSentAt: v.number(),
  isDeleted: v.boolean(),
}
```

---

## Validation Steps

1. Delete `app/__tests__/convex/sharing.test.ts`
2. Update 3 test files
3. Run type check: `npx convex dev` (should have no errors)
4. Run tests: `npm test` (all should pass)
5. Verify no remaining references: `grep -r "artifactReviewers" app/convex/`

---

## Success Criteria

- [ ] `app/__tests__/convex/sharing.test.ts` deleted
- [ ] `phase2-permissions.test.ts` uses `artifactAccess`
- [ ] `comments.test.ts` uses `artifactAccess` (2 places)
- [ ] `phase2-retrieval.test.ts` comment updated
- [ ] Type check passes
- [ ] All tests pass
- [ ] No references to `artifactReviewers` in backend code

---

## Notes

This is a **test-only cleanup** - production code already migrated. The permission libraries (`permissions.ts` and `commentPermissions.ts`) were already updated to use `artifactAccess` instead of `artifactReviewers`.
