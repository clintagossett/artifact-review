---
title: Stripe Webhook Multi-Deployment Filtering
status: Accepted
date: 2026-01-31
deciders: Clint Gossett
task: 00056
---

# 22. Stripe Webhook Multi-Deployment Filtering

## Context

We have multiple deployment environments that share a single Stripe test account:

- **Development agents**: `james.loc`, `mark.loc`, `tom.loc` (parallel development)
- **Staging**: `staging.artifactreview.com`
- **Production**: `app.artifactreview.com`

When any deployment creates a Stripe checkout session, Stripe sends webhook events to ALL registered listeners. The Stripe CLI (used in local dev) broadcasts events to all running listeners. This creates a problem:

```
james creates checkout → Stripe webhook fires
                              ↓
                    ALL deployments receive it
                              ↓
          mark and tom try to process james's event
                              ↓
                    ❌ Data corruption / errors
```

### The Challenge

The `@convex-dev/stripe` module handles webhooks via `registerRoutes()`, which:

1. Verifies Stripe signature
2. Calls internal `processEvent()` to sync to component tables
3. Then calls our custom handlers

We cannot filter BEFORE the module processes events because `processEvent()` runs first.

## Decision

**Own the webhook route entirely** instead of using `registerRoutes()`. This gives us full control to filter events BEFORE any processing occurs.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STRIPE CLOUD                                │
│                                                                     │
│  Checkout Session created with metadata:                            │
│  { organizationId: "org_123", siteOrigin: "https://james.loc" }    │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ Webhook Event
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STRIPE CLI (Local Dev)                           │
│                                                                     │
│  stripe listen --forward-to https://james.convex.site.loc/stripe   │
│                                                                     │
│  Broadcasts to ALL agent endpoints (james, mark, tom)               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ james.loc   │    │ mark.loc    │    │ tom.loc     │
│             │    │             │    │             │
│ SITE_URL=   │    │ SITE_URL=   │    │ SITE_URL=   │
│ james.loc   │    │ mark.loc    │    │ tom.loc     │
│             │    │             │    │             │
│ Webhook:    │    │ Webhook:    │    │ Webhook:    │
│ ✅ Process  │    │ ❌ Skip     │    │ ❌ Skip     │
│ (origin     │    │ (origin     │    │ (origin     │
│  matches)   │    │  mismatch)  │    │  mismatch)  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Implementation

**1. Add `siteOrigin` to Stripe metadata when creating checkout sessions:**

```typescript
// convex/stripe.ts
export const createCheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    priceId: v.string(),
  },
  handler: async (ctx, args) => {
    const siteOrigin = getAppUrl(); // "https://james.loc" or "https://app.artifactreview.com"

    const session = await subscriptions.createCheckoutSession(ctx, {
      // ...
      metadata: {
        organizationId: args.organizationId,
        siteOrigin, // ← Added for filtering
      },
      subscriptionMetadata: {
        organizationId: args.organizationId,
        siteOrigin, // ← Also on subscription for renewal events
      },
    });

    return session.url;
  },
});
```

**2. Own the webhook route with filtering:**

```typescript
// convex/http.ts
import Stripe from "stripe";

// DON'T use registerRoutes() - own the route for filtering control
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response("No signature", { status: 400 });
    }

    // 1. Verify signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        await req.text(),
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      return new Response("Invalid signature", { status: 400 });
    }

    // 2. FILTER FIRST - before any processing
    const data = event.data.object as any;
    const eventOrigin = data.metadata?.siteOrigin;
    const ourOrigin = process.env.SITE_URL;

    if (eventOrigin && eventOrigin !== ourOrigin) {
      // Not our event - acknowledge but don't process
      console.log(`[Stripe] Skipping event for ${eventOrigin} (we are ${ourOrigin})`);
      return new Response(
        JSON.stringify({ received: true, filtered: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Process event (only reaches here if it's ours)
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(ctx, event.data.object);
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
          await handleSubscriptionChange(ctx, event.data.object);
          break;
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(ctx, event.data.object);
          break;
        // ... other events
      }
    } catch (error) {
      console.error("[Stripe] Error processing webhook:", error);
      return new Response("Processing error", { status: 500 });
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});
```

**3. Environment variables already available:**

```bash
# .env.convex.local (per deployment)
SITE_URL=https://james.loc          # Dev agent
SITE_URL=https://staging.example.com # Staging
SITE_URL=https://app.example.com     # Production
```

### Stripe CLI Setup (Local Dev)

**Recommended: Orchestrator-level fan-out** (single listener, broadcasts to all agents)

The orchestrator runs a single Stripe CLI listener that fans out to all registered agents via `proxy.js`:

```
Stripe CLI → https://stripe.loc/webhook → proxy.js fan-out
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         ▼                     ▼                     ▼
                   james:3231            mark:3241             tom:3251
                   /stripe/webhook       /stripe/webhook       /stripe/webhook
                         │                     │                     │
                   ✅ Process            ❌ Filter out         ❌ Filter out
                   (siteOrigin           (siteOrigin            (siteOrigin
                    matches)              mismatch)              mismatch)
```

**Orchestrator starts the listener:**
```bash
# In orchestrator's start.sh
tmux new-session -d -s stripe-listener \
  "stripe listen --forward-to https://stripe.loc/webhook --skip-verify"
```

**proxy.js handles fan-out:**
```javascript
// stripe.loc routes to fan-out handler
if (hostname === 'stripe.loc') {
  // Forward to all agents' convexSitePort + /stripe/webhook
  const agents = Object.keys(config).filter(k => !k.startsWith('_'));
  await Promise.all(agents.map(agent => forwardToAgent(agent, req, body)));
}
```

See: `tasks/00056-integrate-stripe-cli-dx/ORCHESTRATOR-INSTRUCTIONS.md` for full implementation details.

**Alternative: Agent-level** (each agent runs their own listener)
```bash
stripe listen --forward-to "https://${AGENT_NAME}.convex.site.loc/stripe/webhook" --skip-verify
```
Simpler but runs N listeners for N agents. All receive all events, each filters by `siteOrigin`.

### SSL Certificate Validation (Important - Validate Early)

**Validate Stripe CLI can reach your local endpoints early in setup.** The orchestrator uses mkcert for local HTTPS (`*.loc` domains). This creates a potential friction point:

#### The Local Dev SSL Challenge

```
Stripe CLI → https://james.convex.site.loc/stripe/webhook
                        ↓
              mkcert self-signed cert
                        ↓
              ❌ SSL verification fails (Stripe CLI doesn't trust mkcert CA)
                        ↓
              Webhook silently not delivered
```

#### Options

| Approach | Pros | Cons |
|----------|------|------|
| `--skip-verify` | Simple, just works | Less production-like |
| Trust mkcert CA | Production-like SSL flow | Extra setup per machine |
| HTTP endpoint | No SSL issues | Requires proxy config change |

**Recommended for local dev:** Use `--skip-verify`. The SSL validation isn't what we're testing - the webhook filtering logic is.

```bash
stripe listen \
  --forward-to https://${AGENT_NAME}.convex.site.loc/stripe/webhook \
  --skip-verify
```

**If you need to trust the CA** (for stricter testing):
```bash
# Find your mkcert CA root
mkcert -CAROOT
# e.g., /home/user/.local/share/mkcert/rootCA.pem

# Set for Stripe CLI (add to .env.dev.local)
export SSL_CERT_FILE=$(mkcert -CAROOT)/rootCA.pem
```

#### First-Time Validation Checklist

Before building out the integration, verify the full chain works:

```bash
# 1. Start Stripe listener
stripe listen --forward-to https://${AGENT_NAME}.convex.site.loc/stripe/webhook --skip-verify

# 2. Note the webhook signing secret (whsec_...) printed at startup
# 3. Set it in Convex: npx convex env set STRIPE_WEBHOOK_SECRET "whsec_..."

# 4. Trigger a test event
stripe trigger payment_intent.succeeded

# 5. Verify in Convex logs that the event arrived
tmux attach -t ${AGENT_NAME}-convex-dev
# Should see: [Stripe] Received event: payment_intent.succeeded
```

**If webhooks don't arrive:** SSL is the most likely culprit. The CLI fails silently on cert errors.

## Consequences

### Positive

- **Production-ready**: Same pattern works for multi-region, staging, prod
- **Complete isolation**: Events cannot affect wrong deployment
- **No module fork**: Works with standard `@convex-dev/stripe` for other features
- **Simple filtering**: Just check `siteOrigin` metadata
- **Graceful handling**: Returns 200 for filtered events (Stripe won't retry)

### Negative

- **Own signature verification**: Must implement ourselves (straightforward)
- **Own event routing**: Can't use module's `processEvent()` convenience
- **Metadata discipline**: Must remember to add `siteOrigin` to all Stripe objects

### Neutral

- **Single Stripe CLI**: Orchestrator runs one listener, fans out to all agents
- **Shared webhook secret**: All agents use same `whsec_` from shared `.env.dev.local`
- **Component tables unused**: We handle syncing ourselves, module's tables are empty

## Alternatives Considered

### 1. Fork `@convex-dev/stripe` to Add Filter Hook

Add a `filterEvent` callback that runs before `processEvent()`.

**Rejected**: Maintenance burden for upstream changes. Contribution upstream is better long-term but blocks us now.

### 2. Separate Stripe Accounts per Agent/Environment

Each deployment has its own `sk_test_...` keys.

**Rejected**: More Stripe configuration. Doesn't reflect production reality where you might have multi-region with shared Stripe account.

### 3. Accept Data Pollution

Let all events process, filter only in custom handlers.

**Rejected**: Module's internal tables would have mixed data from all deployments. Sloppy and could cause issues.

### 4. Single Stripe CLI with Fan-out (ADOPTED)

Run one CLI listener, orchestrator's `proxy.js` fans out to all agents.

**Adopted**: Simpler than nginx (reuses existing proxy), one shared webhook secret, orchestrator manages lifecycle. This is the implemented approach.

## Production Use Case

This pattern directly supports production scenarios:

```
┌──────────────────────────────────────────────────────────────┐
│                    PRODUCTION STRIPE                          │
│                                                              │
│  Single Stripe account serves:                               │
│  - app.artifactreview.com (main)                            │
│  - eu.artifactreview.com (EU region)                        │
│  - enterprise.client.com (white-label)                      │
│                                                              │
│  Each registers webhook endpoint:                            │
│  - https://app.convex.site/stripe/webhook                   │
│  - https://eu.convex.site/stripe/webhook                    │
│  - https://enterprise.convex.site/stripe/webhook            │
│                                                              │
│  All receive all events, each filters by siteOrigin         │
└──────────────────────────────────────────────────────────────┘
```

## Affected Files

### Agent Repo (`artifact-review-{agent}`)

| File | Change |
|------|--------|
| `convex/stripe.ts` | Add `siteOrigin` to checkout/subscription metadata |
| `convex/http.ts` | Replace `registerRoutes()` with owned route + filtering |
| `CLAUDE.md` | Document Stripe setup for agents |

### Orchestrator Repo (`orchestrator-artifact-review`)

| File | Change |
|------|--------|
| `proxy.js` | Add `stripe.loc` fan-out handler |
| `start.sh` | Add `stripe-listener` tmux session |
| `README.md` | Document Stripe CLI setup |

See: `tasks/00056-integrate-stripe-cli-dx/ORCHESTRATOR-INSTRUCTIONS.md` for orchestrator implementation details.

## Key Findings (Implementation Notes)

### Webhook Secret is Stable

The `whsec_...` webhook signing secret is **NOT regenerated each time** `stripe listen` starts. It's tied to the Stripe account authentication:

```bash
# Returns the same secret every time (until re-auth)
stripe listen --print-secret
# whsec_fa0f41ec79416cc4c6ce817937a9d1a47b23c185d4938859700d336dbbf174e8
```

This means:
- All agents can share ONE webhook secret
- Store it in `../../.env.dev.local` (shared across agents)
- No need to update secrets when orchestrator restarts

### Stripe CLI Authentication Lasts 90 Days

After running `stripe login`, credentials are stored locally:

```bash
stripe config --list
# test_mode_key_expires_at = '2026-05-02'  (90 days from login)
```

After expiration, someone needs to run `stripe login` again on the dev machine.

### Shared Secrets Location

All Stripe secrets live in the parent directory (outside repos, never committed):

```
artifact-review-dev/.env.dev.local
├── STRIPE_SECRET_KEY=rk_test_...       # Shared test account key
├── STRIPE_WEBHOOK_SECRET=whsec_...     # Shared (from one CLI)
├── STRIPE_PRICE_ID_PRO=price_...       # Product configuration
└── STRIPE_PRICE_ID_PRO_ANNUAL=price_...
```

Each agent sources this file and sets values in their Convex environment.

### Why Single Listener + Fan-out

We evaluated per-agent listeners vs single + fan-out:

| Approach | Secrets | Event Delivery | Isolation |
|----------|---------|----------------|-----------|
| Per-agent listeners | N different `whsec_` | Stripe broadcasts to ALL | None (still need siteOrigin filter) |
| Single + fan-out | 1 shared `whsec_` | Orchestrator broadcasts | None (still need siteOrigin filter) |

**Conclusion:** Multiple listeners don't provide isolation - Stripe broadcasts ALL events to ALL listeners regardless. Single + fan-out is simpler (one secret) with the same filtering requirement.

## Related

- Task: `tasks/00056-integrate-stripe-cli-dx/`
- Study: `tasks/00056-integrate-stripe-cli-dx/claude-stripe-cli-study.md`
- Stripe Integration Plan: `tasks-archive/00033-integrate-stripe-for-dev-sandbox/STRIPE_INTEGRATION_PLAN.md`
