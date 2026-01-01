# Charting Samples with Parent Directories

Test samples for verifying ZIP root folder stripping during extraction.

Each version has the same charting content but wrapped in different levels of parent directories. The ZIP processor should strip these common parent paths so relative references in the HTML work correctly.

## Samples

| File | Parent Path | Expected Entry Point |
|------|-------------|---------------------|
| v1.zip | `project/` | `index.html` |
| v2.zip | `project/dist/` | `index.html` |
| v3.zip | `my-app/src/build/` | `index.html` |
| v4.zip | `company/projects/dashboard/release/` | `index.html` |
| v5.zip | `a/b/c/d/e/` | `index.html` |

## Expected Behavior

After upload and processing:
- Entry point should be `index.html` (not the full path)
- `assets/logo.png` should load correctly
- `assets/chart-data.json` should load correctly
- `app.js` should execute correctly

## Test Cases

1. Upload each version and verify the chart displays
2. Check browser DevTools Network tab - no 404s for assets
3. Verify JavaScript executes (chart should render)
