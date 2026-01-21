# Agent Collaboration API - Architecture Design

**Status:** Draft
**Date:** 2026-01-19
**Related Task:** [#39](https://github.com/clintagossett/artifact-review/issues/39)
**Follows:** ADR-0012 (Naming Conventions)

---

## Overview

This document defines the architecture for the Agent Collaboration API, enabling AI agents (Claude, ChatGPT, Cursor, etc.) to interact programmatically with Artifact Review.

**Key Concept: Agent Profiles**

Users can create "Agent Profiles" within their account to represent different AI assistants or workflows.
- **The "Profile" Model:** An Agent is a "sub-account" or "persona" owned by a User.
- **Identity:** Defined by system ID (`agents` table) and non-unique Name ("Claude").
- **Attribution:** "Claude" is the actor; the API Key is just the credential.

```
User (Owner)
 ├── Profile: "Me" (Default) --------- [API Key A]
 └── Profile: "Claude" (Agent) ------- [API Key B]
                                       [API Key C]
```

---

## Proposed Database Schema

Following ADR-0012 naming conventions:
- `camelCase` fields
- `createdBy` for record creator
- `by_camelCaseField` index pattern
- `_active` suffix for soft-delete indexes
- **Polymorphism Strategy:** Sparse Fields (User + Agent)

### New Tables

#### 1. `agents` - Agent Identity Registry

The "human invitee" equivalent for bots.

```typescript
agents: defineTable({
  // ---- Ownership ----
  ownerId: v.id("users"),            // The human responsible for this agent
  
  // ---- Identity ----
  name: v.string(),                  // "Claude", "Auto-Fixer", "Review Bot"
  avatar: v.optional(v.string()),    // URL or emoji
  
  // ---- Metadata ----
  role: v.string(),                  // "coding", "qa", "product"
  description: v.optional(v.string()),
  
  // ---- Audit ----
  createdAt: v.number(),
  updatedAt: v.number(),
  
  // ---- Soft Delete ----
  isDeleted: v.boolean(),
})
  .index("by_ownerId_active", ["ownerId", "isDeleted"])
```

### Decision: Why not just make Agents "Users"?

We considered simply creating `users` records for agents to solve polymorphism (one table for all actors). We rejected this because:
1.  **Auth Complexity:** `users` usually require an Identity Provider (Clerk/Auth0) and email. Agents don't have these.
2.  **Billing:** `users` are billing entities. Agents are *resources* owned by a billing entity.
3.  **Cleanliness:** Identifying "bot users" vs "human users" in a shared table leads to messy queries and logic (e.g., `WHERE isBot = false`).

**Verdict:** Separate `agents` table is cleaner, linked via Sparse Fields strategy.

#### 2. `apiKeys` - API Key Management

```typescript
apiKeys: defineTable({
  // ---- Identity ----
  userId: v.id("users"),             // Owning user
  agentId: v.optional(v.id("agents")), // Linked Agent Identity (optional)
  name: v.string(),                  // Key Label: "Laptop Key", "CI Server"
  
  // ---- Key Data ----
  prefix: v.string(),                // First 8 chars for display: "ar_live_"
  keyHash: v.string(),               // Hashed key
  
  // ---- Permissions ----
  scopes: v.array(v.string()),       // ["full"] for v1
  
  // ---- Lifetime ----
  expiresAt: v.optional(v.number()), // Unix timestamp, undefined = never
  
  // ---- Usage Tracking ----
  lastUsedAt: v.optional(v.number()),
  lastUsedIp: v.optional(v.string()),
  
  // ---- Audit (ADR-0012) ----
  createdAt: v.number(),
  createdBy: v.id("users"),
  
  // ---- Soft Delete (ADR-0011) ----
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
})
  .index("by_userId_active", ["userId", "isDeleted"])
  .index("by_prefix", ["prefix"])
  .index("by_keyHash", ["keyHash"])
```

#### 2. `webhooks` - Webhook Subscriptions (Phase 2)

```typescript
webhooks: defineTable({
  // ---- Owner ----
  userId: v.id("users"),
  apiKeyId: v.optional(v.id("apiKeys")), // Which key registered this
  
  // ---- Configuration ----
  url: v.string(),                   // Webhook endpoint URL
  events: v.array(v.string()),       // ["comment.created", "comment.reply"]
  
  // ---- Filtering ----
  artifactId: v.optional(v.id("artifacts")), // Filter to specific artifact
  
  // ---- Security ----
  secret: v.string(),                // Signing secret (hashed)
  
  // ---- Health ----
  lastDeliveryAt: v.optional(v.number()),
  lastDeliveryStatus: v.optional(v.string()), // "success", "failed"
  consecutiveFailures: v.number(),
  isDisabled: v.boolean(),           // Auto-disabled after failures
  
  // ---- Audit ----
  createdAt: v.number(),
  createdBy: v.id("users"),
  
  // ---- Soft Delete ----
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
  .index("by_userId_active", ["userId", "isDeleted"])
  .index("by_artifactId_active", ["artifactId", "isDeleted"])
```

---

## Agent Identity System

### The Concept

Actions are attributed to the **User** (responsibility) and optionally an **Agent** (mechanism).

```
Comment by: Clint Gossett via Claude
            └── user.name ──┘    └── agent.name ──┘
```

**Why this model?**
- **User** is always the legal owner/payer/admin.
- **Agent** is the stable identity performing the work.
- **Key** is just the transient credential.

### Schema Impact

#### Modified: `comments` (add agent fields)

```typescript
// Add to existing comments table:
userId: v.id("users"),                 // Always present (owner)
agentId: v.optional(v.id("agents")),   // The stable agent identity
agentName: v.optional(v.string()),     // Denormalized for display
// Note: We do NOT store apiKeyId here. History should survive key rotation.
```

#### Modified: `artifactVersions` (add agent fields)

```typescript
// Add to existing artifactVersions table:
userId: v.id("users"),                 // Always present (owner)
agentId: v.optional(v.id("agents")),   // The stable agent identity
agentName: v.optional(v.string()),     // Denormalized for display
```

### Display Logic

```typescript
function getDisplayAuthor(record: { 
  createdBy: Id<"users">, 
  agentId?: Id<"apiKeys">,
  agentName?: string 
}, user: User): string {
  if (record.agentId && record.agentName) {
    return `${user.name} via ${record.agentName}`;
  }
  return user.name;
}

// Examples:
// "Clint Gossett" - direct user action
// "Clint Gossett via Claude Home" - agent action
// "Clint Gossett via CI/CD Pipeline" - automation
```

---

## API Authentication Flow

### Key Validation

```
Request with X-API-Key header
        │
        ▼
┌───────────────────┐
│ Extract prefix    │
│ (first 8 chars)   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Query by_prefix   │
│ index             │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Verify keyHash    │
│ matches           │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Check expiration  │
│ and isDeleted     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Load user from    │
│ apiKey.userId     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Apply rate limits │
│ based on tier     │
└────────┬──────────┘
         │
         ▼
    Process request
```

### Rate Limiting (via @convex-dev/rate-limiter)

```typescript
import { RateLimiter } from "@convex-dev/rate-limiter";

const rateLimiter = new RateLimiter(components.rateLimiter, {
  apiKeyHourly: { kind: "fixed window", rate: 1000, period: "hour" },
});

// In HTTP route handler:
const { ok, retryAfter } = await rateLimiter.limit(ctx, "apiKeyHourly", { key: apiKeyId });
if (!ok) {
  return new Response(JSON.stringify({ error: "rate_limit_exceeded" }), {
    status: 429,
    headers: { "Retry-After": String(retryAfter) },
  });
}
```

---

## HTTP Routes Structure

```
app/convex/http.ts

/api/v1/artifacts
  POST   → create artifact (apiKeys.create)
  GET    → list artifacts (apiKeys.list)

/api/v1/artifacts/:shareToken
  GET    → get artifact
  DELETE → delete artifact

/api/v1/artifacts/:shareToken/versions
  POST   → add version
  GET    → list versions

/api/v1/artifacts/:shareToken/versions/:number
  GET    → get version content

/api/v1/artifacts/:shareToken/comments
  GET    → get comments (with ?format=markdown option)

/api/v1/artifacts/:shareToken/versions/:number/comments
  POST   → add comment
  GET    → get comments for version

/api/v1/auth/keys
  POST   → create API key
  GET    → list user's keys

/api/v1/auth/keys/:keyId
  DELETE → revoke key

/api/v1/webhooks (Phase 2)
  POST   → register webhook
  GET    → list webhooks
  DELETE → remove webhook
```

---

## Security Considerations

### Key Storage

```
Never store raw API key
         │
         ▼
┌───────────────────────────────┐
│ Hash with argon2id            │
│ - Memory: 64 MB               │
│ - Iterations: 3               │
│ - Parallelism: 4              │
└───────────────────────────────┘
         │
         ▼
Store: prefix (display) + hash (validation)
```

### Request Signing (Webhooks)

```typescript
function signWebhook(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

// Header: X-Webhook-Signature: sha256=<signature>
```

---

## Implementation Phases

### Phase 1: Dogfooding (Minimal)
- [ ] Add `apiKeys` table to schema
- [ ] API key CRUD operations
- [ ] HTTP routes for artifacts/versions/comments
- [ ] Basic auth middleware
- [ ] Rate limiting integration

### Phase 2: Webhooks
- [ ] Add `webhooks` table
- [ ] Webhook registration endpoints
- [ ] Event delivery system
- [ ] Retry logic with exponential backoff

### Phase 3: OAuth
- [ ] OAuth flow endpoints
- [ ] Token exchange
- [ ] Social login integration

---

## Questions for Review

1. **Agent name source**: Use `apiKey.name` or add separate `displayName` field?
2. **Rate limit tiers**: Should we store tier on API key or always look up from user?
3. **Webhook events**: What events beyond comments? (version.created, artifact.deleted?)
4. **Key rotation**: Should we support rotating keys without revoking?
