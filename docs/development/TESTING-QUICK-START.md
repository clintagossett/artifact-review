# Testing Quick Start

Quick reference for setting up task-level tests.

## Task-Level E2E Tests Setup

### 1. Create Structure

```bash
cd tasks/XXXXX-task-name
mkdir -p tests/e2e tests/validation-videos
```

### 2. Create package.json

```bash
cd tests
cat > package.json << 'EOF'
{
  "name": "task-XXXXX-tests",
  "private": true,
  "devDependencies": {
    "@playwright/test": "^1.57.0"
  }
}
EOF
```

### 3. Create playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',      // CRITICAL: Enables trace.zip
    video: 'on',
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

### 4. Install Dependencies

```bash
npm install
```

This creates `node_modules/` (gitignored - safe to delete/recreate).

### 5. Write Test

Create `tests/e2e/feature-name.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do the thing', async ({ page }) => {
    await page.goto('/');
    // ... test steps
  });
});
```

### 6. Run & Validate

```bash
# Run test (generates trace.zip automatically)
npx playwright test

# Copy trace to validation videos
cp test-results/*/trace.zip validation-videos/feature-name-trace.zip

# View trace interactively
npx playwright show-trace validation-videos/feature-name-trace.zip
```

## Key Points

✅ **Tests live in task folders** (`tasks/XXXXX/tests/`) during development
✅ **Each task has its own package.json** for E2E dependencies
✅ **node_modules/ is gitignored** - recreate with `npm install`
✅ **Use trace.zip for validation** - NOT manual video recording
✅ **Trace = video + network + console + DOM** - much better for debugging

## Commands Cheat Sheet

```bash
# Backend tests (from app/)
cd app && npx vitest run

# E2E tests (from task/tests/)
cd tasks/XXXXX/tests && npx playwright test
cd tasks/XXXXX/tests && npx playwright test --headed
cd tasks/XXXXX/tests && npx playwright test --ui

# View trace
cd tasks/XXXXX/tests && npx playwright show-trace validation-videos/*.zip
```

## File Structure

```
tasks/XXXXX-task-name/
├── tests/
│   ├── package.json          ← Playwright dependency
│   ├── playwright.config.ts  ← Test config (trace: 'on')
│   ├── node_modules/         ← Gitignored
│   ├── e2e/
│   │   └── feature.spec.ts
│   └── validation-videos/
│       └── feature-trace.zip ← Primary validation artifact
├── test-report.md
└── README.md
```

## Promotion Path

When promoting E2E tests to project-level:

1. Move test: `tasks/.../tests/e2e/*.spec.ts` → `app/tests/e2e/`
2. Add Playwright to `app/package.json` devDependencies
3. Create `app/playwright.config.ts`
4. Add npm scripts to `app/package.json`
5. Clean up task-level test folder

See `testing-guide.md` for details.
