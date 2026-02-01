# Task 00056: Integrate Stripe CLI into Agentic DX Flow

**GitHub Issue:** #56

---

## Resume (Start Here)

**Last Updated:** 2026-01-31 (Session 1)

### Current Status: ✅ COMPLETE - READY TO MERGE

**Phase:** Fully implemented and tested. Documentation updated.

### What We Did This Session (Session 1)

1. **Created task** - GitHub issue #56 and task folder
2. **Reviewed existing Stripe integration** - Found `@convex-dev/stripe` component with `/stripe/webhook` endpoint
3. **Analyzed multi-agent study** - Multiple listeners receive ALL events (broadcast model)
4. **Identified module limitation** - `registerRoutes()` processes events before we can filter
5. **Designed solution** - Own the webhook route, filter by `siteOrigin` metadata
6. **Wrote ADR** - [ADR-0022: Stripe Webhook Multi-Deployment Filtering](../../docs/architecture/decisions/0022-stripe-webhook-multi-deployment-filtering.md)
7. **Created orchestrator instructions** - `ORCHESTRATOR-INSTRUCTIONS.md` for orch-agent2
8. **Orchestrator implemented** - orch-agent2 added `stripe.loc` fan-out to `proxy.js`
9. **Agent-side implemented:**
   - Replaced `registerRoutes()` with custom webhook handler in `http.ts`
   - Added `siteOrigin` filtering (compares `metadata.siteOrigin` to `SITE_URL`)
   - Added `siteOrigin` to checkout metadata in `stripe.ts`

### Key Findings

1. **Webhook secret is stable** - `whsec_...` tied to Stripe account auth, not regenerated per session
2. **Stripe login lasts 90 days** - Expires 2026-05-02, then needs re-auth
3. **Single listener + fan-out** - Preferred over per-agent (same filtering needed either way)
4. **Shared secrets** - All in `../../.env.dev.local`, agents set in their Convex

### Completed

- ✅ Custom webhook route with siteOrigin filtering (`http.ts`)
- ✅ siteOrigin in checkout metadata (`stripe.ts`)
- ✅ Orchestrator fan-out (`proxy.js`, `start.sh`)
- ✅ Stripe CLI installed
- ✅ Webhook flow tested end-to-end
- ✅ ADR-0022 updated with findings
- ✅ CLAUDE.md Stripe section added

---

## Objective

Enable E2E testing of Stripe payment flows in the agentic development environment by integrating Stripe CLI for local webhook forwarding.

---

## Current State

### Stripe Backend (Already Implemented)
- **Component:** `@convex-dev/stripe` in `app/convex/http.ts`
- **Webhook Path:** `/stripe/webhook`
- **Events Handled:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - (and other subscription events)

### Webhook URL per Agent
- James: `https://james.convex.site.loc/stripe/webhook`
- Mark: `https://mark.convex.site.loc/stripe/webhook`
- Tom: `https://tom.convex.site.loc/stripe/webhook`

### Required Environment Variables
```bash
STRIPE_KEY=sk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
```

---

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A: Agent-local Stripe CLI** | Simple, each agent independent | Multiple listeners, potential routing issues per study |
| **B: Orchestrator shared service** | Single listener, nginx fan-out, clean architecture | More complex setup, shared Stripe account |
| **C: Per-agent separate Stripe accounts** | Complete isolation | Requires multiple Stripe test accounts |

## Recommended Approach: Hybrid (A for MVP, B for scale)

**MVP (Now):** Each agent runs their own `stripe listen` in a tmux session. Simple, works for single-agent development.

**Scale (Later):** Add orchestrator service with nginx fan-out when multi-agent simultaneous testing is needed.

---

## Implementation Plan

### Subtask 1: Agent-Local Stripe CLI Integration

1. **Add `stripe` to tmux session management** in `start-dev-servers.sh`
2. **Configure env vars** - Add to `.env.dev.local` (API key for CLI auth)
3. **Auto-start Stripe listener** - Forward to `https://${AGENT_NAME}.convex.site.loc/stripe/webhook`
4. **Document setup** - Add section to CLAUDE.md

### Subtask 2: E2E Test Fixtures

1. **Create Stripe test scenarios** in `app/tests/e2e/`
2. **Add test helpers** for triggering Stripe events via CLI
3. **Document test data** - Test cards, expected behaviors

### Subtask 3: Documentation

1. **CLAUDE.md updates** - Stripe CLI section in dev environment
2. **First-time setup guide** - Stripe Dashboard configuration
3. **Troubleshooting section** - Common issues

---

## Key Reference

See `claude-stripe-cli-study.md` in this task folder for detailed multi-agent patterns and gotchas.

### Critical Points from Study

1. **Multiple listeners receive ALL events** (broadcast model)
2. **Use `STRIPE_API_KEY` env var** for headless operation
3. **`STRIPE_DEVICE_NAME`** identifies session in Dashboard
4. **Webhook signing secret stays consistent** across CLI restarts
5. **Idempotency is essential** - Stripe may send duplicates

---

## Testing

- Verify Stripe CLI starts with dev servers
- Trigger test events: `stripe trigger payment_intent.succeeded`
- Confirm events reach Convex webhook handler
- Run E2E tests for checkout/subscription flows
