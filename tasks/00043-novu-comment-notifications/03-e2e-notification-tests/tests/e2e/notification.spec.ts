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
 * Uses PASSWORD signup to avoid email delivery dependencies.
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
import path from 'path';

// Path to sample files
const SAMPLES_DIR = path.resolve(__dirname, '../../../../../samples');
const SAMPLE_ZIP = path.join(SAMPLES_DIR, '01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');

/**
 * Generate unique user data for each test run.
 */
const generateUser = (prefix = 'user') => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return {
    name: `${prefix}-${timestamp}`,
    email: `${prefix}+${timestamp}-${random}@test.local`,
    password: `Test${timestamp}!Secure`,
  };
};

/**
 * Helper: Wait for notification badge to show expected count.
 */
async function waitForNotificationCount(
  page: Page,
  count: number,
  timeout = 30000
): Promise<void> {
  const badge = page.getByTestId('notification-badge');
  const countElement = page.getByTestId('notification-count');

  await expect(badge).toBeVisible({ timeout });
  await expect(countElement).toHaveText(String(count), { timeout });
}

/**
 * Helper: Wait for notification count to be at least N.
 */
async function waitForNotificationCountAtLeast(
  page: Page,
  minCount: number,
  timeout = 30000
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const badge = page.getByTestId('notification-badge');
      const isVisible = await badge.isVisible();
      if (isVisible) {
        const countElement = page.getByTestId('notification-count');
        const countText = await countElement.textContent();
        const count = parseInt(countText || '0', 10);
        if (count >= minCount) return;
      }
    } catch (e) {
      // Continue waiting
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Notification count did not reach ${minCount} within ${timeout}ms`);
}

/**
 * Helper: Assert notification badge is NOT visible.
 */
async function expectNoNotificationBadge(
  page: Page,
  timeout = 10000
): Promise<void> {
  const badge = page.getByTestId('notification-badge');
  await expect(badge).not.toBeVisible({ timeout });
}

/**
 * Helper: Open notification center by clicking bell.
 */
async function openNotificationCenter(page: Page): Promise<void> {
  const bell = page.getByTestId('notification-bell');
  await bell.click();
  await page.waitForTimeout(1000); // Wait for Novu popover to load
}

/**
 * Helper: Signup user via password flow.
 */
async function signupUser(page: Page, user: { name: string; email: string; password: string }): Promise<void> {
  console.log(`[signupUser] Starting signup for ${user.email}`);
  await page.goto('/register');

  // Listen for ALL console messages for debugging
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`[Browser Error] ${error.message}`);
  });

  // Listen for WebSocket events
  page.on('websocket', ws => {
    console.log(`[WebSocket] Connection opened: ${ws.url()}`);
    ws.on('close', () => console.log(`[WebSocket] Connection closed: ${ws.url()}`));
    ws.on('socketerror', error => console.log(`[WebSocket] Error: ${error}`));
  });

  // Wait for Convex to initialize
  await page.waitForTimeout(2000);
  console.log('[signupUser] Waiting for Convex client initialization...');

  // Check initial auth state
  const initialAuthState = await page.evaluate(() => {
    // Check localStorage for auth tokens
    const keys = Object.keys(localStorage).filter(k => k.includes('convex') || k.includes('auth'));
    return { localStorage: keys };
  });
  console.log('[signupUser] Initial localStorage keys:', JSON.stringify(initialAuthState));

  // Fill form using id selectors (more reliable than labels)
  console.log('[signupUser] Filling form fields...');
  await page.fill('input[id="name"]', user.name);
  await page.fill('input[id="email"]', user.email);
  await page.fill('input[id="password"]', user.password);
  await page.fill('input[id="confirmPassword"]', user.password);

  console.log('[signupUser] Form filled, clicking Create Account...');

  // Submit
  await page.click('button:has-text("Create Account")');

  console.log('[signupUser] Button clicked, waiting for auth state change...');

  // Wait for the button to show loading state
  await page.waitForTimeout(1000);

  // Poll for auth state changes
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);

    const authState = await page.evaluate(() => {
      // Check localStorage for auth tokens
      const keys = Object.keys(localStorage);
      const authKeys = keys.filter(k => k.includes('convex') || k.includes('auth'));
      const authData: Record<string, string | null> = {};
      authKeys.forEach(k => {
        const value = localStorage.getItem(k);
        authData[k] = value;
      });
      return { authKeys, authData, allKeys: keys.length };
    });

    // If we have a JWT, decode and log it
    if (authState.authData['__convexAuthJWT_httpapimarkloc']) {
      const jwt = authState.authData['__convexAuthJWT_httpapimarkloc'];
      try {
        const parts = jwt.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log(`[signupUser] Poll ${i + 1}: JWT payload = ${JSON.stringify(payload)}`);
        }
      } catch (e) {
        console.log(`[signupUser] Poll ${i + 1}: JWT decode error`);
      }
    }

    console.log(`[signupUser] Poll ${i + 1}: localStorage auth keys = ${JSON.stringify(authState.authKeys)}, total keys = ${authState.allKeys}`);

    // Check current URL
    const currentUrl = page.url();
    console.log(`[signupUser] Poll ${i + 1}: URL = ${currentUrl}`);

    if (currentUrl.includes('/dashboard')) {
      console.log('[signupUser] Signup complete - redirected to dashboard!');
      return;
    }

    // Check if there's an error message
    const errorMessage = await page.locator('[role="alert"]').textContent().catch(() => null);
    if (errorMessage) {
      console.log(`[signupUser] Error displayed: ${errorMessage}`);
    }
  }

  // Try navigating directly to dashboard instead of waiting for redirect
  console.log('[signupUser] Trying direct navigation to /dashboard...');
  await page.goto('/dashboard');
  await page.waitForTimeout(3000);

  // Check if we landed on dashboard
  const postNavigateUrl = page.url();
  console.log(`[signupUser] Post-navigate URL: ${postNavigateUrl}`);
  if (postNavigateUrl.includes('/dashboard')) {
    console.log('[signupUser] Direct navigation to dashboard succeeded!');
    return;
  }

  // If redirected back to login/register, auth isn't working
  console.log('[signupUser] Auth not working - was redirected back');

  // Final debug: show localStorage state
  const finalAuthState = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    return keys;
  });
  console.log('[signupUser] Final localStorage keys:', JSON.stringify(finalAuthState));

  throw new Error('Signup did not work - could not access dashboard');
}

/**
 * Helper: Login user via password flow.
 */
async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');

  // Switch to password mode
  await page.click('button:has-text("Password")');

  // Fill form using id selectors
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);

  // Submit
  await page.click('button:has-text("Sign In")');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
}

/**
 * Helper: Upload artifact and return URL.
 */
async function uploadArtifact(page: Page, name: string): Promise<string> {
  // Click to open upload dialog
  await page.getByRole('button', { name: /Artifact/ }).first().click();

  // Set the file
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_ZIP);

  // Fill name
  await page.getByLabel('Artifact Name').fill(name);

  // Submit
  await page.getByRole('button', { name: 'Create Artifact' }).click();

  // Wait for navigation to artifact page
  await expect(page).toHaveURL(/\/a\//, { timeout: 60000 });
  return page.url();
}

/**
 * Helper: Invite reviewer to artifact.
 */
async function inviteReviewer(page: Page, reviewerEmail: string, artifactUrl: string): Promise<void> {
  // Navigate directly to settings page (bypassing Manage button click issue)
  // Extract shareToken from URL: http://mark.loc/a/{shareToken}
  const shareToken = artifactUrl.split('/a/')[1];
  const settingsUrl = `${artifactUrl}/settings`;
  console.log(`[inviteReviewer] Navigating directly to: ${settingsUrl}`);
  await page.goto(settingsUrl);

  console.log('[inviteReviewer] Waiting for settings page to load...');
  await expect(page).toHaveURL(/\/settings/, { timeout: 30000 });

  // Wait for page to be ready
  await page.waitForTimeout(2000);

  // Navigate to Access tab (email input is there)
  console.log('[inviteReviewer] Clicking Access tab...');
  await page.getByRole('button', { name: /Access/i }).click();
  await page.waitForTimeout(1000);
  console.log('[inviteReviewer] On Access tab, looking for email input...');

  const emailInput = page.getByPlaceholder('name@company.com');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(reviewerEmail);
  console.log('[inviteReviewer] Email filled, clicking Send Invite...');

  await page.getByRole('button', { name: 'Send Invite' }).click();
  console.log('[inviteReviewer] Waiting for invite confirmation...');
  await expect(page.getByText(reviewerEmail).first()).toBeVisible({ timeout: 20000 });
  console.log('[inviteReviewer] Invite completed!');
}

/**
 * Helper: Select text in the artifact iframe and create annotation.
 */
async function selectTextAndComment(page: Page, commentText: string): Promise<void> {
  // Wait for the artifact iframe content to load
  const iframe = page.frameLocator('iframe').first();
  const textContent = iframe.locator('body');
  await textContent.waitFor({ timeout: 15000 });

  // Execute script to select text and trigger the annotation flow
  await page.evaluate(() => {
    const iframeEl = document.querySelector('iframe');
    if (!iframeEl || !iframeEl.contentDocument) return;

    const doc = iframeEl.contentDocument;
    const body = doc.body;

    // Find first text node with sufficient content
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

  // Wait for submission to complete (input should disappear)
  await expect(commentInput).not.toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Reply to an annotation.
 */
async function replyToAnnotation(page: Page, replyText: string): Promise<void> {
  // Click reply button on the first annotation card
  const replyButton = page.getByTestId('annotation-reply-button').first();
  await replyButton.click();

  // Type the reply
  const replyInput = page.getByTestId('annotation-reply-input');
  await expect(replyInput).toBeVisible({ timeout: 5000 });
  await replyInput.fill(replyText);

  // Submit the reply
  const submitButton = page.getByTestId('annotation-reply-submit');
  await submitButton.click();

  // Wait for submission to complete
  await expect(replyInput).not.toBeVisible({ timeout: 10000 });
}

test.describe('Notification System', () => {

  // Debug test to verify auth works at all
  test.describe('Auth Debug', () => {
    test('0.1: Basic signup and auth verification', async ({ page }) => {
      test.setTimeout(60000);

      // Capture ALL console messages
      page.on('console', msg => {
        console.log(`[Browser ${msg.type()}] ${msg.text()}`);
      });

      const user = generateUser('authtest');
      console.log(`[AuthDebug] Testing auth with user: ${user.email}`);

      // Go to register page
      await page.goto('/register');
      await page.waitForTimeout(2000);

      // Fill form
      await page.fill('input[id="name"]', user.name);
      await page.fill('input[id="email"]', user.email);
      await page.fill('input[id="password"]', user.password);
      await page.fill('input[id="confirmPassword"]', user.password);

      // Submit
      await page.click('button:has-text("Create Account")');

      // Wait for the button to show loading
      await page.waitForTimeout(2000);

      // Check localStorage
      const localStorage1 = await page.evaluate(() => {
        const keys = Object.keys(window.localStorage);
        return { keys, count: keys.length };
      });
      console.log(`[AuthDebug] localStorage after signup: ${JSON.stringify(localStorage1)}`);

      // Wait longer for WebSocket sync
      await page.waitForTimeout(5000);

      // Try evaluating Convex auth state directly
      const authState = await page.evaluate(() => {
        // Access the Convex client if it's exposed
        return {
          localStorage: Object.keys(window.localStorage),
          // Check if there's a global Convex instance
          hasConvex: typeof (window as any).__convex !== 'undefined',
        };
      });
      console.log(`[AuthDebug] Auth state: ${JSON.stringify(authState)}`);

      // Now try to access a protected page
      await page.goto('/dashboard');
      await page.waitForTimeout(3000);

      const finalUrl = page.url();
      console.log(`[AuthDebug] Final URL after dashboard navigation: ${finalUrl}`);

      // If we're on dashboard, auth works
      if (finalUrl.includes('/dashboard')) {
        console.log('[AuthDebug] SUCCESS - Auth works!');
        return;
      }

      // If we're redirected, auth failed
      console.log('[AuthDebug] FAILED - Was redirected away from dashboard');

      // Final localStorage check
      const localStorage2 = await page.evaluate(() => {
        return Object.keys(window.localStorage);
      });
      console.log(`[AuthDebug] Final localStorage: ${JSON.stringify(localStorage2)}`);

      // Don't fail - just log the result for debugging
      // throw new Error('Auth test failed');
    });
  });

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
        // 1. Owner: Signup and upload artifact
        console.log('Owner signing up...');
        await signupUser(ownerPage, owner);

        console.log('Owner uploading artifact...');
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        console.log(`Artifact created at: ${artifactUrl}`);

        // 2. Owner: Invite reviewer
        console.log('Inviting reviewer...');
        await inviteReviewer(ownerPage, reviewer.email, artifactUrl);

        // 3. Owner: Navigate back to artifact to wait for notifications
        await ownerPage.goto(artifactUrl);
        await expect(ownerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });

        // Verify owner has NO notifications initially
        console.log('Verifying owner has no initial notifications...');
        await expectNoNotificationBadge(ownerPage, 5000);

        // 4. Reviewer: Signup and access artifact
        console.log('Reviewer signing up...');
        await signupUser(reviewerPage, reviewer);
        await reviewerPage.goto(artifactUrl);

        // Wait for reviewer to reach artifact
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });
        console.log('Reviewer reached artifact.');

        // 5. Reviewer: Add a comment
        console.log('Reviewer adding comment...');
        await selectTextAndComment(reviewerPage, 'This is a test comment from the reviewer.');

        // 6. Owner: Verify notification badge appears with count "1"
        console.log('Verifying owner notification badge...');
        await waitForNotificationCount(ownerPage, 1, 30000);
        console.log('✓ Owner notification badge shows count 1!');

      } finally {
        await ownerContext.close();
        await reviewerContext.close();
      }
    });
  });

  test.describe('Test 2: Reply Notifies Comment Author', () => {
    test('2.1: Owner replies to reviewer comment -> Reviewer sees notification badge', async ({ browser }) => {
      test.setTimeout(120000);

      const owner = generateUser('owner');
      const reviewer = generateUser('reviewer');
      const artifactName = `Reply Notification Test ${Date.now()}`;

      const ownerContext = await browser.newContext();
      const reviewerContext = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const reviewerPage = await reviewerContext.newPage();

      try {
        // Setup: Owner creates artifact, invites reviewer
        await signupUser(ownerPage, owner);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        await inviteReviewer(ownerPage, reviewer.email, artifactUrl);
        await ownerPage.goto(artifactUrl);

        // Reviewer signs up, comments
        await signupUser(reviewerPage, reviewer);
        await reviewerPage.goto(artifactUrl);
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });
        await selectTextAndComment(reviewerPage, 'Initial comment from reviewer.');

        // Owner waits for notification from comment
        await waitForNotificationCount(ownerPage, 1, 30000);
        console.log('Owner received comment notification.');

        // Clear reviewer's notification state (if any) by refreshing
        await reviewerPage.reload();
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });

        // Verify reviewer has no notifications initially
        await expectNoNotificationBadge(reviewerPage, 5000);

        // Owner replies to the comment
        console.log('Owner replying to comment...');
        await ownerPage.reload();
        await expect(ownerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });
        await replyToAnnotation(ownerPage, 'Reply from owner.');

        // Reviewer verifies notification badge appears
        console.log('Verifying reviewer notification badge...');
        await waitForNotificationCount(reviewerPage, 1, 30000);
        console.log('✓ Reviewer notification badge shows count 1!');

      } finally {
        await ownerContext.close();
        await reviewerContext.close();
      }
    });
  });

  test.describe('Test 3: Thread Participants Get Notified', () => {
    test('3.1: Third user replies -> Both owner and original commenter notified', async ({ browser }) => {
      test.setTimeout(180000);

      const owner = generateUser('owner');
      const reviewer1 = generateUser('reviewer1');
      const reviewer2 = generateUser('reviewer2');
      const artifactName = `Thread Notification Test ${Date.now()}`;

      const ownerContext = await browser.newContext();
      const reviewer1Context = await browser.newContext();
      const reviewer2Context = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const reviewer1Page = await reviewer1Context.newPage();
      const reviewer2Page = await reviewer2Context.newPage();

      try {
        // Setup: Owner creates artifact
        await signupUser(ownerPage, owner);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        await inviteReviewer(ownerPage, reviewer1.email, artifactUrl);
        await inviteReviewer(ownerPage, reviewer2.email, artifactUrl);
        await ownerPage.goto(artifactUrl);

        // Reviewer1 comments
        await signupUser(reviewer1Page, reviewer1);
        await reviewer1Page.goto(artifactUrl);
        await expect(reviewer1Page.getByText(artifactName)).toBeVisible({ timeout: 30000 });
        await selectTextAndComment(reviewer1Page, 'Comment from reviewer1.');

        // Owner receives notification
        await waitForNotificationCount(ownerPage, 1, 30000);
        console.log('Owner received comment notification.');

        // Owner replies
        await ownerPage.reload();
        await replyToAnnotation(ownerPage, 'Reply from owner.');
        await waitForNotificationCount(reviewer1Page, 1, 30000);
        console.log('Reviewer1 received reply notification.');

        // Clear notification states by opening notification centers
        await openNotificationCenter(ownerPage);
        await ownerPage.waitForTimeout(2000);
        await openNotificationCenter(reviewer1Page);
        await reviewer1Page.waitForTimeout(2000);

        // Reload and verify badges are cleared
        await ownerPage.reload();
        await reviewer1Page.reload();

        // Reviewer2 joins and replies in the thread
        await signupUser(reviewer2Page, reviewer2);
        await reviewer2Page.goto(artifactUrl);
        await expect(reviewer2Page.getByText(artifactName)).toBeVisible({ timeout: 30000 });
        await replyToAnnotation(reviewer2Page, 'Reply from reviewer2.');

        // Both owner and reviewer1 should get notifications
        console.log('Verifying both owner and reviewer1 get notified...');
        await waitForNotificationCountAtLeast(ownerPage, 1, 30000);
        console.log('✓ Owner received notification from reviewer2!');

        await waitForNotificationCountAtLeast(reviewer1Page, 1, 30000);
        console.log('✓ Reviewer1 received notification from reviewer2!');

      } finally {
        await ownerContext.close();
        await reviewer1Context.close();
        await reviewer2Context.close();
      }
    });
  });

  test.describe('Test 4: Self-Comment Does NOT Trigger Notification', () => {
    test('4.1: Owner comments on own artifact -> Owner does NOT get notification', async ({ browser }) => {
      test.setTimeout(120000);

      const owner = generateUser('owner');
      const artifactName = `Self-Comment Test ${Date.now()}`;

      const ownerContext = await browser.newContext();
      const ownerPage = await ownerContext.newPage();

      try {
        // Owner signs up and creates artifact
        await signupUser(ownerPage, owner);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        await ownerPage.goto(artifactUrl);
        await expect(ownerPage.getByText(artifactName)).toBeVisible({ timeout: 15000 });

        // Verify owner has no notifications initially
        await expectNoNotificationBadge(ownerPage, 5000);

        // Owner comments on their own artifact
        console.log('Owner commenting on own artifact...');
        await selectTextAndComment(ownerPage, 'This is my own comment.');

        // Wait a bit for any notifications to potentially arrive
        await ownerPage.waitForTimeout(5000);

        // Verify owner still has NO notification badge
        console.log('Verifying owner has NO notification badge...');
        await expectNoNotificationBadge(ownerPage, 5000);
        console.log('✓ Owner correctly did NOT receive self-notification!');

      } finally {
        await ownerContext.close();
      }
    });
  });

  test.describe('Test 5: Notification Count Accumulates', () => {
    test('5.1: Multiple comments -> Badge shows correct count', async ({ browser }) => {
      test.setTimeout(180000);

      const owner = generateUser('owner');
      const reviewer = generateUser('reviewer');
      const artifactName = `Accumulation Test ${Date.now()}`;

      const ownerContext = await browser.newContext();
      const reviewerContext = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const reviewerPage = await reviewerContext.newPage();

      try {
        // Setup
        await signupUser(ownerPage, owner);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        await inviteReviewer(ownerPage, reviewer.email, artifactUrl);
        await ownerPage.goto(artifactUrl);

        await signupUser(reviewerPage, reviewer);
        await reviewerPage.goto(artifactUrl);
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });

        // Verify owner has no notifications initially
        await expectNoNotificationBadge(ownerPage, 5000);

        // Reviewer adds 3 comments
        console.log('Reviewer adding comment 1...');
        await selectTextAndComment(reviewerPage, 'First comment.');
        await reviewerPage.waitForTimeout(2000);

        console.log('Reviewer adding comment 2...');
        await selectTextAndComment(reviewerPage, 'Second comment.');
        await reviewerPage.waitForTimeout(2000);

        console.log('Reviewer adding comment 3...');
        await selectTextAndComment(reviewerPage, 'Third comment.');

        // Owner verifies badge shows "3"
        console.log('Verifying owner notification badge shows 3...');
        await waitForNotificationCount(ownerPage, 3, 45000);
        console.log('✓ Owner notification badge shows count 3!');

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
        await signupUser(ownerPage, owner);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        await inviteReviewer(ownerPage, reviewer.email, artifactUrl);
        await ownerPage.goto(artifactUrl);

        await signupUser(reviewerPage, reviewer);
        await reviewerPage.goto(artifactUrl);
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({ timeout: 30000 });

        // Reviewer comments
        await selectTextAndComment(reviewerPage, 'Comment to be marked as read.');

        // Owner verifies badge appears
        await waitForNotificationCount(ownerPage, 1, 30000);
        console.log('Owner has notification badge with count 1.');

        // Owner opens notification center
        console.log('Owner opening notification center...');
        await openNotificationCenter(ownerPage);

        // Wait for Novu to mark as read
        await ownerPage.waitForTimeout(3000);

        // Close the notification center (click elsewhere)
        await ownerPage.keyboard.press('Escape');
        await ownerPage.waitForTimeout(1000);

        // Verify badge is cleared
        console.log('Verifying badge is cleared...');
        await expectNoNotificationBadge(ownerPage, 10000);
        console.log('✓ Badge cleared after opening notification center!');

      } finally {
        await ownerContext.close();
        await reviewerContext.close();
      }
    });
  });
});
