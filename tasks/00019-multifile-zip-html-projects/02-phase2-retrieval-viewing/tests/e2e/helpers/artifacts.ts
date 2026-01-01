import { Page, expect } from '@playwright/test';
import * as path from 'path';

export interface CreateZipArtifactOptions {
  title?: string;
  description?: string;
  zipFilePath: string; // Path to ZIP file from /samples/
}

/**
 * Create a ZIP artifact via the UI
 * Returns the share token for the created artifact
 */
export async function createZipArtifact(
  page: Page,
  options: CreateZipArtifactOptions
): Promise<{ shareToken: string; title: string }> {
  const title = options.title || 'Test ZIP Artifact';
  const description = options.description || '';

  // Navigate to dashboard if not already there
  if (!page.url().includes('/dashboard')) {
    await page.goto('/dashboard');
  }

  // Click "New Artifact" or "Upload" button
  const newArtifactButton = page
    .locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")')
    .first();
  await newArtifactButton.click();

  // Wait for dialog to open
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

  // Upload ZIP file via file input
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(options.zipFilePath);

  // Wait for file to be processed
  const fileName = path.basename(options.zipFilePath);
  await expect(page.locator(`text=${fileName}`)).toBeVisible({ timeout: 5000 });

  // Fill in title (might be auto-filled from filename)
  const titleInput = page.locator('#artifact-name');
  await titleInput.clear();
  await titleInput.fill(title);

  // Fill in description if provided
  if (description) {
    await page.fill('#description', description);
  }

  // Submit the form (within the dialog)
  const dialog = page.locator('[role="dialog"]');
  const submitButton = dialog.locator('button:has-text("Create Artifact")');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  // Wait for the dialog to close (indicates success) or for navigation
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 30000 }); // ZIPs may take longer

  // Now wait for navigation to the artifact page
  try {
    await page.waitForURL(/\/a\/[a-zA-Z0-9]+/, { timeout: 10000 });
    const url = page.url();
    const shareToken = url.split('/a/')[1]?.split('?')[0] || '';
    return { shareToken, title };
  } catch {
    // Maybe we stayed on dashboard - look for the artifact in the list
    await page.waitForURL('/dashboard', { timeout: 5000 });

    // Find the artifact card and get its share link
    const artifactCard = page.locator(`text=${title}`).first();
    await expect(artifactCard).toBeVisible({ timeout: 5000 });

    // Click on the artifact to navigate to it
    await artifactCard.click();
    await page.waitForURL(/\/a\/[a-zA-Z0-9]+/, { timeout: 10000 });

    const url = page.url();
    const shareToken = url.split('/a/')[1]?.split('?')[0] || '';
    return { shareToken, title };
  }
}

/**
 * Add a new version to an existing artifact (ZIP upload)
 */
export async function addZipVersion(
  page: Page,
  shareToken: string,
  options: {
    zipFilePath: string;
    versionName?: string;
  }
): Promise<{ versionNumber: number }> {
  // Navigate to the artifact page
  await page.goto(`/a/${shareToken}`);
  await page.waitForLoadState('networkidle');

  // Look for "Add Version" or "Upload Version" button
  const addVersionButton = page
    .locator('button:has-text("Add Version"), button:has-text("Upload Version"), button:has-text("New Version")')
    .first();
  await addVersionButton.click();

  // Wait for dialog to open
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

  // Upload ZIP file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(options.zipFilePath);

  // Wait for file to be selected
  const fileName = path.basename(options.zipFilePath);
  await expect(page.locator(`text=${fileName}`)).toBeVisible({ timeout: 5000 });

  // Optionally set version name
  if (options.versionName) {
    const versionNameInput = page.locator('#version-name, input[name="versionName"]');
    if (await versionNameInput.isVisible()) {
      await versionNameInput.fill(options.versionName);
    }
  }

  // Submit the form
  const submitButton = page.locator(
    'button:has-text("Upload"), button:has-text("Add Version"), button:has-text("Create")'
  );
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  // Wait for the dialog to close
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 30000 });

  // Extract version number from URL or UI
  // URL format might be /a/{token}?v=2 or similar
  const url = page.url();
  const versionMatch = url.match(/[?&]v=(\d+)/);
  const versionNumber = versionMatch ? parseInt(versionMatch[1], 10) : 2; // Default to 2 if not in URL

  return { versionNumber };
}

/**
 * Switch to a specific version in the viewer
 */
export async function switchToVersion(
  page: Page,
  versionNumber: number
): Promise<void> {
  // Look for version selector dropdown or buttons
  const versionSelector = page.locator('[data-testid="version-selector"], select[name="version"]');

  if (await versionSelector.isVisible()) {
    // If it's a select dropdown
    await versionSelector.selectOption({ value: versionNumber.toString() });
  } else {
    // Try clicking version button/link
    const versionButton = page.locator(`button:has-text("v${versionNumber}"), a:has-text("v${versionNumber}")`);
    await versionButton.click();
  }

  // Wait for page to update
  await page.waitForLoadState('networkidle');
}

/**
 * Verify artifact content is displayed in the viewer
 */
export async function verifyArtifactContentVisible(
  page: Page,
  expectedText: string
): Promise<void> {
  // Check if content appears in iframe or main page
  const iframe = page.frameLocator('iframe').first();

  try {
    // Try to find in iframe first
    await expect(iframe.locator(`text=${expectedText}`).first()).toBeVisible({
      timeout: 10000,
    });
  } catch {
    // If not in iframe, check main page
    await expect(page.locator(`text=${expectedText}`).first()).toBeVisible({
      timeout: 10000,
    });
  }
}

/**
 * Access an artifact via its share link (without authentication)
 */
export async function accessArtifactViaShareLink(
  page: Page,
  shareToken: string
): Promise<void> {
  await page.goto(`/a/${shareToken}`);
  await page.waitForLoadState('networkidle');
}
