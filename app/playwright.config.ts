import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * Get base URL from environment with fallback chain:
 * 1. TEST_BASE_URL - explicit test override
 * 2. SITE_URL - configured site URL (e.g., http://mark.loc, https://staging.example.com)
 * 3. localhost:3000 - CI/fallback default
 */
const baseURL = process.env.TEST_BASE_URL || process.env.SITE_URL || 'http://localhost:3000';

/**
 * Playwright configuration for e2e testing
 * See https://playwright.dev/docs/test-configuration
 *
 * Environment-driven configuration - works across:
 * - Local dev with DNS routing (SITE_URL=http://{agent}.loc)
 * - CI environments (defaults to localhost:3000)
 * - Preview/staging deployments (SITE_URL from deployment)
 * - Production (SITE_URL from deployment)
 *
 * Required env vars in .env.local:
 *   SITE_URL        - Base app URL (e.g., http://mark.loc)
 *   MAILPIT_API_URL - Mailpit API for email testing (optional, local only)
 *   NOVU_API_URL    - Novu API for notifications (optional)
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL,
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start server only if not already running
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
