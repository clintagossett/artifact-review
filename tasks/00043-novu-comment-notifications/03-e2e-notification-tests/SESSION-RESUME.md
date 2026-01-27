# Session Resume: E2E Notification Tests

## Status: AUTH BLOCKER RESOLVED

The auth issue that was blocking this task has been fixed. Both password and magic link authentication now work through the DNS proxy.

## Task

Complete E2E tests for task 43 (Novu comment notifications).

## What Was Fixed

### Root Cause
The orchestrator proxy was using `changeOrigin: true` which modified the Host header from `mark.convex.cloud.loc` to `localhost:3220`. Convex auth uses the Host header to determine JWT token scope, causing a mismatch - tokens were scoped to localhost but the client expected them for the DNS name.

### Fixes Applied

1. **Proxy Host Header Preservation** (agentic-dev repo)
   - Changed `changeOrigin: false` for both HTTP and WebSocket in `orchestrator/proxy.js`
   - Created ADR 0004 documenting why this is critical

2. **Explicit Container Names** (artifact-review repo)
   - Added `container_name: ${AGENT_NAME}-backend` in docker-compose.yml
   - Containers are now `mark-backend`, `mark-dashboard`, `mark-mailpit` (no `-1` suffix)
   - Prevents accidental creation of wrong containers

3. **Setup Automation**
   - Created `scripts/setup-convex-env.sh` for JWT keys, admin key, env vars
   - Updated `scripts/setup-novu-org.sh` for Novu setup

4. **Fixed CONVEX_SITE_URL**
   - Changed from `http://api.mark.loc` to `http://mark.convex.site.loc` in `.env`

## Current State

### What Works
- Password authentication via DNS proxy ✅
- Magic link authentication via DNS proxy ✅
- `http://mark.loc` - Next.js app
- `http://mark.convex.cloud.loc` - Convex WebSocket/sync
- `http://mark.convex.site.loc` - Convex HTTP actions
- `http://api.novu.loc` - Novu API
- Docker containers with correct names

### Auth Test Results
```bash
npx playwright test auth.spec.ts -g "Signup with Password"  # ✅ passes (4.8s)
npx playwright test auth.spec.ts -g "Magic Link"            # ✅ passes (5.6s)
```

## Next Steps for Task 43

The E2E notification tests can now proceed. The next agent should:

1. **Review the notification test spec**
   ```bash
   cat app/tests/e2e/notification.spec.ts
   ```

2. **Run the notification E2E tests**
   ```bash
   cd app
   npx playwright test notification.spec.ts --headed
   ```

3. **If tests fail**, check:
   - Novu workflows are created: `./scripts/setup-novu-org.sh --check`
   - Convex has Novu env vars: `npx convex env list | grep NOVU`
   - Container can reach Novu: `docker exec mark-backend curl -s http://api.novu.loc/v1/health`

4. **Complete subtask 03** (E2E notification tests)
5. **Move to subtask 04** (Email digest integration) if time permits

## Commands to Resume

```bash
# Start dev servers (if not running)
cd /home/clint-gossett/Documents/agentic-dev/agents/mark/artifact-review
./scripts/start-dev-servers.sh

# If you see BadAdminKey errors
./scripts/setup-convex-env.sh

# Run notification E2E tests
cd app
npx playwright test notification.spec.ts

# Check Novu setup
./scripts/setup-novu-org.sh --check
```

## Environment

- Containers: `mark-backend`, `mark-dashboard`, `mark-mailpit`
- Volume: `mark_convex_data` (contains JWT keys - DO NOT DELETE)
- @convex-dev/auth: 0.0.90
- Convex backend: ghcr.io/get-convex/convex-backend:latest
- Next.js: 14.2.35

## Key Documentation

- `docs/setup/troubleshooting.md` - Common fixes
- `docs/setup/local-infrastructure.md` - DNS routing explained
- `docs/architecture/decisions/0018-jwt-and-authentication-architecture.md` - JWT details
- `/home/clint-gossett/Documents/agentic-dev/docs/adr/0004-host-header-preservation.md` - Why changeOrigin must be false
