# Task 00019: Upload and View Multi-file HTML Projects via ZIP

**GitHub Issue:** [#19](https://github.com/clintagossett/artifact-review/issues/19)
**Status:** Ready for Implementation
**Created:** 2025-12-31

---

## Objective

Enable users to upload ZIP files containing multi-file HTML projects and view them in the artifact viewer with working assets (CSS, JS, images).

---

## Background

Currently, the platform supports single-file artifacts (HTML, Markdown) using the unified blob storage pattern implemented in Task 18. This task extends that pattern to support multi-file HTML projects packaged as ZIP files, which is common output from AI coding assistants like Claude Code and Cursor.

### Prerequisites (from Task 18)
- Unified blob storage pattern (all content in `artifactFiles` + `_storage`)
- Permission helpers for read access
- HTTP serving from blob storage
- `entryPoint` field on versions (required)

---

## Scope

### In Scope
1. **ZIP Upload Flow** - Accept and validate ZIP files
2. **ZIP Extraction** - Extract files and store in blob storage
3. **Entry Point Detection** - Find index.html or similar
4. **Asset Serving** - Serve CSS, JS, images with correct MIME types
5. **Relative Path Resolution** - Handle `./`, `../`, and absolute paths
6. **Version Support** - Add new ZIP versions to existing artifacts
7. **Tests** - Unit and E2E tests for full flow

### Out of Scope
- Nested ZIP files (ZIP within ZIP)
- Server-side rendering of dynamic content
- External resource loading (CDN, APIs)
- ZIP files larger than 50MB
- More than 500 files per ZIP

---

## Technical Approach

### 1. Upload Flow

```
User uploads ZIP
    ↓
zipUpload.uploadZip action
    ↓
Store ZIP in temp storage
    ↓
zipProcessor.processZip action
    ↓
Extract files → Store each in blob storage
    ↓
Create artifactFiles records
    ↓
Detect entry point → Update version.entryPoint
```

### 2. File Storage Structure

```
artifactFiles table:
├── versionId: Id<"artifactVersions">
├── filePath: "index.html"           # Relative path within ZIP
├── storageId: Id<"_storage">        # Blob reference
├── mimeType: "text/html"
├── fileSize: 1234
└── isDeleted: false

Example for a ZIP with:
  /index.html
  /styles/main.css
  /scripts/app.js
  /images/logo.png

Creates 4 artifactFiles records with filePaths:
  - "index.html"
  - "styles/main.css"
  - "scripts/app.js"
  - "images/logo.png"
```

### 3. HTTP Serving

```typescript
// Request: /api/artifact/{shareToken}/v{version}/styles/main.css
//
// 1. Parse path segments
// 2. Look up artifactFile by versionId + filePath
// 3. Get signed URL from storage
// 4. Fetch and serve with correct Content-Type
```

### 4. Entry Point Detection

Priority order:
1. `index.html` in root
2. `index.htm` in root
3. First `.html` file found
4. Error if no HTML file

---

## Implementation Steps

| Step | Description | Location |
|------|-------------|----------|
| 1 | Update ZIP validation (size, file count limits) | `lib/fileTypes.ts` |
| 2 | Update ZIP upload action for new storage pattern | `zipUpload.ts` |
| 3 | Update ZIP processor to store files in blob storage | `zipProcessor.ts` |
| 4 | Add entry point detection logic | `zipProcessor.ts` |
| 5 | Update HTTP serving for multi-file paths | `http.ts` |
| 6 | Add MIME type detection for common assets | `lib/fileTypes.ts` |
| 7 | Test ZIP upload flow | `tests/` |
| 8 | Test asset serving | `tests/` |
| 9 | E2E test for full upload-to-view flow | `tests/e2e/` |

---

## File Changes

### Modified Files
- `/app/convex/zipUpload.ts` - Update for blob storage pattern
- `/app/convex/zipProcessor.ts` - Extract to blob storage, detect entry point
- `/app/convex/http.ts` - Handle multi-file path resolution
- `/app/convex/lib/fileTypes.ts` - Add ZIP validation, MIME types

### New Files
- `/app/convex/__tests__/zip-upload.test.ts` - Upload flow tests
- `/app/convex/__tests__/zip-serving.test.ts` - Serving tests
- `tasks/00019-*/tests/e2e/zip-artifact.spec.ts` - E2E tests

---

## Testing Strategy

### Tier 1: Backend Tests (MANDATORY)
```
tests/
├── zip-upload.test.ts      # Upload validation, storage
├── zip-extraction.test.ts  # File extraction, entry point detection
└── zip-serving.test.ts     # HTTP serving, MIME types, paths
```

### Tier 2: E2E Tests (MANDATORY)
```
tests/e2e/
└── zip-artifact.spec.ts    # Full flow with video recording
```

### Test Scenarios
- Upload valid ZIP with index.html
- Upload ZIP without index.html (detect alternative)
- Upload ZIP with nested folders
- Serve CSS file with correct Content-Type
- Serve JS file with correct Content-Type
- Serve image with correct Content-Type
- Relative path resolution (../styles/main.css)
- Version switching loads correct files
- Reject ZIP over size limit
- Reject ZIP with too many files

---

## Sample Test Files

Use samples from `/samples/` directory:
- `zip-v1-simple.zip` through `zip-v5-complex.zip`

---

## Success Criteria

- [ ] ZIP files upload successfully
- [ ] Files extracted and stored in blob storage
- [ ] Entry point detected correctly
- [ ] HTML renders in viewer
- [ ] CSS styles apply correctly
- [ ] JavaScript executes correctly
- [ ] Images display correctly
- [ ] Relative paths resolve correctly
- [ ] Multiple versions supported
- [ ] All tests pass with video recordings

---

## References

- **Task 18:** Unified blob storage pattern
- **ADR 0009:** Artifact File Storage Structure
- **Existing code:** `zipUpload.ts`, `zipProcessor.ts`

---

**Created:** 2025-12-31
**Author:** Claude Code
