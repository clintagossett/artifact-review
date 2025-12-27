import { chromium } from 'playwright';

async function testAuth() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for all console messages
  page.on('console', msg => {
    const type = msg.type();
    console.log(`[BROWSER ${type.toUpperCase()}]:`, msg.text());
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.log('[PAGE ERROR]:', error.message);
  });

  // Go to the page
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('\n=== INITIAL STATE ===');
  const title = await page.title();
  console.log('Page title:', title);

  // Check current state
  const signInButton = await page.locator('button:has-text("Start Using Artifact Review")').count();
  console.log('Sign-in button visible:', signInButton > 0);

  if (signInButton > 0) {
    console.log('\n=== CLICKING SIGN IN ===');
    await page.click('button:has-text("Start Using Artifact Review")');
    console.log('Button clicked, waiting for response...');
    await page.waitForTimeout(5000);

    // Check what's visible now
    const welcomeVisible = await page.locator('text=Welcome to Artifact Review').count();
    const stillOnLanding = await page.locator('button:has-text("Start Using Artifact Review")').count();

    console.log('\n=== AFTER CLICK ===');
    console.log('Welcome message visible:', welcomeVisible > 0);
    console.log('Still on landing page:', stillOnLanding > 0);

    await page.screenshot({ path: 'manual-test-screenshot.png' });
    console.log('Screenshot saved to manual-test-screenshot.png');
  }

  console.log('\n=== Press Ctrl+C to close or waiting 30s ===');
  await page.waitForTimeout(30000);

  await browser.close();
}

testAuth().catch(console.error);
