# E2E Tests: ZIP File Upload and Viewing

This directory contains end-to-end tests for Phase 1 of Task 00019: Multi-file ZIP HTML Projects.

## Test Coverage

### 01-zip-upload.spec.ts
Tests the basic flow of uploading a ZIP file and creating a new artifact:
- Upload ZIP and create artifact
- Auto-detect index.html as entry point
- Verify all assets load correctly
- Verify artifact appears in dashboard list

### 02-zip-versioning.spec.ts
Tests adding new versions to existing artifacts:
- Upload new version and increment version number
- Switch between versions and display correct content
- Create multiple versions sequentially
- Preserve earlier versions when adding new ones

### 03-share-token-access.spec.ts
Tests public access via share links:
- View artifact via share link without authentication
- Access specific version via URL parameter
- Default to latest version when no parameter provided
- Allow unauthenticated users to switch versions

### 04-asset-loading.spec.ts
Tests that all asset types load correctly:
- JavaScript files execute
- JSON data files load
- Image files display
- Files served with correct MIME types
- Nested directory structures work
- No console errors for missing assets

### 05-error-handling.spec.ts
Tests validation and error handling:
- Reject ZIP with forbidden file types (.mov, .mp4, .avi)
- Show error message with specific forbidden extensions
- Don't create broken artifacts when processing fails
- Handle empty ZIP files gracefully
- Validate file size before upload (50MB limit)
- Clear error state when uploading valid file after error

## Sample Files Used

All tests use centralized samples from `/samples/`:

| Sample | Purpose |
|--------|---------|
| `samples/01-valid/zip/charting/v1.zip` - `v5.zip` | Valid multi-file projects (5 versions) |
| `samples/04-invalid/wrong-type/presentation-with-video.zip` | ZIP with forbidden file types (videos) |
| `samples/04-invalid/too-large/huge.zip` | ZIP exceeding size limit (155MB, generated) |

**Note:** Some samples must be generated first:
```bash
# Generate huge.zip (155MB)
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/samples/04-invalid/too-large
./generate.sh

# Generate presentation-with-video.zip (requires ffmpeg)
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/samples/04-invalid/wrong-type
./generate.sh
```

## Setup

Install Playwright dependencies:

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/tasks/00019-multifile-zip-html-projects/01-phase1-storage-write-permissions/tests
npm install
```

## Running Tests

**Prerequisites:**
- Development server must be running on `http://localhost:3000`
- Or use the config's `webServer` to auto-start (requires app to be built)

**Run all tests:**
```bash
npx playwright test
```

**Run specific test file:**
```bash
npx playwright test e2e/01-zip-upload.spec.ts
```

**Run with visible browser (headed mode):**
```bash
npx playwright test --headed
```

**Run in interactive UI mode:**
```bash
npx playwright test --ui
```

**Run specific test by name:**
```bash
npx playwright test -g "should upload ZIP and create artifact"
```

## Video Recordings

**IMPORTANT:** All tests automatically record videos (mandatory per project guidelines).

Videos are saved to `test-results/` and are **gitignored** (not committed to repository).

To view test recordings:

```bash
# View all videos in test-results
ls -la test-results/*/video.webm

# Play a specific video (macOS)
open test-results/[test-name]/video.webm
```

## Debugging

**View Playwright trace (recommended):**

Traces include timeline, screenshots, network activity, and console logs.

```bash
# Show trace for a specific test
npx playwright show-trace test-results/[test-name]/trace.zip

# Show latest trace
npx playwright show-trace test-results/*/trace.zip
```

**Debug a test interactively:**

```bash
npx playwright test --debug e2e/01-zip-upload.spec.ts
```

**Console output:**

Tests include `console.log()` statements for debugging. View output during test runs.

## Click Indicators

All tests use click indicators to make mouse clicks visible in video recordings:
- **Red cursor dot** follows mouse movement
- **Ripple animation** on every click

This makes validation videos easier to review and share with stakeholders.

## Test Helpers

Helper functions are located in `e2e/helpers/`:

| Helper | Purpose |
|--------|---------|
| `auth.ts` | User registration, login, logout |
| `artifacts.ts` | Create artifacts, add versions, switch versions, verify content |

## Known Limitations

1. **Large file tests** require generated samples (`huge.zip`, `presentation-with-video.zip`)
2. **Timing sensitivity** - ZIP processing may take time, tests have generous timeouts
3. **Browser-specific** - Tests run on Chromium by default (can add other browsers to config)

## Test Report

After running tests, generate a report:

```bash
npx playwright show-report
```

This opens an HTML report with:
- Test results and status
- Screenshots and videos
- Error traces
- Timing information

## Validation Videos

For feature handoff, create a master validation video from test recordings:

```bash
# Concatenate all test videos
/Users/clintgossett/Documents/personal/personal\ projects/artifact-review/scripts/concat_journey.sh test-results

# Normalize and convert to MP4
/Users/clintgossett/Documents/personal/personal\ projects/artifact-review/scripts/normalize_video.sh test-results/flow.webm validation-videos/validation.mp4

# View final video
open validation-videos/validation.mp4
```

## CI/CD Integration

To run tests in CI:

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Run tests
npx playwright test --reporter=list
```

## Troubleshooting

**Tests timeout:**
- Ensure dev server is running on port 3000
- Check if ZIP processing is slow (increase timeout in test)
- Check network tab for failed requests

**Authentication issues:**
- Clear browser storage: `npx playwright test --clear-storage`
- Check Convex backend is running

**File upload failures:**
- Verify sample files exist at expected paths
- Check file permissions
- Ensure ZIP files are not corrupted

**Asset loading errors:**
- Check browser console in headed mode
- Verify MIME types in network tab
- Check for CORS issues

## Contributing

When adding new tests:
1. Follow existing naming conventions (`##-descriptive-name.spec.ts`)
2. Use click indicators (`injectClickIndicator(page)`)
3. Use central samples from `/samples/`
4. Include helpful console.log statements
5. Test both success and error cases
6. Update this README with new test descriptions

---

**Last Updated:** 2025-12-31
**Task:** 00019 - Multi-file ZIP HTML Projects
**Subtask:** 01 - Phase 1 Storage and Write Permissions
