# Testing Guide

How to write and organize tests in Artifact Review.

## Test Tiers

| Tier | Location | Purpose | Lifespan |
|------|----------|---------|----------|
| **Task-level** | `tasks/XXXXX/tests/` | Validate during development | Until promotion |
| **Project-level** | `convex/__tests__/`, `e2e/` | Prevent regressions | Permanent |
| **Validation** | `tasks/XXXXX/tests/validation-videos/` | Human review proof | Archived |

## Sample Test Files

**IMPORTANT:** Use the centralized test samples in `/samples/` for all artifact upload/processing tests.

### Available Sample Files

The project maintains comprehensive test samples at `/samples/`:

| Category | Location | Purpose |
|----------|----------|---------|
| **Valid ZIP** | `samples/01-valid/zip/charting/v1.zip` → `v5.zip` | Multi-file artifacts (5 versions) |
| **Valid HTML** | `samples/01-valid/html/simple-html/v1/` → `v5/` | Single-file artifacts (5 versions) |
| **Valid Markdown** | `samples/01-valid/markdown/product-spec/v1.md` → `v5.md` | Markdown docs (5 versions) |
| **Invalid - Too Large** | `samples/04-invalid/too-large/huge.zip` | 155MB ZIP (generated) |
| **Invalid - Forbidden Types** | `samples/04-invalid/wrong-type/presentation-with-video.zip` | ZIP with real videos (generated) |

**See:** `/samples/README.md` for complete documentation of all test files.

### Why Use Central Samples

✅ **Consistent test data** - All tests use the same files
✅ **Version testing** - 5 versions of each artifact type for version comparison tests
✅ **Realistic data** - Real video files (not mocks) for forbidden type validation
✅ **Well documented** - Each sample has clear expected behavior
✅ **Maintained centrally** - Updates apply to all tests

### Usage in Tests

**Backend Integration Tests:**
```typescript
import path from 'path';
import fs from 'fs/promises';

test("upload ZIP artifact", async () => {
  const t = convexTest(schema);

  // ✅ Load from central samples
  const zipPath = path.join(__dirname, '../../../samples/01-valid/zip/charting/v1.zip');
  const zipContent = await fs.readFile(zipPath);
  const zipBlob = new Blob([zipContent], { type: "application/zip" });

  // Test upload and processing...
});
```

**E2E Tests:**
```typescript
import path from 'path';

test('user uploads HTML artifact', async ({ page }) => {
  await page.goto('/upload');

  // ✅ Use sample HTML file
  const samplePath = path.join(__dirname, '../../../samples/01-valid/html/simple-html/v1/index.html');
  await page.setInputFiles('input[type="file"]', samplePath);

  await expect(page.getByText('Upload successful')).toBeVisible();
});
```

**Testing Version Comparison:**
```typescript
test("compare two artifact versions", async () => {
  // Upload v1
  const v1Path = path.join(__dirname, '../../../samples/01-valid/zip/charting/v1.zip');
  const v1Id = await uploadArtifact(v1Path);

  // Upload v2
  const v2Path = path.join(__dirname, '../../../samples/01-valid/zip/charting/v2.zip');
  const v2Id = await uploadArtifact(v2Path);

  // Both versions have "Monthly Sales Dashboard" with different version numbers in H1
  // Perfect for testing version comparison UI
});
```

**Testing Forbidden File Types:**
```typescript
test("reject ZIP with video files", async () => {
  // ⚠️ Must generate first: cd samples/04-invalid/wrong-type && ./generate.sh

  const forbiddenZip = path.join(__dirname, '../../../samples/04-invalid/wrong-type/presentation-with-video.zip');

  await expect(async () => {
    await uploadArtifact(forbiddenZip);
  }).rejects.toThrow(/unsupported file types.*\.mov.*\.mp4.*\.avi/i);
});
```

### Generating Test Files

Some test files must be generated (too large to commit):

```bash
# Generate oversized ZIP (155MB)
cd samples/04-invalid/too-large
./generate.sh

# Generate ZIP with real video files (requires ffmpeg)
cd samples/04-invalid/wrong-type
./generate.sh  # Requires: brew install ffmpeg
```

## Test Types

| Type | Speed | When to Use |
|------|-------|-------------|
| **Unit** | Fast (ms) | Pure logic, validators, utilities |
| **Integration** | Medium | Convex functions with DB operations |
| **E2E** | Slow | Critical user flows |
| **Validation** | Variable | Feature completion, handoff |

### Integration Test Requirements by Feature Type

**CRITICAL:** Integration tests must validate the COMPLETE flow, not just database operations.

#### File Upload/Storage Features

When testing features that upload, store, or process files, integration tests MUST:

✅ **REQUIRED:**
- Load actual files from `tasks/XXXXX/samples/` or create test files
- Upload files to Convex storage (use actual storage APIs)
- Verify `storageId` is returned and valid
- Trigger any processing actions (extraction, parsing, etc.)
- Verify processed data appears in database tables
- Verify files can be retrieved from storage
- Test with realistic file sizes and types

❌ **NOT SUFFICIENT:**
- Only testing metadata creation
- Mocking storage operations
- Skipping file processing
- Only verifying database records exist

**Example: ZIP File Upload**
```typescript
test("upload and process ZIP file", async () => {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) =>
    await ctx.db.insert("users", { email: "test@example.com" })
  );

  // ✅ Load actual ZIP file from central samples
  const zipPath = path.join(__dirname, "../../../samples/01-valid/zip/charting/v1.zip");
  const zipContent = await fs.readFile(zipPath);
  const zipBlob = new Blob([zipContent], { type: "application/zip" });

  // ✅ Create artifact and get upload URL
  const { uploadUrl, versionId } = await t
    .withIdentity({ subject: userId })
    .mutation(api.zipUpload.createArtifactWithZip, {
      title: "Test ZIP",
      fileSize: zipBlob.size,
    });

  // ✅ Actually upload to storage
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    body: zipBlob,
  });
  const { storageId } = await uploadResponse.json();

  // ✅ Trigger processing
  await t.action(api.zipUpload.triggerZipProcessing, { versionId, storageId });

  // ✅ Verify files were extracted and stored
  const files = await t.run(async (ctx) =>
    await ctx.db
      .query("artifactFiles")
      .withIndex("by_version", (q) => q.eq("versionId", versionId))
      .collect()
  );

  expect(files.length).toBeGreaterThan(0);
  expect(files.some(f => f.filePath === "index.html")).toBe(true);

  // ✅ Verify we can retrieve files from storage
  const indexFile = files.find(f => f.filePath === "index.html")!;
  const fileUrl = await t.run(async (ctx) =>
    await ctx.storage.getUrl(indexFile.storageId)
  );
  expect(fileUrl).toBeDefined();
});
```

#### Authentication Features

When testing auth features, integration tests MUST:
- Generate real tokens (not mocks)
- Test token verification
- Test token expiry
- Test complete signup/signin flows
- Verify session state

#### API/HTTP Endpoints

When testing HTTP routes, integration tests MUST:
- Make actual HTTP requests
- Verify response status codes
- Verify response headers
- Verify response body structure
- Test error cases (404, 400, 500)

## Convex Testing with convex-test

### Setup

```bash
npm install --save-dev convex-test vitest @edge-runtime/vm
```

### Basic Test

```typescript
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

test("creating artifact", async () => {
  const t = convexTest(schema);
  await t.mutation(api.artifacts.create, { title: "Test" });
  const artifacts = await t.query(api.artifacts.list);
  expect(artifacts).toHaveLength(1);
});
```

### Testing with Auth

```typescript
test("user can only see their artifacts", async () => {
  const t = convexTest(schema);

  // Create as Sarah
  const asSarah = t.withIdentity({ name: "Sarah", email: "sarah@example.com" });
  await asSarah.mutation(api.artifacts.create, { title: "Sarah's artifact" });

  // Create as Bob
  const asBob = t.withIdentity({ name: "Bob", email: "bob@example.com" });
  await asBob.mutation(api.artifacts.create, { title: "Bob's artifact" });

  // Sarah sees only her artifact
  const sarahArtifacts = await asSarah.query(api.artifacts.list);
  expect(sarahArtifacts).toHaveLength(1);
  expect(sarahArtifacts[0].title).toBe("Sarah's artifact");
});
```

### convex-test Limitations

- Does NOT enforce size/time limits
- No cron job support (trigger manually)
- Error messages may differ from production
- Use local backend when production parity matters

## E2E Testing with Playwright

### Task-Level E2E Setup

**IMPORTANT:** E2E tests live in task folders during development, not in `app/tests/`.

Each task that needs E2E tests gets its own Playwright setup:

```bash
# 1. Create test structure
mkdir -p tasks/XXXXX-task-name/tests/e2e

# 2. Create package.json for Playwright
cd tasks/XXXXX-task-name/tests
cat > package.json << 'EOF'
{
  "name": "task-XXXXX-tests",
  "private": true,
  "devDependencies": {
    "@playwright/test": "^1.57.0"
  }
}
EOF

# 3. Install Playwright (creates node_modules - gitignored)
npm install

# 4. Create playwright.config.ts
# See example below
```

**Why task-level?**
- Dependencies isolated (no conflicts between tasks)
- Tests stay with task documentation
- Easy to promote to project-level when ready
- `node_modules/` is gitignored (no repo bloat)

### Playwright Config Template

Create `tasks/XXXXX-task-name/tests/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',      // CRITICAL: Enables trace.zip with action tracking
    video: 'on',      // Also record video for backup
    screenshot: 'on',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    cwd: '../../../app',
    timeout: 120000,
  },
});
```

### Click Indicator for Video Recordings

**IMPORTANT:** All E2E tests should use the click indicator utility to make clicks visible in recorded videos.

The click indicator adds:
- **Red cursor dot** (12px) that follows mouse movement
- **Click ripple** - Expanding red ring on every click
- **Non-invasive** - Uses `pointer-events: none` so it doesn't interfere with tests

#### Basic Usage

```typescript
import { test, expect } from '@playwright/test';
import { injectClickIndicator } from '../../../app/tests/utils/clickIndicator';

test('user can upload artifact', async ({ page }) => {
  await page.goto('/');
  await injectClickIndicator(page);  // Add click indicators

  await page.getByRole('button', { name: 'Upload' }).click();
  await page.setInputFiles('input[type="file"]', 'test-file.html');
  await expect(page.getByText('Upload successful')).toBeVisible();
});
```

#### Auto-Inject for Multi-Page Flows

For tests that open new pages or popups, use `setupAutoInject`:

```typescript
import { test, expect } from '@playwright/test';
import { injectClickIndicator, setupAutoInject } from '../../../app/tests/utils/clickIndicator';

test('user flow with multiple pages', async ({ browser }) => {
  const context = await browser.newContext({
    recordVideo: { dir: 'test-results/videos' }
  });

  // Auto-inject on all new pages
  setupAutoInject(context);

  const page = await context.newPage();
  await page.goto('/');
  await injectClickIndicator(page);  // Backup for initial page

  // All clicks show indicators, even on new pages
  await page.click('a[target="_blank"]');

  await context.close();
});
```

**See:** `tasks/00013-update-validation-video-methodology/01-click-indicator/example/` for complete examples.

### Validation Videos (Automated)

**NEW APPROACH:** Final validation videos are automatically assembled from E2E test recordings.

**DO NOT create manual screen recordings.** Instead:
1. Write E2E tests with click indicators
2. Run tests (generates .webm videos)
3. Assemble videos with title slides using scripts

**Benefits:**
- ✅ Videos generated automatically from tests
- ✅ Click indicators make actions visible
- ✅ Consistent format and quality
- ✅ Professional presentation with title slides
- ✅ Single master video combines all test flows

#### Workflow

```bash
cd tasks/XXXXX-task-name/tests

# 1. Run E2E tests (generates videos with click indicators)
npx playwright test

# Result: test-results/ now contains multiple subdirectories,
# each with video.webm for each test that ran

# 2. Option A: Combine ALL tests into one validation video
../../../../scripts/concat_journey.sh test-results
../../../../scripts/normalize_video.sh test-results/flow.webm validation-videos/validation.mp4

# 2. Option B: Organize by journey with title slides
../../../../scripts/assemble-validation-video.sh \
  --title "Magic Link Authentication" test-results \
  --output validation-videos/master-validation.mp4

# 3. View final video
open validation-videos/master-validation.mp4
```

**What happens:**
- Playwright creates one subdirectory per test in `test-results/`
- Each subdirectory contains `video.webm`, `trace.zip`, screenshots
- Scripts find all `video.webm` files in subdirectories
- Videos are concatenated in sorted order
- Title slides added between sections (if using assemble-validation-video.sh)
- Final output: 1280x720, 30fps, H.264 MP4

**See:** `tasks/00013-update-validation-video-methodology/02-video-assembly/` for implementation details.

### Playwright Trace (For Debugging)

Playwright also generates trace.zip files for debugging:

```bash
# View trace interactively
npx playwright show-trace test-results/*/trace.zip
```

The trace viewer shows:
- Timeline of all actions with screenshots
- Click highlights on each action
- Network activity
- Console logs
- Full DOM snapshots

**Use trace.zip for debugging, master-validation.mp4 for deliverables.**

## File Organization

### Task-Level Tests

```
tasks/00008-magic-link-authentication/
├── tests/
│   ├── package.json                # E2E dependencies (Playwright)
│   ├── playwright.config.ts        # E2E test configuration
│   ├── node_modules/               # GITIGNORED - local install
│   ├── convex/
│   │   └── auth.test.ts           # Backend tests (use app's vitest)
│   ├── e2e/
│   │   ├── magic-link.spec.ts     # E2E tests (with click indicators)
│   │   └── password-auth.spec.ts  # E2E tests (with click indicators)
│   ├── test-results/               # Playwright auto-generated
│   │   ├── magic-link-Auth-hash1-chromium/
│   │   │   ├── video.webm         # Video for test 1
│   │   │   ├── trace.zip          # Debug trace
│   │   │   └── test-finished-1.png
│   │   ├── magic-link-Auth-hash2-chromium/
│   │   │   ├── video.webm         # Video for test 2
│   │   │   └── trace.zip
│   │   ├── magic-link-Auth-hash3-chromium/
│   │   │   └── video.webm         # Video for test 3
│   │   └── flow.webm              # Combined (created by script)
│   └── validation-videos/
│       ├── master-validation.mp4  # Final assembled video
│       └── README.md              # Viewing instructions
├── test-report.md
└── README.md
```

**Key Points:**
- **Playwright creates ONE subdirectory per test** with hash-based names
- Each subdirectory contains `video.webm`, `trace.zip`, and screenshots
- Multiple tests = multiple video.webm files in separate subdirectories
- Assembly scripts find all `video.webm` files and concatenate them
- `flow.webm` is the combined video (intermediate step)
- `master-validation.mp4` is the final deliverable
- E2E tests need `package.json` + `node_modules` in `tests/` folder
- `node_modules/` is gitignored (recreate with `npm install`)
- Backend tests use app's vitest (no local deps needed)
- All E2E tests use click indicators for visible interactions

### Project-Level Tests (Promoted)

```
convex/
├── __tests__/
│   ├── auth.test.ts       # Promoted from task
│   └── artifacts.test.ts  # Promoted from task
e2e/
├── critical-paths/
│   └── login.spec.ts      # Promoted from task
```

## What to Test

### Auth (Minimum Coverage)

| Test | Type | Why |
|------|------|-----|
| Full signup/signin flow | E2E | Catches 80% of auth breaks |
| Token generation | Unit | Token bugs are silent killers |
| Token verification (valid) | Unit | Core happy path |
| Token verification (expired) | Unit | Critical security edge |
| Token verification (used) | Unit | Prevent token reuse |
| Full flow E2E tests | E2E + Validation | Videos auto-assembled for review |

### Skip

- Component tests for forms (E2E covers it)
- Every validation edge case (hit during development)
- Mocking framework internals (trust the framework)
- Performance tests (premature optimization)

## Running Tests

### Backend Tests (Vitest)

```bash
# From app/ directory
cd app
npx vitest run                     # All tests
npx vitest convex/__tests__/      # Just backend tests
npx vitest --watch                 # Watch mode
```

### Task-Level E2E Tests (Playwright)

```bash
# From task's tests/ directory
cd tasks/XXXXX-task-name/tests

# First time setup
npm install

# Run tests
npx playwright test                # Headless (generates trace.zip)
npx playwright test --headed       # Visible browser
npx playwright test --ui           # Interactive UI mode

# View trace
npx playwright show-trace test-results/*/trace.zip
npx playwright show-trace validation-videos/feature-trace.zip
```

### Promoted E2E Tests (Project-Level)

```bash
# From app/ directory (after tests are promoted)
cd app
npm run test:e2e
npm run test:e2e:headed
```
