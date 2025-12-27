import { Page, expect } from '@playwright/test';

export interface CreateArtifactOptions {
  title?: string;
  description?: string;
  htmlContent?: string;
  fileName?: string;
}

/**
 * Create a test artifact via the UI
 * Returns the share token for the created artifact
 */
export async function createTestArtifact(
  page: Page,
  options?: CreateArtifactOptions
): Promise<{ shareToken: string; title: string }> {
  const title = options?.title || 'Test Artifact';
  const description = options?.description || '';
  const htmlContent = options?.htmlContent || `
    <!DOCTYPE html>
    <html>
      <head><title>${title}</title></head>
      <body><h1>${title}</h1><p>Test content</p></body>
    </html>
  `;
  const fileName = options?.fileName || 'test-artifact.html';

  // Navigate to dashboard if not already there
  if (!page.url().includes('/dashboard')) {
    await page.goto('/dashboard');
  }

  // Click "New Artifact" or "Upload" button
  // Try multiple selectors that might match
  const newArtifactButton = page.locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")').first();
  await newArtifactButton.click();

  // Wait for dialog to open
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

  // Upload file via file input
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: 'text/html',
    buffer: Buffer.from(htmlContent),
  });

  // Wait for file to be processed
  await expect(page.locator(`text=${fileName}`)).toBeVisible({ timeout: 5000 });

  // Fill in title (might be auto-filled from filename)
  const titleInput = page.locator('#project-name');
  await titleInput.clear();
  await titleInput.fill(title);

  // Fill in description if provided
  if (description) {
    await page.fill('#description', description);
  }

  // Submit the form
  const submitButton = page.locator('button:has-text("Create Project")');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  // Wait for the dialog to close (indicates success) or for navigation
  // The dialog closes after successful creation
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 15000 });

  // Now wait for navigation to the artifact page
  // If we're redirected, we should see /a/ in the URL
  // If we stay on dashboard, the artifact should appear in the list
  try {
    await page.waitForURL(/\/a\/[a-zA-Z0-9]+/, { timeout: 5000 });
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
 * Verify an artifact is visible in the dashboard list
 */
export async function verifyArtifactInList(
  page: Page,
  title: string
): Promise<void> {
  await page.goto('/dashboard');
  await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 5000 });
}

/**
 * Access an artifact via its share link (without authentication)
 */
export async function accessArtifactViaShareLink(
  page: Page,
  shareToken: string
): Promise<void> {
  await page.goto(`/a/${shareToken}`);
  // Wait for page to load
  await page.waitForLoadState('networkidle');
}
