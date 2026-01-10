import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

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
  // Point to the local e2e tests
  testDir: './tests/e2e',
  // Run all spec files
  testMatch: ['*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
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

  // Only start local server if we are testing localhost
  webServer: (process.env.TEST_BASE_URL && process.env.TEST_BASE_URL !== 'http://localhost:3000') ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse - assumes servers are already running
    timeout: 120 * 1000,
  },
});
