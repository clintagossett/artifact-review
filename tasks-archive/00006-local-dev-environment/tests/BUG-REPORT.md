# BUG REPORT: Anonymous Authentication Not Completing Client-Side

**Date:** 2025-12-26
**Status:** BLOCKING - Anonymous auth cannot be validated
**Severity:** HIGH - Core functionality broken

## Summary

Anonymous authentication succeeds at the network/storage level (tokens are generated and stored in localStorage), but the React client does not recognize the authentication state, resulting in users staying on the landing page indefinitely after clicking "Start Using Artifact Review".

## Expected Behavior

1. User visits http://localhost:3000
2. User clicks "Start Using Artifact Review" button
3. Anonymous sign-in completes
4. User sees dashboard with:
   - "Welcome to Artifact Review" title
   - User ID displayed
   - "Anonymous Session" status
   - "Sign Out" button

## Actual Behavior

1. User visits http://localhost:3000 ✅
2. User clicks "Start Using Artifact Review" button ✅
3. Anonymous sign-in **appears** to complete:
   - Network request to `/api/action` returns 200 OK ✅
   - Response includes valid JWT and refresh tokens ✅
   - Tokens are stored in localStorage ✅
4. User **stays on landing page** ❌
   - Dashboard never renders
   - `isAuthenticated` stays `false`
   - `currentUser` stays `null`
   - Subsequent queries to `getCurrentUser` return "No authenticated user"

## Root Cause Analysis

### What's Working

1. **Backend Authentication** ✅
   - Convex Auth `signIn` action executes successfully
   - Valid JWT tokens are generated
   - Tokens include correct claims (sub, iss, aud, exp)
   - Tokens are returned to client

2. **Token Storage** ✅
   - Tokens are correctly stored in localStorage with keys:
     - `__convexAuthRefreshToken_httpsmildptarmigan109convexcloud`
     - `__convexAuthJWT_httpsmildptarmigan109convexcloud`

### What's Broken

3. **Client-Side Auth State** ❌
   - `useConvexAuth()` hook never updates to `isAuthenticated: true`
   - `useQuery(api.users.getCurrentUser)` continues to return `null`
   - ConvexReactClient is not sending Authorization header with stored JWT

### Evidence

#### Console Logs During Sign-In

```
[DEBUG] Auth state: {isLoading: false, isAuthenticated: false, currentUser: null}
[DEBUG] Anonymous sign-in button clicked
[DEBUG] Sign-in completed: {signingIn: true}  ← signIn() returns
[DEBUG] Auth state: {isLoading: false, isAuthenticated: false, currentUser: null}  ← NO CHANGE
[CONVEX Q(users:getCurrentUser)] "No authenticated user"  ← Still unauthenticated
```

#### Network Activity

```
→ REQUEST: POST https://mild-ptarmigan-109.convex.cloud/api/action
← RESPONSE: 200 OK
  Body: {
    "status": "success",
    "value": {
      "tokens": {
        "refreshToken": "jd7...",
        "token": "eyJhbGciOiJSUzI1NiJ9..."
      }
    }
  }
```

#### LocalStorage After Sign-In

```javascript
{
  "__convexAuthRefreshToken_httpsmildptarmigan109convexcloud": "jd7...|jh7...",
  "__convexAuthJWT_httpsmildptarmigan109convexcloud": "eyJhbGciOiJSUzI1NiJ9..."
}
```

#### JWT Decoded Payload

```json
{
  "sub": "jx713yxxt5613bhw0q6qedkntn7y1fh3|jh76cxbsttkkzk7gesjxdea1nx7y0dz1",
  "iat": 1766765017,
  "iss": "https://mild-ptarmigan-109.convex.site",
  "aud": "convex",
  "exp": 1766768617
}
```

### Hypothesis

The `ConvexReactClient` instance is created when the module loads:

```typescript
// src/components/ConvexClientProvider.tsx
const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);
```

This client instance is created **before** tokens exist in localStorage. When `ConvexAuthProvider` wraps this client, it should be monitoring localStorage and adding auth headers to requests, but this is not happening.

Possible causes:
1. ConvexAuthProvider is not properly configured to read from localStorage
2. There's a race condition where the provider doesn't detect the token update
3. The client needs to be re-initialized after tokens are stored
4. There's a version mismatch or bug in `@convex-dev/auth@0.0.90`

## Reproduction Steps

### Automated Test

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app
node test-auth-simple.mjs
```

**Result:** Dashboard never appears, even after waiting 10+ seconds.

### Manual Test

1. Ensure dev servers are running:
   ```bash
   # Terminal 1
   npx convex dev --tail-logs always

   # Terminal 2
   npm run dev
   ```

2. Open http://localhost:3000 in browser with DevTools open
3. Click "Start Using Artifact Review"
4. Observe:
   - Console shows "Sign-in completed: {signingIn: true}"
   - Network tab shows successful POST to `/api/action`
   - Application tab → LocalStorage shows tokens
   - **But page does not change**

## Files Involved

| File | Purpose | Status |
|------|---------|--------|
| `app/convex/auth.ts` | Auth configuration | ✅ Working |
| `app/convex/users.ts` | getCurrentUser query | ✅ Working |
| `app/src/components/ConvexClientProvider.tsx` | Client setup | ❌ Issue here |
| `app/src/app/page.tsx` | Landing + Dashboard UI | ✅ Working |

## Attempted Fixes

1. ✅ Removed incorrect `convex/auth.config.ts` file (was using `process.env`)
2. ✅ Verified Convex deployment has correct schema and functions
3. ✅ Confirmed environment variables are set correctly
4. ⏳ Have not tried: Restarting Next.js dev server
5. ⏳ Have not tried: Different ConvexAuthProvider configuration
6. ⏳ Have not tried: Upgrading `@convex-dev/auth` package

## Next Steps

### Immediate Actions Needed

1. **Restart Next.js dev server** - In case it needs to pick up Convex schema changes
2. **Check for ConvexAuthProvider configuration options** - May need additional props
3. **Review Convex Auth documentation** - Verify setup pattern is correct
4. **Check package versions** - May need to upgrade `@convex-dev/auth`

### Potential Solutions

#### Option A: Force Client Re-initialization

```typescript
// Try creating client inside useEffect to pick up tokens
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() =>
    new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string)
  );

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
```

#### Option B: Add Storage Configuration

```typescript
// Check if ConvexAuthProvider needs explicit storage config
<ConvexAuthProvider
  client={convex}
  storage={localStorage} // Explicitly pass storage?
>
  {children}
</ConvexAuthProvider>
```

#### Option C: Upgrade Package

```bash
npm install @convex-dev/auth@latest
```

## Impact

- **Blocking:** Step 1 validation cannot be completed
- **User Experience:** Application appears broken - users cannot proceed past landing page
- **Testing:** Automated validation impossible until fixed
- **Timeline:** Delays Step 2 (Magic Links) until Step 1 works

## Related Issues

- Unit tests with `convex-test` pass ✅ (these mock the entire stack)
- Backend auth callbacks are never called (createOrUpdateUser logs not appearing)
- This suggests the issue is purely client-side integration

## Validation Checklist (Blocked)

- [ ] Anonymous auth works at localhost:3000
- [ ] No Convex connection errors
- [ ] Session persists across refresh
- [ ] Sign out creates new session

**All items blocked until client-side auth state updates correctly.**

## References

- Convex Auth Docs: https://labs.convex.dev/auth
- Anonymous Provider: https://labs.convex.dev/auth/config/anonymous
- Package Version: `@convex-dev/auth@0.0.90`
- Implementation: `/tasks/00006-local-dev-environment/step-1-implementation-summary.md`
