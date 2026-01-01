# Subtask 01: Phase 1 - Upload Flow + Write Permissions

**Parent Task:** 00018 - Refine Single-File Artifact Upload and Versioning
**Status:** 🔄 Planning - Architect creating phased approach

---

## Objective

Implement unified file storage for single-file artifacts (HTML, Markdown) with proper upload flow and write permissions.

---

## Scope

**In Scope:**
1. Schema changes for unified storage model
2. Upload mutations to store files as blobs
3. Write permission enforcement (owner-only)
4. Backend tests for upload + write operations

**Out of Scope:**
- Retrieval/read operations (Phase 2)
- Viewer UI updates (Phase 2)
- Read permissions (Phase 2)

---

## Core Changes

### 1. Schema Updates

**artifactVersions:**
- Remove: `htmlContent`, `markdownContent`
- Add: `createdBy: v.id("users")`
- Add: `versionName: v.optional(v.string())`
- Add: `deletedBy: v.optional(v.id("users"))`
- Change: `fileType` from union → `v.string()`
- Change: `entryPoint` from optional → required

**artifacts:**
- Add: `deletedBy: v.optional(v.id("users"))`

**artifactFiles:**
- Add: `deletedBy: v.optional(v.id("users"))`

### 2. Upload Mutations

**Update existing:**
- `artifacts.create` - Store content as blob, create `artifactFiles` row
- `artifacts.addVersion` - Store content as blob, create `artifactFiles` row
- `artifacts.softDeleteVersion` - Set `deletedBy` field

**Create new:**
- `artifacts.updateVersionName` - Update version name (owner only)

### 3. Write Permissions (Owner Only)

**Operations:**
- Upload new versions
- Update version name
- Soft delete versions

**Implementation:**
- Check `artifact.creatorId === userId` before all write operations
- Return proper error messages for unauthorized access

### 4. Development Data Strategy

**Approach:** No migrations needed during active development.

Since we're iterating rapidly, breaking schema changes are handled by:
- Deleting existing table contents (via Convex dashboard)
- Redeploying with new schema
- Re-uploading test data as needed

This is faster and simpler than maintaining migration scripts.

**Note:** Production will require proper migration strategy before launch.

---

## Success Criteria

**Upload Works:**
- ✅ HTML files stored as blobs
- ✅ Markdown files stored as blobs
- ✅ `artifactFiles` rows created correctly
- ✅ `entryPoint` set to appropriate file path
- ✅ `createdBy` set from current user

**Permissions Work:**
- ✅ Only owner can upload versions
- ✅ Only owner can update version names
- ✅ Only owner can delete versions
- ✅ Non-owners get proper error messages

**Tests Pass:**
- ✅ Upload mutations create correct structure
- ✅ Permission checks block unauthorized users

---

## Deliverables

**Created by Architect:**
- `IMPLEMENTATION-PLAN.md` - Detailed step-by-step implementation plan

**Implemented:**
- ✅ Updated schema (`app/convex/schema.ts`)
- ✅ Updated mutations (`app/convex/artifacts.ts`)
- ✅ New mutation (`artifacts.updateVersionName`)
- ✅ Backend tests (`tasks/00018/.../tests/`)

---

## Next Steps

1. ✅ Architect creates `IMPLEMENTATION-PLAN.md`
2. ✅ Review and approve implementation plan
3. ✅ Implementation complete
4. ✅ Tests passing
5. 🎯 **Phase 1 COMPLETE** - Move to Phase 2 (Retrieval Operations)

---

**References:**
- Parent task README: `../README.md`
- End-state design: `../END-STATE-DESIGN.md`
- Schema changes summary: `../SCHEMA-CHANGES-SUMMARY.md`
