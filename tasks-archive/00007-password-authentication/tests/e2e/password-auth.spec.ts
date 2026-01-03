import { test, expect } from '@playwright/test';

test.describe('Password Authentication', () => {
  test('should register new user, sign out, and sign in again', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;

    // 1. Navigate to landing page
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // 2. Click "Create Account" link
    await page.click('text=Create Account');
    await expect(page).toHaveURL('/register');

    // 3. Fill registration form
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'password123');

    // 4. Submit registration
    await page.click('button:has-text("Create Account")');

    // 5. Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // 6. Verify email is shown on dashboard
    await expect(page.getByText(`Signed in as ${testEmail}`)).toBeVisible();

    // 7. Sign out
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL('/');

    // 8. Navigate to login page
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/login');

    // 9. Sign in with same credentials
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // 10. Verify redirected to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    await expect(page.getByText(`Signed in as ${testEmail}`)).toBeVisible();

    // 11. Test session persistence - refresh page
    await page.reload();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(`Signed in as ${testEmail}`)).toBeVisible();
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[id="email"]', 'nonexistent@example.com');
    await page.fill('input[id="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    // Should show error and stay on login page
    await expect(page.getByText(/invalid.*password/i)).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL('/login');
  });

  test('should show error when passwords do not match during registration', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'differentpassword');
    await page.click('button:has-text("Create Account")');

    // Should show error and stay on register page
    await expect(page.getByText(/passwords must match/i)).toBeVisible();
    await expect(page).toHaveURL('/register');
  });
});
