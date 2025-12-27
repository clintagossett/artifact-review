import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { injectClickIndicator } from '../../../../app/tests/utils/clickIndicator';

// Inject click indicator after each navigation for validation videos
test.beforeEach(async ({ page }) => {
  page.on('load', async () => {
    try {
      await injectClickIndicator(page);
    } catch {
      // Page may have closed
    }
  });
});

test.describe('File Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Register a new user before each test
    await registerUser(page);
    await expect(page).toHaveURL('/dashboard');

    // Open new artifact dialog
    const newButton = page.locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")').first();
    await newButton.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('rejects files larger than 5MB for HTML', async ({ page }) => {
    // Create a large HTML file (> 5MB)
    const largeContent = '<html><body>' + 'x'.repeat(6 * 1024 * 1024) + '</body></html>';

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-file.html',
      mimeType: 'text/html',
      buffer: Buffer.from(largeContent),
    });

    // Should show error message
    await expect(page.locator('text=/File size/i').or(page.locator('text=/too large/i')).or(page.locator('text=/exceeds/i'))).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled or form should not submit
    const submitButton = page.locator('button:has-text("Create Project")');
    // Either disabled or clicking it shows an error
    if (await submitButton.isEnabled()) {
      await submitButton.click();
      // Should still show error
      await expect(page.locator('text=/File size/i').or(page.locator('text=/too large/i')).or(page.locator('text=/exceeds/i'))).toBeVisible();
    }
  });

  test('accepts valid file types: .html', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'valid.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<html><body>Valid HTML</body></html>'),
    });

    // File should be accepted - filename shown
    await expect(page.locator('text=valid.html')).toBeVisible();
  });

  test('accepts valid file types: .htm', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'valid.htm',
      mimeType: 'text/html',
      buffer: Buffer.from('<html><body>Valid HTM</body></html>'),
    });

    // File should be accepted
    await expect(page.locator('text=valid.htm')).toBeVisible();
  });

  test('accepts valid file types: .md', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'valid.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Markdown\n\nThis is markdown.'),
    });

    // File should be accepted
    await expect(page.locator('text=valid.md')).toBeVisible();
  });

  test('accepts valid file types: .zip', async ({ page }) => {
    // Create a minimal valid ZIP file (empty ZIP header)
    // This is a minimal valid ZIP file structure
    const zipBuffer = Buffer.from([
      0x50, 0x4b, 0x05, 0x06, // End of central directory signature
      0x00, 0x00, // Number of this disk
      0x00, 0x00, // Disk where central directory starts
      0x00, 0x00, // Number of central directory records on this disk
      0x00, 0x00, // Total number of central directory records
      0x00, 0x00, 0x00, 0x00, // Size of central directory
      0x00, 0x00, 0x00, 0x00, // Offset of start of central directory
      0x00, 0x00, // Comment length
    ]);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'valid.zip',
      mimeType: 'application/zip',
      buffer: zipBuffer,
    });

    // File should be accepted
    await expect(page.locator('text=valid.zip')).toBeVisible();
  });

  test('rejects invalid file types', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Try to upload a .txt file
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is plain text'),
    });

    // Should show error or file should not be accepted
    // The accept attribute on input should prevent this, but we check for error message too
    const errorVisible = await page.locator('text=/Invalid/i').or(page.locator('text=/not supported/i')).or(page.locator('text=/file type/i')).isVisible();
    const fileNameVisible = await page.locator('text=invalid.txt').isVisible();

    // Either error is shown OR file is not displayed (rejected by accept attribute)
    expect(errorVisible || !fileNameVisible).toBe(true);
  });

  test('can remove selected file and select a new one', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Upload first file
    await fileInput.setInputFiles({
      name: 'first-file.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<html><body>First</body></html>'),
    });

    await expect(page.locator('text=first-file.html')).toBeVisible();

    // Find and click remove button - use the aria-label which is more reliable
    const removeButton = page.locator('button[aria-label="Remove file"]');
    await expect(removeButton).toBeVisible({ timeout: 5000 });
    await removeButton.click();

    // Wait for file to be removed - the filename should no longer be visible
    await expect(page.locator('text=first-file.html')).toBeHidden({ timeout: 5000 });

    // Upload second file
    await fileInput.setInputFiles({
      name: 'second-file.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<html><body>Second</body></html>'),
    });

    await expect(page.locator('text=second-file.html')).toBeVisible();
  });

  test('requires title to submit', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<html><body>Test</body></html>'),
    });

    // Clear the auto-suggested title
    const titleInput = page.locator('#project-name');
    await titleInput.clear();

    // Submit button should be disabled
    const submitButton = page.locator('button:has-text("Create Project")');
    await expect(submitButton).toBeDisabled();
  });

  test('requires file to submit', async ({ page }) => {
    // Just fill in title without uploading file
    const titleInput = page.locator('#project-name');
    await titleInput.fill('Test Title');

    // Submit button should be disabled
    const submitButton = page.locator('button:has-text("Create Project")');
    await expect(submitButton).toBeDisabled();
  });
});
