# Task 00033: Integrate Stripe for Dev Sandbox

**GitHub Issue:** #33
**Related Project:**

---

## Resume (Start Here)

**Last Updated:** 2026-01-10

### Current Status: ✅ COMPLETED

**Phase:** Full Integration and UI Polish

### Accomplishments

1.  **Stripe Backend Sync**: Fixed the `internalSyncSubscription` to correctly handle cancellations and period end dates across Stripe API versions.
2.  **Standardized Redirects**: Created `getAppUrl` utility to ensure Stripe return URLs always point to the frontend (port 3000) rather than the Convex backend.
3.  **UI Redesign**: Overhauled the `BillingSection` component to:
    *   Side-by-side Free vs Pro comparison.
    *   Annual billing focus (Default).
    *   Implicit savings and monthly-equivalent pricing display.
    *   "Best Value" and "Subscription Canceled" banners with retention messaging.
4.  **Auth Resilience**: Fixed the "Auth Bounce" issue where authenticated users were being redirected away from deep links (like `/settings`) during page hydration.
5.  **Environment Sync**: Audited and documented all Stripe-related environment variables.

---

## Objective

Integrate Stripe for payments in the dev sandbox environment

---

## Hierarchy: Subtasks and Steps

### Phase 1: Payments Launch (COMPLETED)
- [x] Configure `plans.ts` with Price IDs.
- [x] Implement Checkout session creation.
- [x] Set up robust Webhook handlers in `http.ts`.
- [x] Create initial Upgrade UI.

### Phase 2: UX and Convenience (COMPLETED)
- [x] Integrate Customer Billing Portal.
- [x] Fix return URL logic for local dev.
- [x] Implement cancellation state UI with retention messaging.
- [x] Fix auth redirects for deep links.

---

## Changes Made

- Created `convex/lib/urls.ts` for centralized URL management.
- Enhanced `convex/stripe.ts` with stable API versioning and robust sync logic.
- Redesigned `src/components/settings/BillingSection.tsx`.
- Updated `src/hooks/useAuthRedirect.ts` for session-aware authentication.
- Updated `docs/ENVIRONMENT_VARIABLES.md`.

## Output

- [SaaS Template Analysis](saas_template_analysis.md)
