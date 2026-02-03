# Architecture Diagram: Node Action Port 80 Proxy Fix

## The Problem

```
┌─────────────────────────────────────────────────────────────────┐
│                    Convex Backend Container                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐      ┌──────────────────────────────────┐ │
│  │  Node Executor   │      │     Convex Backend (Rust)        │ │
│  │  ("use node")    │      │                                  │ │
│  │                  │      │   Listening on:                  │ │
│  │  ctx.storage.*   │──X──▶│   - 127.0.0.1:3210 (Admin)      │ │
│  │  ctx.runMutation │      │   - 127.0.0.1:3211 (HTTP)       │ │
│  │  ctx.runQuery    │      │   - 127.0.0.1:80   (NOTHING!)   │ │
│  │  ctx.runAction   │      │                                  │ │
│  └──────────────────┘      └──────────────────────────────────┘ │
│           │                                                      │
│           │ Tries to connect to 127.0.0.1:80                    │
│           ▼                                                      │
│     ❌ ECONNREFUSED                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## The Solution

```
┌─────────────────────────────────────────────────────────────────┐
│           Docker Network Namespace (shared via network_mode)     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐   ┌─────────┐   ┌─────────────────────┐  │
│  │  Node Executor   │   │  socat  │   │  Convex Backend     │  │
│  │  ("use node")    │   │  proxy  │   │                     │  │
│  │                  │   │         │   │  127.0.0.1:3210 ◄───┤  │
│  │  ctx.storage.*   │──▶│ :80 ────┼──▶│  127.0.0.1:3211     │  │
│  │  ctx.runMutation │   │         │   │                     │  │
│  │  ctx.runQuery    │   └─────────┘   └─────────────────────┘  │
│  │  ctx.runAction   │                                           │
│  └──────────────────┘                                           │
│           │                                                      │
│           │ Connects to 127.0.0.1:80                            │
│           ▼                                                      │
│     ✅ SUCCESS (proxied to :3210)                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Docker Compose Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│                     docker-compose.yml                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  services:                                                       │
│                                                                  │
│    backend:                                                      │
│      image: ghcr.io/get-convex/convex-backend:latest            │
│      ports:                                                      │
│        - "3220:3210"  # Admin API (host:container)              │
│        - "3221:3211"  # HTTP Actions                            │
│                                                                  │
│    port80-proxy:                          ◄─── NEW              │
│      image: alpine/socat:latest                                 │
│      network_mode: "service:backend"      ◄─── Shares network  │
│      command: TCP-LISTEN:80,fork,reuseaddr TCP:127.0.0.1:3210  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## What network_mode: "service:backend" Does

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   WITHOUT network_mode: "service:backend"                        │
│   ─────────────────────────────────────────                      │
│                                                                  │
│   ┌─────────────────┐      ┌─────────────────┐                  │
│   │ backend         │      │ port80-proxy    │                  │
│   │                 │      │                 │                  │
│   │ 127.0.0.1:3210 │      │ 127.0.0.1:80   │  ← Different!    │
│   │ 127.0.0.1:3211 │      │                 │                  │
│   └─────────────────┘      └─────────────────┘                  │
│         ▲                                                        │
│         │ Can't reach each other via localhost                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   WITH network_mode: "service:backend"                           │
│   ────────────────────────────────────                           │
│                                                                  │
│   ┌─────────────────────────────────────────┐                   │
│   │          SHARED NETWORK NAMESPACE        │                   │
│   │                                          │                   │
│   │  backend listens on:  127.0.0.1:3210    │                   │
│   │                       127.0.0.1:3211    │                   │
│   │                                          │                   │
│   │  socat listens on:    127.0.0.1:80  ────┼──► forwards to    │
│   │                                          │   127.0.0.1:3210 │
│   │                                          │                   │
│   └─────────────────────────────────────────┘                   │
│                                                                  │
│   Same 127.0.0.1 = Node executor can reach socat on port 80!   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Request Flow                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Node action calls ctx.storage.get(storageId)                │
│                          │                                       │
│                          ▼                                       │
│  2. Node executor internally sends HTTP request                 │
│     to 127.0.0.1:80                                             │
│                          │                                       │
│                          ▼                                       │
│  3. socat proxy receives request on port 80                     │
│                          │                                       │
│                          ▼                                       │
│  4. socat forwards to 127.0.0.1:3210 (Convex Admin API)        │
│                          │                                       │
│                          ▼                                       │
│  5. Convex backend processes request                            │
│                          │                                       │
│                          ▼                                       │
│  6. Response flows back through socat to Node executor          │
│                          │                                       │
│                          ▼                                       │
│  7. ctx.storage.get() returns the blob ✅                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## All Affected Operations (Now Fixed)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Node Action Context Methods        Status                       │
│  ────────────────────────────       ──────                       │
│                                                                  │
│  ctx.storage.get(storageId)         ✅ Works (via port 80 proxy)│
│  ctx.storage.store(blob)            ✅ Works (via port 80 proxy)│
│  ctx.storage.delete(storageId)      ✅ Works (via port 80 proxy)│
│  ctx.runMutation(mutation, args)    ✅ Works (via port 80 proxy)│
│  ctx.runAction(action, args)        ✅ Works (via port 80 proxy)│
│  ctx.runQuery(query, args)          ✅ Works (via port 80 proxy)│
│                                                                  │
│  Regular fetch() calls              ✅ Works (standard Node.js) │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
