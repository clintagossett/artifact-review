import { test, expect } from '@playwright/test';
import { getLatestEmail, extractMagicLink } from '../utils/resend';

// Helper to generate unique users
const generateUser = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    // Use a unique email for each test run to avoid "Email already in use" errors.
    // For password signup, we can use any domain.
    // For magic link, we need a domain that Resend accepts.
    // If the user is in "Test Mode" on Resend, they can usually only send to their own email.
    // However, if they have a domain set up, we can use that.
    // Use `delivered@resend.dev` for guaranteed "delivery" simulation in Resend, 
    // but we need unique emails for signup.
    // Let's try attempting with a + alias on the configured FROM address if possible, 
    // or just a standard example.com and rely on Resend Test Mode "sink" behavior if configured?
    // The user said: "check received email in resend via API".
    // If we use `example.com`, Resend might drop it in test mode?
    // Safeguard: Use a random email at example.com. 
    // If the Resend API call returns the email (even if "bounced" or "test mode limited"), we are good.
    return {
        name: `Test User ${timestamp}`,
        email: `test.user+${timestamp}${random}@example.com`,
        password: `Pass${timestamp}!${random}`,
    };
};

test.describe('Authentication Flows', () => {

    test('Signup with Password', async ({ page }) => {
        const user = generateUser();

        await page.goto('/register');

        // Fill out the form
        await page.getByLabel('Full name').fill(user.name);
        await page.getByLabel('Email address').fill(user.email);
        await page.getByLabel('Password', { exact: true }).fill(user.password);
        await page.getByLabel('Confirm password').fill(user.password);

        // Submit
        await page.getByRole('button', { name: 'Create Account' }).click();

        // Verify redirection to dashboard or success state
        // Ideally we check for a dashboard element
        await expect(page).toHaveURL(/\/dashboard/);

        // Optional: Check if user name is displayed
        // await expect(page.getByText(user.name)).toBeVisible(); 
    });

    test('Login/Signup with Magic Link', async ({ page }) => {
        // Note: Magic link flow in this app seems to handle both signup and login via the same "Sign in" 
        // or via "Sign up" -> "Passwordless".
        // Let's use the Login page flow which is the standard "Magic Link" entry point.
        const user = generateUser();

        await page.goto('/login');

        // Switch to Magic Link
        // The toggle might be a button or radio. Based on component code:
        // <AuthMethodToggle ... />
        // We need to click the "Magic Link" option.
        // Assuming it has text "Magic Link" or similar.
        // Let's inspect AuthMethodToggle logic or just try to click text "Passwordless" or "Magic Link"
        // In LoginForm.tsx: "Passwordless sign in" is in the info box, but the toggle?
        // Let's assume there are buttons/tabs.
        // I'll try to find the toggle trigger.
        await page.getByText('Magic Link').click();

        // Fill email
        await page.getByLabel('Email address').fill(user.email);

        // Submit
        await page.getByRole('button', { name: 'Send Magic Link' }).click();

        // Verify "Check Your Email" message
        await expect(page.getByText('Check Your Email')).toBeVisible();
        await expect(page.getByText(user.email)).toBeVisible();

        // Fetch email from Resend (This is the critical "integration" part)
        // We poll until we find an email to this address
        console.log(`Polling Resend for email to ${user.email}...`);
        const emailData = await getLatestEmail(user.email);
        expect(emailData).toBeTruthy();

        console.log('Email received, extracting link...');
        const magicLink = extractMagicLink(emailData.html);
        expect(magicLink).toBeTruthy();
        console.log('Found magic link:', magicLink);

        // Navigate to the magic link
        await page.goto(magicLink!);

        // Should be logged in now
        await expect(page).toHaveURL(/\/dashboard/);
    });

});
