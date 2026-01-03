/**
 * Validation script for anonymous authentication flow
 * Tests the requirements from Task 00006 Step 1
 */

const { chromium } = require('playwright');

async function validateAnonymousAuth() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n=== Anonymous Auth Validation ===\n');

  try {
    // Test 1: Visit the app
    console.log('✓ Test 1: Loading http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Capture console logs for debugging
    page.on('console', msg => console.log(`  [BROWSER ${msg.type()}]: ${msg.text()}`));

    // Wait a bit for React hydration
    await page.waitForTimeout(1000);

    // Debug: Take screenshot and print page content
    await page.screenshot({ path: 'debug-landing.png' });
    const pageContent = await page.content();
    console.log('  Page title:', await page.title());

    // Check for landing page elements with explicit waits
    console.log('  Looking for landing page elements...');

    try {
      await page.waitForSelector('text=Artifact Review', { timeout: 5000 });
      console.log('  ✓ Found "Artifact Review" title');
    } catch (e) {
      console.log('  ✗ Could not find "Artifact Review" title');
      console.log('  Page HTML preview:', pageContent.substring(0, 500));
      throw new Error('Title not found');
    }

    const button = await page.locator('button:has-text("Start Using Artifact Review")');

    try {
      await button.waitFor({ state: 'visible', timeout: 5000 });
      console.log('  ✓ Found "Start Using Artifact Review" button');
      console.log('  ✓ Landing page loaded correctly');
    } catch (e) {
      console.log('  ✗ Could not find button');
      await page.screenshot({ path: 'debug-no-button.png' });
      throw new Error('Button not found');
    }

    // Test 2: Check for console errors before signin
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Test 3: Click "Start Using Artifact Review" button
    console.log('\n✓ Test 2: Clicking "Start Using Artifact Review" button...');
    await button.click();

    // Wait for authentication to complete (dashboard to appear)
    console.log('  Waiting for authentication to complete...');
    await page.waitForSelector('text=Welcome to Artifact Review', { timeout: 15000 });
    console.log('  ✓ Dashboard appeared after authentication');

    // Verify user session details are shown
    const userId = await page.locator('text=User ID:').isVisible();
    const status = await page.locator('text=Anonymous Session').isVisible();

    if (userId && status) {
      console.log('  ✓ User session details displayed correctly');
    } else {
      console.log('  ✗ User session details not found');
      throw new Error('Session details validation failed');
    }

    // Get the user ID for later comparison
    const userIdElement = await page.locator('text=User ID:').locator('..').locator('span').last();
    const originalUserId = await userIdElement.textContent();
    console.log(`  ✓ User ID: ${originalUserId}`);

    // Test 4: Check for console errors after signin
    console.log('\n✓ Test 3: Checking for console errors...');
    if (consoleErrors.length === 0) {
      console.log('  ✓ No console errors detected');
    } else {
      console.log('  ✗ Console errors found:');
      consoleErrors.forEach(err => console.log(`    - ${err}`));
    }

    // Test 5: Session persistence - refresh the page
    console.log('\n✓ Test 4: Testing session persistence (page refresh)...');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if we're still on dashboard (not back to landing)
    const stillOnDashboard = await page.locator('text=Welcome to Artifact Review').isVisible();
    if (stillOnDashboard) {
      console.log('  ✓ Session persisted across page refresh');

      // Verify it's the same user ID
      const currentUserIdElement = await page.locator('text=User ID:').locator('..').locator('span').last();
      const currentUserId = await currentUserIdElement.textContent();

      if (currentUserId === originalUserId) {
        console.log(`  ✓ Same user ID after refresh: ${currentUserId}`);
      } else {
        console.log(`  ✗ User ID changed! Before: ${originalUserId}, After: ${currentUserId}`);
        throw new Error('User ID changed after refresh');
      }
    } else {
      console.log('  ✗ Session did not persist (back to landing page)');
      throw new Error('Session persistence failed');
    }

    // Test 6: Sign out and create new session
    console.log('\n✓ Test 5: Testing sign out and new session creation...');
    const signOutButton = await page.locator('button:has-text("Sign Out")');
    await signOutButton.click();

    // Should be back to landing page
    await page.waitForSelector('text=Start Using Artifact Review', { timeout: 5000 });
    console.log('  ✓ Signed out successfully (back to landing page)');

    // Try signing in again
    const newSignInButton = await page.locator('button:has-text("Start Using Artifact Review")');
    await newSignInButton.click();
    await page.waitForSelector('text=Welcome to Artifact Review', { timeout: 10000 });
    console.log('  ✓ New anonymous session created successfully');

    // Verify new user ID is different
    const newUserIdElement = await page.locator('text=User ID:').locator('..').locator('span').last();
    const newUserId = await newUserIdElement.textContent();

    if (newUserId !== originalUserId) {
      console.log(`  ✓ New user ID created: ${newUserId}`);
    } else {
      console.log(`  ⚠ Warning: Same user ID after sign out/sign in: ${newUserId}`);
    }

    console.log('\n=== ✓ All Validation Tests Passed! ===\n');

    // Keep browser open for manual inspection
    console.log('Browser will remain open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n✗ Validation failed:', error.message);
    console.log('\nBrowser will remain open for 30 seconds for debugging...');
    await page.waitForTimeout(30000);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run validation
validateAnonymousAuth()
  .then(() => {
    console.log('\n✓ Validation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Validation failed');
    process.exit(1);
  });
