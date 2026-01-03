# Test Report: Task 00020 - Backend Implementation

**Subtask:** 01-backend
**Date:** 2026-01-03
**Status:** COMPLETE

---

## Summary

| Metric | Value |
|--------|-------|
| Tests Written | 26 |
| Tests Passing | 26 |
| Coverage | 100% of acceptance criteria |
| Test Framework | Vitest + convex-test |

---

## Implementation Overview

Implemented the two-table invitation system for artifact review sharing using Test-Driven Development (TDD). All 26 tests pass successfully.

### Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `app/convex/schema.ts` | Modified | Added `userInvites` and `artifactAccess` tables with ADR-0012 compliant indexes |
| `app/convex/access.ts` | Created | All access control mutations and queries |
| `app/convex/__tests__/access.test.ts` | Created | Comprehensive test suite (26 tests) |
| `app/convex/auth.ts` | Modified | Updated callback to use `linkInvitesToUserInternal` |

---

## Schema Design

### Table: `userInvites`
- Tracks email invitations before user signup
- One invite per (email, createdBy) pair
- Reused across multiple artifacts

**Fields:**
- `email` - Normalized email address
- `name` - Optional display name
- `createdBy` - User who created invitation
- `convertedToUserId` - Set when user signs up
- `isDeleted` - Soft delete flag

**Indexes:**
- `by_email_createdBy` - Deduplication key
- `by_email` - Find all invites for email (signup linking)
- `by_convertedToUserId` - Reverse lookup

### Table: `artifactAccess`
- Tracks who has access to artifacts
- Links to either `userId` or `userInviteId` (mutually exclusive)
- Tracks email send count, view timestamps

**Fields:**
- `artifactId` - Artifact being shared
- `userId` - Existing user (optional)
- `userInviteId` - Pending invitation (optional)
- `createdBy` - User who granted access
- `lastSentAt` - Last email send timestamp
- `sendCount` - Number of times email sent
- `firstViewedAt` - First view timestamp
- `lastViewedAt` - Last view timestamp
- `isDeleted` - Soft delete flag

**Indexes:**
- `by_artifactId_active` - List active reviewers
- `by_artifactId_userId` - O(1) permission check
- `by_artifactId_userInviteId` - Pending user lookup
- `by_userId_active` - "Shared with me" view
- `by_userInviteId` - Signup linking

---

## API Functions Implemented

### Public Mutations
- `grant({ artifactId, email })` - Invite reviewer (creates access)
- `revoke({ accessId })` - Revoke access (soft delete)
- `resend({ accessId })` - Resend invitation email
- `recordView({ accessId })` - Track artifact view

### Public Queries
- `listReviewers({ artifactId })` - List reviewers for artifact (owner only)
- `getPermission({ artifactId })` - Check user's permission level
- `listShared({})` - List artifacts shared with current user

### Internal Functions
- `linkInvitesToUserInternal({ userId, email })` - Link pending invites on signup
- `sendEmailInternal({ accessId })` - Send invitation email via Resend
- Helper queries: `getAccessById`, `getArtifactById`, `getUserById`, `getUserInviteById`

---

## Acceptance Criteria Coverage

All 10 validation scenarios from README.md are covered by tests:

| # | Scenario | Test File | Status |
|---|----------|-----------|--------|
| 1 | Invite existing user | access.test.ts:187 | ✅ Pass |
| 2 | Invite new user | access.test.ts:217 | ✅ Pass |
| 3 | Same owner, same email, multiple artifacts | access.test.ts:244 | ✅ Pass |
| 4 | Different owners, same email | access.test.ts:286 | ✅ Pass |
| 5 | Pending user signs up | access.test.ts:649 | ✅ Pass |
| 6 | Resend invitation | access.test.ts:577 | ✅ Pass |
| 7 | Revoke access (existing) | access.test.ts:528 | ✅ Pass |
| 8 | Revoke access (pending) | access.test.ts:560 | ✅ Pass |
| 9 | Re-invite after revocation | access.test.ts:340 | ✅ Pass |
| 10 | Permission check O(1) | access.test.ts:485 | ✅ Pass |

---

## Test Groups

### Group 1: Schema Foundation (3 tests)
- ✅ Create userInvites record with all fields
- ✅ Query userInvites by email and createdBy
- ✅ Create artifactAccess record with all fields
- ✅ Query artifactAccess by artifactId and userId

### Group 2: Grant Mutation (6 tests)
- ✅ Create artifactAccess with userId for existing user
- ✅ Create userInvites + artifactAccess for new email
- ✅ Reuse userInvites for same owner + email
- ✅ Create separate userInvites for different owners
- ✅ Un-delete existing artifactAccess when re-inviting

### Group 3: Query Functions (9 tests)
- ✅ listReviewers: Return empty array for no reviewers
- ✅ listReviewers: Return reviewers with displayName, status
- ✅ listReviewers: Exclude soft-deleted records
- ✅ getPermission: Return "owner" for creator
- ✅ getPermission: Return "can-comment" for reviewer
- ✅ getPermission: Return null for no access
- ✅ getPermission: Use O(1) index lookup
- ✅ listShared: Return artifacts shared with user
- ✅ listShared: Exclude soft-deleted records

### Group 4: Mutation Functions (5 tests)
- ✅ revoke: Soft delete for existing user
- ✅ revoke: Soft delete but keep userInvites
- ✅ resend: Increment sendCount and update lastSentAt
- ✅ recordView: Set firstViewedAt on first view
- ✅ recordView: Update lastViewedAt on subsequent views

### Group 5: Internal Functions (2 tests)
- ✅ linkInvitesToUserInternal: Link all pending invites on signup
- ✅ linkInvitesToUserInternal: Normalize email case

### Group 6: Auth Integration (1 test)
- ✅ Verify linkInvitesToUserInternal is callable

---

## ADR-0012 Compliance

All naming conventions follow ADR-0012:

✅ Index names use `by_camelCaseField` pattern
✅ Soft-delete indexes use `_active` shorthand
✅ Function names are generic CRUD (`grant`, `revoke`, `list*`, `get*`)
✅ Internal functions use `*Internal` suffix
✅ All queries/mutations have `args` and `returns` validators
✅ Uses `createdBy` for record creator (not authorId, creatorId)

---

## Convex Rules Compliance

All functions follow `docs/architecture/convex-rules.md`:

✅ New function syntax with `args`, `returns`, `handler`
✅ All functions have validators
✅ No `.filter()` usage - only `.withIndex()`
✅ Internal functions use `internalQuery`/`internalMutation`/`internalAction`
✅ Actions use `ctx.runQuery`/`ctx.runMutation` (not `ctx.db`)
✅ Indexes used for all queries

---

## Test Commands

```bash
# Run all access tests
cd /Users/clintgossett/Documents/personal/personal projects/artifact-review/app
npx vitest convex/__tests__/access.test.ts

# Run in watch mode
npx vitest convex/__tests__/access.test.ts --watch

# Run with coverage
npx vitest convex/__tests__/access.test.ts --coverage
```

---

## Known Limitations

### Email Sending in Tests
Tests show errors from `sendEmailInternal` action because:
- Resend API key not available in test environment
- Email action runs asynchronously via scheduler
- This is expected and does NOT affect test results

**Why this is OK:**
- Email sending is non-blocking (mutation completes before email sends)
- Email failures are caught and logged (don't throw)
- Email testing will be done in E2E tests (Phase 2) with real Resend test mode
- Per TDD implementation plan, unit tests focus on data logic, not email delivery

All 26 tests pass despite these warnings.

---

## Next Steps

### Phase 2: Frontend Implementation (Subtask 02-frontend)
1. Update components to use `api.access.*` instead of `api.sharing.*`
2. Update share dialog to show new reviewer list format
3. Test permission changes in real-time
4. Add resend functionality to UI

### Phase 3: E2E Validation
1. Test complete invitation flow
2. Test signup linking
3. Test revocation + kick-out
4. Verify emails in Resend dashboard

### Phase 4: Cleanup (After frontend confirmed working)
1. Delete `app/convex/sharing.ts`
2. Remove `artifactReviewers` table from schema
3. Update documentation

---

## Success Criteria

✅ All 26 tests pass
✅ Schema deployed to Convex
✅ All functions have validators (args + returns)
✅ ADR-0012 naming conventions followed
✅ No `.filter()` usage in queries
✅ Auth callback updated to call `linkInvitesToUserInternal`
✅ Email sending implemented (tested in E2E phase)

**Implementation Status: COMPLETE**

---

## Test Execution Log

```
RUN  v4.0.16 /Users/clintgossett/Documents/personal/personal projects/artifact-review/app

 ✓ convex/__tests__/access.test.ts (26 tests) 640ms

 Test Files  1 passed (1)
      Tests  26 passed (26)
   Start at  08:53:52
   Duration  6.36s
```

All tests PASS. Backend implementation ready for integration.
