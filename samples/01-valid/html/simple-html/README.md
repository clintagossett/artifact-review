# Simple HTML Sample - Multi-Version Artifact

## Purpose

This sample demonstrates **artifact versioning with single-file HTML uploads** - the most common format for AI agent outputs (Claude Artifacts, ChatGPT Canvas, etc.).

## What This Tests

- **Version comparison UI:** All 5 versions have the same base title but different version numbers
- **Single-file HTML handling:** Self-contained pages with no external dependencies (except allowed CDN)
- **Version identification:** H1 heading clearly shows "Welcome Page v1" through "v5" for easy visual confirmation
- **Real-world use case:** Mimics AI-generated HTML artifacts that are fully self-contained

## Structure

```
simple-html/
├── README.md              # This file
├── index.html             # Local navigation page (for development only)
│
└── v1/ → v5/              # 5 versions of the same document
    └── index.html         # Self-contained HTML file with version in H1
```

## For AI Agents

**When testing artifact upload:**
1. Upload each `index.html` file directly (no ZIP needed)
2. Upload them as separate versions of the same artifact
3. Verify the H1 heading displays the correct version when rendered
4. Test version comparison between any two versions

**File paths for upload:**
- `samples/01-valid/html/simple-html/v1/index.html`
- `samples/01-valid/html/simple-html/v2/index.html`
- `samples/01-valid/html/simple-html/v3/index.html`
- `samples/01-valid/html/simple-html/v4/index.html`
- `samples/01-valid/html/simple-html/v5/index.html`

**When modifying samples:**
1. Edit the version files directly (`v1/index.html` through `v5/index.html`)
2. Ensure H1 format remains: `<h1>Welcome Page v#</h1>`
3. Keep all versions identical except for the version number in H1

## Expected Behavior

### Upload & Storage
- ✅ Upload as single HTML file (no ZIP extraction needed)
- ✅ Store directly in `htmlContent` field
- ✅ No warnings (external CDN images are allowed)

### Rendering
- ✅ Page renders with logo from Picsum CDN
- ✅ H1 clearly shows version number (e.g., "Welcome Page v3")
- ✅ Clean, simple layout for easy visual verification

### Version Comparison
- ✅ User can select any two versions to compare
- ✅ Version numbers visible in rendered previews
- ✅ Testers can easily identify which version they're viewing

## File Details

| Version | Files | Size | Entry Point |
|---------|-------|------|-------------|
| v1 | 1 | 1.2 KB | index.html |
| v2 | 1 | 1.2 KB | index.html |
| v3 | 1 | 1.2 KB | index.html |
| v4 | 1 | 1.2 KB | index.html |
| v5 | 1 | 1.2 KB | index.html |

## Dependencies

**External (CDN - allowed):**
- Picsum placeholder image - `https://picsum.photos/seed/welcome/160/160`

**Internal:**
- None - fully self-contained HTML

## Common Issues

**Version Not Showing:**
- Check H1 tag contains version number: `<h1>Welcome Page v#</h1>`
- Verify you uploaded the correct version file

**Image Not Loading:**
- External CDN images are allowed and should work
- If blocked, check network/firewall settings

## Local Viewing

Since these are self-contained HTML files, you can:

**Option 1: Open directly in browser**
```bash
open v1/index.html
open v2/index.html
# ... etc
```

**Option 2: Use navigation page**
```bash
python3 -m http.server 3001
open http://localhost:3001/index.html
```

---

**Last Updated:** 2025-12-27
**Related Task:** #15 - Fix ZIP artifact viewing
