# Auth Debug Resume - Session 2025-12-26

**Status:** IN PROGRESS - Auth flow not completing
**Last Updated:** 2025-12-26 10:07 AM

---

## Current Problem

Anonymous authentication **partially works** but **never completes**:
- ✅ Backend creates user account successfully
- ✅ Backend executes `signIn` successfully
- ✅ Backend runs `refreshSession`
- ❌ Frontend never receives auth state update
- ❌ `isAuthenticated` stays `false`
- ❌ `getCurrentUser` query never returns a user

---

## What We Fixed Today

### 1. Created `auth.config.ts` ✅
```typescript
// app/convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

### 2. Set JWKS Environment Variable ✅
```bash
npx convex env set JWKS '{"keys":[...]}'
```
- JWKS error was blocking JWT validation
- Now set correctly on dev deployment

### 3. Fixed SITE_URL Mismatch ✅
```bash
npx convex env set SITE_URL http://localhost:3000
```
- Was set to `http://localhost:3001` (wrong port)
- Now matches Next.js server port

### 4. Removed Custom Users Table Override ✅
**Before (WRONG):**
```typescript
export default defineSchema({
  ...authTables,
  users: defineTable({ /* custom */ }), // ❌ Overrides default!
});
```

**After (CORRECT):**
```typescript
export default defineSchema({
  ...authTables,  // ✅ Use default users table
});
```

### 5. Simplified auth.ts ✅
**Now matches Chef's working implementation:**
```typescript
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Anonymous],
});
```
- No custom callbacks
- Uses default Convex Auth user creation

### 6. Updated Frontend to Use `<Authenticated>` / `<Unauthenticated>` Components ✅
Changed from `useConvexAuth()` hook to component-based pattern like Chef uses.

---

## Backend Logs Show Success

**Latest sign-in attempt (10:06:56 AM):**
```
[CONVEX M(auth:store)] [INFO] 'auth:store type: createAccountFromCredentials'
[CONVEX M(auth:store)] [INFO] 'auth:store type: signIn'
```

**No errors** in backend logs.

---

## Frontend Logs Show Failure

**Browser console:**
```
[DEBUG] Current user: null
[DEBUG] Starting anonymous sign-in
```

**Convex logs in browser:**
```
[CONVEX Q(users:getCurrentUser)] [DEBUG] 'No authenticated user'
```

The query **never re-runs** after sign-in completes.

---

## Key Files

### Backend
- `app/convex/auth.ts` - Auth configuration (simplified, matches Chef)
- `app/convex/auth.config.ts` - SITE_URL and app ID config
- `app/convex/schema.ts` - Uses default authTables (no override)
- `app/convex/users.ts` - getCurrentUser query
- `app/convex/http.ts` - HTTP routes for auth

### Frontend
- `app/src/app/page.tsx` - Landing page with sign-in button
- `app/src/components/ConvexClientProvider.tsx` - Convex provider setup

### Environment
- JWKS: Set on dev deployment
- SITE_URL: `http://localhost:3000`
- JWT_PRIVATE_KEY: Set

---

## Comparison with Working Chef Implementation

| Feature | Chef (Working) | Current (Broken) | Status |
|---------|---------------|------------------|--------|
| `authTables` usage | ✅ Default only | ✅ Default only | MATCHES |
| Custom users table | ❌ None | ❌ None | MATCHES |
| Custom callback | ❌ None | ❌ None | MATCHES |
| `isAuthenticated` export | ✅ Yes | ✅ Yes | MATCHES |
| SITE_URL | ✅ Correct | ✅ Correct | MATCHES |
| JWKS | ✅ Set | ✅ Set | MATCHES |
| auth.config.ts | ✅ Has it | ✅ Has it | MATCHES |
| Frontend pattern | `<Authenticated>` | `<Authenticated>` | MATCHES |
| Framework | Vite + React | Next.js | **DIFFERENT** |

---

## Theories on Root Cause

### Theory 1: Next.js vs Vite Issue
Chef uses **Vite**, we use **Next.js App Router**. Possible issues:
- Next.js SSR/hydration affecting Convex client initialization
- ConvexAuthProvider not properly initialized in Next.js "use client" component
- WebSocket connection timing issues with Next.js

### Theory 2: ConvexClientProvider Setup
Check if ConvexReactClient is being recreated on every render (should be singleton).

### Theory 3: Session Token Not Being Stored/Retrieved
- Backend creates token successfully
- Frontend may not be receiving/storing it in localStorage
- Or token is stored but not being sent back in subsequent requests

### Theory 4: Package Version Issues
Current versions:
- `@convex-dev/auth`: `^0.0.90`
- `convex`: `^1.31.2`

Chef's working versions:
- `@convex-dev/auth`: `^0.0.80`
- `convex`: `^1.24.2`

10 version difference in auth library could have breaking changes.

---

## Next Steps to Try

### Priority 1: Check Browser Storage
1. Open DevTools → Application → Local Storage
2. After clicking "Start Using Artifact Review", check if JWT tokens are being stored
3. Look for keys like `convex-auth-token` or similar

### Priority 2: Check Network Tab
1. Open DevTools → Network tab
2. Click sign-in button
3. Look for:
   - POST requests to Convex auth endpoints
   - Response status codes
   - Response bodies with tokens
   - Subsequent requests including auth headers

### Priority 3: Downgrade Packages
Match Chef's exact versions:
```bash
cd app
npm install @convex-dev/auth@0.0.80 convex@1.24.2
```

### Priority 4: Test with Vite Instead of Next.js
Create minimal Vite app with same auth setup to isolate framework issues.

### Priority 5: Enable Convex Auth Debug Logging
Check if `@convex-dev/auth` has debug mode that can show more details about auth flow.

### Priority 6: Compare ConvexClientProvider
Review how ConvexReactClient is initialized in Chef vs our Next.js implementation.

---

## Commands to Resume

```bash
# Start dev servers
cd app
npm run dev:log

# Check logs
tail -f app/logs/convex.log | grep -E "signIn|getCurrentUser|Error"

# Check environment
npx convex env list

# Check if servers are running
ps aux | grep -E "convex dev|next dev"
```

---

## Files Modified This Session

```
app/convex/auth.config.ts         # Created
app/convex/auth.ts                 # Simplified (removed callback)
app/convex/schema.ts               # Removed custom users table
app/convex/users.ts                # Fixed return type validators
app/src/app/page.tsx               # Switched to <Authenticated> components
```

---

## Delta Report Reference

Full comparison with working Chef implementation:
`tasks/00006-local-dev-environment/AUTH-DELTA-REPORT.md`

---

## Key Insight

**The backend auth flow works perfectly.** Users are created, sign-in completes, sessions are established. The problem is purely on the **frontend** - the client isn't detecting the auth state change or receiving the session tokens properly.

This suggests either:
1. A Convex client initialization issue in Next.js
2. A WebSocket subscription issue
3. A session token storage/retrieval issue
4. A version incompatibility between packages

Focus debugging efforts on the **client-side auth state management** and **Convex client setup**, not the backend.
