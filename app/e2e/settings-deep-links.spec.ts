import { test, expect } from "@playwright/test";

/**
 * Settings Deep Links E2E Tests
 *
 * Validates path-based routing for settings sections:
 * - /settings redirects to /settings/account
 * - /settings/account shows account settings
 * - /settings/agents shows agents section
 * - /settings/developer shows developer section
 * - /settings/billing shows billing section
 * - Deep links are bookmarkable and shareable
 *
 * Issue: #95
 */

test.describe("Settings Deep Links", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.getByRole("button", { name: /password/i }).click();
    await page.getByPlaceholder(/you@company\.com/i).fill(process.env.TEST_USER_EMAIL || "test@example.com");
    await page.getByPlaceholder(/enter your password/i).fill(process.env.TEST_USER_PASSWORD || "TestPassword123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test("/settings redirects to /settings/account", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL("/settings/account");
    expect(page.url()).toContain("/settings/account");
  });

  test("/settings/account shows account section", async ({ page }) => {
    await page.goto("/settings/account");
    await expect(page.getByText(/account information/i)).toBeVisible({ timeout: 10000 });
    // Verify sidebar shows account as active
    await expect(page.locator('a[href="/settings/account"]')).toHaveClass(/bg-gray-100/);
  });

  test("/settings/agents shows agents section", async ({ page }) => {
    await page.goto("/settings/agents");
    await expect(page.getByText(/api key/i)).toBeVisible({ timeout: 10000 });
    // Verify sidebar shows agents as active
    await expect(page.locator('a[href="/settings/agents"]')).toHaveClass(/bg-gray-100/);
  });

  test("/settings/developer shows developer section", async ({ page }) => {
    await page.goto("/settings/developer");
    // Developer section should be visible
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Verify sidebar shows developer as active
    await expect(page.locator('a[href="/settings/developer"]')).toHaveClass(/bg-gray-100/);
  });

  test("/settings/billing shows billing section", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(page.getByText(/subscription|billing|plans/i)).toBeVisible({ timeout: 10000 });
    // Verify sidebar shows billing as active
    await expect(page.locator('a[href="/settings/billing"]')).toHaveClass(/bg-gray-100/);
  });

  test("sidebar navigation updates URL", async ({ page }) => {
    await page.goto("/settings/account");
    await page.waitForLoadState("networkidle");

    // Click billing in sidebar
    await page.click('a[href="/settings/billing"]');
    await page.waitForURL("/settings/billing");
    expect(page.url()).toContain("/settings/billing");

    // Click agents in sidebar
    await page.click('a[href="/settings/agents"]');
    await page.waitForURL("/settings/agents");
    expect(page.url()).toContain("/settings/agents");

    // Click developer in sidebar
    await page.click('a[href="/settings/developer"]');
    await page.waitForURL("/settings/developer");
    expect(page.url()).toContain("/settings/developer");

    // Click account in sidebar
    await page.click('a[href="/settings/account"]');
    await page.waitForURL("/settings/account");
    expect(page.url()).toContain("/settings/account");
  });

  test("deep links preserve query params", async ({ page }) => {
    // Simulate Stripe success redirect
    await page.goto("/settings/billing?success=true");
    await expect(page.getByText(/subscription|billing|plans/i)).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain("success=true");
  });

  test("back to dashboard button works from all sections", async ({ page }) => {
    const sections = ["account", "agents", "developer", "billing"];

    for (const section of sections) {
      await page.goto(`/settings/${section}`);
      await page.waitForLoadState("networkidle");

      const backButton = page.getByRole("button", { name: /back to dashboard/i });
      await expect(backButton).toBeVisible();
    }
  });
});
