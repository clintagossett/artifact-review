# Mailtrap Integration Update for Task 8

**Date:** 2025-12-26
**Reason:** AI-native development requires programmatic email access

---

## Key Changes

### Why Mailtrap Instead of Mailpit

**Original Plan:** Local Mailpit (Docker) - but Convex runs in cloud, can't reach localhost

**Updated Plan:** Mailtrap (hosted) - Convex can reach via SMTP, provides API for programmatic access

### Mailtrap Benefits for AI-Native Development

✅ **Programmatic API Access** - Retrieve emails via API for E2E tests
✅ **Hosted Service** - Works with cloud-hosted Convex
✅ **Free Tier** - 500 emails/month with full API access
✅ **No Docker Required** - Simplifies setup
✅ **AI-Friendly** - Clean JSON API for automated testing

---

## Setup Instructions

### 1. Create Mailtrap Account

```bash
# 1. Sign up at https://mailtrap.io (free tier)
# 2. Create an inbox in "Email Testing" section
# 3. Get SMTP credentials from inbox settings
# 4. Get API token from account settings
```

### 2. Configure Convex Environment

```bash
# SMTP configuration (for sending emails)
npx convex env set SMTP_HOST sandbox.smtp.mailtrap.io
npx convex env set SMTP_PORT 2525
npx convex env set SMTP_USER <your-username>
npx convex env set SMTP_PASS <your-password>

# API configuration (for E2E tests to retrieve emails)
npx convex env set MAILTRAP_API_TOKEN <your-api-token>
npx convex env set MAILTRAP_INBOX_ID <your-inbox-id>
```

### 3. Install Mailtrap Client for E2E Tests

```bash
cd tasks/00008-magic-link-authentication/tests
npm install mailtrap
```

---

## E2E Test Example (Programmatic Email Access)

```typescript
// File: tasks/00008-magic-link-authentication/tests/e2e/magic-link-mailtrap.spec.ts

import { test, expect } from '@playwright/test';
import { MailtrapClient } from 'mailtrap';

test.describe('Magic Link - AI-Native E2E Test', () => {
  const mailtrapClient = new MailtrapClient({
    token: process.env.MAILTRAP_API_TOKEN!,
  });

  const inboxId = parseInt(process.env.MAILTRAP_INBOX_ID!);

  test('should complete full magic link authentication flow', async ({ page }) => {
    const testEmail = `ai-test-${Date.now()}@example.com`;

    // 1. Request magic link via UI
    await page.goto('/login');
    await page.click('text=Sign in with Email Link');
    await page.fill('input[type="email"]', testEmail);
    await page.click('button:has-text("Send Magic Link")');

    // 2. Verify success message
    await expect(page.getByText(/check your email/i)).toBeVisible();

    // 3. PROGRAMMATICALLY retrieve email via Mailtrap API
    await page.waitForTimeout(3000); // Wait for email delivery

    const messages = await mailtrapClient.testing.messages.get(inboxId);
    const ourEmail = messages.find((msg) => msg.to_email === testEmail);

    expect(ourEmail).toBeDefined();
    expect(ourEmail?.subject).toContain('Sign in');

    // 4. Extract magic link from email body
    const fullEmail = await mailtrapClient.testing.messages.getOne(
      inboxId,
      ourEmail!.id
    );

    const magicLinkMatch = fullEmail.html_body.match(/href="([^"]*callback[^"]*)"/);
    expect(magicLinkMatch).toBeDefined();

    const magicLink = magicLinkMatch![1];

    // 5. Click magic link and verify authentication
    await page.goto(magicLink);
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    await expect(page.getByText(`Signed in as ${testEmail}`)).toBeVisible();
  });
});
```

---

## Benefits for AI Development

### Automated Testing
- AI agents can run full E2E tests without manual email checking
- Programmatic email retrieval enables fully automated test suites
- No human intervention needed to complete magic link flows

### Continuous Integration
- Tests run in CI/CD pipelines
- No Docker dependencies in CI environment
- Consistent results across development and CI

### Debugging
- View emails in Mailtrap web UI during development
- API provides structured JSON for easy parsing
- Historical email log for troubleshooting

---

## Comparison: Mailpit vs Mailtrap

| Feature | Mailpit (Local) | Mailtrap (Hosted) |
|---------|-----------------|-------------------|
| **Works with Convex** | ❌ No (cloud can't reach localhost) | ✅ Yes (SMTP endpoint) |
| **API Access** | ✅ Yes (local only) | ✅ Yes (accessible everywhere) |
| **Setup** | Docker required | Account signup |
| **Cost** | Free | Free tier (500/mo) |
| **CI/CD** | Complex (requires Docker in CI) | Simple (just env vars) |
| **AI-Native** | ⚠️ Limited (local only) | ✅ Excellent (API everywhere) |

---

## Implementation Plan Impact

### Files Modified
- `IMPLEMENTATION-PLAN.md` - Updated all Mailpit references to Mailtrap
- Cycle 1.2: SMTP configuration changed to Mailtrap
- Cycle 7.3: E2E tests updated to use Mailtrap API

### Files to Create (Updated)
- `tests/e2e/magic-link-mailtrap.spec.ts` - Programmatic email retrieval tests
- `tests/package.json` - Added `mailtrap` dependency

### Environment Configuration (Updated)
```bash
# Old (Mailpit - doesn't work)
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit

# New (Mailtrap - works with Convex)
npx convex env set SMTP_HOST sandbox.smtp.mailtrap.io
npx convex env set SMTP_PORT 2525
npx convex env set SMTP_USER <username>
npx convex env set SMTP_PASS <password>
npx convex env set MAILTRAP_API_TOKEN <token>
npx convex env set MAILTRAP_INBOX_ID <inbox-id>
```

---

## Next Steps

1. **Create Mailtrap Account** - Sign up at https://mailtrap.io
2. **Get Credentials** - SMTP + API token from dashboard
3. **Configure Convex** - Set environment variables
4. **Update Implementation Plan** - Full regeneration with Mailtrap
5. **Begin Implementation** - Launch TDD-developer agent

---

## Questions?

- **Cost concern?** Free tier (500/mo) is sufficient for development
- **Need more emails?** $15/mo for 5K emails
- **Alternative?** Ethereal (free, unlimited) but less polished API
