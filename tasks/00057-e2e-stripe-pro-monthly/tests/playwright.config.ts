import { defineConfig } from '@playwright/test';
import baseConfig from '../../../app/playwright.config';

/**
 * Task-level Playwright config for Issue #57: E2E Stripe Pro Monthly
 *
 * Inherits from app/playwright.config.ts and overrides:
 * - testDir: points to this task's e2e folder
 * - outputDir: keeps videos/traces in task folder
 */
export default defineConfig({
    ...baseConfig,
    testDir: './e2e',
    outputDir: './validation-videos',
});
