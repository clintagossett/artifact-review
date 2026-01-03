import { test, expect } from '@playwright/test';

test.describe('Cross-Page Navigation', () => {
  test.describe('Landing to Auth Pages', () => {
    test('should navigate from landing header to login', async ({ page }) => {
      await page.goto('/');

      // Click Sign In button in header
      const header = page.locator('header');
      await header.getByRole('button', { name: /sign in/i }).click();

      // Should be on login page
      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('should navigate from landing header to signup', async ({ page }) => {
      await page.goto('/');

      // Click Start Free link in header
      const header = page.locator('header');
      await header.getByRole('link', { name: /start free/i }).click();

      // Should be on signup page
      await expect(page).toHaveURL('/register');
      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    });

    test('should navigate from hero CTA to signup', async ({ page }) => {
      await page.goto('/');

      // Click "Start Free" main CTA in hero
      await page.getByRole('link', { name: /start free/i }).first().click();

      // Should be on signup page
      await expect(page).toHaveURL('/register');
      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    });

    test('should navigate from pricing section to signup', async ({ page }) => {
      await page.goto('/');

      // Scroll to pricing section
      await page.getByRole('heading', { name: /start free.*upgrade/i }).scrollIntoViewIfNeeded();

      // Click a pricing CTA button (Start Free or Start 14-Day Trial)
      const pricingCTA = page.getByRole('link', { name: /start free|start 14-day trial/i }).last();
      await pricingCTA.click();

      // Should be on signup page
      await expect(page).toHaveURL('/register');
    });

    test('should navigate from final CTA section to signup', async ({ page }) => {
      await page.goto('/');

      // Scroll to bottom CTA
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Wait for CTA section to be visible
      await page.waitForTimeout(500);

      // Click final CTA button (Start Free in CTA section)
      const ctaSection = page.locator('section').filter({ hasText: /stop screenshotting/i });
      await ctaSection.getByRole('link', { name: /start free/i }).click();

      // Should be on signup page
      await expect(page).toHaveURL('/register');
    });
  });

  test.describe('Login to Signup Flow', () => {
    test('should navigate from login to signup', async ({ page }) => {
      await page.goto('/login');

      // Click "Sign up" link
      await page.getByRole('link', { name: /sign up/i }).click();

      // Should be on signup page
      await expect(page).toHaveURL('/register');
      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    });

    test('should preserve context when navigating login to signup', async ({ page }) => {
      await page.goto('/login');

      // Enter email (user might have started filling form)
      await page.getByLabel(/email address/i).fill('test@example.com');

      // Navigate to signup
      await page.getByRole('link', { name: /sign up/i }).click();

      // Should be on fresh signup page
      await expect(page).toHaveURL('/register');
      const emailInput = page.getByLabel(/email address/i);

      // Email should be empty (fresh form)
      await expect(emailInput).toHaveValue('');
    });
  });

  test.describe('Signup to Login Flow', () => {
    test('should navigate from signup to login', async ({ page }) => {
      await page.goto('/register');

      // Click "Sign in" link
      await page.getByRole('link', { name: /sign in/i }).click();

      // Should be on login page
      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('should preserve context when navigating signup to login', async ({ page }) => {
      await page.goto('/register');

      // Enter email (user might have started filling form)
      await page.getByLabel(/email address/i).fill('test@example.com');

      // Navigate to login
      await page.getByRole('link', { name: /sign in/i }).click();

      // Should be on fresh login page
      await expect(page).toHaveURL('/login');
      const emailInput = page.getByLabel(/email address/i);

      // Email should be empty (fresh form)
      await expect(emailInput).toHaveValue('');
    });
  });

  test.describe('Bidirectional Auth Navigation', () => {
    test('should navigate login -> signup -> login', async ({ page }) => {
      // Start at login
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

      // Go to signup
      await page.getByRole('link', { name: /sign up/i }).click();
      await expect(page).toHaveURL('/register');
      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

      // Go back to login
      await page.getByRole('link', { name: /sign in/i }).click();
      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('should navigate signup -> login -> signup', async ({ page }) => {
      // Start at signup
      await page.goto('/register');
      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

      // Go to login
      await page.getByRole('link', { name: /sign in/i }).click();
      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

      // Go back to signup
      await page.getByRole('link', { name: /sign up/i }).click();
      await expect(page).toHaveURL('/register');
      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    });
  });

  test.describe('Footer Links', () => {
    test('should have terms link in landing footer', async ({ page }) => {
      await page.goto('/');

      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Check terms link exists in footer (footer links are # placeholders currently)
      const footer = page.locator('footer');
      const termsLink = footer.getByRole('link', { name: /terms/i });
      await expect(termsLink).toBeVisible();
    });

    test('should have privacy link in landing footer', async ({ page }) => {
      await page.goto('/');

      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Check privacy link exists in footer
      const footer = page.locator('footer');
      const privacyLink = footer.getByRole('link', { name: /privacy/i });
      await expect(privacyLink).toBeVisible();
    });

    test('should have terms link in login page', async ({ page }) => {
      await page.goto('/login');

      const termsLink = page.getByRole('link', { name: /terms of service/i });
      await expect(termsLink).toBeVisible();
      await expect(termsLink).toHaveAttribute('href', '/terms');
    });

    test('should have privacy link in login page', async ({ page }) => {
      await page.goto('/login');

      const privacyLink = page.getByRole('link', { name: /privacy policy/i });
      await expect(privacyLink).toBeVisible();
      await expect(privacyLink).toHaveAttribute('href', '/privacy');
    });

    test('should have terms link in signup page', async ({ page }) => {
      await page.goto('/register');

      const termsLink = page.getByRole('link', { name: /terms of service/i });
      await expect(termsLink).toBeVisible();
      await expect(termsLink).toHaveAttribute('href', '/terms');
    });

    test('should have privacy link in signup page', async ({ page }) => {
      await page.goto('/register');

      const privacyLink = page.getByRole('link', { name: /privacy policy/i });
      await expect(privacyLink).toBeVisible();
      await expect(privacyLink).toHaveAttribute('href', '/privacy');
    });
  });

  test.describe('Browser Navigation', () => {
    test('should support back button from login to landing', async ({ page }) => {
      await page.goto('/');
      const header = page.locator('header');
      await header.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL('/login');

      // Go back
      await page.goBack();

      // Should be on landing page
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: /from ai output to stakeholder feedback/i })).toBeVisible();
    });

    test('should support back button from signup to landing', async ({ page }) => {
      await page.goto('/');
      const header = page.locator('header');
      await header.getByRole('link', { name: /start free/i }).click();
      await expect(page).toHaveURL('/register');

      // Go back
      await page.goBack();

      // Should be on landing page
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: /from ai output to stakeholder feedback/i })).toBeVisible();
    });

    test('should support back button from signup to login', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('link', { name: /sign up/i }).click();
      await expect(page).toHaveURL('/register');

      // Go back
      await page.goBack();

      // Should be on login page
      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('should support forward button navigation', async ({ page }) => {
      await page.goto('/');
      // Navigate to login directly via URL to avoid button issues
      await page.goto('/login');
      await expect(page).toHaveURL('/login');
      await page.goBack();
      await expect(page).toHaveURL('/');

      // Go forward
      await page.goForward();

      // Should be back on login page
      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });
  });

  test.describe('Section Anchor Navigation', () => {
    test('should navigate to features section from header', async ({ page }) => {
      await page.goto('/');

      // Click features link in header navigation
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Features' }).click();

      // Should still be on landing page with hash
      await expect(page).toHaveURL(/\/#features|\/$/);

      // Features section heading should be visible
      await expect(page.getByRole('heading', { name: /built for ai-native teams/i })).toBeVisible();
    });

    test('should navigate to pricing section from header', async ({ page }) => {
      await page.goto('/');

      // Click pricing link in header navigation
      const nav = page.getByRole('navigation');
      await nav.getByRole('link', { name: 'Pricing' }).click();

      // Should still be on landing page with hash
      await expect(page).toHaveURL(/\/#pricing|\/$/);

      // Pricing section heading should be visible
      await expect(page.getByRole('heading', { name: /start free.*upgrade/i })).toBeVisible();
    });
  });

  test.describe('Deep Linking', () => {
    test('should load login page directly via URL', async ({ page }) => {
      await page.goto('/login');

      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('should load signup page directly via URL', async ({ page }) => {
      await page.goto('/register');

      await expect(page).toHaveURL('/register');
      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    });

    test('should load landing page directly via URL', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: /from ai output to stakeholder feedback/i })).toBeVisible();
    });
  });
});
