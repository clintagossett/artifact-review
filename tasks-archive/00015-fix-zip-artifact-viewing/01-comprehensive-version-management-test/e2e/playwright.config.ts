import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Task 15 E2E Tests
 *
 * These tests validate the REAL backend APIs (not mocks):
 * - Convex mutations/queries via HTTP
 * - HTTP router file serving
 * - Authentication flows
 * - ZIP file upload and processing
 */
export default defineConfig({
  testDir: './',

  // Timeout settings
  timeout: 60000, // 60 seconds per test (ZIP processing can take time)
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  // Test execution
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid database conflicts

  // Reporter
  reporter: [
    ['html', { outputFolder: '../test-results/html' }],
    ['json', { outputFile: '../test-results/results.json' }],
    ['list'],
  ],

  use: {
    // Base URL for API requests
    baseURL: process.env.CONVEX_URL || 'http://localhost:3000',

    // Trace for debugging
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  projects: [
    {
      name: 'API Tests',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Don't start web server - assume Convex dev server is already running
  // User should run: npm run dev (from app/ directory)
});
