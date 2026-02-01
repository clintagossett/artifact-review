# Orchestrator: Stripe CLI Fan-out Integration

**Parent Task:** #56 - Integrate Stripe CLI into Agentic DX Flow
**Target Repo:** `artifact-review-orchestrator`
**Related ADR:** `docs/architecture/decisions/0022-stripe-webhook-multi-deployment-filtering.md`

---

## Overview

Add Stripe webhook fan-out capability to the orchestrator so a single Stripe CLI listener can broadcast webhook events to all registered agents.

### Why This Is Needed

- Multiple agents share one Stripe test account
- Stripe CLI can only forward to ONE endpoint
- We need to broadcast webhooks to ALL agents
- Each agent filters events using `siteOrigin` metadata (handled in their Convex code)

### Architecture

```
Stripe Cloud
     │
     ▼
Stripe CLI (tmux: stripe-listener)
     │
     │ forwards to https://stripe.loc/webhook
     ▼
┌─────────────────────────────────────────┐
│         ORCHESTRATOR proxy.js           │
│                                         │
│  stripe.loc/webhook handler:            │
│  1. Read all agents from config.json    │
│  2. Forward request to each agent's     │
│     convexSitePort + /stripe/webhook    │
│  3. Return 200 to Stripe CLI            │
└─────────────────────────────────────────┘
     │
     ├──► https://127.0.0.1:3231/stripe/webhook (james)
     ├──► https://127.0.0.1:3241/stripe/webhook (mark)
     └──► https://127.0.0.1:3251/stripe/webhook (tom)
```

---

## Implementation Steps

### 1. Add `stripe.loc` to DNS/Proxy Routing

The orchestrator needs to recognize `stripe.loc` as a special fan-out route.

**In `proxy.js`, add handling for the stripe hostname:**

```javascript
// Near the top with other special hostname handling
const STRIPE_FANOUT_HOST = 'stripe.loc';

// In the request handler, before normal agent routing:
if (hostname === STRIPE_FANOUT_HOST || hostname === 'www.stripe.loc') {
  return handleStripeFanout(req, res, config);
}
```

### 2. Implement Fan-out Handler

Add this function to `proxy.js`:

```javascript
/**
 * Fan out Stripe webhook to all registered agents.
 * Each agent's Convex backend filters by siteOrigin metadata.
 */
async function handleStripeFanout(req, res, config) {
  // Only handle POST to /webhook
  if (req.method !== 'POST' || !req.url.startsWith('/webhook')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Collect request body
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);

  // Get all agent names (exclude meta keys starting with _)
  const agents = Object.keys(config).filter(k =>
    !k.startsWith('_') &&
    config[k].convexSitePort
  );

  if (agents.length === 0) {
    console.log('[Stripe Fanout] No agents registered');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true, agents: [] }));
    return;
  }

  console.log(`[Stripe Fanout] Broadcasting to ${agents.length} agents: ${agents.join(', ')}`);

  // Forward to all agents in parallel
  const results = await Promise.allSettled(
    agents.map(async (agent) => {
      const port = config[agent].convexSitePort;
      const url = `https://127.0.0.1:${port}/stripe/webhook`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': req.headers['content-type'] || 'application/json',
            'Stripe-Signature': req.headers['stripe-signature'] || '',
          },
          body: body,
          // Skip SSL verification for local mkcert certs
          dispatcher: new (require('undici').Agent)({
            connect: { rejectUnauthorized: false }
          })
        });

        return { agent, status: response.status, ok: response.ok };
      } catch (err) {
        console.error(`[Stripe Fanout] Failed to reach ${agent}:`, err.message);
        return { agent, status: 0, ok: false, error: err.message };
      }
    })
  );

  // Log results
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      const { agent, status, ok } = result.value;
      console.log(`[Stripe Fanout] ${agent}: ${ok ? '✓' : '✗'} (${status})`);
    } else {
      console.log(`[Stripe Fanout] ${agents[i]}: ✗ (promise rejected)`);
    }
  });

  // Always return 200 to Stripe CLI (we've accepted the webhook)
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    received: true,
    agents: agents,
    results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
  }));
}
```

### 3. Add Stripe CLI Tmux Session to `start.sh`

Add a new tmux session for the Stripe listener alongside the proxy session.

**In `start.sh`, after starting the proxy:**

```bash
# Stripe CLI listener session
STRIPE_SESSION="stripe-listener"

start_stripe_listener() {
    if session_exists "$STRIPE_SESSION"; then
        echo "   ✅ Stripe listener already running (tmux: $STRIPE_SESSION)"
        return
    fi

    # Check if stripe CLI is installed
    if ! command -v stripe &> /dev/null; then
        echo "   ⚠️  Stripe CLI not installed - skipping listener"
        echo "      Install: https://stripe.com/docs/stripe-cli"
        return
    fi

    # Check for API key
    if [ -z "$STRIPE_API_KEY" ] && [ -z "$STRIPE_SECRET_KEY" ]; then
        echo "   ⚠️  STRIPE_API_KEY not set - skipping listener"
        echo "      Set in .env or run: stripe login"
        return
    fi

    echo "🔔 Starting Stripe webhook listener..."

    # Use STRIPE_API_KEY or fall back to STRIPE_SECRET_KEY
    STRIPE_KEY="${STRIPE_API_KEY:-$STRIPE_SECRET_KEY}"

    tmux new-session -d -s "$STRIPE_SESSION" \
        "STRIPE_API_KEY='$STRIPE_KEY' stripe listen --forward-to https://stripe.loc/webhook --skip-verify"

    sleep 2

    if session_exists "$STRIPE_SESSION"; then
        echo "   ✅ Stripe listener started (tmux: $STRIPE_SESSION)"
        echo "   📋 View: tmux attach -t $STRIPE_SESSION"
    else
        echo "   ❌ Failed to start Stripe listener"
    fi
}
```

**Call it in the `start_orchestrator` function:**

```bash
start_orchestrator() {
    # ... existing proxy startup ...

    # Start Stripe listener (optional - only if configured)
    start_stripe_listener

    # ... rest of function ...
}
```

**Add to stop function:**

```bash
stop_orchestrator() {
    # ... existing stop logic ...

    if session_exists "$STRIPE_SESSION"; then
        tmux kill-session -t "$STRIPE_SESSION"
        echo "   ✅ Stripe listener stopped"
    fi
}
```

### 4. Update `show_info` Output

Add Stripe listener status to the info display:

```bash
show_info() {
    # ... existing output ...

    echo ""
    echo "💳 Stripe Webhook Fan-out:"
    if session_exists "$STRIPE_SESSION"; then
        echo "   https://stripe.loc/webhook → all agents"
        echo "   View logs: tmux attach -t $STRIPE_SESSION"
    else
        echo "   Not running (stripe CLI not configured)"
    fi
}
```

### 5. Environment Configuration

Add to orchestrator's environment or document in README:

```bash
# .env or export before running start.sh
STRIPE_API_KEY=sk_test_...  # Or use `stripe login` for interactive auth
```

---

## Testing

### 1. Verify Fan-out Route Works

```bash
# Start orchestrator
./start.sh

# Test fan-out endpoint manually (without Stripe CLI)
curl -X POST https://stripe.loc/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{"type":"test.event"}' \
  --insecure

# Should see fan-out to all registered agents in proxy logs
```

### 2. Test with Stripe CLI

```bash
# Attach to Stripe listener session
tmux attach -t stripe-listener

# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded

# Check that all agents received it (check each agent's Convex logs)
```

### 3. Verify Filtering Works

```bash
# Create a checkout session from one agent (e.g., james)
# The checkout metadata should include siteOrigin: "https://james.loc"

# Trigger the webhook
stripe trigger checkout.session.completed

# Verify:
# - All agents receive the webhook (fan-out working)
# - Only james processes it (filtering working)
# - mark and tom log "Skipping event for https://james.loc"
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `proxy.js` | Add `handleStripeFanout()` function and route for `stripe.loc` |
| `start.sh` | Add `stripe-listener` tmux session management |
| `README.md` | Document Stripe CLI setup and `STRIPE_API_KEY` env var |

---

## Dependencies

- **Stripe CLI**: Must be installed on orchestrator host
  - Install: https://stripe.com/docs/stripe-cli
  - Or: `brew install stripe/stripe-cli/stripe`

- **undici** (optional): For better fetch with SSL options
  - Already likely available via Node.js 18+
  - If not: `npm install undici`

---

## Notes

- The fan-out always returns 200 to Stripe CLI, even if some agents fail
- Each agent handles its own signature verification and filtering
- Agents that are down will fail silently (logged but not blocking)
- The `--skip-verify` flag is needed because we use mkcert self-signed certs

---

## Questions?

Ping in the main task thread: `tasks/00056-integrate-stripe-cli-dx/`
