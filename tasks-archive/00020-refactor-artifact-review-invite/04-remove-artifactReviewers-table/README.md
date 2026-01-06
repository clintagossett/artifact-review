# Subtask 04: Remove artifactReviewers Table

**Status:** Backend Complete - Frontend Remaining
**Date:** 2026-01-03
**Completed:** Step 1 (Backend) - 2026-01-03

---

## Problem

The `artifactReviewers` table is a legacy table that was supposed to be removed. The system now uses `artifactAccess` + `userInvites` for managing reviewer access.

**Bug Impact:** The frontend uses `sharing.getUserPermission` which queries `artifactReviewers` (empty), while invites are created in `artifactAccess`. This causes "You don't have access" for invited users.

---

## Files to Update

### Production Code

| File | Changes Needed |
|------|----------------|
| `convex/schema.ts` | Remove `artifactReviewers` table definition |
| `convex/sharing.ts` | Rewrite to use `artifactAccess` instead |
| `convex/lib/permissions.ts:49` | Update permission check |
| `convex/lib/commentPermissions.ts:58` | Update comment permission check |
| `src/components/artifact/ShareModal.tsx:98` | Update reviewer ID type |

### Test Files

| File | Changes Needed |
|------|----------------|
| `convex/__tests__/sharing.test.ts` | Rewrite tests for `artifactAccess` |
| `convex/__tests__/comments.test.ts` | Update reviewer setup |
| `convex/__tests__/phase2-permissions.test.ts` | Update permission tests |
| `convex/__tests__/phase2-retrieval.test.ts` | Update comments |
| `__tests__/convex/sharing.test.ts` | Update or remove |

---

## Key Changes

### 1. `sharing.getUserPermission`

**Before (artifactReviewers):**
```typescript
const reviewer = await ctx.db
  .query("artifactReviewers")
  .withIndex("by_artifactId_active", ...)
  .filter((q) => q.eq(q.field("userId"), userId))
  .first();
```

**After (artifactAccess):**
```typescript
const access = await ctx.db
  .query("artifactAccess")
  .withIndex("by_artifactId_userId", (q) =>
    q.eq("artifactId", args.artifactId).eq("userId", userId)
  )
  .unique();

if (access && !access.isDeleted) {
  return "can-comment";
}
```

### 2. Permission checks in `lib/permissions.ts` and `lib/commentPermissions.ts`

Same pattern - switch from `artifactReviewers` to `artifactAccess`.

---

## Migration Notes

- `artifactReviewers` table is empty in dev, so no data migration needed
- The `artifactAccess` table already has the correct data structure
- The `access.ts` file already has `getPermission` that works correctly

---

## Acceptance Criteria

### Backend (Step 1) - COMPLETE
- [x] `artifactReviewers` table removed from schema (pre-existing)
- [x] All permission checks use `artifactAccess` table (pre-existing)
- [x] Backend tests updated to use `artifactAccess`
- [x] `sharing.ts` deleted (pre-existing)
- [x] All backend tests passing

### Frontend (Step 2) - REMAINING
- [ ] `ArtifactViewerPage.tsx` updated to use `api.access.getPermission`
- [ ] `ShareModal.tsx` updated to use `api.access` functions
- [ ] No references to `api.sharing.*` in frontend
- [ ] Invited user can access artifact (E2E test)
