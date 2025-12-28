# Phase 2: Build Backend (Convex)

**Parent Task:** 00017 - Implement Commenting
**Status:** Not Started
**Prerequisites:** Phase 1 Complete

---

## Objective

Design and implement Convex schema, queries, and mutations for comments and text edits. This phase builds the complete backend data layer without touching the frontend.

---

## Scope

### What to Do

1. Design schema for `comments` and `textEdits` tables
2. Implement CRUD operations for comments
3. Implement CRUD operations for text edits
4. Add permission checks to all mutations
5. Write comprehensive backend tests

### What NOT to Do

- ❌ No frontend integration yet
- ❌ No React hooks
- ❌ No UI changes

---

## Subtasks

### 01-schema-design

Design Convex schema for comments and text edits tables with proper indexes.

**Deliverables:**
- ADR documenting schema decisions
- `convex/schema.ts` updated with new tables
- Indexes for efficient queries

### 02-comment-crud

Implement comment queries and mutations.

**Deliverables:**
- `convex/comments.ts` with:
  - `getByVersion` query
  - `create` mutation
  - `addReply` mutation
  - `toggleResolved` mutation
  - `delete` mutation

### 03-text-edit-crud

Implement text edit queries and mutations.

**Deliverables:**
- `convex/textEdits.ts` with:
  - `getByVersion` query
  - `create` mutation
  - `accept` mutation
  - `reject` mutation
  - `delete` mutation

### 04-permissions

Add permission checks to all mutations.

**Deliverables:**
- Permission logic in all mutations:
  - `can-comment` or `owner` can create comments/edits
  - `owner` can accept/reject text edits
  - Author can delete own comments
  - Author or owner can delete comments
- Update `convex/sharing.ts` if needed

### 05-tests

Write comprehensive tests for all backend functionality.

**Deliverables:**
- Unit tests for all queries/mutations
- Permission tests (unauthorized access blocked)
- Edge case tests (deleted versions, etc.)

---

## Success Criteria

- All tables defined in schema with proper indexes
- All CRUD operations implemented following Convex rules
- Permission checks enforce proper access control
- All tests passing
- No frontend changes made in this phase

---

## Key Files

### New Files

- `convex/comments.ts`
- `convex/textEdits.ts`
- `docs/architecture/decisions/00XX-comments-schema.md`

### Modified Files

- `convex/schema.ts`
- `convex/sharing.ts` (if needed)

---

## References

- **Convex Rules:** `docs/architecture/convex-rules.md`
- **ADR Template:** `docs/architecture/decisions/_index.md`
- **Testing Guide:** `docs/development/testing-guide.md`
