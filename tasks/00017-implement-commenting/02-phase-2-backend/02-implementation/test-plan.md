# Test Plan: Commenting Backend

**Task:** 00017 - Implement Commenting | **Phase:** 2 - Backend | **Date:** 2025-12-28
**Status:** APPROVED (with required changes applied)

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-28 | 1.0 | Initial test plan created |
| 2025-12-28 | 1.1 | Updated per architect review - Fixed test fixtures to match actual schema, added outsider tests for softDelete/softDeleteReply, added "not found" tests for invalid IDs |

---

## Overview

This test plan defines comprehensive test coverage for the commenting backend implementation using TDD methodology with `convex-test` and Vitest.

**Test File Location:** `app/convex/__tests__/comments.test.ts`

**Key Principles:**
- Write ONE test at a time (RED → GREEN → REFACTOR)
- Tests must fail first for the correct reason
- Implement only minimal code to make test pass
- Never delete tests to make them pass

---

## Test Organization

### File Structure

```
app/convex/
├── __tests__/
│   └── comments.test.ts           # All comment tests (organized by function)
├── comments.ts                     # Comment operations (public)
├── commentReplies.ts              # Reply operations (public)
└── lib/
    └── commentPermissions.ts      # Permission helpers (internal)
```

### Test Suite Structure

```typescript
// comments.test.ts organization

describe("comments", () => {
  describe("Permission Helpers", () => {
    describe("requireCommentPermission", () => { /* ... */ });
    describe("canEditComment", () => { /* ... */ });
    describe("canDeleteComment", () => { /* ... */ });
  });

  describe("Comment Operations", () => {
    describe("getByVersion", () => { /* ... */ });
    describe("create", () => { /* ... */ });
    describe("updateContent", () => { /* ... */ });
    describe("toggleResolved", () => { /* ... */ });
    describe("softDelete", () => { /* ... */ });
  });

  describe("Reply Operations", () => {
    describe("getReplies", () => { /* ... */ });
    describe("createReply", () => { /* ... */ });
    describe("updateReply", () => { /* ... */ });
    describe("softDeleteReply", () => { /* ... */ });
  });

  describe("Integration Tests", () => {
    describe("Cascade Delete", () => { /* ... */ });
    describe("Resolution Tracking", () => { /* ... */ });
    describe("Edit Tracking", () => { /* ... */ });
  });
});
```

---

## Test Data Setup

### Reusable Test Fixtures

```typescript
// Helper to create test data
async function setupTestData(t: ConvexTestingHelper) {
  // Create users
  const ownerId = await t.run(async (ctx) =>
    await ctx.db.insert("users", {
      name: "Alice Owner",
      email: "alice@example.com",
    })
  );

  const reviewerId = await t.run(async (ctx) =>
    await ctx.db.insert("users", {
      name: "Bob Reviewer",
      email: "bob@example.com",
    })
  );

  const outsiderId = await t.run(async (ctx) =>
    await ctx.db.insert("users", {
      name: "Charlie Outsider",
      email: "charlie@example.com",
    })
  );

  // Create artifact (owned by Alice)
  const asOwner = t.withIdentity({ subject: ownerId });
  const now = Date.now();
  const artifactId = await asOwner.run(async (ctx) =>
    await ctx.db.insert("artifacts", {
      title: "Test Artifact",
      creatorId: ownerId,
      shareToken: "test1234",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    })
  );

  // Create version
  const versionId = await asOwner.run(async (ctx) =>
    await ctx.db.insert("artifactVersions", {
      artifactId,
      versionNumber: 1,
      fileType: "html" as const,
      htmlContent: "<html><body>Test</body></html>",
      fileSize: 100,
      isDeleted: false,
      createdAt: now,
    })
  );

  // Add Bob as reviewer
  await asOwner.run(async (ctx) =>
    await ctx.db.insert("artifactReviewers", {
      artifactId,
      email: "bob@example.com",
      userId: reviewerId,
      invitedBy: ownerId,
      invitedAt: now,
      status: "accepted" as const,
      isDeleted: false,
    })
  );

  return { ownerId, reviewerId, outsiderId, artifactId, versionId };
}

// Sample target metadata
const sampleTarget = {
  _version: 1,
  type: "text" as const,
  selectedText: "Contact our support team",
  page: "/faq.html",
  location: {
    containerType: "accordion" as const,
    containerLabel: "FAQ Section 3",
  },
};
```

---

## Test Coverage by Function

### 1. Permission Helpers

#### 1.1 requireCommentPermission

**Purpose:** Verify owner/reviewer access control

| Test Case | Expected Result |
|-----------|----------------|
| Owner can access their artifact | Returns `"owner"` |
| Reviewer can access artifact | Returns `"can-comment"` |
| Outsider cannot access | Throws "No permission to comment" |
| Unauthenticated user | Throws "Authentication required" |
| Deleted version | Throws "Version not found" |
| Deleted artifact | Throws "Artifact not found" |

**TDD Order:**
1. Test owner access (fails → implement)
2. Test reviewer access (fails → implement)
3. Test unauthenticated (fails → implement)
4. Test outsider (fails → implement)
5. Test deleted version (fails → implement)
6. Test deleted artifact (fails → implement)

#### 1.2 canEditComment

**Purpose:** Only author can edit their comment

| Test Case | Expected Result |
|-----------|----------------|
| Author can edit own comment | Returns `true` |
| Different user cannot edit | Returns `false` |

**TDD Order:**
1. Test author can edit (fails → implement)
2. Test non-author cannot edit (fails → implement)

#### 1.3 canDeleteComment

**Purpose:** Author or artifact owner can delete

| Test Case | Expected Result |
|-----------|----------------|
| Author can delete own comment | Returns `true` |
| Artifact owner can delete any comment | Returns `true` |
| Reviewer cannot delete others' comments | Returns `false` |
| Outsider cannot delete | Returns `false` |

**TDD Order:**
1. Test author can delete (fails → implement)
2. Test owner can delete any (fails → implement)
3. Test reviewer cannot delete others' (fails → implement)

---

### 2. Comment Operations

#### 2.1 getByVersion

**Purpose:** Query all active comments for a version

| Test Case | Expected Result |
|-----------|----------------|
| Owner can query their version | Returns all active comments |
| Reviewer can query version | Returns all active comments |
| Outsider cannot query | Throws "No permission" |
| Returns empty array when no comments | Returns `[]` |
| Excludes soft-deleted comments | Deleted comments not in results |
| Includes author data | Each comment has `author.name` and `author.email` |
| Includes reply count | Each comment has `replyCount` |
| Orders by creation time (asc) | Oldest first |

**TDD Order:**
1. Test owner can query (fails → implement)
2. Test reviewer can query (fails → implement)
3. Test outsider fails (fails → implement)
4. Test empty array (fails → implement)
5. Test excludes deleted (fails → implement with index)
6. Test author enrichment (fails → implement)
7. Test reply count (fails → implement)

#### 2.2 create

**Purpose:** Create a new comment

| Test Case | Expected Result |
|-----------|----------------|
| Owner creates comment with valid content | Returns comment ID |
| Reviewer creates comment | Returns comment ID |
| Outsider cannot create | Throws "No permission" |
| Empty content after trim | Throws "Comment content cannot be empty" |
| Whitespace-only content | Throws "Comment content cannot be empty" |
| Content > 10,000 chars | Throws "Comment content exceeds maximum length" |
| Sets correct initial state | `resolved: false`, `isEdited: false`, `isDeleted: false` |
| Sets `createdAt` timestamp | Has `createdAt` |
| No resolution tracking fields on creation | `resolvedChangedBy` and `resolvedChangedAt` undefined |
| Stores target metadata | Target stored as-is |
| Content is trimmed | Leading/trailing whitespace removed |

**TDD Order:**
1. Test owner creates (fails → implement basic create)
2. Test reviewer creates (fails → implement permission check)
3. Test outsider fails (fails → implement)
4. Test empty content validation (fails → implement)
5. Test whitespace validation (fails → implement)
6. Test max length validation (fails → implement)
7. Test initial state (fails → implement)
8. Test content trimming (fails → implement)
9. Test target storage (fails → implement)

#### 2.3 updateContent

**Purpose:** Edit comment content (author only)

| Test Case | Expected Result |
|-----------|----------------|
| Author can update own comment | Content updated |
| Non-author cannot update | Throws "Only the comment author can edit" |
| Owner cannot edit others' comments | Throws "Only the comment author can edit" |
| Empty content after trim | Throws "Comment content cannot be empty" |
| Content > 10,000 chars | Throws "Comment content exceeds maximum length" |
| Sets `isEdited: true` | Flag set |
| Sets `editedAt` timestamp | Timestamp updated |
| Unchanged content (no-op) | Returns null, no update |
| Cannot edit deleted comment | Throws "Comment has been deleted" |
| Invalid commentId | Throws "Comment not found" |
| Content is trimmed | Whitespace removed |

**TDD Order:**
1. Test author can update (fails → implement)
2. Test non-author fails (fails → implement)
3. Test owner cannot edit (fails → implement)
4. Test empty content (fails → implement validation)
5. Test max length (fails → implement validation)
6. Test sets isEdited (fails → implement)
7. Test sets editedAt (fails → implement)
8. Test no-op for unchanged (fails → implement)
9. Test deleted comment (fails → implement)
10. Test invalid commentId (fails → implement)

#### 2.4 toggleResolved

**Purpose:** Toggle resolution status

| Test Case | Expected Result |
|-----------|----------------|
| Owner can toggle resolution | `resolved` flipped |
| Reviewer can toggle resolution | `resolved` flipped |
| First toggle sets tracking fields | `resolvedChangedBy` and `resolvedChangedAt` set |
| Subsequent toggles update tracking | Fields updated to current user/time |
| Tracking fields never cleared | Always reflect last change |
| Cannot toggle deleted comment | Throws "Comment has been deleted" |
| Invalid commentId | Throws "Comment not found" |
| Outsider cannot toggle | Throws "No permission" |

**TDD Order:**
1. Test owner can toggle (fails → implement)
2. Test reviewer can toggle (fails → implement)
3. Test first toggle sets tracking (fails → implement)
4. Test subsequent toggle updates (fails → implement)
5. Test deleted comment (fails → implement)
6. Test invalid commentId (fails → implement)
7. Test outsider fails (fails → implement)

#### 2.5 softDelete

**Purpose:** Soft delete comment and cascade to replies

| Test Case | Expected Result |
|-----------|----------------|
| Author can delete own comment | `isDeleted: true` set |
| Owner can delete any comment | `isDeleted: true` set |
| Reviewer cannot delete others' | Throws "Only the comment author or artifact owner can delete" |
| Outsider cannot delete any comment | Throws "No permission to comment on this artifact" |
| Sets `deletedBy` and `deletedAt` | Audit fields set |
| Cascades to all replies | All replies get `isDeleted: true` |
| Cascade sets `deletedBy` on replies | Replies have `deletedBy` set to deleter |
| Cascade sets `deletedAt` on replies | Replies have `deletedAt` |
| Cannot delete already deleted | Throws "Comment already deleted" |
| Invalid commentId | Throws "Comment not found" |
| Uses `by_comment` index for cascade | No filter() usage |

**TDD Order:**
1. Test author can delete (fails → implement basic)
2. Test owner can delete (fails → implement permission)
3. Test reviewer fails (fails → implement)
4. Test outsider fails (fails → implement)
5. Test sets audit fields (fails → implement)
6. Test cascades to replies (fails → implement)
7. Test cascade audit fields (fails → implement)
8. Test already deleted (fails → implement)
9. Test invalid commentId (fails → implement)

---

### 3. Reply Operations

#### 3.1 getReplies

**Purpose:** Query all active replies for a comment

| Test Case | Expected Result |
|-----------|----------------|
| Owner can query replies | Returns all active replies |
| Reviewer can query replies | Returns all active replies |
| Outsider cannot query | Throws "No permission" |
| Returns empty array when no replies | Returns `[]` |
| Excludes soft-deleted replies | Deleted replies not in results |
| Includes author data | Each reply has `author.name` and `author.email` |
| Orders by creation time (asc) | Oldest first |
| Cannot query deleted comment | Throws "Comment has been deleted" |

**TDD Order:**
1. Test owner can query (fails → implement)
2. Test reviewer can query (fails → implement)
3. Test outsider fails (fails → implement)
4. Test empty array (fails → implement)
5. Test excludes deleted (fails → implement with index)
6. Test author enrichment (fails → implement)
7. Test deleted comment (fails → implement)

#### 3.2 createReply

**Purpose:** Add reply to a comment

| Test Case | Expected Result |
|-----------|----------------|
| Owner creates reply | Returns reply ID |
| Reviewer creates reply | Returns reply ID |
| Outsider cannot create | Throws "No permission" |
| Empty content after trim | Throws "Reply content cannot be empty" |
| Content > 5,000 chars | Throws "Reply content exceeds maximum length" |
| Cannot reply to deleted comment | Throws "Cannot reply to deleted comment" |
| Sets correct initial state | `isEdited: false`, `isDeleted: false` |
| Sets `createdAt` timestamp | Has `createdAt` |
| Content is trimmed | Whitespace removed |

**TDD Order:**
1. Test owner creates (fails → implement)
2. Test reviewer creates (fails → implement)
3. Test outsider fails (fails → implement)
4. Test empty content (fails → implement validation)
5. Test max length (fails → implement validation)
6. Test deleted comment (fails → implement)
7. Test initial state (fails → implement)
8. Test trimming (fails → implement)

#### 3.3 updateReply

**Purpose:** Edit reply content (author only)

| Test Case | Expected Result |
|-----------|----------------|
| Author can update own reply | Content updated |
| Non-author cannot update | Throws "Only the reply author can edit" |
| Owner cannot edit others' replies | Throws "Only the reply author can edit" |
| Empty content after trim | Throws "Reply content cannot be empty" |
| Content > 5,000 chars | Throws "Reply content exceeds maximum length" |
| Sets `isEdited: true` | Flag set |
| Sets `editedAt` timestamp | Timestamp updated |
| Unchanged content (no-op) | Returns null, no update |
| Cannot edit deleted reply | Throws "Reply has been deleted" |
| Cannot edit if parent comment deleted | Throws "Parent comment not found or deleted" |
| Invalid replyId | Throws "Reply not found" |
| Content is trimmed | Whitespace removed |

**TDD Order:**
1. Test author can update (fails → implement)
2. Test non-author fails (fails → implement)
3. Test owner cannot edit (fails → implement)
4. Test empty content (fails → implement)
5. Test max length (fails → implement)
6. Test sets isEdited (fails → implement)
7. Test sets editedAt (fails → implement)
8. Test no-op (fails → implement)
9. Test deleted reply (fails → implement)
10. Test deleted parent (fails → implement)
11. Test invalid replyId (fails → implement)

#### 3.4 softDeleteReply

**Purpose:** Soft delete a reply

| Test Case | Expected Result |
|-----------|----------------|
| Author can delete own reply | `isDeleted: true` set |
| Owner can delete any reply | `isDeleted: true` set |
| Reviewer cannot delete others' | Throws "Only the reply author or artifact owner can delete" |
| Outsider cannot delete any reply | Throws "No permission to comment on this artifact" |
| Sets `deletedBy` and `deletedAt` | Audit fields set |
| Cannot delete already deleted | Throws "Reply already deleted" |
| Invalid replyId | Throws "Reply not found" |

**TDD Order:**
1. Test author can delete (fails → implement)
2. Test owner can delete (fails → implement)
3. Test reviewer fails (fails → implement)
4. Test outsider fails (fails → implement)
5. Test sets audit fields (fails → implement)
6. Test already deleted (fails → implement)
7. Test invalid replyId (fails → implement)

---

## Integration Test Scenarios

### Cascade Delete Behavior

**Test:** When comment is soft deleted, all replies cascade

```typescript
test("soft deleting comment cascades to all replies", async () => {
  const t = convexTest(schema);
  const { ownerId, reviewerId, versionId } = await setupTestData(t);

  // Owner creates comment
  const asOwner = t.withIdentity({ subject: ownerId });
  const commentId = await asOwner.mutation(api.comments.create, {
    versionId,
    content: "Parent comment",
    target: sampleTarget,
  });

  // Reviewer adds 3 replies
  const asReviewer = t.withIdentity({ subject: reviewerId });
  await asReviewer.mutation(api.commentReplies.createReply, {
    commentId,
    content: "Reply 1",
  });
  await asReviewer.mutation(api.commentReplies.createReply, {
    commentId,
    content: "Reply 2",
  });
  await asReviewer.mutation(api.commentReplies.createReply, {
    commentId,
    content: "Reply 3",
  });

  // Owner deletes comment
  await asOwner.mutation(api.comments.softDelete, { commentId });

  // Verify all replies are soft deleted
  const replies = await asOwner.run(async (ctx) =>
    await ctx.db
      .query("commentReplies")
      .withIndex("by_comment", (q) => q.eq("commentId", commentId))
      .collect()
  );

  expect(replies).toHaveLength(3);
  expect(replies.every((r) => r.isDeleted === true)).toBe(true);
  expect(replies.every((r) => r.deletedBy === ownerId)).toBe(true);
  expect(replies.every((r) => r.deletedAt !== undefined)).toBe(true);
});
```

### Resolution Tracking Timeline

**Test:** Multiple resolution toggles track correctly

```typescript
test("resolution tracking persists across multiple toggles", async () => {
  const t = convexTest(schema);
  const { ownerId, reviewerId, versionId } = await setupTestData(t);

  // Owner creates comment
  const asOwner = t.withIdentity({ subject: ownerId });
  const commentId = await asOwner.mutation(api.comments.create, {
    versionId,
    content: "Test comment",
    target: sampleTarget,
  });

  // 1. Initial state: not resolved, no tracking
  let comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
  expect(comment?.resolved).toBe(false);
  expect(comment?.resolvedChangedBy).toBeUndefined();
  expect(comment?.resolvedChangedAt).toBeUndefined();

  // 2. Alice resolves
  await asOwner.mutation(api.comments.toggleResolved, { commentId });
  comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
  expect(comment?.resolved).toBe(true);
  expect(comment?.resolvedChangedBy).toBe(ownerId);
  const firstChangeTime = comment?.resolvedChangedAt;
  expect(firstChangeTime).toBeDefined();

  // Wait a bit
  await new Promise((resolve) => setTimeout(resolve, 10));

  // 3. Bob unresolves
  const asReviewer = t.withIdentity({ subject: reviewerId });
  await asReviewer.mutation(api.comments.toggleResolved, { commentId });
  comment = await asReviewer.run(async (ctx) => await ctx.db.get(commentId));
  expect(comment?.resolved).toBe(false);
  expect(comment?.resolvedChangedBy).toBe(reviewerId);
  expect(comment?.resolvedChangedAt).toBeGreaterThan(firstChangeTime!);

  // 4. Alice re-resolves
  await asOwner.mutation(api.comments.toggleResolved, { commentId });
  comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
  expect(comment?.resolved).toBe(true);
  expect(comment?.resolvedChangedBy).toBe(ownerId);
  expect(comment?.resolvedChangedAt).toBeGreaterThan(firstChangeTime!);
});
```

### Edit Tracking

**Test:** Edit tracking works correctly

```typescript
test("edit tracking sets flags and timestamps correctly", async () => {
  const t = convexTest(schema);
  const { ownerId, versionId } = await setupTestData(t);

  const asOwner = t.withIdentity({ subject: ownerId });

  // Create comment
  const commentId = await asOwner.mutation(api.comments.create, {
    versionId,
    content: "Original content",
    target: sampleTarget,
  });

  // 1. Initially not edited
  let comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
  expect(comment?.isEdited).toBe(false);
  expect(comment?.editedAt).toBeUndefined();

  // 2. Edit comment
  await asOwner.mutation(api.comments.updateContent, {
    commentId,
    content: "Updated content",
  });

  comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
  expect(comment?.content).toBe("Updated content");
  expect(comment?.isEdited).toBe(true);
  expect(comment?.editedAt).toBeDefined();

  // 3. No-op edit (same content)
  const editedAt1 = comment?.editedAt;
  await asOwner.mutation(api.comments.updateContent, {
    commentId,
    content: "Updated content",
  });

  comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
  expect(comment?.editedAt).toBe(editedAt1); // Unchanged
});
```

---

## Test Execution Order (TDD)

### Phase 1: Foundation (Permission Helpers)

1. **Create test file** `app/convex/__tests__/comments.test.ts`
2. **Add imports and setup helpers**
3. **Test `requireCommentPermission`:**
   - Owner can access (RED → GREEN)
   - Reviewer can access (RED → GREEN)
   - Unauthenticated fails (RED → GREEN)
   - Outsider fails (RED → GREEN)
   - Deleted version/artifact (RED → GREEN)
4. **Test `canEditComment`:** Author check (RED → GREEN)
5. **Test `canDeleteComment`:** Author/owner check (RED → GREEN)

### Phase 2: Comment CRUD

6. **Test `create`:**
   - Basic creation (RED → GREEN)
   - Permission checks (RED → GREEN)
   - Content validation (RED → GREEN)
   - Initial state (RED → GREEN)
7. **Test `getByVersion`:**
   - Basic query (RED → GREEN)
   - Permission checks (RED → GREEN)
   - Excludes deleted (RED → GREEN)
   - Enrichment (RED → GREEN)
8. **Test `updateContent`:**
   - Basic update (RED → GREEN)
   - Author-only check (RED → GREEN)
   - Validation (RED → GREEN)
   - Edit tracking (RED → GREEN)
9. **Test `toggleResolved`:**
   - Basic toggle (RED → GREEN)
   - Tracking fields (RED → GREEN)
10. **Test `softDelete`:**
    - Basic delete (RED → GREEN)
    - Permission checks (RED → GREEN)
    - Audit trail (RED → GREEN)

### Phase 3: Reply CRUD

11. **Test `createReply`:** (Similar pattern to comment create)
12. **Test `getReplies`:** (Similar pattern to getByVersion)
13. **Test `updateReply`:** (Similar pattern to updateContent)
14. **Test `softDeleteReply`:** (Similar pattern to softDelete)

### Phase 4: Integration & Cascade

15. **Test cascade delete** (comment → replies)
16. **Test resolution tracking timeline**
17. **Test edit tracking**

---

## Success Criteria

### All Tests Passing

- ✅ All permission helper tests pass
- ✅ All comment CRUD tests pass
- ✅ All reply CRUD tests pass
- ✅ All integration tests pass
- ✅ No uses of `filter()` in queries (only `withIndex`)
- ✅ All validators present (`args`, `returns`)

### Coverage Expectations

| Function | Test Count | Coverage |
|----------|-----------|----------|
| `requireCommentPermission` | 6 | All paths |
| `canEditComment` | 2 | All paths |
| `canDeleteComment` | 4 | All paths |
| `create` | 9 | All validations + happy path |
| `getByVersion` | 7 | Permissions + filters + enrichment |
| `updateContent` | 11 | Permissions + validations + tracking + not found |
| `toggleResolved` | 7 | Toggle + tracking + not found |
| `softDelete` | 9 | Permissions + cascade + not found |
| `createReply` | 8 | Similar to create |
| `getReplies` | 7 | Similar to getByVersion |
| `updateReply` | 12 | Similar to updateContent + not found |
| `softDeleteReply` | 7 | Permissions + audit + not found |
| **Integration** | 3 | Cascade, resolution, edit tracking |
| **TOTAL** | **92 tests** | **Comprehensive** |

### Code Quality

- ✅ Follows Convex rules exactly (new syntax, validators, no filter)
- ✅ Uses indexes correctly (`withIndex`)
- ✅ Clear error messages for all failure cases
- ✅ Consistent naming conventions
- ✅ DRY test fixtures (setupTestData helper)

---

## Running Tests

```bash
# From app/ directory
cd app

# Run all tests
npx vitest

# Run just comment tests
npx vitest convex/__tests__/comments.test.ts

# Watch mode during TDD
npx vitest convex/__tests__/comments.test.ts --watch

# Coverage
npx vitest --coverage
```

---

## Test Utilities

### Assertions to Use

```typescript
// IDs and existence
expect(commentId).toBeDefined();
expect(comment).not.toBeNull();

// Content
expect(comment.content).toBe("Expected text");

// Flags
expect(comment.isEdited).toBe(true);
expect(comment.isDeleted).toBe(false);

// Timestamps
expect(comment.createdAt).toBeDefined();
expect(comment.editedAt).toBeGreaterThan(comment.createdAt);

// Arrays
expect(comments).toHaveLength(3);
expect(comments.every((c) => c.isDeleted === false)).toBe(true);

// Errors
await expect(async () => {
  await mutation();
}).rejects.toThrow("Expected error message");
```

### Common Patterns

```typescript
// Setup with identity
const asOwner = t.withIdentity({ subject: ownerId });
const result = await asOwner.mutation(api.comments.create, { ... });

// Direct DB access for verification
const comment = await t.run(async (ctx) => await ctx.db.get(commentId));

// Query all (for cascade verification)
const allReplies = await t.run(async (ctx) =>
  await ctx.db
    .query("commentReplies")
    .withIndex("by_comment", (q) => q.eq("commentId", commentId))
    .collect()
);
```

---

## Notes

### Content Validation Rules

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| Comment content | 1 char (after trim) | 10,000 | Empty after trim = error |
| Reply content | 1 char (after trim) | 5,000 | Empty after trim = error |
| Target metadata | N/A | N/A | Stored as `v.any()` |

### Resolution Tracking Behavior

- **On creation:** `resolved: false`, tracking fields undefined
- **On toggle:** `resolvedChangedBy` and `resolvedChangedAt` always updated
- **Never cleared:** Fields persist across all toggles

### Soft Delete Behavior

- **Comment delete:** Sets `isDeleted`, `deletedBy`, `deletedAt`
- **Cascade:** All replies get same audit fields
- **Queries:** Use `withIndex` with `isDeleted: false` to exclude

### Index Usage

| Query | Index | Fields |
|-------|-------|--------|
| Get comments by version | `by_version_active` | `[versionId, isDeleted]` |
| Get replies by comment | `by_comment_active` | `[commentId, isDeleted]` |
| Cascade delete | `by_comment` | `[commentId]` |

---

## Architect Review Changes (v1.1)

The following changes were made based on the architect's review feedback:

### 1. Test Fixtures Updated to Match Actual Schema

**Problem:** Test fixtures used incorrect field names that didn't match `app/convex/schema.ts`.

**Fixed:**
- **`artifacts`**: Added missing `shareToken` and `updatedAt` fields
- **`artifactVersions`**: Changed from `storageId`, `format`, `metadata` to `fileType`, `htmlContent`, `fileSize`
- **`artifactReviewers`**: Changed from `permission`, `createdAt` to `email`, `invitedBy`, `invitedAt`, `status`

### 2. Added Security Tests for Authenticated Outsiders

**Added 2 tests** to verify `requireCommentPermission` is called by delete operations:
- `softDelete`: "Outsider cannot delete any comment" → Throws "No permission to comment on this artifact"
- `softDeleteReply`: "Outsider cannot delete any reply" → Throws "No permission to comment on this artifact"

**Note:** Per architect's decision, unauthenticated tests are only at the helper level (no redundant endpoint tests).

### 3. Added "Not Found" Tests for Invalid IDs

**Added 5 tests** for invalid ID handling:
- `updateContent`: Invalid commentId → Throws "Comment not found"
- `toggleResolved`: Invalid commentId → Throws "Comment not found"
- `softDelete`: Invalid commentId → Throws "Comment not found"
- `updateReply`: Invalid replyId → Throws "Reply not found"
- `softDeleteReply`: Invalid replyId → Throws "Reply not found"

### 4. Updated Test Count

- **Original:** 85 tests
- **Added:** 7 tests (2 outsider + 5 not found)
- **New Total:** 92 tests

### Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| Permission Helpers | 12 | ✅ Complete |
| Comment CRUD | 43 | ✅ Includes outsider + not found |
| Reply CRUD | 34 | ✅ Includes outsider + not found |
| Integration | 3 | ✅ Complete |
| **TOTAL** | **92** | **Ready for TDD Implementation** |

---

## References

- API Design: `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/api-design.md`
- Schema Design: `tasks/00017-implement-commenting/02-phase-2-backend/01-schema-design/schema.md`
- Convex Rules: `docs/architecture/convex-rules.md`
- Testing Guide: `docs/development/testing-guide.md`
- TDD Workflow: `docs/development/workflow.md`
- Architect Review: `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/test-plan-review.md`
