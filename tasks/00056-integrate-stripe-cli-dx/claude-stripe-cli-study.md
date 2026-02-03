# Configuring Stripe CLI for multi-agent webhook development

**Multiple `stripe listen` instances can run simultaneously, and all listeners receive all events in a broadcast model—but this creates practical problems.** The Stripe CLI was designed for single-developer workflows, and while parallel listeners technically work, GitHub issues document routing inconsistencies where events sporadically reach wrong endpoints. For multi-agent scenarios like multiple Claude Code instances, the most reliable pattern is a **single Stripe CLI listener with a fan-out proxy** that broadcasts events to each agent's local port.

## How multiple listeners actually behave

When you run multiple `stripe listen` processes against the same Stripe account, each listener receives **every webhook event**—there's no load balancing or routing. Stripe's official documentation confirms: "You will receive events for all interactions on your Stripe account. There is currently no way to limit events to only those that a specific user created." [GitHub](https://github.com/stripe/stripe-cli/wiki/listen-command)

The webhook signing secret (`whsec_...`) remains **consistent across CLI restarts** for the same session, which simplifies verification. [GitHub](https://github.com/stripe/stripe-cli/wiki/listen-command) However, all CLI instances sharing the same account will use this same secret, meaning your agents can all verify signatures with the same key. One critical gotcha: Dashboard-configured webhook endpoints also continue receiving events while the CLI runs—they're additive, not exclusive.

**Known issues with parallel listeners include:**
- GitHub issue #584: Connect events sporadically delivered to wrong endpoints [GitHub](https://github.com/stripe/stripe-cli/issues/584)
- GitHub issue #711: All configured endpoints (local + remote) receive events simultaneously [github](https://github.com/stripe/stripe-cli/issues/711) [GitHub](https://github.com/stripe/stripe-cli/issues/711)  
- GitHub issue #1127: Platform listeners unexpectedly receive both direct and Connect events [GitHub](https://github.com/stripe/stripe-cli/issues/1127)

## Single listener with nginx fan-out is the recommended pattern

The most reliable architecture for multi-agent development runs **one Stripe CLI listener** that forwards to an nginx proxy, which then mirrors requests to all agent endpoints simultaneously: [Medium](https://alexjamesbrown.medium.com/using-nginx-to-send-webhooks-to-multiple-upstreams-alex-brown-9e773dda1b33)

```nginx
events {}
http {
    server {
        listen 8080;
        location / {
            mirror /agent1;
            mirror /agent2;
            mirror /agent3;
            proxy_pass http://127.0.0.1:9999/accepted;
        }
        location /agent1 { proxy_pass http://localhost:3001/webhook; }
        location /agent2 { proxy_pass http://localhost:3002/webhook; }
        location /agent3 { proxy_pass http://localhost:3003/webhook; }
        location /accepted { return 202; }
    }
}
```

Start the listener pointing to this proxy: `stripe listen --forward-to localhost:8080`. Every webhook event now reaches all three agent endpoints. This approach eliminates the routing inconsistencies that plague multiple CLI instances. [medium](https://alexjamesbrown.medium.com/using-nginx-to-send-webhooks-to-multiple-upstreams-alex-brown-9e773dda1b33)

For quick Docker-based setup, run nginx as a container:
```bash
docker run -d -p 8080:80 -v $(pwd)/webhook-fanout.conf:/etc/nginx/nginx.conf:ro nginx
```

## Using event filtering for agent specialization

If your agents handle different event types, the `--events` flag provides native filtering that reduces noise per agent:

```bash
# Payment-handling agent
stripe listen --events payment_intent.succeeded,charge.created \
  --forward-to localhost:3001/webhook

# Subscription-handling agent  
stripe listen --events customer.subscription.created,invoice.paid \
  --forward-to localhost:3002/webhook
```

This does require multiple CLI instances (one per agent), accepting the broadcast behavior where each filtered listener receives only its specified events. Combined with the fan-out pattern, you could run a single filtered listener that fans out to all agents interested in those event types.

## Environment configuration for tmux and long-running sessions

**Two environment variables take precedence** over all other configuration:

| Variable | Purpose |
|----------|---------|
| `STRIPE_API_KEY` | API key for authentication (bypasses login flow) |
| `STRIPE_DEVICE_NAME` | Device identifier shown in Dashboard |

For persistent tmux sessions, create a dedicated configuration:

```bash
# .env.stripe
export STRIPE_API_KEY=sk_test_...
export STRIPE_DEVICE_NAME=claude-agent-session
```

The `STRIPE_DEVICE_NAME` appears in **Workbench > Local Listeners** in the Stripe Dashboard and helps identify which agent/session is connected. It does not affect event routing—it's purely for identification. Setting a consistent device name maintains stable webhook signing secrets across session restarts.

For Docker-based setups, mount your config and use restart policies:
```yaml
services:
  stripe-cli:
    image: stripe/stripe-cli:latest
    restart: unless-stopped
    environment:
      - STRIPE_API_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_DEVICE_NAME=multi-agent-listener
    command: listen --forward-to webhook-proxy:8080 --skip-verify
```

## Event-driven fan-out with Redis pub/sub

For more sophisticated multi-agent architectures, a **Redis pub/sub pattern** provides durable message distribution:

```
[Stripe] → [stripe listen] → [Webhook Receiver] → [Redis Pub/Sub]
                                                       ├→ Agent A
                                                       ├→ Agent B  
                                                       └→ Agent C
```

The webhook receiver publishes each event to a Redis channel, and each agent subscribes independently. This pattern handles agent restarts gracefully and allows agents to come online at different times. However, Redis pub/sub has no message persistence—agents must be connected when events arrive, or use Redis Streams for durability.

## Alternative tools purpose-built for team workflows

**Hookdeck CLI** offers the most robust solution for multi-developer/multi-agent scenarios: [hookdeck](https://hookdeck.com/docs/use-cases/test-debug-localhost)

```bash
# Agent A filters for payment events
hookdeck listen 3001 stripe --filter-body '{"type": "payment_intent.succeeded"}'

# Agent B filters for subscription events  
hookdeck listen 3002 stripe --filter-body '{"type": "customer.subscription.updated"}'
```

Hookdeck provides per-session filtering, shared debugging dashboards, instant event replay (press `r`), and eliminates the "event stealing" problem where multiple developers compete for webhooks. [hookdeck](https://hookdeck.com/docs/use-cases/test-debug-localhost)

For Cloudflare-based deployments, the **stripe-multi-environment-webhook-handler** Worker routes webhooks based on metadata in your Stripe API calls. Add a `returnUrl` to metadata when creating objects, and the Worker parses this to forward events to the correct environment. [github](https://github.com/adshrc/stripe-multi-environment-webhook-handler) [GitHub](https://github.com/adshrc/stripe-multi-environment-webhook-handler)

## Practical gotchas and critical considerations

**Idempotency is essential.** Stripe may deliver the same webhook multiple times and does not guarantee ordering. [Medium](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5) Each agent must track processed event IDs:

```javascript
const processedEvents = new Set(); // Use Redis/database in production
if (processedEvents.has(event.id)) return;
await processEvent(event);
processedEvents.add(event.id);
```

**^C doesn't immediately stop the listener.** The CLI may show the listener as active in the Dashboard even after termination, continuing to forward events. [GitHub](https://github.com/stripe/stripe-cli/issues/1059) Always verify in Dashboard > Workbench that listeners are properly disconnected.

**Consider separate Stripe test accounts.** The cleanest isolation for multiple agents is using **different Stripe test-mode accounts** entirely. Each agent gets its own event stream with zero interference, eliminating all complexity around shared listeners and fan-out architecture.

## Conclusion

For multi-agent Stripe webhook development, avoid running multiple `stripe listen` instances directly—routing becomes unreliable. Instead, deploy a **single CLI listener with an nginx mirror proxy** that fans out to each agent's port. Use `STRIPE_API_KEY` and `STRIPE_DEVICE_NAME` environment variables for headless operation in tmux sessions. [GitHub](https://github.com/stripe/stripe-cli/wiki/using-stripe-api-keys) The webhook signing secret stays consistent across restarts, so all agents can verify using the same `whsec_...` value output when the listener starts. [GitHub](https://github.com/stripe/stripe-cli/wiki/listen-command) [Stripe](https://docs.stripe.com/webhooks) For teams with complex needs, Hookdeck CLI provides purpose-built multi-developer support with filtering and replay capabilities that the native Stripe CLI lacks.