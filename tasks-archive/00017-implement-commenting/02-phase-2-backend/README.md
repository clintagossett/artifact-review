# Phase 2: Build Backend (Convex)

**Parent Task:** 00017 - Implement Commenting
**Status:** Schema Design Complete, Implementation Not Started
**Prerequisites:** Phase 1 Complete

---

## Objective

Design and implement Convex schema, queries, and mutations for commenting on text and elements. This phase builds the complete backend data layer using **Test-Driven Development (TDD)**.

**SCOPE:** Comments only - no text editing suggestions.

---

## Scope

### What to Do

1. ✅ Design schema for `comments` and `commentReplies` tables (COMPLETE)
2. Implement CRUD operations with permissions using TDD
3. Write comprehensive backend tests (as part of TDD workflow)

### What NOT to Do

- ❌ No frontend integration yet
- ❌ No React hooks
- ❌ No UI changes

---

## Subtasks

### ✅ 01-schema-design (COMPLETE)

**Status:** Complete (2025-12-28)

Designed Convex schema for comments with versioned JSON target metadata.

**Deliverables:**
- ✅ Schema design document: `schema.md`
- ✅ Separate tables: `comments` and `commentReplies`
- ✅ Versioned JSON for target metadata (backend-agnostic)
- ✅ Permission model: Owner + Reviewer (can-comment)
- ✅ Indexes for efficient queries
- ✅ Edit tracking: `isEdited` + `editedAt`
- ✅ Soft delete following ADR 0011

**Key Decision:** Use `targetSchemaVersion` + `target` (JSON) instead of 8+ HTML-specific fields. Frontend owns targeting schema.

See: `tasks/00017-implement-commenting/02-phase-2-backend/schema.md`

---

### 02-implementation (TDD: CRUD + Permissions + Tests)

**Status:** Not Started

Implement all backend functionality using Test-Driven Development.

**Approach:**
This is ONE subtask, not separate CRUD/permissions/tests steps. Following TDD workflow:
1. **Architect designs API** - Function signatures, validators, permission flow
2. **TDD Developer implements** - Red-Green-Refactor cycle
   - Write failing test (RED)
   - Write minimal code to pass (GREEN)
   - Refactor
   - Repeat

**Deliverables:**

#### Schema Implementation
- `convex/schema.ts` updated with `comments` and `commentReplies` tables
- All indexes defined per schema.md

#### Comment Operations (`convex/comments.ts`)
- `getByVersion` query - Get all comments for a version
- `create` mutation - Create comment (text or element)
- `updateContent` mutation - Edit own comment
- `toggleResolved` mutation - Mark as resolved/unresolved
- `softDelete` mutation - Soft delete comment

#### Reply Operations (`convex/comments.ts` or `convex/replies.ts`)
- `getReplies` query - Get replies for a comment
- `createReply` mutation - Add reply to comment
- `updateReply` mutation - Edit own reply
- `softDeleteReply` mutation - Soft delete reply

#### Permission Helpers (`convex/lib/commentPermissions.ts`)
- `requireCommentPermission()` - Check can-comment or owner
- `canEditComment()` - Check if user is author
- `canDeleteComment()` - Check if user is author OR owner
- `canEditReply()` - Check if user is author
- `canDeleteReply()` - Check if user is author OR owner

#### Tests (`convex/__tests__/comments.test.ts`)
- All CRUD operations with happy paths
- Permission enforcement (unauthorized blocked)
- Edit tracking (isEdited flag)
- Soft delete behavior
- Cascade delete (version deleted → comments deleted)
- Edge cases (deleted versions, missing data)

**Success Criteria:**
- All tests passing
- All functions follow Convex rules (validators, indexes, no filter)
- Permission checks prevent unauthorized actions
- Edit tracking works correctly
- Soft delete pattern followed

---

## Current Status

| Subtask | Status | Date |
|---------|--------|------|
| 01-schema-design | ✅ Complete | 2025-12-28 |
| 02-implementation | ⏳ Not Started | - |

---

## Key Files

### Completed
- ✅ `tasks/00017-implement-commenting/02-phase-2-backend/schema.md`

### To Create
- `convex/schema.ts` (update)
- `convex/comments.ts` (new)
- `convex/lib/commentPermissions.ts` (new)
- `convex/__tests__/comments.test.ts` (new)

### May Update
- `convex/sharing.ts` (if permission helpers need artifact access)

---

## Development Workflow

Following `docs/development/workflow.md`:

### Step 1: API Design (Architect)
- Define function signatures with validators
- Specify permission requirements
- Document query patterns
- Create `02-implementation/api-design.md`

### Step 2: TDD Implementation (TDD Developer)
- Write test for first function (RED)
- Implement minimal code (GREEN)
- Refactor
- Repeat for all functions
- Tests live in `convex/__tests__/comments.test.ts`

### Step 3: Validation
- All tests passing
- Manual testing via Convex dashboard
- Record validation evidence in `02-implementation/completion-report.md`

---

## References

- **Schema Design:** `tasks/00017-implement-commenting/02-phase-2-backend/schema.md`
- **Convex Rules:** `docs/architecture/convex-rules.md`
- **TDD Workflow:** `docs/development/workflow.md`
- **Testing Guide:** `docs/development/testing-guide.md`
- **Logging Guide:** `docs/development/logging-guide.md`
