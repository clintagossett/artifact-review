import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * E2E Test: File Upload for Phase 1
 *
 * Tests the unified blob storage upload flow for HTML and Markdown files.
 * Uses central /samples/ test data.
 *
 * IMPORTANT: This test validates that the frontend correctly calls the
 * backend action (not mutation) with the correct argument structure.
 */

test.describe('File Upload - Phase 1 Unified Storage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (assume user is authenticated via Convex auth)
    await page.goto('/');

    // Wait for app to be ready
    await page.waitForLoadState('networkidle');
  });

  test('should upload HTML file using unified storage', async ({ page }) => {
    // Open the "New Artifact" dialog
    const newArtifactButton = page.getByRole('button', { name: /new artifact/i });
    await newArtifactButton.click();

    // Wait for dialog to appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill in artifact details
    await page.getByLabel(/title/i).fill('Test HTML Artifact');
    await page.getByLabel(/description/i).fill('Testing unified blob storage for HTML');

    // Upload HTML file from central samples
    const htmlFilePath = path.join(
      __dirname,
      '../../../../../samples/01-valid/html/simple-html/v1/index.html'
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(htmlFilePath);

    // Wait for file to be selected (filename should appear in UI)
    await expect(page.getByText(/index\.html/i)).toBeVisible();

    // Submit the form
    const submitButton = page.getByRole('button', { name: /upload|create/i });
    await submitButton.click();

    // Wait for success
    // The app should redirect or show success message
    await page.waitForTimeout(2000); // Allow time for action to complete

    // Verify we're not seeing an error about mutation vs action
    const errorText = page.getByText(/trying to execute.*as Mutation.*but it is defined as Action/i);
    await expect(errorText).not.toBeVisible();

    // Verify success - either redirect to artifact page or success toast
    const successIndicator = page.getByText(/success|created|uploaded/i).first();
    await expect(successIndicator).toBeVisible({ timeout: 5000 });

    // Verify the artifact appears in the list
    await page.goto('/');
    await expect(page.getByText('Test HTML Artifact')).toBeVisible();
  });

  test('should upload Markdown file using unified storage', async ({ page }) => {
    // Open the "New Artifact" dialog
    const newArtifactButton = page.getByRole('button', { name: /new artifact/i });
    await newArtifactButton.click();

    // Wait for dialog to appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill in artifact details
    await page.getByLabel(/title/i).fill('Test Markdown Artifact');
    await page.getByLabel(/description/i).fill('Testing unified blob storage for Markdown');

    // Upload Markdown file from central samples
    const markdownFilePath = path.join(
      __dirname,
      '../../../../../samples/01-valid/markdown/product-spec/v1.md'
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(markdownFilePath);

    // Wait for file to be selected
    await expect(page.getByText(/v1\.md/i)).toBeVisible();

    // Submit the form
    const submitButton = page.getByRole('button', { name: /upload|create/i });
    await submitButton.click();

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify no mutation/action error
    const errorText = page.getByText(/trying to execute.*as Mutation.*but it is defined as Action/i);
    await expect(errorText).not.toBeVisible();

    // Verify success
    const successIndicator = page.getByText(/success|created|uploaded/i).first();
    await expect(successIndicator).toBeVisible({ timeout: 5000 });

    // Verify the artifact appears in the list
    await page.goto('/');
    await expect(page.getByText('Test Markdown Artifact')).toBeVisible();
  });

  test('should show validation error for unsupported file type', async ({ page }) => {
    // Open the "New Artifact" dialog
    const newArtifactButton = page.getByRole('button', { name: /new artifact/i });
    await newArtifactButton.click();

    // Wait for dialog to appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill in artifact details
    await page.getByLabel(/title/i).fill('Test Invalid File');

    // Try to upload a text file (unsupported)
    const textFilePath = path.join(
      __dirname,
      '../../../../../samples/04-invalid/wrong-type/document.txt'
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(textFilePath);

    // Submit the form
    const submitButton = page.getByRole('button', { name: /upload|create/i });
    await submitButton.click();

    // Should show error about unsupported file type
    await expect(page.getByText(/unsupported file type/i)).toBeVisible({ timeout: 3000 });
  });

  test('should verify correct API call structure', async ({ page }) => {
    // This test intercepts the network call to verify the frontend
    // is calling the correct API endpoint with correct arguments

    let apiCallMade = false;
    let apiCallDetails: any = null;

    // Intercept Convex API calls
    await page.route('**/api/**', async (route, request) => {
      const postData = request.postDataJSON();

      // Check if this is the artifacts.create call
      if (postData?.path === 'artifacts:create' || postData?.functionName === 'artifacts:create') {
        apiCallMade = true;
        apiCallDetails = postData;
      }

      // Continue with the request
      await route.continue();
    });

    // Open the "New Artifact" dialog
    const newArtifactButton = page.getByRole('button', { name: /new artifact/i });
    await newArtifactButton.click();

    // Fill in artifact details
    await page.getByLabel(/title/i).fill('API Test Artifact');

    // Upload HTML file
    const htmlFilePath = path.join(
      __dirname,
      '../../../../../samples/01-valid/html/simple-html/v1/index.html'
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(htmlFilePath);

    // Submit
    const submitButton = page.getByRole('button', { name: /upload|create/i });
    await submitButton.click();

    // Wait for API call
    await page.waitForTimeout(2000);

    // Verify the API call was made
    expect(apiCallMade).toBe(true);

    // Verify the call structure includes unified fields
    if (apiCallDetails?.args) {
      expect(apiCallDetails.args).toHaveProperty('content');
      expect(apiCallDetails.args).toHaveProperty('fileType');
      expect(apiCallDetails.args).not.toHaveProperty('htmlContent');
      expect(apiCallDetails.args).not.toHaveProperty('markdownContent');
    }
  });
});
