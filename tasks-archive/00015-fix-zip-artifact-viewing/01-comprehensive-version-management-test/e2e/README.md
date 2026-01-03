# E2E Tests for Comprehensive Version Management

This directory contains **real E2E tests** that test the actual Convex backend APIs and HTTP router (no mocks).

## Overview

These tests validate the complete version management system using:
- **Real Convex backend** via ConvexHttpClient
- **Real HTTP router** for file serving
- **Real sample files** from `/samples/01-valid/zip/charting/`
- **Real database** (Convex dev deployment)

## Test Coverage

| Test File | Tests | What It Validates |
|-----------|-------|-------------------|
| `01-http-router-file-serving.spec.ts` | 13 | HTTP router endpoints, Content-Type headers, CORS, 404 handling |
| `02-convex-api-integration.spec.ts` | 10 | Public queries, error handling, performance |
| `03-version-management-flow.spec.ts` | 9 | Full version lifecycle, soft deletes, version numbering |

**Total: 32 E2E tests**

## Prerequisites

### 1. Start Convex Dev Server

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app
npm run dev
```

This starts:
- **Convex backend** on your deployment URL
- **Next.js dev server** on http://localhost:3000

### 2. Set Environment Variables

Create `.env` in this directory:

```bash
# Convex deployment URL (find this in your Convex dashboard)
CONVEX_URL=https://your-deployment.convex.cloud

# Or if using local dev:
CONVEX_URL=http://localhost:3000

# Site URL for HTTP router
NEXT_PUBLIC_CONVEX_SITE_URL=http://localhost:3000
```

Alternatively, set in your shell:

```bash
export CONVEX_URL="https://your-deployment.convex.cloud"
export NEXT_PUBLIC_CONVEX_SITE_URL="http://localhost:3000"
```

### 3. Install Dependencies

```bash
npm install
```

This installs Playwright and dependencies.

### 4. Upload Test Artifacts (MANUAL STEP)

**These tests require test artifacts to be uploaded first.**

**Option A: Use Web UI (Recommended)**

1. Go to http://localhost:3000
2. Login (create account if needed)
3. Upload artifact:
   - Click "New Artifact"
   - Title: "E2E Test Artifact"
   - Upload: `/samples/01-valid/zip/charting/v1.zip`
   - Click "Create"
4. Note the **shareToken** from URL: `http://localhost:3000/artifacts/{shareToken}`
5. Add more versions:
   - Click "Add Version" on the artifact page
   - Upload v2.zip, v3.zip, v4.zip
6. Update test files:
   - Replace `TEST_SHARE_TOKEN = 'REPLACE_ME'` with your actual shareToken
   - Replace `TEST_ARTIFACT_ID = 'REPLACE_ME'` with actual artifact ID

**Option B: Use Convex Dashboard**

1. Go to Convex dashboard → Data → artifacts table
2. Insert a test artifact record
3. Insert version records
4. Use the IDs in test files

## Running Tests

```bash
# Run all E2E tests (headless)
npm test

# Run with visible browser
npm run test:headed

# Run in interactive UI mode
npm run test:ui

# Run specific test file
npx playwright test 01-http-router-file-serving.spec.ts

# Run in debug mode
npm run test:debug
```

## Test Files Explained

### 01-http-router-file-serving.spec.ts

Tests the **HTTP router** (`/artifact/{shareToken}/v{version}/{filePath}`):

- ✅ Serves index.html with `text/html` Content-Type
- ✅ Serves app.js with `application/javascript` Content-Type
- ✅ Serves nested files (assets/chart-data.json, assets/logo.png)
- ✅ Returns 404 for nonexistent files
- ✅ Returns 404 for invalid shareToken
- ✅ Returns 404 for nonexistent version
- ✅ Includes CORS headers
- ✅ Includes cache headers
- ✅ Serves different content for v1 vs v2
- ✅ Handles URL encoding
- ✅ Returns 400 for invalid version format
- ✅ Returns 404 for soft-deleted versions
- ✅ Still serves active versions after deleting another

**Setup:** Requires test artifact with shareToken

### 02-convex-api-integration.spec.ts

Tests **Convex public queries** via ConvexHttpClient:

- ✅ getByShareToken (public query)
- ✅ getVersion (public query)
- ✅ getFilesByVersion (public query)
- ✅ listHtmlFiles (public query)
- ✅ getVersions (public query)
- ✅ Error handling for invalid IDs
- ✅ Performance benchmarks
- ✅ Concurrent query handling

**Note:** Authenticated mutations (create, addVersion, softDelete) are **SKIPPED** because they require auth tokens. See "Authentication Limitations" below.

### 03-version-management-flow.spec.ts

Tests the **complete version management lifecycle**:

- ✅ Multiple versions exist (v1, v2, v3, v4)
- ✅ Version numbering is correct
- ✅ Each version serves files via HTTP router
- ✅ Each version has different content
- ✅ Each version has 4 extracted files
- ✅ Soft-deleted versions not returned in active queries
- ✅ Soft-deleted versions return 404 via HTTP router
- ✅ Active versions still work after deleting another
- ✅ Version numbers maintain gaps (not renumbered)
- ✅ Latest version query returns correct version

**Setup:** Requires artifact with 4 versions, v2 soft-deleted

## Authentication Limitations

**Challenge:** Convex backend uses `@convex-dev/auth` for authentication. E2E tests need real auth tokens to call authenticated mutations.

**Current State:**
- ✅ **Public queries work** (getByShareToken, getVersion, etc.)
- ✅ **HTTP router works** (no auth required)
- ⚠️ **Authenticated mutations are SKIPPED** (require auth tokens)

**Skipped Tests:**
- `createArtifactWithZip` - requires auth
- `addVersion` - requires auth
- `softDeleteVersion` - requires auth
- `softDelete` - requires auth
- `list` - requires auth (returns only user's artifacts)

**Workaround:**
1. Use **unit tests** (`convex/__tests__/`) for authenticated flows (they use `convex-test` with mock auth)
2. Use **E2E tests** for HTTP router and public queries
3. Use **manual testing** via web UI for full authenticated flows

**Future Enhancement:**
To enable authenticated E2E tests, implement:

```typescript
// helpers.ts
export async function getTestAuthToken(): Promise<string> {
  // Option 1: Use @convex-dev/auth to generate real token
  // Option 2: Create test-only auth bypass (not recommended)
  // Option 3: Use Playwright to login via UI and extract token
}

// Then in tests:
const client = createConvexClient();
await client.setAuth(await getTestAuthToken());
```

## Sample Files Used

All tests use **real sample files** from `/samples/01-valid/zip/charting/`:

- `v1.zip` - 4 files (index.html, app.js, assets/chart-data.json, assets/logo.png)
- `v2.zip` - 4 files (modified content)
- `v3.zip` - 4 files (modified content)
- `v4.zip` - 4 files (modified content)
- `v5.zip` - 4 files (modified content)

Each version has:
- Different HTML content (validates version isolation)
- Same file structure (4 files)
- Same MIME types

## Validation Workflow

After implementation complete:

```bash
# 1. Start dev server
cd ../../../app
npm run dev

# 2. Upload test artifact via UI
# (Follow "Upload Test Artifacts" section above)

# 3. Update test constants
# Edit test files and replace REPLACE_ME with actual values

# 4. Run E2E tests
cd ../tasks/00015-fix-zip-artifact-viewing/01-comprehensive-version-management-test/e2e
npm test

# 5. Generate validation trace
npm test -- --trace on
cp test-results/*/trace.zip ../validation-videos/e2e-trace.zip

# 6. View trace
npx playwright show-trace ../validation-videos/e2e-trace.zip
```

## Comparison: Unit Tests vs E2E Tests

| Aspect | Unit Tests (convex-test) | E2E Tests (Playwright) |
|--------|--------------------------|------------------------|
| **Backend** | Mock (convex-test) | Real Convex deployment |
| **HTTP Router** | ❌ Cannot test | ✅ Tests real endpoints |
| **Authentication** | ✅ Mock auth (asUser) | ⚠️ Requires real tokens |
| **Speed** | ⚡ Fast (in-memory) | 🐌 Slower (network calls) |
| **Isolation** | ✅ Each test isolated | ⚠️ Shares database |
| **Setup** | None (auto-generated) | Manual artifact upload |
| **Best For** | Business logic, mutations | HTTP serving, integration |

**Recommendation:** Use BOTH:
- **Unit tests** for business logic and authenticated flows
- **E2E tests** for HTTP router and real integration validation

## Known Issues

1. **Manual Setup Required** - Tests need artifacts uploaded first
   - Solution: Update test constants after upload
   - Future: Auto-upload via authenticated client

2. **Skipped Authenticated Tests** - Can't test mutations without auth
   - Solution: Use unit tests for mutation testing
   - Future: Implement auth token generation

3. **Database Shared Across Tests** - Tests may interfere with each other
   - Solution: Use unique shareTokens/artifacts per test
   - Future: Database cleanup between tests

4. **No Auto-Cleanup** - Test artifacts remain in database
   - Solution: Manual cleanup via UI or Convex dashboard
   - Future: Cleanup script with soft delete

## Troubleshooting

### "CONVEX_URL is required"

```bash
export CONVEX_URL="https://your-deployment.convex.cloud"
# or
export CONVEX_URL="http://localhost:3000"
```

### "Artifact not found" (404)

- Check that you uploaded test artifact
- Verify shareToken is correct in test file
- Check that Convex dev server is running

### "Version not found"

- Verify you uploaded multiple versions (v1, v2, v3, v4)
- Check version numbers in test match uploaded versions

### "Cannot find module 'convex/browser'"

```bash
npm install
```

Make sure dependencies are installed.

### Tests timeout

- Increase timeout in `playwright.config.ts`:
  ```typescript
  timeout: 120000, // 2 minutes
  ```
- Check Convex dev server is responsive

## Success Criteria

All tests passing indicates:

✅ HTTP router correctly serves files from ZIP artifacts
✅ Multiple versions can be uploaded and served independently
✅ Soft delete prevents file access via HTTP router
✅ Version numbering handles gaps correctly
✅ Public queries work via ConvexHttpClient
✅ CORS and cache headers are correct
✅ Error handling works (404, 400 responses)

## Next Steps

After E2E tests pass:

1. ✅ Generate validation trace: `npm test -- --trace on`
2. ✅ Copy trace to validation-videos/
3. ✅ Update test-report.md with E2E results
4. ✅ Review trace for visual validation
5. ✅ Hand off for PM review

## References

- [Playwright API Testing](https://playwright.dev/docs/api-testing)
- [ConvexHttpClient Docs](https://docs.convex.dev/client/javascript)
- [Sample Files](/samples/README.md)
- [Testing Guide](/docs/development/testing-guide.md)
