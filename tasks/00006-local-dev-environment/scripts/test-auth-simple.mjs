import { chromium } from 'playwright';

async function testAuth() {
  const browser = await chromium.launch({ headless: false }); // non-headless to see what's happening
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture network requests
  page.on('request', request => {
    if (request.url().includes('convex')) {
      console.log('→ REQUEST:', request.method(), request.url());
    }
  });

  page.on('response', async response => {
    if (response.url().includes('convex')) {
      console.log('← RESPONSE:', response.status(), response.url());
      try {
        const body = await response.text();
        if (body.length < 500) {
          console.log('   Body:', body);
        } else {
          console.log('   Body (first 200 chars):', body.substring(0, 200));
        }
      } catch (e) {
        console.log('   Could not read body');
      }
    }
  });

  // Capture console
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('[DEBUG]') || msg.text().includes('AUTH')) {
      console.log('  [BROWSER]:', msg.text());
    }
  });

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  console.log('\n=== Clicking sign-in button ===\n');

  const button = await page.getByRole('button', { name: /start using/i });
  await button.click();

  // Wait longer and check multiple times
  for (let i = 1; i <= 10; i++) {
    await page.waitForTimeout(1000);
    const pageText = await page.textContent('body');
    if (pageText.includes('Welcome to Artifact Review') && pageText.includes('User ID')) {
      console.log(`\n✅ Dashboard appeared after ${i} seconds!\n`);
      break;
    }
    if (i === 10) {
      console.log('\n❌ Dashboard never appeared after 10 seconds\n');
    }
  }

  // Check localStorage
  const storage = await page.evaluate(() => {
    return JSON.stringify(localStorage);
  });
  console.log('LocalStorage:', storage.substring(0, 200) + '...');

  // Check the page content
  const pageText = await page.textContent('body');
  console.log('Page contains "Welcome to Artifact Review":', pageText.includes('Welcome to Artifact Review'));
  console.log('Page contains "User ID":', pageText.includes('User ID'));

  await page.screenshot({ path: 'test-screenshot.png' });
  console.log('Screenshot saved to test-screenshot.png');

  await page.waitForTimeout(5000); // Keep browser open briefly

  await browser.close();
}

testAuth().catch(console.error);
