/**
 * Novu Test Utilities
 *
 * Helper functions for E2E testing of Novu-powered notifications.
 * Uses data-testid selectors added to NotificationCenter.tsx.
 */

import { expect, Page } from '@playwright/test';

/**
 * Wait for notification badge to show expected count.
 * Uses polling to handle WebSocket latency.
 *
 * @param page - Playwright page instance
 * @param count - Expected notification count
 * @param timeout - Max wait time in ms (default 30000)
 */
export async function waitForNotificationCount(
  page: Page,
  count: number,
  timeout = 30000
): Promise<void> {
  const badge = page.getByTestId('notification-badge');
  const countElement = page.getByTestId('notification-count');

  await expect(badge).toBeVisible({ timeout });
  await expect(countElement).toHaveText(String(count), { timeout });
}

/**
 * Assert notification badge is NOT visible (no unseen notifications).
 * Use this after marking notifications as read or for self-notification tests.
 *
 * @param page - Playwright page instance
 * @param timeout - Max wait time in ms (default 5000)
 */
export async function expectNoNotificationBadge(
  page: Page,
  timeout = 5000
): Promise<void> {
  const badge = page.getByTestId('notification-badge');
  await expect(badge).not.toBeVisible({ timeout });
}

/**
 * Open notification center by clicking the bell icon.
 * Waits for the popover to be visible.
 *
 * @param page - Playwright page instance
 */
export async function openNotificationCenter(page: Page): Promise<void> {
  const bell = page.getByTestId('notification-bell');
  await bell.click();
  // Wait for Novu popover to load - it adds an iframe or renders inline
  await page.waitForTimeout(500); // Brief delay for popover animation
}

/**
 * Wait for Novu notification feed content to load.
 * Novu's PopoverNotificationCenter renders a feed when opened.
 *
 * @param page - Playwright page instance
 */
export async function waitForNotificationFeed(page: Page): Promise<void> {
  // Novu's feed typically has a specific structure
  // We wait for the general popover area to be interactive
  await page.waitForTimeout(1000); // Allow Novu SDK to hydrate
}

/**
 * Get current notification count from the badge.
 * Returns 0 if badge is not visible.
 *
 * @param page - Playwright page instance
 * @returns Current notification count
 */
export async function getNotificationCount(page: Page): Promise<number> {
  const badge = page.getByTestId('notification-badge');
  const isVisible = await badge.isVisible();

  if (!isVisible) {
    return 0;
  }

  const countElement = page.getByTestId('notification-count');
  const countText = await countElement.textContent();
  return parseInt(countText || '0', 10);
}

/**
 * Wait for notification count to be at least the specified minimum.
 * Useful when exact count may vary due to timing.
 *
 * @param page - Playwright page instance
 * @param minCount - Minimum expected count
 * @param timeout - Max wait time in ms (default 30000)
 */
export async function waitForNotificationCountAtLeast(
  page: Page,
  minCount: number,
  timeout = 30000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const count = await getNotificationCount(page);
    if (count >= minCount) {
      return;
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`Notification count did not reach ${minCount} within ${timeout}ms`);
}
