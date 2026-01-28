# Architecture Diagram: Node Action Storage Access Issue

> **Note**: This diagram has been updated based on diagnostic testing. See "What We Got Wrong" section below.

## Current Setup Overview

```mermaid
flowchart TB
    subgraph Browser["Browser"]
        B[User Request]
    end

    subgraph Host["Host Machine"]
        subgraph Proxy["Orchestrator Proxy :80"]
            P1["mark.loc → :3010"]
            P2["mark.convex.cloud.loc → :3210"]
            P3["mark.convex.site.loc → :3211"]
        end

        subgraph Docker["Docker Container (mark-backend)"]
            subgraph Convex["Convex Backend (Rust)"]
                ENV["ENV:<br/>CONVEX_SITE_ORIGIN=http://mark.convex.site.loc"]

                subgraph V8["V8 Isolate"]
                    V8Q["Queries/Mutations"]
                    V8S["storage.get()"]
                end

                subgraph Node["Node Executor"]
                    NodeA["'use node' Actions"]
                    NodeS["storage.get()"]
                end

                Storage[(Storage)]
            end
        end
    end

    B --> Proxy
    P3 --> |":3211"| Convex
    V8S --> |"syscall ✅"| Storage
    NodeS --> |"HTTP to 127.0.0.1:80 ❌"| Storage
```

## The ACTUAL Problem (Confirmed via Testing)

```mermaid
sequenceDiagram
    participant Node as Node Executor<br/>(inside container)
    participant Port80 as 127.0.0.1:80<br/>(NOTHING LISTENING!)
    participant Port3211 as localhost:3211<br/>(Convex HTTP)

    Note over Node: ctx.storage.get(storageId)

    Node->>Node: Internal storage.get() implementation<br/>resolves to 127.0.0.1:80<br/>(ignores CONVEX_SITE_ORIGIN!)

    Node->>Port80: HTTP GET 127.0.0.1:80/...

    Port80--xNode: ECONNREFUSED<br/>Nothing listening on port 80!

    Note over Node: "fetch failed" error

    Note over Port3211: Port 3211 is available<br/>but storage.get() doesn't use it
```

## What We Got Wrong (Initial Assumptions vs Reality)

```mermaid
flowchart TB
    subgraph Wrong["❌ What We THOUGHT Was Happening"]
        W1["Node can't reach .loc domains"] --> W2["Proxy routing issues"]
        W2 --> W3["DNS/networking problems"]
    end

    subgraph Right["✅ What's ACTUALLY Happening"]
        R1["Node CAN reach everything:<br/>localhost:3211 ✅<br/>127.0.0.1:3211 ✅<br/>mark.convex.site.loc ✅"]
        R1 --> R2["storage.get() ignores all that"]
        R2 --> R3["Hardcoded to 127.0.0.1:80"]
        R3 --> R4["Port 80 not listening = FAIL"]
    end

    style Wrong fill:#ffcccc
    style Right fill:#ccffcc
```

## Test Results That Proved This

```mermaid
flowchart LR
    subgraph Tests["Node Executor Network Tests"]
        T1["fetch localhost:3211/version"]
        T2["fetch 127.0.0.1:3211/version"]
        T3["fetch mark.convex.site.loc/version"]
        T4["ctx.storage.get(id)"]
    end

    T1 --> |"✅ 200 OK"| Pass1["Works!"]
    T2 --> |"✅ 200 OK"| Pass2["Works!"]
    T3 --> |"✅ 200 OK"| Pass3["Works!"]
    T4 --> |"❌ ECONNREFUSED 127.0.0.1:80"| Fail["FAILS"]

    style Pass1 fill:#ccffcc
    style Pass2 fill:#ccffcc
    style Pass3 fill:#ccffcc
    style Fail fill:#ffcccc
```

## Why V8 Works But Node Fails

```mermaid
flowchart LR
    subgraph V8["V8 Isolate (Works ✅)"]
        V8Code["storage.get(id)"]
        V8Sys["Rust Syscall"]
        V8Store[(Storage)]

        V8Code --> |"direct call"| V8Sys
        V8Sys --> |"internal"| V8Store
    end

    subgraph Node["Node Executor (Fails ❌)"]
        NodeCode["storage.get(id)"]
        NodeHTTP["HTTP Fetch"]
        NodePort["127.0.0.1:80"]
        NodeFail[/"❌ ECONNREFUSED"/]

        NodeCode --> |"performAsyncOp"| NodeHTTP
        NodeHTTP --> |"hardcoded?"| NodePort
        NodePort --> NodeFail
    end
```

## The Fix: HTTP Action Intermediary

```mermaid
sequenceDiagram
    participant Node as Node Executor<br/>("use node" action)
    participant HTTP as HTTP Action<br/>(V8 - port 3211)
    participant Storage as Convex Storage

    Note over Node: Need ZIP file from storage

    Node->>HTTP: fetch("http://localhost:3211/internal/storage-blob?storageId=xxx")
    Note over Node,HTTP: ✅ localhost:3211 works!<br/>(confirmed via testing)

    HTTP->>Storage: ctx.storage.get(storageId)
    Note over HTTP,Storage: ✅ V8 uses direct syscall<br/>(no HTTP involved)

    Storage-->>HTTP: Blob data

    HTTP-->>Node: Response(blob)

    Note over Node: ✅ ZIP buffer received!<br/>Continue processing with JSZip
```

## Architecture Comparison

```mermaid
flowchart TB
    subgraph Before["Before (Broken ❌)"]
        direction TB
        N1["Node Action"] --> |"storage.get()"| H1["Internal HTTP to 127.0.0.1:80"]
        H1 --> F1[/"ECONNREFUSED"/]
    end

    subgraph After["After (Fixed ✅)"]
        direction TB
        N2["Node Action"] --> |"fetch localhost:3211"| H2["HTTP Action (V8)"]
        H2 --> |"syscall"| S2[(Storage)]
        S2 --> |"blob"| H2
        H2 --> |"response"| N2
    end
```

## Summary Table (Updated with Test Results)

| Component | URL/Method | Works? | Tested? | Notes |
|-----------|------------|:------:|:-------:|-------|
| Browser → Proxy | `mark.convex.site.loc:80` | ✅ | ✅ | Proxy routes correctly |
| V8 → Storage | Direct syscall | ✅ | ✅ | No HTTP involved |
| Node → localhost:3211 | `fetch()` | ✅ | ✅ | **Works!** |
| Node → 127.0.0.1:3211 | `fetch()` | ✅ | ✅ | **Works!** |
| Node → .loc domain | `fetch()` | ✅ | ✅ | **Works!** |
| Node → storage.get() | Internal HTTP | ❌ | ✅ | Hits 127.0.0.1:80 |

## Root Cause (Corrected)

```mermaid
flowchart LR
    subgraph Problem["The ACTUAL Problem"]
        SG["storage.get() in Node"]
        SG --> Internal["Uses internal HTTP"]
        Internal --> Hardcoded["Resolves to 127.0.0.1:80"]
        Hardcoded --> Nothing["Nothing on port 80"]
        Nothing --> Fail["ECONNREFUSED"]
    end

    subgraph NotProblem["NOT the Problem"]
        Proxy["Proxy routing"]
        DNS["DNS resolution"]
        Docker["Docker networking"]
    end

    style Problem fill:#ffcccc
    style NotProblem fill:#e0e0e0
```

**The proxy setup is NOT the issue. The issue is that `storage.get()` in Node actions internally tries to connect to `127.0.0.1:80`, which has nothing listening.**
