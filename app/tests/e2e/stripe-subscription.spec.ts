import { test, expect } from '@playwright/test';

/**
 * E2E Test: Pro Monthly Subscription Signup
 *
 * Tests the complete Stripe checkout flow for Pro Monthly plan:
 * 1. Sign up a new user with password
 * 2. Navigate to Settings > Billing
 * 3. Select Monthly billing interval
 * 4. Complete Stripe Checkout with test card
 * 5. Verify redirect back with success state
 *
 * Prerequisites:
 * - Dev servers running (./scripts/start-dev-servers.sh)
 * - Stripe CLI forwarding webhooks (orchestrator handles this)
 * - Stripe env vars set in Convex (STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PRO, etc.)
 *
 * Test card: 4242 4242 4242 4242
 * See: tasks/00057-e2e-stripe-pro-monthly/stripe-test-data.md
 */

// Helper to generate unique test users
const generateUser = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return {
        name: `Stripe Test ${timestamp}`,
        email: `stripe.test+${timestamp}-${random}@tolauante.resend.app`,
        password: `StripePass${timestamp}!${random}`,
    };
};

test.describe('Stripe Pro Monthly Subscription', () => {
    // Extended timeout for full Stripe flow
    test.setTimeout(180000);

    // Stripe webhooks are configured in the Stripe Dashboard to point to
    // the staging Convex endpoint: https://adventurous-mosquito-571.convex.site/stripe/webhook
    // No local Stripe CLI needed - webhooks are delivered directly by Stripe.

    test('Complete Pro Monthly subscription signup via Stripe Checkout', async ({ page }) => {
        const user = generateUser();
        console.log(`Testing with user: ${user.email}`);

        // ──────────────────────────────────────────────────────────
        // Step 1: Sign up with password
        // ──────────────────────────────────────────────────────────
        console.log('Step 1: Signing up new user...');
        await page.goto('/register');
        await page.waitForSelector('label:has-text("Full name")', { timeout: 30000 });

        await page.getByLabel('Full name').fill(user.name);
        await page.getByLabel('Email address').fill(user.email);
        await page.getByLabel('Password', { exact: true }).fill(user.password);
        await page.getByLabel('Confirm password').fill(user.password);
        await page.getByRole('button', { name: 'Create Account' }).click();

        // Wait for redirect to dashboard
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
        console.log('✓ User signed up and redirected to dashboard');

        // ──────────────────────────────────────────────────────────
        // Step 2: Navigate to Settings > Billing
        // ──────────────────────────────────────────────────────────
        console.log('Step 2: Navigating to Settings > Billing...');
        await page.goto('/settings');
        await page.waitForLoadState('networkidle', { timeout: 30000 });

        // Wait for settings page to load
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 30000 });

        // Click Billing tab
        await page.getByRole('button', { name: 'Billing' }).click();

        // Wait for BillingSection to load
        await expect(page.getByText('Subscription & Billing')).toBeVisible({ timeout: 30000 });
        console.log('✓ Billing section loaded');

        // ──────────────────────────────────────────────────────────
        // Step 3: Verify Free plan state and select Monthly
        // ──────────────────────────────────────────────────────────
        console.log('Step 3: Verifying Free plan and selecting Monthly...');

        // Verify currently on Free plan
        await expect(page.locator('text=FREE').first()).toBeVisible({ timeout: 30000 });
        console.log('✓ User is on Free plan');

        // Select Monthly billing (default is Annual)
        await page.getByRole('button', { name: 'Monthly' }).click();

        // Verify Monthly pricing shows ($12/mo)
        await expect(page.getByText('$12')).toBeVisible({ timeout: 30000 });
        console.log('✓ Monthly pricing displayed ($12/mo)');

        // ──────────────────────────────────────────────────────────
        // Step 4: Click Upgrade and wait for Stripe Checkout
        // ──────────────────────────────────────────────────────────
        console.log('Step 4: Starting Stripe Checkout...');

        // Click "Upgrade to Pro" button
        const upgradeButton = page.getByRole('button', { name: /Upgrade to Pro/i });
        await expect(upgradeButton).toBeVisible({ timeout: 30000 });
        await upgradeButton.click();

        // Wait for redirect to Stripe Checkout
        await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 });
        console.log('✓ Redirected to Stripe Checkout');

        // Wait for page to be fully loaded - Stripe checkout can be slow
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
            console.log('Network idle timeout on Stripe - continuing');
        });
        // Give Stripe form additional time to initialize
        await page.waitForTimeout(2000);
        await page.waitForSelector('input#email, input[name="email"]', { timeout: 30000 });

        // ──────────────────────────────────────────────────────────
        // Step 5: Fill email field
        // ──────────────────────────────────────────────────────────
        console.log('Step 5: Filling contact email...');

        // Wait for and fill email field
        const emailField = page.locator('input#email, input[name="email"]');
        await expect(emailField).toBeVisible({ timeout: 30000 });
        await emailField.fill(user.email);
        console.log('✓ Email filled');

        // ──────────────────────────────────────────────────────────
        // Step 6: Select Card payment method
        // ──────────────────────────────────────────────────────────
        console.log('Step 6: Selecting Card payment method...');

        // Click on the Card payment option - try multiple selectors
        // The Card option has a radio button and text "Card"
        const cardLabel = page.getByText('Card', { exact: true }).first();
        await expect(cardLabel).toBeVisible({ timeout: 30000 });

        // Click with force to bypass any overlays
        await cardLabel.click({ force: true });
        console.log('✓ Clicked Card option');

        // Wait for card form to expand - wait for card number field instead of arbitrary timeout
        await page.waitForSelector('input[placeholder="1234 1234 1234 1234"]', { timeout: 30000 });

        // ──────────────────────────────────────────────────────────
        // Step 7: Fill card details
        // ──────────────────────────────────────────────────────────
        console.log('Step 7: Filling card details...');

        // Card number - find by placeholder text
        const cardNumberInput = page.getByPlaceholder('1234 1234 1234 1234');
        await expect(cardNumberInput).toBeVisible({ timeout: 30000 });
        await cardNumberInput.fill('4242424242424242');
        console.log('✓ Card number filled');

        // Expiry - MM / YY placeholder
        const expiryInput = page.getByPlaceholder('MM / YY');
        await expect(expiryInput).toBeVisible({ timeout: 30000 });
        await expiryInput.fill('02/29');
        console.log('✓ Expiry filled');

        // CVC
        const cvcInput = page.getByPlaceholder('CVC');
        await expect(cvcInput).toBeVisible({ timeout: 30000 });
        await cvcInput.fill('001');
        console.log('✓ CVC filled');

        // ──────────────────────────────────────────────────────────
        // Step 8: Fill cardholder name
        // ──────────────────────────────────────────────────────────
        console.log('Step 8: Filling cardholder name...');

        const cardholderNameInput = page.getByPlaceholder('Full name on card');
        await expect(cardholderNameInput).toBeVisible({ timeout: 30000 });
        await cardholderNameInput.fill('Test User');
        console.log('✓ Cardholder name filled');

        // ──────────────────────────────────────────────────────────
        // Step 9: Fill ZIP code (Country already set to United States)
        // ──────────────────────────────────────────────────────────
        console.log('Step 9: Filling ZIP code...');

        const zipInput = page.getByPlaceholder('ZIP');
        await expect(zipInput).toBeVisible({ timeout: 30000 });
        await zipInput.fill('80301');
        console.log('✓ ZIP: 80301');

        // ──────────────────────────────────────────────────────────
        // Step 10: Uncheck "Save my information" if visible
        // ──────────────────────────────────────────────────────────
        console.log('Step 10: Looking for save info checkbox...');

        // Scroll down to see the save info checkbox if it's below the fold
        await page.evaluate(() => window.scrollBy(0, 300));
        // Wait for scroll to complete and elements to stabilize
        await page.waitForLoadState('domcontentloaded');

        const saveInfoCheckbox = page.locator('input[name="enableStripePass"]');
        if (await saveInfoCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
            const isChecked = await saveInfoCheckbox.isChecked();
            if (isChecked) {
                await saveInfoCheckbox.click({ force: true });
                console.log('✓ Unchecked "Save my information"');
            }
        } else {
            // Try clicking the label text instead
            const saveLabel = page.getByText('Save my information');
            if (await saveLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
                await saveLabel.click();
                console.log('✓ Toggled save info via label');
            }
        }

        // ──────────────────────────────────────────────────────────
        // Step 11: Submit payment
        // ──────────────────────────────────────────────────────────
        console.log('Step 11: Submitting payment...');

        // Click Subscribe button - wait for it to be enabled (not in loading state)
        const subscribeButton = page.getByRole('button', { name: 'Subscribe' });
        await expect(subscribeButton).toBeVisible({ timeout: 30000 });
        await expect(subscribeButton).toBeEnabled({ timeout: 10000 });
        await subscribeButton.click();
        console.log('✓ Subscribe button clicked');

        // ──────────────────────────────────────────────────────────
        // Step 12: Wait for redirect back to app with success
        // ──────────────────────────────────────────────────────────
        console.log('Step 12: Waiting for redirect back to app...');

        // Wait for redirect back to /settings with success parameter
        // This may take time for Stripe to process and webhook to fire
        // In CI, Stripe processing can be slower
        await page.waitForURL(/\/settings\?success=true/, { timeout: 120000 });
        console.log('✓ Redirected back with success=true');

        // ──────────────────────────────────────────────────────────
        // Step 13: Click Billing tab and verify success UI
        // ──────────────────────────────────────────────────────────
        console.log('Step 13: Navigating to Billing tab...');

        // Wait for settings page to load
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 30000 });

        // Click the Billing tab (settings page may default to a different tab)
        await page.getByRole('button', { name: 'Billing' }).click();

        // Wait for BillingSection to load
        await expect(page.getByText('Subscription & Billing')).toBeVisible({ timeout: 30000 });
        console.log('✓ Billing section loaded');

        // Wait for the success message to appear (shows when ?success=true is in URL)
        await expect(page.getByText("You're all set!")).toBeVisible({ timeout: 30000 });
        console.log('✓ Success message displayed');

        // Verify upgrade was successful - should show PRO badge
        await expect(page.locator('text=PRO').first()).toBeVisible({ timeout: 30000 });
        console.log('✓ PRO badge visible - subscription active');

        console.log('═══════════════════════════════════════════════════');
        console.log('✓ TEST PASSED: Pro Monthly subscription completed!');
        console.log('═══════════════════════════════════════════════════');
    });
});
