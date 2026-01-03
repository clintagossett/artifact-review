# Simplified Architecture: Resend-Only for Task 8

**Date:** 2025-12-26
**Decision:** Use ONLY Resend for both production and development

---

## Why Simplify to Resend-Only?

### Original Complexity
```
Production:   Convex → Resend → Real emails
Development:  Convex → Mailtrap → Mailtrap API → E2E tests
              (Requires: Mailtrap account, SMTP config, extra SDK)
```

### Simplified Architecture
```
Production:   Convex → Resend → Real emails
Development:  Convex → Resend (test mode) → Resend API → E2E tests
              (Requires: Just Resend API key)
```

**One provider. One configuration. Simpler.**

---

## Key Discovery

**Resend provides API access to retrieve sent emails:**

```javascript
// List all sent emails
const { data: emails } = await resend.emails.list();

// Get specific email (includes HTML body with magic link!)
const email = await resend.emails.get(emailId);
```

This means we can **programmatically retrieve magic links** for E2E testing without any additional service.

---

## Benefits

| Benefit | Impact |
|---------|--------|
| **Fewer services** | Only Resend (no Mailtrap, no Mailpit) |
| **Simpler config** | One API key for all environments |
| **Lower cost** | Free tier 3K emails/month (vs Mailtrap 500/month) |
| **Easier maintenance** | One provider to manage |
| **Same API** | Dev and prod use identical code |
| **AI-native** | Full programmatic access built-in |

---

## Configuration

### Development Environment

```bash
# Set Resend test API key in Convex
npx convex env set AUTH_RESEND_KEY=re_test_xxxxxxxxx

# For E2E tests (same key)
# tests/.env.local
RESEND_API_KEY=re_test_xxxxxxxxx
```

### Production Environment

```bash
# Set Resend production API key
npx convex env set AUTH_RESEND_KEY=re_prod_xxxxxxxxx
```

**That's it!** No SMTP configuration needed.

---

## E2E Testing Example

```typescript
// tasks/00008-magic-link-authentication/tests/e2e/magic-link.spec.ts

import { test, expect } from '@playwright/test';
import { Resend } from 'resend';

test.describe('Magic Link Authentication', () => {
  const resend = new Resend(process.env.RESEND_API_KEY!);

  test('should complete full magic link flow', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;

    // 1. Request magic link via UI
    await page.goto('/login');
    await page.click('text=Sign in with Email Link');
    await page.fill('input[type="email"]', testEmail);
    await page.click('button:has-text("Send Magic Link")');

    // 2. Verify success message
    await expect(page.getByText(/check your email/i)).toBeVisible();

    // 3. Retrieve email via Resend API (AI-native!)
    await page.waitForTimeout(3000); // Wait for email delivery

    const { data: emails } = await resend.emails.list();
    const ourEmail = emails.find(e => e.to[0] === testEmail);

    expect(ourEmail).toBeDefined();

    // 4. Get full email HTML
    const fullEmail = await resend.emails.get(ourEmail.id);

    // 5. Extract magic link from HTML
    const magicLinkMatch = fullEmail.html.match(/href="([^"]*callback[^"]*)"/);
    expect(magicLinkMatch).toBeDefined();
    const magicLink = magicLinkMatch[1];

    // 6. Click magic link and verify authentication
    await page.goto(magicLink);
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    await expect(page.getByText(`Signed in as ${testEmail}`)).toBeVisible();
  });
});
```

**Fully automated. No manual email checking. AI-native development.**

---

## Dependencies

### E2E Tests

```json
{
  "devDependencies": {
    "@playwright/test": "^1.57.0",
    "resend": "^4.0.0"
  }
}
```

**Just two packages.** No Mailtrap SDK, no extra tooling.

---

## Environment Variables

### Local Development (.env.local)

```bash
RESEND_API_KEY=re_test_xxxxxxxxx
```

### Convex Environment

```bash
# Development deployment
npx convex env set AUTH_RESEND_KEY=re_test_xxxxxxxxx

# Production deployment
npx convex env set AUTH_RESEND_KEY=re_prod_xxxxxxxxx
```

---

## Test Mode vs Production Mode

### Test Mode (Development)

- API key starts with `re_test_`
- Emails logged in Resend dashboard
- **Not actually delivered to real inboxes**
- Full API access to retrieve emails
- View in dashboard: https://resend.com/emails

### Production Mode

- API key starts with `re_prod_`
- Emails actually delivered to real inboxes
- Full API access (for debugging, analytics)

---

## Cost Analysis

### Resend Free Tier

- **3,000 emails/month** for free
- Includes API access
- All features available

### Development Usage Estimate

- E2E test runs: ~10 emails per run
- Daily development: ~50 emails
- Monthly: ~1,500 emails

**Well within free tier!**

---

## Comparison: Before vs After

### Before (Mailtrap approach)

```typescript
// Two services to manage
const mailtrap = new MailtrapClient({ token: MAILTRAP_TOKEN });
const messages = await mailtrap.testing.messages.get(INBOX_ID);

// Configuration in two places
- Convex: AUTH_RESEND_KEY
- Tests: MAILTRAP_API_TOKEN, MAILTRAP_INBOX_ID

// Cost: Mailtrap free tier (500 emails/month)
```

### After (Resend-only)

```typescript
// One service
const resend = new Resend(RESEND_API_KEY);
const { data: emails } = await resend.emails.list();

// Configuration in one place
- Convex: AUTH_RESEND_KEY
- Tests: RESEND_API_KEY (same key!)

// Cost: Resend free tier (3,000 emails/month)
```

**Simpler, cheaper, fewer moving parts.**

---

## Implementation Plan Updates

### Removed

- ❌ Mailtrap account creation
- ❌ Mailtrap SMTP configuration
- ❌ Mailtrap API token setup
- ❌ Mailpit Docker setup
- ❌ SMTP environment variables

### Added

- ✅ Resend API key configuration
- ✅ Resend email retrieval in E2E tests
- ✅ Single provider for all environments

### Unchanged

- ✅ TDD phases and structure
- ✅ Component architecture
- ✅ Frontend forms and pages
- ✅ Convex Auth Resend provider
- ✅ Testing methodology

---

## Next Steps

1. **Architect agent completes** - Regenerated IMPLEMENTATION-PLAN.md
2. **Review updated plan** - Verify Resend-only approach
3. **Get Resend API key** - Sign up at https://resend.com
4. **Configure Convex** - Set AUTH_RESEND_KEY
5. **Launch TDD-developer agent** - Begin implementation

---

## Success Metrics

**Complexity Reduction:**
- Services: 2 → 1 (50% reduction)
- Configuration keys: 5 → 1 (80% reduction)
- SDKs: 2 → 1 (50% reduction)
- Accounts needed: 2 → 1 (50% reduction)

**Same functionality. Half the complexity.**
