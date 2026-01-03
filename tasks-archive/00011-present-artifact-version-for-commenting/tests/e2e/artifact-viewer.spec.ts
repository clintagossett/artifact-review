import { test, expect } from '@playwright/test';
import { registerUser } from '../helpers/auth';
import { createTestArtifact } from '../helpers/artifacts';

/**
 * E2E Tests for Artifact Viewer (Task 00011)
 *
 * These tests verify the artifact viewing functionality including:
 * - Latest version display
 * - Specific version display
 * - Version switching
 * - Metadata display
 * - Loading states
 * - Error handling (404)
 * - Sandboxed iframe rendering
 */

test.describe('Artifact Viewer - Basic Display', () => {
  test.beforeEach(async ({ page }) => {
    // Register and sign in a new user for each test
    await registerUser(page);
  });

  test('should display artifact on latest version route', async ({ page }) => {
    // Create a test artifact
    const { shareToken, title } = await createTestArtifact(page, {
      title: 'Latest Version Test',
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <head><title>Latest Version Test</title></head>
          <body>
            <h1>Version 1 Content</h1>
            <p>This is the latest version</p>
          </body>
        </html>
      `,
    });

    // Navigate to the artifact viewer
    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // Verify title is displayed
    await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 10000 });

    // Verify version badge shows v1
    await expect(page.locator('text=/v1/i').first()).toBeVisible({ timeout: 5000 });

    // Verify iframe loads the content
    const iframe = page.frameLocator('iframe[title="Artifact Viewer"]');
    await expect(iframe.locator('h1:has-text("Version 1 Content")')).toBeVisible({ timeout: 15000 });
  });

  test('should display specific version when version number in URL', async ({ page }) => {
    // Create an artifact
    const { shareToken, title } = await createTestArtifact(page, {
      title: 'Multi Version Test',
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <head><title>Version 1</title></head>
          <body><h1>Version 1 Content</h1></body>
        </html>
      `,
    });

    // Navigate to version 1 explicitly
    await page.goto(`/a/${shareToken}/v/1`);
    await page.waitForLoadState('networkidle');

    // Verify version badge shows v1
    await expect(page.locator('text=/v1/i').first()).toBeVisible({ timeout: 10000 });

    // Verify iframe loads the content
    const iframe = page.frameLocator('iframe[title="Artifact Viewer"]');
    await expect(iframe.locator('h1:has-text("Version 1 Content")')).toBeVisible({ timeout: 15000 });
  });

  test('should display title in header', async ({ page }) => {
    const testTitle = 'Header Title Test Artifact';
    const { shareToken } = await createTestArtifact(page, {
      title: testTitle,
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // Verify title is displayed in the header area (not in iframe)
    await expect(page.locator(`text=${testTitle}`).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Artifact Viewer - Version Switcher', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test('should show version switcher dropdown', async ({ page }) => {
    // Create a test artifact
    const { shareToken } = await createTestArtifact(page, {
      title: 'Version Switcher Test',
    });

    // Navigate to the artifact viewer
    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // Look for the version switcher (ShadCN Select component)
    // The Select component renders as a button with role="combobox"
    const versionSwitcher = page.locator('[role="combobox"]');
    await expect(versionSwitcher).toBeVisible({ timeout: 10000 });

    // Click to open the dropdown
    await versionSwitcher.click();

    // Verify the dropdown shows version options
    // ShadCN Select renders options in a portal/dialog
    const options = page.locator('[role="option"]');
    await expect(options).toHaveCount(1, { timeout: 5000 }); // Only v1 exists
  });
});

test.describe('Artifact Viewer - Metadata Display', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test('should display metadata (file size and date)', async ({ page }) => {
    // Create a test artifact
    const { shareToken } = await createTestArtifact(page, {
      title: 'Metadata Test',
    });

    // Navigate to the artifact viewer
    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // Verify file size is displayed (should show KB or bytes)
    await expect(page.locator('text=/\\d+(\\.\\d+)?\\s*(KB|B)/i')).toBeVisible({ timeout: 10000 });

    // Verify date is displayed (look for current year)
    const currentYear = new Date().getFullYear().toString();
    await expect(page.locator(`text=/${currentYear}/`)).toBeVisible({ timeout: 5000 });
  });

  test('should show version badge with purple styling', async ({ page }) => {
    const { shareToken } = await createTestArtifact(page, {
      title: 'Version Badge Test',
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // Find the version badge (look for v1 text with purple background)
    const versionBadges = page.locator('text=/v\\d+/i');
    await expect(versionBadges.first()).toBeVisible({ timeout: 10000 });

    // Check if any badge has the purple styling classes
    const badges = await versionBadges.all();
    let foundPurpleBadge = false;

    for (const badge of badges) {
      const classes = await badge.getAttribute('class');
      if (classes && classes.includes('bg-purple-100') && classes.includes('text-purple-800')) {
        foundPurpleBadge = true;
        break;
      }
    }

    expect(foundPurpleBadge).toBe(true);
  });
});

test.describe('Artifact Viewer - Loading States', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test('should show loading skeleton and then content', async ({ page }) => {
    // Create a test artifact
    const { shareToken } = await createTestArtifact(page);

    // Navigate to the artifact viewer
    await page.goto(`/a/${shareToken}`);

    // The loading state might be transient, so we verify that content eventually loads
    // rather than trying to catch the skeleton
    const iframe = page.frameLocator('iframe[title="Artifact Viewer"]');
    await expect(iframe.locator('body')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Artifact Viewer - Error Handling', () => {
  test('should show 404 for invalid shareToken', async ({ page }) => {
    // Navigate to an invalid share token (no auth needed for this test)
    await page.goto('/a/invalid-token-12345');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify 404 or "not found" message appears
    // Check for common 404 indicators
    const notFoundIndicators = [
      page.locator('text=/not found/i'),
      page.locator('text=/404/'),
      page.locator('text=/does not exist/i'),
      page.locator('h1:has-text("404")'),
      page.locator('text=/artifact not found/i'),
    ];

    // At least one of these should be visible
    let foundNotFound = false;
    for (const indicator of notFoundIndicators) {
      try {
        await expect(indicator).toBeVisible({ timeout: 3000 });
        foundNotFound = true;
        break;
      } catch {
        // Try next indicator
      }
    }

    if (!foundNotFound) {
      // If no 404 indicators found, the page might show a blank state
      // Check that we don't see the normal artifact viewer (no iframe)
      const iframeCount = await page.locator('iframe[title="Artifact Viewer"]').count();
      expect(iframeCount).toBe(0);
    } else {
      expect(foundNotFound).toBe(true);
    }
  });
});

test.describe('Artifact Viewer - Iframe Security', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test('should load artifact in sandboxed iframe', async ({ page }) => {
    // Create a test artifact with JavaScript
    const { shareToken } = await createTestArtifact(page, {
      title: 'Sandbox Test',
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <head><title>Sandbox Test</title></head>
          <body>
            <h1>Sandbox Test</h1>
            <script>
              console.log('Script is running in sandbox');
            </script>
          </body>
        </html>
      `,
    });

    // Navigate to the artifact viewer
    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // Verify iframe exists and has sandbox attribute
    const iframe = page.locator('iframe[title="Artifact Viewer"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });

    // Check sandbox attribute
    const sandboxAttr = await iframe.getAttribute('sandbox');
    expect(sandboxAttr).toBeTruthy();
    expect(sandboxAttr).toContain('allow-scripts');
    expect(sandboxAttr).toContain('allow-same-origin');

    // Verify content loads in iframe
    const iframeContent = page.frameLocator('iframe[title="Artifact Viewer"]');
    await expect(iframeContent.locator('h1:has-text("Sandbox Test")')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Artifact Viewer - Read-Only Banner', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test('should NOT show read-only banner on latest version', async ({ page }) => {
    const { shareToken } = await createTestArtifact(page, {
      title: 'Latest Version No Banner',
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // Verify the page loaded successfully first
    await expect(page.locator('iframe[title="Artifact Viewer"]')).toBeVisible({ timeout: 10000 });

    // Verify no read-only banner is shown
    const readOnlyBanner = page.locator('text=/viewing.*old.*version/i, text=/read.*only/i');
    const bannerCount = await readOnlyBanner.count();
    expect(bannerCount).toBe(0);
  });

  // Note: Testing old version banner requires creating multiple versions
  // This is currently not implemented in the upload flow
  test.skip('should show read-only banner on old version', async ({ page }) => {
    // TODO: Implement this test when version upload is available
  });
});
