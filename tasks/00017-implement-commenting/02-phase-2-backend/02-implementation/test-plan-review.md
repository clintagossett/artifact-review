# Test Plan Review: Commenting Backend

**Reviewer:** Software Architect | **Date:** 2025-12-28

---

## Overall Assessment

**Status: APPROVED with Required Changes**

The test plan is comprehensive, well-structured, and closely aligned with the API design. The TDD developer has done excellent work creating a detailed, executable test plan.

**Required Changes:**

1. **API Design Amendment:** `softDelete` and `softDeleteReply` must call `requireCommentPermission` for defense-in-depth
2. **Test Fixtures:** Must be updated to match actual schema
3. **Add 2 Tests:** Authenticated-outsider tests for `softDelete` and `softDeleteReply`

**Security Testing Decision:** Option A (test unauthenticated at helper level only) is sufficient. Do NOT add 9 redundant unauthenticated endpoint tests.

**Updated Test Count:** 87 tests (was 85)

---

## What's Good About the Test Plan

### 1. Excellent Structure and Organization

- Clear hierarchical organization matching the API design (Permission Helpers, Comment Operations, Reply Operations, Integration Tests)
- TDD execution order is logical and follows the proper dependency chain (helpers first, then CRUD, then integration)
- Test file location is appropriate (`app/convex/__tests__/comments.test.ts`)

### 2. Comprehensive Permission Coverage

- All four roles tested: Owner, Reviewer, Outsider, Unauthenticated
- Permission helpers (`requireCommentPermission`, `canEditComment`, `canDeleteComment`) have thorough test cases
- Important edge case: "Owner cannot edit others' comments" is explicitly tested (this is correct per API design)

### 3. Strong Validation Coverage

- Empty content validation tested for both comments and replies
- Whitespace-only content tested
- Max length validation (10,000 for comments, 5,000 for replies) tested
- Content trimming behavior explicitly tested

### 4. Excellent State Tracking Tests

- Resolution tracking timeline test is well-designed (multiple toggles, different users)
- Edit tracking test covers initial state, first edit, and no-op scenarios
- Soft delete audit trail (`deletedBy`, `deletedAt`) explicitly verified

### 5. Proper Index Usage Verification

- Test plan explicitly notes "Uses `by_comment` index for cascade" in softDelete section
- Index usage summary table matches API design
- No `filter()` usage mentioned anywhere (correct)

### 6. Well-Designed Integration Tests

- Cascade delete test includes 3 replies and verifies all are soft deleted
- Resolution tracking timeline follows the exact example from schema design
- Edit tracking test is thorough

### 7. Reusable Test Fixtures

- `setupTestData` helper is well-structured
- `sampleTarget` fixture is appropriate
- Identity management (`t.withIdentity`) pattern is correct for convex-test

---

## Concerns and Issues Found

### Issue 1: Test Fixture Schema Mismatch (Minor)

**Location:** Test Data Setup section, lines 101-134

**Problem:** The test fixture creates `artifactVersions` and `artifactReviewers` with fields that don't match the actual schema:

```typescript
// In test plan:
const versionId = await asOwner.run(async (ctx) =>
  await ctx.db.insert("artifactVersions", {
    artifactId,
    versionNumber: 1,
    storageId: await ctx.storage.store(new Blob(["test"])),  // Wrong
    format: "html" as const,  // Wrong field name
    metadata: {},  // Not in schema
    isDeleted: false,
    createdAt: Date.now(),
  })
);
```

**Actual Schema:** Per `app/convex/schema.ts`, `artifactVersions` uses:
- `fileType` (not `format`)
- `htmlContent`/`markdownContent`/`entryPoint` (not `storageId`)
- `fileSize` (required)
- No `metadata` field

**Recommendation:** Update fixture to match actual schema:

```typescript
const versionId = await asOwner.run(async (ctx) =>
  await ctx.db.insert("artifactVersions", {
    artifactId,
    versionNumber: 1,
    fileType: "html" as const,
    htmlContent: "<html><body>Test</body></html>",
    fileSize: 100,
    isDeleted: false,
    createdAt: Date.now(),
  })
);
```

### Issue 2: Artifact Fixture Missing Required Fields (Minor)

**Location:** Test Data Setup section, lines 103-109

**Problem:** Artifact fixture is missing required fields:

```typescript
// In test plan:
await ctx.db.insert("artifacts", {
  title: "Test Artifact",
  creatorId: ownerId,
  isDeleted: false,
  createdAt: Date.now(),
})
```

**Missing Fields:** `shareToken`, `updatedAt`

**Recommendation:** Add missing fields:

```typescript
await ctx.db.insert("artifacts", {
  title: "Test Artifact",
  creatorId: ownerId,
  shareToken: "test1234",
  isDeleted: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})
```

### Issue 3: ArtifactReviewers Fixture Schema Mismatch (Minor)

**Location:** Test Data Setup section, lines 126-133

**Problem:** The `artifactReviewers` fixture uses incorrect field names:

```typescript
// In test plan:
await ctx.db.insert("artifactReviewers", {
  artifactId,
  userId: reviewerId,  // Wrong - should check if linked
  permission: "can-comment" as const,  // Wrong field name
  isDeleted: false,
  createdAt: Date.now(),  // Wrong field name
})
```

**Actual Schema:** Per `app/convex/schema.ts`:
- Uses `email` (required)
- Uses `invitedBy` (required)
- Uses `invitedAt` (not `createdAt`)
- Uses `status` (not `permission`)
- No `permission` field exists

**Recommendation:** Update fixture:

```typescript
await ctx.db.insert("artifactReviewers", {
  artifactId,
  email: "bob@example.com",
  userId: reviewerId,
  invitedBy: ownerId,
  invitedAt: Date.now(),
  status: "accepted" as const,
  isDeleted: false,
})
```

### Issue 4: Missing Test for "Comment not found" Error (Minor)

**Location:** Various CRUD sections

**Problem:** The test plan doesn't explicitly test the case where an invalid/non-existent `commentId` is passed to:
- `updateContent`
- `toggleResolved`
- `softDelete`

These should throw "Comment not found".

**Recommendation:** Add test cases:

| Function | Test Case | Expected Result |
|----------|-----------|----------------|
| `updateContent` | Invalid commentId | Throws "Comment not found" |
| `toggleResolved` | Invalid commentId | Throws "Comment not found" |
| `softDelete` | Invalid commentId | Throws "Comment not found" |

### Issue 5: Missing Test for "Reply not found" Error (Minor)

**Location:** Reply CRUD sections

**Problem:** Similar to Issue 4, missing tests for invalid `replyId` in:
- `updateReply`
- `softDeleteReply`

**Recommendation:** Add test cases:

| Function | Test Case | Expected Result |
|----------|-----------|----------------|
| `updateReply` | Invalid replyId | Throws "Reply not found" |
| `softDeleteReply` | Invalid replyId | Throws "Reply not found" |

### Issue 6: Missing Test for Version Cascade Delete (Minor)

**Location:** Integration Tests section

**Problem:** The API design mentions cascade delete behavior when a version is deleted:

> "When an artifact version is deleted, comments should be cascade-deleted."

The test plan only covers comment-to-reply cascade, not version-to-comment cascade.

**Recommendation:** Add integration test:

```typescript
test("soft deleting version cascades to all comments and replies", async () => {
  // Create version with comments and replies
  // Delete version via artifacts.softDeleteVersion
  // Verify all comments and replies are soft deleted
});
```

**Note:** This may need to wait until the cascade is added to `artifacts.softDeleteVersion`.

---

## Security Analysis: Outsider Permission Tests

### The Concern Raised

The test plan tests:
- `updateContent` - "Non-author cannot update"
- `softDelete` - "Reviewer cannot delete others'"
- `updateReply` - "Non-author cannot update"
- `softDeleteReply` - "Reviewer cannot delete others'"

**But does NOT explicitly test:**
- `updateContent` - "Outsider cannot update any comment"
- `softDelete` - "Outsider cannot delete any comment"
- `updateReply` - "Outsider cannot update any reply"
- `softDeleteReply` - "Outsider cannot delete any reply"

### Architectural Analysis

After careful review of the API design, I identified a **critical security gap** in the architecture itself (not just the test plan):

#### Finding 1: `softDelete` Does NOT Call `requireCommentPermission`

Looking at the API design for `softDelete`:

```typescript
export const softDelete = mutation({
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment already deleted");

    // Check if user can delete (author or artifact owner)
    const canDelete = await canDeleteComment(ctx, comment, userId);
    if (!canDelete) {
      throw new Error("Only the comment author or artifact owner can delete");
    }
    // ... rest of implementation
  },
});
```

The `canDeleteComment` helper only checks:
1. Is user the comment author? (returns `true`)
2. Is user the artifact owner? (returns `true`)
3. Otherwise returns `false`

**This is correct behavior** - it properly rejects outsiders because they are neither the author nor the owner. However, the **error message is misleading** for outsiders. An outsider would see "Only the comment author or artifact owner can delete" which is technically correct but doesn't clearly indicate they have no access to this artifact at all.

#### Finding 2: `updateContent` DOES Call `requireCommentPermission`

```typescript
export const updateContent = mutation({
  handler: async (ctx, args) => {
    // ...
    // Verify user has permission to view this version
    await requireCommentPermission(ctx, comment.versionId);

    // Check if user can edit this comment (must be author)
    if (!canEditComment(comment.authorId, userId)) {
      throw new Error("Only the comment author can edit");
    }
    // ...
  },
});
```

**This has TWO permission checks:**
1. `requireCommentPermission` - Rejects outsiders with "No permission to comment on this artifact"
2. `canEditComment` - Rejects non-authors with "Only the comment author can edit"

An outsider would fail at step 1, a reviewer trying to edit someone else's comment would fail at step 2.

#### Finding 3: Inconsistency Between Functions

| Function | Calls `requireCommentPermission`? | Outsider Error Message |
|----------|-----------------------------------|------------------------|
| `getByVersion` | Yes | "No permission to comment on this artifact" |
| `create` | Yes | "No permission to comment on this artifact" |
| `updateContent` | Yes | "No permission to comment on this artifact" |
| `toggleResolved` | Yes | "No permission to comment on this artifact" |
| `softDelete` | **NO** | "Only the comment author or artifact owner can delete" |
| `getReplies` | Yes | "No permission to comment on this artifact" |
| `createReply` | Yes | "No permission to comment on this artifact" |
| `updateReply` | Yes | "No permission to comment on this artifact" |
| `softDeleteReply` | **NO** | "Only the reply author or artifact owner can delete" |

### Security Assessment

**Is this a real security gap?**

**NO - The implementation is secure.** An outsider cannot delete comments because:
- They are not the comment author
- They are not the artifact owner
- `canDeleteComment` correctly returns `false`

**However, there is an inconsistency issue:**
- `softDelete` and `softDeleteReply` do NOT explicitly check artifact access first
- This creates inconsistent error messages and potential information leakage
- An outsider can learn a comment exists by the error message they receive

### Defense-in-Depth Principle

The security question raises a valid defense-in-depth concern:

1. **Current state:** Outsiders are blocked by the author/owner check
2. **Defense-in-depth:** Outsiders should be blocked FIRST by the artifact access check
3. **Why it matters:**
   - Consistent permission model (always check access first)
   - Better error messages (don't reveal comment exists if no access)
   - Easier to reason about security (single entry point for access checks)

### Recommendation: API Design Amendment

**Before implementing, `softDelete` and `softDeleteReply` should be updated to:**

```typescript
export const softDelete = mutation({
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment already deleted");

    // ADDED: Verify user has access to this artifact first
    await requireCommentPermission(ctx, comment.versionId);

    // Then check if user can delete (author or artifact owner)
    const canDelete = await canDeleteComment(ctx, comment, userId);
    if (!canDelete) {
      throw new Error("Only the comment author or artifact owner can delete");
    }
    // ...
  },
});
```

### Test Plan Impact

**With the API design fix, the existing tests are sufficient:**

| Test | What it verifies |
|------|-----------------|
| "Reviewer cannot delete others'" | Non-author, non-owner blocked at `canDeleteComment` |
| `requireCommentPermission` "Outsider cannot access" | Outsiders blocked at access check |

**The test plan's `requireCommentPermission` tests already cover the outsider case** because that helper will now be called by all functions.

### Explicit Outsider Tests: Verdict

**NOT REQUIRED as separate tests, IF the API design is amended.**

The `requireCommentPermission` helper tests cover outsider access denial. Since this helper should be called by all functions (including `softDelete` and `softDeleteReply` after the fix), we don't need to duplicate the outsider test for every function.

**HOWEVER, if the API design is NOT amended:**
Then explicit outsider tests for `softDelete` and `softDeleteReply` WOULD be required to verify the `canDelete` check correctly rejects outsiders.

### Final Security Recommendation

1. **Amend API design** to add `requireCommentPermission` call to `softDelete` and `softDeleteReply`
2. **No additional tests needed** - existing `requireCommentPermission` tests cover outsider scenario
3. **Optional:** Add 2 explicit outsider tests for `softDelete` and `softDeleteReply` for extra confidence

---

## Security Analysis: Authenticated vs Unauthenticated Outsiders

### The Distinction

There are TWO types of "outsiders":

| Type | Description | Auth State |
|------|-------------|------------|
| **Unauthenticated** | No auth token at all | `getAuthUserId(ctx)` returns `null` |
| **Authenticated Outsider** | Valid user account, but NOT in `artifactReviewers` and NOT the artifact owner | `getAuthUserId(ctx)` returns valid `Id<"users">` |

### Current Test Coverage Analysis

The test plan currently tests `requireCommentPermission` with BOTH scenarios:

| Test Case | Type | Expected Error |
|-----------|------|----------------|
| "Unauthenticated user" | Unauthenticated | "Authentication required" |
| "Outsider cannot access" | Authenticated Outsider | "No permission to comment" |

For individual functions (e.g., `create`, `getByVersion`, `toggleResolved`), the test plan only tests:
- "Outsider cannot X" (assumes authenticated outsider)

It does NOT explicitly test unauthenticated access for each function.

### The Question: Option A vs Option B

**Option A: Test both at helper level only (current approach)**
- `requireCommentPermission` tests unauthenticated AND authenticated-outsider
- All other functions just test "Outsider cannot X" (assumes helper is called)
- Pro: Less redundant tests (9 fewer tests)
- Con: Doesn't verify helper is actually called everywhere

**Option B: Test both explicitly for every function**
- Every function tests BOTH unauthenticated AND authenticated-outsider
- Pro: Explicit, defense-in-depth, catches if helper bypassed
- Con: Adds ~9 more tests (one unauthenticated test per operation)

### Architectural Evaluation

#### Security Principle: Defense-in-Depth Testing

The question is: **Do we trust that the helper will always be called?**

In a properly designed system:
1. The helper is the single point of access control
2. All functions call the helper
3. Testing the helper thoroughly should be sufficient

However, in practice:
1. Someone could refactor a function and forget to call the helper
2. A new function could be added without the helper call
3. Copy-paste errors could omit the helper call

#### What Would a Security Audit Expect?

A security auditor would typically expect:
1. **Unit tests on the permission helper** - Thorough coverage of all scenarios
2. **Integration tests on each endpoint** - At least ONE unauthorized access test per endpoint
3. **Not necessarily BOTH types** - One unauthorized test per endpoint is usually sufficient

The key insight: **The purpose of endpoint-level authorization tests is to verify the helper IS called, not to re-test the helper's logic.**

#### Analysis of Test Effectiveness

| Test Approach | Catches Helper Not Called | Catches Helper Bug | Redundancy |
|---------------|---------------------------|-------------------|------------|
| Option A (helper only) | NO | YES | Low |
| Option B (both everywhere) | YES | YES (redundant) | High |
| **Option C (one per endpoint)** | YES | YES (via helper tests) | **Optimal** |

### Recommendation: Option A is Sufficient (with Clarification)

**I recommend Option A** with the following reasoning:

1. **The test plan DOES test "Outsider cannot X" for most functions**

   Looking at the test plan:
   - `getByVersion`: "Outsider cannot query" - YES
   - `create`: "Outsider cannot create" - YES
   - `toggleResolved`: "Outsider cannot toggle" - YES
   - `getReplies`: "Outsider cannot query" - YES
   - `createReply`: "Outsider cannot create" (implied by permission check) - YES
   - `updateContent`: Tests "Non-author cannot update" but this is a reviewer, not outsider - PARTIAL
   - `softDelete`: Tests "Reviewer cannot delete others'" but not outsider - MISSING
   - `updateReply`: Tests "Non-author cannot update" - PARTIAL
   - `softDeleteReply`: Tests "Reviewer cannot delete others'" - MISSING

2. **The "Outsider cannot X" tests verify the helper is called**

   An authenticated outsider test will fail at `requireCommentPermission` with "No permission to comment on this artifact". This verifies the helper is being called.

3. **Unauthenticated tests at endpoint level are redundant**

   If the helper is called (verified by outsider test) and the helper correctly rejects unauthenticated users (verified by helper test), then the endpoint will also reject unauthenticated users. Testing this at every endpoint is redundant.

4. **The gaps are in `softDelete` and `softDeleteReply`**

   These functions don't test outsider access because they don't call `requireCommentPermission`. After the API design amendment (adding the helper call), they SHOULD have outsider tests added.

### Test Gaps to Address

After the API design amendment, add these tests:

| Function | Add Test | Expected Error |
|----------|----------|----------------|
| `softDelete` | "Outsider cannot delete any comment" | "No permission to comment on this artifact" |
| `softDeleteReply` | "Outsider cannot delete any reply" | "No permission to comment on this artifact" |

**Note:** "Outsider" here means authenticated outsider (user not in artifactReviewers). The unauthenticated case is covered by the helper test.

### Why NOT Option B?

Option B (test both unauthenticated AND authenticated-outsider for every function) would add 9 more tests:

| Function | Unauthenticated Test |
|----------|---------------------|
| `getByVersion` | Unauthenticated cannot query |
| `create` | Unauthenticated cannot create |
| `updateContent` | Unauthenticated cannot update |
| `toggleResolved` | Unauthenticated cannot toggle |
| `softDelete` | Unauthenticated cannot delete |
| `getReplies` | Unauthenticated cannot query |
| `createReply` | Unauthenticated cannot reply |
| `updateReply` | Unauthenticated cannot update |
| `softDeleteReply` | Unauthenticated cannot delete |

**These are redundant because:**
1. `requireCommentPermission` already tests unauthenticated rejection
2. The authenticated-outsider test verifies the helper is called
3. If helper is called and helper rejects unauthenticated, endpoint rejects unauthenticated

**Adding these would be over-testing** without providing additional security assurance.

### Updated Recommendation

1. **Keep Option A** - Test unauthenticated at helper level only
2. **Add 2 outsider tests** for `softDelete` and `softDeleteReply` (after API design amendment)
3. **Do NOT add 9 unauthenticated endpoint tests** - This is redundant

### Updated Test Count

| Category | Original | Change | New Total |
|----------|----------|--------|-----------|
| Permission Helpers | 12 | 0 | 12 |
| Comment CRUD | 36 | +1 (outsider for softDelete) | 37 |
| Reply CRUD | 34 | +1 (outsider for softDeleteReply) | 35 |
| Integration | 3 | 0 | 3 |
| **Total** | **85** | **+2** | **87** |

---

## Test Count Analysis

### Provided Count: 85 tests

| Category | Count | Assessment |
|----------|-------|------------|
| Permission Helpers | 12 | Appropriate |
| Comment CRUD | 36 | Appropriate |
| Reply CRUD | 34 | Appropriate |
| Integration | 3 | Could add 1-2 more |
| **Total** | **85** | **Comprehensive** |

**Verdict:** The 85 test count is reasonable and provides comprehensive coverage. With the recommended additions (5-7 more tests for edge cases), the total would be ~90-92 tests, which is still very reasonable.

---

## TDD Order Assessment

The proposed TDD execution order is excellent:

1. **Phase 1: Foundation** - Permission helpers first (correct - these are dependencies)
2. **Phase 2: Comment CRUD** - Create before Read/Update/Delete (correct)
3. **Phase 3: Reply CRUD** - After comments (correct - depends on comments)
4. **Phase 4: Integration** - Last (correct - requires all components)

**Assessment:** Logical and follows proper TDD principles.

---

## Index Usage Verification

The test plan correctly identifies all indexes from the API design:

| Query | Index | Verified |
|-------|-------|----------|
| Get comments by version | `by_version_active` | Yes |
| Get replies by comment | `by_comment_active` | Yes |
| Cascade delete (comments) | `by_comment` | Yes |
| Permission check | `by_artifact_active` | Yes |

**Assessment:** Correct index usage documented.

---

## Missing Edge Cases (Nice to Have)

These are not critical but could improve coverage:

1. **Concurrent edit detection** - Two users trying to edit same comment simultaneously (Convex handles this, but worth noting)

2. **Very long content** - Test exactly 10,000 characters (boundary test)

3. **Unicode content** - Comments with emoji, non-ASCII characters

4. **Target metadata edge cases** - Empty target `{}`, missing `_version` field

5. **Multiple comments same version** - Verify ordering is consistent

**Recommendation:** These are nice-to-have. The current test plan is sufficient for initial implementation.

---

## Recommendations Summary

### Must Fix (Before Implementation)

1. **CRITICAL: Amend API design** to add `requireCommentPermission` call to `softDelete` and `softDeleteReply`
   - This ensures consistent defense-in-depth across all functions
   - Prevents information leakage (outsiders shouldn't learn comment exists)
   - Makes error messages consistent

2. **Fix test fixtures** to match actual schema:
   - `artifactVersions`: Use `fileType`, `htmlContent`, `fileSize` (not `storageId`, `format`, `metadata`)
   - `artifacts`: Add `shareToken`, `updatedAt`
   - `artifactReviewers`: Use `email`, `invitedBy`, `invitedAt`, `status` (not `permission`, `createdAt`)

### Should Add (During Implementation)

3. Add "not found" tests for invalid IDs (5 tests)

4. Consider adding version-to-comment cascade test (1 test)

### Nice to Have (Post-Implementation)

5. Boundary tests for exact max length

6. Unicode content tests

### Security Tests

7. **Add 2 authenticated-outsider tests** for `softDelete` and `softDeleteReply` (after API design amendment)
   - These verify the helper is actually called
   - "Outsider cannot delete any comment" -> "No permission to comment on this artifact"
   - "Outsider cannot delete any reply" -> "No permission to comment on this artifact"

8. **Do NOT add 9 unauthenticated endpoint tests** - This is over-testing
   - Unauthenticated rejection is tested at the helper level
   - Authenticated-outsider tests verify the helper is called
   - If helper is called and helper rejects unauthenticated, endpoints will too

---

## Final Verdict

**APPROVED with Required Changes**

The test plan is well-designed, comprehensive, and ready for TDD implementation. The security analysis raised valid concerns that require both an API design amendment and minor test additions.

**Before proceeding:**
1. Architect must amend `api-design.md` to add `requireCommentPermission` call to `softDelete` and `softDeleteReply`
2. TDD developer must update test fixtures to match actual schema
3. TDD developer must add 2 authenticated-outsider tests for `softDelete` and `softDeleteReply`

**Security testing decision:**
- **Option A selected** - Test unauthenticated rejection at helper level only
- **Do NOT add 9 unauthenticated endpoint tests** - This would be over-testing
- **Do add 2 outsider tests** for `softDelete` and `softDeleteReply` to verify helper is called

**Updated test count: 87 tests** (was 85, +2 for outsider delete tests)

The test plan demonstrates:
- Strong alignment with API design
- Proper TDD methodology understanding
- Comprehensive permission and validation coverage
- Well-structured integration tests
- Appropriate security test granularity (not over-testing, not under-testing)

**Ready to proceed with TDD implementation after the required changes.**

---

## References

- API Design: `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/api-design.md`
- Schema Design: `tasks/00017-implement-commenting/02-phase-2-backend/01-schema-design/schema.md`
- Actual Schema: `app/convex/schema.ts`
