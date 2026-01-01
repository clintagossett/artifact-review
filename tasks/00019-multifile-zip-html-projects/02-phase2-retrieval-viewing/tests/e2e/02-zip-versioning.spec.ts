/**
 * E2E Test: Upload New Version of ZIP Artifact
 *
 * Tests the flow of adding new versions to an existing artifact.
 * Uses central /samples/ test data with versioned charting ZIPs.
 */

import { test, expect } from '@playwright/test';
import { injectClickIndicator } from '../../../../../app/tests/utils/clickIndicator';
import { registerUser } from './helpers/auth';
import {
  createZipArtifact,
  addZipVersion,
  switchToVersion,
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

test.describe('ZIP Versioning', () => {
  test.setTimeout(120000); // ZIP uploads may take longer

  test('should upload new version and increment version number', async ({ page }) => {
    // 1. Register and create initial artifact with v1
    await registerUser(page);
    await expect(page).toHaveURL('/dashboard');

    const v1Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const testTitle = `Version Test - ${Date.now()}`;
    const { shareToken } = await createZipArtifact(page, {
      title: testTitle,
      zipFilePath: v1Path,
    });

    console.log('Created artifact with v1, shareToken:', shareToken);

    // 2. Add version 2
    const v2Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting/v2.zip'
    );

    const { versionNumber } = await addZipVersion(page, shareToken, {
      zipFilePath: v2Path,
    });

    console.log('Added v2, versionNumber:', versionNumber);
    expect(versionNumber).toBeGreaterThanOrEqual(2);

    // 3. Verify new version content displays
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v2');
  });

  test('should switch between versions and display correct content', async ({ page }) => {
    // Create artifact with v1
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Version Switch Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    // Add v2
    const v2Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting/v2.zip'
    );
    await addZipVersion(page, shareToken, { zipFilePath: v2Path });

    // Add v3
    const v3Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting/v3.zip'
    );
    await addZipVersion(page, shareToken, { zipFilePath: v3Path });

    // Now we should be on v3 - verify
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v3');

    // Switch to v1
    await switchToVersion(page, 1);
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v1');

    // Switch to v2
    await switchToVersion(page, 2);
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v2');

    // Switch back to v3
    await switchToVersion(page, 3);
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v3');
  });

  test('should create multiple versions sequentially', async ({ page }) => {
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Multi-version Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    // Add v2, v3, v4, v5
    const versions = [2, 3, 4, 5];
    for (const v of versions) {
      const vPath = path.join(
        __dirname,
        `../../../../../samples/01-valid/zip/charting/v${v}.zip`
      );

      const { versionNumber } = await addZipVersion(page, shareToken, {
        zipFilePath: vPath,
      });

      console.log(`Added v${v}, got versionNumber:`, versionNumber);
      expect(versionNumber).toBeGreaterThanOrEqual(v);
    }

    // Verify final version shows v5 content
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v5');

    // Verify we can still switch to v1
    await switchToVersion(page, 1);
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v1');
  });

  test('should preserve version 1 when uploading version 2', async ({ page }) => {
    await registerUser(page);

    const v1Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting/v1.zip'
    );

    const { shareToken } = await createZipArtifact(page, {
      title: `Preserve v1 Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    // Verify v1 content before adding v2
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v1');

    // Add v2
    const v2Path = path.join(
      __dirname,
      '../../../../../samples/01-valid/zip/charting/v2.zip'
    );
    await addZipVersion(page, shareToken, { zipFilePath: v2Path });

    // Now on v2
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v2');

    // Switch back to v1 - it should still work
    await switchToVersion(page, 1);
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v1');

    // Files from v1 should still be accessible
    // Reload to ensure no caching issues
    await page.reload();
    await page.waitForLoadState('networkidle');
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v1');
  });
});
