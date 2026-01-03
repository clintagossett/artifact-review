# Subtask 05: End-to-End Testing

**Status:** Pending
**Estimated Effort:** 2-3 hours
**Owner:** TBD
**Prerequisites:** Subtasks 02, 03, 04 must be complete

## Purpose

Validate the complete artifact upload workflow from end-to-end using Playwright.

## Test Scope

### Happy Path Test: Complete Upload Flow
**File:** `tasks/00010-artifact-upload-creation/tests/e2e/artifact-upload.spec.ts`

**Scenario:** User creates artifact, uploads HTML, views in list, copies share link

**Steps:**
1. Sign in as authenticated user
2. Navigate to dashboard
3. Click "New Artifact" button
4. Upload HTML file via drag-and-drop
5. Fill in metadata form (title, description)
6. Submit artifact
7. Verify success message
8. Verify artifact appears in list
9. Copy share link
10. Verify link copied to clipboard
11. Open share link in new incognito context
12. Verify HTML renders correctly

### Edge Cases to Test

#### File Validation Tests
**File:** `tasks/00010-artifact-upload-creation/tests/e2e/upload-validation.spec.ts`

1. **File too large (> 5MB)**
   - Attempt to upload 6MB HTML file
   - Verify error message shown
   - Verify upload blocked

2. **Invalid file type**
   - Attempt to upload `.txt`, `.pdf`, `.zip` file
   - Verify error message shown
   - Verify upload blocked

3. **Empty file**
   - Upload empty HTML file
   - Verify error or warning
   - Decide behavior: allow or block?

#### Network Error Handling
**File:** `tasks/00010-artifact-upload-creation/tests/e2e/error-handling.spec.ts`

1. **Network failure during upload**
   - Mock network failure
   - Verify error message shown
   - Verify retry option available

2. **Server error (500)**
   - Mock server error
   - Verify user-friendly error message
   - Verify error logged

#### List View Tests
**File:** `tasks/00010-artifact-upload-creation/tests/e2e/artifact-list.spec.ts`

1. **Empty state (new user)**
   - Sign in as new user
   - Verify empty state displays
   - Verify "Create New Artifact" CTA

2. **List with multiple artifacts**
   - Create 3 artifacts
   - Verify all appear in list
   - Verify sorted by most recent first

3. **Delete artifact**
   - Click delete button
   - Confirm deletion
   - Verify artifact removed from list
   - Verify artifact inaccessible via share link

## Test Implementation

### Complete Upload Flow Example

```typescript
import { test, expect } from '@playwright/test';
import { signIn, createTestUser } from '../helpers/auth';

test.describe('Artifact Upload Flow', () => {
  test('user can create artifact and get share link', async ({ page, context }) => {
    // 1. Sign in
    const user = await createTestUser();
    await signIn(page, user.email, user.password);

    // 2. Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('My Artifacts');

    // 3. Click "New Artifact" button
    await page.click('button:has-text("New Artifact")');

    // 4. Upload HTML file via drag-and-drop
    const htmlContent = `
      <!DOCTYPE html>
      <html><body><h1>Test Artifact</h1></body></html>
    `;

    // Create file for upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-artifact.html',
      mimeType: 'text/html',
      buffer: Buffer.from(htmlContent),
    });

    // 5. Verify file loaded
    await expect(page.locator('text=test-artifact.html')).toBeVisible();

    // 6. Fill metadata form
    await page.fill('input[name="title"]', 'My Test Artifact');
    await page.fill('textarea[name="description"]', 'This is a test description');

    // 7. Submit
    await page.click('button:has-text("Create Artifact")');

    // 8. Verify success
    await expect(page.locator('text=Artifact created successfully')).toBeVisible();

    // 9. Verify appears in list
    await expect(page.locator('.artifact-card:has-text("My Test Artifact")')).toBeVisible();

    // 10. Copy share link
    const shareToken = await page.getAttribute('[data-share-token]', 'data-share-token');
    const shareUrl = `${page.url().split('/dashboard')[0]}/a/${shareToken}`;

    await page.click('button:has-text("Copy Link")');
    await expect(page.locator('text=Link copied')).toBeVisible();

    // 11. Open share link in incognito (no auth)
    const incognitoContext = await context.browser().newContext();
    const incognitoPage = await incognitoContext.newPage();
    await incognitoPage.goto(shareUrl);

    // 12. Verify HTML renders
    const iframe = incognitoPage.frameLocator('iframe');
    await expect(iframe.locator('h1')).toContainText('Test Artifact');

    // Cleanup
    await incognitoContext.close();
  });
});
```

### File Size Validation Test

```typescript
test('rejects files larger than 5MB', async ({ page }) => {
  await signIn(page, testUser.email, testUser.password);
  await page.goto('/dashboard');
  await page.click('button:has-text("New Artifact")');

  // Create 6MB HTML file
  const largeHtml = '<html><body>' + 'x'.repeat(6 * 1024 * 1024) + '</body></html>';

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'large-file.html',
    mimeType: 'text/html',
    buffer: Buffer.from(largeHtml),
  });

  // Verify error message
  await expect(page.locator('text=/File size exceeds.*limit/i')).toBeVisible();

  // Verify submit button disabled
  await expect(page.locator('button:has-text("Create Artifact")')).toBeDisabled();
});
```

### Delete Artifact Test

```typescript
test('can delete artifact from list', async ({ page }) => {
  // Setup: Create an artifact
  await signIn(page, testUser.email, testUser.password);
  const { artifactId, shareToken } = await createTestArtifact(page);

  // Navigate to dashboard
  await page.goto('/dashboard');

  // Verify artifact exists
  await expect(page.locator('[data-artifact-id="${artifactId}"]')).toBeVisible();

  // Click delete button
  await page.click(`[data-artifact-id="${artifactId}"] button:has-text("Delete")`);

  // Confirm deletion dialog
  page.on('dialog', dialog => dialog.accept());

  // Verify artifact removed from list
  await expect(page.locator('[data-artifact-id="${artifactId}"]')).not.toBeVisible();

  // Verify share link returns 404
  await page.goto(`/a/${shareToken}`);
  await expect(page.locator('text=/Artifact not found/i')).toBeVisible();
});
```

## Test Helpers

Create reusable helpers in `tests/helpers/`:

### `artifacts.ts`
```typescript
export async function createTestArtifact(
  page: Page,
  options?: { title?: string; htmlContent?: string }
) {
  const title = options?.title || 'Test Artifact';
  const htmlContent = options?.htmlContent || '<html><body>Test</body></html>';

  await page.goto('/dashboard');
  await page.click('button:has-text("New Artifact")');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test.html',
    mimeType: 'text/html',
    buffer: Buffer.from(htmlContent),
  });

  await page.fill('input[name="title"]', title);
  await page.click('button:has-text("Create Artifact")');

  // Extract artifact ID and share token from URL or DOM
  const shareToken = await page.getAttribute('[data-share-token]', 'data-share-token');
  const artifactId = await page.getAttribute('[data-artifact-id]', 'data-artifact-id');

  return { artifactId, shareToken };
}
```

## Validation Videos

After E2E tests pass, record validation videos:

### Videos to Create
1. **`01-happy-path.mp4`** - Complete upload flow (2-3 min)
   - Sign in → Create artifact → Upload → View in list → Copy link → View shared

2. **`02-file-validation.mp4`** - Error handling (1-2 min)
   - Try large file → Error shown
   - Try invalid type → Error shown

3. **`03-delete-artifact.mp4`** - Delete flow (1 min)
   - Delete from list → Confirm → Verify removed

**Save to:** `tasks/00010-artifact-upload-creation/tests/validation-videos/`

## Test Report

Create `test-report.md` documenting:

### Template
```markdown
# Test Report: Task 10 - Artifact Upload

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** Local dev / Staging

## Test Summary

- **Total Tests:** X
- **Passed:** X
- **Failed:** X
- **Skipped:** X

## Test Coverage

### Happy Path
- [x] Complete upload flow (create → upload → list → share)
- [x] Drag-and-drop file upload
- [x] File picker upload
- [x] Share link generation
- [x] Public access via share link

### Edge Cases
- [x] File size validation (> 5MB rejected)
- [x] File type validation (non-HTML rejected)
- [x] Empty file handling
- [x] Network error handling
- [x] Server error handling

### UI/UX
- [x] Empty state displays for new users
- [x] Loading states show during operations
- [x] Error messages clear and actionable
- [x] Success feedback shown
- [x] Responsive on mobile

### Security
- [x] HTML sanitization prevents XSS
- [x] Auth required for upload
- [x] Share links work without auth
- [x] Cannot access other users' artifacts via ID

## Known Issues

[List any bugs or limitations discovered]

## Browser Compatibility

- [x] Chrome
- [x] Safari
- [x] Firefox
- [ ] Edge (not tested)

## Validation Videos

- `01-happy-path.mp4` - Complete flow demonstration
- `02-file-validation.mp4` - Error handling
- `03-delete-artifact.mp4` - Deletion flow

## Conclusion

[Pass/Fail] - Ready for production / Needs fixes
```

## Acceptance Criteria

- [ ] All E2E tests pass
- [ ] File validation tests pass
- [ ] Error handling tests pass
- [ ] Delete flow test passes
- [ ] Empty state test passes
- [ ] Public share link works (no auth required)
- [ ] Validation videos recorded
- [ ] Test report completed
- [ ] No console errors in test runs
- [ ] Tests run in CI (future: GitHub Actions)

## Test Data

Use real Claude Code HTML output for realistic testing:
- Landing page from chef
- Complex component with styles
- Large HTML with embedded assets
- Minimal HTML (edge case)

**Store test fixtures:** `tasks/00010-artifact-upload-creation/tests/fixtures/`

---

**Completion:** This subtask marks Task 10 as complete. After E2E validation, create PR and close GitHub issue #10.
