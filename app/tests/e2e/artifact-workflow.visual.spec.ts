import { test, expect } from '@playwright/test';
import { getLatestEmail, extractMagicLink } from '../utils/resend';
import path from 'path';

/**
 * Visual Testing for Async UI States
 *
 * These tests are designed for HUMAN observation of async UI behavior.
 * They use NEXT_PUBLIC_TEST_ASYNC_DELAY_MS to slow down async processing
 * so you can see loading/processing states that normally flash by.
 *
 * DO NOT run in CI - these are for manual UX review only.
 *
 * Usage:
 *   NEXT_PUBLIC_TEST_ASYNC_DELAY_MS=3000 npm run test:e2e -- --grep "visual:"
 *
 * The env var adds a delay (in ms) before async operations complete,
 * giving you time to observe:
 * - Loading spinners
 * - Processing indicators
 * - Status transitions
 * - Error states
 */

// Skip these tests in CI - they're for manual observation only
test.skip(({ }, testInfo) => !!process.env.CI, 'Visual tests skipped in CI');

// Helper to generate unique users
const generateUser = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return {
    name: `Visual Test User ${timestamp}`,
    email: `test.user+${timestamp}-${random}@tolauante.resend.app`,
  };
};

test.describe('Visual: Async UI States', () => {
  test('visual: ZIP upload processing states', async ({ page }) => {
    // Longer timeout for visual observation
    test.setTimeout(120000);

    const user = generateUser();
    const testDelay = parseInt(process.env.NEXT_PUBLIC_TEST_ASYNC_DELAY_MS || "0", 10);

    if (testDelay === 0) {
      console.log('⚠️  No delay set. Run with NEXT_PUBLIC_TEST_ASYNC_DELAY_MS=3000 to observe UI states.');
    } else {
      console.log(`✓ Test delay set to ${testDelay}ms - you should see processing states`);
    }

    // 1. Login
    console.log('Logging in...');
    await page.goto('/login');
    await page.getByRole('button', { name: 'Magic Link' }).click();
    await page.getByLabel('Email address').fill(user.email);
    await page.getByRole('button', { name: 'Send Magic Link' }).click();
    await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 10000 });

    const emailData = await getLatestEmail(user.email);
    const magicLink = extractMagicLink(emailData.html);
    await page.goto(magicLink!);
    await expect(page).toHaveURL(/\/dashboard/);
    console.log('Logged in.');

    // 2. Open upload dialog
    console.log('Opening upload dialog...');
    const createBtn = page.getByRole('button', { name: /Artifact/ }).first();
    await createBtn.click();
    await expect(page.getByText('Create New Artifact')).toBeVisible();

    // 3. Upload ZIP
    const zipPath = path.resolve(process.cwd(), '../samples/01-valid/zip/charting/v1.zip');
    console.log(`Uploading: ${zipPath}`);

    await page.setInputFiles('input[type="file"]', zipPath);
    await page.getByLabel('Artifact Name').fill(`Visual Test ${Date.now()}`);

    const createButton = page.getByRole('button', { name: 'Create Artifact' });
    await expect(createButton).toBeEnabled({ timeout: 10000 });

    console.log('>>> WATCH NOW: Click "Create Artifact" - observe the processing states <<<');
    await createButton.click();

    // 4. Capture screenshots of each state
    // Poll for status indicator to appear and capture each state
    const captureState = async (status: string, timeout: number) => {
      const selector = `[data-version-status="${status}"]`;
      try {
        await page.waitForSelector(selector, { timeout });
        // Wait a moment for render to complete
        await page.waitForTimeout(200);
        await page.screenshot({ path: `test-results/visual-state-${status}.png`, fullPage: true });
        console.log(`Captured: ${status} state`);
        return true;
      } catch {
        console.log(`${status} state not found or too fast`);
        return false;
      }
    };

    // Try to capture uploading (may be brief)
    await captureState('uploading', 5000);

    // Try to capture processing (should be visible with 3s delay)
    await captureState('processing', 15000);

    // Wait for ready state
    console.log('Waiting for status to become ready...');
    await page.waitForSelector('[data-version-status="ready"]', { timeout: 60000 });
    await page.screenshot({ path: 'test-results/visual-state-ready.png', fullPage: true });
    console.log('Captured: ready state');

    // 5. Verify we're in the viewer
    await expect(page).toHaveURL(/\/a\//);
    console.log('Visual test complete.');
  });

  test('visual: ZIP error state display', async ({ page }) => {
    test.setTimeout(120000);

    const user = generateUser();
    const testDelay = parseInt(process.env.NEXT_PUBLIC_TEST_ASYNC_DELAY_MS || "0", 10);

    if (testDelay === 0) {
      console.log('⚠️  No delay set. Run with NEXT_PUBLIC_TEST_ASYNC_DELAY_MS=3000 to observe error UI.');
    }

    // 1. Login
    console.log('Logging in...');
    await page.goto('/login');
    await page.getByRole('button', { name: 'Magic Link' }).click();
    await page.getByLabel('Email address').fill(user.email);
    await page.getByRole('button', { name: 'Send Magic Link' }).click();
    await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 10000 });

    const emailData = await getLatestEmail(user.email);
    const magicLink = extractMagicLink(emailData.html);
    await page.goto(magicLink!);
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Upload invalid ZIP
    const createBtn = page.getByRole('button', { name: /Artifact/ }).first();
    await createBtn.click();
    await expect(page.getByText('Create New Artifact')).toBeVisible();

    const invalidZipPath = path.resolve(
      process.cwd(),
      '../samples/04-invalid/wrong-type/presentation-with-video.zip'
    );
    console.log(`Uploading invalid ZIP: ${invalidZipPath}`);

    await page.setInputFiles('input[type="file"]', invalidZipPath);
    await page.getByLabel('Artifact Name').fill(`Visual Error Test ${Date.now()}`);

    const createButton = page.getByRole('button', { name: 'Create Artifact' });
    await expect(createButton).toBeEnabled({ timeout: 10000 });

    console.log('>>> WATCH NOW: Click "Create Artifact" - observe the error state <<<');
    await createButton.click();

    // 3. Wait for error state
    console.log('Waiting for error state...');
    await page.waitForSelector('[data-version-status="error"]', { timeout: 60000 });
    console.log('Error state displayed.');

    // 4. Verify error message is visible
    await expect(page.getByText(/unsupported file types|forbidden/i)).toBeVisible();
    console.log('Visual error test complete.');
  });
});
