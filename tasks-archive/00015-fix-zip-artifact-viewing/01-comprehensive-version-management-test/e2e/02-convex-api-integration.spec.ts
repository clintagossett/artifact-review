/**
 * E2E Test #2: Convex API Integration Tests
 *
 * Tests the REAL Convex backend APIs using ConvexHttpClient.
 *
 * SETUP REQUIRED:
 * 1. Start Convex dev server: cd app && npm run dev
 * 2. Set CONVEX_URL environment variable (or it will use default)
 * 3. These tests will create real artifacts in the dev database
 *
 * NOTE: These tests require authentication to work fully.
 * For now, they test public queries and unauthenticated access.
 *
 * AUTHENTICATED TESTS ARE SKIPPED - they require:
 * - Real auth tokens from @convex-dev/auth
 * - Either manual login flow or test auth helper
 *
 * What we CAN test without auth:
 * - getByShareToken (public query)
 * - getVersion (public query)
 * - getFilesByVersion (public query)
 * - HTTP router endpoints (tested in 01-http-router-file-serving.spec.ts)
 */

import { test, expect } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../app/convex/_generated/api';

const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  'http://localhost:3000';

function createConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(CONVEX_URL);
}

// Placeholder - in real E2E, you'd upload an artifact first
const TEST_ARTIFACT_ID = 'REPLACE_ME';
const TEST_VERSION_ID = 'REPLACE_ME';
const TEST_SHARE_TOKEN = 'REPLACE_ME';

test.describe('Convex API - Public Queries', () => {
  test.skip(TEST_SHARE_TOKEN === 'REPLACE_ME', 'Requires test artifact to be uploaded first');

  test('should get artifact by shareToken (public query)', async () => {
    const client = createConvexClient();

    try {
      const artifact = await client.query(api.artifacts.getByShareToken, {
        shareToken: TEST_SHARE_TOKEN,
      });

      expect(artifact).not.toBeNull();
      expect(artifact?.shareToken).toBe(TEST_SHARE_TOKEN);
      expect(artifact?.title).toBeDefined();
    } finally {
      client.close();
    }
  });

  test('should return null for invalid shareToken', async () => {
    const client = createConvexClient();

    try {
      const artifact = await client.query(api.artifacts.getByShareToken, {
        shareToken: 'invalid123',
      });

      expect(artifact).toBeNull();
    } finally {
      client.close();
    }
  });

  test('should get version by ID', async () => {
    const client = createConvexClient();

    try {
      const version = await client.query(api.artifacts.getVersion, {
        versionId: TEST_VERSION_ID,
      });

      expect(version).not.toBeNull();
      expect(version?.versionNumber).toBeGreaterThan(0);
      expect(version?.fileType).toBe('zip');
    } finally {
      client.close();
    }
  });

  test('should get files for a version', async () => {
    const client = createConvexClient();

    try {
      const files = await client.query(api.artifacts.getFilesByVersion, {
        versionId: TEST_VERSION_ID,
      });

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);

      // Charting v1 has 4 files
      expect(files.length).toBe(4);

      // Validate file structure
      const filePaths = files.map((f: any) => f.filePath).sort();
      expect(filePaths).toEqual([
        'app.js',
        'assets/chart-data.json',
        'assets/logo.png',
        'index.html',
      ]);

      // Validate MIME types
      const indexFile = files.find((f: any) => f.filePath === 'index.html');
      expect(indexFile?.mimeType).toBe('text/html');

      const jsFile = files.find((f: any) => f.filePath === 'app.js');
      expect(jsFile?.mimeType).toBe('application/javascript');

      const jsonFile = files.find((f: any) => f.filePath === 'assets/chart-data.json');
      expect(jsonFile?.mimeType).toBe('application/json');

      const pngFile = files.find((f: any) => f.filePath === 'assets/logo.png');
      expect(pngFile?.mimeType).toBe('image/png');
    } finally {
      client.close();
    }
  });

  test('should list HTML files for a version', async () => {
    const client = createConvexClient();

    try {
      const htmlFiles = await client.query(api.artifacts.listHtmlFiles, {
        versionId: TEST_VERSION_ID,
      });

      expect(Array.isArray(htmlFiles)).toBe(true);
      expect(htmlFiles.length).toBe(1); // Charting v1 has 1 HTML file

      expect(htmlFiles[0].filePath).toBe('index.html');
      expect(htmlFiles[0].mimeType).toBe('text/html');
    } finally {
      client.close();
    }
  });

  test('should get versions for an artifact', async () => {
    const client = createConvexClient();

    try {
      const versions = await client.query(api.artifacts.getVersions, {
        artifactId: TEST_ARTIFACT_ID,
      });

      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);

      // Versions should be in descending order (newest first)
      if (versions.length > 1) {
        expect(versions[0].versionNumber).toBeGreaterThan(versions[1].versionNumber);
      }

      // All versions should belong to the same artifact
      versions.forEach((v: any) => {
        expect(v.artifactId).toBe(TEST_ARTIFACT_ID);
      });
    } finally {
      client.close();
    }
  });
});

test.describe('Convex API - Authenticated Mutations (SKIPPED)', () => {
  test.skip('requires authentication setup', 'createArtifactWithZip requires auth');
  test.skip('requires authentication setup', 'addVersion requires auth');
  test.skip('requires authentication setup', 'softDeleteVersion requires auth');
  test.skip('requires authentication setup', 'softDelete requires auth');

  /**
   * DEVELOPER NOTE:
   *
   * To enable authenticated E2E tests, you need to:
   *
   * 1. Implement auth token generation:
   *    - Either use @convex-dev/auth client to get real tokens
   *    - Or create a test-only auth bypass (NOT recommended for production)
   *
   * 2. Pass auth tokens to ConvexHttpClient:
   *    ```typescript
   *    const client = new ConvexHttpClient(CONVEX_URL);
   *    await client.setAuth(authToken);
   *    ```
   *
   * 3. Example authenticated test:
   *    ```typescript
   *    test('should create artifact with ZIP', async () => {
   *      const client = createConvexClient();
   *      await client.setAuth(await getTestAuthToken());
   *
   *      const result = await client.mutation(api.zipUpload.createArtifactWithZip, {
   *        title: 'Test Artifact',
   *        description: 'E2E test',
   *        fileSize: 1000,
   *        entryPoint: 'index.html',
   *      });
   *
   *      expect(result.artifactId).toBeDefined();
   *      expect(result.versionId).toBeDefined();
   *      expect(result.shareToken).toBeDefined();
   *
   *      client.close();
   *    });
   *    ```
   *
   * For now, we rely on the unit tests (convex-test) for authenticated flows,
   * and E2E tests focus on HTTP router and public queries.
   */
});

test.describe('Convex API - Error Handling', () => {
  test('should handle queries with invalid IDs gracefully', async () => {
    const client = createConvexClient();

    try {
      // Try to get artifact with invalid ID format
      await expect(
        client.query(api.artifacts.get, {
          id: 'not-a-valid-id' as any,
        })
      ).rejects.toThrow();
    } finally {
      client.close();
    }
  });

  test('should return null for nonexistent artifact ID', async () => {
    const client = createConvexClient();

    try {
      // Use a valid ID format but nonexistent artifact
      // Note: This might throw if the ID format is wrong, or return null if format is valid
      const artifact = await client.query(api.artifacts.get, {
        id: 'jh71vzs4e3me5nhzcp4vh8mpe76ysw7w' as any, // Valid format, likely nonexistent
      });

      expect(artifact).toBeNull();
    } finally {
      client.close();
    }
  });
});

test.describe('Convex API - Performance', () => {
  test.skip(TEST_SHARE_TOKEN === 'REPLACE_ME', 'Requires test artifact to be uploaded first');

  test('should respond to queries within 1 second', async () => {
    const client = createConvexClient();

    try {
      const startTime = Date.now();

      await client.query(api.artifacts.getByShareToken, {
        shareToken: TEST_SHARE_TOKEN,
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should be fast
    } finally {
      client.close();
    }
  });

  test('should handle concurrent queries', async () => {
    const client = createConvexClient();

    try {
      // Make 10 concurrent queries
      const promises = Array.from({ length: 10 }, () =>
        client.query(api.artifacts.getByShareToken, {
          shareToken: TEST_SHARE_TOKEN,
        })
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result).not.toBeNull();
        expect(result?.shareToken).toBe(TEST_SHARE_TOKEN);
      });
    } finally {
      client.close();
    }
  });
});
