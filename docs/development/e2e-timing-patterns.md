# E2E Timing Patterns

Common patterns for fixing E2E test timing issues in Playwright.

## Philosophy

- **Wait for the right thing** - Don't add arbitrary delays
- **Be specific** - Wait for the exact element/state you need
- **Increase timeouts for slow operations** - File uploads, API calls, etc.

## Fix Patterns

### 1. Wait for Element Before Interaction

**Problem:** `locator.fill: Timeout` or `locator.click: Timeout`

```typescript
// BEFORE (fails)
await page.goto('/register');
await page.getByLabel('Email').fill('test@example.com');

// AFTER (works)
await page.goto('/register');
await page.waitForSelector('label:has-text("Email")', { timeout: 30000 });
await page.getByLabel('Email').fill('test@example.com');
```

### 2. Wait for Modal/Dialog

**Problem:** Modal not appearing, `getByRole('dialog')` fails

```typescript
// BEFORE (fails)
await page.getByRole('button', { name: 'Upload' }).click();
await page.locator('input[type="file"]').setInputFiles(file);

// AFTER (works)
await page.getByRole('button', { name: 'Upload' }).click();
await page.waitForSelector('text=Create New Artifact', { timeout: 10000 });
await page.locator('input[type="file"]').setInputFiles(file);
```

### 3. Wait for Navigation After Action

**Problem:** `page.waitForURL: Timeout` after form submit

```typescript
// BEFORE (fails)
await page.getByRole('button', { name: 'Submit' }).click();
expect(page.url()).toContain('/dashboard');

// AFTER (works)
await page.getByRole('button', { name: 'Submit' }).click();
await page.waitForLoadState('networkidle');
await page.waitForURL(/\/dashboard/, { timeout: 60000 });
expect(page.url()).toContain('/dashboard');
```

### 4. Wait for Async Data Load

**Problem:** Content not appearing, data-dependent assertions fail

```typescript
// BEFORE (fails)
await page.goto('/artifacts');
expect(await page.locator('.artifact-card').count()).toBeGreaterThan(0);

// AFTER (works)
await page.goto('/artifacts');
await page.waitForSelector('.artifact-card', { timeout: 30000 });
expect(await page.locator('.artifact-card').count()).toBeGreaterThan(0);
```

### 5. Increase Timeout for Slow Operations

**Problem:** File upload, processing, or heavy operations timeout

```typescript
// For file uploads - use longer timeout
await page.locator('input[type="file"]').setInputFiles(file);
await page.waitForSelector('text=Upload complete', { timeout: 120000 });

// For navigation after heavy operation
await page.waitForURL(/\/a\//, { timeout: 60000 });
```

### 6. Handle Loading States

**Problem:** Button disabled during load, can't click

```typescript
// BEFORE (fails)
await page.getByRole('button', { name: 'Save' }).click();

// AFTER (works)
const saveButton = page.getByRole('button', { name: 'Save' });
await saveButton.waitFor({ state: 'visible' });
await expect(saveButton).toBeEnabled({ timeout: 10000 });
await saveButton.click();
```

### 7. Wait for Network Idle

**Problem:** Actions fire before API calls complete

```typescript
// After any action that triggers API calls
await page.getByRole('button', { name: 'Refresh' }).click();
await page.waitForLoadState('networkidle');
// Now safe to assert on updated data
```

### 8. Handle Toast/Notification Timing

**Problem:** Toast appears and disappears before assertion

```typescript
// Wait for toast to appear
await expect(page.getByRole('status')).toBeVisible({ timeout: 10000 });
// Or wait for specific text
await page.waitForSelector('text=Successfully saved', { timeout: 10000 });
```

## Helper Functions

If multiple tests need the same fix, create a helper:

```typescript
// tests/e2e/helpers.ts

import { Page } from '@playwright/test';

export async function waitForFormReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('form', { state: 'visible' });
}

export async function waitForModalOpen(page: Page, titleText: string) {
  await page.waitForSelector(`text=${titleText}`, { timeout: 10000 });
  await page.waitForSelector('[role="dialog"]', { state: 'visible' });
}

export async function uploadArtifactWithWaits(page: Page, filePath: string) {
  await page.getByRole('button', { name: 'Upload' }).click();
  await page.waitForSelector('text=Create New Artifact', { timeout: 10000 });
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await page.getByRole('button', { name: 'Create' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForURL(/\/a\//, { timeout: 60000 });
}

export async function clickAndWaitForNavigation(
  page: Page,
  selector: string,
  urlPattern: RegExp
) {
  await page.click(selector);
  await page.waitForLoadState('networkidle');
  await page.waitForURL(urlPattern, { timeout: 60000 });
}
```

## Anti-Patterns

```typescript
// DON'T: Arbitrary sleep
await page.waitForTimeout(5000); // Bad - wastes time, still might fail

// DO: Wait for specific condition
await page.waitForSelector('.loaded-indicator');

// DON'T: Catch and retry blindly
try { await click(); } catch { await click(); } // Bad - hides real issues

// DO: Proper wait then single action
await element.waitFor({ state: 'visible' });
await element.click();
```

## Common Files to Check

Based on typical patterns in this codebase:

| File | Common Issues |
|------|---------------|
| `tests/e2e/smoke-integrations.spec.ts` | Upload flows, modal timing |
| `tests/e2e/auth.spec.ts` | Registration/login navigation |
| `tests/e2e/notification.spec.ts` | Async notification delivery |
| `tests/e2e/artifact.spec.ts` | File upload, processing time |
