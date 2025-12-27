# Testing Guide

How to write and organize tests in Artifact Review.

## Test Tiers

| Tier | Location | Purpose | Lifespan |
|------|----------|---------|----------|
| **Task-level** | `tasks/XXXXX/tests/` | Validate during development | Until promotion |
| **Project-level** | `convex/__tests__/`, `e2e/` | Prevent regressions | Permanent |
| **Validation** | `tasks/XXXXX/tests/validation-videos/` | Human review proof | Archived |

## Test Types

| Type | Speed | When to Use |
|------|-------|-------------|
| **Unit** | Fast (ms) | Pure logic, validators, utilities |
| **Integration** | Medium | Convex functions with DB operations |
| **E2E** | Slow | Critical user flows |
| **Validation** | Variable | Feature completion, handoff |

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

# 2. Assemble final validation video
../../../../scripts/assemble-validation-video.sh \
  --title "Login Flow" test-results/login-flow \
  --title "Signup Flow" test-results/signup-flow \
  --output validation-videos/master-validation.mp4

# 3. View final video
open validation-videos/master-validation.mp4
```

The assembly script:
- Concatenates clips within each test flow
- Adds 3-second title slides between sections
- Normalizes to 1280x720, 30fps, H.264
- Outputs single MP4 file

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
tasks/00006-local-dev-environment/
├── tests/
│   ├── package.json                # E2E dependencies (Playwright)
│   ├── playwright.config.ts        # E2E test configuration
│   ├── node_modules/               # GITIGNORED - local install
│   ├── convex/
│   │   └── auth.test.ts           # Backend tests (use app's vitest)
│   ├── e2e/
│   │   ├── login-flow.spec.ts     # E2E tests (with click indicators)
│   │   └── signup-flow.spec.ts    # E2E tests (with click indicators)
│   ├── test-results/
│   │   ├── login-flow/video.webm  # Auto-generated by Playwright
│   │   ├── signup-flow/video.webm # Auto-generated by Playwright
│   │   └── */trace.zip            # Debugging traces
│   └── validation-videos/
│       ├── master-validation.mp4  # Assembled from E2E videos
│       └── README.md              # Viewing instructions
├── test-report.md
└── README.md
```

**Key Points:**
- E2E tests need `package.json` + `node_modules` in `tests/` folder
- `node_modules/` is gitignored (recreate with `npm install`)
- Backend tests use app's vitest (no local deps needed)
- All E2E tests use click indicators for visible interactions
- `master-validation.mp4` is assembled from test recordings
- Trace.zip files are for debugging, not final deliverables

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
