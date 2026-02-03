# Development Workflow

TDD-based development workflow for AI-assisted feature development.

## Task Structure

Every feature lives in a task folder tied to a GitHub issue:

```
tasks/XXXXX-feature-name/
├── README.md              # Requirements, decisions, outcomes
├── tests/
│   ├── package.json      # E2E dependencies (Playwright)
│   ├── playwright.config.ts  # E2E test configuration
│   ├── node_modules/     # GITIGNORED - local Playwright install
│   ├── convex/           # Convex function tests (use app's vitest)
│   │   └── feature.test.ts
│   ├── e2e/              # Playwright E2E tests
│   │   └── feature-flow.spec.ts
│   └── validation-trace/
│       └── feature-trace.zip    # Playwright trace (PRIMARY)
├── test-report.md        # What was tested, coverage, results
└── PROMOTION.md          # Which tests to promote (if any)
```

## Development Cycle

### 1. Read Requirements

Before writing any code:
- Read task README.md
- Understand acceptance criteria
- Draft test plan (what angles to test)

### 2. Write Tests First

**Location:** `tasks/XXXXX/tests/`

**Rules:**
- One test at a time
- Single assertion per test
- Test must fail first (for correct reason)
- Never delete tests to make them pass

```bash
# Run tests from task folder
npx vitest tasks/00006-local-dev-environment/tests/convex/
```

### 3. Implement Feature

Write minimal code to make the test pass:
- Only implement what the test requires
- No extra features
- No premature optimization

### 4. Refactor

After tests pass:
- Clean up code
- Remove duplication
- Ensure tests still pass

### 5. Repeat

Continue RED-GREEN-REFACTOR until feature complete.

### 6. Generate Validation Trace

**Use Playwright trace.zip, NOT manual video recording.**

After E2E tests pass:

```bash
cd tasks/XXXXX/tests

# Run tests (generates trace.zip automatically)
# Run tests (generates trace.zip automatically)
npx playwright test

# Finding traces
# They are located in test-results/*/trace.zip
# View trace interactively
npx playwright show-trace test-results/*/trace.zip
```

Playwright config must have `trace: 'on'` to generate trace.zip.

The trace provides:
- Interactive timeline with action highlights
- Network requests and console logs
- DOM snapshots
- Better than manual videos for debugging

**IMPORTANT:** Ensure trace is enabled in Playwright config:
```typescript
use: {
  trace: 'on',
}
```



### 7. Create Test Report

Create `test-report.md` documenting:
- What was tested
- Test results
- Coverage achieved
- Known limitations

### 8. Hand Off

Deliverables for review:
- ✅ Working feature
- ✅ Passing tests (backend + E2E)
- ✅ Validation trace (`test-results/.../trace.zip`)
- ✅ Test report (`test-report.md`)

## TDD Best Practices for AI Agents

### DO

- Start with a failing test
- Write only one test at a time
- Single assertion per test
- Implement only minimal code to pass
- Keep test context focused

### DO NOT

- Delete tests to make them pass
- Skip the failing test step
- Write implementation before tests
- Add features without tests
- Disable linting to pass

## Running Tests

### Convex Tests (convex-test + Vitest)

```bash
# Run all Convex tests
npx vitest convex/

# Run task-specific tests
npx vitest tasks/00006-local-dev-environment/tests/convex/

# Watch mode
npx vitest --watch
```

### E2E Tests (Playwright)

**Task-Level E2E Setup:**
```bash
# First time: Install Playwright in task folder
cd tasks/XXXXX/tests
npm install

# Run E2E tests (from task's tests/ directory)
npx playwright test                # Headless, generates trace.zip
npx playwright test --headed       # Visible browser
npx playwright test --ui           # Interactive mode

# View trace
npx playwright show-trace test-results/*/trace.zip
```

**Project-Level E2E (after promotion):**
```bash
cd app
npm run test:e2e
```

## Subtask Test Workflow

When working on subtasks, tests should be created at the subtask level first:

### 1. Create Subtask Test Structure

```
tasks/XXXXX-task/01-subtask-name/
└── tests/
    ├── unit/           # Unit tests
    │   └── feature.test.ts
    └── e2e/            # E2E tests
        ├── package.json
        ├── playwright.config.ts
        └── feature.spec.ts
```

### 2. Write Subtask-Scoped Tests

Tests should validate only the subtask's scope:
- Unit tests for functions/logic created in this subtask
- E2E tests for user flows introduced by this subtask

### 3. Uplevel When Appropriate

After subtask completion, evaluate tests for upleveling:

| Keep at Subtask | Uplevel to Task |
|-----------------|-----------------|
| Subtask-specific logic | Cross-subtask integration |
| Implementation details | User-facing flows |
| Edge cases from TDD | Regression tests |

### 4. Uplevel Process

```bash
# Move test to task level
mv 01-subtask/tests/e2e/flow.spec.ts ../tests/e2e/

# Update imports if needed
# Run from task tests directory to verify
cd ../tests && npx playwright test
```

## Test Promotion

After feature review, decide which tests to keep:

### Promote (copy to project level)

Tests that provide ongoing value:
- `convex/__tests__/` - Convex function tests
- `e2e/critical-paths/` - E2E regression tests

### Archive (keep in task folder)

Tests that were useful during development but don't need maintenance:
- Edge case tests used during TDD
- Exploratory tests
- Validation videos
