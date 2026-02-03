# Issue #45: Node Action Networking in Self-Hosted Convex

## Status: ✅ RESOLVED

**Solution**: Port 80 proxy sidecar container (socat)
**ADR**: [0019-node-action-port80-proxy](../../docs/architecture/decisions/0019-node-action-storage-fallback.md)

---

## Problem Summary

Node actions (`"use node"` directive) fail in self-hosted Convex with `ECONNREFUSED 127.0.0.1:80` errors. This affects **ALL** internal Convex operations in Node actions, not just storage.

---

## Root Cause

**The Convex Node executor internally routes ALL operations through HTTP to `127.0.0.1:80`, but nothing listens on port 80 inside the Docker container.**

The Convex backend only listens on:
- Port 3210 (Admin/Sync API)
- Port 3211 (HTTP Actions)

This is a self-hosted-only issue; Convex Cloud handles internal routing correctly.

---

## What's Affected

| Operation | In Node Action | Error |
|-----------|----------------|-------|
| `ctx.storage.get()` | ❌ Fails | `ECONNREFUSED 127.0.0.1:80` |
| `ctx.storage.store()` | ❌ Fails | `ECONNREFUSED 127.0.0.1:80` |
| `ctx.storage.delete()` | ❌ Fails | `ECONNREFUSED 127.0.0.1:80` |
| `ctx.runMutation()` | ❌ Fails | `ECONNREFUSED 127.0.0.1:80` |
| `ctx.runAction()` | ❌ Fails | `ECONNREFUSED 127.0.0.1:80` |
| `ctx.runQuery()` | ❌ Fails | `ECONNREFUSED 127.0.0.1:80` |
| Regular `fetch()` calls | ✅ Works | N/A |

**Key insight**: The Node executor's internal HTTP mechanism is broken, but regular `fetch()` calls work fine because they use standard Node.js networking.

---

## What We Ruled Out

| Initial Assumption | Reality |
|--------------------|---------|
| DNS/proxy routing issues | ❌ Works fine - `fetch("http://localhost:3211")` succeeds |
| Docker networking | ❌ Works fine - container can reach all ports |
| CONVEX_SITE_ORIGIN config | ❌ Ignored by Node executor internals |
| Only affects storage.get() | ❌ **ALL** ctx.* operations affected |

---

## Solution: Port 80 Proxy Sidecar

Add a lightweight socat container that:
1. Shares the network namespace with the backend container
2. Listens on port 80
3. Forwards traffic to port 3210 (Convex Admin API)

### Implementation

**File: `docker-compose.yml`**

```yaml
services:
  backend:
    # ... existing backend config ...

  # Port 80 proxy for Node executor compatibility
  # The Convex Node executor's internal implementation tries to connect to 127.0.0.1:80
  # but the backend only listens on 3210/3211. This sidecar proxies 80 → 3210.
  port80-proxy:
    container_name: ${AGENT_NAME:?AGENT_NAME is required}-port80-proxy
    image: alpine/socat:latest
    network_mode: "service:backend"
    # Proxy port 80 to the backend's internal admin port (3210)
    # The backend always listens on 3210 internally, regardless of CONVEX_ADMIN_PORT mapping
    command: TCP-LISTEN:80,fork,reuseaddr TCP:127.0.0.1:3210
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
```

### Why This Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Network Namespace                      │
│                    (shared via network_mode)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Node Executor                                                   │
│       │                                                          │
│       │ ctx.storage.get() / ctx.runMutation() / etc.            │
│       │                                                          │
│       ▼                                                          │
│  127.0.0.1:80  ──────►  socat proxy  ──────►  127.0.0.1:3210    │
│  (was failing)          (port80-proxy)        (Convex backend)   │
│                                                                  │
│  Result: ✅ All operations work!                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

The `network_mode: "service:backend"` setting makes the socat container share the same network namespace as the backend. This means when socat listens on port 80, it's on the same `127.0.0.1` that the Node executor tries to reach.

---

## Verification

### Check port 80 is listening inside container:

```bash
docker exec mark-backend cat /proc/net/tcp | grep ":0050" && echo "Port 80 listening"
```

### Test the proxy works:

```bash
docker exec mark-backend curl -s http://127.0.0.1:80/version
# Should return: "unknown"
```

### Check logs for successful operations:

```bash
tmux capture-pane -t mark-convex-dev -p -S -50 | grep -E "Storage access: direct"
```

Expected output:
```
Storage access: direct {"storageId":"kg2...","size":2418}
```

---

## Why NOT the HTTP Fallback Approach

The original solution attempted to work around the issue with HTTP fallback endpoints. This approach had problems:

| HTTP Fallback Approach | Port 80 Proxy Approach |
|------------------------|------------------------|
| ❌ Only fixed `storage.get()` | ✅ Fixes ALL operations |
| ❌ Required code changes in every Node action | ✅ Zero code changes |
| ❌ Two code paths to maintain | ✅ Single code path |
| ❌ Couldn't fix `ctx.runMutation()` | ✅ Mutations work |
| ❌ Performance overhead from HTTP fallback | ✅ Direct internal routing |

---

## Production vs Self-Hosted

| Environment | Port 80 Proxy Needed? | Notes |
|-------------|----------------------|-------|
| **Convex Cloud** | No | Internal routing works correctly |
| **Self-hosted Docker** | Yes | Add port80-proxy sidecar |
| **Self-hosted Kubernetes** | Yes | Add sidecar container to pod |

---

## Files Changed

| File | Change |
|------|--------|
| `docker-compose.yml` | Added `port80-proxy` service |

**No application code changes required.**

---

## Checklist

- [x] Root cause identified (127.0.0.1:80 not listening)
- [x] All affected operations documented
- [x] Solution implemented (socat proxy)
- [x] Verified storage.get() works
- [x] Verified storage.store() works
- [x] Verified storage.delete() works
- [x] Verified ctx.runMutation() works
- [x] ADR updated
- [x] ZIP upload E2E test passes (processing completes)
- [ ] Consider filing convex-backend issue about port 80 hardcoding

---

## Related

- **ADR**: [0019-node-action-port80-proxy](../../docs/architecture/decisions/0019-node-action-storage-fallback.md)
- **Convex Issue**: https://github.com/get-convex/convex-backend/issues/179
- **Unblocks**: Task 00043 (Novu notifications) - E2E tests can create artifacts

---

## Historical Note

An earlier version of this fix attempted to use HTTP fallback endpoints (`/internal/storage-blob`) to work around the issue. This approach was abandoned because:

1. It only addressed `storage.get()`, not other operations
2. `ctx.runMutation()` and other context methods also fail with the same error
3. The proxy approach is simpler and fixes everything at the infrastructure level
