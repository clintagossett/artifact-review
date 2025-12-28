# Comprehensive Backend Test Plan

**Created:** 2025-12-27
**Purpose:** Comprehensive integration tests to validate all backend behaviors using sample data

## Test Categories

Based on available sample data and backend APIs, we can create the following comprehensive test suites:

---

## 1. Version Management Test (Primary)

**Sample Data:** `samples/01-valid/zip/charting/` (v1-v5)

**Scenarios:**
- ✅ Upload v1 → validate creation
- ✅ Upload v2 → validate both v1 and v2 exist
- ✅ Upload v3 → validate all three versions
- ✅ Soft delete v2 → validate `isDeleted: true`, v1 and v3 still active
- ✅ Soft delete v3 → validate only v1 remains active
- ✅ **ERROR TEST:** Attempt to delete v1 (last active) → validate error: "Cannot delete the last active version"
- ✅ Upload v4 → validate version number is 4 (not 2, even though v2/v3 are deleted)
- ✅ Final state: v1 active, v2 deleted, v3 deleted, v4 active

**Backend APIs Tested:**
- `zipUpload.createArtifactWithZip`
- `zipUpload.triggerZipProcessing`
- `artifacts.addVersion` (for ZIP)
- `artifacts.softDeleteVersion`
- `artifacts.getVersions` (should only return active)
- `artifacts.getVersion` (should return specific version)

**Validation Points:**
- Version numbering increments correctly with gaps
- Soft deletes don't reuse version numbers
- Can't delete last active version
- Queries filter out deleted versions
- Files are extracted and stored correctly for each version

---

## 2. Mixed File Type Versioning Test

**Sample Data:**
- `samples/01-valid/html/simple-html/v1/index.html` (HTML)
- `samples/01-valid/zip/charting/v2.zip` (ZIP)
- `samples/01-valid/markdown/product-spec/v1.md` (Markdown)

**Scenarios:**
- Upload v1 as HTML → validate `fileType: "html"`, `htmlContent` populated
- Upload v2 as ZIP → validate `fileType: "zip"`, files extracted to `artifactFiles`
- Upload v3 as Markdown → validate `fileType: "markdown"`, `markdownContent` populated
- Validate all three versions coexist on same artifact
- Verify each version serves correctly via HTTP router
- Soft delete v2 (ZIP) → validate only ZIP files are soft deleted, HTML and Markdown unaffected

**Backend APIs Tested:**
- `artifacts.create` (HTML)
- `zipUpload.createArtifactWithZip` (ZIP)
- `artifacts.create` (Markdown)
- `artifacts.addVersion` (mixed types)
- `artifacts.softDeleteVersion`
- HTTP router for all file types

**Validation Points:**
- Same artifact can have different file types across versions
- Each file type stores data correctly (htmlContent, markdownContent, artifactFiles)
- HTTP router serves each type correctly
- Soft delete only affects the specific version's data

---

## 3. File Serving & HTTP Router Test

**Sample Data:**
- `samples/01-valid/zip/charting/v1.zip` (multi-file: HTML, JS, JSON, PNG)
- `samples/01-valid/html/simple-html/v1/index.html` (standalone HTML)
- `samples/01-valid/markdown/product-spec/v1.md` (Markdown)

**Scenarios:**
- Upload ZIP v1 → verify all files accessible:
  - `GET /artifact/{shareToken}/v1/` → serves index.html
  - `GET /artifact/{shareToken}/v1/index.html` → serves index.html
  - `GET /artifact/{shareToken}/v1/app.js` → serves with `Content-Type: application/javascript`
  - `GET /artifact/{shareToken}/v1/assets/chart-data.json` → serves with `Content-Type: application/json`
  - `GET /artifact/{shareToken}/v1/assets/logo.png` → serves with `Content-Type: image/png`
  - `GET /artifact/{shareToken}/v1/nonexistent.html` → returns 404
- Upload HTML v2 → verify HTML content served correctly
- Upload Markdown v3 → verify Markdown rendered to HTML
- Soft delete v1 → verify files return 404 or "deleted" message
- Verify CORS headers allow embedding in iframe

**Backend APIs Tested:**
- HTTP router (`convex/http.ts`)
- `artifacts.getFileByPath`
- `artifacts.getByShareTokenInternal`
- `artifacts.getVersionByNumberInternal`
- MIME type detection

**Validation Points:**
- Correct Content-Type headers for each file type
- Entry point serves at both `/` and `/index.html`
- Nested paths work (e.g., `assets/logo.png`)
- 404 for nonexistent files
- Deleted versions don't serve files
- CORS headers present

---

## 4. Soft Delete Cascade Test

**Sample Data:** `samples/01-valid/zip/charting/v1.zip`

**Scenarios:**
- **Setup:** Upload ZIP v1 (4 files), v2 (4 files), v3 (4 files) → 12 total files in `artifactFiles`
- **Test A:** Soft delete v2
  - Validate `artifactVersions` record: `v2.isDeleted: true`, `v2.deletedAt` set
  - Validate all 4 `artifactFiles` for v2: `isDeleted: true`, `deletedAt` set
  - Validate v1 and v3 files: `isDeleted: false`
  - Validate HTTP GET for v2 files returns 404 or "deleted" message
- **Test B:** Soft delete entire artifact
  - Validate artifact record: `isDeleted: true`
  - Validate all `artifactVersions` (v1, v2, v3): `isDeleted: true`
  - Validate all `artifactFiles` (12 files): `isDeleted: true`
  - Validate HTTP GET with shareToken returns "artifact deleted" message

**Backend APIs Tested:**
- `artifacts.softDeleteVersion`
- `artifacts.softDelete` (entire artifact)
- Cascade delete logic

**Validation Points:**
- Soft delete sets `isDeleted: true` and `deletedAt`
- Cascade deletes all child records (versions → files)
- Data remains in database (soft delete, not hard delete)
- Queries filter out deleted records
- HTTP router respects soft delete status

---

## 5. Version Query Test

**Sample Data:** `samples/01-valid/zip/charting/` (v1-v5)

**Scenarios:**
- Upload v1, v2, v3, v4, v5
- Soft delete v2 and v4
- **Test Queries:**
  - `artifacts.getVersions(artifactId)` → returns [v5, v3, v1] (descending, active only)
  - `artifacts.getLatestVersion(artifactId)` → returns v5
  - `artifacts.getVersionByNumber(artifactId, 2)` → returns null (deleted)
  - `artifacts.getVersionByNumber(artifactId, 3)` → returns v3
  - `artifacts.getVersion(v2Id)` → returns v2 record (even though deleted)
  - `artifacts.getFilesByVersion(v2Id)` → returns empty array (files deleted)
  - `artifacts.getFilesByVersion(v3Id)` → returns 4 files

**Backend APIs Tested:**
- `artifacts.getVersions`
- `artifacts.getLatestVersion`
- `artifacts.getVersionByNumber`
- `artifacts.getVersion`
- `artifacts.getFilesByVersion`

**Validation Points:**
- Active-only queries filter correctly
- Direct ID queries return even deleted records
- Latest version returns highest active version
- Version number queries respect soft deletes
- Descending order works correctly

---

## 6. Access Control Test

**Sample Data:** Any samples

**Scenarios:**
- **Setup:** User A creates artifact with ID `artifactA_id`, User B is different user

### Private Access (Should Fail):
- User B attempts `artifacts.get(artifactA_id)` → ERROR: "Not authorized" or null
- User B attempts `artifacts.getVersion(versionA_id)` → ERROR: "Not authorized" or null
- User B attempts `artifacts.getVersions(artifactA_id)` → ERROR: "Not authorized" or empty array
- User B attempts `artifacts.addVersion(artifactA_id, ...)` → ERROR: "Not authorized"
- User B attempts `artifacts.softDeleteVersion(versionA_id)` → ERROR: "Not authorized"
- User B attempts `artifacts.softDelete(artifactA_id)` → ERROR: "Not authorized"
- User B calls `artifacts.list()` → does NOT see User A's artifact (only sees their own)

### Creator Access (Should Succeed):
- User A calls `artifacts.get(artifactA_id)` → returns artifact
- User A calls `artifacts.getVersion(versionA_id)` → returns version
- User A calls `artifacts.getVersions(artifactA_id)` → returns all versions
- User A calls `artifacts.addVersion(artifactA_id, ...)` → success
- User A calls `artifacts.softDeleteVersion(versionA_id)` → success
- User A calls `artifacts.list()` → sees their artifact

### Public Access via ShareToken (Read-Only):
- Anyone (User B, unauthenticated) can call `artifacts.getByShareToken(shareToken)` → returns artifact
- Anyone can view via HTTP router: `GET /artifact/{shareToken}/v1/` → serves files
- User B **CANNOT** modify via shareToken (shareToken is read-only)
- Unauthenticated user **CANNOT** add version or delete

**Backend APIs Tested:**
- `artifacts.get` (auth check - should block User B)
- `artifacts.getVersion` (auth check - should block User B)
- `artifacts.getVersions` (auth check - should block User B)
- `artifacts.addVersion` (auth check - should block User B)
- `artifacts.softDeleteVersion` (auth check - should block User B)
- `artifacts.softDelete` (auth check - should block User B)
- `artifacts.list` (user filtering - should only show User A's artifacts to User A)
- `artifacts.getByShareToken` (public read - should work for anyone)
- HTTP router (public read via shareToken - should work for anyone)

**Validation Points:**
- **User B CANNOT view User A's artifacts by ID** (private by default)
- **User B CANNOT see User A's artifacts in list queries**
- **User B CANNOT modify User A's artifacts in any way**
- **Only creator can view by ID**
- **Only creator can modify artifact**
- **Public can ONLY view via shareToken** (read-only)
- **ShareToken does NOT grant modification rights**
- Auth errors are clear and actionable

---

## 7. File Size & Validation Test

**Sample Data:**
- `samples/01-valid/zip/charting/v1.zip` (3.9KB - valid)
- `samples/04-invalid/too-large/huge.zip` (155MB - invalid, generated)
- `samples/04-invalid/empty/empty.html` (0 bytes - invalid)
- `samples/04-invalid/wrong-type/presentation-with-video.zip` (110KB but has .mov/.mp4 - invalid, generated)

**Scenarios:**
- Upload valid small ZIP (3.9KB) → success
- Upload empty HTML (0 bytes) → ERROR: "File is empty"
- Upload huge ZIP (155MB) → ERROR: "File exceeds maximum size of 100MB"
- Upload ZIP with video files → ERROR: "ZIP contains unsupported file types: .mov, .mp4, .avi"
- Upload valid HTML at size limit (just under 5MB) → success
- Upload HTML over limit → ERROR: "HTML exceeds 5MB limit"

**Backend APIs Tested:**
- File size validation (frontend and backend)
- File type validation
- ZIP extraction with type checking
- `zipProcessor.processZipFile` error handling

**Validation Points:**
- Size limits enforced (100MB ZIP, 5MB HTML, 1MB Markdown)
- Empty files rejected
- Forbidden file types rejected (.mov, .mp4, .exe, etc.)
- Error messages are clear and actionable
- Validation happens before storage upload

---

## 8. Multi-File ZIP Navigation Test

**Sample Data:** `samples/01-valid/zip/charting/v1.zip`

**Scenarios:**
- Upload ZIP with multiple files
- Verify `artifacts.listHtmlFiles(versionId)` returns all HTML files in ZIP
- For multi-page sites, verify:
  - All HTML pages are listed
  - Each page can be accessed individually
  - Relative links between pages work (e.g., `<a href="about.html">`)
  - Assets load correctly from any page

**Backend APIs Tested:**
- `artifacts.listHtmlFiles`
- HTTP router relative path resolution

**Validation Points:**
- All HTML files discovered and listed
- Each HTML file accessible via HTTP router
- Relative links work within ZIP structure
- Assets (CSS, JS, images) load from any page

---

## 9. Concurrent Operations Test

**Sample Data:** `samples/01-valid/zip/charting/` (v1-v5)

**Scenarios:**
- Upload v1 and v2 simultaneously (different users or same user, different artifacts)
- Verify both complete successfully
- Verify no race conditions on version numbering
- Upload v3 while simultaneously deleting v1
- Verify operations complete correctly (or fail gracefully)

**Backend APIs Tested:**
- Concurrency handling
- Transaction isolation
- Version number calculation under load

**Validation Points:**
- No duplicate version numbers
- No lost updates
- Operations are atomic
- Errors are graceful, not crashes

---

## 10. Entry Point Auto-Detection Test

**Sample Data:**
- `samples/01-valid/zip/charting/v1.zip` (has index.html at root)
- `samples/03-edge-cases/zip/multi-page-site.zip` (no index.html or main.html)

**Current Constraint:** ZIP files MUST contain either `index.html` or `main.html` to be valid. This is a current limitation to simplify implementation.

**Scenarios:**
- **Test A:** Upload ZIP with `index.html` at root → validate `entryPoint: "index.html"`
- **Test B:** Upload ZIP with `main.html` (no index.html) → validate `entryPoint: "main.html"`
- **Test C (Future):** Upload ZIP with multiple HTML but no index/main → validate error or prompt for entry point
- **Test D (Future):** Upload edge case ZIP (multi-page-site.zip) → validate error or prompt for selection

**Backend APIs Tested:**
- `zipProcessor.processZipFile`
- `zipProcessorMutations.markProcessingComplete`
- Entry point detection logic

**Validation Points:**
- `index.html` always wins (case-insensitive, any depth)
- `main.html` is fallback
- ZIPs without index.html or main.html should error for now
- User can override auto-detection (future enhancement)

**Note:** This test has lower priority since we don't have comprehensive test samples for all edge cases. Current constraint is to require index.html or main.html.

---

## Implementation Priority

### Phase 1: Core Functionality (Must Have)
1. ✅ **Version Management Test** - Critical for MVP
2. ✅ **File Serving & HTTP Router Test** - Critical for MVP
3. ✅ **Mixed File Type Versioning Test** - Important for flexibility

### Phase 2: Data Integrity (Should Have)
4. ✅ **Soft Delete Cascade Test** - Important for data integrity
5. ✅ **Version Query Test** - Important for UI correctness

### Phase 3: Security & Edge Cases (Nice to Have)
6. ✅ **Access Control Test** - Important for security
7. ✅ **File Size & Validation Test** - Important for security
8. ⚠️ **Multi-File ZIP Navigation Test** - Nice to have
9. ⚠️ **Concurrent Operations Test** - Nice to have for scale
10. ⚠️ **Entry Point Auto-Detection Test** - Validate when we have better test samples

---

## Test Structure

Each test suite should follow this structure:

```typescript
describe('Test Suite Name', () => {
  // Setup
  let convex: ConvexTestClient;
  let userId: Id<"users">;

  beforeEach(async () => {
    convex = new ConvexTestClient();
    userId = await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  // Individual test cases
  it('should [specific behavior]', async () => {
    // Arrange - setup test data using samples
    const zipFile = await loadSample('samples/01-valid/zip/charting/v1.zip');

    // Act - call backend API
    const result = await convex.mutation(api.zipUpload.createArtifactWithZip, { ... });

    // Assert - validate behavior
    expect(result.versionNumber).toBe(1);

    // Validate database state
    const version = await convex.query(api.artifacts.getVersion, { versionId: result.versionId });
    expect(version.isDeleted).toBe(false);

    // Validate files extracted
    const files = await convex.query(api.artifacts.getFilesByVersion, { versionId: result.versionId });
    expect(files).toHaveLength(4);
  });
});
```

---

## Test Helpers to Create

```typescript
// Load sample file
async function loadSample(path: string): Promise<File>;

// Create test user
async function createTestUser(): Promise<Id<"users">>;

// Upload artifact (handles full flow)
async function uploadArtifact(file: File, userId: Id<"users">): Promise<ArtifactResult>;

// Upload version
async function uploadVersion(artifactId: Id<"artifacts">, file: File): Promise<VersionResult>;

// Validate version state
async function validateVersion(versionId: Id<"artifactVersions">, expected: Partial<ArtifactVersion>);

// Validate file count
async function validateFileCount(versionId: Id<"artifactVersions">, expectedCount: number);

// HTTP GET request (for testing HTTP router)
async function httpGet(url: string): Promise<Response>;

// Cleanup test data
async function cleanupTestData(): Promise<void>;
```

---

## Expected Outputs

For each test suite:
1. **Test file** - `tests/[suite-name].test.ts`
2. **Test report** - `output/[suite-name]-report.md`
3. **Validation video** - `output/[suite-name]-validation.mp4` (for critical tests)
4. **Coverage report** - `output/coverage-report.md`

---

## Success Criteria

- [ ] All Phase 1 tests pass (Core Functionality)
- [ ] All Phase 2 tests pass (Data Integrity)
- [ ] Phase 3 tests pass or documented exceptions
- [ ] 100% of backend APIs covered by tests
- [ ] Test execution time < 5 minutes total
- [ ] Tests can run in CI/CD pipeline
- [ ] Clear error messages for all failure scenarios
- [ ] Test data uses central `/samples/` directory
- [ ] All tests use structured logging (not console.log)

---

**Last Updated:** 2025-12-27
**Status:** Planning Complete → Ready for Implementation
