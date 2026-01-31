import { test, expect } from '@playwright/test';
import { getLatestEmail, extractMagicLink } from '../utils/resend';
import path from 'path';

/**
 * End-to-End Artifact Workflow Test
 *
 * Flow:
 * 1. Login using Magic Link (polling Mailpit)
 * 2. Upload a multi-artifact ZIP (mixed-media-sample.zip)
 * 3. Verify File Tree visibility
 * 4. Add a comment on the main page via text selection
 * 5. Verify comment appears in sidebar
 */

// Helper to generate unique users
const generateUser = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return {
        name: `Workflow User ${timestamp}`,
        email: `test.user+${timestamp}-${random}@tolauante.resend.app`,
    };
};

test.describe('End-to-End Artifact Workflow', () => {

    test('Complete artifact lifecycle: Login -> ZIP Upload -> Viewer', async ({ page }) => {
        test.setTimeout(90000); // Increased timeout for the full flow
        const user = generateUser();

        // 1. Magic Link Login
        console.log('Starting magic link login...');
        await page.goto('/login');

        // Ensure we are on the Magic Link tab
        console.log('Switching to Magic Link tab...');
        await page.getByRole('button', { name: 'Magic Link' }).click();

        console.log('Filling email...');
        await page.getByLabel('Email address').fill(user.email);
        await page.getByRole('button', { name: 'Send Magic Link' }).click();

        // Wait for "Check Your Email" confirmation
        await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 10000 });
        console.log(`Email sent to ${user.email}, polling Mailpit...`);

        // Poll for email
        const emailData = await getLatestEmail(user.email);
        expect(emailData).toBeTruthy();

        const magicLink = extractMagicLink(emailData.html);
        expect(magicLink).toBeTruthy();
        console.log('Magic link found, proceeding to login.');

        await page.goto(magicLink!);

        // Verify we are on the dashboard
        await expect(page).toHaveURL(/\/dashboard/);
        console.log('Successfully logged into dashboard.');

        // 2. Upload Multi-artifact (ZIP)
        console.log('Opening upload dialog...');

        // Check for "New Artifact" button (Header) or "Create Your First Artifact" (Empty State)
        const headerNewBtn = page.getByRole('button', { name: 'New Artifact' });
        const emptyStateBtn = page.getByRole('button', { name: 'Create Your First Artifact' });

        if (await headerNewBtn.isVisible()) {
            await headerNewBtn.click();
        } else if (await emptyStateBtn.isVisible()) {
            await emptyStateBtn.click();
        } else {
            // Fallback: try to find any button with "Artifact" in it
            await page.getByRole('button', { name: /Artifact/ }).first().click();
        }

        // Wait for dialog
        await expect(page.getByText('Create New Artifact')).toBeVisible();

        // Path to the mixed-media-sample.zip
        // Note: Samples are at the root, Playwright runs from /app/
        const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
        console.log(`Uploading ZIP from: ${zipPath}`);

        await page.setInputFiles('input[type="file"]', zipPath);

        const artifactName = `E2E Mixed Media ${Date.now()}`;
        await page.getByLabel('Artifact Name').fill(artifactName);

        // Wait for button to be enabled (file upload processing)
        const createButton = page.getByRole('button', { name: 'Create Artifact' });
        await expect(createButton).toBeEnabled({ timeout: 10000 });
        await createButton.click();

        // Redirection to viewer should happen automatically
        console.log('Waiting for artifact creation and viewer redirection...');
        await expect(page).toHaveURL(/\/a\//, { timeout: 30000 });

        // Wait for URL to NOT be dashboard
        await expect(page).not.toHaveURL(/\/dashboard/);

        // Verify Artifact Title in Header specifically
        const header = page.locator('header');
        await expect(header.getByText(artifactName)).toBeVisible({ timeout: 15000 });
        console.log('Artifact title visible in header.');

        // Wait for Comments sidebar as a signal of viewer loading
        await expect(page.getByText(/Comments \(/)).toBeVisible({ timeout: 10000 });

        // 3. Verify File Tree (Multi-artifact feature)
        console.log('Verifying multi-artifact file tree...');
        // Add a small delay to allow Convex queries to catch up
        await page.waitForTimeout(2000);

        // Check for File Tree visibility - verify specific files are shown
        // Note: The file tree doesn't have a "Files" header, just the tree items directly
        await expect(page.getByText('docs', { exact: true }).first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('README.md', { exact: true }).first()).toBeVisible();
        console.log('File tree verified.');

        // Verify iframe content
        const frame = page.frameLocator('iframe');
        await expect(frame.getByText('Executive Dashboard')).toBeVisible({ timeout: 15000 });
        console.log('Artifact viewer content loaded successfully.');

        // Verify Comments sidebar is present
        await expect(page.getByRole('button', { name: /Comments \(/ })).toBeVisible();
        console.log('Comments sidebar available.');
        console.log('Workflow complete: Login, ZIP upload, and viewer all functional.');
    });

    /**
     * FIXME: This test is skipped because iframe text selection events don't propagate
     * to the parent window's selection layer. The commenting feature needs postMessage
     * integration between iframe and parent to work.
     *
     * When the iframe commenting feature is implemented, remove test.fixme() to enable.
     */
    test.fixme('Add comment via text selection in artifact', async ({ page }) => {
        test.setTimeout(90000);
        const user = generateUser();

        // Login and create artifact (same setup as above)
        await page.goto('/login');
        await page.getByRole('button', { name: 'Magic Link' }).click();
        await page.getByLabel('Email address').fill(user.email);
        await page.getByRole('button', { name: 'Send Magic Link' }).click();
        await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 10000 });

        const emailData = await getLatestEmail(user.email);
        const magicLink = extractMagicLink(emailData.html);
        await page.goto(magicLink!);
        await expect(page).toHaveURL(/\/dashboard/);

        // Upload artifact
        await page.getByRole('button', { name: /Artifact/ }).first().click();
        await expect(page.getByText('Create New Artifact')).toBeVisible();
        const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
        await page.setInputFiles('input[type="file"]', zipPath);
        const artifactName = `E2E Commenting ${Date.now()}`;
        await page.getByLabel('Artifact Name').fill(artifactName);
        await page.getByRole('button', { name: 'Create Artifact' }).click();
        await expect(page).toHaveURL(/\/a\//, { timeout: 30000 });

        // Wait for viewer to load
        const frame = page.frameLocator('iframe');
        await expect(frame.getByText('Executive Dashboard')).toBeVisible({ timeout: 15000 });

        // 4. Add a comment on Version 1
        console.log('Activating comment mode...');

        // Click the 'Comment' tool button in the toolbar
        await page.getByRole('button', { name: 'Comment', exact: true }).first().click();

        // Simulate text selection in the iframe to trigger a comment
        console.log('Selecting text in iframe to trigger comment...');
        await frame.locator('h1').evaluate((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);

            // Dispatch mouseup to trigger handleTextSelection in DocumentViewer
            // We need to dispatch it from the element to bubble up to the document
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        });

        // The comment tooltip should appear in the parent window
        console.log('Waiting for comment tooltip...');
        const commentTextarea = page.locator('textarea[placeholder="Add a comment..."]');
        await expect(commentTextarea).toBeVisible({ timeout: 5000 });

        const uniqueComment = `Test Feedback - ${Date.now()}`;
        await commentTextarea.fill(uniqueComment);
        await page.getByRole('button', { name: 'Comment' }).last().click();

        // 5. Verify comment appears in the sidebar
        console.log('Verifying comment in sidebar...');
        const sidebar = page.locator('div:has-text("Comments (")');
        await expect(sidebar.getByText(uniqueComment)).toBeVisible();
        console.log('Workflow complete: Comment successfully saved and displayed.');
    });

});
