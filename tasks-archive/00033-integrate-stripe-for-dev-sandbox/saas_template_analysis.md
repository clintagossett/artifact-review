# SaaS Template Component Analysis

This document outlines the components and patterns from the [Convex SaaS Template](https://www.convex.dev/templates/convex-saas) that we intend to evaluate for the Artifact Review project.

## Phase 1: Needed for Stripe Launch
*Components essential for processing payments and granting access.*

- **[ ] Plans Configuration**: A centralized configuration (e.g., `plans.ts`) to define Price IDs, features, and tiers. Critical for ensuring the code and Stripe Dashboard stay in sync.
- **[ ] Checkout Action Wrapper**: The specific pattern for wrapping `createSubscriptionCheckout` and `createPaymentCheckout` to handle metadata (like associating a purchase with a User ID or Organization).
- **[ ] Webhook Handler Setup**: The pattern for registering the webhook in `http.ts` (which we started but reverted).
- **[ ] "Upgrade" UI / Pricing Card**: A basic UI component to display available plans and trigger the checkout flow.

## Phase 2: Needed for Stripe Convenience
*Components that improve the user experience and reduce support burden.*

- **[ ] Billing Portal Integration**: The "Manage Subscription" button that calls `stripe.createBillingPortalSession`. This allows users to self-serve (cancel, update payment methods, view invoices).
- **[ ] Subscription Status Hook**: A shared React hook or Convex query helper (e.g., `useSubscription`) to easily check if the current user is "active", "trialling", or "past_due" anywhere in the UI.
- **[ ] Conditional UI Wrappers**: Components like `<Authenticated>` or `<Subscribed>` that protect routes or features based on subscription status.

## Phase 3: Nice to Haves (Long Term)
*Features that add polish but are not blocking the initial integration.*

- **[ ] Invoices List**: A UI list showing past payment history directly in the app (vs. sending them to the Stripe Portal).
- **[ ] Team/Organization Billing**: If the SaaS template supports "Seat-based" billing for organizations, porting this logic for future team features.
- **[ ] Email Notifications**: Custom email triggers for specific billing events (e.g., "Payment Failed" or "Trial Ending") if the template includes Resend templates for these.
- **[ ] Admin Dashboard**: A customized view for you (the admin) to see MRR, active subscribers, etc., powered by Convex queries over the Stripe tables.
