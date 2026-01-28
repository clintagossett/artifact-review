/**
 * E2E Tests: Novu In-App Notification System
 *
 * Tests the full notification flow for comments and replies:
 * - Reviewer comments → Owner notified
 * - Reply → Comment author notified
 * - Thread participants → All notified
 * - Self-notification exclusion
 * - Badge count accumulation
 * - Mark as read functionality
 *
 * Task: 00043-novu-comment-notifications/03-e2e-notification-tests
 * Follows patterns from collaboration.spec.ts
 */

import { test, expect } from '@playwright/test';
import { getLatestEmail, extractMagicLink } from '../utils/resend';
import path from 'path';

/**
 * Generate unique user data for each test run.
 * Uses Resend test domain for email delivery.
 */
const generateUser = (prefix = 'user') => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return {
    name: `${prefix}-${timestamp}`,
    email: `${prefix}+${timestamp}-${random}@tolauante.resend.app`,
  };
};

/**
 * Helper: Wait for notification badge to show expected count.
 */
async function waitForNotificationCount(
  page: any,
  count: number,
  timeout = 30000
): Promise<void> {
  const badge = page.getByTestId('notification-badge');
  const countElement = page.getByTestId('notification-count');

  await expect(badge).toBeVisible({ timeout });
  await expect(countElement).toHaveText(String(count), { timeout });
}

/**
 * Helper: Assert notification badge is NOT visible.
 */
async function expectNoNotificationBadge(
  page: any,
  timeout = 10000
): Promise<void> {
  const badge = page.getByTestId('notification-badge');
  await expect(badge).not.toBeVisible({ timeout });
}

/**
 * Helper: Open notification center by clicking bell.
 */
async function openNotificationCenter(page: any): Promise<void> {
  const bell = page.getByTestId('notification-bell');
  await bell.click();
  await page.waitForTimeout(500);
}

/**
 * Helper: Login user via magic link flow
 * Note: Magic links may contain a different domain (e.g., mark.loc) when generated
 * in self-hosted Convex. We transform the URL to use the test's baseURL.
 */
async function loginUser(page: any, email: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Magic Link' }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send Magic Link' }).click();

  const emailData = await getLatestEmail(email, 'Sign in');
  let magicLink = extractMagicLink(emailData.html);
  if (!magicLink) throw new Error('Failed to extract magic link');

  // Transform magic link to use test baseURL if it points to a different domain
  // e.g., http://mark.loc/dashboard?code=xxx -> http://localhost:3010/dashboard?code=xxx
  const baseURL = process.env.SITE_URL || 'http://localhost:3010';
  const url = new URL(magicLink);
  const transformedUrl = `${baseURL}${url.pathname}${url.search}`;

  await page.goto(transformedUrl);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
}

/**
 * Helper: Upload artifact and return URL
 */
async function uploadArtifact(page: any, name: string): Promise<string> {
  // Collect console errors
  const consoleErrors: string[] = [];
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Click the Upload/New Artifact button
  await page.getByRole('button', { name: /Upload|Artifact/ }).first().click();

  // Wait for the modal to appear
  await expect(page.getByText('Create New Artifact')).toBeVisible({ timeout: 5000 });

  const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
  await page.setInputFiles('input[type="file"]', zipPath);

  // Wait for file to be processed (shows in the upload area)
  await expect(page.getByText('mixed-media-sample.zip')).toBeVisible({ timeout: 10000 });

  await page.getByLabel('Artifact Name').fill(name);

  // Wait for the button to be enabled (file upload processing)
  const createButton = page.getByRole('button', { name: 'Create Artifact' });
  await expect(createButton).toBeEnabled({ timeout: 10000 });

  console.log('Clicking Create Artifact button...');

  // Click the button
  await createButton.click();

  // Wait a bit to see if any errors occur
  await page.waitForTimeout(3000);

  if (consoleErrors.length > 0) {
    console.log('Console errors:', consoleErrors);
  }

  // Wait for navigation to artifact page
  await page.waitForURL(/\/a\//, { timeout: 60000 });

  return page.url();
}

/**
 * Helper: Invite reviewer to artifact
 */
async function inviteReviewer(page: any, reviewerEmail: string) {
  await page.getByRole('button', { name: 'Share' }).click();
  await expect(page).toHaveURL(/\/settings/);
  await page.getByPlaceholder('name@company.com').fill(reviewerEmail);
  await page.getByRole('button', { name: 'Send Invite' }).click();
  await expect(page.getByText(reviewerEmail).first()).toBeVisible({ timeout: 20000 });
}

/**
 * Helper: Select text in the artifact iframe and create annotation
 */
async function selectTextAndComment(page: any, commentText: string) {
  // Wait for the artifact content to load
  const iframe = page.frameLocator('iframe').first();

  // Find some text to select - typically body or main content
  const textContent = iframe.locator('body');
  await textContent.waitFor({ timeout: 15000 });

  // Execute script to select text and trigger the annotation flow
  // We'll use JavaScript to select text range
  await page.evaluate(() => {
    // Get the iframe
    const iframeEl = document.querySelector('iframe');
    if (!iframeEl || !iframeEl.contentDocument) return;

    const doc = iframeEl.contentDocument;
    const body = doc.body;

    // Find first text node
    const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();

    while (textNode && (!textNode.textContent || textNode.textContent.trim().length < 10)) {
      textNode = walker.nextNode();
    }

    if (textNode) {
      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, Math.min(20, textNode.textContent?.length || 0));

      const selection = iframeEl.contentWindow?.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      // Dispatch mouseup to trigger selection handler
      const event = new MouseEvent('mouseup', { bubbles: true });
      body.dispatchEvent(event);
    }
  });

  // Wait for annotation sidebar to open
  await page.waitForTimeout(1000);

  // Type comment in the annotation input
  const commentInput = page.getByTestId('annotation-comment-input');
  await expect(commentInput).toBeVisible({ timeout: 10000 });
  await commentInput.fill(commentText);

  // Submit the comment
  const submitButton = page.getByTestId('annotation-submit-button');
  await submitButton.click();

  // Wait for submission to complete
  await expect(commentInput).not.toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Add a reply to the first annotation
 */
async function replyToFirstAnnotation(page: any, replyText: string) {
  // Click the Reply button on the first annotation card
  const replyButton = page.getByTestId('annotation-reply-button').first();
  await replyButton.click();

  // Type in the reply input
  const replyInput = page.getByTestId('annotation-reply-input');
  await expect(replyInput).toBeVisible({ timeout: 5000 });
  await replyInput.fill(replyText);

  // Submit the reply
  const submitButton = page.getByTestId('annotation-reply-submit');
  await submitButton.click();

  // Wait for reply input to disappear
  await expect(replyInput).not.toBeVisible({ timeout: 10000 });
}

test.describe('Notification System', () => {
  test.describe('Test 1: New Comment Notifies Artifact Owner', () => {
    test('1.1: Reviewer comments on artifact -> Owner sees notification badge', async ({ browser }) => {
      test.setTimeout(120000);

      // Generate unique users for this test
      const owner = generateUser('owner');
      const reviewer = generateUser('reviewer');
      const artifactName = `Notification Test ${Date.now()}`;

      // Create separate browser contexts for owner and reviewer
      const ownerContext = await browser.newContext();
      const reviewerContext = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const reviewerPage = await reviewerContext.newPage();

      try {
        // 1. Owner: Login and upload artifact
        console.log('Owner logging in...');
        await loginUser(ownerPage, owner.email);

        console.log('Owner uploading artifact...');
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        console.log(`Artifact created at: ${artifactUrl}`);

        // 2. Owner: Invite reviewer
        console.log('Inviting reviewer...');
        await inviteReviewer(ownerPage, reviewer.email);

        // 3. Owner: Navigate back to artifact to wait for notifications
        await ownerPage.goto(artifactUrl);
        await expect(ownerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });

        // Verify owner has NO notifications initially
        console.log('Verifying owner has no initial notifications...');
        await expectNoNotificationBadge(ownerPage, 5000);

        // 4. Reviewer: Login and access artifact
        console.log('Reviewer logging in...');
        await reviewerPage.goto(artifactUrl);
        await reviewerPage.getByRole('button', { name: 'Sign In to Review' }).click();
        await reviewerPage.getByRole('button', { name: 'Magic Link' }).click();
        await reviewerPage.getByLabel('Email address').fill(reviewer.email);
        await reviewerPage.getByRole('button', { name: 'Send Magic Link' }).click();

        const reviewerEmailData = await getLatestEmail(reviewer.email, 'Sign in');
        const reviewerMagicLink = extractMagicLink(reviewerEmailData.html);
        await reviewerPage.goto(reviewerMagicLink!);

        // Wait for reviewer to reach artifact
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });
        console.log('Reviewer reached artifact.');

        // 5. Reviewer: Add a comment
        console.log('Reviewer adding comment...');
        await selectTextAndComment(reviewerPage, 'This is a test comment from the reviewer.');

        // 6. Owner: Verify notification badge appears with count "1"
        console.log('Verifying owner notification badge...');
        await waitForNotificationCount(ownerPage, 1, 30000);
        console.log('Owner notification badge shows count 1!');

      } finally {
        await ownerContext.close();
        await reviewerContext.close();
      }
    });
  });

  test.describe('Test 2: Reply Notifies Comment Author', () => {
    test('2.1: Owner replies to comment -> Reviewer sees notification badge', async ({ browser }) => {
      test.setTimeout(120000);

      const owner = generateUser('owner');
      const reviewer = generateUser('reviewer');
      const artifactName = `Reply Notify Test ${Date.now()}`;

      const ownerContext = await browser.newContext();
      const reviewerContext = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const reviewerPage = await reviewerContext.newPage();

      try {
        // Setup: Owner login, upload, invite
        await loginUser(ownerPage, owner.email);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        await inviteReviewer(ownerPage, reviewer.email);

        // Reviewer: Login and add comment
        await reviewerPage.goto(artifactUrl);
        await reviewerPage.getByRole('button', { name: 'Sign In to Review' }).click();
        await reviewerPage.getByRole('button', { name: 'Magic Link' }).click();
        await reviewerPage.getByLabel('Email address').fill(reviewer.email);
        await reviewerPage.getByRole('button', { name: 'Send Magic Link' }).click();

        const reviewerEmailData = await getLatestEmail(reviewer.email, 'Sign in');
        const reviewerMagicLink = extractMagicLink(reviewerEmailData.html);
        await reviewerPage.goto(reviewerMagicLink!);
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });

        console.log('Reviewer adding comment...');
        await selectTextAndComment(reviewerPage, 'Original comment from reviewer.');

        // Verify reviewer has no notifications (their own comment shouldn't notify them)
        await expectNoNotificationBadge(reviewerPage, 5000);

        // Owner: Navigate to artifact and reply to the comment
        await ownerPage.goto(artifactUrl);
        await expect(ownerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });

        // Wait for comment to appear
        await page.waitForTimeout(2000);

        console.log('Owner replying to comment...');
        await replyToFirstAnnotation(ownerPage, 'Reply from owner.');

        // Reviewer: Verify notification badge appears
        console.log('Verifying reviewer notification badge...');
        await waitForNotificationCount(reviewerPage, 1, 30000);
        console.log('Reviewer notification badge shows count 1!');

      } finally {
        await ownerContext.close();
        await reviewerContext.close();
      }
    });
  });

  test.describe('Test 3: Thread Participants Get Notified', () => {
    test('3.1: Third user replies -> Both owner and original commenter notified', async ({ browser }) => {
      test.setTimeout(150000);

      const owner = generateUser('owner');
      const reviewer1 = generateUser('reviewer1');
      const reviewer2 = generateUser('reviewer2');
      const artifactName = `Thread Notify Test ${Date.now()}`;

      const ownerContext = await browser.newContext();
      const reviewer1Context = await browser.newContext();
      const reviewer2Context = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const reviewer1Page = await reviewer1Context.newPage();
      const reviewer2Page = await reviewer2Context.newPage();

      try {
        // Setup: Owner login, upload, invite both reviewers
        await loginUser(ownerPage, owner.email);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        await inviteReviewer(ownerPage, reviewer1.email);

        // Go back to settings to invite second reviewer
        await ownerPage.getByRole('button', { name: 'Share' }).click();
        await ownerPage.getByPlaceholder('name@company.com').fill(reviewer2.email);
        await ownerPage.getByRole('button', { name: 'Send Invite' }).click();
        await expect(ownerPage.getByText(reviewer2.email).first()).toBeVisible({ timeout: 20000 });

        // Reviewer1: Login and add comment
        await reviewer1Page.goto(artifactUrl);
        await reviewer1Page.getByRole('button', { name: 'Sign In to Review' }).click();
        await reviewer1Page.getByRole('button', { name: 'Magic Link' }).click();
        await reviewer1Page.getByLabel('Email address').fill(reviewer1.email);
        await reviewer1Page.getByRole('button', { name: 'Send Magic Link' }).click();

        const reviewer1EmailData = await getLatestEmail(reviewer1.email, 'Sign in');
        const reviewer1MagicLink = extractMagicLink(reviewer1EmailData.html);
        await reviewer1Page.goto(reviewer1MagicLink!);
        await expect(reviewer1Page.getByText(artifactName)).toBeVisible({ timeout: 30000 });

        console.log('Reviewer1 adding comment...');
        await selectTextAndComment(reviewer1Page, 'Initial comment from reviewer1.');

        // Owner: Reply to the thread
        await ownerPage.goto(artifactUrl);
        await expect(ownerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });
        await ownerPage.waitForTimeout(2000);

        console.log('Owner replying...');
        await replyToFirstAnnotation(ownerPage, 'Reply from owner.');

        // Reviewer2: Login and reply to the thread
        await reviewer2Page.goto(artifactUrl);
        await reviewer2Page.getByRole('button', { name: 'Sign In to Review' }).click();
        await reviewer2Page.getByRole('button', { name: 'Magic Link' }).click();
        await reviewer2Page.getByLabel('Email address').fill(reviewer2.email);
        await reviewer2Page.getByRole('button', { name: 'Send Magic Link' }).click();

        const reviewer2EmailData = await getLatestEmail(reviewer2.email, 'Sign in');
        const reviewer2MagicLink = extractMagicLink(reviewer2EmailData.html);
        await reviewer2Page.goto(reviewer2MagicLink!);
        await expect(reviewer2Page.getByText(artifactName)).toBeVisible({ timeout: 30000 });
        await reviewer2Page.waitForTimeout(2000);

        console.log('Reviewer2 replying to thread...');
        await replyToFirstAnnotation(reviewer2Page, 'Reply from reviewer2.');

        // Both reviewer1 and owner should get notifications
        console.log('Verifying reviewer1 gets notification...');
        await waitForNotificationCount(reviewer1Page, 2, 30000); // 1 from owner's reply + 1 from reviewer2's reply

        console.log('Verifying owner gets notification...');
        // Owner already had 1 from reviewer1's original comment
        await waitForNotificationCount(ownerPage, 2, 30000);

        console.log('Thread notification test passed!');

      } finally {
        await ownerContext.close();
        await reviewer1Context.close();
        await reviewer2Context.close();
      }
    });
  });

  test.describe('Test 4: Self-Comment Does NOT Trigger Notification', () => {
    test('4.1: Owner comments on own artifact -> No notification', async ({ browser }) => {
      test.setTimeout(90000);

      const owner = generateUser('owner');
      const artifactName = `Self Comment Test ${Date.now()}`;

      const ownerContext = await browser.newContext();
      const ownerPage = await ownerContext.newPage();

      try {
        // Owner: Login and upload artifact
        await loginUser(ownerPage, owner.email);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);

        // Navigate to artifact
        await ownerPage.goto(artifactUrl);
        await expect(ownerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });

        // Verify no initial notifications
        await expectNoNotificationBadge(ownerPage, 5000);

        // Owner: Add a comment on their own artifact
        console.log('Owner adding comment on own artifact...');
        await selectTextAndComment(ownerPage, 'Self-comment by the owner.');

        // Wait a bit for any potential notification to arrive
        await ownerPage.waitForTimeout(5000);

        // Verify NO notification badge appeared
        console.log('Verifying owner does NOT get notification for self-comment...');
        await expectNoNotificationBadge(ownerPage, 5000);
        console.log('Self-notification exclusion verified!');

      } finally {
        await ownerContext.close();
      }
    });
  });

  test.describe('Test 5: Notification Count Accumulates', () => {
    test('5.1: Multiple comments -> Badge shows correct count', async ({ browser }) => {
      test.setTimeout(120000);

      const owner = generateUser('owner');
      const reviewer = generateUser('reviewer');
      const artifactName = `Count Test ${Date.now()}`;

      const ownerContext = await browser.newContext();
      const reviewerContext = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const reviewerPage = await reviewerContext.newPage();

      try {
        // Setup
        await loginUser(ownerPage, owner.email);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        await inviteReviewer(ownerPage, reviewer.email);

        // Owner: Navigate back to artifact
        await ownerPage.goto(artifactUrl);
        await expect(ownerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });

        // Reviewer: Login
        await reviewerPage.goto(artifactUrl);
        await reviewerPage.getByRole('button', { name: 'Sign In to Review' }).click();
        await reviewerPage.getByRole('button', { name: 'Magic Link' }).click();
        await reviewerPage.getByLabel('Email address').fill(reviewer.email);
        await reviewerPage.getByRole('button', { name: 'Send Magic Link' }).click();

        const reviewerEmailData = await getLatestEmail(reviewer.email, 'Sign in');
        const reviewerMagicLink = extractMagicLink(reviewerEmailData.html);
        await reviewerPage.goto(reviewerMagicLink!);
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });

        // Reviewer: Add 3 comments sequentially
        console.log('Reviewer adding comment 1...');
        await selectTextAndComment(reviewerPage, 'Comment 1 from reviewer.');

        // Refresh page to add another comment
        await reviewerPage.reload();
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });
        console.log('Reviewer adding comment 2...');
        await selectTextAndComment(reviewerPage, 'Comment 2 from reviewer.');

        await reviewerPage.reload();
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });
        console.log('Reviewer adding comment 3...');
        await selectTextAndComment(reviewerPage, 'Comment 3 from reviewer.');

        // Owner: Verify badge shows count "3"
        console.log('Verifying owner notification badge shows 3...');
        await waitForNotificationCount(ownerPage, 3, 45000);
        console.log('Notification count accumulation verified!');

      } finally {
        await ownerContext.close();
        await reviewerContext.close();
      }
    });
  });

  test.describe('Test 6: Mark as Read Clears Badge', () => {
    test('6.1: Owner opens notification center -> Badge clears', async ({ browser }) => {
      test.setTimeout(120000);

      const owner = generateUser('owner');
      const reviewer = generateUser('reviewer');
      const artifactName = `Mark Read Test ${Date.now()}`;

      const ownerContext = await browser.newContext();
      const reviewerContext = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const reviewerPage = await reviewerContext.newPage();

      try {
        // Setup
        await loginUser(ownerPage, owner.email);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        await inviteReviewer(ownerPage, reviewer.email);

        // Owner: Navigate back to artifact
        await ownerPage.goto(artifactUrl);
        await expect(ownerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });

        // Reviewer: Login and add comment
        await reviewerPage.goto(artifactUrl);
        await reviewerPage.getByRole('button', { name: 'Sign In to Review' }).click();
        await reviewerPage.getByRole('button', { name: 'Magic Link' }).click();
        await reviewerPage.getByLabel('Email address').fill(reviewer.email);
        await reviewerPage.getByRole('button', { name: 'Send Magic Link' }).click();

        const reviewerEmailData = await getLatestEmail(reviewer.email, 'Sign in');
        const reviewerMagicLink = extractMagicLink(reviewerEmailData.html);
        await reviewerPage.goto(reviewerMagicLink!);
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });

        console.log('Reviewer adding comment...');
        await selectTextAndComment(reviewerPage, 'Comment to test mark as read.');

        // Owner: Verify badge appears
        console.log('Verifying owner notification badge...');
        await waitForNotificationCount(ownerPage, 1, 30000);

        // Owner: Open notification center
        console.log('Owner opening notification center...');
        await openNotificationCenter(ownerPage);

        // Wait for Novu to mark notifications as seen
        await ownerPage.waitForTimeout(2000);

        // Close popover (click outside)
        await ownerPage.keyboard.press('Escape');
        await ownerPage.waitForTimeout(1000);

        // Verify badge is cleared
        console.log('Verifying badge cleared after opening...');
        await expectNoNotificationBadge(ownerPage, 10000);
        console.log('Mark as read functionality verified!');

      } finally {
        await ownerContext.close();
        await reviewerContext.close();
      }
    });
  });
});
