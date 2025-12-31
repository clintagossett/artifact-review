# Task 18 Session Resume

**Last Updated:** 2025-12-31
**Status:** 🚧 In Progress - Architect Review + Scope Refinement

**Scope:** Single-file artifacts (HTML, Markdown) only. Design with forward-compatibility for ZIP in mind.

---

## Current Status

### ✅ Completed

**Session 1 (2025-12-31):**
1. ✅ Created GitHub Issue #18
2. ✅ Created task folder (00018)
3. ✅ Analyzed current version model and permission implementation
4. ✅ Documented current state with issues identified
5. ✅ Created comprehensive task README with implementation plan
6. ✅ **Scope Refinement** - Narrowed to single-file artifacts only
7. ✅ **Forward-Compatibility Planning** - Documented storage patterns for future ZIP support
8. ✅ Launched architect agent (background) - Analyzing upload/storage/retrieval architecture

### 🚧 In Progress

**Subtask 1:** Architect agent analyzing implementation (background)
- Creating: `IMPLEMENTATION-OVERVIEW.md`
- Analyzing: Upload flow, storage patterns, retrieval, current gaps
- Will inform: Permission model design and schema changes

**Next Step:** Review architect's findings, then proceed with permission model ADR

### ⏳ Pending

**Remaining Subtasks:**
1. ✅ Subtask 1: Architect Review (In Progress - background)
2. Subtask 2: Review Upload Flow for Single-File Artifacts
3. Subtask 3: Design Permission Model (ADR)
4. Subtask 4: Schema Updates (authorId, description)
5. Subtask 5: Update Version Operations
6. Subtask 6: Backend Tests
7. Subtask 7: Migration & Deployment

---

## Scope Refinement (Session 1)

### Initial Scope (Too Broad)
- All artifact types (HTML, Markdown, ZIP)
- Version model and permissions for all cases
- Risk: Trying to solve both simple and complex cases at once

### Refined Scope (Focused)
**✅ In Scope: Single-File Artifacts**
- HTML artifacts (content in `htmlContent` field)
- Markdown artifacts (content in `markdownContent` field)
- Upload, storage, retrieval, versioning, permissions

**❌ Out of Scope: Multi-File Artifacts**
- ZIP artifacts (deferred to Task 19+)
- File extraction, `artifactFiles` table
- Multi-file serving logic

### Forward-Compatibility Requirement

**Key Insight:** Single-file vs multi-file storage is different, but versioning/permissions should be the same.

**Storage Patterns:**
| Aspect | Single-File (HTML/MD) | Multi-File (ZIP) |
|--------|----------------------|------------------|
| Content storage | Inline (one field) | Separate table (`artifactFiles`) |
| Versioning | ✅ Shared pattern | ✅ Shared pattern |
| Permissions | ✅ Shared pattern | ✅ Shared pattern |
| Authorship | ✅ Shared pattern | ✅ Shared pattern |

**Design Goal:** Any schema changes (authorId, description) must work for both storage patterns.

---

## Key Findings from Analysis

### Issues Identified

1. **No Version Authorship**
   - Current: No tracking of who created each version
   - Problem: Can't attribute versions to users
   - Solution: Add `authorId` field to `artifactVersions` table

2. **Inconsistent Permission Checks**
   - Mutations have auth checks ✅
   - Queries have NO auth checks ❌
   - Risk: Anyone can read any version with direct ID access
   - Solution: Add permission checks to all version queries

3. **No Version Metadata**
   - Missing: Description/changelog for versions
   - Missing: Version status (draft/published)
   - Missing: Parent version tracking
   - Solution: Add `description` field, defer status to future

4. **Permission Model Gaps**
   - Unclear: Who can create versions? (currently: owner only)
   - Unclear: Who can view versions? (currently: anyone with shareToken)
   - Unclear: Should reviewers be able to upload versions?
   - Solution: Document in ADR

### Current Permission Model

**Artifact-Level Permissions:**
- `owner` - Artifact creator (full control)
- `can-comment` - Invited reviewers (view + comment)
- `null` - Public users (view via shareToken)

**Version Operations:**
| Operation | Owner | Reviewer | Public |
|-----------|-------|----------|--------|
| Create version | ✅ | ❌ | ❌ |
| View version | ✅ | ✅ | ✅ (via shareToken) |
| Delete version | ✅ | ❌ | ❌ |
| Add comments | ✅ | ✅ | ❌ |

---

## Proposed Solution

### Simple Approach (Recommended)

**Schema Changes:**
```typescript
artifactVersions: defineTable({
  // ... existing fields
  authorId: v.id("users"),  // NEW: Track who created version
  description: v.optional(v.string()),  // NEW: Version notes
})
  .index("by_author", ["authorId"])  // NEW: List by author
```

**Permission Model:**
- Keep existing permission levels (owner, can-comment, null)
- Add version authorship tracking
- Add auth checks to all queries
- Defer advanced features (draft states, can-edit role)

**Migration:**
- Backfill `authorId` from `artifact.creatorId` for existing versions

### Implementation Phases

1. **ADR** - Document permission decisions
2. **Schema** - Add authorId + description fields
3. **Operations** - Update mutations to set authorId
4. **Permissions** - Add query auth checks
5. **Tests** - Backend test coverage
6. **Migration** - Backfill existing data

---

## Decision Points (for ADR)

These questions need answers in Subtask 1:

### 1. Who can create versions?
- [ ] Option A: Owner only (current) ✅ **RECOMMENDED**
- [ ] Option B: Owner + reviewers with "can-edit" permission
- [ ] Option C: Anyone with "can-comment" permission

### 2. Who can view versions?
- [ ] Option A: Same as artifact access (shareToken) ✅ **RECOMMENDED**
- [ ] Option B: Version-level privacy controls
- [ ] Option C: Draft versions restricted to author + owner

### 3. Who can delete versions?
- [ ] Option A: Owner only (current) ✅ **RECOMMENDED**
- [ ] Option B: Version author can delete own
- [ ] Option C: Owner + version author

### 4. Do we need version states (draft/published)?
- [ ] Option A: Not yet, defer to future ✅ **RECOMMENDED**
- [ ] Option B: Add draft/published states now
- [ ] Option C: Add full lifecycle (draft, review, published, archived)

### 5. Do we need "can-edit" permission level?
- [ ] Option A: Not yet, defer to future ✅ **RECOMMENDED**
- [ ] Option B: Add "can-edit" for reviewers who can upload versions

**Recommendation:** Choose all Option A's (simplest path forward)

---

## Files to Modify

### Schema
- `app/convex/schema.ts` - Add authorId, description to artifactVersions

### Operations
- `app/convex/artifacts.ts` - Update all version mutations

### New Files
- `app/convex/lib/versionPermissions.ts` - Permission helper functions

### Tests
- `tasks/00018-refine-version-model-permissions/04-backend-tests/` - Test suite

---

## Success Metrics

**Target Outcomes:**
- ✅ Every version has an author
- ✅ Permission checks on all version queries
- ✅ Backend tests with 100% coverage
- ✅ Zero regressions in existing functionality
- ✅ Clear documentation of permission model

**Non-Goals (Deferred):**
- Draft/published version states
- Version comparison/diff
- "Can-edit" permission level
- Version approval workflows

---

## Next Session

**Immediate Next Steps:**
1. Create subtask folder: `01-adr-permission-model/`
2. Write ADR answering the 5 decision points
3. Get user feedback on permission model (if needed)
4. Proceed to schema updates

**Questions for User:**
- Do you agree with the "simple approach" (Option A for all decisions)?
- Should reviewers be able to upload new versions?
- Do you need draft versions hidden from reviewers?

---

## References

- **GitHub Issue:** https://github.com/clintagossett/artifact-review/issues/18
- **Current Schema:** `app/convex/schema.ts` lines 253-347
- **Permission Implementation:** `app/convex/sharing.ts` lines 228-270
- **Version Operations:** `app/convex/artifacts.ts`
- **Similar Pattern:** Task 00017 commenting system (shows permission model in practice)

---

**Status:** Task initialized and analyzed. Ready to begin implementation with ADR.
