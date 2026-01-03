/**
 * E2E Test: Artifact Settings - Details Tab
 *
 * Tests the backend functionality for updating artifact name and description
 * through the Settings panel Details tab.
 *
 * Task 00022: Hook Up Artifact Settings Details Tab to Backend
 */

import { test, expect, Page } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createZipArtifact, verifyArtifactContentVisible } from './helpers/artifacts';
import * as path from 'path';

// Absolute path to samples directory
const SAMPLES_DIR = '/Users/clintgossett/Documents/personal/personal projects/artifact-review/samples';

// Inline click indicator helper (simplified version for this test)
async function injectClickIndicator(page: Page): Promise<void> {
  try {
    await page.addStyleTag({
      content: `
        .playwright-cursor {
          position: fixed;
          pointer-events: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255, 0, 0, 0.8);
          border: 2px solid white;
          transform: translate(-50%, -50%);
          z-index: 999998;
        }
      `,
    });
  } catch {
    // Page may have closed
  }
}

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

test.describe('Artifact Settings - Details Tab', () => {
  test.setTimeout(120000); // ZIP uploads may take longer

  test('should create artifact with name and display in dashboard', async ({ page }) => {
    // 1. Register a new user
    const { email } = await registerUser(page);
    console.log('Registered user:', email);

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/dashboard');

    // 2. Upload ZIP file from central samples
    const zipPath = path.join(SAMPLES_DIR, '01-valid/zip/charting/v1.zip');

    const testTitle = `Dashboard v1 - ${Date.now()}`;
    const { shareToken, title } = await createZipArtifact(page, {
      title: testTitle,
      description: 'Testing artifact creation with name field',
      zipFilePath: zipPath,
    });

    console.log('Created artifact with shareToken:', shareToken);
    expect(shareToken).toBeTruthy();
    expect(shareToken.length).toBe(8);

    // 3. Verify we're on the artifact page
    await expect(page).toHaveURL(new RegExp(`/a/${shareToken}`));

    // 4. Navigate back to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 5. Verify artifact appears in the list with correct name
    await expect(page.locator(`text=${testTitle}`)).toBeVisible({ timeout: 5000 });
  });

  test('should update artifact name via Settings panel', async ({ page }) => {
    // 1. Register and create artifact
    await registerUser(page);
    const zipPath = path.join(SAMPLES_DIR, '01-valid/zip/charting/v1.zip');

    const originalName = `Original Name - ${Date.now()}`;
    const { shareToken } = await createZipArtifact(page, {
      title: originalName,
      zipFilePath: zipPath,
    });

    // 2. Open Settings panel
    // Look for Settings button/icon (might be in header or toolbar)
    const settingsButton = page.locator(
      'button:has-text("Settings"), button[aria-label="Settings"], [data-testid="settings-button"]'
    ).first();
    await settingsButton.click();

    // Wait for Settings panel/dialog to open
    await expect(
      page.locator('[role="dialog"]:has-text("Settings"), .settings-panel')
    ).toBeVisible({ timeout: 5000 });

    // 3. Navigate to Details tab if not already there
    const detailsTab = page.locator('button:has-text("Details"), [role="tab"]:has-text("Details")');
    if (await detailsTab.isVisible()) {
      await detailsTab.click();
    }

    // 4. Update the name
    const newName = `Updated Name - ${Date.now()}`;
    const nameInput = page.locator('input[name="name"], input#name, input[placeholder*="name" i]');
    await nameInput.clear();
    await nameInput.fill(newName);

    // 5. Save changes
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();

    // Wait for success (toast notification or dialog close)
    // Try to wait for either a success toast or the dialog to close
    try {
      await expect(
        page.locator('text=/saved|updated|success/i').first()
      ).toBeVisible({ timeout: 3000 });
    } catch {
      // If no toast, check if dialog closed
      await expect(
        page.locator('[role="dialog"]:has-text("Settings")')
      ).toBeHidden({ timeout: 3000 });
    }

    // 6. Verify the name updated in the UI
    // Either in the page title or artifact header
    await expect(
      page.locator(`text=${newName}`).first()
    ).toBeVisible({ timeout: 5000 });

    // 7. Verify it persists - navigate away and back
    await page.goto('/dashboard');
    await page.goto(`/a/${shareToken}`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator(`text=${newName}`).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should update artifact description via Settings panel', async ({ page }) => {
    // 1. Register and create artifact
    await registerUser(page);
    const zipPath = path.join(SAMPLES_DIR, '01-valid/zip/charting/v1.zip');

    const { shareToken } = await createZipArtifact(page, {
      title: `Description Test - ${Date.now()}`,
      description: 'Original description',
      zipFilePath: zipPath,
    });

    // 2. Open Settings panel
    const settingsButton = page.locator(
      'button:has-text("Settings"), button[aria-label="Settings"], [data-testid="settings-button"]'
    ).first();
    await settingsButton.click();

    await expect(
      page.locator('[role="dialog"]:has-text("Settings"), .settings-panel')
    ).toBeVisible({ timeout: 5000 });

    // 3. Navigate to Details tab if needed
    const detailsTab = page.locator('button:has-text("Details"), [role="tab"]:has-text("Details")');
    if (await detailsTab.isVisible()) {
      await detailsTab.click();
    }

    // 4. Update the description
    const newDescription = 'Updated description with new content';
    const descInput = page.locator('textarea[name="description"], textarea#description, textarea[placeholder*="description" i]');
    await descInput.clear();
    await descInput.fill(newDescription);

    // 5. Save changes
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();

    // Wait for success
    try {
      await expect(
        page.locator('text=/saved|updated|success/i').first()
      ).toBeVisible({ timeout: 3000 });
    } catch {
      await expect(
        page.locator('[role="dialog"]:has-text("Settings")')
      ).toBeHidden({ timeout: 3000 });
    }

    // 6. Verify the description updated
    // Re-open settings to check the value persisted
    await settingsButton.click();
    await expect(
      page.locator('[role="dialog"]:has-text("Settings")')
    ).toBeVisible({ timeout: 5000 });

    const detailsTab2 = page.locator('button:has-text("Details"), [role="tab"]:has-text("Details")');
    if (await detailsTab2.isVisible()) {
      await detailsTab2.click();
    }

    const descInputCheck = page.locator('textarea[name="description"], textarea#description');
    await expect(descInputCheck).toHaveValue(newDescription);
  });

  test('should show validation error for empty name', async ({ page }) => {
    // 1. Register and create artifact
    await registerUser(page);
    const zipPath = path.join(SAMPLES_DIR, '01-valid/zip/charting/v1.zip');

    await createZipArtifact(page, {
      title: `Validation Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    // 2. Open Settings panel
    const settingsButton = page.locator(
      'button:has-text("Settings"), button[aria-label="Settings"], [data-testid="settings-button"]'
    ).first();
    await settingsButton.click();

    await expect(
      page.locator('[role="dialog"]:has-text("Settings")')
    ).toBeVisible({ timeout: 5000 });

    // 3. Navigate to Details tab
    const detailsTab = page.locator('button:has-text("Details"), [role="tab"]:has-text("Details")');
    if (await detailsTab.isVisible()) {
      await detailsTab.click();
    }

    // 4. Clear the name field (make it empty)
    const nameInput = page.locator('input[name="name"], input#name');
    await nameInput.clear();

    // 5. Try to save
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();

    // 6. Expect validation error
    await expect(
      page.locator('text=/name.*required|name.*empty|cannot be empty/i').first()
    ).toBeVisible({ timeout: 3000 });
  });

  test('should show validation error for name exceeding 100 characters', async ({ page }) => {
    // 1. Register and create artifact
    await registerUser(page);
    const zipPath = path.join(SAMPLES_DIR, '01-valid/zip/charting/v1.zip');

    await createZipArtifact(page, {
      title: `Long Name Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    // 2. Open Settings panel
    const settingsButton = page.locator(
      'button:has-text("Settings"), button[aria-label="Settings"], [data-testid="settings-button"]'
    ).first();
    await settingsButton.click();

    await expect(
      page.locator('[role="dialog"]:has-text("Settings")')
    ).toBeVisible({ timeout: 5000 });

    // 3. Navigate to Details tab
    const detailsTab = page.locator('button:has-text("Details"), [role="tab"]:has-text("Details")');
    if (await detailsTab.isVisible()) {
      await detailsTab.click();
    }

    // 4. Enter a name that's too long (>100 chars)
    const tooLongName = 'A'.repeat(101);
    const nameInput = page.locator('input[name="name"], input#name');
    await nameInput.clear();
    await nameInput.fill(tooLongName);

    // 5. Try to save
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();

    // 6. Expect validation error
    await expect(
      page.locator('text=/name.*long|max.*100|100.*character/i').first()
    ).toBeVisible({ timeout: 3000 });
  });

  test('should show validation error for description exceeding 500 characters', async ({ page }) => {
    // 1. Register and create artifact
    await registerUser(page);
    const zipPath = path.join(SAMPLES_DIR, '01-valid/zip/charting/v1.zip');

    await createZipArtifact(page, {
      title: `Long Description Test - ${Date.now()}`,
      zipFilePath: zipPath,
    });

    // 2. Open Settings panel
    const settingsButton = page.locator(
      'button:has-text("Settings"), button[aria-label="Settings"], [data-testid="settings-button"]'
    ).first();
    await settingsButton.click();

    await expect(
      page.locator('[role="dialog"]:has-text("Settings")')
    ).toBeVisible({ timeout: 5000 });

    // 3. Navigate to Details tab
    const detailsTab = page.locator('button:has-text("Details"), [role="tab"]:has-text("Details")');
    if (await detailsTab.isVisible()) {
      await detailsTab.click();
    }

    // 4. Enter a description that's too long (>500 chars)
    const tooLongDescription = 'A'.repeat(501);
    const descInput = page.locator('textarea[name="description"], textarea#description');
    await descInput.clear();
    await descInput.fill(tooLongDescription);

    // 5. Try to save
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();

    // 6. Expect validation error
    await expect(
      page.locator('text=/description.*long|max.*500|500.*character/i').first()
    ).toBeVisible({ timeout: 3000 });
  });

  test('should verify getDetailsForSettings returns correct data', async ({ page }) => {
    // 1. Register and create artifact
    const { email } = await registerUser(page);
    const zipPath = path.join(SAMPLES_DIR, '01-valid/zip/charting/v1.zip');

    const testTitle = `Details Query Test - ${Date.now()}`;
    const testDescription = 'Test description for details query';
    const { shareToken } = await createZipArtifact(page, {
      title: testTitle,
      description: testDescription,
      zipFilePath: zipPath,
    });

    // 2. Open Settings panel to view details
    const settingsButton = page.locator(
      'button:has-text("Settings"), button[aria-label="Settings"], [data-testid="settings-button"]'
    ).first();
    await settingsButton.click();

    await expect(
      page.locator('[role="dialog"]:has-text("Settings")')
    ).toBeVisible({ timeout: 5000 });

    // 3. Navigate to Details tab
    const detailsTab = page.locator('button:has-text("Details"), [role="tab"]:has-text("Details")');
    if (await detailsTab.isVisible()) {
      await detailsTab.click();
    }

    // 4. Verify enriched data is displayed
    // Creator email should be shown
    await expect(page.locator(`text=${email}`).first()).toBeVisible({ timeout: 5000 });

    // Version count should be 1 (we just created the artifact)
    await expect(
      page.locator('text=/1.*version|version.*1/i').first()
    ).toBeVisible({ timeout: 5000 });

    // File size should be displayed (not 0)
    // The charting v1.zip is about 4KB
    await expect(
      page.locator('text=/[0-9]+.*KB|[0-9]+.*bytes/i').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should allow clearing description with empty string', async ({ page }) => {
    // 1. Register and create artifact with description
    await registerUser(page);
    const zipPath = path.join(SAMPLES_DIR, '01-valid/zip/charting/v1.zip');

    await createZipArtifact(page, {
      title: `Clear Description Test - ${Date.now()}`,
      description: 'This description will be cleared',
      zipFilePath: zipPath,
    });

    // 2. Open Settings panel
    const settingsButton = page.locator(
      'button:has-text("Settings"), button[aria-label="Settings"], [data-testid="settings-button"]'
    ).first();
    await settingsButton.click();

    await expect(
      page.locator('[role="dialog"]:has-text("Settings")')
    ).toBeVisible({ timeout: 5000 });

    // 3. Navigate to Details tab
    const detailsTab = page.locator('button:has-text("Details"), [role="tab"]:has-text("Details")');
    if (await detailsTab.isVisible()) {
      await detailsTab.click();
    }

    // 4. Clear the description
    const descInput = page.locator('textarea[name="description"], textarea#description');
    await descInput.clear();

    // 5. Save changes
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();

    // Wait for success
    try {
      await expect(
        page.locator('text=/saved|updated|success/i').first()
      ).toBeVisible({ timeout: 3000 });
    } catch {
      await expect(
        page.locator('[role="dialog"]:has-text("Settings")')
      ).toBeHidden({ timeout: 3000 });
    }

    // 6. Re-open settings and verify description is empty
    await settingsButton.click();
    await expect(
      page.locator('[role="dialog"]:has-text("Settings")')
    ).toBeVisible({ timeout: 5000 });

    const detailsTab2 = page.locator('button:has-text("Details"), [role="tab"]:has-text("Details")');
    if (await detailsTab2.isVisible()) {
      await detailsTab2.click();
    }

    const descInputCheck = page.locator('textarea[name="description"], textarea#description');
    await expect(descInputCheck).toHaveValue('');
  });
});
