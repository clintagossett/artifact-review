# Authentication Delta Report: Working vs Broken Implementation

**Date:** 2025-12-26
**Analyst:** Claude Code (TDD Developer Agent)
**Working Implementation:** Chef (`/Users/clintgossett/Downloads/project/`)
**Broken Implementation:** Current (`/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/`)

---

## Executive Summary

The current implementation fails because **the HTTP routes for authentication are not properly registered**, preventing the auth callback workflow from completing. The working Chef implementation has a complete HTTP router setup that the current implementation is missing.

### Critical Missing Component

The current implementation does NOT properly expose the authentication HTTP endpoints that Convex Auth requires to complete the OAuth flow (even for anonymous auth).

---

## Delta Analysis

### 1. HTTP Router Configuration - CRITICAL DIFFERENCE

#### Working (Chef Implementation)

**File:** `/Users/clintgossett/Downloads/project/convex/router.ts`
```typescript
import { httpRouter } from "convex/server";

const http = httpRouter();

export default http;
```

**File:** `/Users/clintgossett/Downloads/project/convex/http.ts`
```typescript
import { auth } from "./auth";
import router from "./router";

const http = router;

auth.addHttpRoutes(http);

export default http;
```

**Status:** ✅ HTTP router created AND auth routes registered

---

#### Broken (Current Implementation)

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/convex/http.ts`
```typescript
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
```

**Status:** ✅ HTTP router created AND auth routes registered

**Wait... this looks correct!** Let me investigate further.

---

### 2. Auth Configuration - MAJOR DIFFERENCE

#### Working (Chef Implementation)

**File:** `/Users/clintgossett/Downloads/project/convex/auth.ts`
```typescript
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
```

**Key Features:**
- ✅ Exports `isAuthenticated` helper
- ✅ Has `Password` provider (along with `Anonymous`)
- ✅ Provides a query function `loggedInUser` in the same file
- ✅ NO callbacks defined (uses default user creation)
- ✅ Uses `getAuthUserId` helper function

---

#### Broken (Current Implementation)

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/convex/auth.ts`
```typescript
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Anonymous],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      console.log('[AUTH CALLBACK] createOrUpdateUser called', { args });

      // Check if user already exists
      if (args.existingUserId) {
        console.log('[AUTH CALLBACK] Using existing user:', args.existingUserId);
        return args.existingUserId;
      }

      // Create new user with anonymous flag
      console.log('[AUTH CALLBACK] Creating new user with isAnonymous=true');
      const userId = await ctx.db.insert("users", {
        isAnonymous: true,
      });

      console.log('[AUTH CALLBACK] User created with ID:', userId);
      return userId;
    },
  },
});
```

**Key Differences:**
- ❌ Does NOT export `isAuthenticated`
- ❌ Only has `Anonymous` provider (no Password)
- ❌ Defines custom `createOrUpdateUser` callback
- ❌ Query function is in separate file (`users.ts`)

---

### 3. Schema Differences

#### Working (Chef Implementation)

**File:** `/Users/clintgossett/Downloads/project/convex/schema.ts`
```typescript
import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
```

**Status:** ✅ Minimal schema, relies on default auth tables, NO custom users table

---

#### Broken (Current Implementation)

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/convex/schema.ts`
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.boolean(), // true for anonymous users
  }).index("by_email", ["email"]),
});
```

**Status:** ✅ Defines custom `users` table with `isAnonymous` field

**Analysis:** This is fine and actually BETTER than Chef's approach - but requires custom callback to populate the field.

---

### 4. Package Version Differences - CRITICAL

#### Working (Chef Implementation)

**File:** `/Users/clintgossett/Downloads/project/package.json`
```json
{
  "dependencies": {
    "@convex-dev/auth": "^0.0.80",
    "convex": "^1.24.2"
  }
}
```

**Versions:**
- `@convex-dev/auth`: **0.0.80**
- `convex`: **1.24.2**

---

#### Broken (Current Implementation)

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/package.json`
```json
{
  "dependencies": {
    "@convex-dev/auth": "^0.0.90",
    "convex": "^1.31.2"
  }
}
```

**Versions:**
- `@convex-dev/auth`: **0.0.90** (10 versions newer)
- `convex`: **1.31.2** (7 versions newer)

**Analysis:** The newer versions may have introduced breaking changes or bugs.

---

### 5. Frontend Provider Setup

#### Working (Chef Implementation)

**File:** `/Users/clintgossett/Downloads/project/src/main.tsx` (Vite + React)
```typescript
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
);
```

**Status:** ✅ Direct render, no extra wrappers

---

#### Broken (Current Implementation)

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/ConvexClientProvider.tsx` (Next.js)
```typescript
"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
```

**Status:** ✅ Proper Next.js App Router pattern with "use client" directive

**Analysis:** This is correct for Next.js. The difference is architectural (Vite vs Next.js), not a bug.

---

### 6. Sign-In Implementation

#### Working (Chef Implementation)

**File:** `/Users/clintgossett/Downloads/project/src/SignInForm.tsx`
```typescript
<button className="auth-button" onClick={() => void signIn("anonymous")}>
  Sign in anonymously
</button>
```

**Method:** Direct `signIn("anonymous")` call with `void` to ignore promise

---

#### Broken (Current Implementation)

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/app/page.tsx`
```typescript
const handleAnonymousSignIn = async () => {
  try {
    console.log('[DEBUG] Starting anonymous sign-in');
    const result = await signIn("anonymous");
    console.log('[DEBUG] Sign-in result:', result);
  } catch (error) {
    console.error('[DEBUG] Sign-in error:', error);
  }
};
```

**Method:** Async/await with error handling

**Analysis:** Both approaches are valid. Current implementation has better error handling.

---

### 7. Auth State Detection

#### Working (Chef Implementation)

**File:** `/Users/clintgossett/Downloads/project/src/App.tsx`
```typescript
function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <Authenticated>
        <p>Welcome back, {loggedInUser?.email ?? "friend"}!</p>
      </Authenticated>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
    </div>
  );
}
```

**Key Features:**
- ✅ Uses `useQuery(api.auth.loggedInUser)` - query is in auth.ts
- ✅ Uses `<Authenticated>` and `<Unauthenticated>` components
- ✅ Checks for `undefined` (loading state)

---

#### Broken (Current Implementation)

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/app/page.tsx`
```typescript
export default function Home() {
  const { signIn, signOut } = useAuthActions();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <Dashboard />;
}
```

**Key Features:**
- ✅ Uses `useConvexAuth()` hook for auth state
- ✅ Uses separate `useQuery(api.users.getCurrentUser)` - query is in users.ts
- ❌ Does NOT use `<Authenticated>` / `<Unauthenticated>` components
- ✅ Proper loading state handling

**Analysis:** Different approach but should work. However, relying on `useConvexAuth()` hook may have issues with the newer version.

---

### 8. Auth Configuration File - SUSPICIOUS DIFFERENCE

#### Working (Chef Implementation)

**File:** `/Users/clintgossett/Downloads/project/convex/auth.config.ts`
```typescript
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

**Status:** ✅ Has separate config file with CONVEX_SITE_URL

---

#### Broken (Current Implementation)

**File:** `app/convex/auth.config.ts` - DOES NOT EXIST (was deleted per bug report)

Per the bug report:
> ✅ Removed incorrect `convex/auth.config.ts` file (was using `process.env`)

**Analysis:** The config file was REMOVED as an attempted fix. This may have been a mistake!

---

## Root Cause Analysis

Based on the delta analysis, the most likely causes of the broken authentication are:

### Primary Suspects (High Probability)

1. **Missing `auth.config.ts` file** - Chef has this file, current implementation deleted it
   - Chef's config specifies `CONVEX_SITE_URL` and `applicationID: "convex"`
   - Without this, the JWT `aud` (audience) claim may not match correctly
   - The bug report shows JWT has `"aud": "convex"` which is correct, but config may still be needed

2. **Custom `createOrUpdateUser` callback breaking auth flow**
   - Chef uses default user creation (no callback)
   - Current implementation has custom callback that manually creates users
   - Callback may not be completing correctly or may have async timing issues
   - Bug report shows callback logs NEVER appear, suggesting callback isn't being called

3. **Package version mismatch** - `@convex-dev/auth` 0.0.90 vs 0.0.80
   - 10 version difference could include breaking changes
   - Auth state detection may have changed between versions
   - ConvexAuthProvider behavior may have changed

### Secondary Suspects (Medium Probability)

4. **Missing `isAuthenticated` export from auth.ts**
   - Chef exports this, current implementation doesn't
   - May be used internally by the library

5. **Query location difference**
   - Chef has `loggedInUser` query in `auth.ts`
   - Current has `getCurrentUser` query in separate `users.ts`
   - This shouldn't matter, but the file organization may affect initialization order

### Low Probability Issues

6. **Next.js vs Vite architecture** - Unlikely, as the ConvexClientProvider pattern is correct
7. **Sign-in method** - Both approaches are valid
8. **Schema definition** - Current implementation is actually better (explicit users table)

---

## Evidence from Bug Report

The bug report confirms:

1. ✅ **Backend auth is working** - JWT tokens are generated correctly
2. ✅ **Tokens are stored** - localStorage contains valid tokens
3. ❌ **Client state never updates** - `useConvexAuth()` stays `isAuthenticated: false`
4. ❌ **Callbacks never execute** - `createOrUpdateUser` logs never appear
5. ❌ **Subsequent queries fail** - `getCurrentUser` returns "No authenticated user"

**Critical Finding:** The callback not being called suggests the auth flow is not completing on the backend, even though tokens are being generated. This points to either:
- A routing issue (HTTP routes not properly registered)
- A configuration issue (auth.config.ts missing)
- A version bug (0.0.90 has issues)

---

## Recommended Fixes (Priority Order)

### 1. RESTORE auth.config.ts (HIGHEST PRIORITY)

Create `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/convex/auth.config.ts`:

```typescript
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

**Rationale:** Chef has this file, current implementation deleted it. This configures JWT validation.

**Risk:** Low - this is pure configuration, no code changes

---

### 2. REMOVE custom createOrUpdateUser callback

Modify `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/convex/auth.ts`:

```typescript
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Anonymous],
  // REMOVE callbacks entirely - use default behavior
});
```

**Rationale:**
- Chef doesn't have custom callbacks
- Bug report shows callback never executes
- Default behavior may be more reliable

**Risk:** Medium - will change how users are created, but schema will still work

---

### 3. DOWNGRADE to working versions

```bash
cd /Users/clintgossett/Documents/personal/personal projects/artifact-review/app
npm install @convex-dev/auth@0.0.80 convex@1.24.2
```

**Rationale:** Use exact versions from working Chef implementation

**Risk:** Medium - may require schema migration or other changes

---

### 4. ADD isAuthenticated export

Modify `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/convex/auth.ts`:

```typescript
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Anonymous],
});
```

**Rationale:** Chef exports this, may be used internally

**Risk:** Low - just adding an export

---

### 5. MOVE getCurrentUser query to auth.ts (optional)

Move the query from `users.ts` to `auth.ts` to match Chef's pattern.

**Rationale:** Match working implementation exactly

**Risk:** Low - just file organization

---

## Testing Plan

After applying fixes:

1. **Restart all servers:**
   ```bash
   # Stop any running processes
   # Then restart:
   npx convex dev --tail-logs always
   npm run dev
   ```

2. **Clear browser state:**
   - Clear localStorage
   - Clear cookies
   - Hard refresh (Cmd+Shift+R)

3. **Test auth flow:**
   - Visit http://localhost:3000
   - Click "Start Using Artifact Review"
   - Verify dashboard appears

4. **Check for callback logs:**
   - Look for `[AUTH CALLBACK]` messages in Convex logs
   - Should see "createOrUpdateUser called" or default user creation

5. **Verify persistent session:**
   - Refresh page
   - Dashboard should still be visible

---

## Summary of Key Differences

| Component | Chef (Working) | Current (Broken) | Impact |
|-----------|---------------|------------------|--------|
| **auth.config.ts** | ✅ Present | ❌ Deleted | HIGH - May break JWT validation |
| **createOrUpdateUser** | ❌ Not used | ✅ Custom callback | HIGH - Callback never executes |
| **@convex-dev/auth version** | 0.0.80 | 0.0.90 | HIGH - May have breaking changes |
| **isAuthenticated export** | ✅ Exported | ❌ Not exported | MEDIUM - May be used internally |
| **Query location** | In auth.ts | In users.ts | LOW - Should not matter |
| **Schema** | Minimal | Custom users table | NONE - Current is better |
| **Frontend pattern** | Vite | Next.js | NONE - Both valid |
| **HTTP router** | ✅ Configured | ✅ Configured | NONE - Both correct |

---

## Conclusion

The broken implementation has THREE critical differences from the working implementation:

1. **Missing `auth.config.ts` file** - Deleted during troubleshooting, but Chef has it
2. **Custom callback that never executes** - Chef uses default user creation
3. **Newer package versions** - Chef uses older, known-working versions

**Recommended Action:** Start with Fix #1 (restore auth.config.ts) and Fix #2 (remove custom callback). If that doesn't work, proceed to Fix #3 (downgrade packages).

The fact that the callback never executes is the smoking gun - something is preventing the auth flow from completing on the backend, despite tokens being generated. The missing config file is the most likely culprit.

---

## Files Referenced

### Working Implementation (Chef)
- `/Users/clintgossett/Downloads/project/convex/auth.ts`
- `/Users/clintgossett/Downloads/project/convex/auth.config.ts` ⭐ KEY FILE
- `/Users/clintgossett/Downloads/project/convex/router.ts`
- `/Users/clintgossett/Downloads/project/convex/http.ts`
- `/Users/clintgossett/Downloads/project/convex/schema.ts`
- `/Users/clintgossett/Downloads/project/package.json`
- `/Users/clintgossett/Downloads/project/src/main.tsx`
- `/Users/clintgossett/Downloads/project/src/App.tsx`

### Broken Implementation (Current)
- `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/convex/auth.ts`
- `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/convex/http.ts`
- `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/convex/schema.ts`
- `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/convex/users.ts`
- `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/package.json`
- `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/ConvexClientProvider.tsx`
- `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/app/page.tsx`

### Documentation
- `/Users/clintgossett/Documents/personal/personal projects/artifact-review/tasks/00006-local-dev-environment/RESUME.md`
- `/Users/clintgossett/Documents/personal/personal projects/artifact-review/tasks/00006-local-dev-environment/tests/BUG-REPORT.md`
