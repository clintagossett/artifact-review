# Subtask 02: Phase 2 - Retrieval + Read Permissions

**Parent Task:** 00018 - Refine Single-File Artifact Upload and Versioning
**Status:** Ready for Implementation
**Created:** 2025-12-31

---

## Objective

Update retrieval logic to read from blob storage (unified pattern) and implement read permission checks for artifact viewing. Complete the unified storage migration by removing deprecated inline content fields.

---

## Phase 1 Accomplishments (Prerequisites)

Phase 1 is complete with the following delivered:

- **Unified blob storage** - New `create` and `addVersion` actions store all content in `artifactFiles` + `_storage`
- **Upload mutations** - Using blob storage pattern (action + internal mutation)
- **Write permissions** - Owner-only for add version, update name, delete
- **Soft delete audit trail** - `deletedBy` field tracks who deleted
- **File type helper module** - `/app/convex/lib/fileTypes.ts` with validation, defaults, MIME types
- **Schema updates** - Added `createdBy`, `versionName`, `deletedBy` fields
- **No migrations** - Using delete/reset approach in dev

**Key files from Phase 1:**
- `/app/convex/artifacts.ts` - Updated `create` and `addVersion` actions
- `/app/convex/lib/fileTypes.ts` - File type validation helpers
- `/app/convex/schema.ts` - Updated with new fields (optional for backward compat)

---

## Phase 2 Scope

### In Scope

1. **Read permission helper module** - Centralized permission checking
2. **Content retrieval queries** - Read from `artifactFiles` + blob storage
3. **HTTP serving update** - Unified pattern for all file types
4. **Viewer UI updates** - Fetch content from blob URLs
5. **Version queries update** - Include new fields, exclude deprecated
6. **Schema cleanup** - Remove `htmlContent`, `markdownContent`, make fields required
7. **E2E tests** - Full flow from upload to viewing

### Out of Scope

- Upload/write operations (Phase 1 - complete)
- Schema addition of new fields (Phase 1 - complete)
- Multi-file ZIP artifact improvements (future task)

---

## Implementation Steps Summary

| Step | Description | Location |
|------|-------------|----------|
| 1 | Create read permission helpers | `/app/convex/lib/permissions.ts` |
| 2 | Create unified content retrieval queries | `/app/convex/artifacts.ts` |
| 3 | Update HTTP serving for unified pattern | `/app/convex/http.ts` |
| 4 | Update internal queries for HTTP actions | `/app/convex/artifacts.ts` |
| 5 | Update viewer frontend | `/app/src/components/artifact/DocumentViewer.tsx` |
| 6 | Update version queries for viewer | `/app/convex/artifacts.ts` |
| 7 | Add read permission checks to all queries | `/app/convex/artifacts.ts` |
| 8 | Schema cleanup - remove deprecated fields | `/app/convex/schema.ts` |
| 9 | E2E tests for complete flow | `./tests/e2e/` |
| 10 | Backend tests for read permissions | `./tests/convex/` |

See `IMPLEMENTATION-PLAN.md` for detailed step-by-step instructions.

---

## Read Permission Model

### Permission Levels

| Level | Description | Grants |
|-------|-------------|--------|
| `owner` | Artifact creator | View, edit, delete, manage |
| `reviewer` | Invited via `artifactReviewers` | View, comment |
| `public` | Anyone with shareToken | View only |

### Permission Rules

| Operation | Owner | Reviewer | Public |
|-----------|:-----:|:--------:|:------:|
| View artifact | Y | Y | Y (via shareToken) |
| View versions | Y | Y | Y |
| View file content | Y | Y | Y |
| See version metadata | Y | Y | Y |
| Add comments | Y | Y | N |
| Manage artifact | Y | N | N |

### Permission Helper Functions

```typescript
// convex/lib/permissions.ts

// Get permission level for artifact
getArtifactPermission(ctx, artifactId): "owner" | "reviewer" | "public" | null

// Check if can view artifact
canViewArtifact(ctx, artifactId): boolean

// Check if can view version
canViewVersion(ctx, versionId): boolean

// Get artifact with permission check
getArtifactByShareToken(ctx, shareToken): { artifact, permission } | null
```

---

## Key Changes

### 1. HTTP Serving (Unified Pattern)

**Before (separate code paths):**
```typescript
if (version.fileType === "html" && version.htmlContent) {
  // Serve inline HTML
  return new Response(version.htmlContent, ...);
}

if (version.fileType === "zip") {
  // Look up in artifactFiles
  const file = await getFileByPath(...);
  // Fetch from storage
}
```

**After (single code path):**
```typescript
// UNIFIED: All file types use same pattern
const file = await getFileByPath(versionId, entryPoint);
const url = await ctx.storage.getUrl(file.storageId);
const response = await fetch(url);
return new Response(await response.arrayBuffer(), ...);
```

### 2. Content Retrieval Queries

**New queries:**
- `getEntryPointContent` - Get signed URL for main content
- `getFileContent` - Get signed URL for any file path
- `getFileTree` - List all files in a version

### 3. Schema Cleanup

**Fields to remove:**
- `htmlContent` - No longer used
- `markdownContent` - No longer used

**Fields to make required:**
- `entryPoint` - Always set for unified storage
- `createdBy` - Track authorship

---

## Testing Strategy

### Tier 1: Convex Backend Tests (MANDATORY)

```
tests/convex/
├── permissions.test.ts     # Permission helper tests
├── retrieval.test.ts       # Content retrieval tests
└── versions.test.ts        # Version query tests
```

**Coverage requirements:**
- All permission scenarios (owner, reviewer, public, unauthorized)
- Content retrieval from blob storage
- Version listing with new fields
- Error cases (deleted, not found)

### Tier 2: E2E Tests (RECOMMENDED)

```
tests/e2e/specs/
├── view-artifact.spec.ts   # View HTML/Markdown artifacts
├── permissions.spec.ts     # Permission enforcement
└── version-switch.spec.ts  # Version switching
```

**Test scenarios:**
- Owner views own artifact
- Reviewer views invited artifact
- Public user views via shareToken
- Version switching loads correct content
- Deleted artifact returns 404

---

## Success Criteria

### Retrieval Works
- [ ] Content loaded from blob storage
- [ ] Signed URLs returned to frontend
- [ ] HTTP serving uses unified pattern
- [ ] Viewer displays HTML correctly
- [ ] Viewer displays Markdown correctly

### Permissions Work
- [ ] ShareToken grants public view access
- [ ] Reviewers can view invited artifacts
- [ ] Owners can view their artifacts
- [ ] Unauthorized access returns null/404

### Cleanup Complete
- [ ] `htmlContent` removed from schema
- [ ] `markdownContent` removed from schema
- [ ] `entryPoint` is required
- [ ] `createdBy` is required

### Tests Pass
- [ ] All backend tests pass
- [ ] E2E tests pass (with video recordings)
- [ ] Test report created

---

## Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| Implementation Plan | `./IMPLEMENTATION-PLAN.md` | Complete |
| Permission helpers | `/app/convex/lib/permissions.ts` | Pending |
| Updated artifacts.ts | `/app/convex/artifacts.ts` | Pending |
| Updated http.ts | `/app/convex/http.ts` | Pending |
| Updated viewer | `/app/src/components/artifact/DocumentViewer.tsx` | Pending |
| Updated schema | `/app/convex/schema.ts` | Pending |
| Backend tests | `./tests/convex/` | Pending |
| E2E tests | `./tests/e2e/` | Pending |
| Test report | `./test-report.md` | Pending |

---

## Development Notes

### Dev Environment Approach

Per project guidelines, we're using **delete/reset approach** rather than migrations:
1. Delete test data before schema changes
2. Update schema
3. Deploy
4. Create fresh test data

This is appropriate for development phase. Production migrations will be handled separately.

### Important Convex Rules to Follow

From `docs/architecture/convex-rules.md`:
- Always use `args` and `returns` validators
- Use `v.null()` for void returns
- Use `withIndex` not `filter` for queries
- Actions cannot use `ctx.db` (use internal mutations)
- Include `"use node";` for Node.js modules

---

## References

- **Parent Task:** `../README.md`
- **End-State Design:** `../END-STATE-DESIGN.md`
- **Phase 1:** `../01-phase1-upload-write-permissions/`
- **Convex Rules:** `docs/architecture/convex-rules.md`
- **ADR 0012:** `docs/architecture/decisions/0012-unified-artifact-storage.md`

---

**Created:** 2025-12-31
**Author:** Software Architect Agent
**Version:** 1.0
