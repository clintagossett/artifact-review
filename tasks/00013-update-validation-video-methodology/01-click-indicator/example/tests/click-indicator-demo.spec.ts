/**
 * Example E2E test demonstrating click indicator usage
 *
 * This test shows both manual injection and auto-injection patterns.
 * Run with: npx playwright test --headed
 * Videos saved to: test-results/
 */

import { test, expect } from '@playwright/test';
import { injectClickIndicator, setupAutoInject } from '../../../../app/tests/utils/clickIndicator';

test.describe('Click Indicator Demo', () => {

  test('manual injection - basic usage', async ({ page }) => {
    // Navigate to test page
    await page.goto('/');

    // Inject click indicator
    await injectClickIndicator(page);

    // Perform test actions - clicks will be visible
    await page.click('h1');
    await page.waitForTimeout(1000);

    await page.click('a');
    await page.waitForTimeout(1000);

    await page.click('p');
    await page.waitForTimeout(500);
  });

  test('auto-injection - for multi-page flows', async ({ browser }) => {
    // Create context with video recording
    const context = await browser.newContext({
      recordVideo: {
        dir: 'test-results/videos/',
        size: { width: 1280, height: 720 }
      }
    });

    // Setup auto-injection for all pages
    setupAutoInject(context);

    const page = await context.newPage();
    await page.goto('/');

    // Manual injection as backup for initial page
    await injectClickIndicator(page);

    // Test actions
    await page.click('h1');
    await page.waitForTimeout(1000);

    // Click link that opens new page/popup
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('a[target="_blank"]')
    ]);

    // New page automatically has click indicator
    await newPage.waitForLoadState();
    await newPage.click('h1');
    await newPage.waitForTimeout(1000);

    // Cleanup
    await newPage.close();
    await context.close();
  });

  test('realistic user flow with indicators', async ({ page }) => {
    await page.goto('/');
    await injectClickIndicator(page);

    // Simulate realistic user interactions
    await page.hover('nav');
    await page.waitForTimeout(500);

    await page.click('a[href*="more"]');
    await page.waitForTimeout(1500);

    await page.fill('input[type="text"]', 'test query');
    await page.waitForTimeout(500);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Verify something happened
    await expect(page).toHaveURL(/.*example.com.*/);
  });
});
