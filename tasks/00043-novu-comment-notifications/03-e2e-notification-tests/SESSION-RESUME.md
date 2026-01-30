# Session Resume: E2E Notification Tests

## Status: INFRASTRUCTURE COMPLETE, TEST NEEDS POLISH

The core Novu notification infrastructure is now working. The E2E test progresses through most of the flow but needs a fix for the text selection/comment creation step.

## What Was Fixed This Session

### 1. Novu Browser-Side Configuration
The Novu client in the browser was connecting to Novu Cloud instead of the local instance.

**Fixes:**
- Added `NEXT_PUBLIC_NOVU_API_URL=http://api.novu.loc` to `.env.local`
- Added `NEXT_PUBLIC_NOVU_SOCKET_URL=http://ws.novu.loc` to `.env.local`
- Updated `NotificationCenter.tsx` with `backendUrl` and `socketUrl` props

### 2. Novu WebSocket Routing
The Novu WebSocket service wasn't accessible from outside Docker.

**Fixes:**
- Exposed port 3003 for `novu-ws` in `/home/clint-gossett/Documents/agentic-dev/services/novu/docker-compose.yml`
- Added `wsPort: 3003` to orchestrator `config.json`
- Added `ws` to production prefixes in orchestrator `proxy.js`
- Route `ws.novu.loc` now routes to Novu WebSocket service

### 3. Documentation Updates
- Updated `.env.local.example` with new Novu env vars
- Updated `docs/ENVIRONMENT_VARIABLES.md` with new Novu env vars

### 4. Test Fixes
- Updated `inviteReviewer` to navigate directly to settings page (bypassing Manage button click issue)
- Fixed settings tab selector to use `button` role with regex for emoji tabs (e.g., `👥Access`)

## Current Test Status

The notification test (`1.1: Reviewer comments on artifact`) now progresses through:

1. ✅ Owner signs up
2. ✅ Owner uploads artifact (ZIP processing works!)
3. ✅ Owner invites reviewer via settings page
4. ✅ Owner navigates back to artifact
5. ✅ Owner has no initial notifications
6. ✅ Reviewer signs up
7. ✅ Reviewer reaches artifact
8. ❌ Reviewer adding comment... (blocked - text selection not triggering annotation flow)

## Remaining Issue

The `selectTextAndComment` helper in the test is not properly triggering the annotation draft flow. The test selects text in the iframe and dispatches a mouseup event, but the annotation input doesn't appear.

**Root cause:** The iframe text selection isn't being detected by the annotation system.

**Potential fixes:**
1. Debug the selection layer hooks to understand how selection events propagate
2. Try using Playwright's built-in text selection methods
3. Consider using the SelectionMenu context menu instead of direct selection

## What Works Now

- `http://mark.loc` - Next.js app ✅
- `http://mark.convex.cloud.loc` - Convex WebSocket/sync ✅
- `http://mark.convex.site.loc` - Convex HTTP actions ✅
- `http://api.novu.loc` - Novu API ✅
- `http://ws.novu.loc` - Novu WebSocket ✅
- ZIP upload and processing ✅
- Novu subscriber sync ✅
- Artifact invite flow ✅

## Commands to Resume

```bash
# Start dev servers
cd /home/clint-gossett/Documents/agentic-dev/agents/mark/artifact-review
./scripts/start-dev-servers.sh

# Run the notification test
cd tasks/00043-novu-comment-notifications/03-e2e-notification-tests/tests/e2e
npx playwright test notification.spec.ts --project=chromium -g "1.1: Reviewer comments" --headed

# Debug the trace
npx playwright show-trace test-results/notification-Notification--bf7d6-ner-sees-notification-badge-chromium/trace.zip
```

## Next Steps

1. Fix `selectTextAndComment` helper to properly trigger annotation draft
2. Once comment creation works, verify notification appears for owner
3. Run full test suite for notifications
4. Move to subtask 04 (Email digest integration)

## Key Files

- Test file: `tasks/00043-novu-comment-notifications/03-e2e-notification-tests/tests/e2e/notification.spec.ts`
- Annotation components: `app/src/components/annotations/`
- Selection layer: `app/src/lib/annotation/react/useSelectionLayer.ts`
- NotificationCenter: `app/src/components/NotificationCenter.tsx`
