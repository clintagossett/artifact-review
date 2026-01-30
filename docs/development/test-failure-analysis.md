# Test Failure Analysis

How to categorize and respond to test failures.

## Failure Categories

### 1. Timing Issues (FIXABLE)

Test infrastructure problems caused by async timing.

**Indicators:**
```
Timeout waiting for selector
Timeout 30000ms exceeded
locator.fill: Timeout
locator.click: Timeout
waitForSelector: Timeout
Navigation timeout
networkidle timeout
page.waitForURL: Timeout
```

**Root causes:**
- Element not rendered yet
- Async operation not complete
- Animation/transition in progress
- Server response slow

**Action:** Apply wait patterns from [E2E Timing Patterns](./e2e-timing-patterns.md)

### 2. Environment Issues (CONFIG FIX needed)

Infrastructure or configuration problems.

**Indicators:**
```
ECONNREFUSED
ENOTFOUND
Service unavailable
Could not connect to
Port already in use
Missing environment variable
Cannot find module
ENOMEM
```

**Root causes:**
- Service not running
- Wrong port configuration
- Missing .env values
- Dependencies not installed
- Out of memory

**Action:** Fix environment - see [Local Infrastructure](../setup/local-infrastructure.md) and [Troubleshooting](../setup/troubleshooting.md)

### 3. Real Bugs (ESCALATE)

Actual application code failures.

**Indicators:**
- Assertion failures on business logic values
- Wrong data returned from API
- Missing expected data
- Incorrect application behavior
- Stack traces pointing to `src/` or `convex/` (not test files)
- `Expected X but received Y` where Y is wrong business logic

**Root causes:**
- Application code defect
- Regression from recent changes
- Incomplete implementation
- Schema mismatch

**Action:** STOP. Report to developer. Do not modify tests to hide bugs.

### 4. Flaky Tests (INVESTIGATION needed)

Intermittent failures that need deeper analysis.

**Indicators:**
- Passes sometimes, fails others
- Race condition symptoms
- Order-dependent failures
- "Works on my machine"
- Different results in CI vs local

**Root causes:**
- Shared state between tests
- Missing test isolation
- External service dependencies
- Random/time-dependent behavior

**Action:** Add retry logic, improve isolation, or mark as known-flaky

## Decision Tree

```
Error message received
        │
        ▼
Contains timeout/wait keywords?
   YES → TIMING ISSUE → Apply e2e-timing-patterns.md
        │
        ▼ NO
Contains connection/service keywords?
   YES → ENVIRONMENT ISSUE → Fix via local-infrastructure.md
        │
        ▼ NO
Assertion failure on business logic?
   YES → REAL BUG → ESCALATE (stop)
        │
        ▼ NO
Intermittent/inconsistent?
   YES → FLAKY → Investigate
        │
        ▼ NO
        └→ UNKNOWN → Manual review needed
```

## Analysis Process

1. **Read test output** from `/tmp/*-test-output.txt`
2. **For each failure:**
   - Extract error message
   - Match against category indicators
   - Identify file and line number
   - Note patterns (multiple tests, same error)
3. **Categorize and report**

## Output Format

```markdown
## Failure Analysis

### Timing Issues (X failures) - Can Fix
- [ ] `test name` in `file:line` - waitForSelector timeout
- [ ] `test name` in `file:line` - navigation timeout

### Environment Issues (X failures) - Need Config
- [ ] `test name` - ECONNREFUSED localhost:3000
- [ ] `test name` - Missing env var CONVEX_URL

### Real Bugs (X failures) - ESCALATE
- [ ] `test name` in `file:line` - Expected "admin" but got "user"
- [ ] `test name` in `file:line` - Data validation failed

### Flaky (X failures) - Investigate
- [ ] `test name` - passes 80% of time
```
