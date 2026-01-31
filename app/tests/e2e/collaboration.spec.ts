import { test, expect } from '@playwright/test';
import { getLatestEmail, extractMagicLink } from '../utils/resend';
import path from 'path';

/**
 * Collaboration & Access Control E2E Tests
 * 
 * Covers Journeys:
 * 003.01 - Invitee Onboarding & Deep Linking
 * 003.02 - Revoked Access & Permissions
 * 004 - Sharing & Invites
 * 004.01 - Reviewer Lifecycle
 */

const generateUser = (prefix = 'user') => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return {
        name: `${prefix}-${timestamp}`,
        email: `${prefix}+${timestamp}-${random}@tolauante.resend.app`,
    };
};

test.describe('Collaboration & Access Control', () => {
    let creator: { name: string; email: string };
    let reviewer: { name: string; email: string };
    let artifactName: string;
    let artifactUrl: string;

    test.beforeAll(async () => {
        creator = generateUser('creator');
        reviewer = generateUser('reviewer');
        artifactName = `E2E Collaboration ${Date.now()}`;
    });

    test('Full Collaboration Lifecycle', async ({ browser }) => {
        test.slow(); // Mark as slow test (3x timeout)
        test.setTimeout(180000);
        // Use two different contexts to simulate creator and reviewer
        const creatorContext = await browser.newContext();
        const reviewerContext = await browser.newContext();

        const creatorPage = await creatorContext.newPage();
        const reviewerPage = await reviewerContext.newPage();

        // 1. Creator Login & Upload
        console.log('Creator logging in...');
        await creatorPage.goto('/login');
        await creatorPage.getByRole('button', { name: 'Magic Link' }).click();
        await creatorPage.getByLabel('Email address').fill(creator.email);
        await creatorPage.getByRole('button', { name: 'Send Magic Link' }).click();

        const creatorEmail = await getLatestEmail(creator.email);
        const creatorMagicLink = extractMagicLink(creatorEmail.html);
        await creatorPage.goto(creatorMagicLink!);
        await expect(creatorPage).toHaveURL(/\/dashboard/);

        console.log('Creator uploading artifact...');
        // Click the "Upload" button in the header (always present)
        const uploadBtn = creatorPage.getByRole('button', { name: 'Upload' });
        await expect(uploadBtn).toBeVisible({ timeout: 15000 });
        await uploadBtn.click();

        // Wait for dialog and file input
        await expect(creatorPage.getByText('Create New Artifact')).toBeVisible({ timeout: 10000 });
        const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
        const fileInput = creatorPage.locator('#file-upload');
        await expect(fileInput).toBeAttached({ timeout: 5000 });
        await fileInput.setInputFiles(zipPath);
        // Wait for file to appear in the upload area
        await expect(creatorPage.getByText('mixed-media-sample.zip')).toBeVisible({ timeout: 10000 });
        await creatorPage.getByLabel('Artifact Name').fill(artifactName);
        await creatorPage.getByRole('button', { name: 'Create Artifact' }).click();

        await expect(creatorPage).toHaveURL(/\/a\//, { timeout: 30000 });
        artifactUrl = creatorPage.url();
        console.log(`Artifact created at: ${artifactUrl}`);

        // 2. Journey 004: Sharing & Invites via ShareModal
        console.log('Inviting reviewer...');
        await creatorPage.getByRole('button', { name: 'Share' }).click();

        // Wait for ShareModal to be visible
        await expect(creatorPage.getByRole('dialog').getByText('Share Artifact for Review')).toBeVisible({ timeout: 10000 });

        await creatorPage.getByPlaceholder('Enter email address').fill(reviewer.email);
        await creatorPage.getByRole('button', { name: 'Invite' }).click();

        // Journey 004.01: Reviewer Lifecycle (Verify invite was sent)
        console.log('Waiting for reviewer email to appear in reviewers list...');
        // Wait for the specific reviewer email to appear in the reviewers section
        await expect(creatorPage.getByText(reviewer.email).first()).toBeVisible({ timeout: 20000 });
        console.log('Reviewer found in access list.');

        // Close modal to continue
        await creatorPage.getByRole('button', { name: 'Close' }).first().click();

        // 3. Journey 003.01: Invitee Onboarding & Deep Linking
        console.log('Reviewer accessing artifact while unauthenticated...');
        await reviewerPage.goto(artifactUrl);

        // Should see UnauthenticatedBanner
        await expect(reviewerPage.getByText('Private Artifact')).toBeVisible();
        await expect(reviewerPage.getByRole('button', { name: 'Sign In to Review' })).toBeVisible();

        console.log('Reviewer logging in via deep link flow...');
        await reviewerPage.getByRole('button', { name: 'Sign In to Review' }).click();

        // Verify we are on login page with returnTo
        await expect(reviewerPage).toHaveURL(/login\?returnTo=/);

        await reviewerPage.getByRole('button', { name: 'Magic Link' }).click();
        await reviewerPage.getByLabel('Email address').fill(reviewer.email);
        await reviewerPage.getByRole('button', { name: 'Send Magic Link' }).click();

        console.log('Fetching magic link email...');
        const reviewerEmail = await getLatestEmail(reviewer.email, 'Sign in');
        const reviewerMagicLink = extractMagicLink(reviewerEmail.html);

        // Navigate to magic link which should redirect back to artifact
        console.log('Navigating to magic link...');
        await reviewerPage.goto(reviewerMagicLink!);

        // Wait for the magic link code to be processed and stripped from URL
        console.log('Waiting for auth to process...');
        await expect(reviewerPage).not.toHaveURL(/\?code=/, { timeout: 30000 });

        // Check if we reached the artifact page and the banner is gone
        console.log('Verifying reviewer reached artifact...');
        try {
            await expect(reviewerPage.getByText('Private Artifact')).not.toBeVisible({ timeout: 15000 });
        } catch (e) {
            console.log('Banner still visible, trying one reload to nudge auth state...');
            await reviewerPage.reload();
            await expect(reviewerPage.getByText('Private Artifact')).not.toBeVisible({ timeout: 10000 });
        }

        // Wait for the artifact content to load
        try {
            await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });
        } catch (e) {
            console.log('Artifact name not visible, trying one last reload...');
            await reviewerPage.reload();
            await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 10000 });
        }
        console.log('Reviewer successfully reached artifact after login.');

        // Verify status change in Creator's view (Journey 004.01)
        // Wait for backend to sync the "viewed" status (may take a moment)
        await creatorPage.waitForTimeout(2000);
        await creatorPage.reload();
        // Wait for page to load
        await expect(creatorPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });
        // Open Share modal to check reviewer status
        await creatorPage.getByRole('button', { name: 'Share' }).click();
        await expect(creatorPage.getByRole('dialog').getByText('Share Artifact for Review')).toBeVisible({ timeout: 10000 });

        // Ensure we see the 'Viewed' status (reviewer accessed the artifact)
        // Status may show as "Added" initially and update to "Viewed" after backend syncs
        await expect(creatorPage.getByText('Viewed')).toBeVisible({ timeout: 20000 });
        console.log('Reviewer status updated to "Viewed" in creator view.');

        // 4. Journey 003.02: Revoked Access & Permissions
        console.log('Revoking reviewer access...');
        // Find the remove button for the specific reviewer
        const removeButton = creatorPage.getByRole('button', { name: 'Remove reviewer' });
        await removeButton.click();

        // The removal happens immediately (no confirmation dialog)
        // Verify reviewer is removed from list
        await expect(creatorPage.getByText(reviewer.email)).toHaveCount(0, { timeout: 15000 });
        console.log('Reviewer removed from list.');

        console.log('Verifying reviewer access is denied...');
        await reviewerPage.reload();
        await expect(reviewerPage.getByText("You don't have access")).toBeVisible({ timeout: 10000 });
        await expect(reviewerPage.getByRole('button', { name: 'Back to Dashboard' })).toBeVisible();
        console.log('Reviewer successfully blocked after revocation.');

        // 5. Re-invite Loop (Journey 004.01)
        console.log('Re-inviting the same reviewer...');
        // Wait a second for revocation to settle in UI
        await creatorPage.waitForTimeout(1000);

        const inviteInput = creatorPage.getByPlaceholder('Enter email address');
        await inviteInput.fill(reviewer.email);
        await expect(inviteInput).toHaveValue(reviewer.email);

        await creatorPage.getByRole('button', { name: 'Invite' }).click();

        // Final verification: Reviewer is back in the list
        console.log('Verifying reviewer is back in the list...');
        await expect(creatorPage.getByText(reviewer.email).first()).toBeVisible({ timeout: 20000 });
        console.log('Reviewer successfully re-invited and verified.');

        await creatorContext.close();
        await reviewerContext.close();
    });
});
