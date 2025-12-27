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
**Description:** Multi-file HTML dashboard with charts

**Structure:**
```
charting/
├── v1.zip                 # Version 1 as ZIP (3.8KB compressed)
├── v1/                    # Version 1 extracted
│   ├── index.html         # Entry point (auto-detected)
│   ├── app.js
│   └── assets/
│       ├── chart-data.json
│       └── logo.png
├── v2.zip                 # Version 2 as ZIP
└── v2/                    # Version 2 extracted
    └── (same structure)
```

**Expected Behavior:**
- ✅ Extract successfully
- ✅ Auto-detect `index.html` as entry point
- ✅ Store 4 files in `artifactFiles` table
- ✅ Serve via HTTP proxy at `/a/{token}/v1/app.js`, etc.

**File Count:** 4 files
**Total Size:** ~4.5KB (extracted)
**Entry Point:** `index.html` (auto-detected)

---

### Standalone HTML (`01-valid/html/`)

#### `simple-html/`
**Description:** Simple self-contained HTML pages

**Structure:**
```
simple-html/
├── index.html             # Latest version
├── v1/index.html          # Version 1
└── v2/index.html          # Version 2
```

**Expected Behavior:**
- ✅ Store directly in `htmlContent` field
- ✅ No external dependencies
- ✅ No warnings

**File Size:** ~1-2KB each
**Dependencies:** None (fully self-contained)

---

### Markdown (`01-valid/markdown/`)

#### `product-spec.md`
**Description:** Product specification document with GitHub-flavored markdown

**Features:**
- Code blocks with syntax highlighting
- Tables
- Task lists
- External links (allowed)
- NO local file references

**Expected Behavior:**
- ✅ Store in `markdownContent` field
- ✅ Render with GitHub-flavored markdown
- ✅ Syntax highlighting for code blocks
- ✅ No warnings (all links are external)

**File Size:** ~1.8KB

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

---

### Too Large (`04-invalid/too-large/`)

**Note:** These files need to be generated programmatically for testing.

**Test Cases:**
- `huge.html` - 6MB HTML (exceeds 5MB limit)
- `huge.md` - 2MB Markdown (exceeds 1MB limit)
- `huge.zip` - 150MB ZIP (exceeds 100MB limit)

**Expected Behavior:**
- ❌ Frontend validation blocks upload
- ❌ Backend validation rejects if frontend bypassed
- Error: "File exceeds size limit"

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
| charting v1.zip | ZIP | 3.8KB | 100MB | ✅ Valid |
| simple-html/v1 | HTML | 1.2KB | 5MB | ✅ Valid |
| product-spec.md | Markdown | 1.8KB | 1MB | ✅ Valid |
| landing-with-deps.html | HTML | 2.1KB | 5MB | ⚠️ Warnings |
| documentation-with-refs.md | Markdown | 1.5KB | 1MB | ⚠️ Warnings |
| multi-page-site.zip | ZIP | 2.1KB | 100MB | ✅ Edge case |
| empty.html | HTML | 0B | - | ❌ Invalid |
| document.txt | TXT | 0.1KB | - | ❌ Invalid |

---

**Last Updated:** 2025-12-26
**Task:** 10 - Artifact Upload & Creation
