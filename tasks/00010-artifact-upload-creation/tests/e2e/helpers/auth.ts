import { Page } from '@playwright/test';

/**
 * Generate a unique email for test isolation
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Generate a valid test password (meets requirements: 8+ chars, contains number and letter)
 */
export function generateTestPassword(): string {
  return 'TestPass123!';
}

/**
 * Register a new user via the UI
 */
export async function registerUser(
  page: Page,
  options?: {
    name?: string;
    email?: string;
    password?: string;
  }
): Promise<{ email: string; password: string; name: string }> {
  const name = options?.name || 'Test User';
  const email = options?.email || generateTestEmail();
  const password = options?.password || generateTestPassword();

  await page.goto('/register');

  // Fill registration form
  await page.fill('#name', name);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });

  return { email, password, name };
}

/**
 * Sign in an existing user via the UI
 */
export async function signIn(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');

  // Fill login form
  await page.fill('#email', email);
  await page.fill('#password', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * Sign out the current user
 */
export async function signOut(page: Page): Promise<void> {
  // Look for sign out button in header dropdown or similar
  // This will need to be adjusted based on actual UI
  const userMenu = page.locator('[data-testid="user-menu"]');
  if (await userMenu.isVisible()) {
    await userMenu.click();
    await page.click('text=Sign out');
    await page.waitForURL('/', { timeout: 5000 });
  }
}
