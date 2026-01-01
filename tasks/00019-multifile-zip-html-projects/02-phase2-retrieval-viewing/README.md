# Subtask 02: Phase 2 - Retrieval and Viewing

**Parent Task:** 00019 - Upload and View Multi-file HTML Projects via ZIP
**Status:** Pending
**Created:** 2025-12-31

---

## Objective

Enable HTTP serving of multi-file artifacts with proper MIME types, relative path resolution, caching headers, and read permission checks. Ensure the frontend viewer correctly renders multi-file HTML projects.

---

## Steps

### Step 2.1: Update HTTP Handler for Multi-file Paths

**File:** `/app/convex/http.ts`

Verify and enhance the existing HTTP handler for multi-file artifact serving:

**URL Structure:** `/artifact/{shareToken}/v{version}/{filePath}`

Examples:
- `/artifact/abc123/v1/index.html` - Entry point
- `/artifact/abc123/v1/assets/styles.css` - CSS file
- `/artifact/abc123/v1/scripts/app.js` - JavaScript
- `/artifact/abc123/v1/images/logo.png` - Image

**Key Implementation Points:**

1. **Parse path segments:** Handle nested paths correctly (e.g., `assets/images/logo.png`)
2. **Version format validation:** Expect `v1`, `v2`, etc.
3. **Entry point fallback:** If no `filePath` provided, use `version.entryPoint`
4. **URL decoding:** Handle URL-encoded path segments
5. **Content-Type:** Return correct MIME type from `artifactFiles.mimeType`
6. **Caching headers:** `Cache-Control: public, max-age=31536000, immutable`
7. **CORS headers:** Allow cross-origin access for viewer

```typescript
// Response headers for serving files
return new Response(fileBuffer, {
  status: 200,
  headers: {
    "Content-Type": file.mimeType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=31536000, immutable",
  },
});
```

---

### Step 2.2: Add Missing MIME Types

**File:** `/app/convex/lib/mimeTypes.ts`

Ensure comprehensive MIME type coverage for web assets:

```typescript
export function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    // HTML
    'html': 'text/html',
    'htm': 'text/html',

    // CSS
    'css': 'text/css',

    // JavaScript
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'ts': 'application/typescript',

    // Data formats
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv',

    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
    'avif': 'image/avif',

    // Fonts
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'eot': 'application/vnd.ms-fontobject',

    // Documents
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',

    // Archives
    'zip': 'application/zip',

    // Source maps (for debugging)
    'map': 'application/json',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}
```

---

### Step 2.3: Read Permission Check for HTTP Routes

**File:** `/app/convex/lib/permissions.ts`

The existing permission model should already be correct:

- **Owner:** Full access
- **Reviewer:** View access (via `artifactReviewers` table)
- **Public:** View access via shareToken (no auth required)

The HTTP route uses internal queries that bypass permission checks by design for public share token access.

**Verify:** No code changes needed unless testing reveals issues.

---

### Step 2.4: Frontend Viewer Verification

The frontend viewer should work with multi-file artifacts since:
1. It uses `getEntryPointContent` query to get the main file URL
2. Relative paths in HTML resolve to the HTTP endpoint

**Verification Steps:**

1. Load artifact viewer with ZIP artifact
2. Verify CSS files load correctly
3. Verify JavaScript files execute
4. Verify images display
5. Verify relative paths in CSS (e.g., `url(../images/bg.png)`) resolve correctly

**If Issues Occur:**
- May need to inject a `<base>` tag
- May need to rewrite URLs in HTML

---

### Step 2.5: Write Phase 2 Backend Tests

**File:** `/app/convex/__tests__/zip-serving.test.ts`

Create tests covering:

| Test | Description |
|------|-------------|
| Entry point serving | index.html served with text/html |
| CSS serving | .css files with text/css |
| JavaScript serving | .js files with application/javascript |
| Image serving | .png, .jpg with correct types |
| Font serving | .woff2, .ttf with correct types |
| Nested paths | assets/images/logo.png accessible |
| 404 for missing | Non-existent files return 404 |
| Cache headers | Cache-Control headers set correctly |
| CORS headers | Access-Control headers set correctly |

---

### Step 2.6: Write E2E Tests

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/tasks/00019-multifile-zip-html-projects/tests/e2e/zip-artifact.spec.ts`

Create E2E tests with video recording:

```typescript
import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Multi-file ZIP Artifact Upload and Viewing", () => {
  test("upload ZIP and view in browser", async ({ page }) => {
    // 1. Navigate to app
    // 2. Login
    // 3. Click upload button
    // 4. Select ZIP file from samples
    // 5. Fill in title
    // 6. Submit
    // 7. Wait for processing
    // 8. Verify artifact displays
  });

  test("CSS styles are applied correctly", async ({ page }) => {
    // Navigate to ZIP artifact
    // Check computed styles match expected
  });

  test("JavaScript executes correctly", async ({ page }) => {
    // Navigate to ZIP artifact with interactive elements
    // Verify JS functionality works
  });

  test("version switching loads correct files", async ({ page }) => {
    // Upload v1, then v2
    // Switch between versions
    // Verify correct content displays
  });
});
```

**Important:** All E2E tests MUST produce video recordings (mandatory per project standards).

---

## File Locations

| File | Purpose |
|------|---------|
| `/app/convex/http.ts` | HTTP handler for serving files |
| `/app/convex/lib/mimeTypes.ts` | MIME type detection |
| `/app/convex/lib/permissions.ts` | Permission verification |
| `/app/convex/__tests__/zip-serving.test.ts` | Backend serving tests |
| `tasks/00019-*/tests/e2e/zip-artifact.spec.ts` | E2E tests |

---

## Sample Test Files

Use centralized samples from `/samples/`:

| Sample | Use Case |
|--------|----------|
| `samples/01-valid/zip/charting/v1.zip` - `v5.zip` | Valid multi-file projects |
| `samples/03-edge-cases/zip/multi-page-site.zip` | No index.html edge case |

---

## Testing Requirements

### Backend Integration Tests

Location: `/app/convex/__tests__/zip-serving.test.ts`

| Test | Type | Description |
|------|------|-------------|
| Serve entry point | Integration | index.html served with text/html |
| Serve CSS | Integration | .css files with text/css |
| Serve JS | Integration | .js files with application/javascript |
| Serve images | Integration | .png, .jpg with correct types |
| Serve fonts | Integration | .woff2, .ttf with correct types |
| Nested paths | Integration | assets/images/logo.png accessible |
| 404 for missing | Integration | Non-existent files return 404 |
| Cache headers | Integration | Cache-Control headers set |
| CORS headers | Integration | Access-Control headers set |

### E2E Tests

Location: `tasks/00019-multifile-zip-html-projects/tests/e2e/zip-artifact.spec.ts`

| Test | Type | Description |
|------|------|-------------|
| Upload and view | E2E | Full upload-to-view flow |
| CSS applied | E2E | Verify styles render correctly |
| JS executes | E2E | Verify interactivity works |
| Version switch | E2E | Correct files per version |

### Running Tests

```bash
# Backend tests
cd app
npm test -- --grep "ZIP Serving"

# E2E tests (from project root)
npx playwright test tasks/00019-multifile-zip-html-projects/tests/e2e/
```

---

## Success Criteria

- [ ] Entry point HTML loads correctly in viewer
- [ ] CSS files load with correct MIME type (text/css)
- [ ] JavaScript files execute in viewer
- [ ] Images display correctly
- [ ] Fonts load correctly
- [ ] Nested paths resolve correctly (e.g., assets/images/logo.png)
- [ ] Relative paths in HTML/CSS work (e.g., ./styles.css, ../images/bg.png)
- [ ] 404 returned for missing files
- [ ] Cache headers set for performance
- [ ] CORS headers allow viewer access
- [ ] Version switching loads correct files
- [ ] All Phase 2 backend tests pass
- [ ] All E2E tests pass with video recordings

---

## Implementation Order (Recommended)

1. Step 2.2: Add missing MIME types (quick win)
2. Step 2.1: Verify/enhance HTTP handler
3. Step 2.4: Verify frontend viewer works
4. Step 2.5: Write and run Phase 2 backend tests
5. Step 2.6: Write and run E2E tests

---

## Notes

- The HTTP handler uses internal queries that bypass permission checks for share token access
- Cache headers are set aggressively (1 year) because content is immutable
- CORS headers are permissive (*) because artifacts are designed to be embeddable
- If relative paths break, may need `<base>` tag injection
- Video recordings are mandatory for all E2E tests

---

## Handoff Checklist

When Phase 2 is complete, verify:

- [ ] All Phase 2 tests pass
- [ ] E2E tests pass with video recordings in `tests/validation-videos/`
- [ ] Sample ZIP artifacts upload and display correctly
- [ ] CSS, JS, and images work in viewer
- [ ] Version switching works for ZIP artifacts
- [ ] Error messages are user-friendly for 404s
- [ ] `test-report.md` created in task folder

---

**Author:** Claude (Software Architect Agent)
**Last Updated:** 2025-12-31
