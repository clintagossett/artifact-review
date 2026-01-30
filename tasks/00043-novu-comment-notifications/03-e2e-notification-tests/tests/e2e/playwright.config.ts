import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from app/.env.local
dotenv.config({ path: path.resolve(__dirname, '../../../../../app/.env.local') });

/**
 * Get base URL from environment with fallback chain:
 * 1. TEST_BASE_URL - explicit test override
 * 2. https://mark.loc - Use orchestrator proxy for proper Convex connectivity
 *
 * Note: Uses mark.loc through the orchestrator proxy.
 */
const baseURL = process.env.TEST_BASE_URL || 'https://mark.loc';

/**
 * Playwright configuration for notification E2E tests
 * Tests Novu in-app notification delivery and badge updates
 */
export default defineConfig({
  testDir: '.',
  testMatch: ['*.spec.ts'],
  fullyParallel: false, // Run sequentially - multi-user tests need isolated state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for notification tests to avoid race conditions
  reporter: 'html',
  timeout: 120000, // 2 minutes per test for multi-user flows

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

  // No webServer - assume it's running via start-dev-servers.sh
});
