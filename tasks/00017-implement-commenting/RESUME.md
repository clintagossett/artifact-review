# Task 17 Session Resume

**Last Updated:** 2025-12-28
**Session:** API Design & Test Plan Complete, Ready for TDD Implementation

---

## Current Status

### ✅ Completed

1. **Schema Design (Subtask 01)** - COMPLETE
   - Designed `comments` and `commentReplies` tables
   - Key innovation: Versioned JSON for target metadata (13 fields total)
   - Backend-agnostic approach (HTML, Markdown, future formats)
   - Permission model: Owner + Reviewer (no public/moderation)
   - Location: `tasks/00017-implement-commenting/02-phase-2-backend/01-schema-design/schema.md`
   - Committed: 5b0ebcb, 8b52840, b649a97

2. **API Design (Subtask 02 - Step 1)** - COMPLETE
   - Created comprehensive API design with full Convex validators
   - 9 public functions (5 comment ops, 4 reply ops)
   - 5 internal permission helpers
   - Query patterns with proper index usage (no filter)
   - Location: `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/api-design.md`
   - Agent: a99221f (architect)

3. **Test Plan (Subtask 02 - Step 2)** - COMPLETE
   - Comprehensive test plan with 92 tests
   - Test fixtures matching actual schema
   - TDD execution order defined
   - Security tests for both unauthenticated and authenticated-outsider
   - Location: `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/test-plan.md`
   - Agent: ab24ff2 (tdd-developer)

4. **Test Plan Review & Updates** - COMPLETE
   - Architect reviewed test plan
   - Fixed schema mismatches in test fixtures
   - Added 2 outsider security tests
   - Added 5 "not found" tests
   - Updated test count: 85 → 92
   - Location: `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/test-plan-review.md`

### ⏳ Next Up

**Subtask 02: TDD Implementation** (Not Started)
- TDD Developer implements using Red-Green-Refactor cycle
- Tests written directly in `app/convex/__tests__/comments.test.ts`
- Implementation in `app/convex/comments.ts`, `app/convex/commentReplies.ts`, `app/convex/lib/commentPermissions.ts`
- 92 tests to implement following the test plan

---

## Key Design Decisions

### 1. Versioned JSON for Target Metadata

**Problem:** Original schema had 8+ HTML-specific fields polluting backend.

**Solution:** Self-describing JSON instead:
```typescript
target: v.any()  // Opaque JSON blob with _version inside
```

**Benefits:**
- Backend-agnostic (works for HTML, Markdown, PDF, etc.)
- Frontend owns targeting schema entirely
- Can evolve without backend changes
- Self-describing data (version travels with content)
- Reduced from 17 to 13 fields (includes resolution and delete tracking)

**Example:**
```typescript
{
  target: {
    _version: 1,
    type: "text",
    selectedText: "Click here",
    page: "/index.html",
    location: {
      containerType: "accordion",
      containerLabel: "FAQ 3",
      isHidden: true
    }
  }
}
```

### 2. Separate Tables for Replies

**Decision:** `commentReplies` as separate table, not nested array

**Rationale:**
- Independent CRUD operations
- Proper edit tracking per reply
- Independent soft delete
- Avoids array mutation complexity
- Follows existing pattern (artifacts → versions → files)

### 3. Permission Model (Simplified)

**Two roles only:**
- **Owner** - Full control, can delete any comment (moderation)
- **Reviewer (can-comment)** - Can create/edit own, cannot delete others

**Key rules:**
- Only author can edit their own content
- Owner cannot edit others (would imply authorship)
- Owner can delete any (moderation power)
- Both can resolve/unresolve

**Two types of outsiders:**
- **Unauthenticated** - No auth token at all
- **Authenticated outsider** - Valid user, but NOT in artifactReviewers and NOT owner

**Testing strategy:**
- Test both types at `requireCommentPermission` helper level
- Test authenticated-outsider at each function level (proves helper is called)
- Don't re-test unauthenticated at every function (redundant)

**Deferred:**
- No public viewing considerations
- No reviewer moderation

### 4. Security Architecture Decision

**Issue discovered:** `softDelete` and `softDeleteReply` didn't call `requireCommentPermission` in original API design

**Impact:**
- Outsiders would get "Only the comment author or artifact owner can delete" error
- Information leakage (outsider learns comment exists)
- Inconsistent error messages

**Resolution:**
- API design amended to add `requireCommentPermission` call BEFORE permission checks
- Ensures consistent "No permission to comment on this artifact" error
- Defense-in-depth: helper blocks outsiders, then author/owner check runs

### 5. Test Location for Backend Tests

**Critical clarification:**
- `convex-test` tests MUST live in `app/convex/__tests__/`
- Cannot be in `tasks/.../tests/` (wrong context, import path issues)
- This is different from E2E Playwright tests (those stay in tasks folder)

**Test structure:**
```
app/convex/
  __tests__/
    comments.test.ts    # All backend integration tests (92 tests)
  comments.ts           # Comment operations
  commentReplies.ts     # Reply operations
  lib/
    commentPermissions.ts  # Permission helpers
```

---

## Schema Summary

### Comments Table (13 fields)

```typescript
comments: defineTable({
  // Relationships
  versionId: v.id("artifactVersions"),
  authorId: v.id("users"),

  // Content
  content: v.string(),
  resolved: v.boolean(),
  resolvedChangedBy: v.optional(v.id("users")),
  resolvedChangedAt: v.optional(v.number()),

  // Target metadata (self-describing JSON with _version inside)
  target: v.any(),

  // Edit tracking
  isEdited: v.boolean(),
  editedAt: v.optional(v.number()),

  // Soft delete (ADR 0011)
  isDeleted: v.boolean(),
  deletedBy: v.optional(v.id("users")),
  deletedAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
})
  .index("by_version_active", ["versionId", "isDeleted"])
  .index("by_version", ["versionId"])
  .index("by_author", ["authorId"])
  .index("by_author_active", ["authorId", "isDeleted"])
```

### Comment Replies Table (9 fields)

```typescript
commentReplies: defineTable({
  commentId: v.id("comments"),
  authorId: v.id("users"),
  content: v.string(),
  isEdited: v.boolean(),
  editedAt: v.optional(v.number()),
  isDeleted: v.boolean(),
  deletedBy: v.optional(v.id("users")),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_comment_active", ["commentId", "isDeleted"])
  .index("by_comment", ["commentId"])
  .index("by_author", ["authorId"])
  .index("by_author_active", ["authorId", "isDeleted"])
```

---

## Functions to Implement

### Comment Operations (5 functions)
| Function | Type | Purpose |
|----------|------|---------|
| `getByVersion` | query | Get all comments for a version |
| `create` | mutation | Create new comment |
| `updateContent` | mutation | Edit own comment content |
| `toggleResolved` | mutation | Mark resolved/unresolved |
| `softDelete` | mutation | Soft delete comment |

### Reply Operations (4 functions)
| Function | Type | Purpose |
|----------|------|---------|
| `getReplies` | query | Get all replies for a comment |
| `createReply` | mutation | Add reply to comment |
| `updateReply` | mutation | Edit own reply |
| `softDeleteReply` | mutation | Soft delete reply |

### Permission Helpers (5 internal functions)
| Function | Purpose |
|----------|---------|
| `requireCommentPermission` | Check can-comment or owner (throws if unauthorized) |
| `canEditComment` | Check if user is comment author |
| `canDeleteComment` | Check if user is author OR owner |
| `canEditReply` | Check if user is reply author |
| `canDeleteReply` | Check if user is author OR owner |

---

## Testing Approach

### Test Type
**Backend Integration Tests** using `convex-test`

### Test Location
**CRITICAL:** Tests written directly in `app/convex/__tests__/comments.test.ts`
- NOT in `tasks/` folder (convex-test requires Convex project context)
- Different from E2E Playwright tests which DO live in tasks folder

### Test Count: 92 Tests

| Category | Test Count |
|----------|-----------|
| Permission Helpers | 12 |
| Comment Operations | 37 |
| Reply Operations | 35 |
| Integration Tests | 3 |
| Not Found Tests | 5 |
| **Total** | **92** |

### What convex-test Can Test
✅ Database operations
✅ Permission logic
✅ Business logic
✅ Metadata handling
✅ Soft deletes
✅ Edit tracking
✅ Cascade deletes

### What convex-test Cannot Test
❌ Actual file uploads (has storage limitations)
❌ External services (email)
❌ Full-stack UI flows

### Test Coverage Required
- CRUD operations (create, read, update, delete)
- Permission enforcement (owner, reviewer, authenticated-outsider, unauthenticated)
- Content validation (empty, whitespace, max length)
- Edit tracking (isEdited flag, editedAt timestamp)
- Resolution tracking (resolvedChangedBy, resolvedChangedAt)
- Soft delete behavior with audit trail
- Cascade delete (comment → replies)
- Edge cases (deleted records, invalid IDs, not found)

---

## Files Created This Session

### Design Documents
- `tasks/00017-implement-commenting/02-phase-2-backend/01-schema-design/schema.md`
- `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/api-design.md`
- `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/test-plan.md`
- `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/test-plan-review.md`

### Previous Session
- `tasks/00017-implement-commenting/02-phase-2-backend/README.md` (updated)
- Deleted: `02-comment-crud/`, `03-permissions/`, `04-tests/` (waterfall approach)

### Commits (Previous Session)
- `5b0ebcb` - Task 17: Design comment schema with versioned JSON target metadata
- `8b52840` - Task 17: Restructure Phase 2 subtasks to reflect TDD workflow
- `b649a97` - Task 17: Update implementation docs to clarify E2E test standard

---

## Important Context

### From User
- "DRY things out" = Don't Repeat Yourself
- Backend integration tests (convex-test) are the standard
- Always use environment management (venv for Python, not conda)
- Show commit messages after git commit
- Tests written directly in `app/convex/__tests__/` not tasks folder

### From CLAUDE.md
- Use TDD workflow from `docs/development/workflow.md`
- Test samples from `/samples/` directory (central repository)
- Convex rules: no filter, use indexes, new function syntax
- All validators required (use `v.null()` for void)

### Project Standards
- Soft delete pattern (ADR 0011): `isDeleted` + `deletedAt` + `deletedBy`
- Convex function syntax: `args`, `returns`, `handler`
- All validators required
- Logging: Use structured logging, not console.log

---

## Next Actions

### Immediate Next Step

**Have TDD developer implement the backend:**

Resume TDD developer agent (ab24ff2) with task:
1. Read `api-design.md` and `test-plan.md`
2. Create `app/convex/__tests__/comments.test.ts`
3. Implement using Red-Green-Refactor cycle:
   - Write ONE test (RED)
   - Write minimal code to pass (GREEN)
   - Refactor
   - Repeat for all 92 tests
4. Follow TDD execution order from test plan:
   - Phase 1: Permission helpers
   - Phase 2: Comment CRUD
   - Phase 3: Reply CRUD
   - Phase 4: Integration tests
5. Create files:
   - `app/convex/comments.ts`
   - `app/convex/commentReplies.ts`
   - `app/convex/lib/commentPermissions.ts`
   - Update `app/convex/schema.ts`
6. Write completion report

### Success Criteria
- All 92 tests passing
- No `filter()` usage (only `withIndex`)
- All validators present
- Follows Convex rules exactly
- Soft delete with audit trail working
- Cascade delete working
- Permission boundaries enforced

---

## Security Review Highlights

### Key Questions Answered

1. **Are outsiders blocked from all operations?**
   - ✅ Yes, tested at helper level and each function level

2. **Can artifact owner delete reviewer comments?**
   - ✅ Yes, tested (moderation power)

3. **Can artifact owner edit reviewer comments?**
   - ❌ No, tested (authorship integrity)

4. **Do we test both unauthenticated and authenticated-outsider?**
   - ✅ Yes at helper level, authenticated-outsider at function level
   - Architect decision: Option A (test at helper level, verify at endpoints)

5. **Are delete operations protected?**
   - ✅ Yes, API design amended to call `requireCommentPermission` first
   - Prevents information leakage and ensures consistent error messages

---

## References

- **Schema design:** `tasks/00017-implement-commenting/02-phase-2-backend/01-schema-design/schema.md`
- **API design:** `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/api-design.md`
- **Test plan:** `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/test-plan.md`
- **Test plan review:** `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/test-plan-review.md`
- **Convex rules:** `docs/architecture/convex-rules.md`
- **TDD workflow:** `docs/development/workflow.md`
- **Testing guide:** `docs/development/testing-guide.md`
- **Soft delete ADR:** `docs/architecture/decisions/0011-soft-delete-strategy.md`

---

## Session Notes

### This Session (API Design & Test Plan)

**What went well:**
- Architect created comprehensive API design with full validators
- TDD developer created detailed test plan (92 tests)
- Security review caught important permission check inconsistency
- Good discussion on authenticated vs unauthenticated outsider testing
- Test plan corrected to match actual schema

**Key decisions:**
- Tests go in `app/convex/__tests__/` not tasks folder
- Test both outsider types at helper level, authenticated-outsider at endpoints
- API design amended to add `requireCommentPermission` to delete operations
- 92 tests (up from 85) for comprehensive coverage

**Issues resolved:**
- Schema mismatches in test fixtures (fixed)
- Missing outsider security tests (added 2)
- Missing "not found" tests (added 5)
- Permission check inconsistency in API design (fixed)

### Previous Session (Schema Design)

**What went well:**
- User caught important architectural issues early (JSON vs separate fields)
- Good discussion on permission model led to simplification
- TDD restructuring aligned with project standards

**Key learnings:**
- Always check existing project standards before planning
- `convex-test` has storage limitations (good for comments, not for file uploads)
- Backend integration tests are the standard

---

**Ready to proceed:** Yes - API design complete, test plan approved, ready for TDD implementation
