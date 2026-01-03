/**
 * E2E Test: Upload New ZIP Artifact
 *
 * Tests the complete flow of creating a new artifact by uploading a ZIP file.
 * Uses central /samples/ test data.
 */

import { test, expect } from '@playwright/test';
import { injectClickIndicator } from '../../../../../../app/tests/utils/clickIndicator';
import { registerUser } from './helpers/auth';
import { createZipArtifact, verifyArtifactContentVisible } from './helpers/artifacts';
import * as path from 'path';

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

test.describe('ZIP Upload - New Artifact', () => {
  test.setTimeout(120000); // ZIP uploads may take longer

  test('should upload ZIP and create artifact with entry point detection', async ({ page }) => {
    // 1. Register a new user
    const { email } = await registerUser(page);
    console.log('Registered user:', email);

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/dashboard');

    // 2. Upload ZIP file from central samples
    const zipPath = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const testTitle = `Dashboard v1 - ${Date.now()}`;
    const { shareToken, title } = await createZipArtifact(page, {
      title: testTitle,
      description: 'Testing ZIP upload with multi-file HTML project',
      zipFilePath: zipPath,
    });

    console.log('Created artifact with shareToken:', shareToken);
    expect(shareToken).toBeTruthy();
    expect(shareToken.length).toBe(8);

    // 3. Verify we're on the artifact page
    await expect(page).toHaveURL(new RegExp(`/a/${shareToken}`));

    // 4. Verify the artifact content is visible
    // The charting sample has "Monthly Sales Dashboard v1" as the H1
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v1');

    // 5. Verify assets load correctly
    // Check that the page doesn't show broken image or resource errors
    const iframe = page.frameLocator('iframe').first();

    // Verify the chart data loads (app.js should execute)
    // The chart creates elements with specific classes - check for chart presence
    const chartElements = iframe.locator('canvas, .chart, [id*="chart"]');
    const chartCount = await chartElements.count();
    expect(chartCount).toBeGreaterThan(0);
  });

  test('should auto-detect index.html as entry point', async ({ page }) => {
    await registerUser(page);
    await expect(page).toHaveURL('/dashboard');

    const zipPath = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Entry Point Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    // Navigate to the artifact
    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // Verify the entry point (index.html) loaded correctly
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard');

    // Check that accessing the root path serves index.html
    // The page should NOT show a 404 or file listing
    await expect(page.locator('text=/404|not found/i')).not.toBeVisible();
  });

  test('should verify all assets load correctly', async ({ page }) => {
    await registerUser(page);

    const zipPath = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Assets Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    const iframe = page.frameLocator('iframe').first();

    // Verify JavaScript executed (app.js should create chart elements)
    const scriptExecuted = await iframe.locator('body').evaluate((body) => {
      // Check if our app.js executed by looking for chart-related elements
      const hasChart = body.querySelector('canvas') !== null ||
                       body.querySelector('[class*="chart"]') !== null ||
                       body.querySelector('[id*="chart"]') !== null;
      return hasChart;
    });
    expect(scriptExecuted).toBe(true);

    // Verify no console errors related to missing resources
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Reload to catch any errors
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filter out unrelated errors and check for resource loading errors
    const resourceErrors = errors.filter(
      (err) => err.includes('Failed to load') || err.includes('404')
    );
    expect(resourceErrors.length).toBe(0);
  });

  test('should show artifact in dashboard list after creation', async ({ page }) => {
    const { email } = await registerUser(page);

    const zipPath = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const testTitle = `Dashboard List Test - ${Date.now()}`;
    await createZipArtifact(page, {
      title: testTitle,
      zipFilePath: zipPath,
    });

    // Navigate back to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify artifact appears in the list
    await expect(page.locator(`text=${testTitle}`)).toBeVisible({ timeout: 5000 });
  });
});
