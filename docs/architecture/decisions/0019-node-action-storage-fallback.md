---
title: Node Action Port 80 Proxy for Self-Hosted Convex
status: Accepted
date: 2026-01-28
deciders: Clint Gossett
supersedes: (original HTTP fallback approach)
---

# 19. Node Action Port 80 Proxy for Self-Hosted Convex

## Context

In self-hosted Convex environments, Node actions (`"use node"` directive) fail with `ECONNREFUSED 127.0.0.1:80` errors. Investigation revealed this affects **ALL** internal Convex operations in Node actions:

| Operation | Status in Node Action |
|-----------|----------------------|
| `ctx.storage.get()` | ❌ Fails |
| `ctx.storage.store()` | ❌ Fails |
| `ctx.storage.delete()` | ❌ Fails |
| `ctx.runMutation()` | ❌ Fails |
| `ctx.runAction()` | ❌ Fails |
| `ctx.runQuery()` | ❌ Fails |
| Regular `fetch()` calls | ✅ Works |

### Root Cause

The Convex Node executor internally routes all context operations through HTTP to `127.0.0.1:80`. However, the Convex backend Docker container only listens on:
- Port 3210 (Admin/Sync API)
- Port 3211 (HTTP Actions)

Nothing listens on port 80, causing `ECONNREFUSED`.

### Discovery Process

Initial hypothesis blamed orchestrator proxy and DNS routing. Testing proved this wrong:

| Test | Result |
|------|--------|
| Node → `localhost:3211` | ✅ Works |
| Node → `127.0.0.1:3211` | ✅ Works |
| Node → `mark.convex.site.loc` | ✅ Works |
| Node → `ctx.storage.get()` | ❌ Fails |
| Node → `ctx.runMutation()` | ❌ Fails |

Regular networking works; only internal Convex operations fail.

## Decision

Add a **socat proxy sidecar container** that shares the network namespace with the Convex backend and proxies port 80 → 3210.

### Implementation

```yaml
# docker-compose.yml
services:
  backend:
    # ... existing config ...

  port80-proxy:
    container_name: ${AGENT_NAME}-port80-proxy
    image: alpine/socat:latest
    network_mode: "service:backend"
    command: TCP-LISTEN:80,fork,reuseaddr TCP:127.0.0.1:3210
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
```

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│              Docker Network Namespace (shared)               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Node Executor                                               │
│       │                                                      │
│       │  ctx.storage.get() / ctx.runMutation() / etc.       │
│       ▼                                                      │
│  127.0.0.1:80  ───►  socat  ───►  127.0.0.1:3210            │
│                      proxy         (Convex backend)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

The `network_mode: "service:backend"` directive makes the socat container share the same network namespace as the backend. When socat listens on port 80, it's on the same `127.0.0.1` that the Node executor tries to reach.

## Consequences

### Positive

- **Fixes everything**: All `ctx.*` operations work in Node actions
- **Zero code changes**: No application code modifications needed
- **Simple**: Single infrastructure change
- **Lightweight**: alpine/socat image is ~8MB
- **Transparent**: Application code uses standard Convex APIs

### Negative

- **Extra container**: One more container to manage
- **Self-hosted only**: Convex Cloud doesn't need this
- **Port 80 assumption**: If Convex changes the internal port, fix breaks

### Neutral

- **No performance impact**: Direct internal routing, no HTTP overhead

## Alternatives Considered

### 1. HTTP Fallback Endpoints (Originally Implemented, Then Rejected)

Create HTTP endpoints in V8 runtime to proxy storage operations:

```typescript
// Rejected approach
async function getStorageBlob(ctx, storageId) {
  try {
    return await ctx.storage.get(storageId);  // Try direct
  } catch (e) {
    // Fall back to HTTP endpoint
    return await fetch(`http://localhost:3211/internal/storage-blob?storageId=${storageId}`);
  }
}
```

**Rejected because:**
- Only addressed `storage.get()`, not other operations
- `ctx.runMutation()` also fails with same error - can't proxy mutations via HTTP
- Required code changes in every Node action
- Two code paths to maintain
- HTTP overhead in self-hosted environment

### 2. Move to V8 Runtime

Remove `"use node"` directive entirely.

**Rejected**: Some libraries (JSZip) require Node-specific APIs.

### 3. Configure Convex Backend to Listen on Port 80

Modify backend config or Dockerfile.

**Rejected**: Would require custom Convex backend image, harder to maintain.

### 4. Use iptables Port Forwarding

Add iptables rules inside the container.

**Rejected**: Container doesn't have iptables installed, would require custom image.

## Verification

```bash
# Check port 80 is listening
docker exec mark-backend cat /proc/net/tcp | grep ":0050"

# Test proxy works
docker exec mark-backend curl -s http://127.0.0.1:80/version

# Check logs show direct access
tmux capture-pane -t mark-convex-dev -p | grep "Storage access: direct"
```

## Affected Infrastructure

| File | Change |
|------|--------|
| `docker-compose.yml` | Added `port80-proxy` service |

**No application code changes.**

## When This Applies

| Environment | Proxy Needed? |
|-------------|---------------|
| Convex Cloud | No |
| Self-hosted Docker | Yes |
| Self-hosted Kubernetes | Yes (add as sidecar) |

## Related

- Task: `tasks/00045-node-action-storage-fix/`
- Convex Issue: https://github.com/get-convex/convex-backend/issues/179
