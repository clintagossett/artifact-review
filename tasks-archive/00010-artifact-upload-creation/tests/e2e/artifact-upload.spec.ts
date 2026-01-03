import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createTestArtifact, verifyArtifactInList } from './helpers/artifacts';
import { injectClickIndicator } from '../../../../app/tests/utils/clickIndicator';

// Inject click indicator after each navigation for validation videos
test.beforeEach(async ({ page }) => {
  page.on('load', async () => {
    try {
      await injectClickIndicator(page);
    } catch {
      // Page may have closed
    }
  });
});

test.describe('Artifact Upload Flow', () => {
  // Increase timeout for this comprehensive test
  test.setTimeout(60000);

  test('complete flow: register, upload artifact, view in list, access via share link', async ({ page }) => {
    // 1. Register a new user
    const { email } = await registerUser(page);

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/dashboard');

    // 2. Verify empty state is shown for new user
    await expect(page.locator('text=/No artifacts/i').or(page.locator('text=/Create your first/i'))).toBeVisible();

    // 3. Create a new artifact
    const testTitle = `Test Artifact ${Date.now()}`;
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>${testTitle}</title></head>
        <body>
          <h1>${testTitle}</h1>
          <p>This is test content created at ${new Date().toISOString()}</p>
        </body>
      </html>
    `;

    const { shareToken, title } = await createTestArtifact(page, {
      title: testTitle,
      htmlContent: testHtml,
    });

    expect(shareToken).toBeTruthy();
    expect(shareToken.length).toBe(8);

    // 4. Verify artifact page loads
    await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 5000 });

    // 5. Go back to dashboard and verify artifact appears in list
    await page.goto('/dashboard');
    await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 5000 });

    // 6. Test share link works (same session - verifies public URL works)
    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    // Verify the artifact title is visible via share link
    await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('auto-suggest title from filename', async ({ page }) => {
    // Register and go to dashboard
    await registerUser(page);
    await expect(page).toHaveURL('/dashboard');

    // Open new artifact dialog
    const newButton = page.locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Create")').first();
    await newButton.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Upload file with descriptive name
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'my-awesome-landing-page.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<html><body>Test</body></html>'),
    });

    // Verify title was auto-suggested
    const titleInput = page.locator('#project-name');
    await expect(titleInput).toHaveValue('My Awesome Landing Page');
  });

  test('can upload markdown file', async ({ page }) => {
    await registerUser(page);

    const markdownContent = `# Test Markdown

This is a **test** markdown file.

- Item 1
- Item 2
- Item 3

\`\`\`javascript
console.log('Hello World');
\`\`\`
`;

    const { shareToken } = await createTestArtifact(page, {
      title: 'Markdown Test',
      htmlContent: markdownContent, // Will be used as content
      fileName: 'test.md',
    });

    expect(shareToken).toBeTruthy();
  });
});

test.describe('Empty State', () => {
  test('shows empty state for new user with no artifacts', async ({ page }) => {
    await registerUser(page);
    await expect(page).toHaveURL('/dashboard');

    // Should show empty state
    const emptyState = page.locator('text=/No artifacts/i').or(page.locator('text=/Create your first/i'));
    await expect(emptyState).toBeVisible();
  });

  test('empty state CTA opens new artifact dialog', async ({ page }) => {
    await registerUser(page);
    await expect(page).toHaveURL('/dashboard');

    // Click CTA in empty state
    const ctaButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Upload")').first();
    await ctaButton.click();

    // Dialog should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=/Create New Artifact/i')).toBeVisible();
  });
});
