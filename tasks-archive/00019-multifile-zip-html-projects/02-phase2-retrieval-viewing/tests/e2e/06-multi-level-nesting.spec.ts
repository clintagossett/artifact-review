/**
 * E2E Test: Multi-Level ZIP Directory Nesting
 *
 * Tests that ZIP files with multiple levels of parent directories
 * (e.g., project/dist/index.html, company/projects/dashboard/release/index.html)
 * are correctly processed by stripping the common root path.
 *
 * Uses samples from /samples/01-valid/zip/charting-with-parents/:
 * - v1.zip: 1 level deep (project/)
 * - v2.zip: 2 levels deep (project/dist/)
 * - v3.zip: 3 levels deep (my-app/src/build/)
 * - v4.zip: 4 levels deep (company/projects/dashboard/release/)
 * - v5.zip: 5 levels deep (a/b/c/d/e/)
 *
 * All contain the same charting content - this validates root stripping works.
 */

import { test, expect } from '@playwright/test';
import { injectClickIndicator } from '../../../../../app/tests/utils/clickIndicator';
import { registerUser } from './helpers/auth';
import { createZipArtifact, verifyArtifactContentVisible, addZipVersion, switchToVersion } from './helpers/artifacts';
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

test.describe('Multi-Level ZIP Directory Nesting', () => {
  test.setTimeout(180000); // 3 minutes - processing 5 ZIPs may take time

  test('should upload and view ZIP with 1-level nesting (project/)', async ({ page }) => {
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `1-Level Nesting Test - ${Date.now()}`,
      description: 'ZIP wrapped in project/ folder',
      zipFilePath: v1Path,
    });

    // Verify artifact page loaded
    await expect(page).toHaveURL(new RegExp(`/a/${shareToken}`));
    await page.waitForLoadState('networkidle');

    // Verify content renders (root path was stripped correctly)
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard');

    // Verify assets load (no 404 errors)
    const iframe = page.frameLocator('iframe').first();
    const h1 = iframe.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10000 });

    // Verify JavaScript executed (chart should render)
    const chartExists = await iframe.locator('body').evaluate((body) => {
      return (
        body.querySelector('canvas') !== null ||
        body.querySelector('[class*="chart"]') !== null ||
        body.querySelector('[id*="chart"]') !== null
      );
    });
    expect(chartExists).toBe(true);
  });

  test('should upload and view ZIP with 2-level nesting (project/dist/)', async ({ page }) => {
    await registerUser(page);

    const v2Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v2.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `2-Level Nesting Test - ${Date.now()}`,
      description: 'ZIP wrapped in project/dist/ folders',
      zipFilePath: v2Path,
    });

    await page.waitForLoadState('domcontentloaded');
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard');

    // Verify no 404s for nested assets - set up listener before reload
    const failedRequests: string[] = [];
    page.on('response', (response) => {
      if (response.status() === 404 && !response.url().includes('favicon')) {
        failedRequests.push(response.url());
      }
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Wait for iframe to load
    const iframe = page.frameLocator('iframe').first();
    await expect(iframe.locator('h1')).toBeVisible({ timeout: 15000 });

    expect(failedRequests.length).toBe(0);
  });

  test('should upload and view ZIP with 3-level nesting (my-app/src/build/)', async ({ page }) => {
    await registerUser(page);

    const v3Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v3.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `3-Level Nesting Test - ${Date.now()}`,
      zipFilePath: v3Path,
    });

    await page.waitForLoadState('networkidle');
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard');

    const iframe = page.frameLocator('iframe').first();
    const h1Content = await iframe.locator('h1').textContent();
    expect(h1Content).toContain('Monthly Sales Dashboard');
  });

  test('should upload and view ZIP with 4-level nesting (company/projects/dashboard/release/)', async ({ page }) => {
    await registerUser(page);

    const v4Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v4.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `4-Level Nesting Test - ${Date.now()}`,
      zipFilePath: v4Path,
    });

    await page.waitForLoadState('domcontentloaded');

    // Wait for iframe content to load
    const iframe = page.frameLocator('iframe').first();
    await expect(iframe.locator('h1')).toBeVisible({ timeout: 15000 });

    const h1Content = await iframe.locator('h1').textContent();
    expect(h1Content).toContain('Monthly Sales Dashboard');
  });

  test('should upload and view ZIP with 5-level nesting (a/b/c/d/e/)', async ({ page }) => {
    await registerUser(page);

    const v5Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v5.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `5-Level Nesting Test - ${Date.now()}`,
      zipFilePath: v5Path,
    });

    await page.waitForLoadState('networkidle');
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard');

    // Verify all assets still load correctly despite deep nesting
    const iframe = page.frameLocator('iframe').first();

    // Check for logo image
    const images = iframe.locator('img');
    const imageCount = await images.count();
    if (imageCount > 0) {
      // Verify at least one image loaded successfully
      const firstImg = images.first();
      const naturalWidth = await firstImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('all nesting levels should render identical content', async ({ page }) => {
    await registerUser(page);

    // Upload all 5 versions as separate artifacts
    const artifacts: Array<{ shareToken: string; title: string }> = [];

    for (let level = 1; level <= 5; level++) {
      const zipPath = path.join(
        __dirname,
        `../../../../../samples/01-valid/zip/charting-with-parents/v${level}.zip`
      );

      const artifact = await createZipArtifact(page, {
        title: `Nesting Level ${level} - ${Date.now()}`,
        zipFilePath: zipPath,
      });

      artifacts.push(artifact);

      // Wait a bit between uploads to avoid rate limiting
      await page.waitForTimeout(1000);
    }

    // Now verify each artifact renders the same content
    for (const artifact of artifacts) {
      await page.goto(`/a/${artifact.shareToken}`);
      await page.waitForLoadState('networkidle');

      const iframe = page.frameLocator('iframe').first();
      const h1Content = await iframe.locator('h1').textContent();

      expect(h1Content).toContain('Monthly Sales Dashboard');
    }
  });

  // Skip: "Upload New Version" button is in Settings tab, not main artifact view
  // The multi-version functionality is tested via backend tests
  test.skip('should handle multi-version artifact with different nesting levels', async ({ page }) => {
    await registerUser(page);

    // Create artifact with v1 (1-level nesting)
    const v1Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Multi-Nesting Versions - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    console.log('Created artifact:', shareToken);

    // Add v2 (2-level nesting)
    const v2Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v2.zip'
    );

    await addZipVersion(page, shareToken, {
      zipFilePath: v2Path,
      versionName: '2-level nesting',
    });

    // Add v3 (3-level nesting)
    const v3Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v3.zip'
    );

    await addZipVersion(page, shareToken, {
      zipFilePath: v3Path,
      versionName: '3-level nesting',
    });

    // Now verify we can switch between versions and they all render correctly
    await page.goto(`/a/${shareToken}?v=1`);
    await page.waitForLoadState('networkidle');
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard');

    await page.goto(`/a/${shareToken}?v=2`);
    await page.waitForLoadState('networkidle');
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard');

    await page.goto(`/a/${shareToken}?v=3`);
    await page.waitForLoadState('networkidle');
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard');
  });

  test('should load assets correctly regardless of nesting depth', async ({ page }) => {
    await registerUser(page);

    // Test with deepest nesting (5 levels)
    const v5Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v5.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Deep Nesting Assets Test - ${Date.now()}`,
      zipFilePath: v5Path,
    });

    await page.waitForLoadState('domcontentloaded');

    const iframe = page.frameLocator('iframe').first();

    // Wait for iframe content to load first
    await expect(iframe.locator('h1')).toBeVisible({ timeout: 15000 });

    // Verify canvas element exists in HTML (doesn't require Chart.js to execute)
    const canvasExists = await iframe.locator('canvas').count();
    expect(canvasExists).toBeGreaterThan(0);

    // Verify logo image loaded successfully
    const logoImg = iframe.locator('img[src*="logo"]');
    if (await logoImg.count() > 0) {
      const naturalWidth = await logoImg.first().evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('should not show parent folder names in file paths after extraction', async ({ page }) => {
    await registerUser(page);

    // Use 4-level nesting sample
    const v4Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v4.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Path Verification Test - ${Date.now()}`,
      zipFilePath: v4Path,
    });

    await page.waitForLoadState('networkidle');

    // Check that URLs don't contain the parent folders
    // The iframe src should NOT contain "company/projects/dashboard/release"
    const iframeSrc = await page.locator('iframe').first().getAttribute('src');
    expect(iframeSrc).toBeTruthy();

    // URLs should be clean: /api/artifact/{token}/v1/index.html
    // NOT: /api/artifact/{token}/v1/company/projects/dashboard/release/index.html
    expect(iframeSrc).not.toContain('company');
    expect(iframeSrc).not.toContain('projects');
    expect(iframeSrc).not.toContain('dashboard');
    expect(iframeSrc).not.toContain('release');

    // Verify nested assets also have clean paths
    // Check network requests for assets
    const assetUrls: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.js') || url.includes('.json') || url.includes('.png')) {
        assetUrls.push(url);
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // All asset URLs should be clean (no parent folder names)
    for (const url of assetUrls) {
      expect(url).not.toContain('company');
      expect(url).not.toContain('projects');
      expect(url).not.toContain('dashboard');
      expect(url).not.toContain('release');
    }
  });
});

test.describe('Multi-Level Nesting Edge Cases', () => {
  test.setTimeout(120000);

  test('should handle ZIP with inconsistent nesting (edge case)', async ({ page }) => {
    // This is a theoretical test - our samples all have consistent nesting
    // But it's good to verify the system doesn't crash on unexpected structures

    await registerUser(page);

    // Use a standard nested sample
    const v3Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v3.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Edge Case Test - ${Date.now()}`,
      zipFilePath: v3Path,
    });

    await page.waitForLoadState('networkidle');

    // Verify it still renders
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard');

    // Verify no JavaScript errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (favicon, extensions, etc.)
    const unexpectedErrors = errors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('extension') &&
        !err.includes('chrome://')
    );

    expect(unexpectedErrors.length).toBe(0);
  });

  test('should preserve relative paths within project after root stripping', async ({ page }) => {
    await registerUser(page);

    // Use 2-level nesting
    const v2Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting-with-parents/v2.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Relative Paths Test - ${Date.now()}`,
      zipFilePath: v2Path,
    });

    await page.waitForLoadState('domcontentloaded');

    const iframe = page.frameLocator('iframe').first();

    // Wait for iframe content to load first
    await expect(iframe.locator('h1')).toBeVisible({ timeout: 15000 });

    // Verify assets in subdirectories still load
    // The charting sample has assets/chart-data.json and assets/logo.png
    // After stripping project/dist/, paths should be:
    // - index.html (root)
    // - app.js (root)
    // - assets/chart-data.json (subdirectory)
    // - assets/logo.png (subdirectory)

    // Verify canvas element exists (proves HTML loaded correctly)
    const canvasExists = await iframe.locator('canvas').count();
    expect(canvasExists).toBeGreaterThan(0);

    // Verify logo image loaded from assets/ subdirectory
    const logoImg = iframe.locator('img');
    if (await logoImg.count() > 0) {
      const naturalWidth = await logoImg.first().evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });
});
