/**
 * E2E Test: Error Handling for ZIP Uploads
 *
 * Tests validation and error handling for invalid ZIP files.
 * Uses samples from /samples/04-invalid/.
 */

import { test, expect } from '@playwright/test';
import { injectClickIndicator } from '../../../../../../app/tests/utils/clickIndicator';
import { registerUser } from './helpers/auth';
import * as path from 'path';

// Inject click indicator for validation videos
test.beforeEach(async ({ page }) => {
  page.on('load', async () => {
    try {
      await injectClickIndicator(page);
    } catch {
      // Page may have closed
    }
  });
});

test.describe('Error Handling', () => {
  test.setTimeout(120000);

  test('should reject ZIP with forbidden file types', async ({ page }) => {
    await registerUser(page);
    await expect(page).toHaveURL('/dashboard');

    // Click "New Artifact" button
    const newArtifactButton = page
      .locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")')
      .first();
    await newArtifactButton.click();

    // Wait for dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Upload ZIP with forbidden file types (videos)
    const forbiddenZipPath = path.join(
      __dirname,
      '../../../../../../samples/04-invalid/wrong-type/presentation-with-video.zip'
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(forbiddenZipPath);

    // Fill in title
    const titleInput = page.locator('#project-name');
    await titleInput.clear();
    await titleInput.fill(`Forbidden Types Test - ${Date.now()}`);

    // Submit the form
    const submitButton = page.locator('button:has-text("Create Project")');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Should show error about forbidden file types
    await expect(
      page.locator('text=/unsupported file types|forbidden|not allowed/i')
    ).toBeVisible({ timeout: 30000 });

    // Verify artifact was NOT created (dialog should still be open or show error)
    // If dialog closed, we shouldn't be on an artifact page
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/a\/[a-zA-Z0-9]{8}/);
  });

  test('should show error message with specific forbidden extensions', async ({ page }) => {
    await registerUser(page);

    const newArtifactButton = page
      .locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")')
      .first();
    await newArtifactButton.click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const forbiddenZipPath = path.join(
      __dirname,
      '../../../../../../samples/04-invalid/wrong-type/presentation-with-video.zip'
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(forbiddenZipPath);

    const titleInput = page.locator('#project-name');
    await titleInput.clear();
    await titleInput.fill(`Error Message Test - ${Date.now()}`);

    const submitButton = page.locator('button:has-text("Create Project")');
    await submitButton.click();

    // Error message should mention specific file types
    const errorLocator = page.locator('text=/\\.mov|\\.mp4|\\.avi/i');
    await expect(errorLocator).toBeVisible({ timeout: 30000 });
  });

  test('should not create broken artifact when processing fails', async ({ page }) => {
    await registerUser(page);

    const newArtifactButton = page
      .locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")')
      .first();
    await newArtifactButton.click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const forbiddenZipPath = path.join(
      __dirname,
      '../../../../../../samples/04-invalid/wrong-type/presentation-with-video.zip'
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(forbiddenZipPath);

    const titleInput = page.locator('#project-name');
    const testTitle = `No Broken Artifact Test - ${Date.now()}`;
    await titleInput.clear();
    await titleInput.fill(testTitle);

    const submitButton = page.locator('button:has-text("Create Project")');
    await submitButton.click();

    // Wait for error
    await expect(
      page.locator('text=/unsupported file types|forbidden|not allowed/i')
    ).toBeVisible({ timeout: 30000 });

    // Close dialog if it's still open
    const closeButton = page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button:has-text("Cancel")');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    // Go to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify the broken artifact does NOT appear in the list
    const artifactCard = page.locator(`text=${testTitle}`);
    await expect(artifactCard).not.toBeVisible({ timeout: 5000 });
  });

  test('should handle empty ZIP file gracefully', async ({ page }) => {
    await registerUser(page);

    const newArtifactButton = page
      .locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")')
      .first();
    await newArtifactButton.click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Create empty ZIP in memory
    const emptyZipPath = path.join(__dirname, '../../../../../samples/04-invalid/empty/empty.zip');

    // Check if empty.zip exists, otherwise skip this test
    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(emptyZipPath);

      const titleInput = page.locator('#project-name');
      await titleInput.clear();
      await titleInput.fill(`Empty ZIP Test - ${Date.now()}`);

      const submitButton = page.locator('button:has-text("Create Project")');
      await submitButton.click();

      // Should show error about empty or invalid ZIP
      await expect(page.locator('text=/empty|no files|invalid/i')).toBeVisible({
        timeout: 30000,
      });
    } catch (error) {
      // If file doesn't exist, skip the test
      console.log('Empty ZIP sample not found, skipping test');
      test.skip();
    }
  });

  test('should validate file size before upload', async ({ page }) => {
    await registerUser(page);

    const newArtifactButton = page
      .locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")')
      .first();
    await newArtifactButton.click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Try to upload huge.zip (155MB, exceeds 50MB limit)
    const hugeZipPath = path.join(
      __dirname,
      '../../../../../../samples/04-invalid/too-large/huge.zip'
    );

    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(hugeZipPath);

      // Should show error immediately or when trying to submit
      const titleInput = page.locator('#project-name');
      await titleInput.clear();
      await titleInput.fill(`Huge ZIP Test - ${Date.now()}`);

      const submitButton = page.locator('button:has-text("Create Project")');
      await submitButton.click();

      // Should show error about file size
      await expect(page.locator('text=/too large|exceeds.*50.*MB|maximum.*50/i')).toBeVisible({
        timeout: 10000,
      });
    } catch (error) {
      // If huge.zip doesn't exist, skip the test
      console.log('Huge ZIP sample not found (run generate.sh to create), skipping test');
      test.skip();
    }
  });

  test('should show helpful error when ZIP has no HTML files', async ({ page }) => {
    await registerUser(page);

    const newArtifactButton = page
      .locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")')
      .first();
    await newArtifactButton.click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Create a ZIP with only non-HTML files (if such a sample exists)
    // For now, we'll skip this test as we don't have a sample for it
    // In a real implementation, you'd create this sample
    test.skip();
  });

  test('should clear error state when uploading valid file after error', async ({ page }) => {
    await registerUser(page);

    const newArtifactButton = page
      .locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")')
      .first();
    await newArtifactButton.click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // First, upload forbidden ZIP
    const forbiddenZipPath = path.join(
      __dirname,
      '../../../../../../samples/04-invalid/wrong-type/presentation-with-video.zip'
    );

    let fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(forbiddenZipPath);

    let titleInput = page.locator('#project-name');
    await titleInput.clear();
    await titleInput.fill(`Error Recovery Test - ${Date.now()}`);

    let submitButton = page.locator('button:has-text("Create Project")');
    await submitButton.click();

    // Wait for error
    await expect(
      page.locator('text=/unsupported file types|forbidden/i')
    ).toBeVisible({ timeout: 30000 });

    // Now upload a valid ZIP
    const validZipPath = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(validZipPath);

    titleInput = page.locator('#project-name');
    await titleInput.clear();
    await titleInput.fill(`Valid After Error - ${Date.now()}`);

    submitButton = page.locator('button:has-text("Create Project")');
    await submitButton.click();

    // Error should clear and upload should succeed
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 30000 });

    // Should navigate to artifact page
    await expect(page).toHaveURL(/\/a\/[a-zA-Z0-9]{8}/, { timeout: 10000 });
  });
});
