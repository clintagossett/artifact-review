---
title: JWT and Authentication Architecture
status: Accepted
date: 2026-01-27
deciders: Clint Gossett
---

# 18. JWT and Authentication Architecture

## Context

The artifact-review platform has four distinct authentication contexts:

1. **User authentication** (browser sessions via Convex Auth)
2. **Agent API access** (external tools like Claude Code, Cursor)
3. **Internal service communication** (Convex Auth to email bridge)
4. **Notification service** (Novu integration)

Each context has different requirements for token lifetime, storage, and validation. This ADR documents how JWT tokens flow through the system and why our infrastructure choices (particularly DNS indirection) are critical for authentication stability.

## Decision

### 1. Four Authentication Contexts

| Context | Mechanism | Token Type | Lifetime | Storage |
|---------|-----------|------------|----------|---------|
| **User Sessions** | Convex Auth | JWT (RS256) | ~24 hours | Browser localStorage |
| **Agent API** | API Keys | Hash-validated | Configurable (30d/90d/never) | User's secret storage |
| **Internal Bridge** | Static Secret | Bearer token | Permanent (rotate manually) | Environment variable |
| **Novu** | Secret Key | API Key | Permanent (rotate manually) | Environment variable |

### 2. User JWT Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER AUTHENTICATION FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

1. SIGNUP/LOGIN
   ┌──────────┐    signIn("password", {...})    ┌─────────────────┐
   │  Browser │ ─────────────────────────────▶  │  Convex Backend │
   │ (mark.loc)│                                │ (convex.cloud)  │
   └──────────┘                                 └────────┬────────┘
                                                         │
                                                         │ Signs JWT with
                                                         │ JWT_PRIVATE_KEY
                                                         ▼
                                                ┌─────────────────┐
                                                │ JWT Token       │
                                                │ {sub, iat, exp} │
                                                └────────┬────────┘
                                                         │
2. TOKEN STORAGE                                         │
   ┌──────────┐    Stores in localStorage       ◀────────┘
   │  Browser │    Key: __convexAuthJWT_{normalized_url}
   └──────────┘

3. SUBSEQUENT REQUESTS
   ┌──────────┐    WebSocket + JWT in header    ┌─────────────────┐
   │  Browser │ ─────────────────────────────▶  │  Convex Backend │
   └──────────┘                                 └────────┬────────┘
                                                         │
                                                         │ Validates signature
                                                         │ using JWKS public key
                                                         ▼
                                                ┌─────────────────┐
                                                │ getAuthUserId() │
                                                │ returns userId  │
                                                └─────────────────┘
```

### 3. JWT Configuration

**Signing Keys (Server-side only):**
```bash
# .env.convex.local - NEVER expose to browser
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Public Keys (JWKS - publicly accessible):**
```bash
# Served at /.well-known/jwks.json
JWKS='{"keys":[{"kty":"RSA","n":"...","e":"AQAB"}]}'
```

**Key Files:**
- `convex/auth.ts` - Auth configuration and callbacks
- `convex/auth.config.ts` - Provider configuration
- `.env.convex.local` - JWT keys (gitignored)

### 4. localStorage Key Derivation (Critical)

The `@convex-dev/auth` library stores JWTs in localStorage using a **normalized URL** as the key suffix:

```typescript
// From @convex-dev/auth/src/react/client.tsx
const escapedNamespace = namespace.replace(/[^a-zA-Z0-9]/g, "");
const storageKey = (key) => `${key}_${escapedNamespace}`;

// Example:
// URL: https://mark.convex.cloud.loc
// Normalized: httpsmarkconvexcloudloc
// Storage key: __convexAuthJWT_httpsmarkconvexcloudloc
```

**Why This Matters:**

If the URL changes, the storage key changes, and **the JWT becomes inaccessible**:

```
Day 1: NEXT_PUBLIC_CONVEX_URL=http://localhost:3220
       Key: __convexAuthJWT_httplocalhost3220
       JWT stored ✓

Day 2: Port changes to 3221
       NEXT_PUBLIC_CONVEX_URL=http://localhost:3221
       Key: __convexAuthJWT_httplocalhost3221
       JWT NOT FOUND ✗ → User appears logged out
```

**Solution: DNS Indirection**

Using DNS names abstracts infrastructure from identity:

```
Day 1: NEXT_PUBLIC_CONVEX_URL=https://mark.convex.cloud.loc
       Key: __convexAuthJWT_httpsmarkconvexcloudloc
       JWT stored ✓

Day 2: Backend port changes (proxy config update)
       URL unchanged: https://mark.convex.cloud.loc
       Key unchanged: __convexAuthJWT_httpsmarkconvexcloudloc
       JWT FOUND ✓ → User stays logged in
```

### 5. The `.well-known` Proxy Endpoints

The frontend proxies OIDC discovery and JWKS endpoints to Convex:

```
Browser                    Next.js                    Convex
   │                          │                          │
   │ GET /.well-known/jwks.json                          │
   │ ─────────────────────▶   │                          │
   │                          │ Fetch from convex.site   │
   │                          │ ─────────────────────▶   │
   │                          │                          │
   │                          │    JWKS public keys      │
   │                          │ ◀─────────────────────   │
   │   JWKS (cached 1hr)      │                          │
   │ ◀─────────────────────   │                          │
```

**Files:**
- `src/app/.well-known/jwks.json/route.ts` - Proxies public keys
- `src/app/.well-known/openid-configuration/route.ts` - Proxies OIDC config

**What's Cached:**
- **JWKS**: Public RSA keys for JWT signature verification (1 hour cache)
- **OIDC Config**: Discovery document with endpoint URLs (1 hour cache)

**What's NOT Stored Here:**
- JWTs themselves (those are in browser localStorage)
- Private keys (those stay in `.env.convex.local`)

**Why Proxy?**
1. Allows `mark.loc` to serve discovery endpoints (standard OIDC behavior)
2. Avoids CORS issues for initial discovery requests
3. Provides caching to reduce load on Convex

### 6. Agent API Keys (Non-JWT)

Agents use hash-validated API keys, NOT JWTs:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT API AUTHENTICATION                          │
└─────────────────────────────────────────────────────────────────────────────┘

1. KEY GENERATION (one-time, via dashboard)
   ┌──────────┐    createApiKey()               ┌─────────────────┐
   │   User   │ ─────────────────────────────▶  │  Convex Backend │
   │Dashboard │                                 └────────┬────────┘
   └──────────┘                                          │
                                                         │ Generate random key
                                                         │ Hash with SHA-256
                                                         │ Store hash (not key)
                                                         ▼
   ┌──────────┐    ar_live_xxxxxxxx...          ◀────────┘
   │   User   │    (shown ONCE, user saves it)
   └──────────┘

2. API REQUESTS
   ┌──────────┐    X-API-Key: ar_live_xxx...    ┌─────────────────┐
   │  Agent   │ ─────────────────────────────▶  │  Convex HTTP    │
   │(Claude)  │                                 └────────┬────────┘
   └──────────┘                                          │
                                                         │ Hash incoming key
                                                         │ Compare to stored hash
                                                         │ Check expiration
                                                         ▼
                                                ┌─────────────────┐
                                                │ {userId, scopes}│
                                                └─────────────────┘
```

**Key Format:** `ar_live_` + 32 random Base64-URL characters

**Why Not JWT for Agents?**
- JWTs expire (24h) - agents need long-lived credentials
- JWTs require refresh flow - adds complexity for CLI tools
- API keys are revocable without affecting user sessions
- API keys can be scoped to specific agents/operations

### 7. Internal Bridge Key

For internal service communication (e.g., Convex Auth calling the email HTTP action):

```bash
# .env.local
INTERNAL_API_KEY=6bc98ddfccf54063dc0b512753a912971c5dd7b76a1b9358821028e932985d21
```

**Usage in `convex/auth.ts`:**
```typescript
await fetch(`${siteUrl}/send-auth-email`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
  },
  body: JSON.stringify({ email, subject, html }),
});
```

**Validation in `convex/http.ts`:**
```typescript
const authHeader = req.headers.get("Authorization");
const expectedSecret = `Bearer ${process.env.INTERNAL_API_KEY}`;
if (authHeader !== expectedSecret) {
  return new Response("Unauthorized", { status: 401 });
}
```

### 8. Novu Secret Key

For notification service communication:

```bash
# .env.local
NOVU_SECRET_KEY=cde2a75cf7803a368888ada30265cd34
NOVU_API_URL=https://api.novu.loc
```

**Usage:**
```typescript
const novu = new Novu(process.env.NOVU_SECRET_KEY, {
  backendUrl: process.env.NOVU_API_URL,
});

await novu.trigger("new-comment", {
  to: { subscriberId: userId },
  payload: { ... },
});
```

## Consequences

### Positive

- **Clear separation**: Each auth context has appropriate token type and lifetime
- **DNS stability**: URL-based localStorage keys survive infrastructure changes
- **Security layers**: User JWTs, agent API keys, and internal keys are isolated
- **Standard compliance**: OIDC discovery endpoints follow OAuth 2.0 standards

### Negative

- **Complexity**: Four different auth mechanisms to understand and maintain
- **DNS dependency**: Auth breaks if orchestrator proxy is down
- **Key management**: Multiple secrets to rotate and secure

### Migration Notes

If switching Convex URLs (e.g., from self-hosted to cloud):
1. Users will need to re-authenticate (localStorage keys will differ)
2. API keys continue working (they're hash-based, not URL-based)
3. Internal keys need updating in both environments

## Infrastructure Dependency

**Critical**: Authentication depends on proper proxy configuration. The orchestrator proxy MUST use `changeOrigin: false` to preserve Host headers. If `changeOrigin: true` is used, the backend sees `localhost:port` instead of the DNS name, causing JWT scope mismatch and auth failures.

See [ADR 0004: Host Header Preservation](/home/clint-gossett/Documents/agentic-dev/docs/adr/0004-host-header-preservation.md) for details on this issue and its fix.

## References

- [ADR 0004: Host Header Preservation](/home/clint-gossett/Documents/agentic-dev/docs/adr/0004-host-header-preservation.md) - Critical proxy setting for auth
- [ADR 0001: DNS Indirection](/home/clint-gossett/Documents/agentic-dev/docs/adr/0001-dns-indirection.md) - Why DNS names instead of ports
- [ADR 0016: Agent API Strategy](./0016-agent-api-strategy.md) - Agent authentication approach
- [Convex Auth Docs](https://labs.convex.dev/auth) - Official documentation
- [@convex-dev/auth source](../../app/node_modules/@convex-dev/auth/src/react/client.tsx) - Token storage implementation
