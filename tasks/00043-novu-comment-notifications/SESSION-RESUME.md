# Session Resume - Task 00043: Novu Comment Notifications

## Session Date: 2026-01-27

## Context

This session continued work on implementing Novu in-app notifications for comments (GitHub issue #43). The session was focused on debugging why E2E tests fail - specifically, user authentication doesn't work after signup.

## What Was Accomplished

### 1. Subtasks 01 & 02 - Previously Complete
- **01-subscriber-sync**: Novu subscriber sync on user signup ✅
- **02-novu-workflow-setup**: Comment notification workflow with in-app channel ✅

### 2. Subtask 03 - E2E Tests (BLOCKED)
Wrote comprehensive E2E test suite but blocked by infrastructure issue:
- Test file: `03-e2e-notification-tests/tests/e2e/notification.spec.ts`
- Tests cover: comment notifications, replies, thread participants, self-exclusion, badge counts, mark-as-read

### 3. Infrastructure Debugging
Significant work on orchestrator proxy to support Convex self-hosted:

**Orchestrator changes (uncommitted in agentic-dev):**
- `orchestrator/proxy.js` - Added CORS handling, WebSocket/HTTP port routing
- `orchestrator/config.json` - Fixed port mapping (apiPort: 3220)

**Key fixes made:**
- CORS preflight handling for Convex-specific headers
- Separate routing for WebSocket (sync) vs HTTP (actions)
- Error handling for WebSocket sockets vs HTTP responses

## The Blocking Issue

**Problem:** `useConvexAuth()` returns `isAuthenticated: false` even when valid JWT tokens exist in localStorage after signup.

**What we know:**
1. Signup succeeds on backend (Convex logs confirm)
2. JWT stored correctly: `__convexAuthJWT_httpapimarkloc`
3. JWT is valid (correct issuer, audience, expiration)
4. Auth state goes `isLoading: true` → `isLoading: false` but `isAuthenticated` stays `false`
5. Issue persists even after page reload

**Hypothesis:** The `@convex-dev/auth` library's `readStateFromStorage()` function isn't reading the token, or token verification is failing silently.

## Files Modified This Session

### In artifact-review (committed):
- `app/src/components/ConvexClientProvider.tsx` - Added debug instrumentation (AuthDebugger component, verbose mode)
- Various task documentation files
- RESUME.md in 03-e2e-notification-tests/

### In agentic-dev (NOT committed):
- `orchestrator/proxy.js` - CORS and routing fixes
- `orchestrator/config.json` - Port fix

## Commit Made

```
b47a4be wip: Novu notification system - blocked on auth state propagation
Branch: mark/dev-work
Repo: artifact-review
```

## Next Steps for Continuing Agent

1. **Debug auth token reading** - Add console.log inside `@convex-dev/auth` node_modules to trace `readStateFromStorage()`

2. **Check `client.address`** - Verify it matches the localStorage key suffix

3. **Test without proxy** - Rebuild app with `NEXT_PUBLIC_CONVEX_URL=http://localhost:3220` to bypass proxy entirely

4. **Consider alternative** - May need to skip E2E auth tests and test notifications manually, or mock the auth layer

5. **Commit orchestrator changes** - The proxy fixes in agentic-dev should be committed separately

## Key Files to Read

| File | Purpose |
|------|---------|
| `03-e2e-notification-tests/RESUME.md` | Detailed debug findings |
| `app/src/components/ConvexClientProvider.tsx` | Current debug instrumentation |
| `app/node_modules/@convex-dev/auth/dist/react/client.js` | Auth provider implementation |
| `orchestrator/proxy.js` | Proxy with CORS fixes |

## Commands to Resume Testing

```bash
# Run auth debug test
cd /home/clint-gossett/Documents/agentic-dev/agents/mark/artifact-review/tasks/00043-novu-comment-notifications/03-e2e-notification-tests/tests/e2e
npx playwright test notification.spec.ts --project=chromium -g "Auth Debug"

# Watch Convex logs
tail -f /home/clint-gossett/Documents/agentic-dev/agents/mark/artifact-review/app/logs/convex.log

# Check proxy logs
tail -f /home/clint-gossett/Documents/agentic-dev/orchestrator/proxy.log
```

## Environment Notes

- App: `http://mark.loc` → localhost:3010
- API: `http://api.mark.loc` → localhost:3220 (Convex admin port)
- Convex: Self-hosted Docker container
- Orchestrator proxy running on port 80

## Cleanup Needed

The `ConvexClientProvider.tsx` has debug code that should be removed before merging:
- `AuthDebugger` component
- Verbose mode setting
- Console.log statements
