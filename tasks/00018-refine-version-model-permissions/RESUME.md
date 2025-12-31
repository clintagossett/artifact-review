# Task 18 Session Resume

**Last Updated:** 2025-12-31
**Status:** 🎯 Design Complete - Ready for Phase 1 Implementation

**Scope:** Single-file artifacts (HTML, Markdown) using unified storage model. Design with forward-compatibility for ZIP in mind.

---

## Current Status

### ✅ Completed (Session 1 - 2025-12-31)

**Task Setup:**
1. ✅ Created GitHub Issue #18
2. ✅ Created task folder (00018)
3. ✅ Analyzed current version model and permission implementation
4. ✅ Documented current state with issues identified

**Design Phase:**
5. ✅ **Scope Refinement** - Narrowed to single-file artifacts only
6. ✅ **Architect Review** - Launched architect agent (background) to analyze architecture
7. ✅ **End-State Design** - Created `END-STATE-DESIGN.md` with unified storage model
8. ✅ **Key Decision: Unified Storage** - ALL files use `artifactFiles` + `_storage` blobs
9. ✅ **Key Decision: Audit Trails** - Added `createdBy`, `deletedBy` to all tables
10. ✅ **Key Decision: Version Naming** - Changed `description` → `versionName`
11. ✅ **Key Decision: Extensible fileType** - Changed union → `v.string()` with app validation
12. ✅ **Two-Phase Development Strategy** - Phase 1: Upload, Phase 2: Retrieval + Permissions
13. ✅ **Schema Changes Summary** - Created `SCHEMA-CHANGES-SUMMARY.md` as quick reference
14. ✅ **Updated README** - Documented two-phase approach and core changes

### 🎯 Ready to Start

**Phase 1: Upload + Write Permissions (Next)**
- Implement schema changes (backward compatible)
- Update upload mutations to use blob storage
- **Implement write permissions:**
  - Only artifact owner can upload new versions
  - Only artifact owner can update version name
  - Only artifact owner can soft delete versions
- Create migration script for existing inline content
- Test single-file uploads with new unified storage

### ⏳ Pending (Phase 2)

**Phase 2: Retrieval + Read Permissions**
- Update retrieval logic to read from `artifactFiles` + blob storage
- Add permission checks to all query operations (viewing)
- Update viewer UI to fetch from blob storage
- Backend tests for permission enforcement

---

## Key Design Decisions

### 1. Unified Storage Model ✅
**Decision:** ALL file types (HTML, Markdown, future types) use the same storage pattern
- Content stored in Convex `_storage` as blobs
- File metadata in `artifactFiles` table
- No type-specific inline content fields

**Rationale:**
- Consistency - Same code path for all file types
- Extensibility - Add new types without schema changes
- Simplicity - Single-file = Multi-file with 1 file

### 2. Audit Trail Fields ✅
**Decision:** Add `createdBy` and `deletedBy` to all tables with lifecycle tracking

**Fields:**
- `createdBy: v.id("users")` - Who created the record
- `createdAt: v.number()` - When it was created
- `deletedBy: v.optional(v.id("users"))` - Who soft-deleted it
- `deletedAt: v.optional(v.number())` - When it was deleted
- `isDeleted: v.boolean()` - Whether it's deleted

**Affected Tables:**
- `artifacts` - Add `deletedBy`
- `artifactVersions` - Add `createdBy`, `deletedBy`
- `artifactFiles` - Add `deletedBy`

### 3. Version Naming ✅
**Decision:** Add optional `versionName` field for user-friendly version labels

**Field:** `versionName: v.optional(v.string())`

**Examples:** "Initial Draft", "Client Review v2", "Final"

### 4. Extensible File Types ✅
**Decision:** Change `fileType` from union to `v.string()` with application-level validation

**Current (WRONG):**
```typescript
fileType: v.union(v.literal("zip"), v.literal("html"), v.literal("markdown"))
```

**New (CORRECT):**
```typescript
fileType: v.string()
// Validated in mutation handlers with ALLOWED_FILE_TYPES array
```

**Benefits:**
- Add new types by updating validation array (no schema migration)
- Flexibility for experimentation
- Future-proof

### 5. Required Entry Point ✅
**Decision:** Make `entryPoint` required (not optional)

**Rationale:**
- ALL versions have a main file to display
- Simplifies retrieval logic (no null checks)
- Clear contract for all file types

### 6. Two-Phase Development ✅
**Decision:** Split implementation into Upload (Phase 1) and Retrieval + Permissions (Phase 2)

**Phase 1: Upload Flow**
- Fix data model
- Update mutations to use blob storage
- Migration script

**Phase 2: Retrieval + Permissions**
- Add permission checks
- Update queries to read from blobs
- Viewer UI updates

**Rationale:**
- Upload is one-way write (simpler)
- Must get data model right before permissions matter
- Cleaner separation of concerns

---

## Design Evolution (Session 1)

### Initial Scope (Too Broad)
- All artifact types (HTML, Markdown, ZIP)
- Version model and permissions for all cases
- Risk: Trying to solve both simple and complex cases at once

### Refined Scope (Focused on Single-File)
**✅ In Scope: Single-File Artifacts**
- HTML artifacts
- Markdown artifacts
- Upload, storage, retrieval, versioning, permissions

**❌ Out of Scope: Multi-File Artifacts**
- ZIP artifacts (deferred to Task 19+)
- File extraction and processing
- Multi-file serving logic

### Critical Insight: Unified Storage is Better

**Initial Thought (WRONG):** Keep inline storage for single-file, use `artifactFiles` for multi-file

**User Feedback:** "I think we need to expand our file storage to be more like multi-file zip so we can have all types of extensions"

**Final Decision (CORRECT):** ALL files use unified storage (`artifactFiles` + `_storage` blobs)

**Storage Pattern:**
| Aspect | Single-File (HTML/MD) | Multi-File (ZIP) |
|--------|----------------------|------------------|
| Content storage | ✅ `artifactFiles` + blobs | ✅ `artifactFiles` + blobs |
| Number of files | Exactly 1 row | Multiple rows |
| Versioning | ✅ Same pattern | ✅ Same pattern |
| Permissions | ✅ Same pattern | ✅ Same pattern |
| Authorship | ✅ Same pattern | ✅ Same pattern |

**Design Principle:** Single-file artifact = Multi-file artifact with exactly one file

---

## Key Findings from Analysis

### Issues Identified

1. **No Version Authorship**
   - Current: No tracking of who created each version
   - Problem: Can't attribute versions to users
   - Solution: Add `createdBy` field to `artifactVersions` table

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

### Unified Storage Approach (Selected)

**Core Principle:** Single-file artifact = Multi-file artifact with exactly one file

**Schema Changes:**
```typescript
artifactVersions: defineTable({
  // REMOVE: htmlContent, markdownContent fields
  // CHANGE: fileType from union → v.string()
  // CHANGE: entryPoint from optional → required
  // ADD: Audit trail fields
  createdBy: v.id("users"),              // NEW: Who created version
  versionName: v.optional(v.string()),   // NEW: Version label
  deletedBy: v.optional(v.id("users")),  // NEW: Who deleted version
  entryPoint: v.string(),                // CHANGED: Now required
  fileType: v.string(),                  // CHANGED: Extensible string
})
  .index("by_created_by", ["createdBy"])  // NEW: List by creator
```

**Storage Pattern:**
- ALL content → Convex `_storage` blobs
- File metadata → `artifactFiles` table
- One row per version for single-file
- Multiple rows per version for multi-file (future)

**Permission Model:**
- Keep existing permission levels (owner, can-comment, null)
- Add version authorship tracking
- Add auth checks to all queries
- Defer advanced features (draft states, can-edit role) to Phase 2

**Migration:**
- Convert inline content (`htmlContent`, `markdownContent`) to blobs
- Create `artifactFiles` row for each existing version
- Backfill `createdBy` from `artifact.creatorId`

### Implementation Phases

1. **Schema Changes** - Unified storage model + audit trails
2. **Upload Mutations** - Store content as blobs
3. **Migration Script** - Convert existing inline content
4. **Retrieval Queries** - Read from artifactFiles + blobs
5. **Permission Checks** - Add auth to all queries
6. **Tests** - Backend test coverage

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
- `app/convex/schema.ts` - Unified storage model changes (see `SCHEMA-CHANGES-SUMMARY.md`)

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
