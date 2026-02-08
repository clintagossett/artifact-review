# Task 00107: Rate Limiting Strategy Research

**Issue:** [#107 - feat: Implement API rate limiting strategy](https://github.com/clintagossett/artifact-review/issues/107)

**Status:** Research Complete - Ready for Implementation Decision

**Date:** 2026-02-07

---

## Executive Summary

**Recommendation: Use `@convex-dev/rate-limiter` component** for all rate limiting needs.

This is the official, battle-tested solution built by the Convex team specifically for application-layer rate limiting. It provides:
- Type-safe, transactional rate limiting
- Token bucket & fixed window algorithms
- Built-in sharding for scalability
- Fails closed (not open) to prevent cascading failures
- Native Convex integration with zero external dependencies

Alternative approaches (Edge middleware, custom Convex tables) were evaluated but the official component is superior for our use case.

---

## Research Findings

### 1. Convex Official Rate Limiter Component

**Package:** [`@convex-dev/rate-limiter`](https://www.convex.dev/components/rate-limiter)

**Sources:**
- [Rate Limiter Component Documentation](https://www.convex.dev/components/rate-limiter)
- [GitHub Repository](https://github.com/get-convex/rate-limiter)
- [Stack Article: Rate Limiting at the Application Layer](https://stack.convex.dev/rate-limiting)
- [Convex Agent Rate Limiting Docs](https://docs.convex.dev/agents/rate-limiting)
- [NPM Package](https://www.npmjs.com/package/@convex-dev/rate-limiter)

#### Key Features

| Feature | Description |
|---------|-------------|
| **Algorithms** | Token bucket (recommended for most use cases) & fixed window |
| **Transactional** | All rate limit changes roll back if mutation fails |
| **Type-Safe** | Won't accidentally misspell rate limit names |
| **Sharding** | Distribute capacity across multiple buckets for high throughput |
| **Fairness** | Credit "reservation" prevents small requests from starving large ones |
| **Fail Mode** | Fails closed (blocks when overwhelmed), not open (doesn't cascade) |

#### Installation

```bash
npm install @convex-dev/rate-limiter
```

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();
app.use(rateLimiter);
export default app;
```

#### Usage Examples

```typescript
import { components } from "./_generated/api";

// Global rate limit (no key)
await components.rateLimiter.limit(ctx, "freeTrialSignUp", {
  rate: 10,
  period: 60_000, // 1 minute
});

// Per-user limit (with key)
await components.rateLimiter.limit(ctx, "sendMessage", {
  key: userId,
  rate: 60,
  period: 60_000,
});

// Per-API-key limit (custom count)
await components.rateLimiter.limit(ctx, "apiRequestsByKey", {
  key: apiKey,
  rate: 300,
  period: 60_000,
  throws: true, // Auto-throw on limit exceeded
});

// Check without consuming
const status = await components.rateLimiter.check(ctx, "failedLogins", {
  key: userId,
});

// Reset on successful login
await components.rateLimiter.reset(ctx, "failedLogins", {
  key: userId,
});
```

#### Rate Limit Configuration

The component supports flexible configuration:

```typescript
// Token Bucket (recommended)
{
  kind: "token bucket",
  rate: 100,        // Tokens per period
  period: 60_000,   // 1 minute in ms
  capacity: 150,    // Max accumulated tokens
  shards: 10,       // For high throughput
}

// Fixed Window
{
  kind: "fixed window",
  rate: 100,
  period: 60_000,
  maxReserved: 150,
}
```

#### Sharding for Scalability

**Problem:** High-throughput rate limits can cause database contention.

**Solution:** Sharding distributes capacity across multiple buckets.

**Guidance:**
- Each shard should have 5-10+ capacity
- Divide max queries-per-second by two for shard count
- Example: 1000 req/min → 10 shards

**Tradeoff:** Occasionally allows requests when global capacity is exceeded (but never violates upper bound).

#### Performance Characteristics

**Storage:** Only 2 numbers per rate limit (`value` and `ts`), not per-request.

**Database Requirements:** Requires ACID guarantees and serializable isolation (Convex provides this natively).

**Overhead:** Minimal - simple math operations with efficient indexing.

---

### 2. Alternative: convex-helpers Rate Limit

**Package:** [`convex-helpers`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/rateLimit.ts)

**Status:** ⚠️ **Superseded by official component** (per library maintainer)

#### Pros
- Lightweight, minimal dependencies
- Educational value for understanding rate-limiting internals
- No component installation required

#### Cons
- Manual schema setup required
- Less optimized than official component
- No built-in sharding support
- Developer must handle thundering herd with jitter
- Explicitly deprecated in favor of `@convex-dev/rate-limiter`

**Verdict:** Only use for learning or prototyping. Production should use the component.

---

### 3. Alternative: Vercel Edge Middleware

**Sources:**
- [Vercel Edge Middleware Rate Limit Template](https://vercel.com/templates/edge-middleware/middleware-rate-limit)
- [Upstash Blog: Rate Limiting with Vercel Edge](https://upstash.com/blog/edge-rate-limiting)
- [DEV.to: 4 Best Rate Limiting Solutions for Next.js](https://dev.to/ethanleetech/4-best-rate-limiting-solutions-for-nextjs-apps-2024-3ljj)

#### How It Works

```typescript
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      },
    });
  }

  return NextResponse.next();
}
```

#### Pros
- Blocks requests before hitting backend
- Reduces backend load during attacks
- Works for any backend (not Convex-specific)
- Native HTTP response headers

#### Cons
- **Requires external service** (Upstash Redis, Vercel KV)
- **Additional cost** (Redis hosting)
- **Separate from Convex** - harder to integrate with API keys/user IDs
- **IP-based limitations** (see below)
- **Not aware of Convex auth context** - can't key by userId or API key without extra work

**Verdict:** Overkill for our use case. Better suited for DDoS protection or apps with extreme traffic.

---

### 4. IP-Based Rate Limiting Challenges

**Sources:**
- [Stackademic: We Rate Limited by IP. Cloudflare Users Got Blocked.](https://blog.stackademic.com/we-rate-limited-by-ip-cloudflare-users-got-blocked-1c37a2ac6069)
- [Convex Agent Rate Limiting Docs](https://docs.convex.dev/agents/rate-limiting)

#### The Problem

**Shared IPs:** Many legitimate users may share a single IP address:
- Corporate networks
- University campuses
- ISP NAT gateways
- **Cloudflare proxy** (most common)
- Mobile carrier proxies

**Result:** Rate limiting by IP alone can block legitimate users.

#### Convex Recommendation

From the [Convex docs](https://docs.convex.dev/agents/rate-limiting):

> Rather than IP-based tracking, use **Captcha-based authorization** where anonymous users submit a captcha to prove they're not bots and associate the successful captcha with their session ID.

**For our use case:**
- ✅ **Authenticated users:** Rate limit by `userId` (no IP needed)
- ✅ **API keys:** Rate limit by `apiKeyId` (no IP needed)
- ⚠️ **Unauthenticated:** Rate limit by **session ID** (generated on first visit)
- 🔒 **Bot protection:** Add Captcha challenge if session ID exceeds limits

**IP as secondary signal:** We can track IP for abuse detection/logging, but NOT as primary rate limit key.

---

## Current System Analysis

### Existing API Key Infrastructure

**File:** `app/convex/apiKeys.ts`

The project already has a robust API key system:

```typescript
// Schema
apiKeys: defineTable({
  createdBy: v.id("users"),
  agentId: v.optional(v.id("agents")),
  name: v.string(),
  prefix: v.string(),
  keyHash: v.string(),
  scopes: v.array(v.string()),
  expiresAt: v.optional(v.number()),
  lastUsedAt: v.optional(v.number()),
  lastUsedIp: v.optional(v.string()),
  // ...
})
```

**Perfect for rate limiting:**
- `apiKeys` table already indexed for lookups
- `validateInternal` query checks auth and expiration
- Can key rate limits by `apiKeyId` or `userId`

---

## Recommended Implementation Strategy

### Phase 1: Install and Configure Component

```bash
npm install @convex-dev/rate-limiter
```

```typescript
// convex/convex.config.ts (create if doesn't exist)
import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();
app.use(rateLimiter);
export default app;
```

### Phase 2: Define Rate Limit Configs

```typescript
// convex/lib/rateLimits.ts
import { HOUR, MINUTE, SECOND } from "@convex-dev/rate-limiter";

export const RATE_LIMITS = {
  // Auth endpoints - strict limits
  loginAttempt: {
    kind: "token bucket" as const,
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },

  // API key validation - moderate limits
  apiKeyValidation: {
    kind: "token bucket" as const,
    rate: 60,
    period: MINUTE,
    capacity: 100,
  },

  // Read endpoints - generous limits
  readArtifact: {
    kind: "token bucket" as const,
    rate: 300,
    period: MINUTE,
    capacity: 500,
  },

  // Write endpoints - tighter limits
  createArtifact: {
    kind: "token bucket" as const,
    rate: 60,
    period: MINUTE,
    capacity: 100,
  },

  // File uploads - very tight limits
  uploadFile: {
    kind: "token bucket" as const,
    rate: 20,
    period: MINUTE,
    capacity: 30,
  },

  // Unauthenticated public views - per session ID
  publicView: {
    kind: "token bucket" as const,
    rate: 100,
    period: MINUTE,
    capacity: 150,
  },
};
```

### Phase 3: Create Helper Middleware

```typescript
// convex/lib/rateLimit.ts
import { components } from "../_generated/api";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { RATE_LIMITS } from "./rateLimits";

export async function checkRateLimit(
  ctx: MutationCtx | QueryCtx,
  limitName: keyof typeof RATE_LIMITS,
  key?: string
) {
  const config = RATE_LIMITS[limitName];
  const result = await components.rateLimiter.limit(ctx, limitName, {
    ...config,
    key,
    throws: false, // Don't auto-throw, let us handle it
  });

  if (!result.ok) {
    throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter}ms`, {
      cause: {
        retryAfter: result.retryAfter,
        limit: config.rate,
        period: config.period,
      }
    });
  }

  return result;
}

export async function withRateLimit<T>(
  ctx: MutationCtx | QueryCtx,
  limitName: keyof typeof RATE_LIMITS,
  key: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  await checkRateLimit(ctx, limitName, key);
  return fn();
}
```

### Phase 4: Apply to Endpoints

**Example: API Key Authentication**

```typescript
// convex/http.ts (API key validation endpoint)
import { checkRateLimit } from "./lib/rateLimit";

export default httpRouter()
  .route({
    path: "/api/validate-key",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      const { key } = await request.json();
      const keyHash = await hashKey(key);
      const prefix = key.substring(0, 12);

      // Rate limit by key prefix (before even validating)
      try {
        await checkRateLimit(ctx, "apiKeyValidation", prefix);
      } catch (err) {
        return new Response(JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: err.cause.retryAfter,
        }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": err.cause.limit.toString(),
            "Retry-After": Math.ceil(err.cause.retryAfter / 1000).toString(),
          },
        });
      }

      // Validate key...
    }),
  });
```

**Example: Mutation with API Key**

```typescript
// convex/artifacts.ts
export const create = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    // Rate limit by user ID
    await checkRateLimit(ctx, "createArtifact", userId);

    // Create artifact...
  },
});
```

**Example: Unauthenticated Public View**

```typescript
// convex/artifacts.ts
export const getByShareToken = query({
  args: {
    shareToken: v.string(),
    sessionId: v.string(), // Generated client-side, stored in cookie
  },
  handler: async (ctx, args) => {
    // Rate limit by session ID (not IP!)
    await checkRateLimit(ctx, "publicView", args.sessionId);

    const artifact = await ctx.db
      .query("artifacts")
      .withIndex("by_shareToken", q => q.eq("shareToken", args.shareToken))
      .first();

    // Return artifact...
  },
});
```

### Phase 5: Add Response Headers (HTTP Routes)

For HTTP endpoints, return standard rate limit headers:

```typescript
function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
    ...(result.ok ? {} : {
      "Retry-After": Math.ceil(result.retryAfter / 1000).toString(),
    }),
  };
}
```

---

## Suggested Rate Limits (Starting Point)

Per Issue #107, here are the recommended limits:

| Endpoint Type | Limit | Key | Notes |
|---------------|-------|-----|-------|
| **Auth/login** | 10/min | IP or session ID | Prevents brute force |
| **API key validation** | 60/min | API key prefix | Before even validating |
| **Read endpoints (authenticated)** | 300/min | userId | Generous for normal use |
| **Write endpoints (authenticated)** | 60/min | userId | Tighter control |
| **File uploads (authenticated)** | 20/min | userId | Most expensive operation |
| **Public views (unauthenticated)** | 100/min | sessionId | Not IP! |

**Token Bucket advantages:**
- Allows bursts after inactivity
- Smoother user experience than fixed window
- Recommended by Convex for most use cases

**Tuning:** Start with these values, monitor in production, adjust based on actual usage patterns.

---

## Prerequisites for Implementation

### 1. Session ID Generation (Client-Side)

For unauthenticated rate limiting, we need session IDs:

```typescript
// app/lib/session.ts
export function getOrCreateSessionId(): string {
  const COOKIE_NAME = "ar_session_id";
  const existing = getCookie(COOKIE_NAME);
  if (existing) return existing;

  const sessionId = crypto.randomUUID();
  setCookie(COOKIE_NAME, sessionId, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  });
  return sessionId;
}
```

Pass this to all unauthenticated queries:

```typescript
const sessionId = getOrCreateSessionId();
const artifact = await convex.query(api.artifacts.getByShareToken, {
  shareToken,
  sessionId,
});
```

### 2. Error Handling Standardization

Create a custom error class for rate limit errors:

```typescript
// convex/lib/errors.ts
export class RateLimitError extends Error {
  constructor(
    public retryAfter: number,
    public limit: number,
    public period: number
  ) {
    super(`Rate limit exceeded. Retry after ${retryAfter}ms`);
    this.name = "RateLimitError";
  }
}
```

### 3. Monitoring and Observability

Add logging for rate limit events:

```typescript
import { createLogger, Topics } from "./lib/logger";

const log = createLogger("rateLimit");

// When limit is hit
log.warn(Topics.Security, "Rate limit exceeded", {
  limitName,
  key,
  retryAfter: result.retryAfter,
});

// Periodic stats (via scheduled function)
log.info(Topics.Analytics, "Rate limit stats", {
  limitName,
  totalRequests,
  blockedRequests,
  blockRate: blockedRequests / totalRequests,
});
```

---

## Trade-offs and Considerations

### Convex Component vs Edge Middleware

| Factor | Convex Component | Edge Middleware |
|--------|------------------|-----------------|
| **Integration** | Native, zero config | Requires external service |
| **Cost** | Included | Extra Redis cost |
| **Auth Context** | ✅ Full access to userId, apiKey | ❌ Only sees IP/headers |
| **Granularity** | Per-user, per-key, per-resource | Typically IP-only |
| **Backend Load** | Minimal overhead | Blocks before backend |
| **Complexity** | Low | Medium-High |
| **DDoS Protection** | Application-layer only | Network + Application |

**For Artifact Review:** Convex component is the clear winner. We don't have extreme traffic that requires CDN-level blocking.

### Token Bucket vs Fixed Window

| Algorithm | Pros | Cons | Use Case |
|-----------|------|------|----------|
| **Token Bucket** | - Handles bursts gracefully<br>- Smoother UX<br>- Recommended by Convex | - Slightly more complex | Most endpoints |
| **Fixed Window** | - Strict limits<br>- Simpler to reason about | - Can't burst<br>- Harsh on users | Compliance-heavy APIs |

**For Artifact Review:** Token bucket for all endpoints except where compliance requires strict windows.

### Sharding vs No Sharding

**When to use sharding:**
- Global rate limits (not per-user)
- High throughput (100+ QPS on a single limit)
- Example: Public file serving endpoint

**When NOT to use sharding:**
- Per-user or per-key limits (already distributed)
- Low throughput endpoints
- Most mutations

**For Artifact Review:** Only shard if we add public file serving with thousands of concurrent users.

---

## Gotchas and Best Practices

### 1. Thundering Herd

**Problem:** All clients retry at exactly `retryAfter` seconds, causing a spike.

**Solution:** Add jitter to retry times:

```typescript
const retryAfter = result.retryAfter;
const jitter = Math.random() * 1000; // 0-1s jitter
const actualRetry = retryAfter + jitter;
```

### 2. Clock Sync

**Problem:** Browser/server clock skew can cause incorrect retry times.

**Solution:** Return Unix timestamp instead of relative time:

```typescript
const resetAt = Date.now() + result.retryAfter;
return {
  error: "Rate limit exceeded",
  resetAt, // Absolute timestamp
};
```

### 3. Multiple Rate Limits

**Problem:** If checking multiple limits, need to consume them atomically.

**Solution:** Convex transactions handle this automatically:

```typescript
// Both limits consumed or neither (if function throws)
await checkRateLimit(ctx, "createArtifact", userId);
await checkRateLimit(ctx, "uploadFile", userId);
await ctx.db.insert("artifacts", { /* ... */ });
```

### 4. Testing Rate Limits

**Challenge:** Hard to test time-based logic.

**Solution:** Use reserved capacity feature:

```typescript
// Test: consume capacity in advance
await components.rateLimiter.limit(ctx, "testLimit", {
  rate: 10,
  period: 60_000,
  reserved: 5, // Pre-allocate 5 tokens for future work
});

// Later: use those reserved tokens
await components.rateLimiter.limit(ctx, "testLimit", {
  count: 5,
  useReserved: true,
});
```

---

## Next Steps

### Immediate Actions

1. ✅ Research complete - Create GitHub issue comment with summary
2. ⏭️ Get stakeholder approval for Convex component approach
3. ⏭️ Create implementation plan with subtasks
4. ⏭️ Install `@convex-dev/rate-limiter` component

### Implementation Subtasks (TBD)

1. Install and configure rate limiter component
2. Define rate limit configs in `convex/lib/rateLimits.ts`
3. Implement session ID generation (client-side)
4. Create rate limit helper middleware
5. Apply to auth endpoints (login, API key validation)
6. Apply to write endpoints (mutations)
7. Apply to read endpoints (queries)
8. Add HTTP response headers for HTTP routes
9. Add monitoring and logging
10. Write tests for rate limit behavior
11. Update API documentation
12. Monitor in staging for 1 week
13. Deploy to production with monitoring

---

## References

### Documentation
- [Convex Rate Limiter Component](https://www.convex.dev/components/rate-limiter)
- [Stack: Rate Limiting at the Application Layer](https://stack.convex.dev/rate-limiting)
- [Convex Agent Rate Limiting Docs](https://docs.convex.dev/agents/rate-limiting)

### Source Code
- [get-convex/rate-limiter on GitHub](https://github.com/get-convex/rate-limiter)
- [convex-helpers rateLimit.ts](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/rateLimit.ts)

### Best Practices
- [Vercel Edge Middleware Rate Limiting](https://vercel.com/templates/edge-middleware/middleware-rate-limit)
- [Upstash Blog: Rate Limiting with Vercel Edge](https://upstash.com/blog/edge-rate-limiting)
- [OWASP Rate Limiting Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

### Gotchas
- [Stackademic: We Rate Limited by IP. Cloudflare Users Got Blocked.](https://blog.stackademic.com/we-rate-limited-by-ip-cloudflare-users-got-blocked-1c37a2ac6069)

---

## Decision Log

**Date:** 2026-02-07
**Decision:** Recommend `@convex-dev/rate-limiter` component
**Rationale:**
- Official Convex solution with native integration
- No external dependencies or additional costs
- Full access to auth context (userId, apiKey)
- Type-safe, transactional, and production-ready
- Handles all our use cases without complexity of Edge middleware

**Rejected Alternatives:**
- ❌ **convex-helpers:** Superseded by official component
- ❌ **Edge Middleware:** Overkill, adds cost, loses auth context
- ❌ **Custom Convex Tables:** Reinventing the wheel, no sharding support

**Next Milestone:** Implementation planning and subtask breakdown
