# Subtask 01: Click Indicator Implementation

**Parent Task:** 00013-update-validation-video-methodology
**Status:** COMPLETE
**Created:** 2025-12-26
**Completed:** 2025-12-26

---

## Objective

Port the Python Playwright click indicator to TypeScript and make it available for all E2E tests in the project.

---

## Requirements

### Functional Requirements
1. **Red cursor dot** - 12px circle that follows mouse movement
2. **Click ripple** - Expanding ring animation on every click/mousedown
3. **Non-invasive** - Uses `pointer-events: none` to not interfere with tests
4. **Auto-injection** - Setup function to auto-inject on all pages in a context
5. **TypeScript** - Fully typed implementation

### Visual Specifications
From reference implementation:
- Cursor: 12px red dot with white border, z-index 999998
- Ripple: 40px starting size, expands 2x with fade, z-index 999999
- Colors: `rgba(255, 0, 0, 0.8)` for main, white border
- Animation: 0.6s ease-out

---

## Files

| File | Description |
|------|-------------|
| `README.md` | This file |
| `clickIndicator.ts` | TypeScript implementation (to be created) |
| `example-usage.spec.ts` | Example test showing usage (to be created) |

---

## Implementation Plan

1. **Create utility file** - `app/tests/utils/clickIndicator.ts`
   - Export `injectClickIndicator(page)` function
   - Export `setupAutoInject(context)` function
   - Include CSS and JS constants

2. **Create documentation** - Usage examples in testing guide
   - Basic usage: Manual injection per page
   - Advanced: Auto-injection for all pages in context
   - Integration with task-level test setup

3. **Create example** - Demonstrate in a simple test
   - Show both manual and auto-inject patterns
   - Generate video showing visual indicators

---

## Reference Implementation

Source: `/Users/clintgossett/Documents/Applied Frameworks/af projects/engage all/engage/docs/tasks/00077-claude-ui-exploration/runner/click_indicator.py`

Key components to port:
```python
CLICK_INDICATOR_CSS = """..."""
CLICK_INDICATOR_JS = """..."""

async def inject_click_indicator(page):
    await page.add_style_tag(content=CLICK_INDICATOR_CSS)
    await page.evaluate(CLICK_INDICATOR_JS)

def setup_auto_inject(context):
    async def on_page(page):
        page.on("load", lambda: _safe_inject(page))
    context.on("page", on_page)
```

---

## How This Will Be Used

### In Task-Level Tests
```typescript
import { test } from '@playwright/test';
import { injectClickIndicator, setupAutoInject } from '../../../app/tests/utils/clickIndicator';

test('feature demo', async ({ browser }) => {
  const context = await browser.newContext({ recordVideo: { dir: 'videos' } });
  setupAutoInject(context);  // Auto-inject on all pages

  const page = await context.newPage();
  await page.goto('/');
  await injectClickIndicator(page);  // Backup for initial page

  // All clicks now show red dot + ripple
  await page.click('button');
});
```

### Integration with Playwright Config
Update `playwright.config.ts` template to include click indicator setup by default.

---

## Deliverables

### Code
- ✅ **app/tests/utils/clickIndicator.ts** - TypeScript implementation with full typing
  - `injectClickIndicator(page)` - Manual injection function
  - `setupAutoInject(context)` - Auto-injection for all pages
  - CSS and JS constants for visual indicators

### Examples
- ✅ **example/tests/click-indicator-demo.spec.ts** - Three demo patterns:
  - Manual injection (basic usage)
  - Auto-injection (multi-page flows)
  - Realistic user flow with indicators
- ✅ **example/package.json** - Playwright dependencies
- ✅ **example/playwright.config.ts** - Test configuration
- ✅ **example/README.md** - Setup and usage instructions

### Documentation
- ✅ **docs/development/testing-guide.md** - Updated with:
  - Click indicator section with usage examples
  - Integration instructions for E2E tests
  - Both manual and auto-injection patterns

## Success Criteria

- [x] TypeScript utility created and typed
- [x] Manual injection works (`injectClickIndicator(page)`)
- [x] Auto-injection works (`setupAutoInject(context)`)
- [x] Example tests demonstrate usage patterns
- [x] Documentation updated in testing guide
- [x] Ready for integration into all E2E tests
