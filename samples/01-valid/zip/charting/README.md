# Charting Sample - Multi-Version Artifact

## Purpose

This sample demonstrates **artifact versioning** - the core workflow where users upload multiple iterations of the same artifact for review and comparison.

## What This Tests

- **Version comparison UI:** All 5 versions have the same base title but different version numbers
- **Multi-file ZIP handling:** Each version contains HTML + JavaScript + JSON + image assets
- **Version identification:** H1 heading clearly shows "Monthly Sales Dashboard v1" through "v5" for easy visual confirmation
- **Real-world use case:** Mimics PowerPoint-to-HTML exports or multi-file AI agent outputs

## Structure

```
charting/
├── README.md              # This file
├── index.html             # Local navigation page (for development only)
│
├── v1.zip                 # Ready to upload to Artifact Review
├── v2.zip
├── v3.zip
├── v4.zip
├── v5.zip
│
└── v1/ → v5/              # Source folders (for editing/regenerating ZIPs)
    ├── index.html         # Entry point - H1 shows version number
    ├── app.js             # Chart rendering logic
    └── assets/
        ├── chart-data.json  # Sample data
        └── logo.png         # Dashboard logo
```

## For AI Agents

**When testing artifact upload:**
1. Use the `.zip` files (v1.zip through v5.zip)
2. Upload them as separate versions of the same artifact
3. Verify the H1 heading displays the correct version when rendered
4. Test version comparison between any two versions

**When modifying samples:**
1. Edit the source folders (v1/ through v5/)
2. Regenerate ZIPs with: `zip -r v1.zip v1/` (repeat for each version)
3. Ensure H1 format remains: `<h1>Monthly Sales Dashboard v#</h1>`

## Expected Behavior

### Upload & Extraction
- ✅ ZIP extracts to 4 files per version
- ✅ `index.html` auto-detected as entry point
- ✅ Files stored in `artifactFiles` table with correct paths

### Rendering
- ✅ Chart.js loads from CDN
- ✅ `app.js` fetches `assets/chart-data.json` via HTTP proxy
- ✅ Logo displays at `assets/logo.png`
- ✅ H1 clearly shows version number (e.g., "Monthly Sales Dashboard v3")

### Version Comparison
- ✅ User can select any two versions to compare
- ✅ Version numbers visible in rendered previews
- ✅ Testers can easily identify which version they're viewing

## File Details

| Version | Files | Compressed Size | Entry Point |
|---------|-------|-----------------|-------------|
| v1 | 4 | 3.9 KB | index.html |
| v2 | 4 | 3.4 KB | index.html |
| v3 | 4 | 3.9 KB | index.html |
| v4 | 4 | 3.9 KB | index.html |
| v5 | 4 | 3.9 KB | index.html |

## Dependencies

**External (CDN):**
- Chart.js 4.4.1 - `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js`

**Internal:**
- `app.js` - Fetches chart data and initializes Chart.js
- `assets/chart-data.json` - Sample monthly sales data
- `assets/logo.png` - Dashboard branding

## Common Issues

**CORS Errors When Opening Directly:**
- Browsers block `fetch()` on `file://` protocol
- **Solution:** Use HTTP server (see index.html or main samples/README.md)

**Version Not Showing:**
- Check H1 tag contains version number: `<h1>Monthly Sales Dashboard v#</h1>`
- Verify you're viewing the correct version URL

## Local Development

To view locally without uploading:

```bash
# Start HTTP server
python3 -m http.server 3001

# Open in browser
open http://localhost:3001/v1/
open http://localhost:3001/v2/
# ... etc
```

Or use the navigation page:
```bash
python3 -m http.server 3001
open http://localhost:3001/index.html
```

---

**Last Updated:** 2025-12-27
**Related Task:** #15 - Fix ZIP artifact viewing
