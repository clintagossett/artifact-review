# ADR 0024: Agent API Routing via Next.js Rewrite

## Status

Accepted

## Context

The Agent API (`/api/v1/*`) allows AI agents and external integrations to interact with artifacts programmatically. We needed to decide how to expose this API:

1. **Direct Convex HTTP** - Agents hit `*.convex.site/api/v1/*` directly
2. **Next.js API routes** - Proxy through Next.js API routes
3. **Next.js rewrites** - Transparent proxy via `next.config.mjs`
4. **Custom subdomain** - `api.artifactreview.com` pointing to Convex

## Decision

We use **Next.js rewrites** to proxy `/api/v1/*` to the Convex HTTP endpoint.

```js
// next.config.mjs
async rewrites() {
  const convexHttpUrl = process.env.NEXT_PUBLIC_CONVEX_HTTP_URL;
  return [
    {
      source: '/api/v1/:path*',
      destination: `${convexHttpUrl}/api/v1/:path*`,
    },
  ];
}
```

### API URLs

| Environment | Agent API URL |
|-------------|---------------|
| Production | `https://artifactreview.com/api/v1/*` |
| Staging | `https://artifactreview-early.xyz/api/v1/*` |
| Local | `https://{agent}.loc/api/v1/*` |

### Webhook URLs (Direct to Convex)

Webhooks bypass the proxy and go directly to Convex HTTP:

| Webhook | URL |
|---------|-----|
| Stripe | `https://{deployment}.convex.site/stripe/webhook` |
| Resend | `https://{deployment}.convex.site/resend-webhook` |
| Novu Email | `https://{deployment}.convex.site/novu-email-webhook` |

## Rationale

### Why Next.js Rewrites (not direct Convex)?

1. **Single domain** - Agents use same domain as web app, simpler for users
2. **No CORS** - Same-origin requests, no preflight overhead
3. **Consistent branding** - `artifactreview.com/api/v1/*` not `adventurous-mosquito-571.convex.site`
4. **Future flexibility** - Can add middleware (rate limiting, logging) without changing client URLs

### Why not `api.` subdomain?

1. **Extra infrastructure** - Requires Convex custom domain setup per environment
2. **CORS complexity** - Cross-origin requires proper headers
3. **Current scale doesn't need it** - Vercel proxy latency (~10-20ms) is acceptable
4. **Migration cost** - Would need to update existing agent integrations

### Why webhooks go direct?

1. **Server-to-server** - No browser involved, CORS irrelevant
2. **Signature verification** - Webhook handlers verify signatures, proxy could interfere
3. **Lower latency** - One less hop for high-volume webhook traffic

## Consequences

### Positive

- Simple setup, already working
- Single domain for agents to remember
- Can add Vercel Edge middleware if needed
- Backwards compatible if we add `api.` subdomain later

### Negative

- Extra hop through Vercel for API requests (~10-20ms latency)
- Vercel request limits apply (not a concern at current scale)
- Can't use Convex-specific features like custom domains

## Future Considerations

If the product becomes **API-first** (agents as primary consumers), consider:

1. Add `api.artifactreview.com` subdomain pointing to Convex custom domain
2. Keep `/api/v1/*` rewrite for backwards compatibility
3. Document both options, recommend subdomain for new integrations

## Related

- `app/next.config.mjs` - Rewrite configuration
- `app/convex/http.ts` - Convex HTTP routes
- ADR 0022 - Stripe webhook multi-deployment filtering
