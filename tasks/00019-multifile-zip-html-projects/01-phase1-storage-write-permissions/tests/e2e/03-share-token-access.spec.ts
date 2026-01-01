/**
 * E2E Test: View Artifact via Share Token
 *
 * Tests that artifacts can be viewed via public share links without authentication.
 * Tests version switching via share links.
 */

import { test, expect } from '@playwright/test';
import { injectClickIndicator } from '../../../../../../app/tests/utils/clickIndicator';
import { registerUser, signOut } from './helpers/auth';
import {
  createZipArtifact,
  addZipVersion,
  accessArtifactViaShareLink,
  verifyArtifactContentVisible,
} from './helpers/artifacts';
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

test.describe('Share Token Access', () => {
  test.setTimeout(120000);

  test('should view artifact via share link without authentication', async ({ page, context }) => {
    // 1. Create artifact while authenticated
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Public Share Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    console.log('Created artifact with shareToken:', shareToken);

    // 2. Sign out
    await signOut(page);

    // 3. Open artifact in new incognito context (no auth)
    const newContext = await context.browser()?.newContext();
    if (!newContext) {
      throw new Error('Failed to create new context');
    }

    const newPage = await newContext.newPage();
    await injectClickIndicator(newPage);

    // 4. Access via share link
    await accessArtifactViaShareLink(newPage, shareToken);

    // 5. Verify content is visible
    await verifyArtifactContentVisible(newPage, 'Monthly Sales Dashboard v1');

    // 6. Verify no authentication required
    await expect(newPage.locator('text=/sign in|log in/i')).not.toBeVisible();

    await newContext.close();
  });

  test('should access specific version via share link with version parameter', async ({
    page,
    context,
  }) => {
    // Create artifact with multiple versions
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Version Share Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    // Add v2
    const v2Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v2.zip'
    );
    await addZipVersion(page, shareToken, { zipFilePath: v2Path });

    // Add v3
    const v3Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v3.zip'
    );
    await addZipVersion(page, shareToken, { zipFilePath: v3Path });

    // Sign out
    await signOut(page);

    // Create new incognito context
    const newContext = await context.browser()?.newContext();
    if (!newContext) {
      throw new Error('Failed to create new context');
    }

    const newPage = await newContext.newPage();
    await injectClickIndicator(newPage);

    // Access v2 specifically via URL parameter
    await newPage.goto(`/a/${shareToken}?v=2`);
    await newPage.waitForLoadState('networkidle');

    // Verify v2 content displays
    await verifyArtifactContentVisible(newPage, 'Monthly Sales Dashboard v2');

    // Access v1 via URL parameter
    await newPage.goto(`/a/${shareToken}?v=1`);
    await newPage.waitForLoadState('networkidle');
    await verifyArtifactContentVisible(newPage, 'Monthly Sales Dashboard v1');

    // Access v3 via URL parameter
    await newPage.goto(`/a/${shareToken}?v=3`);
    await newPage.waitForLoadState('networkidle');
    await verifyArtifactContentVisible(newPage, 'Monthly Sales Dashboard v3');

    await newContext.close();
  });

  test('should default to latest version when no version parameter provided', async ({
    page,
    context,
  }) => {
    // Create artifact with multiple versions
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Default Version Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    // Add v2 and v3
    const v2Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v2.zip'
    );
    await addZipVersion(page, shareToken, { zipFilePath: v2Path });

    const v3Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v3.zip'
    );
    await addZipVersion(page, shareToken, { zipFilePath: v3Path });

    // Sign out
    await signOut(page);

    // Create new context
    const newContext = await context.browser()?.newContext();
    if (!newContext) {
      throw new Error('Failed to create new context');
    }

    const newPage = await newContext.newPage();
    await injectClickIndicator(newPage);

    // Access share link without version parameter
    await accessArtifactViaShareLink(newPage, shareToken);

    // Should default to latest version (v3)
    await verifyArtifactContentVisible(newPage, 'Monthly Sales Dashboard v3');

    await newContext.close();
  });

  test('should allow unauthenticated users to switch versions', async ({ page, context }) => {
    // Create artifact with versions while authenticated
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Unauthenticated Switch Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    const v2Path = path.join(
      __dirname,
      '../../../../../../samples/01-valid/zip/charting/v2.zip'
    );
    await addZipVersion(page, shareToken, { zipFilePath: v2Path });

    // Sign out
    await signOut(page);

    // Access as unauthenticated user
    const newContext = await context.browser()?.newContext();
    if (!newContext) {
      throw new Error('Failed to create new context');
    }

    const newPage = await newContext.newPage();
    await injectClickIndicator(newPage);

    await accessArtifactViaShareLink(newPage, shareToken);

    // Currently on v2 (latest)
    await verifyArtifactContentVisible(newPage, 'Monthly Sales Dashboard v2');

    // Look for version selector - try multiple possible selectors
    const versionSelector = newPage.locator('[data-testid="version-selector"]');
    const versionButton1 = newPage.locator('button:has-text("v1")');

    if (await versionSelector.isVisible()) {
      await versionSelector.selectOption({ value: '1' });
    } else if (await versionButton1.isVisible()) {
      await versionButton1.click();
    } else {
      // Try clicking a link to v1
      await newPage.goto(`/a/${shareToken}?v=1`);
    }

    await newPage.waitForLoadState('networkidle');

    // Should now show v1 content
    await verifyArtifactContentVisible(newPage, 'Monthly Sales Dashboard v1');

    await newContext.close();
  });
});
