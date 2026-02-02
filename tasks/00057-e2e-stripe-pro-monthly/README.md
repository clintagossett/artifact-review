# Task 00057: E2E Test for Pro Monthly Subscription Signup

**GitHub Issue:** #57

---

## Resume (Start Here)

**Last Updated:** 2026-02-01 (Session 1)

### Current Status: COMPLETE

**Phase:** E2E test created and passing.

### What We Did This Session (Session 1)

1. **Explored codebase** - Analyzed existing E2E test patterns, Stripe integration, and subscription flow
2. **Created task folder** - Set up tasks/00057-e2e-stripe-pro-monthly/ structure
3. **Implemented E2E test** - Created stripe-subscription.spec.ts with full checkout flow
4. **Iteratively fixed issues** - Resolved iframe handling, selector issues, and navigation timing
5. **Test passing** - Full flow completes in ~31 seconds

### Test Results

```
  1 passed (30.9s)
```

All 13 steps pass:
1. Sign up new user
2. Navigate to Settings > Billing
3. Verify Free plan, select Monthly
4. Start Stripe Checkout
5. Fill contact email
6. Select Card payment method
7. Fill card details (4242424242424242, 02/29, 001)
8. Fill cardholder name (Test User)
9. Fill ZIP code (80301)
10. Uncheck "Save my information"
11. Submit payment
12. Wait for redirect back with success=true
13. Verify success UI and PRO badge

---

## Objective

Create a Playwright E2E test that verifies the complete Pro Monthly subscription signup flow:
1. User signs up with password
2. Navigates to Settings > Billing
3. Selects Pro Monthly plan
4. Completes Stripe Checkout with test card 4242424242424242
5. Verifies redirect back with success state
6. Confirms subscription is active

---

## Test Flow

```
User signup (password flow)
         ↓
Navigate to /settings
         ↓
Click "Billing" tab
         ↓
Verify Free plan state
         ↓
Select "Monthly" (default is Annual)
         ↓
Click "Upgrade to Pro"
         ↓
Stripe Checkout page (checkout.stripe.com)
         ↓
Fill email, select Card payment
         ↓
Enter test card: 4242 4242 4242 4242
Expiry: 02/29, CVC: 001
Cardholder: Test User, ZIP: 80301
         ↓
Uncheck "Save my information"
         ↓
Click Subscribe
         ↓
Redirect to /settings?success=true
         ↓
Click Billing tab
         ↓
Verify success UI ("You're all set!")
         ↓
Verify PRO badge visible
```

---

## Files

| File | Description |
|------|-------------|
| `README.md` | This file |
| `tests/e2e/stripe-subscription.spec.ts` | Main E2E test file |
| `tests/validation-videos/` | Video recordings (gitignored) |
| `stripe-test-data.md` | Test card details reference |

---

## Acceptance Criteria

From Issue #57:
- [x] Test passes locally with Stripe CLI running
- [x] Test covers happy path (successful subscription)
- [x] User signs up for Pro Monthly plan (not annual)
- [x] Payment completes via Stripe test card
- [x] Redirect back with success parameter
- [x] Success UI shown in BillingSection

---

## Running the Test

```bash
# Ensure dev servers are running
./scripts/start-dev-servers.sh

# Ensure Stripe CLI is forwarding webhooks (orchestrator handles this)

# Run the test (from app directory)
cd app && npx playwright test stripe-subscription.spec.ts

# Or run all e2e tests
cd app && npm run test:e2e
```

**Note:** The test is also copied to `app/tests/e2e/stripe-subscription.spec.ts` for integration with the main test suite.

---

## Key References

- `app/src/components/settings/BillingSection.tsx` - Billing UI component
- `app/convex/stripe.ts` - Stripe backend actions
- `app/convex/http.ts` - Webhook handler (lines 47-157)
- `docs/architecture/decisions/0022-stripe-webhook-multi-deployment-filtering.md` - Webhook filtering ADR
- `stripe-test-data.md` - Test card and field values
