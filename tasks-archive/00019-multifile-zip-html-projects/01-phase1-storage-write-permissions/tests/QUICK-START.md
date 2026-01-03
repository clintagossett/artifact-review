# Quick Start Guide

Get the E2E tests running in under 5 minutes.

## Prerequisites

- Node.js installed
- Development server running on port 3000 (or configured to auto-start)
- Sample files present in `/samples/` directory

## Installation

```bash
# Navigate to tests directory
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/tasks/00019-multifile-zip-html-projects/01-phase1-storage-write-permissions/tests

# Install Playwright and dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install chromium
```

## Generate Invalid Samples (Optional)

Some tests require generated sample files for validation:

```bash
# Generate huge.zip (155MB) - tests file size limit
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/samples/04-invalid/too-large
./generate.sh

# Generate presentation-with-video.zip - tests forbidden file types
# Requires ffmpeg: brew install ffmpeg
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/samples/04-invalid/wrong-type
./generate.sh
```

**Note:** Tests will skip if these files are missing.

## Run Tests

### Option 1: All Tests (Headless)

```bash
npx playwright test
```

This runs all 26 tests in headless mode with video recording.

**Output:**
- Videos: `test-results/[test-name]/video.webm`
- Traces: `test-results/[test-name]/trace.zip`
- Screenshots: `test-results/[test-name]/screenshots/`

### Option 2: Visible Browser (Headed)

```bash
npx playwright test --headed
```

Watch tests execute in a real browser window.

### Option 3: Interactive UI

```bash
npx playwright test --ui
```

Opens Playwright's interactive test runner with:
- Test explorer
- Live preview
- Step-by-step debugging
- Timeline view

### Option 4: Single Test File

```bash
# Upload tests only
npx playwright test e2e/01-zip-upload.spec.ts

# Error handling tests only
npx playwright test e2e/05-error-handling.spec.ts
```

### Option 5: Specific Test by Name

```bash
npx playwright test -g "should upload ZIP and create artifact"
```

## View Results

### Test Report (HTML)

```bash
npx playwright show-report
```

Opens an HTML report with:
- Test results and status
- Screenshots and videos
- Error traces
- Timing information

### View Video Recording

```bash
# macOS
open test-results/*/video.webm

# Linux
xdg-open test-results/*/video.webm
```

### View Debug Trace

```bash
npx playwright show-trace test-results/*/trace.zip
```

Opens interactive trace viewer with:
- Timeline of all actions
- Screenshots at each step
- Network activity
- Console logs
- DOM snapshots

## Generate Validation Video

Create a master validation video for feature handoff:

```bash
# 1. Run all tests
npx playwright test

# 2. Concatenate test videos
../../../../../scripts/concat_journey.sh test-results

# 3. Normalize to MP4
../../../../../scripts/normalize_video.sh test-results/flow.webm validation-videos/validation.mp4

# 4. View final video
open validation-videos/validation.mp4
```

## Debugging Failed Tests

### View Last Failed Test

```bash
# Show report for failed tests
npx playwright show-report

# View trace of last failed test
npx playwright show-trace test-results/*/trace.zip
```

### Run in Debug Mode

```bash
# Debug specific test
npx playwright test --debug -g "should upload ZIP"
```

This opens Playwright Inspector with:
- Step-through execution
- DOM explorer
- Console access
- Network tab

### Check Console Output

Tests include `console.log()` statements for debugging:
- User registration details
- ShareTokens created
- Version numbers
- Error messages

## Common Issues

### Port 3000 Already in Use

```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or start on different port and update playwright.config.ts
```

### Authentication Failures

```bash
# Clear browser storage
npx playwright test --clear-storage

# Check Convex backend is running
```

### Timeout Errors

Tests have 120s timeout for ZIP uploads. If still timing out:
- Check network speed
- Verify dev server is responding
- Look for backend errors in Convex logs

### Missing Sample Files

```bash
# Verify samples exist
ls -la /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/samples/01-valid/zip/charting/

# Should show v1.zip through v5.zip
```

## Test Coverage Summary

| Category | Tests | Description |
|----------|-------|-------------|
| Upload | 4 | Create artifacts from ZIP files |
| Versioning | 4 | Add and switch between versions |
| Share Links | 4 | Public access without auth |
| Asset Loading | 7 | CSS, JS, images, JSON |
| Error Handling | 7 | Validation and error states |
| **Total** | **26** | **Full E2E coverage** |

## Next Steps

After running tests successfully:

1. **Review videos** - Check `test-results/` for recordings
2. **Generate validation video** - Use concat/normalize scripts
3. **Share results** - Attach videos to GitHub issue or upload to shared drive
4. **Update test report** - Document any failures or issues
5. **Promote tests** - Consider upleveling to task or project level if valuable

## Additional Resources

- **Full README:** [tests/README.md](./README.md)
- **Test Summary:** [tests/TEST-SUMMARY.md](./TEST-SUMMARY.md)
- **Testing Guide:** `/docs/development/testing-guide.md`
- **Sample Files:** `/samples/README.md`

---

**Need Help?**

- Check test output for error messages
- View trace files for detailed debugging
- Review helper functions in `e2e/helpers/`
- Consult project testing guide

**Last Updated:** 2025-12-31
