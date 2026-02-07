import { test, expect } from '@playwright/test';
import { generateTestUser, signUpWithPassword, loginWithPassword } from '../utils/auth';
import path from 'path';

/**
 * Public Share Links E2E Tests (Issue #61)
 *
 * Tests the public preview link feature with capability-based permissions:
 * - Capabilities: readComments, writeComments (checkboxes)
 * - View-only mode: both unchecked (default)
 * - Read-only mode: readComments checked, writeComments unchecked
 * - Comment mode: both checked (writeComments requires auth)
 *
 * NOTE: Public share links work independently of the invite system.
 * Users accessing via public link are NOT added to "People with Access" list.
 * They get permission through the share token itself.
 */

test.describe('Public Share Links', () => {

    test('View-only mode: unauthenticated access without comments', async ({ browser }) => {
        test.slow();
        test.setTimeout(120000);

        const creator = generateTestUser('creator');
        const artifactName = `E2E Public View-Only ${Date.now()}`;

        const creatorContext = await browser.newContext({
            recordVideo: { dir: 'test-results/videos/' }
        });
        const viewerContext = await browser.newContext({
            recordVideo: { dir: 'test-results/videos/' }
        }); // Unauthenticated

        const creatorPage = await creatorContext.newPage();
        const viewerPage = await viewerContext.newPage();

        // ============================================================
        // STEP 1: Creator Login & Upload
        // ============================================================
        console.log('Creator logging in...');
        await signUpWithPassword(creatorPage, creator);

        console.log('Creator uploading artifact...');
        const uploadBtn = creatorPage.getByRole('button', { name: 'Upload' });
        await expect(uploadBtn).toBeVisible({ timeout: 15000 });
        await uploadBtn.click();

        await expect(creatorPage.getByText('Create New Artifact')).toBeVisible({ timeout: 10000 });
        const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
        const fileInput = creatorPage.locator('#file-upload');
        await expect(fileInput).toBeAttached({ timeout: 5000 });
        await fileInput.setInputFiles(zipPath);

        await expect(creatorPage.getByText('mixed-media-sample.zip')).toBeVisible({ timeout: 10000 });
        await creatorPage.getByLabel('Artifact Name').fill(artifactName);

        // Wait for button to be enabled before clicking
        const createButton = creatorPage.getByRole('button', { name: 'Create Artifact' });
        await expect(createButton).toBeEnabled({ timeout: 10000 });
        await createButton.click();

        await expect(creatorPage).toHaveURL(/\/a\//, { timeout: 30000 });
        await creatorPage.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });
        console.log('Artifact created.');

        // ============================================================
        // STEP 2: Create Public Share Link (View-Only Mode - default)
        // ============================================================
        console.log('Navigating to settings...');
        await creatorPage.getByRole('button', { name: 'Manage' }).click();
        await expect(creatorPage).toHaveURL(/\/settings/, { timeout: 10000 });

        // Click Access tab
        const accessButton = creatorPage.getByRole('button', { name: /Access/ });
        await expect(accessButton).toBeVisible({ timeout: 10000 });
        await accessButton.click();

        // Create public link
        console.log('Creating public share link (view-only)...');
        await expect(creatorPage.getByText('Public Share Link')).toBeVisible({ timeout: 10000 });
        await creatorPage.getByRole('button', { name: 'Create Public Link' }).click();

        await expect(creatorPage.getByRole('button', { name: /Copy/ })).toBeVisible({ timeout: 10000 });
        await expect(creatorPage.getByText('Link Active')).toBeVisible({ timeout: 5000 });

        // Verify capabilities checkboxes are unchecked by default (view-only mode)
        console.log('Verifying default capabilities (both unchecked)...');
        const readCommentsCheckbox = creatorPage.locator('#readComments');
        const writeCommentsCheckbox = creatorPage.locator('#writeComments');
        await expect(readCommentsCheckbox).not.toBeChecked({ timeout: 5000 });
        await expect(writeCommentsCheckbox).not.toBeChecked({ timeout: 5000 });
        console.log('View-only mode confirmed (no capabilities enabled).');

        // Get share URL
        const linkDisplay = creatorPage.locator('.font-mono').first();
        const shareUrl = await linkDisplay.textContent();
        expect(shareUrl).toContain('/share/');
        console.log(`Share link: ${shareUrl}`);

        // ============================================================
        // STEP 3: Unauthenticated User Accesses View-Only Link
        // ============================================================
        console.log('Unauthenticated user accessing view-only link...');

        // Capture console errors
        const consoleErrors: string[] = [];
        viewerPage.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        viewerPage.on('pageerror', err => {
            consoleErrors.push(`PAGE ERROR: ${err.message}`);
        });

        await viewerPage.goto(shareUrl!);

        // Wait for network to settle and page to hydrate
        console.log('Page URL:', viewerPage.url());
        await viewerPage.waitForLoadState('networkidle', { timeout: 60000 });
        console.log('Network idle, checking page content...');

        // Debug: Check page state
        const pageContent = await viewerPage.textContent('body').catch(() => 'Failed to get content');
        console.log(`Page content snippet: ${pageContent?.substring(0, 300)}`);

        // Log console errors
        if (consoleErrors.length > 0) {
            console.log('Console errors:', consoleErrors.join('\n'));
        } else {
            console.log('No console errors captured');
        }

        // Wait for artifact name to be visible (proves page loaded)
        await expect(viewerPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });
        console.log('Artifact visible to unauthenticated user.');

        // Should NOT see error states
        await expect(viewerPage.getByText('Link Unavailable')).not.toBeVisible({ timeout: 3000 });
        await expect(viewerPage.getByText('Sign in to leave comments')).not.toBeVisible({ timeout: 3000 });

        // Verify NO comment functionality in view-only mode
        // In view-only mode, the annotation sidebar may be visible but:
        // 1. No comment input placeholder should exist
        // 2. The tip banner about selecting text should not appear (it's hidden for view-only)
        // 3. The sidebar shows "No annotations yet" empty state
        await expect(viewerPage.getByPlaceholder(/comment/i)).not.toBeVisible({ timeout: 3000 });
        await expect(viewerPage.getByPlaceholder(/Write your comment/i)).not.toBeVisible({ timeout: 3000 });
        console.log('View-only mode verified - no comment input.');

        // Cleanup
        await creatorContext.close();
        await viewerContext.close();
        console.log('View-only test completed.');
    });

    test('Write comments mode: auth required for commenting', async ({ browser }) => {
        test.slow();
        test.setTimeout(180000);

        const creator = generateTestUser('creator');
        const commenter = generateTestUser('commenter');
        const artifactName = `E2E Public Comment ${Date.now()}`;

        const creatorContext = await browser.newContext({
            recordVideo: { dir: 'test-results/videos/' }
        });
        const commenterContext = await browser.newContext({
            recordVideo: { dir: 'test-results/videos/' }
        }); // Will login later

        const creatorPage = await creatorContext.newPage();
        const commenterPage = await commenterContext.newPage();

        // ============================================================
        // STEP 1: Creator Login & Upload
        // ============================================================
        console.log('Creator logging in...');
        await signUpWithPassword(creatorPage, creator);

        console.log('Creator uploading artifact...');
        const uploadBtn = creatorPage.getByRole('button', { name: 'Upload' });
        await expect(uploadBtn).toBeVisible({ timeout: 15000 });
        await uploadBtn.click();

        await expect(creatorPage.getByText('Create New Artifact')).toBeVisible({ timeout: 10000 });
        const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
        const fileInput = creatorPage.locator('#file-upload');
        await expect(fileInput).toBeAttached({ timeout: 5000 });
        await fileInput.setInputFiles(zipPath);

        await expect(creatorPage.getByText('mixed-media-sample.zip')).toBeVisible({ timeout: 10000 });
        await creatorPage.getByLabel('Artifact Name').fill(artifactName);

        // Wait for button to be enabled before clicking
        const createButton = creatorPage.getByRole('button', { name: 'Create Artifact' });
        await expect(createButton).toBeEnabled({ timeout: 10000 });
        await createButton.click();

        await expect(creatorPage).toHaveURL(/\/a\//, { timeout: 30000 });
        await creatorPage.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });
        console.log('Artifact created.');

        // ============================================================
        // STEP 2: Create Public Share Link with Write Comments capability
        // ============================================================
        console.log('Navigating to settings...');
        await creatorPage.getByRole('button', { name: 'Manage' }).click();
        await expect(creatorPage).toHaveURL(/\/settings/, { timeout: 10000 });

        const accessButton = creatorPage.getByRole('button', { name: /Access/ });
        await expect(accessButton).toBeVisible({ timeout: 10000 });
        await accessButton.click();

        // Create public link
        console.log('Creating public share link...');
        await expect(creatorPage.getByText('Public Share Link')).toBeVisible({ timeout: 10000 });
        await creatorPage.getByRole('button', { name: 'Create Public Link' }).click();
        await expect(creatorPage.getByRole('button', { name: /Copy/ })).toBeVisible({ timeout: 10000 });

        // Enable write comments capability (this auto-enables read comments)
        console.log('Enabling write comments capability...');
        const writeCommentsCheckbox = creatorPage.locator('#writeComments');
        const readCommentsCheckbox = creatorPage.locator('#readComments');

        // First enable readComments (required before writeComments can be enabled)
        await readCommentsCheckbox.click();
        await expect(readCommentsCheckbox).toBeChecked({ timeout: 5000 });

        // Now enable writeComments
        await writeCommentsCheckbox.click();
        await expect(writeCommentsCheckbox).toBeChecked({ timeout: 5000 });
        console.log('Write comments capability enabled.');

        // Get share URL
        const linkDisplay = creatorPage.locator('.font-mono').first();
        const shareUrl = await linkDisplay.textContent();
        console.log(`Share link (write comments enabled): ${shareUrl}`);

        // ============================================================
        // STEP 3: Unauthenticated User Sees Auth Prompt
        // ============================================================
        console.log('Unauthenticated user accessing share link with write capability...');
        await commenterPage.goto(shareUrl!);

        // Wait for page to load
        await commenterPage.waitForLoadState('networkidle', { timeout: 30000 });

        // Should NOT see error states
        await expect(commenterPage.getByText('Link Unavailable')).not.toBeVisible({ timeout: 5000 });
        await expect(commenterPage.getByText('Artifact Not Found')).not.toBeVisible({ timeout: 5000 });

        // Wait for artifact name to be visible (proves page loaded)
        await expect(commenterPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });

        // Should see auth prompt banner for commenting
        console.log('Verifying auth prompt banner...');
        await expect(commenterPage.getByText('Sign in to leave comments')).toBeVisible({ timeout: 10000 });
        console.log('Auth prompt banner visible.');

        // ============================================================
        // STEP 4: User Logs In via Auth Prompt
        // ============================================================
        // Store the share URL before leaving the page
        const currentShareUrl = commenterPage.url();

        console.log('Commenter clicking Sign In...');
        await commenterPage.getByRole('button', { name: 'Sign In' }).click();

        // Should be redirected to login with returnTo
        await expect(commenterPage).toHaveURL(/login\?returnTo=/, { timeout: 10000 });

        // Go to register page (keep returnTo param)
        await commenterPage.getByRole('link', { name: 'Sign up' }).click();
        await expect(commenterPage).toHaveURL(/register\?returnTo=/, { timeout: 10000 });

        // Register with password
        await commenterPage.waitForSelector('label:has-text("Full name")', { timeout: 30000 });
        await commenterPage.getByLabel('Full name').fill(commenter.name);
        await commenterPage.getByLabel('Email address').fill(commenter.email);
        await commenterPage.getByLabel('Password', { exact: true }).fill(commenter.password);
        await commenterPage.getByLabel('Confirm password').fill(commenter.password);
        await commenterPage.getByRole('button', { name: 'Create Account' }).click();

        // Wait for registration to complete (may go to dashboard or share page)
        await expect(commenterPage).toHaveURL(/\/(dashboard|share)/, { timeout: 30000 });

        // If redirected to dashboard instead of share page, navigate back manually
        if (commenterPage.url().includes('/dashboard')) {
            console.log('Navigating back to share page (returnTo not honored)...');
            await commenterPage.goto(currentShareUrl);
        }
        console.log('Waiting for share page to load...');
        await expect(commenterPage).toHaveURL(/\/share\//, { timeout: 30000 });

        // Wait for page to fully load after login redirect
        await commenterPage.waitForLoadState('networkidle', { timeout: 30000 });

        // Verify we're NOT on an error page - the artifact should be visible
        await expect(commenterPage.getByText('Link Unavailable')).not.toBeVisible({ timeout: 5000 });
        await expect(commenterPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });

        // Auth prompt should be gone after login (user is now authenticated)
        await expect(commenterPage.getByText('Sign in to leave comments')).not.toBeVisible({ timeout: 10000 });
        console.log('User logged in and auth prompt gone.');

        // ============================================================
        // STEP 5: Verify Page Loaded Successfully After Login
        // ============================================================
        console.log('Verifying page loaded after login...');
        // Wait for version status ready - this confirms the artifact viewer is loaded
        await commenterPage.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });
        console.log('Page loaded successfully after login.');

        // ============================================================
        // STEP 6: Verify User NOT in People with Access List
        // ============================================================
        console.log('Verifying user NOT added to access list...');

        // Go back to creator's settings page
        await creatorPage.reload();
        await expect(creatorPage.getByText('People with Access')).toBeVisible({ timeout: 10000 });

        // The commenter should NOT appear in the access list
        // Public share users get permission via token, not artifactAccess table
        await expect(creatorPage.getByText(commenter.email)).not.toBeVisible({ timeout: 3000 });
        console.log('Confirmed: Public share user NOT in access list (as expected).');

        // Cleanup
        await creatorContext.close();
        await commenterContext.close();
        console.log('Write comments test completed.');
    });

    test('Read-only mode: can see comments but cannot add', async ({ browser }) => {
        test.slow();
        test.setTimeout(120000);

        const creator = generateTestUser('creator');
        const artifactName = `E2E Public Read-Only ${Date.now()}`;

        const creatorContext = await browser.newContext({
            recordVideo: { dir: 'test-results/videos/' }
        });
        const viewerContext = await browser.newContext({
            recordVideo: { dir: 'test-results/videos/' }
        });

        const creatorPage = await creatorContext.newPage();
        const viewerPage = await viewerContext.newPage();

        // Creator login & upload (abbreviated)
        await signUpWithPassword(creatorPage, creator);

        await creatorPage.getByRole('button', { name: 'Upload' }).click();
        await expect(creatorPage.getByText('Create New Artifact')).toBeVisible({ timeout: 10000 });
        const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
        await creatorPage.locator('#file-upload').setInputFiles(zipPath);
        await expect(creatorPage.getByText('mixed-media-sample.zip')).toBeVisible({ timeout: 10000 });
        await creatorPage.getByLabel('Artifact Name').fill(artifactName);

        const createButton = creatorPage.getByRole('button', { name: 'Create Artifact' });
        await expect(createButton).toBeEnabled({ timeout: 10000 });
        await createButton.click();

        await expect(creatorPage).toHaveURL(/\/a\//, { timeout: 30000 });
        await creatorPage.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });

        // Create share link with read-only capability
        await creatorPage.getByRole('button', { name: 'Manage' }).click();
        await creatorPage.getByRole('button', { name: /Access/ }).click();
        await creatorPage.getByRole('button', { name: 'Create Public Link' }).click();
        await expect(creatorPage.getByRole('button', { name: /Copy/ })).toBeVisible({ timeout: 10000 });

        // Enable only readComments (not writeComments)
        console.log('Enabling read-only mode (readComments only)...');
        const readCommentsCheckbox = creatorPage.locator('#readComments');
        const writeCommentsCheckbox = creatorPage.locator('#writeComments');

        await readCommentsCheckbox.click();
        await expect(readCommentsCheckbox).toBeChecked({ timeout: 5000 });
        await expect(writeCommentsCheckbox).not.toBeChecked({ timeout: 5000 });
        console.log('Read-only mode set.');

        const linkDisplay = creatorPage.locator('.font-mono').first();
        const shareUrl = await linkDisplay.textContent();

        // Unauthenticated user accesses read-only link
        console.log('Unauthenticated user accessing read-only link...');
        await viewerPage.goto(shareUrl!);
        await viewerPage.waitForLoadState('networkidle', { timeout: 30000 });
        await expect(viewerPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });

        // Should NOT see auth prompt (writeComments is disabled)
        await expect(viewerPage.getByText('Sign in to leave comments')).not.toBeVisible({ timeout: 5000 });
        console.log('No auth prompt in read-only mode (as expected).');

        // Cleanup
        await creatorContext.close();
        await viewerContext.close();
        console.log('Read-only mode test completed.');
    });

    test('Capability auto-toggle: writeComments enables readComments', async ({ browser }) => {
        test.slow();
        test.setTimeout(120000);

        const creator = generateTestUser('creator');
        const artifactName = `E2E Capability Toggle ${Date.now()}`;

        const creatorContext = await browser.newContext({
            recordVideo: { dir: 'test-results/videos/' }
        });
        const creatorPage = await creatorContext.newPage();

        // Creator login & upload (abbreviated)
        await signUpWithPassword(creatorPage, creator);

        await creatorPage.getByRole('button', { name: 'Upload' }).click();
        await expect(creatorPage.getByText('Create New Artifact')).toBeVisible({ timeout: 10000 });
        const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
        await creatorPage.locator('#file-upload').setInputFiles(zipPath);
        await expect(creatorPage.getByText('mixed-media-sample.zip')).toBeVisible({ timeout: 10000 });
        await creatorPage.getByLabel('Artifact Name').fill(artifactName);

        const createButton = creatorPage.getByRole('button', { name: 'Create Artifact' });
        await expect(createButton).toBeEnabled({ timeout: 10000 });
        await createButton.click();

        await expect(creatorPage).toHaveURL(/\/a\//, { timeout: 30000 });
        await creatorPage.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });

        // Create share link
        await creatorPage.getByRole('button', { name: 'Manage' }).click();
        await creatorPage.getByRole('button', { name: /Access/ }).click();
        await creatorPage.getByRole('button', { name: 'Create Public Link' }).click();
        await expect(creatorPage.getByRole('button', { name: /Copy/ })).toBeVisible({ timeout: 10000 });

        const readCommentsCheckbox = creatorPage.locator('#readComments');
        const writeCommentsCheckbox = creatorPage.locator('#writeComments');

        // Verify both start unchecked
        console.log('Verifying initial state (both unchecked)...');
        await expect(readCommentsCheckbox).not.toBeChecked();
        await expect(writeCommentsCheckbox).not.toBeChecked();

        // Test 1: writeComments is disabled when readComments is unchecked
        console.log('Verifying writeComments is disabled when readComments unchecked...');
        await expect(writeCommentsCheckbox).toBeDisabled();

        // Test 2: Enable readComments, writeComments becomes enabled
        console.log('Enabling readComments...');
        await readCommentsCheckbox.click();
        await expect(readCommentsCheckbox).toBeChecked({ timeout: 5000 });
        await expect(writeCommentsCheckbox).toBeEnabled({ timeout: 5000 });
        console.log('writeComments is now enabled.');

        // Test 3: Enable writeComments
        console.log('Enabling writeComments...');
        await writeCommentsCheckbox.click();
        await expect(writeCommentsCheckbox).toBeChecked({ timeout: 5000 });
        await expect(readCommentsCheckbox).toBeChecked(); // Should still be checked
        console.log('Both capabilities enabled.');

        // Test 4: Disabling readComments should auto-disable writeComments
        console.log('Disabling readComments (should auto-disable writeComments)...');
        await readCommentsCheckbox.click();
        await expect(readCommentsCheckbox).not.toBeChecked({ timeout: 5000 });
        await expect(writeCommentsCheckbox).not.toBeChecked({ timeout: 5000 });
        console.log('Both capabilities disabled (auto-toggle verified).');

        await creatorContext.close();
        console.log('Capability auto-toggle test completed.');
    });

    test('Disabled link shows unavailable page', async ({ browser }) => {
        test.slow();
        test.setTimeout(120000);

        const creator = generateTestUser('creator');
        const artifactName = `E2E Disabled Share ${Date.now()}`;

        const creatorContext = await browser.newContext({
            recordVideo: { dir: 'test-results/videos/' }
        });
        const viewerContext = await browser.newContext({
            recordVideo: { dir: 'test-results/videos/' }
        });

        const creatorPage = await creatorContext.newPage();
        const viewerPage = await viewerContext.newPage();

        // Creator login & upload (abbreviated)
        await signUpWithPassword(creatorPage, creator);

        await creatorPage.getByRole('button', { name: 'Upload' }).click();
        await expect(creatorPage.getByText('Create New Artifact')).toBeVisible({ timeout: 10000 });
        const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
        await creatorPage.locator('#file-upload').setInputFiles(zipPath);
        await expect(creatorPage.getByText('mixed-media-sample.zip')).toBeVisible({ timeout: 10000 });
        await creatorPage.getByLabel('Artifact Name').fill(artifactName);

        // Wait for button to be enabled before clicking
        const createButton = creatorPage.getByRole('button', { name: 'Create Artifact' });
        await expect(createButton).toBeEnabled({ timeout: 10000 });
        await createButton.click();

        await expect(creatorPage).toHaveURL(/\/a\//, { timeout: 30000 });
        await creatorPage.waitForSelector('[data-version-status="ready"]', { timeout: 30000 });

        // Create share link
        await creatorPage.getByRole('button', { name: 'Manage' }).click();
        await creatorPage.getByRole('button', { name: /Access/ }).click();
        await creatorPage.getByRole('button', { name: 'Create Public Link' }).click();
        await expect(creatorPage.getByRole('button', { name: /Copy/ })).toBeVisible({ timeout: 10000 });

        const linkDisplay = creatorPage.locator('.font-mono').first();
        const shareUrl = await linkDisplay.textContent();

        // Verify link works
        await viewerPage.goto(shareUrl!);
        await viewerPage.waitForLoadState('networkidle', { timeout: 30000 });
        await expect(viewerPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });

        // Disable the link
        console.log('Disabling share link...');
        await creatorPage.getByRole('button', { name: /Enabled/ }).click();
        await expect(creatorPage.getByText('Link Inactive')).toBeVisible({ timeout: 5000 });

        // Verify disabled link shows unavailable
        console.log('Verifying disabled link...');
        await viewerPage.reload();
        await expect(viewerPage.getByText('Link Unavailable')).toBeVisible({ timeout: 10000 });

        // Re-enable and verify
        console.log('Re-enabling link...');
        await creatorPage.getByRole('button', { name: 'Enable Link' }).click();
        await expect(creatorPage.getByText('Link Active')).toBeVisible({ timeout: 5000 });

        await viewerPage.reload();
        await expect(viewerPage.getByText('Link Unavailable')).not.toBeVisible({ timeout: 5000 });
        await expect(viewerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });
        console.log('Re-enabled link works.');

        await creatorContext.close();
        await viewerContext.close();
    });
});
