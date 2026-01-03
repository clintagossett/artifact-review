# E2E Test Suite Summary

Task 00019, Phase 1: ZIP File Upload and Viewing

## Overview

This test suite provides comprehensive E2E coverage for ZIP artifact upload and viewing functionality. All tests use centralized samples from `/samples/` and include click indicators for validation videos.

## Test Files

### 01-zip-upload.spec.ts (4 tests)
Tests basic ZIP upload and artifact creation flow.

**Tests:**
1. Upload ZIP and create artifact with entry point detection
2. Auto-detect index.html as entry point
3. Verify all assets load correctly
4. Show artifact in dashboard list after creation

**Sample Files:**
- `samples/01-valid/zip/charting/v1.zip`

**Key Assertions:**
- Artifact created with 8-character shareToken
- Entry point (index.html) detected automatically
- Content visible: "Monthly Sales Dashboard v1"
- Chart elements render (JavaScript executed)
- No resource loading errors

---

### 02-zip-versioning.spec.ts (4 tests)
Tests version management for ZIP artifacts.

**Tests:**
1. Upload new version and increment version number
2. Switch between versions and display correct content
3. Create multiple versions sequentially (v1-v5)
4. Preserve version 1 when uploading version 2

**Sample Files:**
- `samples/01-valid/zip/charting/v1.zip` through `v5.zip`

**Key Assertions:**
- Version numbers increment correctly (1, 2, 3, 4, 5)
- Each version shows correct content ("v1", "v2", etc.)
- Switching between versions works
- Earlier versions remain accessible after new uploads

---

### 03-share-token-access.spec.ts (4 tests)
Tests public access via share links.

**Tests:**
1. View artifact via share link without authentication
2. Access specific version via URL parameter (?v=2)
3. Default to latest version when no parameter provided
4. Allow unauthenticated users to switch versions

**Sample Files:**
- `samples/01-valid/zip/charting/v1.zip` through `v3.zip`

**Key Assertions:**
- Unauthenticated users can view artifacts
- URL parameter `?v=N` loads specific version
- Default loads latest version
- No login prompts for public artifacts

---

### 04-asset-loading.spec.ts (7 tests)
Tests that all asset types load correctly from ZIP.

**Tests:**
1. Load JavaScript files correctly (app.js executes)
2. Load JSON data files correctly (chart-data.json)
3. Load image files correctly (logo.png)
4. Serve files with correct MIME types
5. Handle nested directory structures (assets/ folder)
6. No console errors for missing assets
7. Load files from multiple versions independently

**Sample Files:**
- `samples/01-valid/zip/charting/v1.zip`

**Key Assertions:**
- JavaScript executes (chart elements created)
- No 404 errors for JSON files
- Images display (naturalWidth > 0)
- Correct MIME types (text/html, application/javascript, etc.)
- Nested paths work (assets/logo.png)
- No console errors

---

### 05-error-handling.spec.ts (7 tests)
Tests validation and error handling.

**Tests:**
1. Reject ZIP with forbidden file types (.mov, .mp4, .avi)
2. Show error message with specific forbidden extensions
3. Don't create broken artifacts when processing fails
4. Handle empty ZIP files gracefully
5. Validate file size before upload (50MB limit)
6. Show error when ZIP has no HTML files
7. Clear error state when uploading valid file after error

**Sample Files:**
- `samples/04-invalid/wrong-type/presentation-with-video.zip`
- `samples/04-invalid/too-large/huge.zip` (generated)
- `samples/04-invalid/empty/empty.zip` (if exists)

**Key Assertions:**
- Forbidden file types rejected with error message
- Error mentions specific extensions (.mov, .mp4, .avi)
- Failed uploads don't create artifacts in dashboard
- File size validation shows "50MB" limit
- Error state clears when valid file uploaded

---

## Total Test Count

| Test File | Test Count |
|-----------|------------|
| 01-zip-upload.spec.ts | 4 |
| 02-zip-versioning.spec.ts | 4 |
| 03-share-token-access.spec.ts | 4 |
| 04-asset-loading.spec.ts | 7 |
| 05-error-handling.spec.ts | 7 |
| **TOTAL** | **26 tests** |

## Test Helpers

### auth.ts
- `registerUser(page, options?)` - Register new user and login
- `signIn(page, email, password)` - Login existing user
- `signOut(page)` - Logout current user
- `generateTestEmail()` - Generate unique test email
- `generateTestPassword()` - Generate valid password

### artifacts.ts
- `createZipArtifact(page, options)` - Upload ZIP and create artifact
- `addZipVersion(page, shareToken, options)` - Add new version to artifact
- `switchToVersion(page, versionNumber)` - Switch to specific version
- `verifyArtifactContentVisible(page, text)` - Verify content in viewer
- `accessArtifactViaShareLink(page, shareToken)` - Access public link

## Sample Files Required

### Always Available
- `samples/01-valid/zip/charting/v1.zip` - `v5.zip` (5 versions)

### Must Be Generated
```bash
# Generate huge.zip (155MB)
cd samples/04-invalid/too-large
./generate.sh

# Generate presentation-with-video.zip (requires ffmpeg)
cd samples/04-invalid/wrong-type
./generate.sh
```

## Running Tests

**Setup:**
```bash
cd tasks/00019-multifile-zip-html-projects/01-phase1-storage-write-permissions/tests
npm install
```

**Run all tests:**
```bash
npx playwright test
```

**Run specific category:**
```bash
npx playwright test e2e/01-zip-upload.spec.ts
npx playwright test e2e/05-error-handling.spec.ts
```

**Run with visible browser:**
```bash
npx playwright test --headed
```

**Debug specific test:**
```bash
npx playwright test --debug -g "should upload ZIP and create artifact"
```

## Video Recordings

All tests automatically record videos (mandatory per project guidelines).

**Location:** `test-results/[test-name]/video.webm`

**View trace:**
```bash
npx playwright show-trace test-results/*/trace.zip
```

**Generate validation video:**
```bash
# Concatenate all test videos
../../../../../scripts/concat_journey.sh test-results

# Convert to MP4
../../../../../scripts/normalize_video.sh test-results/flow.webm validation-videos/validation.mp4

# View
open validation-videos/validation.mp4
```

## Coverage Map

| Feature | Test File | Test Name |
|---------|-----------|-----------|
| **Upload ZIP** | 01-zip-upload | "should upload ZIP and create artifact" |
| **Entry Point Detection** | 01-zip-upload | "should auto-detect index.html" |
| **Asset Loading** | 01-zip-upload | "should verify all assets load" |
| **Dashboard List** | 01-zip-upload | "should show artifact in dashboard" |
| **Add Version** | 02-zip-versioning | "should upload new version" |
| **Version Switching** | 02-zip-versioning | "should switch between versions" |
| **Multiple Versions** | 02-zip-versioning | "should create multiple versions" |
| **Version Preservation** | 02-zip-versioning | "should preserve version 1" |
| **Public Access** | 03-share-token-access | "should view via share link" |
| **Version URL Param** | 03-share-token-access | "should access specific version" |
| **Default to Latest** | 03-share-token-access | "should default to latest" |
| **Public Version Switch** | 03-share-token-access | "should allow unauthenticated switch" |
| **JavaScript Loading** | 04-asset-loading | "should load JavaScript files" |
| **JSON Loading** | 04-asset-loading | "should load JSON data files" |
| **Image Loading** | 04-asset-loading | "should load image files" |
| **MIME Types** | 04-asset-loading | "should serve correct MIME types" |
| **Nested Dirs** | 04-asset-loading | "should handle nested directories" |
| **No Console Errors** | 04-asset-loading | "should not show console errors" |
| **Forbidden Files** | 05-error-handling | "should reject forbidden file types" |
| **Error Message** | 05-error-handling | "should show error with extensions" |
| **No Broken Artifacts** | 05-error-handling | "should not create broken artifact" |
| **Empty ZIP** | 05-error-handling | "should handle empty ZIP" |
| **Size Validation** | 05-error-handling | "should validate file size" |
| **Error Recovery** | 05-error-handling | "should clear error state" |

## Expected Test Duration

| Test File | Estimated Duration |
|-----------|-------------------|
| 01-zip-upload | ~60 seconds |
| 02-zip-versioning | ~90 seconds |
| 03-share-token-access | ~90 seconds |
| 04-asset-loading | ~120 seconds |
| 05-error-handling | ~90 seconds |
| **Total** | **~7-8 minutes** |

Note: Actual duration depends on ZIP processing speed and network conditions.

## Next Steps

1. **Install dependencies:** `npm install`
2. **Generate invalid samples:** Run generate.sh scripts for huge.zip and presentation-with-video.zip
3. **Start dev server:** Ensure app is running on port 3000
4. **Run tests:** `npx playwright test`
5. **Review videos:** Check test-results/ for recordings
6. **Generate validation video:** Use concat and normalize scripts
7. **Review test report:** `npx playwright show-report`

---

**Created:** 2025-12-31
**Task:** 00019 - Multi-file ZIP HTML Projects
**Phase:** 1 - Storage and Write Permissions
