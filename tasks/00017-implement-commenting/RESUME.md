# Task 17 Session Resume

**Last Updated:** 2025-12-28
**Session:** Schema Design Complete, Ready for Implementation

---

## Current Status

### ✅ Completed

1. **Schema Design (Subtask 01)** - COMPLETE
   - Designed `comments` and `commentReplies` tables
   - Key innovation: Versioned JSON for target metadata (11 fields vs 17)
   - Backend-agnostic approach (HTML, Markdown, future formats)
   - Permission model: Owner + Reviewer (no public/moderation)
   - Location: `tasks/00017-implement-commenting/02-phase-2-backend/01-schema-design/schema.md`
   - Committed: 5b0ebcb, 8b52840, b649a97

2. **Task Restructuring** - COMPLETE
   - Reorganized from waterfall (4 steps) to TDD (2 steps)
   - Removed artificial CRUD/permissions/tests separation
   - Combined into single TDD implementation subtask
   - Updated READMEs to reflect proper TDD workflow

### ⏳ Next Up

**Subtask 02: Implementation** (Not Started)
- Step 1: Architect designs API (function signatures, validators, permissions)
- Step 2: TDD Developer implements with E2E backend integration tests
- Step 3: Validation and test upleveling

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
- Reduced from 17 to 12 fields (includes resolution tracking)

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

**Deferred:**
- No public viewing considerations
- No reviewer moderation

### 4. TDD Workflow (Not Waterfall)

**Wrong approach (original):**
1. Write CRUD code
2. Add permissions
3. Write tests

**Correct approach (updated):**
1. Architect designs API
2. TDD Developer: RED (test) → GREEN (code) → REFACTOR → REPEAT
3. Tests and code emerge together

---

## Schema Summary

### Comments Table (12 fields)

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
  deletedAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
})
  .index("by_version_active", ["versionId", "isDeleted"])
  .index("by_version", ["versionId"])
  .index("by_author", ["authorId"])
  .index("by_author_active", ["authorId", "isDeleted"])
```

### Comment Replies Table (8 fields)

```typescript
commentReplies: defineTable({
  commentId: v.id("comments"),
  authorId: v.id("users"),
  content: v.string(),
  isEdited: v.boolean(),
  editedAt: v.optional(v.number()),
  isDeleted: v.boolean(),
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
| Function | Purpose |
|----------|---------|
| `requireCommentPermission` | Check can-comment or owner |
| `canEdit` | Check if user is author |
| `canDelete` | Check if user is author OR owner |

---

## Testing Approach

### Test Type
**E2E Backend Integration Tests** using `convex-test`

### What convex-test Can Test
✅ Database operations
✅ Permission logic
✅ Business logic
✅ Metadata handling
✅ Soft deletes
✅ Edit tracking

### What convex-test Cannot Test
❌ Actual file uploads (has storage limitations)
❌ External services (email)
❌ Full-stack UI flows

### Test Location
- During development: `tasks/00017.../02-implementation/tests/e2e/`
- After completion: Uplevel to `app/convex/__tests__/comments.test.ts`

### Test Coverage Required
- CRUD operations (create, read, update, delete)
- Permission enforcement (owner, reviewer, unauthorized)
- Edit tracking (isEdited flag, editedAt timestamp)
- Soft delete behavior
- Cascade delete (version → comments → replies)
- Edge cases (deleted version, invalid IDs, empty content)

---

## Files Modified This Session

### Created
- `tasks/00017-implement-commenting/02-phase-2-backend/01-schema-design/schema.md`
- `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/README.md`
- `tasks/00017-implement-commenting/02-phase-2-backend/README.md` (updated)

### Deleted
- `tasks/00017-implement-commenting/02-phase-2-backend/02-comment-crud/`
- `tasks/00017-implement-commenting/02-phase-2-backend/03-permissions/`
- `tasks/00017-implement-commenting/02-phase-2-backend/04-tests/`

### Commits
- `5b0ebcb` - Task 17: Design comment schema with versioned JSON target metadata
- `8b52840` - Task 17: Restructure Phase 2 subtasks to reflect TDD workflow
- `b649a97` - Task 17: Update implementation docs to clarify E2E test standard

---

## Important Context

### From User
- "DRY things out" = Don't Repeat Yourself
- E2E tests are the standard (not unit tests)
- Always use environment management (venv for Python, not conda)
- Show commit messages after git commit

### From CLAUDE.md
- Use TDD workflow from `docs/development/workflow.md`
- Test samples from `/samples/` directory (central repository)
- All e2e tests MUST produce video recordings (validation)
- Videos are gitignored
- Convex rules: no filter, use indexes, new function syntax

### Project Standards
- Soft delete pattern (ADR 0011): `isDeleted` + `deletedAt`
- Convex function syntax: `args`, `returns`, `handler`
- All validators required (use `v.null()` for void)
- Logging: Use structured logging, not console.log

---

## Next Actions

### Immediate Next Step
**Have architect design the API:**

```bash
# Option 1: Resume existing architect agent
Task tool with subagent_type="architect" and resume="a7d112c"

# Option 2: Start fresh architect agent
Task tool with subagent_type="architect"
```

**Task for architect:**
Create `tasks/00017.../02-implementation/api-design.md` containing:
1. All function signatures with full Convex validators
2. Permission requirements for each function
3. Query patterns showing index usage
4. Helper function specifications
5. Example usage for each function

### After API Design
Hand off to TDD developer:
1. Read api-design.md
2. Implement using Red-Green-Refactor cycle
3. Create tests in `tasks/.../02-implementation/tests/e2e/`
4. Write completion report
5. Uplevel tests to `app/convex/__tests__/`

---

## Questions to Clarify (if any)

None currently - schema is approved, permission model is clear, ready to proceed.

---

## References

- Schema design: `tasks/00017-implement-commenting/02-phase-2-backend/01-schema-design/schema.md`
- Implementation plan: `tasks/00017-implement-commenting/02-phase-2-backend/02-implementation/README.md`
- Convex rules: `docs/architecture/convex-rules.md`
- TDD workflow: `docs/development/workflow.md`
- Testing guide: `docs/development/testing-guide.md`
- Soft delete ADR: `docs/architecture/decisions/0011-soft-delete-strategy.md`

---

## Session Notes

**What went well:**
- User caught important architectural issues early (JSON vs separate fields)
- Good discussion on permission model led to simplification
- TDD restructuring aligned with project standards

**Key learnings:**
- Always check existing project standards before planning
- `convex-test` has storage limitations (good for comments, not for file uploads)
- E2E backend integration tests are the standard, not unit tests

**Ready to proceed:** Yes - schema approved, structure clear, next step defined.
