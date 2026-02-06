import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from both .env.local and .env.nextjs.local
// This includes NODE_EXTRA_CA_CERTS for mkcert certificate trust
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env.nextjs.local') });

/**
 * HTTPS/TLS Certificate Trust for Local Development
 *
 * Local dev uses HTTPS with mkcert certificates. For Node.js to trust these:
 * 1. Set NODE_EXTRA_CA_CERTS in .env.nextjs.local:
 *    NODE_EXTRA_CA_CERTS=/home/YOUR_USERNAME/.local/share/mkcert/rootCA.pem
 * 2. Or set it in your shell: export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
 * 3. Find your path with: mkcert -CAROOT
 *
 * The npm scripts (test:e2e, test:e2e:ui, test:e2e:headed) auto-detect mkcert
 * if NODE_EXTRA_CA_CERTS is not already set.
 */

/**
 * Get base URL from environment with fallback chain:
 * 1. TEST_BASE_URL - explicit test override
 * 2. SITE_URL - configured site URL (e.g., https://james.loc)
 * 3. localhost:3000 - CI/fallback default
 */
const baseURL = process.env.TEST_BASE_URL || process.env.SITE_URL || 'http://localhost:3000';

/**
 * Health check URL for webServer - uses HTTP since Playwright's health check
 * doesn't support ignoreHTTPSErrors. The orchestrator proxy serves both HTTP and HTTPS.
 */
const healthCheckURL = baseURL.replace('https://', 'http://');

/**
 * Playwright configuration for e2e testing
 * See https://playwright.dev/docs/test-configuration
 *
 * Environment-driven configuration - works across:
 * - Local dev with DNS routing (SITE_URL=https://{agent}.loc)
 * - CI environments (defaults to localhost:3000)
 * - Preview/staging deployments (SITE_URL from deployment)
 * - Production (SITE_URL from deployment)
 *
 * Required env vars in .env.local:
 *   SITE_URL        - Base app URL (e.g., https://mark.loc)
 *   MAILPIT_API_URL - Mailpit API for email testing (optional, local only)
 *   NOVU_API_URL    - Novu API for notifications (optional)
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Use 1 worker to avoid trace file race conditions
  reporter: 'html',

  // Keep all test artifacts (videos, traces, screenshots) even on success
  // Humans can review these to see what was built/tested
  outputDir: './test-results',
  preserveOutput: 'always',

  use: {
    baseURL,
    // Always record - not just on failure
    // Videos: ./test-results/{test-name}/video.webm
    // Traces: ./test-results/{test-name}/trace.zip (open with `npx playwright show-trace`)
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'on',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start server only if not already running
  // Uses HTTP health check URL since Playwright's webServer check doesn't support ignoreHTTPSErrors
  webServer: {
    command: 'npm run dev',
    url: healthCheckURL,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
