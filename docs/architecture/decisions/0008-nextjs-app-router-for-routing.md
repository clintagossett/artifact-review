# ADR 0008: Next.js App Router for Routing

**Status:** Accepted
**Date:** 2024-12-26
**Decision Maker:** Clint Gossett

## TL;DR

Use Next.js App Router with file-based routing for authentication flows (login, register, password reset) instead of client-side state toggles. This enables proper SEO, deep linking, email routing, and follows Next.js best practices.

## Quick Reference

| Item | Value |
|------|-------|
| **Routing Strategy** | Next.js App Router (file-based) |
| **Auth Pages** | `/sign-in`, `/sign-up`, `/reset-password`, `/verify-email` |
| **Protected Routes** | Route Groups with middleware |
| **Deep Linking** | Native URL support |
| **SEO** | Per-page metadata with Next.js Metadata API |
| **Client Navigation** | Next.js `<Link>` and `useRouter` |

## Decision Drivers (Priority Order)

1. **SEO requirements** - Landing, login, and register pages need proper meta tags and server-side rendering
2. **Email routing** - Password reset and email verification require stable, shareable URLs
3. **Deep linking support** - Users should be able to bookmark, share, and return to specific pages
4. **Framework alignment** - Follow Next.js App Router conventions established in ADR 0006
5. **User experience** - Browser back/forward should work correctly
6. **Code maintainability** - Avoid complex client-side state machines for routing

## Related Decisions

- [ADR 0006: Frontend Stack](./0006-frontend-stack.md) - Established Next.js App Router as framework
- [ADR 0001: Authentication Provider](./0001-authentication-provider.md) - Convex Auth with magic links
- [ADR 0003: Deployment & Hosting](./0003-deployment-hosting-strategy.md) - Vercel deployment with Next.js

## Context

### Why File-Based Routing is Required

Authentication with email-based flows introduces requirements that client-side state routing cannot satisfy:

| Requirement | Client-Side State | Next.js App Router |
|------------|-------------------|-------------------|
| **SEO** | No meta tags, no server rendering | Per-page metadata, SSR |
| **Deep Linking** | Breaks on refresh | Stable URLs |
| **Email Links** | Can't route to password reset form | `/reset-password?token=xyz` |
| **Browser History** | Back button doesn't work | Native browser behavior |
| **Sharing URLs** | Can't share login page | `/sign-in` is shareable |
| **Bookmarking** | Can't bookmark pages | All pages bookmarkable |

### Example Email Routing Flows

**Password Reset:**
```
1. User clicks "Forgot Password?" on /sign-in
2. Enters email, submits
3. Receives email: "Reset your password: https://app.example.com/reset-password?token=abc123"
4. Clicks link → lands on /reset-password page with token in URL
5. Enters new password, submits
6. Redirects to /sign-in
```

**Email Verification:**
```
1. User signs up on /sign-up
2. Receives email: "Verify your email: https://app.example.com/verify-email?token=xyz789"
3. Clicks link → lands on /verify-email page
4. Automatic verification, redirect to /dashboard
```

**These flows require stable URLs that:**
- Survive page refresh
- Can be opened in new tabs
- Work with email clients (Gmail, Outlook, etc.)
- Support query parameters for tokens

## Decision

### Use File-Based Routing for All Authentication Pages

Create dedicated Next.js pages for each authentication state:

```
app/src/app/
├── page.tsx                    # Landing page (public, SEO)
├── sign-in/
│   └── page.tsx                # Sign in page (public, SEO)
├── sign-up/
│   └── page.tsx                # Sign up page (public, SEO)
├── reset-password/
│   └── page.tsx                # Password reset page (public)
├── verify-email/
│   └── page.tsx                # Email verification page (public)
└── (dashboard)/
    ├── layout.tsx              # Protected layout with auth check
    └── page.tsx                # Dashboard (requires auth)
```

### Navigation Patterns

**Use Next.js `<Link>` for client-side navigation:**
```tsx
import Link from 'next/link';

<Link href="/sign-in">Sign In</Link>
<Link href="/sign-up">Create Account</Link>
```

**Use `useRouter` for programmatic navigation:**
```tsx
import { useRouter } from 'next/navigation';

const router = useRouter();

// After successful sign in
router.push('/dashboard');

// After password reset
router.push('/sign-in?reset=success');
```

### Route Protection Strategy

**Use Route Groups + Middleware:**

```tsx
// app/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('convex_auth_token');

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (['/sign-in', '/sign-up'].includes(request.nextUrl.pathname)) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}
```

### SEO Implementation

**Per-page metadata using Next.js Metadata API:**

```tsx
// app/src/app/sign-in/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Artifact Review',
  description: 'Sign in to review and collaborate on AI-generated artifacts',
  openGraph: {
    title: 'Sign In | Artifact Review',
    description: 'Sign in to review and collaborate on AI-generated artifacts',
  },
};

export default function SignInPage() {
  return <SignInForm />;
}
```

### Deep Linking Examples

**Password reset with token:**
```tsx
// app/src/app/reset-password/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return <div>Invalid reset link</div>;
  }

  return <PasswordResetForm token={token} />;
}
```

**Sign in with redirect:**
```tsx
// Example: /sign-in?redirect=/documents/abc123
const redirect = searchParams.get('redirect');

// After successful authentication
router.push(redirect || '/dashboard');
```

## Implementation Order

### Phase 1: Create Page Structure

1. Create file-based routes for all auth pages
2. Move existing components to new pages
3. Add metadata exports for SEO

### Phase 2: Update Navigation

1. Replace state-based routing with `<Link>` components
2. Update form submissions to use `useRouter`
3. Add proper redirects

### Phase 3: Add Protection

1. Implement middleware for route protection
2. Add authenticated redirects (auth users away from login pages)
3. Test deep linking and refresh behavior

### Phase 4: Email Integration

1. Build password reset flow with URL tokens
2. Build email verification flow
3. Test email link routing

## Consequences

### Positive

- **SEO-friendly** - Each page can have proper meta tags and server-side rendering
- **Shareable URLs** - All auth pages have stable, bookmarkable URLs
- **Email routing works** - Password reset and verification links work reliably
- **Browser UX** - Back/forward buttons work as expected
- **Framework aligned** - Follows Next.js App Router best practices from ADR 0006
- **Debugging easier** - URL reflects current page state
- **Analytics friendly** - Page views tracked accurately
- **Mobile-friendly** - Deep links work with mobile apps/webviews

### Negative

- **Migration effort** - Must refactor Task 6 anonymous auth implementation
- **More files** - Separate file per page instead of single state machine
- **Middleware complexity** - Need to manage route protection logic
- **Query parameter handling** - Need to properly parse tokens, redirects, etc.

### Neutral

- Page transitions still instant with Next.js `<Link>` (no full reload)
- Client-side state can still be used within individual pages
- Route Groups keep dashboard routes organized

## Alternatives Considered

### Alt 1: Client-Side State Machine

**Approach:** Continue with `useState` for routing, add hash routing for deep links

```tsx
const [route, setRoute] = useState(window.location.hash || '#landing');
```

**Rejected because:**
- Doesn't solve SEO (no server rendering)
- Hash routing is legacy pattern
- Complicated to maintain
- Breaks framework conventions
- Email links with hash fragments are unreliable

### Alt 2: Next.js Pages Router

**Approach:** Use Pages Router (`pages/` directory) instead of App Router

**Rejected because:**
- ADR 0006 already established App Router
- App Router is the future of Next.js
- Worse developer experience
- Missing new features (Metadata API, layouts, etc.)

### Alt 3: React Router

**Approach:** Add React Router for client-side routing

**Rejected because:**
- Duplicates Next.js routing
- No SEO benefits
- Adds unnecessary dependency
- Fights framework instead of using it

## References

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Next.js Routing](https://nextjs.org/docs/app/building-your-application/routing)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [ADR 0006: Frontend Stack](./0006-frontend-stack.md)
