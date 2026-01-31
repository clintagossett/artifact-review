# Subtask 03: E2E Test Updates

**Parent Task:** 00049-artifact-version-status
**Status:** OPEN
**Created:** 2026-01-31
**Depends On:** Subtasks 01 + 02

---

## Objective

Update E2E tests to use the new `data-version-status` attribute for synchronization instead of arbitrary timeouts. Add tests for error states.

---

## Acceptance Criteria

1. E2E tests wait for `[data-version-status="ready"]` instead of timeouts
2. Tests verify status transitions during upload flow
3. Error state test using forbidden file types
4. All existing E2E tests still pass
5. No arbitrary `waitForTimeout()` calls for upload synchronization

---

## Files to Modify

| File | Changes Required |
|------|------------------|
| `app/tests/e2e/artifact-workflow.spec.ts` | Update upload wait logic |
| `app/src/app/a/[shareToken]/page.tsx` | Add `data-version-status` attribute |
| `app/src/components/artifact-viewer/ArtifactViewer.tsx` | Add `data-version-status` attribute |

---

## TDD Approach

### Step 1: Identify Current Timeout-Based Waits

Current problematic patterns in `artifact-workflow.spec.ts`:

```typescript
// BEFORE: Arbitrary timeout
await page.waitForTimeout(2000);

// BEFORE: URL-based wait (race condition prone)
await expect(page).toHaveURL(/\/a\//, { timeout: 30000 });
```

### Step 2: Write Updated Test Cases

```typescript
// AFTER: Deterministic status-based wait
await page.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });
```

### Step 3: Add Error State Tests

```typescript
test('shows error state for invalid ZIP', async ({ page }) => {
  // Upload forbidden video types ZIP
  // Wait for [data-version-status="error"]
  // Verify error message is displayed
});
```

---

## Implementation Details

### 1. Add Data Attribute to Viewer

In `app/src/app/a/[shareToken]/page.tsx` or the main viewer component, add:

```typescript
// In the viewer container component
<div
  data-version-status={version?.status ?? "ready"}
  className="..."
>
  {/* Viewer content */}
</div>
```

### 2. Update artifact-workflow.spec.ts

#### Replace URL-Based Wait

```typescript
// BEFORE
await expect(page).toHaveURL(/\/a\//, { timeout: 30000 });
await expect(page).not.toHaveURL(/\/dashboard/);

// AFTER
// Wait for navigation to artifact page
await expect(page).toHaveURL(/\/a\//, { timeout: 30000 });

// Wait for version to be ready (deterministic)
await page.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });
```

#### Replace Arbitrary Timeout

```typescript
// BEFORE
await page.waitForTimeout(2000);
await expect(page.getByText('docs', { exact: true }).first()).toBeVisible({ timeout: 10000 });

// AFTER
// Status-based wait ensures content is loaded
await page.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });
await expect(page.getByText('docs', { exact: true }).first()).toBeVisible();
```

### 3. Add Error State Test

```typescript
test('shows error state for ZIP with forbidden file types', async ({ page }) => {
  test.setTimeout(60000);
  const user = generateUser();

  // Login flow (same as other tests)
  await page.goto('/login');
  await page.getByRole('button', { name: 'Magic Link' }).click();
  await page.getByLabel('Email address').fill(user.email);
  await page.getByRole('button', { name: 'Send Magic Link' }).click();
  await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 10000 });

  const emailData = await getLatestEmail(user.email);
  const magicLink = extractMagicLink(emailData.html);
  await page.goto(magicLink!);
  await expect(page).toHaveURL(/\/dashboard/);

  // Open upload dialog
  const headerNewBtn = page.getByRole('button', { name: 'New Artifact' });
  const emptyStateBtn = page.getByRole('button', { name: 'Create Your First Artifact' });
  if (await headerNewBtn.isVisible()) {
    await headerNewBtn.click();
  } else {
    await emptyStateBtn.click();
  }
  await expect(page.getByText('Create New Artifact')).toBeVisible();

  // Upload ZIP with forbidden video files
  // NOTE: This file must be generated first using samples/04-invalid/wrong-type/generate.sh
  const invalidZipPath = path.resolve(
    process.cwd(),
    '../samples/04-invalid/wrong-type/presentation-with-video.zip'
  );

  await page.setInputFiles('input[type="file"]', invalidZipPath);

  const artifactName = `E2E Error State ${Date.now()}`;
  await page.getByLabel('Artifact Name').fill(artifactName);

  const createButton = page.getByRole('button', { name: 'Create Artifact' });
  await expect(createButton).toBeEnabled({ timeout: 10000 });
  await createButton.click();

  // Wait for error state (NOT navigation - should stay on dashboard)
  await page.waitForSelector('[data-version-status="error"]', { timeout: 30000 });

  // Verify error message is displayed
  await expect(page.getByText(/unsupported file types/i)).toBeVisible();

  // Verify we're still on dashboard (not navigated)
  await expect(page).toHaveURL(/\/dashboard/);
});
```

### 4. Add Status Transition Test

```typescript
test('shows processing states during ZIP upload', async ({ page }) => {
  test.setTimeout(60000);
  const user = generateUser();

  // Login and navigate to dashboard (abbreviated)
  // ... login flow ...

  // Start upload
  const zipPath = path.resolve(
    process.cwd(),
    '../samples/01-valid/zip/charting/v1.zip'
  );
  await page.setInputFiles('input[type="file"]', zipPath);
  await page.getByLabel('Artifact Name').fill(`E2E Status ${Date.now()}`);
  await page.getByRole('button', { name: 'Create Artifact' }).click();

  // Should see uploading state first
  // NOTE: This may be too fast to catch - test is optional
  // await page.waitForSelector('[data-version-status="uploading"]', { timeout: 5000 });

  // Should transition to processing
  // NOTE: This may also be too fast - test is optional
  // await page.waitForSelector('[data-version-status="processing"]', { timeout: 10000 });

  // Eventually should be ready
  await page.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });

  // Verify we navigated to the artifact
  await expect(page).toHaveURL(/\/a\//);
});
```

---

## Test Samples

| Test Case | Sample | Notes |
|-----------|--------|-------|
| Valid ZIP upload | `samples/01-valid/zip/charting/v1.zip` | Tests ready state |
| Error state | `samples/04-invalid/wrong-type/presentation-with-video.zip` | Tests error state |
| Valid HTML | `samples/01-valid/html/simple-html/v1/index.html` | Tests immediate ready |

**IMPORTANT:** The `presentation-with-video.zip` file must be generated before running tests:

```bash
cd samples/04-invalid/wrong-type
./generate.sh  # Requires ffmpeg
```

---

## Verification Checklist

- [ ] `[data-version-status]` attribute added to viewer container
- [ ] Attribute reflects current version status
- [ ] E2E tests updated to use status-based waits
- [ ] No arbitrary `waitForTimeout()` for upload sync
- [ ] Error state test passes with forbidden files
- [ ] All existing E2E tests pass
- [ ] Tests produce video recordings (mandatory)

---

## Dependencies

- Subtask 01: Schema must have status field
- Subtask 02: Frontend must render `data-version-status` attribute
- Sample files: `presentation-with-video.zip` must be generated

---

## Test Configuration

Ensure Playwright config has video recording enabled:

```typescript
// playwright.config.ts
use: {
  video: 'on',  // MANDATORY
  trace: 'on',
}
```

---

## Debugging Tips

### If tests fail with "status attribute not found"

1. Check that the viewer component renders `data-version-status`
2. Verify the status field is being passed from Convex query
3. Check for typos in attribute name

### If error state test fails

1. Ensure `presentation-with-video.zip` is generated (run `generate.sh`)
2. Check that ZIP processing correctly sets status to "error"
3. Verify error handling doesn't redirect away from dashboard

### If status transitions are too fast to capture

The intermediate states (uploading, processing) may complete faster than Playwright can observe. This is expected for small files. Focus on testing:
- Final ready state for successful uploads
- Final error state for failed uploads

---

## Clean Up

After E2E tests, error-state artifacts may remain in the database. This is acceptable for testing but consider:
- Adding cleanup in test teardown
- Using unique artifact names per test run
- Periodic cleanup of test data
