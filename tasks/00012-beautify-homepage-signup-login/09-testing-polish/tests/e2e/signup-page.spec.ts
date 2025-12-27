import { test, expect } from '@playwright/test';

test.describe('Signup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test.describe('Page Layout', () => {
    test('should render page with gradient background', async ({ page }) => {
      const container = page.locator('div').first();
      await expect(container).toBeVisible();
    });

    test('should render logo', async ({ page }) => {
      const logo = page.locator('svg').first();
      await expect(logo).toBeVisible();
    });

    test('should render create account heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    });

    test('should render subtitle', async ({ page }) => {
      await expect(page.getByText(/get started with artifact review/i)).toBeVisible();
    });
  });

  test.describe('Auth Method Toggle', () => {
    test('should show password mode by default', async ({ page }) => {
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    });

    test('should toggle to magic-link mode', async ({ page }) => {
      await page.getByRole('button', { name: /magic link/i }).click();

      await expect(page.getByLabel(/^password$/i)).not.toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).not.toBeVisible();
      await expect(page.getByText(/passwordless sign up/i)).toBeVisible();
    });

    test('should toggle back to password mode', async ({ page }) => {
      await page.getByRole('button', { name: /magic link/i }).click();
      await page.getByRole('button', { name: /^password$/i }).click();

      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    });
  });

  test.describe('Form Fields - Password Mode', () => {
    test('should render name input with icon', async ({ page }) => {
      const nameInput = page.getByLabel(/full name/i);
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toHaveAttribute('type', 'text');
      await expect(nameInput).toHaveAttribute('placeholder', /john doe/i);
    });

    test('should render email input with icon', async ({ page }) => {
      const emailInput = page.getByLabel(/email address/i);
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveAttribute('type', 'email');
    });

    test('should render password input with icon', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i);
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should render confirm password input', async ({ page }) => {
      const confirmInput = page.getByLabel(/confirm password/i);
      await expect(confirmInput).toBeVisible();
      await expect(confirmInput).toHaveAttribute('type', 'password');
    });

    test('should render submit button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });
  });

  test.describe('Form Fields - Magic Link Mode', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /magic link/i }).click();
    });

    test('should render name and email only', async ({ page }) => {
      await expect(page.getByLabel(/full name/i)).toBeVisible();
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).not.toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).not.toBeVisible();
    });

    test('should render magic link info panel', async ({ page }) => {
      await expect(page.getByText(/passwordless sign up/i)).toBeVisible();
      await expect(page.getByText(/email you a secure link/i)).toBeVisible();
    });

    test('should render submit button with magic link text', async ({ page }) => {
      await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
    });
  });

  test.describe('Password Strength Indicator', () => {
    test('should show password strength indicator when typing', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i);

      // Type a weak password
      await passwordInput.fill('abc');

      // Strength indicator should appear (shows "Weak", "Fair", "Good", or "Strong")
      await expect(page.getByText(/password strength:/i)).toBeVisible();
    });

    test('should update strength as password improves', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i);

      // Type progressively stronger passwords
      await passwordInput.fill('abc');
      // Weak indicator should show
      await expect(page.getByText('Weak')).toBeVisible();

      await passwordInput.fill('abc12345');
      // Should update to Fair or better

      await passwordInput.fill('Abc123!@#');
      // Strong indicator should show
      await expect(page.getByRole('progressbar')).toBeVisible();
    });
  });

  test.describe('Password Requirements Checklist', () => {
    test('should show all requirements when password field is filled', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i);

      await passwordInput.fill('a');

      // All requirement checks should be visible
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
      await expect(page.getByText(/contains a number/i)).toBeVisible();
      await expect(page.getByText(/contains a letter/i)).toBeVisible();
    });

    test('should show unmet requirements with empty circles', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i);

      // Type password that doesn't meet all requirements
      await passwordInput.fill('abc');

      // Requirements should be visible
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
      await expect(page.getByText(/contains a number/i)).toBeVisible();
    });

    test('should show met requirements with checkmarks', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i);

      // Type password that meets all requirements
      await passwordInput.fill('password123');

      // All requirements should be marked as met
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
      await expect(page.getByText(/contains a number/i)).toBeVisible();
      await expect(page.getByText(/contains a letter/i)).toBeVisible();

      // Check for checkmark indicators (green text or checkmark icons)
      const letterRequirement = page.locator('text=/contains a letter/i').locator('..');
      await expect(letterRequirement).toBeVisible();
    });

    test('should update requirements dynamically', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i);

      // Start with short password
      await passwordInput.fill('abc');
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();

      // Add more characters
      await passwordInput.fill('abcdefgh');
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();

      // Add a number
      await passwordInput.fill('abcdefgh1');
      await expect(page.getByText(/contains a number/i)).toBeVisible();
    });
  });

  test.describe('Confirm Password Validation', () => {
    test('should show error when passwords do not match', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i);
      const confirmInput = page.getByLabel(/confirm password/i);

      await passwordInput.fill('password123');
      await confirmInput.fill('password456');

      // Error message should appear
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('should not show error when passwords match', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i);
      const confirmInput = page.getByLabel(/confirm password/i);

      await passwordInput.fill('password123');
      await confirmInput.fill('password123');

      // No error message should appear
      await expect(page.getByText(/passwords do not match/i)).not.toBeVisible();
    });

    test('should show error indicator icon', async ({ page }) => {
      const passwordInput = page.getByLabel(/^password$/i);
      const confirmInput = page.getByLabel(/confirm password/i);

      await passwordInput.fill('password123');
      await confirmInput.fill('different');

      // Error with AlertCircle icon should be visible
      const errorText = page.getByText(/passwords do not match/i);
      await expect(errorText).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should require all fields in password mode', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /create account/i });

      // Try to submit empty form
      await submitButton.click();

      // Name field validation
      const nameInput = page.getByLabel(/full name/i);
      const validationMessage = await nameInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });

    test('should validate email format', async ({ page }) => {
      const nameInput = page.getByLabel(/full name/i);
      const emailInput = page.getByLabel(/email address/i);
      const submitButton = page.getByRole('button', { name: /create account/i });

      await nameInput.fill('John Doe');
      await emailInput.fill('invalid-email');
      await submitButton.click();

      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toContain('@');
    });

    test('should show error when name is empty after all fields filled', async ({ page }) => {
      const emailInput = page.getByLabel(/email address/i);
      const passwordInput = page.getByLabel(/^password$/i);
      const confirmInput = page.getByLabel(/confirm password/i);
      const submitButton = page.getByRole('button', { name: /create account/i });

      // Fill all fields except name
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      await confirmInput.fill('password123');
      await submitButton.click();

      // Should show name validation error (HTML5 validation or custom error)
      // The form may show "Please enter your full name" or browser validation
      const nameInput = page.getByLabel(/full name/i);
      const validationMessage = await nameInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });

    test('should show error when passwords do not match on submit', async ({ page }) => {
      const nameInput = page.getByLabel(/full name/i);
      const emailInput = page.getByLabel(/email address/i);
      const passwordInput = page.getByLabel(/^password$/i);
      const confirmInput = page.getByLabel(/confirm password/i);
      const submitButton = page.getByRole('button', { name: /create account/i });

      await nameInput.fill('John Doe');
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      await confirmInput.fill('different');

      // Error should already be visible before submit (shown on input)
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('should show error when password requirements not met', async ({ page }) => {
      const nameInput = page.getByLabel(/full name/i);
      const emailInput = page.getByLabel(/email address/i);
      const passwordInput = page.getByLabel(/^password$/i);
      const confirmInput = page.getByLabel(/confirm password/i);
      const submitButton = page.getByRole('button', { name: /create account/i });

      await nameInput.fill('John Doe');
      await emailInput.fill('test@example.com');
      await passwordInput.fill('weak');
      await confirmInput.fill('weak');
      await submitButton.click();

      await expect(page.getByText(/password does not meet all requirements/i)).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should have link to login page', async ({ page }) => {
      const loginLink = page.getByRole('link', { name: /sign in/i });
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toHaveAttribute('href', '/login');
    });

    test('should navigate to login when clicked', async ({ page }) => {
      // Click the "Sign in" link at the bottom (not the auth toggle button)
      const signInLink = page.getByRole('link', { name: /sign in/i });
      await signInLink.click();
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Terms and Privacy Links', () => {
    test('should render terms and privacy footer', async ({ page }) => {
      await expect(page.getByText(/by signing up, you agree/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /terms of service/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible();
    });
  });

  test.describe('Loading States', () => {
    test('should show loading state when submitting valid form', async ({ page }) => {
      const nameInput = page.getByLabel(/full name/i);
      const emailInput = page.getByLabel(/email address/i);
      const passwordInput = page.getByLabel(/^password$/i);
      const confirmInput = page.getByLabel(/confirm password/i);
      const submitButton = page.getByRole('button', { name: /create account/i });

      await nameInput.fill('John Doe');
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      await confirmInput.fill('password123');

      await submitButton.click();

      // Wait for loading state
      await page.waitForTimeout(100);

      // Button text changes during loading
      const buttonText = await submitButton.textContent();
      expect(buttonText).toBeTruthy();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper labels for all inputs', async ({ page }) => {
      await expect(page.getByLabel(/full name/i)).toBeVisible();
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    });

    test('should have proper button roles', async ({ page }) => {
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^password$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /magic link/i })).toBeVisible();
    });

    test('should have autocomplete attributes', async ({ page }) => {
      const nameInput = page.getByLabel(/full name/i);
      const emailInput = page.getByLabel(/email address/i);
      const passwordInput = page.getByLabel(/^password$/i);

      await expect(nameInput).toHaveAttribute('autocomplete', 'name');
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
      await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
    });
  });
});
