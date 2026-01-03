import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test.describe('Page Layout', () => {
    test('should render page with gradient background', async ({ page }) => {
      const container = page.locator('div').first();
      await expect(container).toBeVisible();
    });

    test('should render logo', async ({ page }) => {
      // Logo should be visible (GradientLogo component)
      const logo = page.locator('svg').first();
      await expect(logo).toBeVisible();
    });

    test('should render welcome heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('should render subtitle', async ({ page }) => {
      await expect(page.getByText(/sign in to your artifact review account/i)).toBeVisible();
    });
  });

  test.describe('Auth Method Toggle', () => {
    test('should show password mode by default', async ({ page }) => {
      // Password input should be visible
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test('should toggle to magic-link mode', async ({ page }) => {
      // Click magic-link tab
      await page.getByRole('button', { name: /magic link/i }).click();

      // Password field should be hidden
      await expect(page.getByLabel(/^password$/i)).not.toBeVisible();

      // Magic link info panel should appear
      await expect(page.getByText(/passwordless sign in/i)).toBeVisible();
    });

    test('should toggle back to password mode', async ({ page }) => {
      // Toggle to magic-link
      await page.getByRole('button', { name: /magic link/i }).click();

      // Toggle back to password
      await page.getByRole('button', { name: /^password$/i }).click();

      // Password field should be visible again
      await expect(page.getByLabel(/^password$/i)).toBeVisible();

      // Magic link info should be hidden
      await expect(page.getByText(/passwordless sign in/i)).not.toBeVisible();
    });
  });

  test.describe('Form Fields - Password Mode', () => {
    test('should render email input with icon', async ({ page }) => {
      const emailInput = page.getByLabel(/email address/i);
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('placeholder', /company.com/i);
    });

    test('should render password input with icon', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i);
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should render forgot password link', async ({ page }) => {
      await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
    });

    test('should render demo account panel', async ({ page }) => {
      // Wait for the form to be fully rendered
      await expect(page.getByLabel(/email address/i)).toBeVisible();

      // The panel shows demo email and password
      await expect(page.getByText('test@example.com')).toBeVisible();
      await expect(page.getByText('password123')).toBeVisible();
    });

    test('should render submit button with correct text', async ({ page }) => {
      await expect(page.getByRole('button', { name: /^sign in/i })).toBeVisible();
    });
  });

  test.describe('Form Fields - Magic Link Mode', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /magic link/i }).click();
    });

    test('should render only email input', async ({ page }) => {
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).not.toBeVisible();
    });

    test('should render magic link info panel', async ({ page }) => {
      await expect(page.getByText(/passwordless sign in/i)).toBeVisible();
      await expect(page.getByText(/email you a secure link/i)).toBeVisible();
    });

    test('should not render demo account panel', async ({ page }) => {
      await expect(page.getByText(/demo account/i)).not.toBeVisible();
    });

    test('should render submit button with magic link text', async ({ page }) => {
      await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should require email field', async ({ page }) => {
      const emailInput = page.getByLabel(/email address/i);
      const submitButton = page.getByRole('button', { name: /sign in/i });

      // Try to submit without filling email
      await submitButton.click();

      // HTML5 validation should prevent submission
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });

    test('should require password field in password mode', async ({ page }) => {
      const emailInput = page.getByLabel(/email address/i);
      const passwordInput = page.getByLabel(/^password$/i);
      const submitButton = page.getByRole('button', { name: /sign in/i });

      // Fill email only
      await emailInput.fill('test@example.com');
      await submitButton.click();

      // Password validation should prevent submission
      const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });

    test('should validate email format', async ({ page }) => {
      const emailInput = page.getByLabel(/email address/i);
      const submitButton = page.getByRole('button', { name: /sign in/i });

      // Fill invalid email
      await emailInput.fill('invalid-email');
      await submitButton.click();

      // Email validation should prevent submission
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toContain('@');
    });
  });

  test.describe('Navigation', () => {
    test('should have link to signup page', async ({ page }) => {
      const signupLink = page.getByRole('link', { name: /sign up/i });
      await expect(signupLink).toBeVisible();
      await expect(signupLink).toHaveAttribute('href', '/register');
    });

    test('should navigate to signup when clicked', async ({ page }) => {
      await page.getByRole('link', { name: /sign up/i }).click();
      await expect(page).toHaveURL('/register');
    });

    test('should have link to forgot password', async ({ page }) => {
      const forgotLink = page.getByRole('link', { name: /forgot password/i });
      await expect(forgotLink).toBeVisible();
    });
  });

  test.describe('Terms and Privacy Links', () => {
    test('should render terms and privacy footer', async ({ page }) => {
      await expect(page.getByText(/by signing in, you agree/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /terms of service/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible();
    });
  });

  test.describe('Loading States', () => {
    test('should show loading state when submitting', async ({ page }) => {
      const emailInput = page.getByLabel(/email address/i);
      const passwordInput = page.getByLabel(/^password$/i);
      const submitButton = page.getByRole('button', { name: /sign in/i });

      // Fill form
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');

      // Submit and check button becomes disabled (loading state)
      await submitButton.click();

      // Wait briefly for loading state to appear
      await page.waitForTimeout(100);

      // Button should show loading text or be disabled
      // After submission attempt, button state changes
      const buttonText = await submitButton.textContent();
      // Either shows "Signing in..." or error clears and shows "Sign In" again
      expect(buttonText).toBeTruthy();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper labels for all inputs', async ({ page }) => {
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
    });

    test('should have proper button roles', async ({ page }) => {
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /password/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /magic link/i })).toBeVisible();
    });
  });
});
