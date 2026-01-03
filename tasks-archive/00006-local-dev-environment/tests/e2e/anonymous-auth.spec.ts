import { test, expect } from '@playwright/test';

test.describe('Anonymous Authentication Flow', () => {
  test('should allow anonymous sign-in and persist session', async ({ page }) => {
    // 1. Navigate to landing page
    await page.goto('/');

    // 2. Wait for page to load (skip loading state)
    await page.waitForSelector('text=Artifact Review', { timeout: 10000 });

    // 3. Verify landing page elements
    await expect(page.getByText('Artifact Review').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Start Using Artifact Review/i })).toBeVisible();

    // 4. Click sign-in button
    await page.getByRole('button', { name: /Start Using Artifact Review/i }).click();

    // 5. Wait for authentication to complete - look for "Welcome to Artifact Review" heading
    await page.waitForSelector('text=Welcome to Artifact Review', { timeout: 10000 });

    // 6. Verify authenticated state
    await expect(page.getByText('Welcome to Artifact Review')).toBeVisible();
    await expect(page.getByText(/Anonymous session/i)).toBeVisible();
    await expect(page.getByText(/User ID:/i)).toBeVisible();

    // 7. Capture the User ID for comparison after refresh
    const userIdElement = await page.locator('text=User ID:').locator('..').locator('.font-mono');
    const userId = await userIdElement.textContent();
    expect(userId).toBeTruthy();

    // 8. Verify JWT token in localStorage
    const token = await page.evaluate(() => {
      return localStorage.getItem('__convexAuthJWT_httpsmildptarmigan109convexcloud');
    });
    expect(token).toBeTruthy();

    // 9. Refresh page to test session persistence
    await page.reload();
    await page.waitForSelector('text=Welcome to Artifact Review', { timeout: 10000 });

    // 10. Verify session persisted after refresh
    await expect(page.getByText('Welcome to Artifact Review')).toBeVisible();
    await expect(page.getByText(/Anonymous session/i)).toBeVisible();
    const userIdAfter = await userIdElement.textContent();

    // 11. Verify same User ID after refresh
    expect(userIdAfter).toBe(userId);

    // 12. Verify token still in localStorage
    const tokenAfterRefresh = await page.evaluate(() => {
      return localStorage.getItem('__convexAuthJWT_httpsmildptarmigan109convexcloud');
    });
    expect(tokenAfterRefresh).toBeTruthy();
  });
});
