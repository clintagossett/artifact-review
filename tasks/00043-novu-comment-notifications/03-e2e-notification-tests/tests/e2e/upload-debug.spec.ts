/**
 * Debug test for artifact upload
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const SAMPLES_DIR = path.resolve(__dirname, '../../../../../samples');
const SAMPLE_ZIP = path.join(SAMPLES_DIR, '01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');

test.describe('Upload Debug', () => {
  test('Debug: Test artifact upload step by step', async ({ page }) => {
    test.setTimeout(120000);

    // Capture ALL console messages
    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}] ${msg.text()}`);
    });

    // Capture network requests
    page.on('requestfailed', request => {
      console.log(`[Request Failed] ${request.url()} - ${request.failure()?.errorText}`);
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`[HTTP ${response.status()}] ${response.url()}`);
      }
    });

    // Generate unique user
    const timestamp = Date.now();
    const user = {
      name: `uploadtest-${timestamp}`,
      email: `uploadtest+${timestamp}@test.local`,
      password: `Test${timestamp}!Secure`,
    };

    console.log(`[Test] Starting with user: ${user.email}`);

    // 1. Sign up
    console.log('[Test] Step 1: Navigating to register page');
    await page.goto('/register');
    await page.waitForTimeout(2000);

    console.log('[Test] Step 2: Filling registration form');
    await page.fill('input[id="name"]', user.name);
    await page.fill('input[id="email"]', user.email);
    await page.fill('input[id="password"]', user.password);
    await page.fill('input[id="confirmPassword"]', user.password);

    console.log('[Test] Step 3: Clicking Create Account');
    await page.click('button:has-text("Create Account")');

    // Wait for dashboard
    console.log('[Test] Step 4: Waiting for dashboard redirect');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    console.log(`[Test] Arrived at: ${page.url()}`);

    // Wait for dashboard to fully load
    await page.waitForTimeout(2000);

    // 2. Click Upload button
    console.log('[Test] Step 5: Looking for Upload button');
    const uploadButton = page.getByRole('button', { name: /Upload/i });
    await expect(uploadButton).toBeVisible({ timeout: 10000 });
    console.log('[Test] Step 6: Clicking Upload button');
    await uploadButton.click();

    // Wait for dialog to appear
    console.log('[Test] Step 7: Waiting for dialog to open');
    await page.waitForTimeout(1000);
    const dialogTitle = page.getByText('Create New Artifact');
    await expect(dialogTitle).toBeVisible({ timeout: 10000 });
    console.log('[Test] Dialog opened successfully');

    // 3. Upload file
    console.log('[Test] Step 8: Setting input file');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_ZIP);
    console.log(`[Test] File set: ${SAMPLE_ZIP}`);

    // Wait for file to appear in dropzone
    await page.waitForTimeout(1000);
    const fileDisplay = page.getByText('mixed-media-sample.zip');
    await expect(fileDisplay).toBeVisible({ timeout: 10000 });
    console.log('[Test] File displayed in dropzone');

    // 4. Fill artifact name
    console.log('[Test] Step 9: Filling artifact name');
    const nameInput = page.getByLabel('Artifact Name');
    await nameInput.clear();
    await nameInput.fill(`Upload Test ${timestamp}`);
    console.log('[Test] Name filled');

    // 5. Click Create Artifact
    console.log('[Test] Step 10: Looking for Create Artifact button');
    const createButton = page.getByRole('button', { name: 'Create Artifact' });
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await expect(createButton).toBeEnabled({ timeout: 5000 });
    console.log('[Test] Create Artifact button is visible and enabled');

    console.log('[Test] Step 11: Clicking Create Artifact button');
    await createButton.click();

    // Watch for navigation or errors
    console.log('[Test] Step 12: Waiting for navigation to artifact page');

    // Wait up to 60 seconds for the page to navigate
    const startTime = Date.now();
    const maxWait = 60000;

    while (Date.now() - startTime < maxWait) {
      const currentUrl = page.url();
      console.log(`[Test] Polling URL: ${currentUrl}`);

      if (currentUrl.includes('/a/')) {
        console.log('[Test] SUCCESS! Navigated to artifact page');
        break;
      }

      // Check if dialog is still open (would indicate failure)
      const dialogStillOpen = await dialogTitle.isVisible().catch(() => false);
      if (dialogStillOpen) {
        // Check for error messages in dialog
        const errorText = await page.locator('[role="alert"], .error, .text-red-500').textContent().catch(() => null);
        if (errorText) {
          console.log(`[Test] Error in dialog: ${errorText}`);
        }
      }

      await page.waitForTimeout(2000);
    }

    const finalUrl = page.url();
    console.log(`[Test] Final URL: ${finalUrl}`);

    // Take screenshot
    await page.screenshot({ path: 'upload-debug-final.png' });
    console.log('[Test] Screenshot saved to upload-debug-final.png');

    // Assert we navigated to artifact page
    expect(finalUrl).toMatch(/\/a\//);
  });
});
