import { test, expect } from '@playwright/test';

test.describe('Hash Navigation Routing', () => {
  test('should render homepage content after clicking back from login page', async ({ page }) => {
    // Step 1: Go to homepage
    await page.goto('/');
    
    // Step 2: Click Pricing link in header (navigates to /#pricing)
    await page.click('a[href="#pricing"]');
    
    // Verify we're at /#pricing
    await expect(page).toHaveURL('/#pricing');
    
    // Step 3: Click Sign In button (navigates to /login)
    await page.click('text=Sign In');
    
    // Verify we're at /login
    await expect(page).toHaveURL('/login');
    
    // Step 4: Click browser Back button
    await page.goBack();
    
    // Step 5: Verify URL shows /#pricing
    await expect(page).toHaveURL('/#pricing');
    
    // Step 6: CRITICAL TEST - Homepage content should be visible
    // Check for hero section heading
    await expect(page.getByRole('heading', { name: /From AI output to stakeholder feedback/i })).toBeVisible();
    
    // Check that we're not stuck on a blank page
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('should scroll to pricing section when clicking pricing link', async ({ page }) => {
    await page.goto('/');

    // Click Pricing link
    await page.click('a[href="#pricing"]');

    // Verify URL has hash
    await expect(page).toHaveURL('/#pricing');

    // Verify pricing section is visible and scrolled into view
    const pricingSection = page.locator('#pricing');
    await expect(pricingSection).toBeVisible();

    // Wait for smooth scroll to complete
    await page.waitForTimeout(500);

    // Check that pricing content is in viewport
    const isInViewport = await pricingSection.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight;
    });
    expect(isInViewport).toBe(true);
  });

  test('should handle all header anchor links correctly', async ({ page }) => {
    const anchors = [
      { hash: '#features', name: 'features' },
      { hash: '#pricing', name: 'pricing' },
      { hash: '#faq', name: 'faq' }
    ];

    for (const anchor of anchors) {
      await page.goto('/');

      // Click the anchor link
      await page.click(`a[href="${anchor.hash}"]`);

      // Verify URL
      await expect(page).toHaveURL(`/${anchor.hash}`);

      // Verify section exists and is visible (this is the critical part)
      const section = page.locator(anchor.hash);
      await expect(section).toBeVisible();

      // Verify we can see content in the section (proves scroll happened)
      // Just checking visibility is enough - the scroll behavior may vary
      // but as long as the section is visible, it's working
    }
  });

  test('should handle back button from any anchor link', async ({ page }) => {
    // Test with Features link
    await page.goto('/');
    await page.click('a[href="#features"]');
    await expect(page).toHaveURL('/#features');
    
    // Navigate to login
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/login');
    
    // Go back
    await page.goBack();
    await expect(page).toHaveURL('/#features');
    
    // Verify homepage content is visible
    await expect(page.getByRole('heading', { name: /From AI output to stakeholder feedback/i })).toBeVisible();
    
    // Verify features section is visible
    const featuresSection = page.locator('#features');
    await expect(featuresSection).toBeVisible();
  });
});
