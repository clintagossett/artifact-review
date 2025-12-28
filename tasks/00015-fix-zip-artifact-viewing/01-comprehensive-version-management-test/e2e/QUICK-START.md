# Quick Start: E2E Tests

Run these E2E tests in 5 minutes.

## Step 1: Start Dev Server

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app
npm run dev
```

Wait for: "Convex functions ready"

## Step 2: Upload Test Artifact

1. Open: http://localhost:3000
2. Login (or create account)
3. Click "New Artifact"
4. Fill in:
   - Title: "E2E Test Artifact"
   - Description: "For automated E2E tests"
5. Upload: `/samples/01-valid/zip/charting/v1.zip`
6. Click "Create"
7. **Copy the shareToken from URL:** `http://localhost:3000/artifacts/{shareToken}`

## Step 3: Add More Versions

1. On artifact page, click "Add Version"
2. Upload v2.zip, v3.zip, v4.zip (from same folder)
3. Now you have 4 versions

## Step 4: Update Test Constants

**File:** `01-http-router-file-serving.spec.ts`
```typescript
const TEST_SHARE_TOKEN = 'YOUR_TOKEN_HERE'; // ← Paste your shareToken
```

**File:** `02-convex-api-integration.spec.ts`
```typescript
const TEST_SHARE_TOKEN = 'YOUR_TOKEN_HERE';
const TEST_ARTIFACT_ID = 'YOUR_ID_HERE';    // From URL or database
const TEST_VERSION_ID = 'YOUR_ID_HERE';     // From database
```

**File:** `03-version-management-flow.spec.ts`
```typescript
const TEST_SHARE_TOKEN = 'YOUR_TOKEN_HERE';
const TEST_ARTIFACT_ID = 'YOUR_ID_HERE';
```

## Step 5: Set Environment Variables

```bash
export CONVEX_URL="http://localhost:3000"
export NEXT_PUBLIC_CONVEX_SITE_URL="http://localhost:3000"
```

Or create `.env` file:
```
CONVEX_URL=http://localhost:3000
NEXT_PUBLIC_CONVEX_SITE_URL=http://localhost:3000
```

## Step 6: Run Tests

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/tasks/00015-fix-zip-artifact-viewing/01-comprehensive-version-management-test/e2e

# Run all tests
npm test

# Or run with visible browser
npm run test:headed
```

## Step 7: View Results

Tests will show in terminal:
- ✅ Green = passing
- ❌ Red = failing
- ⏸️ Yellow = skipped (expected if constants not updated)

## Troubleshooting

### "CONVEX_URL is required"
```bash
export CONVEX_URL="http://localhost:3000"
```

### "Artifact not found"
- Check shareToken is correct
- Check dev server is running
- Verify artifact wasn't deleted

### "All tests skipped"
- You need to update TEST_SHARE_TOKEN constants
- Remove `REPLACE_ME` and add your actual values

### "Tests timeout"
- Increase timeout in `playwright.config.ts`:
  ```typescript
  timeout: 120000
  ```

## Generate Validation Trace

After tests pass:

```bash
npm test -- --trace on
cp test-results/*/trace.zip ../validation-videos/e2e-trace.zip
npx playwright show-trace ../validation-videos/e2e-trace.zip
```

This opens an interactive timeline showing:
- HTTP requests/responses
- Network timing
- Console logs
- Screenshots

## What Gets Tested

| Test File | Tests | What |
|-----------|-------|------|
| 01-http-router-file-serving.spec.ts | 13 | HTTP GET requests, headers, 404s |
| 02-convex-api-integration.spec.ts | 10 | Convex queries, error handling |
| 03-version-management-flow.spec.ts | 9 | Version lifecycle, soft deletes |

**Total: 32 E2E tests**

## Success Looks Like

```
Running 32 tests using 1 worker

✅ 01-http-router-file-serving.spec.ts (13/13)
✅ 02-convex-api-integration.spec.ts (10/10)
✅ 03-version-management-flow.spec.ts (9/9)

32 passed (45s)
```

Then you know the HTTP router and backend integration are working correctly!
