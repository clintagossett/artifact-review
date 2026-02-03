# Local Stripe Integration Plan (Docker/Local Convex)

This plan outlines how to develop and test Stripe integration within our local Docker-based development environment.

## Overview

Stripe integration requires capturing real-time events (webhooks) and redirecting users to secure checkout pages. Since our local Convex instance is not publicly accessible, we will use the **Stripe CLI** to bridge the gap.

## 1. Prerequisites

- [ ] **Stripe CLI**: Install via Homebrew:
  ```bash
  brew install stripe/stripe-cli/stripe
  ```
- [ ] **Stripe Account**: Access to a Stripe dashboard in **Test Mode**.
- [ ] **Docker Environment**: Convex backend running at `localhost:3210` (API) and `localhost:3211` (Site/HTTP).

## 2. Authentication & Keys

1.  **Login to Stripe CLI**:
    ```bash
    stripe login
    ```
2.  **Locate Test Keys**:
    - Get `STRIPE_API_KEY` (Secret Key) from the Stripe Dashboard.
    - Get `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Publishable Key) from the Stripe Dashboard.
3.  **Configure Local Environment**:
    Add these to your local backend environment (via `.env.local` or using `npx convex env set` for the local instance):
    ```bash
    STRIPE_API_KEY=sk_test_...
    # The webhook secret is generated in the next step
    ```

## 3. Webhook Tunneling (The Local Bridge)

Since Stripe cannot "see" your Docker container, the CLI will listen for events in your Stripe account and repeat them to your local endpoint.

1.  **Find your local Site URL**:
    In our Docker setup, HTTP actions are served at `http://localhost:3211`.
2.  **Start the Stripe Tunnel**:
    Run this in a dedicated terminal tab:
    ```bash
    stripe listen --forward-to localhost:3211/stripe/webhook
    ```
3.  **Capture the Webhook Secret**:
    The command above will output a string like: `whsec_xxxxxxxx...`.
    **Add this as `STRIPE_WEBHOOK_SECRET`** to your Convex environment variables.

## 4. Development Workflow

1.  **Frontend**: The app uses the `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to initialize the Stripe Elements or redirect to Checkout.
2.  **Checkout**: When the user clicks "Upgrade", a Convex Action calls Stripe to create a session.
3.  **Events**:
    - Stripe processes the payment.
    - Stripe sends an asynchronous event (e.g., `checkout.session.completed`).
    - **Stripe CLI** receives this and forwards it to `localhost:3211/stripe/webhook`.
    - **Convex HTTP Action** (defined in `http.ts`) receives the event and updates the database.
4.  **Verification**: Check your local Convex dashboard (`http://localhost:6791`) to see the subscription status update.

## 5. Implementation Roadmap (Task 33)

- **Step A**: Install `@convex-dev/stripe` component (Backend).
- **Step B**: Configure `plans.ts` with local Price IDs from Stripe.
- **Step C**: Implement `stripe.ts` with checkout and portal actions.
- **Step D**: Register routes in `http.ts`.
- **Step E**: Add "Upgrade" buttons to the UI.

---

## Troubleshooting Local Webhooks

- **CLI Errors**: Ensure you are logged in (`stripe login`).
- **404 Errors**: Verify that your `http.ts` registers the path `/stripe/webhook` correctly.
- **Signature Failures**: This usually means the `STRIPE_WEBHOOK_SECRET` in your Convex env doesn't match the one currently active in your `stripe listen` session.
