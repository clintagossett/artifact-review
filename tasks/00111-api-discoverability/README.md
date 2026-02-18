# Task 00111: API Discoverability

**GitHub Issue:** #111

---

## Resume (Start Here)

**Last Updated:** 2026-02-17 (Session 1)

### Current Status: COMPLETE

**Phase:** Implementation done — discovery, health, and WWW-Authenticate all in place.

### What We Did This Session (Session 1)

1. **Added `GET /api/v1` discovery endpoint** - Unauthenticated JSON response with auth scheme, endpoints, and documentation link
2. **Added `GET /api/v1/health` endpoint** - Unauthenticated health check returning `{"status":"ok","version":"1.0.0"}`
3. **Added `WWW-Authenticate` header to 401 responses** - RFC 7235 compliant header + hint body pointing to discovery endpoint
4. **Created agent discovery test script** - `tests/agent-discovery.sh` validates the full 2-request discovery flow

---

## Objective

Enable AI agents to discover and start using the Artifact Review API within 2 requests, without prior knowledge of the auth scheme.

### Problem

- `GET /api/v1` returned 404
- `/api/v1/openapi.yaml` returned 401 with no auth hint (catch-22)
- 401 responses lacked `WWW-Authenticate` header (RFC 7235 violation)
- No health endpoint for monitoring

### Solution

- **Tier 1 (public):** `GET /api/v1` returns discovery JSON with auth instructions
- **Tier 2 (authenticated):** `GET /api/v1/openapi.yaml` returns full OpenAPI spec
- All 401s now include `WWW-Authenticate` header and a `hint` field

## Changes Made

| File | Change |
|------|--------|
| `app/convex/http.ts` | Added `GET /api/v1` discovery, `GET /api/v1/health`, `WWW-Authenticate` on 401s |
| `tasks/00111-api-discoverability/tests/agent-discovery.sh` | Agent discovery test script |

## Testing

Run the agent discovery test script:
```bash
./tasks/00111-api-discoverability/tests/agent-discovery.sh
```

Or manually:
```bash
# Discovery (unauthenticated)
curl https://lux.convex.site.loc/api/v1

# Health check
curl https://lux.convex.site.loc/api/v1/health

# 401 with WWW-Authenticate
curl -i https://lux.convex.site.loc/api/v1/artifacts
```
