# Phase 2: Build Backend (Convex)

**Parent Task:** 00017 - Implement Commenting
**Status:** Not Started
**Prerequisites:** Phase 1 Complete

---

## Objective

Design and implement Convex schema, queries, and mutations for commenting on text and elements. This phase builds the complete backend data layer without touching the frontend.

**SCOPE:** Comments only - no text editing suggestions.

---

## Scope

### What to Do

1. Design schema for `comments` table
2. Implement CRUD operations for comments
3. Add permission checks to all mutations
4. Write comprehensive backend tests

### What NOT to Do

- ❌ No frontend integration yet
- ❌ No React hooks
- ❌ No UI changes

---

## Subtasks

### 01-schema-design

Design Convex schema for comments table with proper indexes.

**Deliverables:**
- ADR documenting schema decisions
- `convex/schema.ts` updated with comments table
- Indexes for efficient queries

### 02-comment-crud

Implement comment queries and mutations.

**Deliverables:**
- `convex/comments.ts` with:
  - `getByVersion` query
  - `create` mutation (for text and element comments)
  - `addReply` mutation
  - `toggleResolved` mutation
  - `delete` mutation

### 03-permissions

Add permission checks to all comment mutations.

**Deliverables:**
- Permission logic in all mutations:
  - `can-comment` or `owner` can create comments
  - `can-comment` or `owner` can reply to comments
  - Author or `owner` can delete comments
  - Anyone with `can-comment` can toggle resolved
- Update `convex/sharing.ts` if needed

### 04-tests

Write comprehensive tests for all backend functionality.

**Deliverables:**
- Unit tests for all queries/mutations
- Permission tests (unauthorized access blocked)
- Edge case tests (deleted versions, etc.)

---

## Success Criteria

- Comments table defined in schema with proper indexes
- All comment CRUD operations implemented following Convex rules
- Permission checks enforce proper access control
- All tests passing
- No frontend changes made in this phase

---

## Key Files

### New Files

- `convex/comments.ts`
- `docs/architecture/decisions/00XX-comments-schema.md`

### Modified Files

- `convex/schema.ts`
- `convex/sharing.ts` (if needed)

---

## References

- **Convex Rules:** `docs/architecture/convex-rules.md`
- **ADR Template:** `docs/architecture/decisions/_index.md`
- **Testing Guide:** `docs/development/testing-guide.md`
