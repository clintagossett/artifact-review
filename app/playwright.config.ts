import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for e2e testing
 * See https://playwright.dev/docs/test-configuration
 *
 * IMPORTANT: Before running tests, ensure both servers are running:
 *   cd app && ./scripts/dev.sh
 *
 * Or separately:
 *   npx convex dev (in one terminal)
 *   npm run dev (in another terminal)
 */
export default defineConfig({
  // Tests live in task folders, not app/
  // Override with: npx playwright test --config=playwright.config.ts path/to/tests
  testDir: '../tasks/00010-artifact-upload-creation/tests/e2e',
  // Only run task 10 tests (artifact-upload and upload-validation)
  testMatch: ['artifact-upload.spec.ts', 'upload-validation.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    // Always record for validation videos
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    // Consistent viewport for video output
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Note: Convex dev must be running separately
  // The webServer only starts Next.js
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse - assumes servers are already running
    timeout: 120 * 1000,
  },
});
