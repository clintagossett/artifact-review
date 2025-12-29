# Sample Artifacts for Testing

This directory contains sample files for testing artifact upload and validation in Task 10.

## Directory Structure

```
samples/
├── 01-valid/              # Valid artifacts that should pass all validation
│   ├── zip/               # ZIP archives with HTML projects
│   ├── html/              # Standalone HTML files
│   └── markdown/          # Markdown documents
├── 02-warnings/           # Valid but should trigger warnings
│   ├── html/              # HTML with missing local dependencies
│   └── markdown/          # Markdown with local file references
├── 03-edge-cases/         # Valid edge cases to test special scenarios
│   └── zip/               # ZIP without index.html, nested structures, etc.
└── 04-invalid/            # Should fail validation
    ├── empty/             # Empty files
    ├── wrong-type/        # Non-HTML/ZIP/MD files
    └── too-large/         # Files exceeding size limits
```

---

## 01-valid/ - Valid Artifacts

### ZIP Archives (`01-valid/zip/`)

#### `charting/`
**Description:** Multi-file HTML dashboard with charts - 5 versions for testing version comparison

**Purpose:** Tests artifact versioning workflow where the same artifact is iterated over multiple versions

**Structure:**
```
charting/
├── index.html             # Navigation page for local viewing
├── v1.zip → v5.zip        # ZIP files ready for upload (3.4-3.9KB each)
└── v1/ → v5/              # Source folders (extracted)
    ├── index.html         # Entry point with version in H1 (auto-detected)
    ├── app.js
    └── assets/
        ├── chart-data.json
        └── logo.png
```

**All versions share:**
- Same document title: "Monthly Sales Dashboard"
- Version number in H1: "Monthly Sales Dashboard v1" through "v5"
- Identical file structure (4 files each)
- Same dependencies (Chart.js from CDN)

**Expected Behavior:**
- ✅ Extract successfully
- ✅ Auto-detect `index.html` as entry point
- ✅ Store 4 files per version in `artifactFiles` table
- ✅ Serve via HTTP proxy at `/a/{token}/v1/app.js`, etc.
- ✅ Version comparison UI shows "v1" → "v5" clearly in rendered output

**File Count:** 4 files per version
**Total Size:** ~3.5-4KB per version (compressed)
**Entry Point:** `index.html` (auto-detected)
**Versions:** 5 (v1-v5)

---

### Standalone HTML (`01-valid/html/`)

#### `simple-html/`
**Description:** Self-contained HTML pages - 5 versions for testing version comparison

**Purpose:** Tests artifact versioning workflow with single-file HTML uploads (most common AI agent output format)

**Structure:**
```
simple-html/
├── index.html             # Navigation page for local viewing
└── v1/ → v5/              # 5 versions of the same document
    └── index.html         # Self-contained HTML with version in H1
```

**All versions share:**
- Same document title: "Welcome Page"
- Version number in H1: "Welcome Page v1" through "v5"
- Identical structure and styling
- Same external image (from placeholder CDN)

**Expected Behavior:**
- ✅ Upload directly as single HTML file (no ZIP needed)
- ✅ Store directly in `htmlContent` field
- ✅ No external dependencies (except CDN image)
- ✅ No warnings
- ✅ Version comparison UI shows "v1" → "v5" clearly in rendered output

**File Size:** ~1.2KB each
**Dependencies:** Picsum placeholder image (external CDN, allowed)
**Versions:** 5 (v1-v5)

---

#### `interactive-ui-components-demo.html`
**Description:** Interactive HTML with tabs and accordion components

**Purpose:** Testing artifact with complex UI interactions (tabs, accordions, hidden content) - matches the mock data in DocumentViewer for commenting feature testing

**Features:**
- Tabs component (Overview, Features, Pricing, Support)
- Accordion component (FAQs with expand/collapse)
- JavaScript for tab switching and accordion toggling
- All elements have IDs for comment targeting
- Gradient header styling
- Hidden content testing (comments on inactive tabs, collapsed accordions)

**Expected Behavior:**
- ✅ Upload as single HTML file
- ✅ All JavaScript interactions work in iframe
- ✅ Can comment on visible and hidden elements
- ✅ Tabs switch correctly
- ✅ Accordions expand/collapse
- ✅ Element IDs match mock comments for testing

**File Size:** ~5.5KB
**Dependencies:** None (fully self-contained)
**Use Case:** Testing commenting on interactive HTML with hidden content

---

### Markdown (`01-valid/markdown/`)

#### `product-spec/`
**Description:** Product specification documents - 5 versions for testing version comparison

**Purpose:** Tests artifact versioning workflow with markdown documents (common for AI-generated documentation)

**Structure:**
```
product-spec/
└── v1.md → v5.md          # 5 versions of the same document
```

**All versions share:**
- Same document title: "Product Specification: Dashboard Component"
- Version number in H1: "Product Specification: Dashboard Component v1" through "v5"
- Version metadata: "Version: 1.0" through "5.0"
- Identical content structure

**Features:**
- Code blocks with syntax highlighting (TypeScript, JavaScript)
- Tables
- Task lists
- External links (allowed)
- NO local file references

**Expected Behavior:**
- ✅ Upload directly as markdown file
- ✅ Store in `markdownContent` field
- ✅ Render with GitHub-flavored markdown
- ✅ Syntax highlighting for code blocks
- ✅ No warnings (all links are external)
- ✅ Version comparison UI shows "v1" → "v5" clearly in rendered output

**File Size:** ~1.9KB each
**Versions:** 5 (v1-v5)

---

## 02-warnings/ - Valid with Warnings

### HTML with Dependencies (`02-warnings/html/`)

#### `landing-with-deps.html`
**Description:** HTML file with missing local dependencies

**Missing Dependencies:**
- `./styles/custom.css`
- `../shared/theme.css`
- `./assets/logo.svg`
- `/images/screenshot.png`
- `./js/app.js`
- `../shared/analytics.js`

**Expected Behavior:**
- ✅ File is valid HTML
- ⚠️ Show warning: "We detected 6 missing files. Consider uploading as ZIP."
- ✅ User can choose: [Upload as ZIP] or [Continue Anyway]
- ✅ If user continues, store in `htmlContent` (missing deps remain broken)

**External Resources (OK):**
- Bootstrap CSS from CDN
- Placeholder images from external URL

---

### Markdown with Local References (`02-warnings/markdown/`)

#### `documentation-with-refs.md`
**Description:** Documentation with local file and image references

**Local References:**
- 9 local file references (images, markdown links, config files)
- Mix of relative paths: `./`, `../`, `../../`

**Expected Behavior:**
- ✅ File is valid markdown
- ⚠️ Show warning: "We detected 9 local file references. Consider uploading as ZIP."
- ✅ User can choose: [Upload as ZIP] or [Continue Anyway]
- ✅ External links and images work fine

---

## 03-edge-cases/ - Edge Cases

### ZIP Edge Cases (`03-edge-cases/zip/`)

#### `multi-page-site.zip`
**Description:** Multi-page site WITHOUT index.html or main.html

**Structure:**
```
multi-page-site/
├── home.html
├── about.html
└── pages/
    └── contact.html
```

**Expected Behavior:**
- ✅ Extract successfully
- ❓ No `index.html` or `main.html` found
- 📝 Prompt user: "Select main HTML file:"
  - [ ] home.html
  - [ ] about.html
  - [ ] pages/contact.html
- ✅ User selects → Store as `entryPoint`
- ✅ Serve selected file when loading `/a/{token}/v1/`

**File Count:** 3 HTML files
**Entry Point:** User-selected

---

## 04-invalid/ - Should Fail Validation

### Empty Files (`04-invalid/empty/`)

#### `empty.html`
**Description:** Completely empty file (0 bytes)

**Expected Behavior:**
- ❌ Reject: "File is empty"
- HTTP 400 error

---

### Wrong File Type (`04-invalid/wrong-type/`)

#### `document.txt`
**Description:** Plain text file (not HTML/ZIP/MD)

**Expected Behavior:**
- ❌ Reject: "Invalid file type. Please upload HTML, ZIP, or Markdown files only."
- HTTP 400 error

#### `presentation-with-video.zip` (generated)
**Description:** ZIP containing forbidden file types (REAL video files)

**Note:** This file is **generated** by running `./generate.sh` in the `wrong-type/` directory. Requires `ffmpeg`.

**Structure:**
```
presentation-with-video.zip (~110KB)
├── index.html          # Valid
├── styles.css          # Valid
└── media/
    ├── demo.mov        # FORBIDDEN - REAL video (67KB, 3s, H.264)
    ├── intro.mp4       # FORBIDDEN - REAL video (42KB, 2s, H.264)
    └── outro.avi       # FORBIDDEN - REAL video (28KB, 1s, MPEG-4)
```

**Video Details:**
- All videos are **REAL, playable** files generated with ffmpeg
- Proper MIME types: `video/quicktime`, `video/mp4`, `video/x-msvideo`
- Valid codecs, metadata, and file headers
- Tests both extension AND MIME type validation

**Expected Behavior:**
- ❌ Detect forbidden file extensions during ZIP extraction
- ❌ Detect forbidden MIME types (`video/*`)
- ❌ Reject: "ZIP contains unsupported file types: .mov, .mp4, .avi"
- ❌ HTTP 400 error with helpful message
- Note: File size is UNDER limit - rejection is based on TYPE, not size

**How to Generate:**
```bash
cd samples/04-invalid/wrong-type
./generate.sh  # Requires: brew install ffmpeg
```

---

### Too Large (`04-invalid/too-large/`)

**Note:** This file is **generated** by running `./generate.sh` in the `too-large/` directory.

#### `huge.zip` (generated)
**Description:** ZIP exceeding 100MB size limit (simulates PowerPoint export with video)

**Structure:**
```
huge.zip (~155MB)
└── presentation-export/
    ├── index.html
    ├── styles.css
    └── media/
        ├── demo-video.mov    # 155MB
        ├── slide1.png        # 50KB
        ├── slide2.png        # 50KB
        └── slide3.png        # 50KB
```

**Expected Behavior:**
- ❌ Frontend validation blocks upload
- ❌ Backend validation rejects if frontend bypassed
- ❌ Error: "File exceeds maximum size of 100MB"
- HTTP 400 error

**How to Generate:**
```bash
cd samples/04-invalid/too-large
./generate.sh
```

---

## Testing Checklist

### Backend API Validation

- [ ] **ZIP Upload**
  - [ ] Valid ZIP extracts successfully
  - [ ] Auto-detect index.html
  - [ ] Prompt user when no index.html
  - [ ] Store files in `artifactFiles` table
  - [ ] Reject ZIP > 100MB
  - [ ] Reject ZIP with > 500 files

- [ ] **HTML Upload**
  - [ ] Valid HTML stores in `htmlContent`
  - [ ] Detect missing dependencies, show warning
  - [ ] Allow external CDN URLs
  - [ ] Reject HTML > 5MB

- [ ] **Markdown Upload**
  - [ ] Valid markdown stores in `markdownContent`
  - [ ] Detect local file refs, show warning
  - [ ] Allow external links/images
  - [ ] Reject markdown > 1MB

- [ ] **General Validation**
  - [ ] Reject empty files
  - [ ] Reject wrong file types
  - [ ] Enforce file size limits
  - [ ] Proper error messages

### File Serving (HTTP Proxy)

- [ ] Serve ZIP files at `/a/{token}/v{version}/{filePath}`
- [ ] Serve HTML content
- [ ] Render markdown to HTML
- [ ] Correct Content-Type headers
- [ ] 404 for missing files
- [ ] Soft-deleted artifacts show graceful message

---

## Usage in Tests

### E2E Tests

```typescript
// Test valid ZIP upload
const zipFile = await readFile('samples/01-valid/zip/charting/v1.zip');
await uploadArtifact(zipFile);
expect(response.status).toBe(200);
expect(response.entryPoint).toBe('index.html');

// Test HTML with dependencies warning
const htmlFile = await readFile('samples/02-warnings/html/landing-with-deps.html');
const result = await validateUpload(htmlFile);
expect(result.warnings).toHaveLength(6);
expect(result.warnings[0]).toContain('missing files');

// Test edge case: no index.html
const edgeCaseZip = await readFile('samples/03-edge-cases/zip/multi-page-site.zip');
const result = await uploadArtifact(edgeCaseZip);
expect(result.needsEntryPointSelection).toBe(true);
expect(result.htmlFiles).toEqual(['home.html', 'about.html', 'pages/contact.html']);
```

### Backend Unit Tests

```typescript
// Test file size validation
const tooLarge = createMockFile('huge.html', 6 * 1024 * 1024);
await expect(validateFileSize(tooLarge, 'html')).rejects.toThrow('exceeds 5MB limit');

// Test file type validation
const wrongType = createMockFile('doc.txt', 100);
await expect(validateFileType(wrongType)).rejects.toThrow('Invalid file type');
```

---

## Adding New Samples

When adding new sample files:

1. **Place in correct category:**
   - `01-valid/` - Should pass all validation
   - `02-warnings/` - Valid but triggers warnings
   - `03-edge-cases/` - Tests special scenarios
   - `04-invalid/` - Should fail validation

2. **Document in this README:**
   - File structure
   - Expected behavior
   - File size
   - Dependencies (if any)

3. **Reference in tests:**
   - Update E2E test suite
   - Add to backend validation tests

---

## File Size Reference

| Sample | Type | Size | Limit | Status |
|--------|------|------|-------|--------|
| charting v1.zip | ZIP | 3.9KB | 100MB | ✅ Valid |
| charting v2.zip | ZIP | 3.4KB | 100MB | ✅ Valid |
| charting v3.zip | ZIP | 3.9KB | 100MB | ✅ Valid |
| charting v4.zip | ZIP | 3.9KB | 100MB | ✅ Valid |
| charting v5.zip | ZIP | 3.9KB | 100MB | ✅ Valid |
| simple-html v1 | HTML | 1.2KB | 5MB | ✅ Valid |
| simple-html v2 | HTML | 1.2KB | 5MB | ✅ Valid |
| simple-html v3 | HTML | 1.2KB | 5MB | ✅ Valid |
| simple-html v4 | HTML | 1.2KB | 5MB | ✅ Valid |
| simple-html v5 | HTML | 1.2KB | 5MB | ✅ Valid |
| product-spec v1 | Markdown | 1.9KB | 1MB | ✅ Valid |
| product-spec v2 | Markdown | 1.9KB | 1MB | ✅ Valid |
| product-spec v3 | Markdown | 1.9KB | 1MB | ✅ Valid |
| product-spec v4 | Markdown | 1.9KB | 1MB | ✅ Valid |
| product-spec v5 | Markdown | 1.9KB | 1MB | ✅ Valid |
| landing-with-deps.html | HTML | 2.1KB | 5MB | ⚠️ Warnings |
| documentation-with-refs.md | Markdown | 1.5KB | 1MB | ⚠️ Warnings |
| multi-page-site.zip | ZIP | 2.1KB | 100MB | ✅ Edge case |
| empty.html | HTML | 0B | - | ❌ Invalid |
| document.txt | TXT | 0.1KB | - | ❌ Invalid |
| huge.zip (generated) | ZIP | 155MB | 100MB | ❌ Too large |
| presentation-with-video.zip (generated) | ZIP | 110KB | 100MB | ❌ Forbidden types (real videos) |

**Note:** Files marked "(generated)" must be created by running `./generate.sh` in their respective directories.

---

**Last Updated:** 2025-12-27
**Tasks:** #10 (Artifact Upload & Creation), #15 (Fix ZIP Artifact Viewing)
