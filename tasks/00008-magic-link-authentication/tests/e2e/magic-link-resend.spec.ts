import { test, expect } from '@playwright/test';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

// Skip these tests if RESEND_API_KEY is not configured
test.describe('Magic Link with Resend API', () => {
  test.skip(!resendApiKey, 'RESEND_API_KEY environment variable is required');

  test('should send magic link email via Resend', async ({ page }) => {
    if (!resendApiKey) return;

    const resend = new Resend(resendApiKey);
    const testEmail = `magic-${Date.now()}@tolauante.resend.app`;

    // 1. Request magic link
    await page.goto('/login');
    await page.getByRole('button', { name: /^magic link$/i }).click();
    await page.fill('input[type="email"]', testEmail);
    await page.click('button:has-text("Send Magic Link")');

    // 2. Verify success message
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });

    // 3. Retrieve email from Resend API (with retry logic)
    let ourEmail = null;
    let attempts = 0;
    const maxAttempts = 10;
    const delayMs = 2000;

    while (!ourEmail && attempts < maxAttempts) {
      await page.waitForTimeout(delayMs);

      const { data: emails } = await resend.emails.list();
      // Find the email sent to our test address from the correct sender
      ourEmail = emails?.data?.find((msg: any) =>
        msg.to?.includes(testEmail) &&
        msg.from === 'Artifact Review <hello@artifactreview-early.xyz>'
      );
      attempts++;
    }

    // 4. Verify email was sent
    expect(ourEmail).toBeDefined();
    expect(ourEmail?.subject).toContain('Sign in to Artifact Review');
    expect(ourEmail?.to).toContain(testEmail);
    expect(ourEmail?.from).toBe('Artifact Review <hello@artifactreview-early.xyz>');
  });

  test('should complete magic link flow end-to-end with Resend', async ({ page }) => {
    if (!resendApiKey) return;

    const resend = new Resend(resendApiKey);
    const testEmail = `e2e-${Date.now()}@tolauante.resend.app`;

    // 1. Request magic link
    await page.goto('/login');
    await page.getByRole('button', { name: /^magic link$/i }).click();
    await page.fill('input[type="email"]', testEmail);
    await page.click('button:has-text("Send Magic Link")');
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });

    // 2. Retrieve email from Resend API (with retry logic)
    let ourEmail = null;
    let attempts = 0;
    const maxAttempts = 10;
    const delayMs = 2000;

    while (!ourEmail && attempts < maxAttempts) {
      await page.waitForTimeout(delayMs);

      const { data: emails } = await resend.emails.list();
      // Find the email sent to our test address from the correct sender
      ourEmail = emails?.data?.find((msg: any) =>
        msg.to?.includes(testEmail) &&
        msg.from === 'Artifact Review <hello@artifactreview-early.xyz>'
      );
      attempts++;
    }

    expect(ourEmail).toBeDefined();

    // 3. Get full email content and extract magic link URL
    const { data: fullEmail } = await resend.emails.get(ourEmail!.id);
    expect(fullEmail).toBeDefined();

    const htmlContent = fullEmail?.html || '';
    // The URL is in an <a> tag with href attribute
    // Format: http://localhost:3000/?code=...
    const linkMatch = htmlContent.match(/href="([^"]*\?code=[^"]*)"/);
    expect(linkMatch).toBeDefined();
    expect(linkMatch).not.toBeNull();

    const magicLinkUrl = linkMatch![1];

    // 4. Navigate to the magic link URL
    await page.goto(magicLinkUrl);

    // 5. Wait for authentication to complete and redirect to dashboard
    // The fix ensures the redirect goes to /dashboard instead of /
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // 6. Verify user is redirected to dashboard page (main requirement)
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
