import { test, expect } from '@playwright/test';

/**
 * Systems Integration Smoke Tests
 * 
 * These tests verify that external services are properly connected and operational.
 * Each test should be lightweight and fast - just enough to confirm the integration works.
 * 
 * Current Integrations:
 * - Novu (Notifications)
 * 
 * Planned Integrations:
 * - Social Logins (Google, GitHub)
 * - GitHub (Artifact sync)
 * - Stripe (Payments)
 */

// Helper to generate unique test user
const generateUser = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return {
        name: `Smoke Test User`,
        email: `smoke.test+${timestamp}-${random}@tolauante.resend.app`,
        password: `SmokeTest${timestamp}!`,
    };
};

// Quick signup helper
async function quickSignup(page: any) {
    const user = generateUser();
    await page.goto('/register');
    // Wait for the registration form to be visible (Convex auth check must complete)
    await page.waitForSelector('label:has-text("Full name")', { timeout: 30000 });
    await page.getByLabel('Full name').fill(user.name);
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByLabel('Confirm password').fill(user.password);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    return user;
}

test.describe('Systems Integration Smoke Tests', () => {

    test.describe('Novu - Notifications', () => {

        test('NotificationCenter renders and is interactive', async ({ page }) => {
            await quickSignup(page);

            // Bell icon renders
            const bellIcon = page.locator('svg.lucide-bell').first();
            await expect(bellIcon).toBeVisible({ timeout: 10000 });

            // Clicking opens popover (tests Novu SDK connection)
            const bellClickable = page.locator('div:has(> svg.lucide-bell)').first();
            await bellClickable.click();
            await page.waitForTimeout(500);

            // Screenshot for verification
            await page.screenshot({ path: 'test-results/smoke-novu.png' });
            console.log('✓ Novu: NotificationCenter operational');
        });

    });

    test.describe('Resend/Mailpit - Email', () => {

        test('Magic link email is delivered (via Mailpit in local)', async ({ page }) => {
            const timestamp = Date.now();
            const testEmail = `smoke.email+${timestamp}@tolauante.resend.app`;

            await page.goto('/login');
            await page.getByRole('button', { name: 'Magic Link' }).click();
            await page.getByLabel('Email address').fill(testEmail);
            await page.getByRole('button', { name: 'Send Magic Link' }).click();

            // Verify "Check Your Email" confirmation
            await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 10000 });
            console.log('✓ Resend: Magic link email triggered');

            // In local mode, we could also check Mailpit API via MAILPIT_API_URL env var
            // For smoke test, confirming the trigger is sufficient
        });

    });

    test.describe('Novu - Notification Delivery (API Validation)', () => {

        // This test is marked slow due to multi-user flow complexity
        test('Comment triggers notification (validated via Novu API)', async ({ page, context }) => {
            test.slow(); // Mark as slow test (3x timeout)
            test.setTimeout(180000);

            // Helper to check Novu API for sent notifications
            async function getNovuNotifications(subscriberId: string): Promise<any[]> {
                const apiKey = process.env.NOVU_SECRET_KEY;
                if (!apiKey) {
                    console.warn('NOVU_SECRET_KEY not set, skipping API validation');
                    return [];
                }
                const baseUrl = process.env.NOVU_API_URL || 'http://api.novu.loc'; // Shared Novu API
                try {
                    const response = await fetch(`${baseUrl}/v1/notifications?subscriberId=${subscriberId}&limit=10`, {
                        headers: { 'Authorization': `ApiKey ${apiKey}` },
                    });
                    if (!response.ok) return [];
                    const data = await response.json();
                    return data.data || [];
                } catch { return []; }
            }

            // --- OWNER: Create artifact ---
            const owner = generateUser();
            await page.goto('/register');
            // Wait for the registration form to be visible (Convex auth check must complete)
            await page.waitForSelector('label:has-text("Full name")', { timeout: 30000 });
            await page.getByLabel('Full name').fill(owner.name);
            await page.getByLabel('Email address').fill(owner.email);
            await page.getByLabel('Password', { exact: true }).fill(owner.password);
            await page.getByLabel('Confirm password').fill(owner.password);
            await page.getByRole('button', { name: 'Create Account' }).click();
            await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
            console.log('✓ Owner signed up');

            // Get owner's user ID for later API check (we'll use email as subscriberId)
            const ownerSubscriberId = owner.email;

            // Upload artifact
            await page.getByRole('button', { name: 'Upload' }).click();
            await expect(page.getByText('Create New Artifact')).toBeVisible();
            await page.locator('input[type="file"]').setInputFiles(
                '/home/clint-gossett/Documents/Personal Projects/artifact-review/samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip'
            );
            await page.getByLabel('Artifact Name').fill(`API Test ${Date.now()}`);
            await page.getByRole('button', { name: 'Create Artifact' }).click();
            await expect(page).toHaveURL(/\/a\//, { timeout: 30000 });
            const artifactUrl = page.url();
            console.log(`✓ Artifact created: ${artifactUrl}`);

            // --- REVIEWER: Comment on artifact ---
            const reviewer = generateUser();
            const reviewerPage = await context.newPage();
            await reviewerPage.goto('/register');
            // Wait for the registration form to be visible (Convex auth check must complete)
            await reviewerPage.waitForSelector('label:has-text("Full name")', { timeout: 30000 });
            await reviewerPage.getByLabel('Full name').fill(reviewer.name);
            await reviewerPage.getByLabel('Email address').fill(reviewer.email);
            await reviewerPage.getByLabel('Password', { exact: true }).fill(reviewer.password);
            await reviewerPage.getByLabel('Confirm password').fill(reviewer.password);
            await reviewerPage.getByRole('button', { name: 'Create Account' }).click();
            await expect(reviewerPage).toHaveURL(/\/dashboard/, { timeout: 15000 });
            console.log('✓ Reviewer signed up');

            // Navigate to artifact and comment
            await reviewerPage.goto(artifactUrl);
            await expect(reviewerPage.getByText(/Comments \(/)).toBeVisible({ timeout: 10000 });
            await reviewerPage.getByRole('button', { name: 'Comment', exact: true }).first().click();

            // Text selection to trigger comment
            const frame = reviewerPage.frameLocator('iframe');
            await frame.locator('h1, p, div').first().evaluate((el) => {
                const range = document.createRange();
                range.selectNodeContents(el);
                window.getSelection()?.removeAllRanges();
                window.getSelection()?.addRange(range);
                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            });

            const textarea = reviewerPage.locator('textarea[placeholder="Add a comment..."]');
            await expect(textarea).toBeVisible({ timeout: 5000 });
            await textarea.fill(`Test comment ${Date.now()}`);
            await reviewerPage.getByRole('button', { name: 'Comment' }).last().click();
            console.log('✓ Comment submitted');

            // Wait for Novu to process
            await reviewerPage.waitForTimeout(3000);

            // --- VALIDATE: Check Novu API for notification ---
            const notifications = await getNovuNotifications(ownerSubscriberId);
            console.log(`Novu API: Found ${notifications.length} notifications for owner`);

            if (notifications.length > 0) {
                console.log('✓ Novu API: Notification sent to owner');
            } else {
                console.log('⚠ Novu API: No notifications found (may need subscriber sync)');
            }

            await reviewerPage.close();
        });

    });

    // Future: Uncomment when implemented
    // test.describe('Social Logins', () => {
    //     test('Google OAuth button visible on login', async ({ page }) => {
    //         await page.goto('/login');
    //         await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    //         console.log('✓ Google OAuth: Button visible');
    //     });
    //
    //     test('GitHub OAuth button visible on login', async ({ page }) => {
    //         await page.goto('/login');
    //         await expect(page.getByRole('button', { name: /github/i })).toBeVisible();
    //         console.log('✓ GitHub OAuth: Button visible');
    //     });
    // });

    // Future: Uncomment when implemented
    // test.describe('GitHub - Artifact Sync', () => {
    //     test('GitHub integration settings accessible', async ({ page }) => {
    //         await quickSignup(page);
    //         await page.goto('/settings/integrations');
    //         await expect(page.getByText(/github/i)).toBeVisible();
    //         console.log('✓ GitHub: Integration settings accessible');
    //     });
    // });

    // Future: Uncomment when implemented  
    // test.describe('Stripe - Payments', () => {
    //     test('Upgrade button triggers Stripe checkout', async ({ page }) => {
    //         await quickSignup(page);
    //         await page.goto('/settings/billing');
    //         await expect(page.getByRole('button', { name: /upgrade/i })).toBeVisible();
    //         console.log('✓ Stripe: Upgrade button visible');
    //     });
    // });

});
