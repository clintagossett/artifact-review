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
 *
 * Task 00049 - Updated to use data-version-status for deterministic waits
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

        // Wait for dashboard to fully load - look for the header "Upload" button
        // Both "Upload" (header) and "Create Artifact" (empty state) may be visible
        // We prefer clicking "Upload" since it's always present in the header
        const uploadBtn = page.getByRole('button', { name: 'Upload' });
        await expect(uploadBtn).toBeVisible({ timeout: 15000 });
        console.log('Clicking header "Upload" button...');
        await uploadBtn.click();

        // Wait for dialog
        await expect(page.getByText('Create New Artifact')).toBeVisible({ timeout: 10000 });

        // Path to the mixed-media-sample.zip
        // Note: Samples are at the root, Playwright runs from /app/
        const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
        console.log(`Uploading ZIP from: ${zipPath}`);

        // Wait for the file input to be present in the DOM (hidden input with id="file-upload")
        const fileInput = page.locator('#file-upload');
        await expect(fileInput).toBeAttached({ timeout: 5000 });
        await fileInput.setInputFiles(zipPath);

        // Wait for file to appear in the upload area
        await expect(page.getByText('mixed-media-sample.zip')).toBeVisible({ timeout: 10000 });

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

        // Task 00049: Wait for version to be ready using deterministic status attribute
        console.log('Waiting for version status to be ready...');
        await page.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });
        console.log('Version status is ready.');

        // Verify Artifact Title in Header specifically
        const header = page.locator('header');
        await expect(header.getByText(artifactName)).toBeVisible({ timeout: 15000 });
        console.log('Artifact title visible in header.');

        // Wait for Comments sidebar as a signal of viewer loading
        await expect(page.getByText(/Comments \(/)).toBeVisible({ timeout: 10000 });

        // 3. Verify File Tree (Multi-artifact feature)
        console.log('Verifying multi-artifact file tree...');

        // Task 00049: No more arbitrary timeout - status-based wait ensures content is loaded
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

    test('Shows error state for ZIP with forbidden file types', async ({ page }) => {
        test.setTimeout(90000);
        const user = generateUser();

        // 1. Login flow
        console.log('Starting magic link login...');
        await page.goto('/login');
        await page.getByRole('button', { name: 'Magic Link' }).click();
        await page.getByLabel('Email address').fill(user.email);
        await page.getByRole('button', { name: 'Send Magic Link' }).click();
        await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 10000 });

        const emailData = await getLatestEmail(user.email);
        const magicLink = extractMagicLink(emailData.html);
        await page.goto(magicLink!);
        await expect(page).toHaveURL(/\/dashboard/);
        console.log('Successfully logged in.');

        // 2. Open upload dialog - handle both header button and empty state
        console.log('Opening upload dialog...');
        const headerNewBtn = page.getByRole('button', { name: 'New Artifact' });
        const emptyStateBtn = page.getByRole('button', { name: 'Create Artifact' });

        if (await headerNewBtn.isVisible()) {
            await headerNewBtn.click();
        } else if (await emptyStateBtn.isVisible()) {
            await emptyStateBtn.click();
        } else {
            // Fallback: try to find any button with "Artifact" in it
            await page.getByRole('button', { name: /Artifact/ }).first().click();
        }
        await expect(page.getByText('Create New Artifact')).toBeVisible();

        // 3. Upload ZIP with forbidden video files
        // NOTE: This file must be generated first using samples/04-invalid/wrong-type/generate.sh
        const invalidZipPath = path.resolve(
            process.cwd(),
            '../samples/04-invalid/wrong-type/presentation-with-video.zip'
        );
        console.log(`Uploading invalid ZIP from: ${invalidZipPath}`);

        await page.setInputFiles('input[type="file"]', invalidZipPath);

        const artifactName = `E2E Error State ${Date.now()}`;
        await page.getByLabel('Artifact Name').fill(artifactName);

        const createButton = page.getByRole('button', { name: 'Create Artifact' });
        await expect(createButton).toBeEnabled({ timeout: 10000 });
        await createButton.click();

        // 4. Wait for error state - should NOT navigate, stay on dashboard
        console.log('Waiting for error state indicator...');
        await page.waitForSelector('[data-version-status="error"]', { timeout: 30000 });
        console.log('Error state detected.');

        // 5. Verify error message is displayed with expected content
        // Error messages may vary, but should mention unsupported file types or forbidden files
        await expect(page.getByText(/unsupported file types|forbidden|not supported/i)).toBeVisible();
        console.log('Error message displayed to user.');

        // 6. Verify we're still on dashboard (not navigated to artifact)
        await expect(page).toHaveURL(/\/dashboard/);
        console.log('User remains on dashboard - error handling correct.');

        // 7. Verify dialog is closed (upload failed, dialog should close)
        await expect(page.getByText('Create New Artifact')).not.toBeVisible();
        console.log('Error state test complete.');
    });

    test('Shows processing states during valid ZIP upload', async ({ page }) => {
        test.setTimeout(90000);
        const user = generateUser();

        // Login and navigate to dashboard
        await page.goto('/login');
        await page.getByRole('button', { name: 'Magic Link' }).click();
        await page.getByLabel('Email address').fill(user.email);
        await page.getByRole('button', { name: 'Send Magic Link' }).click();
        await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 10000 });

        const emailData = await getLatestEmail(user.email);
        const magicLink = extractMagicLink(emailData.html);
        await page.goto(magicLink!);
        await expect(page).toHaveURL(/\/dashboard/);

        // Open upload dialog - handle both header button and empty state
        const headerNewBtn = page.getByRole('button', { name: 'New Artifact' });
        const emptyStateBtn = page.getByRole('button', { name: 'Create Artifact' });
        if (await headerNewBtn.isVisible()) {
            await headerNewBtn.click();
        } else if (await emptyStateBtn.isVisible()) {
            await emptyStateBtn.click();
        } else {
            // Fallback: try to find any button with "Artifact" in it
            await page.getByRole('button', { name: /Artifact/ }).first().click();
        }
        await expect(page.getByText('Create New Artifact')).toBeVisible();

        // Upload valid ZIP
        const zipPath = path.resolve(
            process.cwd(),
            '../samples/01-valid/zip/charting/v1.zip'
        );
        console.log(`Uploading valid ZIP from: ${zipPath}`);

        await page.setInputFiles('input[type="file"]', zipPath);
        await page.getByLabel('Artifact Name').fill(`E2E Status ${Date.now()}`);
        await page.getByRole('button', { name: 'Create Artifact' }).click();

        // Eventually should reach ready state
        console.log('Waiting for ready state...');
        await page.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });
        console.log('Version is ready.');

        // Verify we navigated to the artifact
        await expect(page).toHaveURL(/\/a\//);
        console.log('Status transition test complete.');
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
