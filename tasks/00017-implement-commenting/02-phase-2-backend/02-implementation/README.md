# Subtask 02: Backend Implementation (TDD)

**Parent:** Phase 2 - Build Backend
**Status:** Not Started
**Approach:** Test-Driven Development (CRUD + Permissions + Tests together)

---

## Overview

Implement all Convex backend functionality for commenting using **Test-Driven Development**. This is NOT separate CRUD/permissions/tests steps - it's one unified TDD implementation.

---

## TDD Workflow

### Step 1: API Design (Architect)

Design the complete API before writing any code.

**Output:** `api-design.md` containing:
- All function signatures with validators
- Permission requirements for each function
- Query patterns and index usage
- Helper function specifications

### Step 2: Implementation (TDD Developer)

Follow Red-Green-Refactor cycle:

1. **RED** - Write failing test
2. **GREEN** - Write minimal code to pass
3. **REFACTOR** - Clean up
4. **REPEAT** - Next function

**Deliverables:**
- `app/convex/schema.ts` - Updated with comments tables
- `app/convex/comments.ts` - All comment CRUD operations
- `app/convex/lib/commentPermissions.ts` - Permission helpers
- `app/convex/__tests__/comments.test.ts` - Comprehensive tests

### Step 3: Validation

**Output:** `completion-report.md` with:
- Test results (all passing)
- Manual testing evidence
- Code coverage summary

---

## Functions to Implement

### Comment Operations

| Function | Type | Purpose |
|----------|------|---------|
| `getByVersion` | query | Get all comments for a version |
| `create` | mutation | Create new comment |
| `updateContent` | mutation | Edit own comment content |
| `toggleResolved` | mutation | Mark resolved/unresolved |
| `softDelete` | mutation | Soft delete comment |

### Reply Operations

| Function | Type | Purpose |
|----------|------|---------|
| `createReply` | mutation | Add reply to comment |
| `updateReply` | mutation | Edit own reply |
| `softDeleteReply` | mutation | Soft delete reply |

### Permission Helpers

| Function | Type | Purpose |
|----------|------|---------|
| `requireCommentPermission` | helper | Check can-comment or owner |
| `canEdit` | helper | Check if user is author |
| `canDelete` | helper | Check if user is author OR owner |

---

## Test Coverage Required

### CRUD Operations
- ✅ Create comment with valid data
- ✅ Get comments by version
- ✅ Update own comment
- ✅ Delete own comment
- ✅ Create and get replies

### Permissions
- ✅ Owner can create/edit/delete
- ✅ Reviewer can create/edit own
- ✅ Reviewer CANNOT delete others
- ✅ Owner CAN delete any comment
- ✅ Unauthorized user blocked

### Edit Tracking
- ✅ isEdited flag set on edit
- ✅ editedAt timestamp updated
- ✅ New comments have isEdited=false

### Soft Delete
- ✅ Deleted comments excluded from queries
- ✅ Cascade delete (version → comments → replies)
- ✅ deletedAt timestamp set

### Edge Cases
- ✅ Cannot comment on deleted version
- ✅ Cannot edit deleted comment
- ✅ Invalid versionId returns error

---

## Success Criteria

- [ ] All functions implemented with validators
- [ ] All tests passing (100%)
- [ ] Permission checks enforced
- [ ] Follows Convex rules (no filter, proper indexes)
- [ ] Edit tracking works correctly
- [ ] Soft delete pattern followed
- [ ] API design documented
- [ ] Completion report written

---

## Files

### To Create
- `api-design.md` - Function signatures and design
- `completion-report.md` - Final validation

### Code Files
- `app/convex/schema.ts` (update)
- `app/convex/comments.ts` (new)
- `app/convex/lib/commentPermissions.ts` (new)
- `app/convex/__tests__/comments.test.ts` (new)

---

## References

- Schema: `../schema.md`
- Convex Rules: `/docs/architecture/convex-rules.md`
- TDD Workflow: `/docs/development/workflow.md`
- Testing Guide: `/docs/development/testing-guide.md`
