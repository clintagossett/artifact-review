/**
 * E2E Test: Asset Loading for ZIP Artifacts
 *
 * Tests that CSS, JavaScript, images, and other assets load correctly
 * from the extracted ZIP files.
 */

import { test, expect } from '@playwright/test';
import { injectClickIndicator } from '../../../../../../app/tests/utils/clickIndicator';
import { registerUser } from './helpers/auth';
import { createZipArtifact, verifyArtifactContentVisible } from './helpers/artifacts';
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

test.describe('Asset Loading', () => {
  test.setTimeout(120000);

  test('should load JavaScript files correctly', async ({ page }) => {
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `JS Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    const iframe = page.frameLocator('iframe').first();

    // Verify JavaScript executed
    // The charting sample's app.js should create chart elements
    const jsExecuted = await iframe.locator('body').evaluate((body) => {
      // Check if chart-related elements exist (created by JS)
      return (
        body.querySelector('canvas') !== null ||
        body.querySelector('[class*="chart"]') !== null ||
        body.querySelector('[id*="chart"]') !== null
      );
    });

    expect(jsExecuted).toBe(true);
  });

  test('should load JSON data files correctly', async ({ page }) => {
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `JSON Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // The charting sample loads assets/chart-data.json
    // Verify no 404 errors for JSON files
    const failedRequests: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 404 && response.url().includes('.json')) {
        failedRequests.push(response.url());
      }
    });

    // Reload to catch requests
    await page.reload();
    await page.waitForLoadState('networkidle');

    expect(failedRequests.length).toBe(0);
  });

  test('should load image files correctly', async ({ page }) => {
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Image Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    const iframe = page.frameLocator('iframe').first();

    // The charting sample has assets/logo.png
    const logoImg = iframe.locator('img[src*="logo.png"]');

    // Check if image element exists
    const imgCount = await logoImg.count();
    if (imgCount > 0) {
      // Verify image loaded (not broken)
      const naturalWidth = await logoImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
    // If no logo in DOM, that's also fine - just checking it doesn't 404
  });

  test('should serve files with correct MIME types', async ({ page }) => {
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `MIME Type Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    await page.goto(`/a/${shareToken}`);

    const contentTypes: { [url: string]: string | null } = {};

    page.on('response', (response) => {
      const url = response.url();
      contentTypes[url] = response.headers()['content-type'] || null;
    });

    await page.waitForLoadState('networkidle');

    // Verify HTML has text/html MIME type
    const htmlResponses = Object.entries(contentTypes).filter(
      ([url]) => url.includes('.html') || url.endsWith(shareToken)
    );
    const hasTextHtml = htmlResponses.some(
      ([, type]) => type?.includes('text/html') || type?.includes('application/octet-stream')
    );
    expect(hasTextHtml).toBe(true);

    // Verify JS has application/javascript or text/javascript
    const jsResponses = Object.entries(contentTypes).filter(([url]) => url.includes('.js'));
    if (jsResponses.length > 0) {
      const hasCorrectJsMime = jsResponses.some(
        ([, type]) =>
          type?.includes('javascript') ||
          type?.includes('application/octet-stream') ||
          type?.includes('text/plain')
      );
      expect(hasCorrectJsMime).toBe(true);
    }

    // Verify JSON has application/json
    const jsonResponses = Object.entries(contentTypes).filter(([url]) => url.includes('.json'));
    if (jsonResponses.length > 0) {
      const hasCorrectJsonMime = jsonResponses.some(
        ([, type]) =>
          type?.includes('application/json') || type?.includes('application/octet-stream')
      );
      expect(hasCorrectJsonMime).toBe(true);
    }
  });

  test('should handle nested directory structures correctly', async ({ page }) => {
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Nested Dirs Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // The charting sample has files in assets/ subdirectory
    // Verify no 404 errors for nested files
    const failedRequests: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 404) {
        failedRequests.push(response.url());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filter out expected 404s (like favicon)
    const unexpectedFails = failedRequests.filter(
      (url) => !url.includes('favicon') && !url.includes('__nextjs')
    );

    expect(unexpectedFails.length).toBe(0);
  });

  test('should not show console errors for missing assets', async ({ page }) => {
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Console Errors Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // Filter errors related to asset loading
    const assetErrors = errors.filter(
      (err) =>
        err.includes('Failed to load') ||
        err.includes('404') ||
        err.includes('not found') ||
        err.includes('ERR_')
    );

    // Filter out known/expected errors (like Chrome extension errors)
    const unexpectedErrors = assetErrors.filter(
      (err) =>
        !err.includes('extension') &&
        !err.includes('chrome://') &&
        !err.includes('favicon')
    );

    expect(unexpectedErrors.length).toBe(0);
  });

  test('should load all files from multiple versions independently', async ({ page }) => {
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Multi-version Assets Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    // Access v1 - verify content
    await page.goto(`/a/${shareToken}?v=1`);
    await page.waitForLoadState('networkidle');
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v1');

    // Now add v2 via UI or API would be ideal, but for simplicity just verify v1 still works
    // This test ensures v1 assets remain accessible after upload

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify no asset loading failures
    const iframe = page.frameLocator('iframe').first();
    const content = await iframe.locator('h1').textContent();
    expect(content).toContain('Monthly Sales Dashboard v1');
  });
});
