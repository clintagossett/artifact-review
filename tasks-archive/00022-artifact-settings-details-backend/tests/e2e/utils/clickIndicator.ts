/**
 * Click Indicator for Playwright Video Recordings
 *
 * Injects CSS/JS into browser pages to show visual click indicators:
 * - Red cursor dot that follows mouse movement
 * - Ripple animation on every click
 *
 * Usage:
 *   import { injectClickIndicator, setupAutoInject } from './clickIndicator';
 *
 *   // Option 1: Inject into a single page
 *   test('example', async ({ page }) => {
 *     await page.goto('https://example.com');
 *     await injectClickIndicator(page);
 *     // ... your test steps
 *   });
 *
 *   // Option 2: Auto-inject into all pages in a context
 *   test('with auto-inject', async ({ browser }) => {
 *     const context = await browser.newContext({ recordVideo: { dir: './videos' } });
 *     setupAutoInject(context);
 *     const page = await context.newPage();
 *     // Indicator automatically injected on every new page
 *   });
 */

import type { Page, BrowserContext } from '@playwright/test';

const CLICK_INDICATOR_CSS = `
.playwright-click-indicator {
    position: fixed;
    pointer-events: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 0, 0, 0.3);
    border: 3px solid rgba(255, 0, 0, 0.8);
    transform: translate(-50%, -50%);
    animation: click-ripple 0.6s ease-out forwards;
    z-index: 999999;
}

@keyframes click-ripple {
    0% {
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 1;
    }
    100% {
        transform: translate(-50%, -50%) scale(2);
        opacity: 0;
    }
}

.playwright-cursor {
    position: fixed;
    pointer-events: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 0, 0, 0.8);
    border: 2px solid white;
    transform: translate(-50%, -50%);
    z-index: 999998;
    box-shadow: 0 0 4px rgba(0,0,0,0.3);
}
`;

const CLICK_INDICATOR_JS = `
(function() {
    // Prevent double-injection
    if (window.__playwrightClickIndicatorInstalled) return;
    window.__playwrightClickIndicatorInstalled = true;

    // Create cursor element
    const cursor = document.createElement('div');
    cursor.className = 'playwright-cursor';
    document.body.appendChild(cursor);

    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    // Show ripple on click
    document.addEventListener('click', (e) => {
        const ripple = document.createElement('div');
        ripple.className = 'playwright-click-indicator';
        ripple.style.left = e.clientX + 'px';
        ripple.style.top = e.clientY + 'px';
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }, true);

    // Also capture mousedown for immediate feedback
    document.addEventListener('mousedown', (e) => {
        const ripple = document.createElement('div');
        ripple.className = 'playwright-click-indicator';
        ripple.style.left = e.clientX + 'px';
        ripple.style.top = e.clientY + 'px';
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }, true);
})();
`;

/**
 * Inject click indicator CSS and JS into a Playwright page.
 *
 * @param page - A Playwright Page object
 *
 * @example
 * ```typescript
 * const page = await context.newPage();
 * await page.goto('https://example.com');
 * await injectClickIndicator(page);
 * ```
 */
export async function injectClickIndicator(page: Page): Promise<void> {
  await page.addStyleTag({ content: CLICK_INDICATOR_CSS });
  await page.evaluate(CLICK_INDICATOR_JS);
}

/**
 * Configure a browser context to auto-inject click indicators on all pages.
 *
 * @param context - A Playwright BrowserContext object
 *
 * @example
 * ```typescript
 * const context = await browser.newContext({ recordVideo: { dir: './videos' } });
 * setupAutoInject(context);
 * const page = await context.newPage();  // Indicator auto-injected
 * ```
 */
export function setupAutoInject(context: BrowserContext): void {
  context.on('page', (page) => {
    page.on('load', () => safeInject(page));
  });
}

/**
 * Inject with error handling for pages that close quickly.
 */
async function safeInject(page: Page): Promise<void> {
  try {
    await injectClickIndicator(page);
  } catch {
    // Page may have closed, ignore errors
  }
}
