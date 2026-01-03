# Task 00025: Migrate comment and commentReply schema from authorId to createdBy

**GitHub Issue:** #25

---

## Resume (Start Here)

**Last Updated:** 2026-01-03 (Session 1)

### Current Status: 🟢 READY TO START

**Phase:** Task setup complete. Ready to begin migration.

### What We Did This Session (Session 1)

1. **Created task structure** - GitHub issue #25 and task folder 00025
2. **Analyzed schema** - Identified `authorId` in comments and commentReplies tables

### Next Steps

1. **Update schema** - Rename `authorId` to `createdBy` in comments and commentReplies
2. **Update backend** - Fix all Convex queries/mutations
3. **Update frontend** - Fix all TypeScript component references
4. **Fix tests** - Update all test files
5. **Verify** - Run tests and check application

---

## Objective

Migrate `comments` and `commentReplies` tables to use `createdBy` instead of `authorId` for consistency with the rest of the schema (per ADR 12).

**Rationale:** The schema standardization in Task 00022 and 00024 established `createdBy` as the standard field name for creator references. The comments and commentReplies tables still use the old `authorId` naming, creating inconsistency.

---

## Current State

### Comments Table
- Uses `authorId` to reference user who created the comment
- Has indexes: `by_author`, `by_author_active`

### CommentReplies Table
- Uses `authorId` to reference user who created the reply
- Has indexes: `by_author`, `by_author_active`

This is inconsistent with:
- `artifacts.createdBy`
- `artifactVersions.createdBy`

---

## Decision

**Approach:** Direct schema migration with code updates

1. Update schema fields from `authorId` to `createdBy`
2. Update indexes from `by_author` to `by_created_by`
3. Update all backend code references
4. Update all frontend code references
5. Update all test code references

**Note:** Convex will handle data migration automatically when schema is updated.

---

## Changes Made

_To be filled in during implementation_

---

## Testing

1. Run all backend tests (especially comments and sharing tests)
2. Run all frontend tests
3. Manual verification:
   - Create a comment
   - Create a reply
   - Edit comment/reply
   - Delete comment/reply
   - Toggle resolved status
   - Verify permissions work correctly

---

## Files to Update

### Schema
- `app/convex/schema.ts` - Update comments and commentReplies table definitions

### Backend (Convex)
- `app/convex/comments.ts` - All references to `authorId`
- `app/convex/commentReplies.ts` - All references to `authorId`
- `app/convex/lib/commentPermissions.ts` - Permission checks using `authorId`
- `app/convex/__tests__/comments.test.ts` - Test assertions
- `app/convex/__tests__/commentReplies.test.ts` - Test assertions

### Frontend
- Search for all `authorId` references in comments context
- Update TypeScript types
- Update component logic

### Tests
- All test files referencing comment or reply `authorId`
