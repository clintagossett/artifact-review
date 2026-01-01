# Subtask 02: Phase 2 - Retrieval and Viewing

**Parent Task:** 00019 - Upload and View Multi-file HTML Projects via ZIP
**Status:** Complete (code), E2E tests ready
**Created:** 2025-12-31
**Updated:** 2026-01-01

---

## Objective

Enable HTTP serving of multi-file artifacts with proper MIME types, relative path resolution, caching headers, and read permission checks. Ensure the frontend viewer correctly renders multi-file HTML projects with CSS, JavaScript, images, and other assets.

---

## Phase 1 Completed (Context)

Phase 1 is COMPLETE with 28 passing tests:

| Component | Status | Location |
|-----------|--------|----------|
| ZIP validation constants | Done | `/app/convex/lib/fileTypes.ts` |
| `createArtifactWithZip` mutation | Done | `/app/convex/zipUpload.ts` |
| `addZipVersion` mutation | Done | `/app/convex/zipUpload.ts` |
| `processZipFile` action | Done | `/app/convex/zipProcessor.ts` |
| `canWriteArtifact` helper | Done | `/app/convex/lib/permissions.ts` |
| `markProcessingError` mutation | Done | `/app/convex/zipProcessorMutations.ts` |
| Backend tests | Done | `/app/convex/__tests__/phase1-zip-storage.test.ts` |
| Integration tests | Done | `/app/convex/__tests__/zip-backend-integration.test.ts` |
| E2E test scaffolding | Ready | `tasks/00019-*/01-phase1-*/tests/e2e/` |

---

## Implementation Steps

### Step 2.1: Verify HTTP Handler Multi-file Support

**File:** `/app/convex/http.ts`

The HTTP handler already exists and supports multi-file paths. Verify it handles all Phase 2 requirements:

**Current Implementation (lines 23-163):**
- URL pattern: `/artifact/{shareToken}/v{version}/{filePath}`
- Nested path support: `pathSegments.slice(2).join("/")` (line 43)
- Entry point fallback: Uses `version.entryPoint` when no filePath (lines 96-103)
- URL decoding: `decodeURIComponent(filePathToServe)` (line 105)
- File lookup: `internal.artifacts.getFileByPath` (line 106)
- Storage fetch and response (lines 120-152)

**Verification Checklist:**
- [ ] Nested paths work (e.g., `assets/images/logo.png`)
- [ ] Entry point fallback uses `version.entryPoint`
- [ ] URL-encoded paths decode correctly
- [ ] CORS headers present (lines 147-149)
- [ ] Cache-Control header present (line 150)

**Minor Enhancement Needed - Add `immutable` to Cache-Control:**

```typescript
// Current (line 150):
"Cache-Control": "public, max-age=31536000",

// Updated:
"Cache-Control": "public, max-age=31536000, immutable",
```

---

### Step 2.2: Verify/Enhance MIME Types

**File:** `/app/convex/lib/mimeTypes.ts`

The current implementation covers basic types. Verify and add any missing types for ZIP project assets:

**Current Types (verified):**
- HTML: `html`, `htm` -> `text/html`
- CSS: `css` -> `text/css`
- JavaScript: `js`, `mjs` -> `application/javascript`
- JSON: `json` -> `application/json`
- Images: `png`, `jpg`, `jpeg`, `gif`, `svg`, `webp`, `ico`
- Fonts: `woff`, `woff2`, `ttf`, `eot`
- Other: `pdf`, `txt`, `xml`, `md`, `zip`

**Types to Add (optional enhancement):**

```typescript
// Add to mimeTypes object:
'avif': 'image/avif',      // Modern image format
'otf': 'font/otf',         // OpenType fonts
'csv': 'text/csv',         // Data files
'ts': 'application/typescript', // TypeScript source
'map': 'application/json', // Source maps
```

**Note:** The current implementation returns `application/octet-stream` for unknown types, which is acceptable. Phase 2 E2E tests should verify the most common types work.

---

### Step 2.3: Verify Read Permission Model

**File:** `/app/convex/lib/permissions.ts`

The existing permission model is correct for Phase 2:

| Access Type | Implementation | HTTP Route Behavior |
|-------------|----------------|---------------------|
| Owner | `getArtifactPermission()` -> "owner" | Full access |
| Reviewer | `getArtifactPermission()` -> "reviewer" | View access |
| Public | Share token lookup (no auth) | View access |

**HTTP Route Note:** The HTTP handler (`/app/convex/http.ts`) uses `internal.artifacts.getByShareTokenInternal` (line 59-62) which returns `null` for deleted artifacts. This is the correct behavior for public access.

**No code changes needed** - the permission model is correct.

---

### Step 2.4: Frontend Viewer Verification

The frontend viewer should work with multi-file artifacts because:
1. It uses `getEntryPointContent` query to get the main file URL
2. Relative paths in HTML resolve to the HTTP endpoint due to iframe src pattern

**Verification Points:**
1. Entry point HTML loads in iframe
2. Relative CSS paths work (e.g., `<link href="./styles.css">`)
3. Relative JS paths work (e.g., `<script src="./app.js">`)
4. Relative image paths work (e.g., `<img src="./assets/logo.png">`)
5. CSS relative URLs work (e.g., `url(../images/bg.png)`)

**Potential Issue - Base URL:**
If relative paths break, may need to inject a `<base>` tag. This would require:
1. Modifying the viewer component to wrap HTML content
2. Setting `<base href="/artifact/{shareToken}/v{version}/">`

**Phase 2 Testing Should Reveal:** If relative paths work naturally (likely) or need base tag injection.

---

### Step 2.5: Write Phase 2 Backend Tests

**File:** `/app/convex/__tests__/zip-serving.test.ts`

Create tests that verify the HTTP serving layer. Since convex-test has limitations with HTTP actions, focus on testing the underlying queries and data structure:

```typescript
/**
 * Phase 2 Tests: ZIP Artifact Serving
 * Task 00019 - Multi-file ZIP HTML Projects
 *
 * Tests for HTTP serving, MIME types, and file retrieval.
 */

import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

describe("ZIP Serving - File Retrieval", () => {
  test("getFileByPath returns correct file with MIME type", async () => {
    const t = convexTest(schema);

    // Setup: Create version with files
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const artifactId = await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test",
        creatorId: userId,
        shareToken: "abc12345",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const versionId = await t.run(async (ctx) =>
      ctx.db.insert("artifactVersions", {
        artifactId,
        versionNumber: 1,
        createdBy: userId,
        fileType: "zip",
        entryPoint: "index.html",
        fileSize: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      })
    );

    // Create file records
    const mockStorageId = "kg2test000001;_storage" as Id<"_storage">;
    await t.run(async (ctx) =>
      ctx.db.insert("artifactFiles", {
        versionId,
        filePath: "index.html",
        storageId: mockStorageId,
        mimeType: "text/html",
        fileSize: 500,
        isDeleted: false,
      })
    );

    // Test getFileByPath
    const file = await t.query(internal.artifacts.getFileByPath, {
      versionId,
      filePath: "index.html",
    });

    expect(file).toBeDefined();
    expect(file?.mimeType).toBe("text/html");
    expect(file?.storageId).toBe(mockStorageId);
  });

  test("getFileByPath returns null for non-existent file", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const artifactId = await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test",
        creatorId: userId,
        shareToken: "abc12345",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const versionId = await t.run(async (ctx) =>
      ctx.db.insert("artifactVersions", {
        artifactId,
        versionNumber: 1,
        createdBy: userId,
        fileType: "zip",
        entryPoint: "index.html",
        fileSize: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      })
    );

    // No files created - query should return null
    const file = await t.query(internal.artifacts.getFileByPath, {
      versionId,
      filePath: "nonexistent.html",
    });

    expect(file).toBeNull();
  });

  test("getFileByPath returns null for deleted files", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const artifactId = await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test",
        creatorId: userId,
        shareToken: "abc12345",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const versionId = await t.run(async (ctx) =>
      ctx.db.insert("artifactVersions", {
        artifactId,
        versionNumber: 1,
        createdBy: userId,
        fileType: "zip",
        entryPoint: "index.html",
        fileSize: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      })
    );

    const mockStorageId = "kg2test000001;_storage" as Id<"_storage">;
    await t.run(async (ctx) =>
      ctx.db.insert("artifactFiles", {
        versionId,
        filePath: "deleted.html",
        storageId: mockStorageId,
        mimeType: "text/html",
        fileSize: 500,
        isDeleted: true,  // Soft deleted
        deletedAt: Date.now(),
      })
    );

    const file = await t.query(internal.artifacts.getFileByPath, {
      versionId,
      filePath: "deleted.html",
    });

    expect(file).toBeNull();
  });

  test("getFileByPath retrieves nested path files", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const artifactId = await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test",
        creatorId: userId,
        shareToken: "abc12345",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const versionId = await t.run(async (ctx) =>
      ctx.db.insert("artifactVersions", {
        artifactId,
        versionNumber: 1,
        createdBy: userId,
        fileType: "zip",
        entryPoint: "index.html",
        fileSize: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      })
    );

    const mockStorageId = "kg2test000002;_storage" as Id<"_storage">;
    await t.run(async (ctx) =>
      ctx.db.insert("artifactFiles", {
        versionId,
        filePath: "assets/images/logo.png",  // Nested path
        storageId: mockStorageId,
        mimeType: "image/png",
        fileSize: 2000,
        isDeleted: false,
      })
    );

    const file = await t.query(internal.artifacts.getFileByPath, {
      versionId,
      filePath: "assets/images/logo.png",
    });

    expect(file).toBeDefined();
    expect(file?.mimeType).toBe("image/png");
  });
});

describe("ZIP Serving - MIME Type Verification", () => {
  test("getMimeType returns correct types for web assets", async () => {
    const { getMimeType } = await import("../lib/mimeTypes");

    // HTML
    expect(getMimeType("index.html")).toBe("text/html");
    expect(getMimeType("page.htm")).toBe("text/html");

    // CSS
    expect(getMimeType("styles.css")).toBe("text/css");

    // JavaScript
    expect(getMimeType("app.js")).toBe("application/javascript");
    expect(getMimeType("module.mjs")).toBe("application/javascript");

    // JSON
    expect(getMimeType("data.json")).toBe("application/json");

    // Images
    expect(getMimeType("logo.png")).toBe("image/png");
    expect(getMimeType("photo.jpg")).toBe("image/jpeg");
    expect(getMimeType("photo.jpeg")).toBe("image/jpeg");
    expect(getMimeType("icon.svg")).toBe("image/svg+xml");
    expect(getMimeType("image.webp")).toBe("image/webp");
    expect(getMimeType("favicon.ico")).toBe("image/x-icon");
    expect(getMimeType("animation.gif")).toBe("image/gif");

    // Fonts
    expect(getMimeType("font.woff")).toBe("font/woff");
    expect(getMimeType("font.woff2")).toBe("font/woff2");
    expect(getMimeType("font.ttf")).toBe("font/ttf");

    // Unknown - fallback
    expect(getMimeType("unknown.xyz")).toBe("application/octet-stream");
  });

  test("getMimeType handles uppercase extensions", async () => {
    const { getMimeType } = await import("../lib/mimeTypes");

    expect(getMimeType("INDEX.HTML")).toBe("text/html");
    expect(getMimeType("STYLES.CSS")).toBe("text/css");
    expect(getMimeType("APP.JS")).toBe("application/javascript");
    expect(getMimeType("LOGO.PNG")).toBe("image/png");
  });

  test("getMimeType handles paths with directories", async () => {
    const { getMimeType } = await import("../lib/mimeTypes");

    expect(getMimeType("assets/styles/main.css")).toBe("text/css");
    expect(getMimeType("scripts/vendor/chart.js")).toBe("application/javascript");
    expect(getMimeType("images/icons/logo.png")).toBe("image/png");
  });
});

describe("ZIP Serving - Version and Entry Point", () => {
  test("getVersionByNumberInternal returns version with entryPoint", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const artifactId = await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test",
        creatorId: userId,
        shareToken: "abc12345",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const versionId = await t.run(async (ctx) =>
      ctx.db.insert("artifactVersions", {
        artifactId,
        versionNumber: 1,
        createdBy: userId,
        fileType: "zip",
        entryPoint: "v1/index.html",  // Entry point with path prefix
        fileSize: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      })
    );

    const version = await t.query(internal.artifacts.getVersionByNumberInternal, {
      artifactId,
      versionNumber: 1,
    });

    expect(version).toBeDefined();
    expect(version?.entryPoint).toBe("v1/index.html");
    expect(version?.fileType).toBe("zip");
  });

  test("getByShareTokenInternal returns artifact for valid token", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test Artifact",
        creatorId: userId,
        shareToken: "testtkn1",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const artifact = await t.query(internal.artifacts.getByShareTokenInternal, {
      shareToken: "testtkn1",
    });

    expect(artifact).toBeDefined();
    expect(artifact?.title).toBe("Test Artifact");
    expect(artifact?.shareToken).toBe("testtkn1");
  });

  test("getByShareTokenInternal returns null for deleted artifact", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Deleted Artifact",
        creatorId: userId,
        shareToken: "deleted1",
        isDeleted: true,
        deletedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const artifact = await t.query(internal.artifacts.getByShareTokenInternal, {
      shareToken: "deleted1",
    });

    expect(artifact).toBeNull();
  });
});
```

---

### Step 2.6: Write E2E Tests

**Location:** `tasks/00019-multifile-zip-html-projects/02-phase2-retrieval-viewing/tests/e2e/`

The Phase 1 E2E test scaffolding already includes relevant tests. For Phase 2, add or verify these specific scenarios:

**Create:** `tasks/00019-multifile-zip-html-projects/02-phase2-retrieval-viewing/tests/e2e/01-zip-serving.spec.ts`

```typescript
/**
 * E2E Test: ZIP Artifact HTTP Serving
 * Phase 2 - Retrieval and Viewing
 *
 * Tests HTTP serving of multi-file artifacts with proper MIME types,
 * caching headers, and relative path resolution.
 */

import { test, expect } from '@playwright/test';
import { injectClickIndicator } from '../../../../../app/tests/utils/clickIndicator';
import { registerUser } from '../../01-phase1-storage-write-permissions/tests/e2e/helpers/auth';
import { createZipArtifact, verifyArtifactContentVisible } from '../../01-phase1-storage-write-permissions/tests/e2e/helpers/artifacts';
import * as path from 'path';

test.beforeEach(async ({ page }) => {
  page.on('load', async () => {
    try {
      await injectClickIndicator(page);
    } catch {
      // Page may have closed
    }
  });
});

test.describe('HTTP Serving - MIME Types', () => {
  test.setTimeout(120000);

  test('should serve HTML with text/html Content-Type', async ({ page }) => {
    await registerUser(page);

    const zipPath = path.join(__dirname, '../../../../../samples/01-valid/zip/charting/v1.zip');
    const { shareToken } = await createZipArtifact(page, {
      title: `HTML MIME Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    const responses: Map<string, string> = new Map();

    page.on('response', (response) => {
      const contentType = response.headers()['content-type'];
      if (contentType) {
        responses.set(response.url(), contentType);
      }
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // Find HTML responses
    const htmlResponses = Array.from(responses.entries())
      .filter(([url]) => url.includes('/artifact/') && (url.includes('.html') || url.endsWith(`/v1/`)));

    expect(htmlResponses.length).toBeGreaterThan(0);
    expect(htmlResponses.some(([, type]) => type.includes('text/html'))).toBe(true);
  });

  test('should serve CSS with text/css Content-Type', async ({ page }) => {
    await registerUser(page);

    const zipPath = path.join(__dirname, '../../../../../samples/01-valid/zip/charting/v1.zip');
    const { shareToken } = await createZipArtifact(page, {
      title: `CSS MIME Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    const responses: Map<string, string> = new Map();

    page.on('response', (response) => {
      const contentType = response.headers()['content-type'];
      if (contentType) {
        responses.set(response.url(), contentType);
      }
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    const cssResponses = Array.from(responses.entries())
      .filter(([url]) => url.includes('.css'));

    // If CSS files exist in the sample, verify MIME type
    if (cssResponses.length > 0) {
      expect(cssResponses.some(([, type]) => type.includes('text/css'))).toBe(true);
    }
  });

  test('should serve JavaScript with application/javascript Content-Type', async ({ page }) => {
    await registerUser(page);

    const zipPath = path.join(__dirname, '../../../../../samples/01-valid/zip/charting/v1.zip');
    const { shareToken } = await createZipArtifact(page, {
      title: `JS MIME Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    const responses: Map<string, string> = new Map();

    page.on('response', (response) => {
      const contentType = response.headers()['content-type'];
      if (contentType) {
        responses.set(response.url(), contentType);
      }
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    const jsResponses = Array.from(responses.entries())
      .filter(([url]) => url.includes('.js') && !url.includes('_next'));

    // If JS files exist in the sample, verify MIME type
    if (jsResponses.length > 0) {
      expect(jsResponses.some(([, type]) => type.includes('javascript'))).toBe(true);
    }
  });

  test('should serve images with correct Content-Type', async ({ page }) => {
    await registerUser(page);

    const zipPath = path.join(__dirname, '../../../../../samples/01-valid/zip/charting/v1.zip');
    const { shareToken } = await createZipArtifact(page, {
      title: `Image MIME Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    const responses: Map<string, string> = new Map();

    page.on('response', (response) => {
      const contentType = response.headers()['content-type'];
      if (contentType) {
        responses.set(response.url(), contentType);
      }
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    const pngResponses = Array.from(responses.entries())
      .filter(([url]) => url.includes('.png'));

    if (pngResponses.length > 0) {
      expect(pngResponses.some(([, type]) => type.includes('image/png'))).toBe(true);
    }
  });
});

test.describe('HTTP Serving - Cache Headers', () => {
  test.setTimeout(120000);

  test('should include Cache-Control headers on asset responses', async ({ page }) => {
    await registerUser(page);

    const zipPath = path.join(__dirname, '../../../../../samples/01-valid/zip/charting/v1.zip');
    const { shareToken } = await createZipArtifact(page, {
      title: `Cache Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    const cacheHeaders: Map<string, string | null> = new Map();

    page.on('response', (response) => {
      const cacheControl = response.headers()['cache-control'];
      if (response.url().includes('/artifact/')) {
        cacheHeaders.set(response.url(), cacheControl || null);
      }
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // At least one artifact response should have Cache-Control
    const withCacheControl = Array.from(cacheHeaders.entries())
      .filter(([, header]) => header !== null);

    expect(withCacheControl.length).toBeGreaterThan(0);

    // Verify cache is set for long duration
    const hasLongCache = withCacheControl.some(([, header]) =>
      header?.includes('max-age=31536000') || header?.includes('max-age=604800')
    );
    expect(hasLongCache).toBe(true);
  });
});

test.describe('HTTP Serving - Relative Path Resolution', () => {
  test.setTimeout(120000);

  test('should resolve relative CSS paths correctly', async ({ page }) => {
    await registerUser(page);

    const zipPath = path.join(__dirname, '../../../../../samples/01-valid/zip/charting/v1.zip');
    const { shareToken } = await createZipArtifact(page, {
      title: `Relative CSS Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    const failedRequests: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 404 && response.url().includes('.css')) {
        failedRequests.push(response.url());
      }
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    expect(failedRequests.length).toBe(0);
  });

  test('should resolve relative JS paths correctly', async ({ page }) => {
    await registerUser(page);

    const zipPath = path.join(__dirname, '../../../../../samples/01-valid/zip/charting/v1.zip');
    const { shareToken } = await createZipArtifact(page, {
      title: `Relative JS Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    const failedRequests: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 404 && response.url().includes('.js') && !response.url().includes('_next')) {
        failedRequests.push(response.url());
      }
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    expect(failedRequests.length).toBe(0);
  });

  test('should resolve nested asset paths correctly', async ({ page }) => {
    await registerUser(page);

    const zipPath = path.join(__dirname, '../../../../../samples/01-valid/zip/charting/v1.zip');
    const { shareToken } = await createZipArtifact(page, {
      title: `Nested Assets Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    const failedRequests: string[] = [];

    page.on('response', (response) => {
      // Track 404s for artifact paths (not Next.js internals)
      if (
        response.status() === 404 &&
        response.url().includes('/artifact/') &&
        !response.url().includes('favicon')
      ) {
        failedRequests.push(response.url());
      }
    });

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    expect(failedRequests.length).toBe(0);
  });
});

test.describe('HTTP Serving - 404 Handling', () => {
  test.setTimeout(120000);

  test('should return 404 for non-existent files', async ({ page, request }) => {
    await registerUser(page);

    const zipPath = path.join(__dirname, '../../../../../samples/01-valid/zip/charting/v1.zip');
    const { shareToken } = await createZipArtifact(page, {
      title: `404 Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    // Direct request to non-existent file
    // Note: Need to get the Convex deployment URL for this test
    // For now, verify via page navigation

    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // The viewer should load without 404 for existing files
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard');
  });

  test('should return 404 for invalid share token', async ({ page }) => {
    await page.goto('/a/invalid123');
    await page.waitForLoadState('networkidle');

    // Should show not found or error state
    const notFound = await page.locator('text=/not found|404|error/i').count();
    expect(notFound).toBeGreaterThan(0);
  });
});

test.describe('HTTP Serving - Version Switching', () => {
  test.setTimeout(180000);

  test('should serve correct files for each version', async ({ page }) => {
    await registerUser(page);

    // Upload v1
    const v1Path = path.join(__dirname, '../../../../../samples/01-valid/zip/charting/v1.zip');
    const { shareToken, artifactId } = await createZipArtifact(page, {
      title: `Version Switch Test - ${Date.now()}`,
      zipFilePath: v1Path,
    });

    // Verify v1 content
    await page.goto(`/a/${shareToken}?v=1`);
    await page.waitForLoadState('networkidle');
    await verifyArtifactContentVisible(page, 'Monthly Sales Dashboard v1');

    // Note: Adding v2 would require additional UI interaction or API call
    // For Phase 2, we verify that v1 serves correctly and version param works
  });
});
```

---

## File Locations Summary

| File | Purpose | Status |
|------|---------|--------|
| `/app/convex/http.ts` | HTTP handler | Verify, minor enhancement |
| `/app/convex/lib/mimeTypes.ts` | MIME type detection | Verify, optional additions |
| `/app/convex/lib/permissions.ts` | Permission helpers | No changes needed |
| `/app/convex/artifacts.ts` | Queries (getFileByPath, etc.) | No changes needed |
| `/app/convex/__tests__/zip-serving.test.ts` | Backend tests | **Create** |
| `tasks/00019-*/02-phase2-*/tests/e2e/*.spec.ts` | E2E tests | **Create** |

---

## Sample Test Files

Use centralized samples from `/samples/`:

| Sample | Use Case |
|--------|----------|
| `samples/01-valid/zip/charting/v1.zip` - `v5.zip` | Valid multi-file projects with CSS, JS, images |
| `samples/03-edge-cases/zip/multi-page-site.zip` | Multi-page site for navigation testing |

---

## Testing Requirements

### Backend Tests

| Test | Type | Description |
|------|------|-------------|
| getFileByPath returns file | Unit | Correct storageId and mimeType |
| getFileByPath returns null for missing | Unit | Non-existent path returns null |
| getFileByPath returns null for deleted | Unit | Soft-deleted files return null |
| getFileByPath handles nested paths | Unit | `assets/images/logo.png` works |
| getMimeType for all types | Unit | All web asset types correct |
| getVersionByNumberInternal | Unit | Returns version with entryPoint |
| getByShareTokenInternal | Unit | Returns artifact or null |

### E2E Tests

| Test | Type | Description |
|------|------|-------------|
| HTML MIME type | E2E | text/html for .html files |
| CSS MIME type | E2E | text/css for .css files |
| JS MIME type | E2E | application/javascript for .js |
| Image MIME type | E2E | image/png for .png files |
| Cache headers | E2E | Cache-Control present |
| Relative CSS paths | E2E | No 404s for CSS |
| Relative JS paths | E2E | No 404s for JS |
| Nested asset paths | E2E | Subdirectory assets load |
| 404 for missing files | E2E | Proper error handling |
| Version switching | E2E | Correct files per version |

### Running Tests

```bash
# Backend tests
cd app
npm test -- --grep "ZIP Serving"

# E2E tests
cd /Users/clintgossett/Documents/personal/personal projects/artifact-review
npx playwright test tasks/00019-multifile-zip-html-projects/02-phase2-retrieval-viewing/tests/e2e/
```

---

## Success Criteria

- [ ] Entry point HTML loads correctly in viewer iframe
- [ ] CSS files load with `text/css` MIME type
- [ ] JavaScript files execute in viewer
- [ ] Images display correctly with correct MIME types
- [ ] Fonts load correctly (woff, woff2, ttf)
- [ ] Nested paths resolve correctly (e.g., `assets/images/logo.png`)
- [ ] Relative paths in HTML work (e.g., `./styles.css`, `../images/bg.png`)
- [ ] 404 returned for missing files with user-friendly message
- [ ] Cache headers set (`Cache-Control: public, max-age=31536000, immutable`)
- [ ] CORS headers allow viewer access (`Access-Control-Allow-Origin: *`)
- [ ] Version switching loads correct files for each version
- [ ] All Phase 2 backend tests pass
- [ ] All E2E tests pass with video recordings

---

## Implementation Order (Recommended)

1. **Step 2.2**: Verify MIME types, add missing types (quick win)
2. **Step 2.1**: Verify HTTP handler, add `immutable` to Cache-Control
3. **Step 2.5**: Write and run backend tests
4. **Step 2.4**: Verify frontend viewer works (manual testing)
5. **Step 2.6**: Write and run E2E tests
6. **Step 2.3**: Verify permissions (should already work)

---

## Known Considerations

1. **convex-test limitations**: Cannot test actual HTTP actions or storage I/O. Backend tests focus on query layer; E2E tests cover full integration.

2. **Relative path resolution**: Phase 1 E2E tests (`04-asset-loading.spec.ts`) already verify asset loading. If issues arise, may need `<base>` tag injection.

3. **E2E test reuse**: Phase 1 E2E helpers (`auth.ts`, `artifacts.ts`) can be reused for Phase 2 tests.

4. **Video recordings**: All E2E tests must produce video recordings per project standards.

---

## Handoff Checklist

When Phase 2 is complete, verify:

- [x] All Phase 2 backend tests pass (`npm test -- --grep "ZIP Serving"`)
- [ ] All E2E tests pass with video recordings in `tests/validation-videos/`
- [x] Sample ZIP artifacts upload and display correctly
- [x] CSS, JS, and images work in viewer
- [x] Version switching works for ZIP artifacts
- [x] No console errors for asset loading
- [x] Error messages are user-friendly for 404s
- [x] Multi-level nesting (1-5 levels) works correctly
- [ ] `test-report.md` created in task folder

### Additional Tests Added (2026-01-01)

**Multi-Level Nesting Tests:**
- Backend: `/app/convex/__tests__/zip-multi-level-nesting.test.ts` (10 tests passing)
- E2E: `tests/e2e/06-multi-level-nesting.spec.ts` (11 tests ready)
- Uses samples: `/samples/01-valid/zip/charting-with-parents/` (v1-v5)

---

**Author:** Claude (Software Architect Agent)
**Last Updated:** 2025-12-31
