# E2E Notification Tests - Test Report

## Summary

**Status**: BLOCKED - Infrastructure Configuration Issues

The E2E tests for the notification system have been written and are ready, but execution is blocked by orchestrator proxy configuration issues affecting cross-origin requests between `mark.loc` and `api.mark.loc`.

## Test Files Created

- `tests/e2e/notification.spec.ts` - Comprehensive E2E test suite
- `tests/e2e/playwright.config.ts` - Playwright configuration

## Tests Implemented

### Test 1: New Comment Notifies Artifact Owner
- 1.1: Reviewer comments on artifact -> Owner sees notification badge
- 1.2: Comment contains reviewer name and artifact reference
- 1.3: Clicking notification opens artifact at comment

### Test 2: Reply Notifies Comment Author
- 2.1: Owner replies -> Reviewer sees badge
- 2.2: Notification shows thread context
- 2.3: Click opens comment thread

### Test 3: Multiple Thread Participants
- 3.1: Multiple users join thread -> all notified
- 3.2: Badge shows unread count
- 3.3: Mark as read updates badge

### Test 4: Notification Persistence
- 4.1: Notifications persist across page reload
- 4.2: Notifications persist across logout/login

## Infrastructure Issues Encountered

1. **WebSocket vs HTTP Port Routing**: Convex self-hosted uses separate ports for WebSocket sync (3220) and HTTP actions (3221). The orchestrator proxy needed modification to route these differently.

2. **CORS Headers**: Cross-origin requests from `mark.loc` to `api.mark.loc` require proper CORS handling. Convex-specific headers (`Convex-Client`, `Convex-Session-Id`) need to be allowed.

3. **Storage URL Generation**: `CONVEX_SITE_ORIGIN` needed to be updated to use the proxy URL.

## Proxy Updates Made

Updated `/orchestrator/proxy.js`:
- Added separate port routing for WebSocket (apiPort) vs HTTP (apiHttpPort)
- Added CORS preflight handling
- Added proxyRes handler for CORS headers on responses

Updated `/orchestrator/config.json`:
- Added `apiHttpPort` configuration for HTTP-specific routing

## Verification Status

- **Unit Tests** (Subtask 01 & 02): All 8 tests passing
- **E2E Tests**: Blocked by infrastructure - CORS issues remain

## Recommendation

The notification feature implementation is complete (backend integration, Novu sync, workflow triggers). The E2E tests are written and ready. Once the orchestrator infrastructure is fully configured, these tests should pass.

For immediate validation, the feature can be manually tested through the UI.
