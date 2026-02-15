# API Rate Limiting

Artifact Review implements comprehensive rate limiting to ensure fair resource allocation and prevent abuse. All API endpoints are subject to rate limiting based on authentication context and subscription tier.

## Overview

Rate limiting is applied hierarchically across three levels:

1. **API Key Level** (Most specific) - Limits for individual API keys
2. **User Level** - Cumulative limits across all of a user's API keys
3. **Organization Level** (Least specific) - Shared limits for all org members

When a request is made, rate limits are checked in order. The request fails on the first exceeded limit.

## Default Rate Limits

Default limits apply when no custom overrides or plan-specific limits are configured:

| Endpoint Type | Limit | Description |
|---------------|-------|-------------|
| Authentication | 10/min | Login attempts, password resets |
| Read operations | 300/min | GET requests, artifact listing |
| Write operations | 60/min | POST/PATCH/DELETE requests |
| File uploads | 20/min | Artifact uploads with file processing |
| Public endpoints | 100/min | Unauthenticated share link access |

## Plan-Based Limits

Subscription plans can define custom rate limits that override global defaults:

| Plan | Read/min | Write/min | Upload/min | Auth/min | Public/min |
|------|----------|-----------|------------|----------|------------|
| **Free** | 100 | 20 | 5 | 10 | 50 |
| **Pro** | 1,000 | 200 | 50 | 50 | 500 |
| **Enterprise** | Custom | Custom | Custom | Custom | Custom |

## Custom Overrides

Organization owners can set custom rate limits for:
- Entire organization
- Specific users within their organization
- Specific API keys owned by org members

Overrides can:
- **Increase** limits (premium customers, special events)
- **Decrease** limits (abuse prevention, free tier restrictions)
- **Expire** automatically (temporary promotions)

### Setting Custom Overrides

Custom overrides are managed through the Convex API (UI coming in future release):

```typescript
// Set organization-wide override
await ctx.runMutation(api.rateLimitOverrides.setOverride, {
  targetOrganizationId: orgId,
  limitType: "read",
  customLimit: 2000,
  reason: "Premium enterprise customer",
});

// Set user-specific override
await ctx.runMutation(api.rateLimitOverrides.setOverride, {
  targetOrganizationId: orgId,
  targetUserId: userId,
  limitType: "upload",
  customLimit: 100,
  reason: "Power user - increased upload quota",
});

// Set temporary override with expiration
await ctx.runMutation(api.rateLimitOverrides.setOverride, {
  targetOrganizationId: orgId,
  limitType: "write",
  customLimit: 500,
  reason: "Black Friday promotion",
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

### Listing Overrides

Organization owners can view all active overrides:

```typescript
const overrides = await ctx.runQuery(api.rateLimitOverrides.listOverrides, {
  organizationId: orgId,
});
```

### Deleting Overrides

Overrides are soft-deleted to preserve audit trail:

```typescript
await ctx.runMutation(api.rateLimitOverrides.deleteOverride, {
  overrideId: overrideId,
});
```

## Rate Limit Resolution

When determining the effective rate limit, the system checks in priority order:

1. **Custom override** (from `rateLimitOverrides` table)
   - API key override (if applicable)
   - User override (if applicable)
   - Organization override (if applicable)
2. **Plan limit** (from subscription → plan.limits)
3. **Global default** (from environment config)

**First match wins.** This allows fine-grained control while maintaining reasonable defaults.

## HTTP Response Headers

All API responses include rate limit headers:

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1641234567
```

When rate limit is exceeded (HTTP 429):

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 42
X-RateLimit-Limit: 300

{
  "error": "Rate limit exceeded",
  "retryAfter": 42
}
```

## Error Handling

### Client-Side

When receiving a 429 response:

1. Read `Retry-After` header (seconds until reset)
2. Implement exponential backoff with jitter
3. Display user-friendly error message
4. Consider queuing requests locally

**Example retry logic:**

```typescript
async function retryWithBackoff(request, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await request();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const retryAfter = parseInt(error.headers.get('Retry-After') || '1');
        const jitter = Math.random() * 1000; // 0-1s random jitter
        await sleep((retryAfter * 1000) + jitter);
        continue;
      }
      throw error;
    }
  }
}
```

### Server-Side

Rate limit errors are caught and converted to proper HTTP responses:

```typescript
try {
  await checkRateLimit(ctx, {
    limitName: "uploadEndpoint",
    key: userId,
    userId,
    organizationId,
  });
  // ... handle request
} catch (err) {
  if (err instanceof RateLimitError) {
    const { status, body, headers } = err.toResponse();
    return new Response(JSON.stringify(body), { status, headers });
  }
  throw err;
}
```

## Token Bucket Algorithm

Rate limits use the **token bucket** algorithm, which allows for burst traffic while maintaining average rates:

- **Rate**: Tokens added per period (e.g., 300/min)
- **Capacity**: Maximum accumulated tokens (typically 1.5x rate)
- **Period**: Time window for token refill (typically 1 minute)

**Benefits:**
- Smooth handling of bursty traffic
- Better UX than fixed windows
- Natural grace period after inactivity

**Example:** A user with 300/min limit can make 450 requests immediately after idle period, then throttled to 300/min average.

## Environment Configuration

Rate limiting behavior is controlled by environment variables:

| Environment | `RATE_LIMIT_ENABLED` | `RATE_LIMIT_MULTIPLIER` | Effective Limits |
|-------------|---------------------|------------------------|------------------|
| **Development** | `false` or `true` | `100.0` | Effectively unlimited |
| **Test/CI** | `false` | N/A | Disabled |
| **Staging** | `true` | `10.0` | 10x production limits |
| **Production** | `true` | `1.0` | Real limits |

Set in `app/.env.convex.local`:

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MULTIPLIER=1.0
```

## Monitoring & Alerts

### Rate Limit Events

All rate limit hits are logged:

```typescript
log.warn(Topics.Security, "Rate limit exceeded", {
  limitName: "uploadEndpoint",
  key: userId,
  scope: "user",
  retryAfter: 42000,
});
```

### Recommended Alerts

Set up alerts for:
- **High 429 rate** (>5% of requests) - May indicate limits are too strict
- **Rapid 429 spikes** - Possible attack or misconfigured client
- **Consistent 429s from single user/key** - Abuse or legitimate heavy user

## Best Practices

### For API Clients

1. **Respect `Retry-After` headers** - Don't retry immediately
2. **Implement exponential backoff** - With jitter to prevent thundering herd
3. **Cache responses** - Reduce redundant API calls
4. **Batch operations** - Combine multiple requests when possible
5. **Monitor your own usage** - Stay within limits proactively

### For API Consumers

1. **Choose appropriate plan** - Match limits to expected usage
2. **Request custom limits early** - Before hitting production
3. **Handle 429s gracefully** - Don't fail hard on rate limits
4. **Distribute load** - Avoid burst patterns when possible

### For Platform Operators

1. **Monitor 429 rates** - Track by endpoint, user, and organization
2. **Review override requests** - Ensure legitimate business needs
3. **Audit custom limits** - Expire outdated overrides
4. **Tune defaults** - Based on actual usage patterns
5. **Document limits** - Keep API docs updated

## Troubleshooting

### "Rate limit exceeded" but I'm under my plan limit

Check for:
- **Hierarchical limits** - API key limit may be lower than user limit
- **Custom overrides** - Organization may have reduced limits
- **Multiple clients** - Sharing the same API key

### Custom override not applying

Verify:
- **Override is active** - Not soft-deleted
- **Not expired** - Check `expiresAt` timestamp
- **Correct scope** - User/org/key matches the target
- **Permission** - Only org owners can set overrides

### Rate limits too strict for legitimate use

Options:
1. **Upgrade plan** - Higher tiers have higher limits
2. **Request custom override** - Contact support with business case
3. **Optimize usage** - Cache, batch, reduce polling frequency

## Security Considerations

### Abuse Prevention

Rate limiting protects against:
- **Brute force attacks** - Login/API key attempts
- **DoS attacks** - Resource exhaustion
- **Credential stuffing** - Automated account takeover
- **Data scraping** - Bulk data extraction
- **Spam** - Comment/upload abuse

### IP-Based Limitations

**We do NOT rate limit by IP address** due to:
- Shared IPs (corporate networks, Cloudflare)
- Privacy concerns
- NAT gateway collisions
- Dynamic IP rotations

Instead, we use:
- **Session IDs** for unauthenticated users
- **API keys** for authenticated requests
- **User IDs** for aggregated limits

### Captcha Integration (Future)

For unauthenticated public endpoints, consider adding:
- Captcha challenge on first rate limit hit
- Session validation before allowing access
- Progressive challenges (harder for repeated violations)

## API Reference

### Check Rate Limit Programmatically

```typescript
import { checkRateLimit } from "./lib/rateLimit";

// In a query or mutation
await checkRateLimit(ctx, {
  limitName: "readEndpoint",
  key: userId,
  userId,
  organizationId,
});
```

### Rate Limit Configuration Types

```typescript
type LimitName =
  | "authAttempt"      // Authentication endpoints
  | "readEndpoint"     // Read operations
  | "writeEndpoint"    // Write operations
  | "uploadEndpoint"   // File uploads
  | "publicEndpoint";  // Public/unauthenticated

type LimitType =
  | "auth"
  | "read"
  | "write"
  | "upload"
  | "public";
```

## Support

For questions or custom limit requests:
- **Documentation**: This document + inline code comments
- **Support**: Contact your account manager
- **Status**: Check system status for rate limit issues

---

**Last Updated:** 2026-02-07
**Version:** 1.0.0
**Related:** [Architecture Decisions](../architecture/decisions/), [API Documentation](./README.md)
