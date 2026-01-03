import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90000, // ZIP uploads may take longer
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',      // CRITICAL: Enables trace.zip
    video: 'on',      // MANDATORY: Record all tests
    screenshot: 'on',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    cwd: '../../../app',
    timeout: 120000,
  },
});
