import { chromium } from 'playwright';

async function validateAnonymousAuth() {
  console.log('🚀 Starting anonymous auth validation...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track results
  const results = {
    anonymousAuthWorks: false,
    noConvexErrors: true,
    sessionPersistsAcrossRefresh: false,
    signOutCreatesNewSession: false,
    errors: []
  };

  // Listen for console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    // Log all console messages for debugging
    if (type === 'log' && text.includes('[DEBUG]')) {
      console.log('   Browser log:', text);
    }

    if (type === 'error') {
      console.log('   Browser error:', text);
      if (text.includes('convex') || text.includes('Convex')) {
        results.noConvexErrors = false;
        results.errors.push(text);
      }
    }
  });

  try {
    // Test 1: Anonymous auth works
    console.log('Test 1: Verifying anonymous auth works at localhost:3000');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Should see the landing page with sign-in button
    const signInButton = await page.getByRole('button', { name: /start using artifact review/i });
    if (!signInButton) {
      throw new Error('Sign-in button not found on landing page');
    }
    console.log('✅ Landing page loaded');

    // Click sign in
    await signInButton.click();

    // Wait for dashboard to appear by looking for "Welcome to Artifact Review"
    await page.waitForSelector('text=Welcome to Artifact Review', { timeout: 10000 });
    await page.waitForTimeout(1000); // Extra time for render

    // Should now see dashboard with user info
    await page.screenshot({ path: 'screenshot-after-signin.png' });
    const userIdElement = await page.getByText(/User ID:/i);
    if (!userIdElement) {
      throw new Error('Dashboard not shown after sign-in');
    }
    console.log('✅ Anonymous auth works - dashboard loaded');
    results.anonymousAuthWorks = true;

    // Capture the user ID - use a more robust selector
    const userIdContainer = page.locator('div:has-text("User ID:")').first();
    const userId = await userIdContainer.evaluate(el => {
      const spans = el.querySelectorAll('span');
      return spans[spans.length - 1]?.textContent?.trim() || '';
    });
    console.log(`   User ID: ${userId}`);

    // Verify anonymous status is shown
    const statusElement = await page.getByText(/Anonymous Session/i);
    if (!statusElement) {
      throw new Error('Anonymous session status not shown');
    }
    console.log('✅ Anonymous session status confirmed');

    // Test 2: Check for Convex connection errors
    console.log('\nTest 2: Checking for Convex connection errors');
    if (results.noConvexErrors) {
      console.log('✅ No Convex connection errors detected');
    } else {
      console.log('❌ Convex errors detected:');
      results.errors.forEach(err => console.log(`   - ${err}`));
    }

    // Test 3: Session persists across refresh
    console.log('\nTest 3: Validating session persists across refresh');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should still see dashboard with same user ID
    const userIdContainerAfter = page.locator('div:has-text("User ID:")').first();
    const userIdAfterRefreshValue = await userIdContainerAfter.evaluate(el => {
      const spans = el.querySelectorAll('span');
      return spans[spans.length - 1]?.textContent?.trim() || '';
    });

    if (userId === userIdAfterRefreshValue) {
      console.log('✅ Session persists across refresh');
      console.log(`   User ID still: ${userIdAfterRefreshValue}`);
      results.sessionPersistsAcrossRefresh = true;
    } else {
      console.log('❌ Session did NOT persist');
      console.log(`   Before: ${userId}`);
      console.log(`   After: ${userIdAfterRefreshValue}`);
    }

    // Test 4: Sign out creates new session
    console.log('\nTest 4: Testing sign out creates new session');
    const signOutButton = await page.getByRole('button', { name: /sign out/i });
    await signOutButton.click();
    await page.waitForTimeout(2000);

    // Should be back on landing page
    const signInButtonAgain = await page.getByRole('button', { name: /start using artifact review/i });
    if (!signInButtonAgain) {
      throw new Error('Landing page not shown after sign-out');
    }
    console.log('✅ Sign out returned to landing page');

    // Sign in again
    await signInButtonAgain.click();
    await page.waitForSelector('text=Welcome to Artifact Review', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Get the new user ID
    const newUserIdContainer = page.locator('div:has-text("User ID:")').first();
    const newUserId = await newUserIdContainer.evaluate(el => {
      const spans = el.querySelectorAll('span');
      return spans[spans.length - 1]?.textContent?.trim() || '';
    });

    if (userId !== newUserId) {
      console.log('✅ Sign out created new session');
      console.log(`   Old User ID: ${userId}`);
      console.log(`   New User ID: ${newUserId}`);
      results.signOutCreatesNewSession = true;
    } else {
      console.log('❌ Sign out did NOT create new session (same user ID)');
    }

  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    results.errors.push(error.message);
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Anonymous auth works: ${results.anonymousAuthWorks ? 'PASS' : 'FAIL'}`);
  console.log(`✅ No Convex errors: ${results.noConvexErrors ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Session persists across refresh: ${results.sessionPersistsAcrossRefresh ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Sign out creates new session: ${results.signOutCreatesNewSession ? 'PASS' : 'FAIL'}`);

  const allPassed = results.anonymousAuthWorks &&
                    results.noConvexErrors &&
                    results.sessionPersistsAcrossRefresh &&
                    results.signOutCreatesNewSession;

  console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));

  if (results.errors.length > 0) {
    console.log('\nErrors encountered:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  return allPassed ? 0 : 1;
}

validateAnonymousAuth()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
