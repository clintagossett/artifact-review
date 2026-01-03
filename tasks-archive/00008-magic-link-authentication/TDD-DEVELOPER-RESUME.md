# TDD Developer Agent Resume: Complete E2E Testing with Email Retrieval

## Context

You previously completed Task 8 (Magic Link Authentication) with:
- ✅ 10/10 unit tests passing
- ✅ 5/5 basic E2E tests passing
- ⏳ 2 Resend API integration tests skipped (couldn't send emails)

**What changed:** Domain setup is now complete! We can now send and retrieve emails programmatically.

---

## Current Status

### Domain Configuration
- **Test Domain:** `artifactreview-early.xyz` (disposable, purchased on Porkbun)
- **Email Domain:** `mail.artifactreview-early.xyz` (configured in Resend)
- **From Address:** `hello@mail.artifactreview-early.xyz`
- **Test Inbox:** `<anything>@tolauante.resend.app` (Resend's test inbox)

### DNS & Verification
- DNS records added to Porkbun via API
- Domain verification status: **Check background task b3e000f for status**
  - Use `TaskOutput` tool with `task_id: "b3e000f"` to check if domain is verified
  - Domain must show status `verified` before proceeding

### Code Already Updated
- ✅ `app/convex/auth.ts` - Using `hello@mail.artifactreview-early.xyz`
- ✅ Environment variables in `.env.local`:
  - `RESEND_API_KEY=re_MBbCwNE9_6dYWJ9ksgZtPrwWb9cbc7BfW`
  - `PORKBUN_API_KEY=...`
  - `PORKBUN_SECRET_KEY=...`
  - `TEST_EMAIL_DOMAIN=artifactreview-early.xyz`

---

## Your Task

Complete the E2E testing with programmatic email retrieval to fully validate the magic link authentication flow.

### Prerequisites - ALL COMPLETE! ✅

1. **Domain Verified:** ✅
   - Domain: `artifactreview-early.xyz`
   - Status: `verified` in Resend
   - All DNS records configured and verified

2. **Email Sending Tested:** ✅
   - Successfully sent from: `hello@artifactreview-early.xyz`
   - Successfully delivered to: `test-*@tolauante.resend.app`
   - Successfully retrieved via Resend API

3. **Convex Environment Configured:** ✅
   - `AUTH_RESEND_KEY` set with send-only key (secure)
   - Backend ready to send magic link emails

---

## Implementation Requirements

### 1. Update E2E Tests for Email Retrieval

**File:** `tasks/00008-magic-link-authentication/tests/e2e/magic-link-resend.spec.ts`

The two skipped tests need to:

#### Test 1: Send and Retrieve Magic Link Email
```typescript
test('should send magic link email via Resend', async () => {
  // 1. Request magic link with unique email
  const testEmail = `test-${Date.now()}@tolauante.resend.app`;

  // 2. Fill form and submit
  await page.goto('/login');
  await page.click('button:has-text("Sign in with Email Link")');
  await page.fill('input[type="email"]', testEmail);
  await page.click('button:has-text("Send Magic Link")');

  // 3. Wait for success message
  await expect(page.getByText(/check your email/i)).toBeVisible();

  // 4. Retrieve email from Resend API
  //    Use Resend SDK to search for emails sent to testEmail
  //    May need retry logic (up to 10 attempts, 2s delay)

  // 5. Verify email was sent
  //    Check: from address, to address, subject
});
```

#### Test 2: Complete Magic Link Authentication Flow
```typescript
test('should complete magic link flow end-to-end with Resend', async () => {
  // 1. Request magic link
  const testEmail = `e2e-${Date.now()}@tolauante.resend.app`;
  // ... request magic link ...

  // 2. Retrieve email from Resend
  //    Get email content via Resend API

  // 3. Extract magic link URL from email HTML
  //    Parse HTML to find the href attribute
  //    URL format: http://localhost:3000/verify-email?code=...&email=...

  // 4. Navigate to magic link URL
  await page.goto(magicLinkUrl);

  // 5. Verify authentication succeeded
  await expect(page).toHaveURL(/dashboard/);

  // 6. Verify session persists
  await page.reload();
  await expect(page).toHaveURL(/dashboard/);
});
```

### 2. Resend Email Retrieval Pattern

**Important:** Resend API doesn't have a "search by recipient" endpoint. Use this approach:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// List recent emails (Resend returns them in reverse chronological order)
const { data: emails } = await resend.emails.list();

// Find the email sent to our test address
const targetEmail = emails.data.find(email =>
  email.to.includes(testEmail) &&
  email.from === 'hello@mail.artifactreview-early.xyz'
);

// Get full email content including HTML
const { data: emailDetails } = await resend.emails.get(targetEmail.id);

// Extract magic link from HTML
const magicLinkMatch = emailDetails.html.match(/href="([^"]*verify-email[^"]*)"/);
const magicLinkUrl = magicLinkMatch[1];
```

### 3. Retry Logic for Email Retrieval

Emails may take 1-3 seconds to appear in Resend API:

```typescript
async function waitForEmail(testEmail, maxAttempts = 10, delayMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data: emails } = await resend.emails.list();
    const email = emails.data.find(e =>
      e.to.includes(testEmail) &&
      e.from === 'hello@mail.artifactreview-early.xyz'
    );

    if (email) return email;

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error(`Email to ${testEmail} not found after ${maxAttempts} attempts`);
}
```

---

## Test Execution

### Run E2E Tests
```bash
cd tasks/00008-magic-link-authentication/tests

# Ensure services are running
# - Next.js on port 3000
# - Convex dev server

# Run all E2E tests
npx playwright test --reporter=list

# Run only Resend integration tests
npx playwright test e2e/magic-link-resend.spec.ts
```

### Expected Results
- All 7 E2E tests should pass (not skip)
- Console should show email retrieval working
- Magic link authentication should complete successfully

---

## Validation & Deliverables

1. **All Tests Passing:**
   - 10/10 unit tests ✅
   - 7/7 E2E tests (including Resend integration) ✅

2. **Generate Validation Trace:**
   ```bash
   npx playwright test e2e/magic-link-resend.spec.ts --trace on
   ```

3. **Copy Trace to Validation Directory:**
   ```bash
   cp test-results/.../trace.zip validation-videos/magic-link-resend-validation.trace.zip
   ```

4. **Update test-report.md:**
   - Mark Resend integration tests as passing
   - Document email retrieval implementation
   - Update final status to fully complete

---

## Troubleshooting

### Domain Not Verified
```bash
# Check domain status
cd app
RESEND_API_KEY=re_MBbCwNE9_6dYWJ9ksgZtPrwWb9cbc7BfW node verify-resend-domain.mjs
```

### Email Not Sending
- Check Convex logs for errors
- Verify AUTH_RESEND_KEY is set in Convex
- Confirm domain status is `verified` in Resend

### Email Not Retrieved
- Check Resend dashboard: https://resend.com/emails
- Verify email was actually sent
- Increase retry attempts/delay
- Check Resend API key has correct permissions

### Magic Link URL Extraction Fails
- Log the full email HTML to inspect structure
- Adjust regex pattern to match actual HTML format
- Test with a sample email first

---

## Success Criteria

✅ Domain verified in Resend
✅ Can send emails from `hello@mail.artifactreview-early.xyz`
✅ Can retrieve emails via Resend API
✅ Can extract magic link URL from email HTML
✅ Can complete full authentication flow programmatically
✅ All 7 E2E tests passing
✅ Validation trace generated
✅ test-report.md updated

---

## Files to Modify

1. `tasks/00008-magic-link-authentication/tests/e2e/magic-link-resend.spec.ts`
   - Implement email retrieval logic
   - Complete the 2 skipped tests

2. `tasks/00008-magic-link-authentication/test-report.md`
   - Update Resend integration test status
   - Document final results

3. `tasks/00008-magic-link-authentication/tests/validation-videos/`
   - Add new trace file for Resend integration tests

---

## Environment Variables Available

```bash
RESEND_API_KEY=re_MBbCwNE9_6dYWJ9ksgZtPrwWb9cbc7BfW
PORKBUN_API_KEY=pk1_2a120cc0b5a6d1a92e1992e1f31fda994bbb8360cfc2f36cd3ee6000bc999e54
PORKBUN_SECRET_KEY=sk1_ea82d64e605b7319d069b640a0d7d8bc3f5dc171aa666b33dc3a975b91451b83
TEST_EMAIL_DOMAIN=artifactreview-early.xyz
```

Also in `.env.local` for test scripts to use.

---

## Start Here

1. Check background task b3e000f for domain verification status
2. If verified, test email sending with `test-email-send-retrieve.mjs`
3. Implement email retrieval in E2E tests
4. Run tests and generate validation trace
5. Update documentation

Let me know when you're ready to start or if you have questions!
