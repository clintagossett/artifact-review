# E2E Notification Tests - Debug Session Resume

## Status: BLOCKED - Auth State Not Propagating

## Problem Summary

The E2E tests for Novu notifications are blocked because user authentication fails after signup, even though:
1. Signup succeeds on the backend (Convex logs confirm user creation)
2. JWT tokens are correctly stored in localStorage
3. The JWT is valid (proper issuer, audience, expiration)

## Root Cause Analysis

**The Issue:** `useConvexAuth()` returns `isAuthenticated: false` even when valid JWT tokens exist in localStorage.

**Key Observations:**
- localStorage key: `__convexAuthJWT_httpsapimarkloc` (matches expected format)
- JWT payload is valid:
  ```json
  {
    "sub": "user_id|session_id",
    "iat": 1769485870,
    "iss": "https://api.mark.loc",
    "aud": "convex",
    "exp": 1769489470
  }
  ```
- Auth state transitions: `isLoading: true` → `isLoading: false`, but `isAuthenticated` stays `false`
- The `@convex-dev/auth` `readStateFromStorage()` function should read from localStorage on mount, but verbose logging doesn't show this happening

## What We've Tried

1. **CORS fixes** - Added proper CORS headers to orchestrator proxy (working)
2. **WebSocket routing** - Fixed proxy to route WebSocket to port 3220 (working)
3. **JWT validation** - Confirmed JWT format and content is correct
4. **Page reload** - Auth still fails after full page reload with tokens in localStorage
5. **Direct navigation** - Navigating to /dashboard after signup still results in redirect
6. **Verbose logging** - Enabled verbose mode on Convex client but didn't see expected logs

## Technical Details

### Environment
- App URL: `https://mark.loc` (proxied to localhost:3010)
- API URL: `https://api.mark.loc` (proxied to localhost:3220)
- Convex: Self-hosted Docker container
- Package versions:
  - `@convex-dev/auth`: ^0.0.90
  - `convex`: ^1.31.2

### Files Modified for Debugging
- `/app/src/components/ConvexClientProvider.tsx` - Added AuthDebugger component and verbose mode
- `/tasks/.../tests/e2e/notification.spec.ts` - Added debug test and enhanced logging

### Key Code Paths
- `@convex-dev/auth/dist/react/client.js` - `AuthProvider` and `useNamespacedStorage`
- Storage key derivation: `${key}_${namespace.replace(/[^a-zA-Z0-9]/g, "")}`
- Expected key: `__convexAuthJWT_httpapimarkloc` (matches what we see)

## Next Steps to Try

1. **Check `client.address` value** - Verify it matches `https://api.mark.loc`
2. **Add logging inside @convex-dev/auth** - Patch the node_modules to add console.logs in `readStateFromStorage`
3. **Test with localhost directly** - Rebuild app with `NEXT_PUBLIC_CONVEX_URL=http://localhost:3220` to bypass proxy
4. **Check for async issues** - The `storageGet` might be returning a Promise that's not being awaited correctly
5. **Verify JWKS/token verification** - The auth provider might be trying to verify the token and failing silently
6. **Check ConvexAuthProvider props** - There might be additional configuration needed for self-hosted

## Hypothesis

The most likely cause is that `@convex-dev/auth` is either:
1. Using a different storage key than expected (maybe including port or path)
2. Attempting JWT verification that fails silently
3. Not calling `readStateFromStorage()` due to some condition we haven't identified

## Commands to Resume

```bash
# Run the debug test
cd /home/clint-gossett/Documents/agentic-dev/agents/mark/artifact-review/tasks/00043-novu-comment-notifications/03-e2e-notification-tests/tests/e2e
npx playwright test notification.spec.ts --project=chromium -g "Auth Debug"

# Check Convex logs
tail -f /home/clint-gossett/Documents/agentic-dev/agents/mark/artifact-review/app/logs/convex.log

# Check proxy logs
tail -f /home/clint-gossett/Documents/agentic-dev/orchestrator/proxy.log
```

## Files to Review

- `/app/src/components/ConvexClientProvider.tsx` - Current debug instrumentation
- `/app/node_modules/@convex-dev/auth/dist/react/client.js` - Auth provider implementation
- `/orchestrator/proxy.js` - Proxy configuration
- `/orchestrator/config.json` - Port mappings
