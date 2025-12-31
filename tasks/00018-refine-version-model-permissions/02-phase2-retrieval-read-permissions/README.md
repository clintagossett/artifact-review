# Subtask 02: Phase 2 - Retrieval + Read Permissions

**Parent Task:** 00018 - Refine Single-File Artifact Upload and Versioning
**Status:** ⏳ Pending - Blocked on Phase 1 completion

---

## Objective

Update retrieval logic to read from blob storage and implement read permission checks for artifact viewing.

---

## Scope

**In Scope:**
1. Update query operations to read from `artifactFiles` + blob storage
2. Add permission checks to all read operations
3. Update viewer UI to fetch content from blobs
4. Backend tests for read permissions

**Out of Scope:**
- Upload/write operations (Phase 1)
- Schema changes (Phase 1)
- Migration (Phase 1)

---

## Prerequisites

**Must be completed first (Phase 1):**
- ✅ Schema updated with unified storage
- ✅ Upload mutations store files as blobs
- ✅ Migration completed for existing data
- ✅ All data in new format (`artifactFiles` + `_storage`)

---

## Core Changes

### 1. Query Updates

**Update existing queries:**
- `artifacts.getVersion` - Read from `artifactFiles` instead of inline fields
- `artifacts.getVersionByNumber` - Read from `artifactFiles`
- `artifacts.getLatestVersion` - Read from `artifactFiles`
- `artifacts.getVersions` - List versions (no content changes)

**Content retrieval pattern:**
```typescript
// 1. Get version from artifactVersions
const version = await ctx.db.get(versionId);

// 2. Get file entry from artifactFiles
const file = await ctx.db
  .query("artifactFiles")
  .withIndex("by_version_path", q =>
    q.eq("versionId", versionId).eq("filePath", version.entryPoint)
  )
  .first();

// 3. Get signed URL for blob
const url = await ctx.storage.getUrl(file.storageId);

// 4. Return URL to client
return { ...version, contentUrl: url };
```

### 2. Read Permissions

**Permission checks needed:**
- Check artifact access before returning version data
- Validate shareToken for public users
- Verify reviewer status for `can-comment` users
- Confirm ownership for owner users

**Implementation:**
- Create `canViewArtifact()` helper function
- Call in all query operations
- Return 404/403 for unauthorized access

### 3. Viewer UI Updates

**Frontend changes:**
- Fetch content from signed blob URL instead of inline field
- Handle async blob loading
- Show loading state while fetching
- Error handling for failed blob fetches

**Components to update:**
- `DocumentViewer.tsx` - Main viewer component
- Version switcher - Still works (no changes needed)

### 4. Backend Tests

**Test coverage:**
- ✅ Owner can view all versions
- ✅ Reviewers can view versions via shareToken
- ✅ Public users can view via shareToken
- ✅ Unauthorized users get 403/404
- ✅ Deleted versions return 404
- ✅ Invalid shareToken returns 404

---

## Success Criteria

**Retrieval Works:**
- ✅ Content loaded from blob storage
- ✅ Signed URLs returned to client
- ✅ Viewer displays HTML/Markdown correctly
- ✅ No references to inline content fields

**Permissions Work:**
- ✅ ShareToken grants public access
- ✅ Reviewers can view artifacts they're invited to
- ✅ Owners can view their artifacts
- ✅ Unauthorized access blocked

**UI Works:**
- ✅ Viewer loads content from blob URLs
- ✅ Loading states shown appropriately
- ✅ Errors handled gracefully
- ✅ No regressions in existing features

**Tests Pass:**
- ✅ All permission scenarios tested
- ✅ Retrieval logic validated
- ✅ Edge cases handled

---

## Deliverables

**To be created:**
- Updated query operations (`app/convex/artifacts.ts`)
- Permission helper functions (`app/convex/lib/permissions.ts`)
- Updated viewer component (`app/src/components/viewer/DocumentViewer.tsx`)
- Backend tests (`tasks/00018/.../tests/`)
- `IMPLEMENTATION-PLAN.md` - Detailed implementation plan (when Phase 1 complete)

---

## Next Steps

**When Phase 1 is complete:**
1. Architect creates `IMPLEMENTATION-PLAN.md` for Phase 2
2. Review and approve implementation plan
3. Update query operations
4. Update viewer UI
5. Add permission checks
6. Test thoroughly
7. Deploy to production

---

**References:**
- Parent task README: `../README.md`
- End-state design: `../END-STATE-DESIGN.md`
- Phase 1 subtask: `../01-phase1-upload-write-permissions/`
