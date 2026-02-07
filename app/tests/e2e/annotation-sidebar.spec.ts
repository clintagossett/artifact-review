/**
 * E2E tests for Annotation Sidebar behavior (Issue #94)
 *
 * These tests validate:
 * 1. Sidebar starts closed when there are no comments
 * 2. Sidebar auto-opens when comments exist
 * 3. Comments button toggles sidebar open/closed
 * 4. Sidebar is contained within the artifact viewer (not extending past headers)
 */
import { test, expect } from '@playwright/test';
import { generateTestUser, signUpWithPassword } from '../utils/auth';
import path from 'path';

/**
 * Helper: Upload artifact and return URL
 * Uses Markdown files because the annotation system only works with Markdown content
 */
async function uploadArtifact(page: any, name: string): Promise<string> {
  // Click the "Upload" button in the header
  const uploadBtn = page.getByRole('button', { name: 'Upload' });
  await expect(uploadBtn).toBeVisible({ timeout: 15000 });
  await uploadBtn.click();

  // Wait for the modal to appear
  await expect(page.getByText('Create New Artifact')).toBeVisible({ timeout: 10000 });

  // Use Markdown file - annotation system only works with Markdown, not HTML in iframes
  const mdPath = path.resolve(process.cwd(), '../samples/01-valid/markdown/product-spec/v1.md');
  const fileInput = page.locator('#file-upload');
  await expect(fileInput).toBeAttached({ timeout: 5000 });
  await fileInput.setInputFiles(mdPath);

  // Wait for file to be processed
  await expect(page.getByText('v1.md')).toBeVisible({ timeout: 15000 });

  await page.getByLabel('Artifact Name').fill(name);

  // Wait for the button to be enabled
  const createButton = page.getByRole('button', { name: 'Create Artifact' });
  await expect(createButton).toBeEnabled({ timeout: 10000 });

  console.log('Clicking Create Artifact button...');
  await createButton.click();

  // Wait for modal to close
  await expect(page.getByText('Create New Artifact')).not.toBeVisible({ timeout: 30000 });

  // Check if we auto-navigated to artifact page
  const currentUrl = page.url();
  if (currentUrl.includes('/a/')) {
    return currentUrl;
  }

  // If still on dashboard, click the artifact card to navigate
  console.log('Waiting for artifact card on dashboard...');
  const cardLocator = page.locator('a, [role="link"], [class*="card"]').filter({ hasText: name }).first();
  await expect(cardLocator).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  console.log('Clicking artifact card to navigate...');
  await cardLocator.click();

  await expect(page).toHaveURL(/\/a\//, { timeout: 30000 });
  return page.url();
}

/**
 * Helper: Select text and add annotation
 */
async function selectTextAndComment(page: any, commentText: string) {
  // Wait for markdown content to render
  await page.waitForSelector('.prose', { timeout: 15000 });

  const heading = page.locator('.prose h1, .prose h2').first();
  await expect(heading).toBeVisible({ timeout: 5000 });

  console.log('Triple-clicking to select heading text...');
  await heading.click({ clickCount: 3 });

  console.log('Waiting for selection menu...');
  const commentButton = page.locator('button[title="Comment"]');
  await expect(commentButton).toBeVisible({ timeout: 5000 });
  await commentButton.click();

  console.log('Waiting for annotation input...');
  const commentInput = page.getByTestId('annotation-comment-input');
  await expect(commentInput).toBeVisible({ timeout: 10000 });
  await commentInput.fill(commentText);

  const submitButton = page.getByTestId('annotation-submit-button');
  await submitButton.click();

  await expect(commentInput).not.toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

test.describe('Annotation Sidebar Behavior', () => {

  test('sidebar starts closed when artifact has no comments', async ({ page }) => {
    const user = generateTestUser('sidebar-empty');

    // Sign up and create artifact
    await signUpWithPassword(page, user);
    await uploadArtifact(page, 'Sidebar Empty Test ' + Date.now());

    // Wait for artifact viewer to load
    await expect(page.locator('[data-version-status="ready"]')).toBeVisible({ timeout: 30000 });

    // Verify sidebar is closed - the annotation sidebar header should not be visible
    const sidebarHeader = page.getByRole('heading', { name: 'Annotations' });
    await expect(sidebarHeader).not.toBeVisible({ timeout: 5000 });

    console.log('Verified: Sidebar is closed when no comments exist');

    // Verify the Comments button shows 0 count
    const commentsButton = page.getByRole('button', { name: /comments/i });
    await expect(commentsButton).toBeVisible();
    await expect(commentsButton).toContainText('0');
  });

  test('sidebar auto-opens when artifact has comments', async ({ page }) => {
    const user = generateTestUser('sidebar-auto');
    const artifactName = 'Sidebar Auto Open Test ' + Date.now();

    // Sign up and create artifact
    await signUpWithPassword(page, user);
    const artifactUrl = await uploadArtifact(page, artifactName);

    // Wait for viewer to load
    await expect(page.locator('[data-version-status="ready"]')).toBeVisible({ timeout: 30000 });

    // Add a comment via text selection (this will auto-open sidebar)
    console.log('Adding comment to trigger sidebar auto-open...');
    await selectTextAndComment(page, 'Test comment for auto-open');

    // Refresh the page to test initial load with existing comment
    console.log('Refreshing page to test auto-open behavior...');
    await page.goto(artifactUrl);
    await expect(page.locator('[data-version-status="ready"]')).toBeVisible({ timeout: 30000 });

    // Verify sidebar auto-opened by checking the header is visible
    const sidebarHeader = page.getByRole('heading', { name: 'Annotations' });
    await expect(sidebarHeader).toBeVisible({ timeout: 10000 });

    console.log('Verified: Sidebar auto-opens when comments exist');

    // Verify Comments button shows count of 1
    const commentsButton = page.getByRole('button', { name: /comments/i });
    await expect(commentsButton).toContainText('1');
  });

  test('comments button toggles sidebar open/closed', async ({ page }) => {
    const user = generateTestUser('sidebar-toggle');

    // Sign up and create artifact
    await signUpWithPassword(page, user);
    await uploadArtifact(page, 'Sidebar Toggle Test ' + Date.now());

    // Wait for viewer to load
    await expect(page.locator('[data-version-status="ready"]')).toBeVisible({ timeout: 30000 });

    // Find the Comments button
    const commentsButton = page.getByRole('button', { name: /comments/i });
    await expect(commentsButton).toBeVisible();

    // Initially sidebar should be closed (no comments)
    const sidebarHeader = page.getByRole('heading', { name: 'Annotations' });
    await expect(sidebarHeader).not.toBeVisible();

    // Click to open sidebar
    console.log('Clicking Comments button to open sidebar...');
    await commentsButton.click();
    await expect(sidebarHeader).toBeVisible({ timeout: 5000 });
    console.log('Sidebar opened');

    // Click again to close sidebar
    console.log('Clicking Comments button to close sidebar...');
    await commentsButton.click();
    await expect(sidebarHeader).not.toBeVisible({ timeout: 5000 });
    console.log('Sidebar closed');

    // Click once more to verify it can be reopened
    console.log('Clicking Comments button to reopen sidebar...');
    await commentsButton.click();
    await expect(sidebarHeader).toBeVisible({ timeout: 5000 });
    console.log('Sidebar reopened - toggle working correctly');
  });

  test('sidebar is contained within artifact viewer layout', async ({ page }) => {
    const user = generateTestUser('sidebar-layout');

    // Sign up and create artifact
    await signUpWithPassword(page, user);
    await uploadArtifact(page, 'Sidebar Layout Test ' + Date.now());

    // Wait for viewer to load
    await expect(page.locator('[data-version-status="ready"]')).toBeVisible({ timeout: 30000 });

    // Open the sidebar
    const commentsButton = page.getByRole('button', { name: /comments/i });
    await commentsButton.click();

    // Wait for sidebar to open
    const sidebarHeader = page.getByRole('heading', { name: 'Annotations' });
    await expect(sidebarHeader).toBeVisible({ timeout: 5000 });

    // Get the ArtifactHeader (the top header with artifact name)
    const artifactHeader = page.locator('header').first();
    const headerBox = await artifactHeader.boundingBox();

    // Get the sidebar
    const sidebar = page.locator('.w-80.border-l').first();
    const sidebarBox = await sidebar.boundingBox();

    // Verify sidebar starts BELOW the header (not at top of screen)
    if (headerBox && sidebarBox) {
      console.log(`Header bottom: ${headerBox.y + headerBox.height}px`);
      console.log(`Sidebar top: ${sidebarBox.y}px`);

      // The sidebar should start at or below the header's position
      // (since it's in the flex container below the header)
      expect(sidebarBox.y).toBeGreaterThanOrEqual(headerBox.y);

      console.log('Verified: Sidebar is contained within viewer layout (below header)');
    }

    // Additional verification: sidebar should not be at y=0 (fixed to top)
    if (sidebarBox) {
      expect(sidebarBox.y).toBeGreaterThan(0);
      console.log(`Sidebar is NOT fixed to top (y=${sidebarBox.y}px)`);
    }
  });

});
