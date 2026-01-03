# Task 10 Handoff: Backend Implementation Ready

**Date:** 2025-12-26
**From:** Architecture & Planning Phase
**To:** TDD Developer Agent
**Status:** Ready for Backend Implementation

---

## Executive Summary

**ALL architecture decisions are complete.** Backend implementation (Subtask 02) can begin immediately with TDD approach.

**Scope:** All 3 artifact types (ZIP, HTML, Markdown) in backend. Frontend UI for markdown viewer deferred but API supports it.

---

## What's Complete ✅

### 1. Architecture Decisions (Subtask 01)
- ✅ **ADR 0009:** Artifact File Storage Structure created
- ✅ **Schema design:** All 3 tables defined
- ✅ **File storage strategy:** Flat table with path strings (chef-validated)
- ✅ **ZIP handling:** Async extraction with JSZip, entry point auto-detection
- ✅ **Versioning:** Soft deletion, mixed types allowed, 1+ versions required
- ✅ **File size limits:** Defined per ADR 0002
- ✅ **Frontend validation:** Lightweight ZIP peek with jszip

### 2. Sample Files Created
- ✅ **Organized structure:** `/samples/` with 4 categories
  - `01-valid/` - ZIP, HTML, Markdown samples
  - `02-warnings/` - Files with missing dependencies
  - `03-edge-cases/` - ZIP without index.html
  - `04-invalid/` - Empty files, wrong types
- ✅ **Documentation:** `samples/README.md` with testing guide

### 3. Chef Implementation Reviewed
- ✅ **Location:** `/Users/clintgossett/Downloads/htmlreview_-_collaborative_html_document_review_platform`
- ✅ **Pattern validated:** Flat `documentAssets` table works
- ✅ **Code patterns:** JSZip extraction, HTTP proxy serving

---

## Schema Design (Final)

### Table 1: artifacts
```typescript
artifacts: defineTable({
  title: v.string(),
  description: v.optional(v.string()),
  creatorId: v.id("users"),
  shareToken: v.string(),              // nanoid(8) for /a/{token}
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_creator", ["creatorId"])
  .index("by_creator_active", ["creatorId", "isDeleted"])
  .index("by_share_token", ["shareToken"]),
```

### Table 2: artifactVersions
```typescript
artifactVersions: defineTable({
  artifactId: v.id("artifacts"),
  versionNumber: v.number(),           // Auto-increment: 1, 2, 3...
  fileType: v.union(
    v.literal("zip"),
    v.literal("html"),
    v.literal("markdown")
  ),

  // Type-specific fields
  htmlContent: v.optional(v.string()),      // For type="html"
  markdownContent: v.optional(v.string()),  // For type="markdown"
  entryPoint: v.optional(v.string()),       // For type="zip"

  fileSize: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_active", ["artifactId", "isDeleted"])
  .index("by_artifact_version", ["artifactId", "versionNumber"]),
```

### Table 3: artifactFiles
```typescript
artifactFiles: defineTable({
  versionId: v.id("artifactVersions"),
  filePath: v.string(),                // "assets/logo.png"
  storageId: v.id("_storage"),
  mimeType: v.string(),
  fileSize: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
  .index("by_version", ["versionId"])
  .index("by_version_path", ["versionId", "filePath"])  // O(1) lookups
  .index("by_version_active", ["versionId", "isDeleted"]),
```

---

## File Size Limits

| Type | Limit | Enforcement |
|------|-------|-------------|
| ZIP total | 100MB | Frontend + backend |
| Extracted size | 200MB | Backend |
| HTML standalone | 5MB | Frontend + backend |
| Markdown | 1MB | Frontend + backend |
| Individual file in ZIP | 20MB | Backend |
| Max files per ZIP | 500 | Backend |

---

## Key Behaviors

### ZIP Files
1. **Upload** → Frontend peeks metadata with jszip (file count, HTML list)
2. **Extract** → Backend async action with JSZip
3. **Entry Point:**
   - Search for `index.html` (case-insensitive, any depth) → Auto-select
   - Else search for `main.html` → Auto-select
   - Else show dropdown of all `.html` files → User selects
4. **Store** → Each file as row in `artifactFiles` table
5. **Serve** → HTTP proxy at `/a/{token}/v{version}/{filePath}`

### HTML Files
1. **Upload** → Detect local file references (`./`, `../`, `/`)
2. **Warn** → "We detected N missing files. Upload as ZIP?"
3. **Store** → In `htmlContent` field if user continues
4. **Allow** → External CDN URLs (`https://`)

### Markdown Files
1. **Upload** → Detect local file/image references
2. **Warn** → "We detected N local references. Upload as ZIP?"
3. **Store** → In `markdownContent` field if user continues
4. **Render** → GitHub-flavored markdown with syntax highlighting

### Versioning
- ✅ **Mixed types allowed:** v1 ZIP, v2 HTML, v3 Markdown
- ✅ **Soft deletion:** All deletes are soft (data persists)
- ✅ **Cannot delete last version:** Must have 1+ versions always
- ✅ **Cascade deletion:** Deleting version deletes all comments

---

## Backend Implementation Tasks (Subtask 02)

### Files to Create

1. **`convex/schema.ts`** - Add 3 tables
2. **`convex/artifacts.ts`** - Mutations and queries
3. **`convex/zipProcessor.ts`** - ZIP extraction action (use chef pattern)
4. **`convex/zipProcessorMutations.ts`** - Internal mutations for file storage
5. **`convex/http.ts`** - HTTP proxy endpoints for file serving
6. **`convex/lib/validators.ts`** - File validation helpers
7. **`convex/lib/mimeTypes.ts`** - MIME type detection

### Mutations to Implement

```typescript
// artifacts.ts
export const create = mutation({...})              // Create new artifact (v1)
export const addVersion = mutation({...})          // Add new version (v2, v3...)
export const softDelete = mutation({...})          // Soft delete artifact
export const softDeleteVersion = mutation({...})   // Soft delete version

// Internal mutations (zipProcessorMutations.ts)
export const storeExtractedFile = internalMutation({...})
export const markProcessingComplete = internalMutation({...})
export const markProcessingError = internalMutation({...})
```

### Queries to Implement

```typescript
// artifacts.ts
export const list = query({...})                   // List user's artifacts
export const get = query({...})                    // Get artifact by ID
export const getByShareToken = query({...})        // Public access via /a/{token}
export const getVersion = query({...})             // Get specific version
export const getFileByPath = query({...})          // For HTTP proxy
```

### Actions to Implement

```typescript
// zipProcessor.ts (Node.js action)
export const processZipFile = action({...})        // Extract ZIP asynchronously
```

---

## TDD Workflow

### 1. Start with Backend Tests

**Location:** `tasks/00010-artifact-upload-creation/tests/backend/`

**Test Files to Create:**
- `artifacts.test.ts` - Mutation/query tests
- `zipProcessor.test.ts` - ZIP extraction tests
- `validation.test.ts` - File validation tests
- `softDeletion.test.ts` - Soft delete cascade tests

### 2. Test-First Approach

```typescript
// RED: Write failing test
test('should create artifact with v1', async () => {
  const result = await create({
    title: 'Test Artifact',
    fileType: 'html',
    htmlContent: '<html>...</html>',
    fileSize: 1024,
  });

  expect(result.versionNumber).toBe(1);
  expect(result.shareToken).toHaveLength(8);
});

// GREEN: Implement minimal code to pass
// REFACTOR: Clean up
```

### 3. Use Sample Files

```typescript
// Test with actual samples
const zipFile = await fs.readFile('samples/01-valid/zip/charting/v1.zip');
const result = await processZipFile({ zipBuffer: zipFile, ... });
expect(result.files).toHaveLength(4);
expect(result.entryPoint).toBe('index.html');
```

---

## Chef Code to Reference

**Location:** `/Users/clintgossett/Downloads/htmlreview_-_collaborative_html_document_review_platform`

**Key Files:**
- `convex/schema.ts` - documentAssets table pattern
- `convex/zipProcessor.ts` - JSZip extraction logic
- `convex/zipProcessorMutations.ts` - File storage mutations
- `convex/router.ts` - HTTP proxy implementation
- `convex/documents.ts` - getAssetByPath query

**Patterns to Copy:**
1. Async ZIP extraction with scheduler
2. JSZip usage and error handling
3. MIME type detection function
4. Path-based file lookup with compound index
5. HTTP proxy with Content-Type headers

---

## Validation Rules to Implement

### Frontend Validation (Quick Checks)
- File type: `.zip`, `.html`, `.htm`, `.md`
- File size: Immediate check before upload
- ZIP peek: File count, HTML detection (jszip metadata only)

### Backend Validation (Security Boundary)
- File type validation (trust nothing from frontend)
- File size enforcement
- ZIP: Max 500 files, max 200MB extracted
- HTML: Max 5MB
- Markdown: Max 1MB
- Individual files in ZIP: Max 20MB each

### Dependency Detection
- HTML: Scan for `href="./`, `src="./`, `src="/`, `src="../`
- Markdown: Scan for `![](./`, `[](./`, `[](../`
- Allow: `https://`, `http://`, `data:`

---

## References

### ADRs
- **ADR 0002:** HTML Artifact Storage (HTTP proxy, file size limits)
- **ADR 0009:** Artifact File Storage Structure (flat table pattern)

### Documentation
- **Task 10 README:** Complete overview
- **Subtask 01 README:** Architecture decisions
- **samples/README.md:** Testing guide
- **Convex Rules:** `docs/architecture/convex-rules.md`
- **Testing Guide:** `docs/development/testing-guide.md`
- **Logging Guide:** `docs/development/logging-guide.md`

### Sample Files
- **Valid samples:** `samples/01-valid/`
- **Warning samples:** `samples/02-warnings/`
- **Edge cases:** `samples/03-edge-cases/`
- **Invalid samples:** `samples/04-invalid/`

---

## Next Steps for TDD Developer

1. **Read references** (Convex rules, testing guide)
2. **Review chef implementation** (understand patterns)
3. **Write backend tests first** (TDD red-green-refactor)
4. **Implement schema** in `convex/schema.ts`
5. **Implement mutations/queries** with full validators
6. **Implement ZIP processor** (copy chef pattern)
7. **Implement HTTP proxy** for file serving
8. **Run tests with sample files**
9. **Create validation video**
10. **Write test report**

---

## Success Criteria

### Backend Complete When:
- ✅ All 3 tables in schema
- ✅ All mutations have validators (args + returns)
- ✅ All queries have validators
- ✅ ZIP extraction works with chef pattern
- ✅ Entry point auto-detection works
- ✅ HTTP proxy serves files correctly
- ✅ Soft deletion cascades correctly
- ✅ File size limits enforced
- ✅ All backend tests pass
- ✅ Sample files validate correctly

---

## Questions?

Reference this handoff and the documents above. Everything is decided and documented. Focus on TDD implementation with sample files for validation.

**Ready to code!** 🚀
