# API Key Design Specification

## Overview

API keys provide programmatic access to the Artifact Review API. This document specifies the design decisions for API key management.

---

## Key Format

```
ar_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
└──────┘ └────────────────────────────────┘
 prefix          random bytes (32 chars)
```

- **Prefix**: `ar_live_` (production) or `ar_test_` (sandbox)
- **Random part**: 32 characters, base62 (a-z, A-Z, 0-9)
- **Total length**: ~40 characters

---

## Key Properties

| Property | Description |
|----------|-------------|
| **Name** | User-provided label (e.g., "Claude Code", "CI/CD Pipeline") |
| **Prefix** | First 8 chars shown for identification after creation |
| **Scopes** | What the key can do (see below) |
| **Expiration** | Optional expiry date |
| **Last Used** | Timestamp of most recent API call |
| **Created At** | When the key was created |
| **Created By** | User who created it |

---

## Scopes (Permission Levels)

### Option A: Simple (Recommended for v1)

| Scope | Description |
|-------|-------------|
| `full` | Full access to user's artifacts, comments, versions |

**Rationale:** Simpler to implement and understand. Most AI agent use cases need full access.

### Option B: Granular (Future Enhancement)

| Scope | Description |
|-------|-------------|
| `artifacts:read` | List and view artifacts |
| `artifacts:write` | Create, update, delete artifacts |
| `versions:write` | Add new versions |
| `comments:read` | View comments |
| `comments:write` | Add comments and replies |

**When to add:** If users request it or for team/enterprise security requirements.

---

## Lifetime Options

| Option | Duration | Description |
|--------|----------|-------------|
| `never` | ∞ (default) | **Default.** Key never expires |
| `30d` | 30 days | Opt-in for short-term use |
| `90d` | 90 days | Opt-in for medium-term |
| `1y` | 1 year | Opt-in for annual rotation |

**Default: `never` (no expiration)**

**Rationale:**
- Most users want "set and forget" for integrations
- Reduces friction for AI agent setup
- Compliance-conscious users can opt into expiry
- Future: Org admins can enforce expiring keys via policy

---

## Show Once Pattern

> **Key is shown exactly once at creation time.**

### Rationale
- Industry standard (GitHub, Stripe, AWS)
- Prevents accidental exposure in UI
- Forces secure storage practices

### UX Flow
1. User clicks "Create API Key"
2. User enters name, selects expiration
3. Modal shows full key with copy button
4. Warning: "This key won't be shown again"
5. User copies and closes modal
6. List view shows only prefix + last used

### If Key is Lost
- User must delete and create a new key
- No "reveal" or recovery option

---

## Rate Limits per Key

| User Tier | Requests/Hour | Burst Limit |
|-----------|---------------|-------------|
| Free | 100 | 20/min |
| Pro | 1,000 | 100/min |
| Team | 10,000 | 500/min |

Keys inherit limits from the user's subscription tier.

### Transparent Rate Limiting (Standard Headers)

**Every response includes these headers:**

```http
X-RateLimit-Limit: 1000          # Max requests per hour
X-RateLimit-Remaining: 847       # Requests left this window
X-RateLimit-Reset: 1705624800    # Unix timestamp when window resets
X-RateLimit-Tier: pro            # User's current tier
```

**When limit is exceeded (429 response):**

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 127                 # Seconds until retry is allowed
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705624800

{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Retry in 127 seconds.",
  "limit": 100,
  "reset_at": "2025-01-18T22:00:00Z"
}
```

### Why This Matters for AI Agents

AI agents can:
1. **Monitor remaining quota** - Slow down before hitting limits
2. **Honor Retry-After** - Wait appropriately when limited
3. **Batch requests** - Combine multiple operations when quota is low
4. **Surface to user** - "You have 23 API calls remaining this hour"

### Implementation Options

| Option | Pros | Cons |
|--------|------|------|
| **Convex rate-limiter** | Built for Convex, simple | Limited customization |
| **Token bucket (custom)** | Flexible, industry standard | More code |
| **External (Upstash)** | Redis-based, battle-tested | Additional dependency |

**Recommended:** Start with `@convex-dev/rate-limiter` for v1.

### Dashboard Visibility

Show in Settings > API Keys:
- Current usage vs. limit (progress bar)
- Usage graph over time
- Warning when approaching limit (80%+)
- Suggestion to upgrade tier

---

## Security Considerations

### Storage
- **Never store raw key** - Hash with argon2 or bcrypt
- Store prefix for display purposes
- Store hash for validation

### Validation Flow
```
1. Extract key from X-API-Key header
2. Extract prefix from key
3. Look up key record by prefix
4. Verify hash matches
5. Check expiration
6. Load associated user
7. Apply rate limits
```

### Audit Trail
- Log all key creations and deletions
- Track last-used timestamp per key
- Optional: Track IP addresses for suspicious activity detection

---

## Database Schema (Proposed)

```typescript
// New table: apiKeys
defineTable({
  userId: v.id("users"),
  name: v.string(),                    // User-provided label
  prefix: v.string(),                  // First 8 chars for display
  keyHash: v.string(),                 // Hashed full key
  scopes: v.array(v.string()),         // ["full"] or granular
  expiresAt: v.optional(v.number()),   // Unix timestamp
  lastUsedAt: v.optional(v.number()),  // Track usage
  createdAt: v.number(),
  revokedAt: v.optional(v.number()),   // Soft delete
})
.index("by_userId", ["userId"])
.index("by_prefix", ["prefix"])        // For lookup
```

---

## Questions Resolved

| Question | Decision | Rationale |
|----------|----------|-----------|
| Scopes for v1? | `full` only | Simpler, covers AI agent use case |
| Default lifetime? | `never` (forever) | Less friction; compliance can opt-in to expiry |
| Show once? | Yes | Industry standard |
| Lost key recovery? | Delete and recreate | More secure, simpler impl |
| Key format? | `ar_live_` prefix | Clear identification in logs |

---

## UI Components Needed

1. **Settings > API Keys** page
2. **Create Key** modal (name, expiration picker)
3. **Key Created** modal (show once, copy button)
4. **Key List** table (name, prefix, last used, delete button)
5. **Delete Confirmation** dialog
