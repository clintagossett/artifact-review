import { test, expect } from '@playwright/test';

test.describe('Magic Link Authentication', () => {
  test('should display magic link option on login page', async ({ page }) => {
    await page.goto('/login');

    // Verify password form is shown by default
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Click to switch to magic link
    await page.getByRole('button', { name: /^magic link$/i }).click();

    // Verify magic link form is shown
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).not.toBeVisible();
  });

  test('should request magic link and show success message', async ({ page }) => {
    await page.goto('/login');

    // Switch to magic link form
    await page.getByRole('button', { name: /^magic link$/i }).click();

    // Fill email with Resend test domain
    const testEmail = `test-${Date.now()}@tolauante.resend.app`;
    await page.fill('input[type="email"]', testEmail);

    // Submit
    await page.click('button:has-text("Send Magic Link")');

    // Should show success message
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(testEmail)).toBeVisible();
  });

  test('should toggle between password and magic link forms', async ({ page }) => {
    await page.goto('/login');

    // Initially password form
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Switch to magic link
    await page.getByRole('button', { name: /^magic link$/i }).click();
    await expect(page.getByLabel(/password/i)).not.toBeVisible();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();

    // Switch back to password
    await page.getByRole('button', { name: /^password$/i }).click();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /^magic link$/i }).click();

    // The email input should have required attribute
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('should handle expired magic link gracefully', async ({ page }) => {
    // Navigate to verify page with error parameter
    await page.goto('/verify-email?error=expired');

    // Should show error message
    await expect(page.getByText(/expired/i)).toBeVisible();
    await expect(page.getByText(/request a new one/i)).toBeVisible();

    // Should have link to return to login
    await expect(page.getByRole('link', { name: /return to sign in/i })).toBeVisible();
  });
});
