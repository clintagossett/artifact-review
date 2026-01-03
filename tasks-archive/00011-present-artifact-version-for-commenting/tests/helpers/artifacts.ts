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
 *
 * This helper ensures:
 * 1. User is authenticated (call registerUser first)
 * 2. Artifact is fully created and committed to Convex
 * 3. Artifact is accessible before returning
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
    await page.waitForLoadState('networkidle');
  }

  // Click "New Artifact" or "Upload" button
  // Try multiple selectors that might match
  const newArtifactButton = page.locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")').first();
  await expect(newArtifactButton).toBeVisible({ timeout: 10000 });
  await newArtifactButton.click();

  // Wait for dialog to open
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });

  // Upload file via file input
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: 'text/html',
    buffer: Buffer.from(htmlContent),
  });

  // Wait for file to be processed
  await expect(page.locator(`text=${fileName}`)).toBeVisible({ timeout: 10000 });

  // Fill in title (might be auto-filled from filename)
  const titleInput = page.locator('#project-name');
  await titleInput.clear();
  await titleInput.fill(title);

  // Fill in description if provided
  if (description) {
    const descInput = page.locator('#description');
    if (await descInput.isVisible()) {
      await descInput.fill(description);
    }
  }

  // Submit the form
  const submitButton = page.locator('button:has-text("Create Project")');
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  await submitButton.click();

  // Wait for the dialog to close (indicates success)
  // The dialog closes after successful creation
  await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 20000 });

  // Critical: Wait for network to be idle to ensure Convex mutations complete
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // Now wait for navigation to the artifact page OR verify artifact appears in dashboard
  let shareToken = '';

  try {
    // Option 1: We're redirected to the artifact viewer
    await page.waitForURL(/\/a\/[a-zA-Z0-9]+/, { timeout: 10000 });
    const url = page.url();
    shareToken = url.split('/a/')[1]?.split('/')[0]?.split('?')[0] || '';
  } catch {
    // Option 2: We stay on dashboard - look for the artifact in the list
    await page.waitForURL('/dashboard', { timeout: 5000 });

    // Find the artifact card and get its share link
    const artifactCard = page.locator(`text=${title}`).first();
    await expect(artifactCard).toBeVisible({ timeout: 10000 });

    // Click on the artifact to navigate to it
    await artifactCard.click();
    await page.waitForURL(/\/a\/[a-zA-Z0-9]+/, { timeout: 15000 });

    const url = page.url();
    shareToken = url.split('/a/')[1]?.split('/')[0]?.split('?')[0] || '';
  }

  if (!shareToken) {
    throw new Error('Failed to extract share token from URL');
  }

  // CRITICAL: Verify the artifact is actually accessible before returning
  // This prevents race conditions where the test navigates before Convex commits the data
  await verifyArtifactAccessible(page, shareToken);

  return { shareToken, title };
}

/**
 * Verify an artifact is accessible via its share token
 * This ensures the artifact exists in Convex before proceeding with tests
 */
async function verifyArtifactAccessible(
  page: Page,
  shareToken: string,
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Navigate to artifact viewer
      await page.goto(`/a/${shareToken}`);

      // Wait for either:
      // 1. Content to load (iframe visible)
      // 2. Error message (404)
      const result = await Promise.race([
        page.locator('iframe[title="Artifact Viewer"]').waitFor({ timeout: 8000 }),
        page.locator('text=/not found/i').waitFor({ timeout: 8000 }),
        page.locator('text=/404/').waitFor({ timeout: 8000 }),
      ]).then(() => 'loaded').catch(() => 'timeout');

      if (result === 'loaded') {
        // Check if we see an error message
        const hasError = await page.locator('text=/not found/i, text=/404/').count() > 0;
        if (!hasError) {
          // Success! Artifact is accessible
          return;
        }
      }

      // If we're here, artifact didn't load - wait and retry
      if (attempt < maxRetries) {
        console.log(`Artifact not yet accessible (attempt ${attempt}/${maxRetries}), retrying...`);
        await page.waitForTimeout(2000);
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Artifact ${shareToken} not accessible after ${maxRetries} attempts: ${error}`);
      }
      await page.waitForTimeout(2000);
    }
  }

  throw new Error(`Artifact ${shareToken} not accessible after ${maxRetries} attempts`);
}

/**
 * Verify an artifact is visible in the dashboard list
 */
export async function verifyArtifactInList(
  page: Page,
  title: string
): Promise<void> {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 10000 });
}

/**
 * Access an artifact via its share link (without authentication)
 * This helper can be used to test public access
 */
export async function accessArtifactViaShareLink(
  page: Page,
  shareToken: string
): Promise<void> {
  await page.goto(`/a/${shareToken}`);
  // Wait for page to load
  await page.waitForLoadState('networkidle', { timeout: 15000 });
}
