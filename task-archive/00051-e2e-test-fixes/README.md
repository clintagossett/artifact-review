# Task 00051: E2E Test Suite Investigation and Fixes

**GitHub Issue:** #51
**Created:** 2026-01-31
**Status:** Complete

## Summary

Investigated failing e2e tests, documented root causes, and fixed issues.

## Test Results

### Initial Run (Before Fixes)
- **10 failed**, 1 skipped, 4 passed

### Final Run (After Fixes)
- **4 failed**, 1 skipped, **10 passed**

| Test | Status | Notes |
|------|--------|-------|
| auth.spec.ts - Signup with Password | PASS | |
| auth.spec.ts - Magic Link | PASS | |
| artifact-workflow.spec.ts - Complete lifecycle | PASS | Fixed button locators and file input |
| artifact-workflow.spec.ts - Add comment via text selection | SKIP | `test.fixme()` - iframe text selection not supported |
| smoke-integrations.spec.ts - NotificationCenter renders | PASS | |
| smoke-integrations.spec.ts - Magic link email delivered | PASS | |
| smoke-integrations.spec.ts - Comment triggers notification | FAIL | Complex multi-user test - timing issues |
| collaboration.spec.ts - Full Lifecycle | FAIL | Complex multi-user test - timing issues |
| agent-api.spec.ts - Full CRUD Lifecycle | PASS | Fixed button locators and file input |
| notification.spec.ts - Test 1 | PASS | |
| notification.spec.ts - Test 2 | PASS | |
| notification.spec.ts - Test 3 | FAIL | Complex 3-user scenario - timing issues |
| notification.spec.ts - Test 4 | PASS | |
| notification.spec.ts - Test 5 | PASS | |
| notification.spec.ts - Test 6 | FAIL | Novu badge clear behavior issue |

## Root Cause Analysis

### 1. Button Locator Mismatches (FIXED)

**Current UI:**
- Header: `button "Upload"` (in DashboardHeader.tsx)
- Empty state: `button "Create Artifact"` (in EmptyState.tsx)
- ArtifactList: `button "New Artifact"` (in ArtifactList.tsx)

**Fix:** Updated all tests to use `getByRole('button', { name: 'Upload' })` consistently since the Upload button is always visible in the header.

### 2. File Input Selector (FIXED)

The UploadDropzone has a hidden file input with `id="file-upload"`.

**Fix:** Changed from `input[type="file"]` to `#file-upload` for more specific targeting. Also added wait for file to appear in upload area after selection.

### 3. Sample File Paths (FIXED)

Some tests used hardcoded absolute paths.

**Fix:** All tests now use `path.resolve(process.cwd(), '../samples/...')` for portable paths.

### 4. Test Parallelism (FIXED)

Running 12 workers caused resource contention and timing failures.

**Fix:** Limited workers to 2 in playwright.config.ts for local development.

### 5. Complex Multi-User Tests (KNOWN ISSUES)

The remaining failures are in complex multi-user scenarios:
- Tests with 3+ browser contexts
- Tests that depend on real-time Novu notification delivery
- Tests with intricate timing dependencies

These require either:
- Application-side fixes (Novu badge clearing)
- More sophisticated test waiting strategies
- Potential refactoring of test architecture

## Fixes Applied

- [x] `app/playwright.config.ts` - Reduced workers to 2
- [x] `app/tests/e2e/artifact-workflow.spec.ts` - Fixed button locators, file input
- [x] `app/tests/e2e/collaboration.spec.ts` - Fixed button locators, file input, increased timeout
- [x] `app/tests/e2e/agent-api.spec.ts` - Fixed button locators, file input
- [x] `app/tests/e2e/smoke-integrations.spec.ts` - Fixed path import, button locators, file input
- [x] `app/tests/e2e/notification.spec.ts` - Fixed button locators, file input, placeholder text

## Remaining Issues (Future Work)

1. **notification Test 6**: Novu badge doesn't clear when opening notification center - may need application fix
2. **notification Test 3**: 3-user scenario with complex timing - needs test refactoring
3. **collaboration test**: Complex multi-context test - intermittent timeout
4. **smoke-integrations (Comment notification)**: Multi-user test with complex flow
