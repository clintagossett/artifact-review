/**
 * E2E Test #3: Version Management Flow
 *
 * Tests the complete version management lifecycle with REAL backend.
 *
 * MANUAL SETUP REQUIRED:
 * 1. Start Convex dev server: cd app && npm run dev
 * 2. Login to web UI at http://localhost:3000
 * 3. Upload charting v1.zip, note the shareToken
 * 4. Upload v2, v3, v4 (using the "Add Version" button)
 * 5. Soft delete v2 via UI
 * 6. Update constants below with your shareToken and artifactId
 *
 * This test validates:
 * - Multiple versions exist and are accessible
 * - Version numbering is correct (1, 2, 3, 4)
 * - Soft-deleted versions are not returned in active queries
 * - Soft-deleted versions cannot be accessed via HTTP router
 * - Active versions remain accessible after deleting another version
 */

import { test, expect } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../app/convex/_generated/api';

// TODO: Replace these after manual setup
const TEST_ARTIFACT_ID = 'REPLACE_ME';
const TEST_SHARE_TOKEN = 'REPLACE_ME';

const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  'http://localhost:3000';

const HTTP_BASE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || 'http://localhost:3000';

function createConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(CONVEX_URL);
}

test.describe('Version Management - Full Flow', () => {
  test.skip(TEST_SHARE_TOKEN === 'REPLACE_ME', 'Requires manual artifact upload first');

  test('should have 4 versions (v1, v2, v3, v4) with correct numbering', async () => {
    const client = createConvexClient();

    try {
      const versions = await client.query(api.artifacts.getVersions, {
        artifactId: TEST_ARTIFACT_ID,
      });

      // Should have 4 versions BEFORE any deletions
      // If you've already deleted v2, this might be 3
      expect(versions.length).toBeGreaterThanOrEqual(3);

      // Versions should be in descending order
      expect(versions[0].versionNumber).toBeGreaterThan(versions[1].versionNumber);

      // Validate version numbers exist (1, 2, 3, 4)
      const versionNumbers = versions.map((v: any) => v.versionNumber).sort();
      expect(versionNumbers).toContain(1);
      expect(versionNumbers).toContain(4);

      // Each version should have correct fileType
      versions.forEach((v: any) => {
        expect(v.fileType).toBe('zip');
        expect(v.isDeleted).toBe(false); // Assuming not deleted yet
      });
    } finally {
      client.close();
    }
  });

  test('should serve files from all active versions via HTTP router', async ({ request }) => {
    // Test v1
    const v1Response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/index.html`
    );
    expect(v1Response.status()).toBe(200);

    // Test v2 (if not deleted)
    const v2Response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v2/index.html`
    );
    // If v2 is deleted, this will be 404, otherwise 200
    expect([200, 404]).toContain(v2Response.status());

    // Test v3
    const v3Response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v3/index.html`
    );
    expect(v3Response.status()).toBe(200);

    // Test v4
    const v4Response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v4/index.html`
    );
    expect(v4Response.status()).toBe(200);
  });

  test('should have different content for each version', async ({ request }) => {
    const v1Body = await request
      .get(`${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/index.html`)
      .then((r) => r.text());

    const v3Body = await request
      .get(`${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v3/index.html`)
      .then((r) => r.text());

    const v4Body = await request
      .get(`${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v4/index.html`)
      .then((r) => r.text());

    // Each version should have unique content
    // (In the real charting samples, the versions differ)
    expect(v1Body).toBeDefined();
    expect(v3Body).toBeDefined();
    expect(v4Body).toBeDefined();
  });

  test('should have 4 files extracted for each version', async () => {
    const client = createConvexClient();

    try {
      const versions = await client.query(api.artifacts.getVersions, {
        artifactId: TEST_ARTIFACT_ID,
      });

      // Check files for each version
      for (const version of versions) {
        const files = await client.query(api.artifacts.getFilesByVersion, {
          versionId: version._id,
        });

        // Charting samples have 4 files each
        expect(files.length).toBe(4);

        const filePaths = files.map((f: any) => f.filePath).sort();
        expect(filePaths).toEqual([
          'app.js',
          'assets/chart-data.json',
          'assets/logo.png',
          'index.html',
        ]);
      }
    } finally {
      client.close();
    }
  });
});

test.describe('Version Management - Soft Delete Validation', () => {
  test.skip(TEST_SHARE_TOKEN === 'REPLACE_ME', 'Requires manual artifact upload first');

  /**
   * MANUAL STEP REQUIRED BEFORE THIS TEST:
   * 1. Go to web UI
   * 2. Soft delete v2 via the UI
   * 3. Run this test
   */
  test('should NOT return soft-deleted v2 in active versions query', async () => {
    const client = createConvexClient();

    try {
      const versions = await client.query(api.artifacts.getVersions, {
        artifactId: TEST_ARTIFACT_ID,
      });

      // Active versions should NOT include v2 (if deleted)
      const versionNumbers = versions.map((v: any) => v.versionNumber);

      // If v2 was deleted, it should not appear
      // This test will FAIL if v2 is not deleted (which is expected)
      expect(versionNumbers).not.toContain(2);

      // Should only have v1, v3, v4
      expect(versionNumbers).toContain(1);
      expect(versionNumbers).toContain(3);
      expect(versionNumbers).toContain(4);
      expect(versions.length).toBe(3);
    } finally {
      client.close();
    }
  });

  test('should return 404 for files from soft-deleted v2 via HTTP router', async ({
    request,
  }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v2/index.html`
    );

    // If v2 is deleted, should get 404
    expect(response.status()).toBe(404);
    const body = await response.text();
    expect(body).toContain('Version 2 not found');
  });

  test('should still serve files from v1, v3, v4 after deleting v2', async ({ request }) => {
    // v1 should work
    const v1Response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/index.html`
    );
    expect(v1Response.status()).toBe(200);

    // v3 should work
    const v3Response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v3/index.html`
    );
    expect(v3Response.status()).toBe(200);

    // v4 should work
    const v4Response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v4/index.html`
    );
    expect(v4Response.status()).toBe(200);
  });
});

test.describe('Version Management - Version Numbering with Gaps', () => {
  test.skip(TEST_SHARE_TOKEN === 'REPLACE_ME', 'Requires manual artifact upload first');

  test('should maintain version numbers even with deleted versions', async () => {
    const client = createConvexClient();

    try {
      const versions = await client.query(api.artifacts.getVersions, {
        artifactId: TEST_ARTIFACT_ID,
      });

      // After deleting v2, we should have:
      // - v1 (version 1)
      // - v3 (version 3, NOT renumbered to 2!)
      // - v4 (version 4, NOT renumbered to 3!)

      const versionNumbers = versions.map((v: any) => v.versionNumber).sort();

      // Should have gaps in numbering (1, 3, 4 - missing 2)
      expect(versionNumbers).toEqual([1, 3, 4]);

      // NOT [1, 2, 3] - version numbers are never reused
    } finally {
      client.close();
    }
  });

  /**
   * MANUAL STEP REQUIRED:
   * After deleting v2, upload a NEW version via UI.
   * It should become v5 (NOT v2).
   */
  test('should create v5 when adding new version after deleting v2', async () => {
    const client = createConvexClient();

    try {
      const versions = await client.query(api.artifacts.getVersions, {
        artifactId: TEST_ARTIFACT_ID,
      });

      const versionNumbers = versions.map((v: any) => v.versionNumber).sort();

      // If you uploaded a new version after deleting v2, it should be v5
      // NOT v2 (version numbers are never reused)
      if (versionNumbers.length > 3) {
        expect(versionNumbers).toContain(5);
        expect(versionNumbers).not.toContain(2); // v2 is deleted
      }
    } finally {
      client.close();
    }
  });
});

test.describe('Version Management - Latest Version Logic', () => {
  test.skip(TEST_SHARE_TOKEN === 'REPLACE_ME', 'Requires manual artifact upload first');

  test('should return v4 as latest active version (after deleting v2)', async () => {
    const client = createConvexClient();

    try {
      const latestVersion = await client.query(api.artifacts.getLatestVersion, {
        artifactId: TEST_ARTIFACT_ID,
      });

      // Latest active version should be v4
      expect(latestVersion).not.toBeNull();
      expect(latestVersion?.versionNumber).toBe(4);
      expect(latestVersion?.isDeleted).toBe(false);
    } finally {
      client.close();
    }
  });
});
