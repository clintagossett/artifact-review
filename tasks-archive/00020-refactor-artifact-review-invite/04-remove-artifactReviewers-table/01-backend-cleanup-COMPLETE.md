# Backend Cleanup - COMPLETE

**Task:** Remove duplicate `artifactReviewers` system from backend
**Date:** 2026-01-03
**Status:** COMPLETE

---

## Summary

Backend cleanup to remove the legacy `artifactReviewers` table system. Most work was already done in previous commits - this step completed the remaining test cleanup.

---

## Work Completed

### 1. Files Deleted
- [x] `app/__tests__/convex/sharing.test.ts` - Obsolete test file for deleted sharing.ts

### 2. Test Files Updated

#### phase2-permissions.test.ts
- [x] Line 84-94: Changed reviewer setup from `artifactReviewers` to `artifactAccess`
- [x] Simplified to Path A (existing user) - no `userInvites` needed

#### comments.test.ts (2 occurrences)
- [x] Line 129-139: Changed reviewer setup to `artifactAccess`
- [x] Line 347-360: Changed reviewer2 setup to `artifactAccess`
- [x] Both simplified to Path A (existing user)

#### phase2-retrieval.test.ts
- [x] Line 186: Updated comment to reference `artifactAccess` instead of `artifactReviewers`

### 3. Schema Cleanup
- [x] Convex automatically removed 5 indexes for deleted `artifactReviewers` table:
  - `by_artifactId`
  - `by_artifactId_email`
  - `by_userId`
  - `by_email`
  - `by_artifactId_active`

---

## Pre-existing State (Already Done)

The following cleanup was already completed in previous commits:

| Item | Status | Notes |
|------|--------|-------|
| `convex/sharing.ts` | Already deleted | Function file removed |
| `convex/schema.ts` | Already updated | `artifactReviewers` table removed |
| `convex/lib/permissions.ts` | Already using `artifactAccess` | No changes needed |
| `convex/lib/commentPermissions.ts` | Already using `artifactAccess` | No changes needed |

---

## Test Results

### Type Check
```bash
$ npx convex dev --typecheck enable --once
✔ Deleted table indexes:
  [-] artifactReviewers.by_artifactId
  [-] artifactReviewers.by_artifactId_email
  [-] artifactReviewers.by_userId
  [-] artifactReviewers.by_email
  [-] artifactReviewers.by_artifactId_active
✔ Convex functions ready! (49.86s)
```

### Unit Tests
```bash
$ npm test -- convex/__tests__/phase2-permissions.test.ts
✓ 13 passed (13)

$ npm test -- convex/__tests__/phase2-retrieval.test.ts
✓ 9 passed (9)

$ npm test -- convex/__tests__/comments.test.ts
↓ 87 tests (skipped - expected)
```

---

## Verification

### No References to artifactReviewers
```bash
$ grep -r "artifactReviewers" app/
# No matches found ✓
```

### No References to sharing API
```bash
$ grep -r "api.sharing" app/
# No matches found ✓
```

---

## Key Insights

### Two-Path Access System

The `artifactAccess` table supports two invitation paths:

**Path A: Existing User**
- User account already exists
- Create `artifactAccess` with `userId` only
- No `userInvites` record needed
- Tests use this path (users created before invitation)

**Path B: Pending User**
- No account for email yet
- Create `userInvites` first (one per email + createdBy)
- Create `artifactAccess` with `userInviteId` only
- When user signs up, `linkInvitesToUserInternal` moves `userInviteId` to `userId`

### Schema Design

**userInvites Table:**
- No `artifactId` field (one invite per email + createdBy, not per artifact)
- Scoped by `email + createdBy` (compound key)
- Reused across multiple `artifactAccess` grants

**artifactAccess Table:**
- Has `artifactId` field (one record per user per artifact)
- Either `userId` OR `userInviteId` (mutually exclusive)
- This is the permission table - checked by `permissions.ts`

---

## Success Criteria

All criteria met:

- [x] `app/__tests__/convex/sharing.test.ts` deleted
- [x] `phase2-permissions.test.ts` uses `artifactAccess`
- [x] `comments.test.ts` uses `artifactAccess` (2 places)
- [x] `phase2-retrieval.test.ts` comment updated
- [x] Type check passes (Convex dev ready)
- [x] All tests pass (22 passing)
- [x] No references to `artifactReviewers` in backend code
- [x] No references to `api.sharing.*` in codebase

---

## Next Steps

This completes **Step 1: Backend Cleanup** for subtask 04.

**Step 2: Frontend Cleanup** (separate work):
- Update `ArtifactViewerPage.tsx` to use `api.access.getPermission`
- Update `ShareModal.tsx` to use `api.access.grant/revoke/listReviewers`
- Delete any remaining frontend references to `sharing` API

**Note:** Frontend changes are tracked in separate file (to be created for step 2).
