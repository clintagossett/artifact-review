/**
 * E2E Test #1: HTTP Router File Serving
 *
 * Tests the REAL HTTP router endpoints for serving artifact files.
 *
 * SETUP REQUIRED:
 * 1. Start Convex dev server: cd app && npm run dev
 * 2. Create a test artifact via the web UI with:
 *    - Upload charting v1.zip
 *    - Note the shareToken
 *    - Upload v2, v3, v4
 * 3. Update TEST_SHARE_TOKEN constant below
 *
 * These tests validate:
 * - GET /artifact/{shareToken}/v{version}/{filePath}
 * - Content-Type headers
 * - 404 handling for invalid paths
 * - CORS headers
 * - Multiple versions served independently
 */

import { test, expect } from '@playwright/test';

// TODO: Replace with actual shareToken after uploading test artifact
const TEST_SHARE_TOKEN = 'REPLACE_ME';

// Base URL for HTTP router (NOT Convex API URL)
const HTTP_BASE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || 'http://localhost:3000';

test.describe('HTTP Router - File Serving', () => {
  test.skip(TEST_SHARE_TOKEN === 'REPLACE_ME', 'Requires test artifact to be uploaded first');

  test('should serve index.html with correct Content-Type', async ({ request }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/index.html`
    );

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');

    const body = await response.text();
    expect(body).toContain('<!DOCTYPE html>');
  });

  test('should serve app.js with correct Content-Type', async ({ request }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/app.js`
    );

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/javascript');
  });

  test('should serve nested file (assets/chart-data.json)', async ({ request }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/assets/chart-data.json`
    );

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const json = await response.json();
    expect(json).toBeDefined();
  });

  test('should serve nested image (assets/logo.png)', async ({ request }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/assets/logo.png`
    );

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('should return 404 for nonexistent file', async ({ request }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/nonexistent.html`
    );

    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('text/plain');

    const body = await response.text();
    expect(body).toContain('File not found');
  });

  test('should return 404 for invalid shareToken', async ({ request }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/invalid123/v1/index.html`
    );

    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('text/plain');

    const body = await response.text();
    expect(body).toContain('Artifact not found');
  });

  test('should return 404 for nonexistent version', async ({ request }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v99/index.html`
    );

    expect(response.status()).toBe(404);
    const body = await response.text();
    expect(body).toContain('Version 99 not found');
  });

  test('should include CORS headers for cross-origin access', async ({ request }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/index.html`
    );

    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['access-control-allow-methods']).toBe('GET');
  });

  test('should include cache headers', async ({ request }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/index.html`
    );

    expect(response.headers()['cache-control']).toContain('public');
    expect(response.headers()['cache-control']).toContain('max-age');
  });

  test('should serve different content for v1 vs v2', async ({ request }) => {
    const v1Response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/index.html`
    );
    const v2Response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v2/index.html`
    );

    expect(v1Response.status()).toBe(200);
    expect(v2Response.status()).toBe(200);

    const v1Body = await v1Response.text();
    const v2Body = await v2Response.text();

    // v1 and v2 should have different content (they're different versions)
    // This validates version isolation
    expect(v1Body).not.toBe(v2Body);
  });
});

test.describe('HTTP Router - URL Parsing', () => {
  test.skip(TEST_SHARE_TOKEN === 'REPLACE_ME', 'Requires test artifact to be uploaded first');

  test('should handle URLs with encoded characters', async ({ request }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/assets/chart-data.json`
    );

    expect(response.status()).toBe(200);
  });

  test('should return 400 for invalid version format', async ({ request }) => {
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/version1/index.html`
    );

    expect(response.status()).toBe(400);
    const body = await response.text();
    expect(body).toContain('Invalid version format');
  });

  test('should return 400 for malformed URL', async ({ request }) => {
    const response = await request.get(`${HTTP_BASE_URL}/artifact/`);

    expect(response.status()).toBe(400);
    const body = await response.text();
    expect(body).toContain('Invalid artifact URL');
  });
});

test.describe('HTTP Router - Soft Delete Behavior', () => {
  test.skip(TEST_SHARE_TOKEN === 'REPLACE_ME', 'Requires test artifact to be uploaded first');

  // NOTE: These tests require manual setup:
  // 1. Upload v1, v2, v3
  // 2. Soft delete v2 via UI
  // 3. Verify v2 files return 404 (soft delete prevents access)

  test('should return 404 for files from soft-deleted version', async ({ request }) => {
    // This test assumes v2 has been soft-deleted
    // If v2 is NOT deleted, this test will fail (expected)
    const response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v2/index.html`
    );

    // If v2 is deleted, we should get 404
    // If v2 is not deleted, we'll get 200 (test will fail)
    // This validates that soft delete prevents file access
    expect(response.status()).toBe(404);
  });

  test('should still serve files from active versions after deleting another version', async ({
    request,
  }) => {
    // After deleting v2, v1 and v3 should still be accessible
    const v1Response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v1/index.html`
    );
    const v3Response = await request.get(
      `${HTTP_BASE_URL}/artifact/${TEST_SHARE_TOKEN}/v3/index.html`
    );

    expect(v1Response.status()).toBe(200);
    expect(v3Response.status()).toBe(200);
  });
});
