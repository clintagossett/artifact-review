# E2E Test Fix Workflow

## Problem
8 E2E tests are flaky - they fail on first try but pass on retry (2-3 attempts). This indicates timing/race condition issues.

## Solution
Iterative fix cycle using fresh agents for each test file to avoid context bloat.

## Usage

### Automatic (Recommended)
Run the orchestrator script to fix all flaky tests iteratively:

```bash
./scripts/fix-flaky-tests.py
```

Or fix a specific test:
```bash
./scripts/fix-flaky-tests.py --test-file notification.spec.ts
```

Dry run to see the plan:
```bash
./scripts/fix-flaky-tests.py --dry-run
```

### Manual (Step by Step)

For each flaky test file:

#### 1. Fix
Ask Claude to analyze and fix timing issues:
```
Analyze app/tests/e2e/[TEST_FILE] and fix timing issues.

Look for:
- Missing waits on async operations
- Assertions before elements are ready
- Race conditions in test setup

Apply fixes like:
- Explicit timeouts: waitForSelector({ timeout: 30000 })
- Network waits: waitForLoadState('networkidle')
- API waits: waitForResponse()
- Assertion timeouts: toBeVisible({ timeout: 30000 })

Test locally after fixing.
```

#### 2. Test Local
```bash
cd app
npm run test:e2e -- [TEST_FILE]
```

If tests pass → continue to step 3
If tests fail → iterate on fixes

#### 3. Commit
```bash
git add app/tests/e2e/[TEST_FILE]
git commit -m "Fix timing issues in [TEST_FILE]

Made test more resilient by adding proper waits and timeouts.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

#### 4. Deploy
```bash
git push origin staging
```

#### 5. Test Staging
Monitor GitHub Actions:
```bash
gh run watch --exit-status
```

Or view in browser:
https://github.com/clintagossett/artifact-review/actions

#### 6. Monitor Results

**If tests pass:** ✅ Move to next test file
**If tests fail:** ❌ Analyze failure, iterate

## Flaky Test Files

Current flaky tests to fix:
1. `agent-api.spec.ts` - Agent API CRUD lifecycle
2. `artifact-workflow.spec.ts` - Error handling
3. `notification.spec.ts` - 5 notification tests (biggest impact)
4. `stripe-subscription.spec.ts` - Stripe checkout flow

## Common Timing Fixes

### Before (Flaky)
```typescript
await page.click('button');
await expect(page.locator('.result')).toBeVisible();
```

### After (Stable)
```typescript
await page.getByRole('button').click();
await page.waitForLoadState('networkidle');
await expect(page.locator('.result')).toBeVisible({ timeout: 30000 });
```

## Success Criteria

All 8 flaky tests should:
- ✅ Pass on first try (no retries needed)
- ✅ Pass consistently (3+ runs in a row)
- ✅ Complete in reasonable time (<5 min total)

## Workflow Benefits

1. **Fresh context per test** - Each agent starts clean
2. **Incremental progress** - Fix one test at a time
3. **Verify before deploy** - Local tests catch issues early
4. **Automated monitoring** - Script watches staging tests
5. **Clear rollback** - Each commit is isolated

## Expected Timeline

- Per test: ~10-15 min (fix → test local → commit → deploy → test staging)
- Total (4 files): ~1 hour
- Notification tests (5 tests in one file): ~15 min

## Notes

- Visual tests are intentionally skipped in CI (expected)
- Workflow now properly detects success (8 passed = SUCCESS)
- Retries are OK during fixing, but goal is 0 retries
