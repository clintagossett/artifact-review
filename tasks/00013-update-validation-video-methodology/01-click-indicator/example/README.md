# Click Indicator Example Tests

Example Playwright tests demonstrating the click indicator utility.

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Running Tests

```bash
# Run tests headless (generates videos)
npx playwright test

# Run tests with visible browser
npx playwright test --headed

# Run tests in UI mode
npx playwright test --ui

# Run specific test
npx playwright test click-indicator-demo.spec.ts
```

## Output

Videos are saved to `test-results/` directory:
- Each test generates a `.webm` video file
- Videos show the red cursor dot and click ripples
- Trace files are also generated for debugging

## Viewing Results

```bash
# View trace file
npx playwright show-trace test-results/*/trace.zip

# Videos can be played directly
open test-results/*/video.webm
```

## What to Look For

In the recorded videos, you should see:
1. **Red dot cursor** - 12px red circle that follows mouse movement
2. **Click ripples** - Expanding red rings on every click/mousedown
3. **No interference** - Indicators don't block clicks (pointer-events: none)

## Test Patterns

The example demonstrates three patterns:

### 1. Manual Injection (Basic)
```typescript
await page.goto('/');
await injectClickIndicator(page);
// Now all clicks show indicators
```

### 2. Auto-Injection (Multi-page)
```typescript
const context = await browser.newContext({ recordVideo: { dir: './videos' } });
setupAutoInject(context);
const page = await context.newPage();
// Indicator automatically injected on every new page
```

### 3. Realistic Flow
Complete user journey with indicators showing all interactions.
