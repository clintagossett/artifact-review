# Backend Migration Plan: authorId to createdBy

**Task:** 00025 - Migrate comment and commentReply schema from authorId to createdBy
**Date:** 2026-01-03
**Scope:** Backend (Convex) only - frontend handled separately

---

## Summary

This document details every backend change required to migrate `comments` and `commentReplies` tables from `authorId` to `createdBy` for compliance with ADR 12 (Naming Conventions).

### Development Environment Context

**IMPORTANT:** This is a development environment migration with the following conditions:

- **Environment:** Development (not production)
- **Breaking Changes:** Expected and acceptable
- **Data State:** All related tables (`comments`, `commentReplies`) have been cleared of data
- **Migration Strategy:** Direct schema changes without data preservation concerns
- **No Gradual Migration Needed:** We can make all breaking changes at once

This means:
- No need for backward compatibility
- No need for data migration scripts
- No need for gradual rollout
- Convex will handle schema updates automatically on deployment
- Any existing test data will need to be recreated with new schema

### ADR 12 Requirements

From ADR 12, the standard for record creator fields:

> **Use `createdBy` for all tables.** This field answers one question: "Who initiated this record's creation?"

The ADR explicitly lists `authorId` as an anti-pattern:

```typescript
// Anti-patterns (from ADR 12):
comments: defineTable({
  authorId: v.id("users"),     // Use createdBy
  madeBy: v.id("users"),       // Use createdBy
  writtenBy: v.id("users"),    // Use createdBy
  postedBy: v.id("users"),     // Use createdBy
})
```

And provides the correct pattern:

```typescript
// Correct (from ADR 12):
comments: defineTable({
  createdBy: v.id("users"),    // Who created this comment
  content: v.string(),
  // ...
})
  .index("by_created_by", ["createdBy"])
```

---

## Changes by File

### 1. Schema: `app/convex/schema.ts`

#### Comments Table (lines 632-747)

| Current | ADR 12 Compliant | Line(s) |
|---------|------------------|---------|
| `authorId: v.id("users")` | `createdBy: v.id("users")` | 643 |
| `.index("by_author", ["authorId"])` | `.index("by_created_by", ["createdBy"])` | 740 |
| `.index("by_author_active", ["authorId", "isDeleted"])` | `.index("by_created_by_active", ["createdBy", "isDeleted"])` | 747 |

**Doc comment updates needed:**
- Line 638-642: Change "Reference to user who created the comment. Determines edit permissions (only author can edit content)." to "Reference to user who created the comment. Determines edit permissions (only creator can edit content)."
- Line 738: Update example to use `by_created_by` and `createdBy`
- Line 745: Update example to use `by_created_by_active` and `createdBy`

#### CommentReplies Table (lines 749-857)

| Current | ADR 12 Compliant | Line(s) |
|---------|------------------|---------|
| `authorId: v.id("users")` | `createdBy: v.id("users")` | 783 |
| `.index("by_author", ["authorId"])` | `.index("by_created_by", ["createdBy"])` | 850 |
| `.index("by_author_active", ["authorId", "isDeleted"])` | `.index("by_created_by_active", ["createdBy", "isDeleted"])` | 857 |

**Doc comment updates needed:**
- Line 778-782: Change "Reference to user who created the reply. Determines edit permissions (only author can edit content)." to "Reference to user who created the reply. Determines edit permissions (only creator can edit content)."
- Line 848: Update example to use `by_created_by` and `createdBy`
- Line 855: Update example to use `by_created_by_active` and `createdBy`

---

### 2. Comments Module: `app/convex/comments.ts`

#### Return Type Validator (lines 27-49)

| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `authorId: v.id("users")` | `createdBy: v.id("users")` | 32 |

#### Data Enrichment (line 67)

| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `await ctx.db.get(comment.authorId)` | `await ctx.db.get(comment.createdBy)` | 67 |

#### Insert Statement (line 144)

| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `authorId: userId` | `createdBy: userId` | 144 |

#### Permission Check (line 182)

| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `canEditComment(comment.authorId, userId)` | `canEditComment(comment.createdBy, userId)` | 182 |

---

### 3. Comment Replies Module: `app/convex/commentReplies.ts`

#### Return Type Validator (lines 27-44)

| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `authorId: v.id("users")` | `createdBy: v.id("users")` | 32 |

#### Data Enrichment (line 67)

| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `await ctx.db.get(reply.authorId)` | `await ctx.db.get(reply.createdBy)` | 67 |

#### Insert Statement (line 120)

| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `authorId: userId` | `createdBy: userId` | 120 |

#### Permission Check (line 162)

| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `canEditReply(reply.authorId, userId)` | `canEditReply(reply.createdBy, userId)` | 162 |

#### Delete Permission Check (line 221)

| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `canDeleteReply(ctx, comment.versionId, reply.authorId, userId)` | `canDeleteReply(ctx, comment.versionId, reply.createdBy, userId)` | 221 |

---

### 4. Comment Permissions: `app/convex/lib/commentPermissions.ts`

#### canEditComment Function (lines 75-85)

**JSDoc parameter (line 76):**
| Current | ADR 12 Compliant |
|---------|------------------|
| `@param authorId - The comment's author` | `@param createdBy - The comment's creator` |

**Function signature (lines 80-84):**
| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `authorId: Id<"users">` | `createdBy: Id<"users">` | 81 |
| `return authorId === userId` | `return createdBy === userId` | 84 |

#### canDeleteComment Function (lines 96-115)

**Permission check (line 103):**
| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `comment.authorId === userId` | `comment.createdBy === userId` | 103 |

#### canEditReply Function (lines 117-130)

**JSDoc parameter (line 121):**
| Current | ADR 12 Compliant |
|---------|------------------|
| `@param authorId - The reply's author` | `@param createdBy - The reply's creator` |

**Function signature (lines 125-129):**
| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `authorId: Id<"users">` | `createdBy: Id<"users">` | 126 |
| `return authorId === userId` | `return createdBy === userId` | 129 |

#### canDeleteReply Function (lines 132-162)

**JSDoc parameter (line 139):**
| Current | ADR 12 Compliant |
|---------|------------------|
| `@param authorId - The reply's author` | `@param createdBy - The reply's creator` |

**Function signature (lines 143-150):**
| Current | ADR 12 Compliant | Line |
|---------|------------------|------|
| `authorId: Id<"users">` | `createdBy: Id<"users">` | 146 |
| `if (authorId === userId)` | `if (createdBy === userId)` | 150 |

---

### 5. Tests: `app/convex/__tests__/comments.test.ts`

#### Test Data Insertions

All places where test comments or replies are created with `authorId`:

| Line | Current | ADR 12 Compliant |
|------|---------|------------------|
| 265 | `authorId: ownerId` | `createdBy: ownerId` |
| 295 | `authorId: reviewerId` | `createdBy: reviewerId` |
| 348 | `authorId: reviewerId` | `createdBy: reviewerId` |
| 784 | `authorId: ownerId` | `createdBy: ownerId` |
| 925 | `authorId: ownerId` | `createdBy: ownerId` |
| 1058 | `authorId: ownerId` | `createdBy: ownerId` |
| 1705 | `authorId: ownerId` | `createdBy: ownerId` |
| 1906 | `authorId: ownerId` | `createdBy: ownerId` |

---

## Additional Notes

### Test File Uses Old Schema Fields

The test file `app/convex/__tests__/comments.test.ts` also uses outdated schema fields in its `setupTestData` helper:

- Line 89: `title: "Test Artifact"` should be `name: "Test Artifact"` (per Task 00022 migration)
- Line 90: `creatorId: ownerId` should be `createdBy: ownerId` (per Task 00022 migration)
- Lines 103-107: Uses old `htmlContent` field which no longer exists

These should be fixed as part of this migration or in a separate cleanup.

### No Frontend Changes in This Document

This plan covers backend (Convex) changes only. Frontend changes will be handled separately and include:
- TypeScript types in components
- Props and variable names
- Display logic

---

## Summary Table

| File | Changes |
|------|---------|
| `app/convex/schema.ts` | 2 fields, 4 indexes, 6 doc comments |
| `app/convex/comments.ts` | 4 code changes |
| `app/convex/commentReplies.ts` | 5 code changes |
| `app/convex/lib/commentPermissions.ts` | 8 code changes (params, logic) |
| `app/convex/__tests__/comments.test.ts` | 8 test data insertions |

**Total: 33 changes across 5 files**

---

## Implementation Order

1. **Schema first** (`app/convex/schema.ts`)
   - Update field names
   - Update index names
   - Update doc comments

2. **Permission helpers** (`app/convex/lib/commentPermissions.ts`)
   - Update function parameters
   - Update internal logic

3. **Comments module** (`app/convex/comments.ts`)
   - Update return validators
   - Update data access
   - Update insert statements
   - Update permission calls

4. **Comment replies module** (`app/convex/commentReplies.ts`)
   - Update return validators
   - Update data access
   - Update insert statements
   - Update permission calls

5. **Tests** (`app/convex/__tests__/comments.test.ts`)
   - Update all test data insertions

6. **Verify**
   - Run all tests
   - Check Convex dashboard for schema deployment

---

## Rollback Plan

**Note:** Since this is a development environment with cleared tables, rollback is straightforward:

If migration fails:
1. Revert all file changes via git
2. Convex will auto-revert schema on next successful deployment
3. No data loss concerns - tables were already cleared

**Data Migration:** Since all `comments` and `commentReplies` data has been cleared, there is no data to migrate. Convex will simply update the schema structure when the changes are deployed.
