import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Section Rendering', () => {
    test('should render Header with logo and navigation', async ({ page }) => {
      // Check for header element
      const header = page.locator('header').first();
      await expect(header).toBeVisible();

      // Check for navigation links in header (scoped to avoid footer duplicates)
      const nav = page.getByRole('navigation');
      await expect(nav.getByRole('link', { name: 'Features' })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Pricing' })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'FAQ' })).toBeVisible();

      // Auth buttons in header
      await expect(header.getByRole('button', { name: /sign in/i })).toBeVisible();
      await expect(header.getByRole('link', { name: /start free/i })).toBeVisible();
    });

    test('should render Hero section with main heading', async ({ page }) => {
      // Check for main hero heading
      await expect(page.getByRole('heading', { name: /from ai output to stakeholder feedback/i })).toBeVisible();

      // Check for CTA buttons
      await expect(page.getByRole('link', { name: /start free/i }).first()).toBeVisible();
    });

    test('should render Problem section', async ({ page }) => {
      // Check for section heading
      await expect(page.getByRole('heading', { name: /ai tools generate html.*collaboration tools break it/i })).toBeVisible();
    });

    test('should render How It Works section', async ({ page }) => {
      // Check for section heading (actual h2 text)
      await expect(page.getByRole('heading', { name: /upload.*share.*get feedback/i })).toBeVisible();

      // Check for steps
      await expect(page.getByText(/upload your artifact/i).first()).toBeVisible();
      await expect(page.getByText(/share with your team/i).first()).toBeVisible();
    });

    test('should render Features section', async ({ page }) => {
      // Check for section heading (actual heading text)
      await expect(page.getByRole('heading', { name: /built for ai-native teams/i })).toBeVisible();
    });

    test('should render Testimonials section', async ({ page }) => {
      // Check for section heading
      await expect(page.getByRole('heading', { name: /saving 2-3 hours per week/i })).toBeVisible();
    });

    test('should render Pricing section', async ({ page }) => {
      // Check for section heading
      await expect(page.getByRole('heading', { name: /start free.*upgrade when you're ready/i })).toBeVisible();
    });

    test('should render FAQ section', async ({ page }) => {
      // Check for section heading
      await expect(page.getByRole('heading', { name: /frequently asked questions/i })).toBeVisible();
    });

    test('should render CTA section', async ({ page }) => {
      // Check for CTA heading
      await expect(page.getByRole('heading', { name: /stop screenshotting and emailing/i })).toBeVisible();
    });

    test('should render Footer with links', async ({ page }) => {
      // Check for footer element
      const footer = page.locator('footer').last();
      await expect(footer).toBeVisible();

      // Check for footer links
      await expect(footer.getByRole('link', { name: /terms/i })).toBeVisible();
      await expect(footer.getByRole('link', { name: /privacy/i })).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to login page from header', async ({ page }) => {
      const header = page.locator('header');
      await header.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL('/login');
    });

    test('should navigate to signup page from header', async ({ page }) => {
      const header = page.locator('header');
      await header.getByRole('link', { name: /start free/i }).click();
      await expect(page).toHaveURL('/register');
    });

    test('should navigate to signup from hero CTA', async ({ page }) => {
      // The hero Start Free button
      await page.getByRole('link', { name: /start free/i }).first().click();
      await expect(page).toHaveURL('/register');
    });
  });

  test.describe('Scroll Behavior', () => {
    test('should have all sections visible when scrolling', async ({ page }) => {
      // Scroll to bottom of page
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Footer should be visible after scroll
      const footer = page.locator('footer').last();
      await expect(footer).toBeVisible();
    });
  });

  test.describe('Content Validation', () => {
    test('should display brand name "Artifact Review"', async ({ page }) => {
      await expect(page.getByText(/artifact review/i).first()).toBeVisible();
    });

    test('should display trusted by product teams', async ({ page }) => {
      // The hero section has "Trusted by 500+ product teams" text
      await expect(page.getByText(/500\+ product teams/i).first()).toBeVisible();
    });
  });
});
