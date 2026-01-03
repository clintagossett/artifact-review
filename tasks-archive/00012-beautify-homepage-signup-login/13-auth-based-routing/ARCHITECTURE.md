# Auth-Based Routing Architecture Analysis

## Overview

This document provides a comprehensive analysis of the current authentication and routing system in Artifact Review, with recommendations for implementing auth-based redirects.

---

## 1. Current Auth State Management

### Where Auth State is Stored

**Primary:** Convex Auth via `@convex-dev/auth`

The application uses Convex Auth as its authentication provider (per ADR 0001). Auth state is managed through:

| Component | Location | Purpose |
|-----------|----------|---------|
| `ConvexAuthProvider` | `/app/src/components/ConvexClientProvider.tsx` | Wraps app, provides auth context |
| Convex Auth backend | `/app/convex/auth.ts` | Server-side auth handlers |
| Auth config | `/app/convex/auth.config.ts` | Provider configuration |

### How Components Access Auth State

Components access auth state through multiple patterns:

#### Pattern 1: `useQuery(api.users.getCurrentUser)`
Most common pattern. Returns user object or `null`.

```typescript
// Used in: dashboard/page.tsx, page.tsx (home)
const currentUser = useQuery(api.users.getCurrentUser);

// Returns:
// - undefined: still loading
// - null: not authenticated
// - { _id, name, email, username, isAnonymous }: authenticated user
```

#### Pattern 2: `useQuery(api.auth.getCurrentUser)`
Alternative query, same behavior.

```typescript
// Used in: page.tsx (home)
const currentUser = useQuery(api.auth.getCurrentUser);
```

#### Pattern 3: `useConvexAuth()`
Returns auth loading state and boolean.

```typescript
// Used in: verify-email/page.tsx
const { isAuthenticated, isLoading } = useConvexAuth();
```

#### Pattern 4: `<Authenticated>` / `<Unauthenticated>` Components
Declarative conditional rendering.

```typescript
// Used in: page.tsx (home)
import { Authenticated, Unauthenticated } from "convex/react";

<Unauthenticated>
  <LandingPage />
</Unauthenticated>

<Authenticated>
  <WelcomeCard />
</Authenticated>
```

### Auth API Surface

| Hook/Component | Package | Returns |
|----------------|---------|---------|
| `useQuery(api.users.getCurrentUser)` | `convex/react` | User object or `null` |
| `useConvexAuth()` | `convex/react` | `{ isAuthenticated: boolean, isLoading: boolean }` |
| `useAuthActions()` | `@convex-dev/auth/react` | `{ signIn, signOut }` |
| `<Authenticated>` | `convex/react` | Renders children if authenticated |
| `<Unauthenticated>` | `convex/react` | Renders children if not authenticated |

---

## 2. Current Logout Flow

### Logout Function

Logout is triggered via `signOut()` from `useAuthActions()`:

```typescript
// From @convex-dev/auth/react
const { signOut } = useAuthActions();

// Usage (DashboardHeader.tsx, page.tsx)
await signOut();
```

### What Happens When User Logs Out

1. **`signOut()` is called** - This is an async function that:
   - Invalidates the session token in Convex
   - Clears client-side auth state in the Convex React client
   - No explicit cookie clearing needed (handled by Convex Auth)

2. **Reactive state update** - After signOut:
   - `useConvexAuth().isAuthenticated` becomes `false`
   - `useQuery(api.users.getCurrentUser)` returns `null`
   - `<Unauthenticated>` children become visible
   - `<Authenticated>` children are hidden

3. **No automatic redirect** - The current implementation does NOT redirect after logout. User stays on current page.

### Where Logout is Called

| Location | Component | Current Behavior After Logout |
|----------|-----------|------------------------------|
| Dashboard Header | `DashboardHeader.tsx` | Stays on dashboard (but would be redirected by dashboard's own auth check) |
| Home Page | `page.tsx` | Stays on home, shows landing page |

### Gap: Dashboard Logout UX

When logging out from the dashboard:
1. `signOut()` is called
2. Dashboard's `useQuery(api.users.getCurrentUser)` returns `null`
3. Dashboard's own redirect logic kicks in: `router.push("/")`

This is a **client-side redirect** that happens AFTER the user sees the dashboard with null state momentarily (flash of content).

---

## 3. Current Routing Structure

### All Routes

| Route | Page File | Auth Requirement |
|-------|-----------|------------------|
| `/` | `app/src/app/page.tsx` | Public (shows landing OR user card) |
| `/login` | `app/src/app/login/page.tsx` | Public |
| `/register` | `app/src/app/register/page.tsx` | Public |
| `/verify-email` | `app/src/app/verify-email/page.tsx` | Public |
| `/dashboard` | `app/src/app/dashboard/page.tsx` | Protected |
| `/a/[shareToken]` | `app/src/app/a/[shareToken]/page.tsx` | Public (artifact viewing) |
| `/a/[shareToken]/v/[version]` | `app/src/app/a/[shareToken]/v/[version]/page.tsx` | Public (version viewing) |

### Protected vs Public Routes

**Currently Protected (via client-side check):**
- `/dashboard` - Redirects to `/` if `currentUser === null`

**Currently Public:**
- `/` - Shows landing (unauthenticated) or welcome card (authenticated)
- `/login` - Always shows login form (no auth check)
- `/register` - Always shows registration form (no auth check)
- `/verify-email` - Handles email verification callback
- `/a/*` - Artifact viewing (public sharing)

### Existing Redirect Logic

#### Home Page (`/`)
```typescript
// In page.tsx
useEffect(() => {
  if (currentUser !== undefined && currentUser !== null) {
    router.push("/dashboard");
  }
}, [currentUser, router]);
```
- If authenticated: redirects to `/dashboard`
- If not authenticated: shows landing page

#### Dashboard (`/dashboard`)
```typescript
// In dashboard/page.tsx
if (currentUser === null) {
  router.push("/");
  return null;
}
```
- If not authenticated: redirects to `/`
- If authenticated: shows dashboard

#### Login/Register Pages
- **NO existing redirect logic for authenticated users**
- Authenticated users can visit `/login` and `/register` and see the forms

---

## 4. Current Behavior When Visiting Pages

### Logged-In User Visits...

| Route | Current Behavior | Expected Behavior |
|-------|------------------|-------------------|
| `/` | Shows loading, then redirects to `/dashboard` via `useEffect` | Redirect to `/dashboard` |
| `/login` | Shows login form (no redirect) | Should redirect to `/dashboard` |
| `/register` | Shows registration form (no redirect) | Should redirect to `/dashboard` |
| `/dashboard` | Shows dashboard | Show dashboard |

### Logged-Out User Visits...

| Route | Current Behavior | Expected Behavior |
|-------|------------------|-------------------|
| `/` | Shows landing page | Show landing page |
| `/login` | Shows login form | Show login form |
| `/register` | Shows registration form | Show registration form |
| `/dashboard` | Shows loading, then redirects to `/` | Redirect to `/` |

### Issues with Current Implementation

1. **Flash of Wrong Content**
   - Dashboard shows loading state before redirect
   - Home page shows loading before redirect to dashboard
   - No middleware protection

2. **Missing Redirects**
   - Logged-in users can access `/login` and `/register`
   - No centralized redirect logic

3. **Client-Side Only**
   - All redirects happen after JavaScript loads and runs
   - Server-side redirect would be faster and prevent flash

---

## 5. Recommended Implementation Approach

### Option A: Client-Side Route Guards (Recommended for Phase 1)

Create a reusable hook and wrapper components for auth-based routing.

**Why this approach:**
- Simpler to implement
- Works well with Convex Auth's client-side nature
- ADR 0008 mentions middleware but the Convex Auth token validation happens client-side
- No flash if done correctly with loading states

#### Implementation Files

1. **Auth Guard Hook** - `/app/src/hooks/useAuthRedirect.ts`
```typescript
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

type RedirectConfig = {
  ifAuthenticated?: string;    // Redirect to this path if logged in
  ifUnauthenticated?: string;  // Redirect to this path if logged out
};

export function useAuthRedirect(config: RedirectConfig) {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);

  const isLoading = currentUser === undefined;
  const isAuthenticated = currentUser !== null && currentUser !== undefined;

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && config.ifAuthenticated) {
      router.replace(config.ifAuthenticated);
    }

    if (!isAuthenticated && config.ifUnauthenticated) {
      router.replace(config.ifUnauthenticated);
    }
  }, [isLoading, isAuthenticated, config, router]);

  return {
    isLoading,
    isAuthenticated,
    user: currentUser,
  };
}
```

2. **Protected Page Wrapper** - `/app/src/components/auth/ProtectedPage.tsx`
```typescript
"use client";

import { useAuthRedirect } from "@/hooks/useAuthRedirect";

interface ProtectedPageProps {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export function ProtectedPage({ children, loadingComponent }: ProtectedPageProps) {
  const { isLoading, isAuthenticated } = useAuthRedirect({
    ifUnauthenticated: "/",
  });

  if (isLoading || !isAuthenticated) {
    return loadingComponent ?? <FullPageSpinner />;
  }

  return <>{children}</>;
}
```

3. **Public-Only Page Wrapper** - `/app/src/components/auth/PublicOnlyPage.tsx`
```typescript
"use client";

import { useAuthRedirect } from "@/hooks/useAuthRedirect";

interface PublicOnlyPageProps {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export function PublicOnlyPage({ children, loadingComponent }: PublicOnlyPageProps) {
  const { isLoading, isAuthenticated } = useAuthRedirect({
    ifAuthenticated: "/dashboard",
  });

  if (isLoading) {
    return loadingComponent ?? <FullPageSpinner />;
  }

  if (isAuthenticated) {
    return loadingComponent ?? <FullPageSpinner />;
  }

  return <>{children}</>;
}
```

#### Files to Modify

| File | Change |
|------|--------|
| `/app/src/app/page.tsx` | Simplify using `PublicOnlyPage` or keep current logic |
| `/app/src/app/login/page.tsx` | Wrap with `PublicOnlyPage` |
| `/app/src/app/register/page.tsx` | Wrap with `PublicOnlyPage` |
| `/app/src/app/dashboard/page.tsx` | Use `ProtectedPage` instead of manual check |

### Option B: Next.js Middleware (Consider for Future)

ADR 0008 mentions middleware, but there's a challenge:

**The Problem:**
Convex Auth stores authentication in client-side state, not in HTTP-only cookies that middleware can read. The `convex_auth_token` mentioned in ADR 0008's example code doesn't exist by default.

**When Middleware Makes Sense:**
- If we configure Convex Auth to use HTTP-only cookies (possible but not default)
- If we need SSR protection before any JavaScript runs
- If we want to prevent even the loading state on protected pages

**For Now:** Client-side guards are appropriate and align with how Convex Auth works.

### Recommended File Structure

```
app/src/
├── hooks/
│   ├── index.ts
│   └── useAuthRedirect.ts          # NEW: Auth redirect hook
├── components/
│   └── auth/
│       ├── ProtectedPage.tsx       # NEW: Protected page wrapper
│       ├── PublicOnlyPage.tsx      # NEW: Public-only wrapper
│       ├── FullPageSpinner.tsx     # NEW: Loading state component
│       ├── LoginForm.tsx           # Existing
│       └── RegisterForm.tsx        # Existing
└── app/
    ├── page.tsx                    # Modify: Use PublicOnlyPage or simplify
    ├── login/page.tsx              # Modify: Add PublicOnlyPage wrapper
    ├── register/page.tsx           # Modify: Add PublicOnlyPage wrapper
    └── dashboard/page.tsx          # Modify: Use ProtectedPage wrapper
```

### Avoiding Flash of Wrong Content

1. **Always show loading state first**
   - Never render page content until auth state is known
   - Use consistent spinner/skeleton across all pages

2. **Use `router.replace()` not `router.push()`**
   - Replaces history entry so back button works correctly
   - User doesn't see flash in browser history

3. **Return null during redirect**
   - After initiating redirect, return null/loading
   - Prevents any content from rendering

### Implementation Order

1. Create `useAuthRedirect` hook
2. Create `FullPageSpinner` component
3. Create `PublicOnlyPage` wrapper
4. Create `ProtectedPage` wrapper
5. Update `/login` page
6. Update `/register` page
7. Update `/` page
8. Update `/dashboard` page
9. Add tests for redirect behavior

---

## Summary

### Current State

- Auth is managed by Convex Auth (`@convex-dev/auth`)
- State accessed via `useQuery(api.users.getCurrentUser)` or `useConvexAuth()`
- Only `/` and `/dashboard` have redirect logic
- `/login` and `/register` are missing redirect guards
- All redirects are client-side with potential for flash

### Recommended Approach

- **Client-side route guards** using reusable hooks and wrapper components
- **Consistent loading states** to prevent flash of wrong content
- **Centralized patterns** for protected and public-only pages
- **Future-ready** for middleware if we add HTTP-only cookie auth

### Files to Create

1. `/app/src/hooks/useAuthRedirect.ts`
2. `/app/src/components/auth/ProtectedPage.tsx`
3. `/app/src/components/auth/PublicOnlyPage.tsx`
4. `/app/src/components/auth/FullPageSpinner.tsx`

### Files to Modify

1. `/app/src/app/login/page.tsx` - Add `PublicOnlyPage` wrapper
2. `/app/src/app/register/page.tsx` - Add `PublicOnlyPage` wrapper
3. `/app/src/app/dashboard/page.tsx` - Use `ProtectedPage` wrapper
4. `/app/src/app/page.tsx` - Optionally simplify with hooks
