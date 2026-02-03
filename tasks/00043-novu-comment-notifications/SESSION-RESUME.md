# Session Resume - Task 00043: Novu Comment Notifications

## Session Date: 2026-01-27

## Current Status: IN PROGRESS (75% Complete)

Issue #45 (Node action storage access) has been resolved. The Novu notification infrastructure is now working. E2E tests progress through 7/8 steps - only the text selection/comment creation step needs fixing.

## Subtask Status

| Subtask | Status | Notes |
|---------|--------|-------|
| 01-subscriber-sync | ✅ Complete | Novu subscriber sync working |
| 02-novu-workflow-setup | ✅ Complete | Workflow registered |
| 03-e2e-notification-tests | 🔄 In Progress | Infrastructure complete, test needs polish |
| 04-email-digest-integration | ⏳ Not Started | |

## What Was Fixed This Session

### 1. Issue #45 Resolved (Externally)
- ZIP upload and processing now work
- Artifacts can be created via E2E tests

### 2. Novu Browser-Side Configuration
The Novu client in the browser was connecting to Novu Cloud instead of the local instance.

**Fixes Applied:**
- Added `NEXT_PUBLIC_NOVU_API_URL=https://api.novu.loc` to `.env.local`
- Added `NEXT_PUBLIC_NOVU_SOCKET_URL=wss://ws.novu.loc` to `.env.local`
- Updated `NotificationCenter.tsx` with `backendUrl` and `socketUrl` props

### 3. Novu WebSocket Routing
The Novu WebSocket service wasn't accessible from outside Docker.

**Fixes Applied:**
- Exposed port 3003 for `novu-ws` in `/home/clint-gossett/Documents/agentic-dev/services/novu/docker-compose.yml`
- Added `wsPort: 3003` to orchestrator `config.json`
- Added `ws` to production prefixes in orchestrator `proxy.js`
- Route `ws.novu.loc` now routes to Novu WebSocket service

### 4. Documentation Updates
- Updated `.env.local.example` with new Novu env vars
- Updated `docs/ENVIRONMENT_VARIABLES.md` with new Novu env vars

### 5. E2E Test Fixes
- Updated `inviteReviewer` to navigate directly to settings page
- Fixed settings tab selector to use button role with regex for emoji tabs

## E2E Test Progress

The notification test (`1.1: Reviewer comments on artifact`) now progresses through:

1. ✅ Owner signs up
2. ✅ Owner uploads artifact (ZIP processing works!)
3. ✅ Owner invites reviewer via settings page
4. ✅ Owner navigates back to artifact
5. ✅ Owner has no initial notifications
6. ✅ Reviewer signs up
7. ✅ Reviewer reaches artifact
8. ❌ Reviewer adding comment (text selection not triggering annotation flow)

## Remaining Work

1. **Fix `selectTextAndComment` helper** - The test's text selection in the iframe isn't triggering the annotation draft flow
2. **Complete notification verification** - Once commenting works, verify owner receives notification
3. **Run full notification test suite**
4. **Move to subtask 04** - Email digest integration

## Working Infrastructure

- `https://mark.loc` - Next.js app ✅
- `https://mark.convex.cloud.loc` - Convex WebSocket/sync ✅
- `https://mark.convex.site.loc` - Convex HTTP actions ✅
- `https://api.novu.loc` - Novu API ✅
- `wss://ws.novu.loc` - Novu WebSocket ✅
- ZIP upload and processing ✅
- Novu subscriber sync ✅
- Artifact invite flow ✅

## Commands to Resume

```bash
# Start dev servers
cd /home/clint-gossett/Documents/agentic-dev/agents/mark/artifact-review
./scripts/start-dev-servers.sh

# Run the notification E2E test
cd tasks/00043-novu-comment-notifications/03-e2e-notification-tests/tests/e2e
npx playwright test notification.spec.ts --project=chromium -g "1.1: Reviewer comments" --headed

# Check Novu setup
./scripts/setup-novu-org.sh --check
```

## Key Files

- Test spec: `tasks/00043-novu-comment-notifications/03-e2e-notification-tests/tests/e2e/notification.spec.ts`
- NotificationCenter: `app/src/components/NotificationCenter.tsx`
- Annotation components: `app/src/components/annotations/`
- Selection layer: `app/src/lib/annotation/react/useSelectionLayer.ts`
- Novu shared services: `/home/clint-gossett/Documents/agentic-dev/services/novu/docker-compose.yml`
