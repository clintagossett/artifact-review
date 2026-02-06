/**
 * Shared authentication utilities for E2E tests.
 *
 * Uses password auth by default to avoid Resend API rate limits in CI.
 * Magic link flow is tested once in auth.spec.ts to verify email delivery.
 */

import { expect } from '@playwright/test';

/**
 * Generate unique user data for each test run.
 * Includes password for password-based auth (preferred in CI).
 */
export const generateTestUser = (prefix = 'user') => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return {
        name: `${prefix}-${timestamp}`,
        email: `${prefix}+${timestamp}-${random}@tolauante.resend.app`,
        password: `TestPass${timestamp}!${random}`,
    };
};

/**
 * Sign up a new user with password auth.
 * This is the preferred method for E2E tests to avoid email polling rate limits.
 */
export async function signUpWithPassword(
    page: any,
    user: { name: string; email: string; password: string }
): Promise<void> {
    await page.goto('/register');

    // Wait for the registration form to load (Convex auth check must complete)
    await page.waitForSelector('label:has-text("Full name")', { timeout: 30000 });

    // Fill out the form
    await page.getByLabel('Full name').fill(user.name);
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByLabel('Confirm password').fill(user.password);

    // Submit
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
}

/**
 * Log in an existing user with password auth.
 */
export async function loginWithPassword(
    page: any,
    email: string,
    password: string
): Promise<void> {
    await page.goto('/login');

    // The login form defaults to password mode, but ensure we're on password tab
    // Check if we need to click the Password button (might already be selected)
    const passwordTab = page.getByRole('button', { name: 'Password' });
    if (await passwordTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await passwordTab.click();
    }

    // Fill credentials
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);

    // Submit
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
}

/**
 * Create a new user and log them in.
 * Combines signUp for first user, then can use login for subsequent sessions.
 *
 * @param page - Playwright page object
 * @param prefix - Prefix for generated username
 * @returns The generated user object with name, email, password
 */
export async function createAndLoginUser(
    page: any,
    prefix = 'user'
): Promise<{ name: string; email: string; password: string }> {
    const user = generateTestUser(prefix);
    await signUpWithPassword(page, user);
    return user;
}
