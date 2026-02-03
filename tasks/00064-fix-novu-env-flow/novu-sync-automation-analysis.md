# Novu Bridge Sync Automation Analysis

**Task:** Automate Novu workflow sync instead of requiring manual trigger.

## Current Startup Order

```
agent-init.sh (first-time setup)
├── Step 0: Check prerequisites (Node, Docker, tmux, jq)
├── Step 1: Setup env files (generate from config.json)
├── Step 2: Verify orchestrator (start if needed)
├── Step 3: Install npm dependencies
├── Step 4: Start Convex container (docker compose up -d)
├── Step 5: setup-novu-org.sh ─────────────────────┐
│   ├── Check Novu available                       │
│   ├── Login/Register user                        │
│   ├── Create/verify organization                 │
│   ├── Get API keys                               │
│   ├── Update .env.nextjs.local                   │
│   └── Update .env.convex.local                   │
├── Step 6: setup-convex-env.sh ───────────────────┤
│   ├── Generate JWT keys                          │
│   ├── Get admin key from container               │
│   ├── Set vars in Convex (including NOVU_*)      │
│   └── Kill convex-dev tmux session               │
└── Step 7: Show status and next steps             │
                                                   │
start-dev-servers.sh (runtime) ◄───────────────────┘
├── Load .env.docker.local
├── DNS check (6 domains)
├── Register with orchestrator proxy
├── Start Docker services (Convex container)
├── Initialize Convex (npx convex dev --once)
├── Start tmux sessions:
│   ├── {agent}-convex-dev (npx convex dev)
│   ├── {agent}-nextjs (npm run dev -p {port}) ◄── Bridge endpoint available HERE
│   └── {agent}-stripe (stripe listen)
├── Wait 2s for port binding
└── Print status summary
```

## When Is Bridge Endpoint Available?

The bridge endpoint (`/api/novu`) is a Next.js API route at `app/src/app/api/novu/route.ts`.

**Available when:**
1. `{agent}-nextjs` tmux session is running
2. Next.js dev server has bound to the port (~2s after session starts)
3. Orchestrator proxy is routing `{agent}.loc` → Next.js port

**NOT available during:**
- `agent-init.sh` - Next.js isn't running yet
- `setup-novu-org.sh` - Only Novu backend is running
- `setup-convex-env.sh` - Only Convex is running

## Recommendation: Where to Add Automation

### For Local Development: `start-dev-servers.sh`

**Add sync at the end of start-dev-servers.sh**, after all tmux sessions are running.

**Rationale:**
1. All dependencies are met:
   - Novu org exists (from `setup-novu-org.sh`)
   - Credentials are in env files
   - Next.js is running (bridge endpoint available)
2. Runs every time dev servers start (idempotent)
3. Natural place for "post-startup" hooks
4. User sees sync status in startup output

**Implementation:**

```bash
# Add after the status summary print, before final "Setup complete!" message

sync_novu_workflows() {
    log_info "Syncing Novu workflows..."

    local secret_key
    secret_key=$(grep "^NOVU_SECRET_KEY=" "$APP_DIR/.env.nextjs.local" 2>/dev/null | cut -d= -f2)

    if [ -z "$secret_key" ]; then
        log_warn "NOVU_SECRET_KEY not found, skipping workflow sync"
        return 0
    fi

    local bridge_url="https://${AGENT_NAME}.loc/api/novu"
    local novu_api_url="https://api.novu.loc"

    # Wait for Next.js to be ready (bridge endpoint must respond)
    local max_attempts=10
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -sk "$bridge_url" >/dev/null 2>&1; then
            break
        fi
        log_info "Waiting for bridge endpoint... ($attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_attempts ]; then
        log_warn "Bridge endpoint not responding, skipping workflow sync"
        return 0
    fi

    # Sync via API
    local response
    response=$(curl -sk -X POST "${novu_api_url}/v1/bridge/sync" \
        -H "Authorization: ApiKey ${secret_key}" \
        -H "Content-Type: application/json" \
        -d "{\"bridgeUrl\": \"${bridge_url}\"}" 2>&1)

    if echo "$response" | jq -e '.data' >/dev/null 2>&1; then
        log_info "Novu workflows synced successfully"
    else
        log_warn "Novu workflow sync failed: $response"
    fi
}
```

### For Deployments: Post-Deploy Hook

Deployments need a separate mechanism since `start-dev-servers.sh` is for local dev only.

**Options:**

1. **CI/CD Pipeline Step** - Add after deploy succeeds:
   ```yaml
   - name: Sync Novu Workflows
     run: |
       curl -X POST "$NOVU_API_URL/v1/bridge/sync" \
         -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
         -H "Content-Type: application/json" \
         -d '{"bridgeUrl": "$DEPLOYED_APP_URL/api/novu"}'
   ```

2. **Vercel Deploy Hook** - If using Vercel, add post-deploy webhook

3. **App Startup Hook** - Sync on first request to `/api/novu` (self-healing but adds latency)

## Implementation Plan

### Phase 1: Local Dev Automation ✅ COMPLETE

1. ✅ Added `sync_novu_workflows()` function to `start-dev-servers.sh`
2. ✅ Called after tmux sessions start, before final message
3. ✅ Updated `docs/development/novu-setup.md` to reflect automatic sync

**Implementation details:**
- Function waits up to 30s for bridge endpoint to be ready
- Uses Novu API (`POST /v1/bridge/sync`) instead of CLI for reliability
- Graceful failure handling (warnings, not errors)
- Reports workflow count on success

### Phase 2: Deployment Automation (Future)

1. Create `scripts/sync-novu-workflows.sh` as standalone script
2. Integrate into CI/CD pipeline
3. Add post-deploy verification

## Files to Modify

| File | Change |
|------|--------|
| `scripts/start-dev-servers.sh` | Add `sync_novu_workflows()` function |
| `docs/development/novu-setup.md` | Update to note automatic sync on startup |
| (Future) `scripts/sync-novu-workflows.sh` | Standalone script for CI/CD |

## Edge Cases

1. **Novu not running** - Skip sync gracefully, warn user
2. **Bridge not responding** - Retry with timeout, warn user
3. **Invalid credentials** - Warn user to run `setup-novu-org.sh`
4. **Workflow already synced** - Novu API is idempotent, safe to re-sync

## Verification

After implementation, verify:
```bash
# Start servers (should auto-sync)
./scripts/start-dev-servers.sh

# Verify workflow exists
curl -s https://api.novu.loc/v1/workflows \
  -H "Authorization: ApiKey $(grep NOVU_SECRET_KEY app/.env.nextjs.local | cut -d= -f2)" \
  | jq '.data[].name'

# Expected: "new-comment"
```
