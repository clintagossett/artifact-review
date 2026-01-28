---
title: Node Action Storage Access Fallback Pattern
status: Accepted
date: 2026-01-28
deciders: Clint Gossett
---

# 19. Node Action Storage Access Fallback Pattern

## Context

In self-hosted Convex environments, Node actions (`"use node"` directive) cannot access storage via the standard `ctx.storage.get()` API. The call fails with `ECONNREFUSED 127.0.0.1:80` because the internal storage access mechanism tries to connect to port 80, which has nothing listening inside the Docker container.

This issue does NOT affect:
- V8 runtime actions (use syscalls, not HTTP)
- Convex Cloud (proper internal networking)
- Regular `fetch()` calls from Node actions (work fine)

### Discovery Process

Initial hypothesis blamed the orchestrator proxy and DNS routing. Diagnostic testing proved this wrong:

| Test | Result |
|------|--------|
| Node → `localhost:3211` | ✅ Works |
| Node → `127.0.0.1:3211` | ✅ Works |
| Node → `mark.convex.site.loc` | ✅ Works |
| Node → `ctx.storage.get()` | ❌ `ECONNREFUSED 127.0.0.1:80` |

The actual issue is that `storage.get()` in Node actions uses an internal HTTP mechanism that resolves to `127.0.0.1:80`, ignoring the configured `CONVEX_SITE_ORIGIN`.

## Decision

Implement a **try-direct-then-fallback** pattern for storage access in Node actions:

1. **Try direct access first** (`ctx.storage.get()`) - works in Convex Cloud
2. **Catch ECONNREFUSED** - indicates self-hosted environment
3. **Fall back to HTTP endpoint** - V8 HTTP action that uses syscall for storage

### Implementation

**1. HTTP Endpoint (V8 runtime) - `convex/http.ts`:**

```typescript
http.route({
  path: "/internal/storage-blob",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const storageId = new URL(request.url).searchParams.get("storageId");
    const blob = await ctx.storage.get(storageId as Id<"_storage">);
    if (!blob) return new Response("Not found", { status: 404 });
    return new Response(blob);
  }),
});
```

**2. Helper Function (Node runtime):**

```typescript
async function getStorageBlob(
  ctx: ActionCtx,
  storageId: Id<"_storage">
): Promise<{ buffer: ArrayBuffer; method: "direct" | "http-fallback" }> {
  // Try direct storage.get() first (works in Convex Cloud)
  try {
    const blob = await ctx.storage.get(storageId);
    if (blob) {
      log.info(LOG_TOPICS.Artifact, "Storage access: direct", { storageId });
      return { buffer: await blob.arrayBuffer(), method: "direct" };
    }
  } catch (e: any) {
    const isConnectionRefused =
      e.cause?.message?.includes("ECONNREFUSED") ||
      e.message?.includes("fetch failed");

    if (isConnectionRefused) {
      // Self-hosted: use HTTP workaround
      log.info(LOG_TOPICS.Artifact, "Storage access: http-fallback", { storageId });
      const response = await fetch(
        `http://localhost:3211/internal/storage-blob?storageId=${storageId}`
      );
      if (response.ok) {
        return { buffer: await response.arrayBuffer(), method: "http-fallback" };
      }
    }
    throw e;
  }
  throw new Error("Storage blob not found");
}
```

### Monitoring

Log messages indicate which path is used:

| Log Message | Environment | Performance |
|-------------|-------------|-------------|
| `Storage access: direct` | Convex Cloud | Optimal |
| `Storage access: http-fallback` | Self-hosted | +~20ms per blob |
| `Storage access: direct-failed` | Either | Investigate |

**When deploying to production**, watch for `Storage access: direct` logs to confirm the optimal path is working.

## Consequences

### Positive

- **Zero overhead in production**: Direct path used when available
- **Self-hosted works**: Automatic fallback for local development
- **Observable**: Logs clearly indicate which path is used
- **Reusable**: Pattern can be applied to other Node actions needing storage

### Negative

- **Complexity**: Two code paths to maintain
- **Self-hosted overhead**: ~20ms latency per blob via HTTP fallback
- **Endpoint exposure**: `/internal/storage-blob` must be protected if auth is needed

### Risks

- If Convex Cloud behavior changes to also fail, we'd silently fall back to HTTP
- The `/internal/storage-blob` endpoint has no auth (assumes internal-only access)

## Alternatives Considered

### 1. Pass Data via Base64 Arguments
Fetch blob in V8 action, base64 encode, pass to Node action.
**Rejected**: 5MiB argument limit too restrictive for ZIP files.

### 2. Move to V8 Runtime
Remove `"use node"` directive entirely.
**Rejected**: JSZip and other libraries may require Node-specific APIs.

### 3. Change CONVEX_SITE_ORIGIN to localhost
Set origin to `http://localhost:3211`.
**Rejected**: Breaks browser access which needs `.loc` domains.

### 4. Use External Storage (R2/S3)
Configure S3-compatible storage accessible from anywhere.
**Rejected**: Adds infrastructure complexity for a self-hosted-only issue.

### 5. HTTP-Only (No Direct Attempt)
Always use HTTP endpoint, skip direct attempt.
**Rejected**: Adds unnecessary latency in production.

## Affected Code

| File | Change |
|------|--------|
| `convex/http.ts` | Added `/internal/storage-blob` endpoint |
| `convex/zipProcessor.ts` | Uses `getStorageBlob()` helper |
| `convex/debugNetworking.ts` | Diagnostic tests (can be removed) |

## When to Apply This Pattern

Use this pattern when:
- Writing a Node action (`"use node"`)
- That needs to read from Convex storage
- And must work in both self-hosted and Convex Cloud

**Do NOT use this pattern for:**
- V8 runtime actions (storage.get() works directly)
- Mutations/queries (use different storage access)
- Writing to storage (`ctx.storage.store()` works in Node actions)

## Related

- Task: `tasks/00045-node-action-storage-fix/`
- GitHub Issue: https://github.com/clintagossett/artifact-review/issues/45
- Convex Issue: https://github.com/get-convex/convex-backend/issues/179
