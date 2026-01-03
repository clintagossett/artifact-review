# TDD Implementation Plan: Task 8 - Magic Link Authentication

**Task:** 00008-magic-link-authentication
**Created:** 2025-12-26
**Last Updated:** 2025-12-26
**Status:** Planning - Ready for Implementation

---

## Executive Summary

Implement passwordless magic link authentication as a complementary sign-in method alongside the existing password authentication (Task 7). Users can request a login link via email, providing a frictionless authentication experience ideal for reviewers who may not have accounts.

**Key Integration Points:**
- Convex Auth Resend provider for magic link emails
- Resend API for both development and production
- Programmatic email retrieval via Resend API for AI-native E2E testing
- No additional email services required (Resend handles everything)
- Existing password auth flow remains unchanged

---

## Existing Architecture (From Task 7)

### Backend Configuration

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/convex/auth.ts`
```typescript
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});
```

**Current Providers:**
- `Password` - Email + password authentication (Task 7)
- `Anonymous` - Anonymous session (Task 6)

**Schema:** User table already has `email` field and `by_email` index.

### Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| LoginForm | `/app/src/components/auth/LoginForm.tsx` | Email/password sign-in |
| RegisterForm | `/app/src/components/auth/RegisterForm.tsx` | Email/password registration |
| Login Page | `/app/src/app/login/page.tsx` | Login route with LoginForm |
| Register Page | `/app/src/app/register/page.tsx` | Registration route |
| Dashboard | `/app/src/app/dashboard/page.tsx` | Protected route showing user info |

### Routing Structure (Per ADR 0008)

```
/               - Landing page (links to /login, /register)
/login          - Password sign-in (will add magic link option)
/register       - Password registration
/dashboard      - Protected dashboard
```

---

## Implementation Strategy

### Magic Link Provider Selection

Convex Auth supports the Resend provider for magic links. We use a single Resend account for all environments.

| Environment | Provider | Configuration |
|-------------|----------|---------------|
| **Local Dev** | Resend (test API key) | Uses Resend test mode, emails retrievable via API |
| **Hosted Dev** | Resend (production API key) | Real emails sent via Resend |
| **Production** | Resend (production API key) | Real emails sent via Resend |

### Convex Auth Resend Provider

The `@convex-dev/auth/providers/Resend` provider handles:
- Magic link token generation
- Email sending via Resend API
- Token verification on callback
- Session creation after verification

**Installation:**
```bash
npm install resend
```

---

## TDD Implementation Phases

### Phase 1: Backend - Resend Provider Configuration

**Objective:** Add Resend magic link provider to Convex Auth configuration.

#### Cycle 1.1: Install and Configure Resend Provider

**RED - Test First:**
```typescript
// File: app/convex/__tests__/magicLinkAuth.test.ts (NEW)

import { convexTest } from "convex-test";
import { describe, it, expect, vi } from "vitest";
import schema from "../schema";

describe("Magic Link Authentication Schema", () => {
  it("should have email field in users table", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "magiclink@example.com",
        isAnonymous: false,
      });
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user?.email).toBe("magiclink@example.com");
  });

  it("should query user by email for magic link verification", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: "verify@example.com",
        isAnonymous: false,
      });
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "verify@example.com"))
        .unique();
    });

    expect(user).not.toBeNull();
    expect(user?.email).toBe("verify@example.com");
  });
});
```

**GREEN - Minimal Implementation:**

```typescript
// File: app/convex/auth.ts (MODIFY)

import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Resend } from "@convex-dev/auth/providers/Resend";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    Anonymous,
    Resend, // NEW: Magic link provider
  ],
});

export const getCurrentUser = query({
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

**Environment Variables Required:**
```bash
# Convex environment variables
# For development (test mode)
npx convex env set AUTH_RESEND_KEY=re_test_xxxxxxxxxxxx

# For production
npx convex env set AUTH_RESEND_KEY=re_xxxxxxxxxxxx
```

**Files Modified:**
- `app/convex/auth.ts`
- `app/convex/__tests__/magicLinkAuth.test.ts` (NEW)

**Dependencies:** None - schema already has email field from Task 7

---

#### Cycle 1.2: Configure Resend Provider with API Key

**Context:** Resend is configured via API key only. No SMTP configuration needed.

**Implementation:**

```typescript
// File: app/convex/auth.ts (MODIFY - if custom configuration needed)

import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Resend } from "@convex-dev/auth/providers/Resend";

// Configure Resend provider
// Uses AUTH_RESEND_KEY from Convex environment
const ResendProvider = Resend({
  // API key comes from CONVEX_ENV AUTH_RESEND_KEY
  // No additional configuration needed
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    Anonymous,
    ResendProvider,
  ],
});
```

**Resend Configuration:**
```bash
# 1. Create account at https://resend.com
# 2. Create API key from dashboard
# 3. For development/testing, use test mode API key (re_test_xxx)
# 4. For production, use production API key (re_xxx)

# 5. Set in Convex environment
npx convex env set AUTH_RESEND_KEY=re_test_xxxxxxxxx  # dev
# OR
npx convex env set AUTH_RESEND_KEY=re_xxxxxxxxx      # production
```

**Resend API Features:**
- **Test Mode:** `re_test_*` keys send emails to Resend dashboard (no actual delivery)
- **Production Mode:** `re_*` keys deliver real emails
- **Email Retrieval:** `resend.emails.list()` and `resend.emails.get(id)` for E2E tests

**Access Resend:**
- **Web Dashboard:** `https://resend.com/emails`
- **API:** Programmatic access via `resend` npm package (see Phase 7)

---

### Phase 2: Backend - Email Template

**Objective:** Create a clean magic link email template.

#### Cycle 2.1: Basic Email Template

**Note:** Convex Auth Resend provider uses a default template. Custom templates can be configured via the provider options.

```typescript
// File: app/convex/auth.ts (MODIFY - add email template)

import { Resend } from "@convex-dev/auth/providers/Resend";

const ResendProvider = Resend({
  // Custom email template (optional)
  async sendVerificationRequest({ identifier, url }) {
    const { Resend: ResendClient } = await import("resend");
    const resend = new ResendClient(process.env.AUTH_RESEND_KEY);

    await resend.emails.send({
      from: "Artifact Review <auth@artifact-review.com>",
      to: identifier,
      subject: "Sign in to Artifact Review",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Sign in to Artifact Review</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; font-size: 24px;">Sign in to Artifact Review</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Click the button below to sign in to your account. This link will expire in 10 minutes.
            </p>
            <a href="${url}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; margin: 20px 0;">
              Sign in to Artifact Review
            </a>
            <p style="color: #999; font-size: 14px;">
              If you didn't request this email, you can safely ignore it.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              This link expires in 10 minutes. If the button doesn't work, copy and paste this URL into your browser:
              <br>
              <a href="${url}" style="color: #666;">${url}</a>
            </p>
          </body>
        </html>
      `,
    });
  },
});
```

**Files Modified:**
- `app/convex/auth.ts`

---

### Phase 3: Frontend - Magic Link Request Form

**Objective:** Create a form for users to request magic links.

#### Cycle 3.1: MagicLinkForm Component Rendering

**RED - Test First:**
```typescript
// File: app/src/components/auth/__tests__/MagicLinkForm.test.tsx (NEW)

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MagicLinkForm } from "../MagicLinkForm";

// Mock Convex hooks
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({
    signIn: vi.fn(),
  }),
}));

describe("MagicLinkForm", () => {
  it("should render email input", () => {
    render(<MagicLinkForm onSuccess={vi.fn()} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("should render send link button", () => {
    render(<MagicLinkForm onSuccess={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /send.*link/i })
    ).toBeInTheDocument();
  });

  it("should not render password field", () => {
    render(<MagicLinkForm onSuccess={vi.fn()} />);
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/src/components/auth/MagicLinkForm.tsx (NEW)

"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MagicLinkFormProps {
  onSuccess: () => void;
}

export function MagicLinkForm({ onSuccess }: MagicLinkFormProps) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signIn("resend", { email });
      setEmailSent(true);
      onSuccess();
    } catch (err) {
      setError("Failed to send magic link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We sent a sign-in link to {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click the link in your email to sign in. The link expires in 10 minutes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Sign in with Email</CardTitle>
        <CardDescription>
          We'll send you a magic link to sign in
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="magic-link-email">Email</Label>
            <Input
              id="magic-link-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Sending..." : "Send Magic Link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Files Created:**
- `app/src/components/auth/MagicLinkForm.tsx`
- `app/src/components/auth/__tests__/MagicLinkForm.test.tsx`

**Dependencies:** Phase 1 (Resend provider configured)

---

#### Cycle 3.2: Email Sent Success State

**RED - Test First:**
```typescript
// Add to: app/src/components/auth/__tests__/MagicLinkForm.test.tsx

import userEvent from "@testing-library/user-event";
import { waitFor } from "@testing-library/react";

it("should show success message after sending email", async () => {
  const user = userEvent.setup();
  const mockSignIn = vi.fn().mockResolvedValue(undefined);

  vi.mock("@convex-dev/auth/react", () => ({
    useAuthActions: () => ({
      signIn: mockSignIn,
    }),
  }));

  render(<MagicLinkForm onSuccess={vi.fn()} />);

  await user.type(screen.getByLabelText(/email/i), "test@example.com");
  await user.click(screen.getByRole("button", { name: /send.*link/i }));

  await waitFor(() => {
    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
  });
});
```

**GREEN:** Already implemented in Cycle 3.1 with `emailSent` state.

---

### Phase 4: Frontend - Update Login Page

**Objective:** Add magic link option to existing login page.

#### Cycle 4.1: Login Page with Auth Method Toggle

**RED - Test First:**
```typescript
// File: app/src/app/login/__tests__/page.test.tsx (MODIFY)

describe("Login Page", () => {
  it("should show option to use magic link", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("button", { name: /sign in with email link/i })
    ).toBeInTheDocument();
  });

  it("should toggle between password and magic link forms", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Initially shows password form
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    // Click to switch to magic link
    await user.click(screen.getByRole("button", { name: /sign in with email link/i }));

    // Now shows magic link form
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send magic link/i })).toBeInTheDocument();
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/src/app/login/page.tsx (MODIFY)

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";
import { Button } from "@/components/ui/button";

type AuthMethod = "password" | "magic-link";

export default function LoginPage() {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");

  const handleSuccess = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
      <div className="space-y-4">
        {authMethod === "password" ? (
          <>
            <LoginForm onSuccess={handleSuccess} />
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setAuthMethod("magic-link")}
                className="text-sm text-muted-foreground"
              >
                Sign in with Email Link
              </Button>
            </div>
          </>
        ) : (
          <>
            <MagicLinkForm onSuccess={() => {}} />
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setAuthMethod("password")}
                className="text-sm text-muted-foreground"
              >
                Sign in with Password
              </Button>
            </div>
          </>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <span>Need an account? </span>
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Files Modified:**
- `app/src/app/login/page.tsx`

**Dependencies:** Phase 3 (MagicLinkForm component)

---

### Phase 5: Backend - Magic Link Verification Callback

**Objective:** Handle the callback when user clicks the magic link.

#### Context

Convex Auth handles the magic link verification automatically via the HTTP routes configured in `convex/http.ts`. The verification callback:

1. User clicks link: `https://your-app.com/api/auth/callback/resend?token=xxx`
2. Convex Auth verifies the token
3. Creates or retrieves user by email
4. Creates session
5. Redirects to configured URL

**Current HTTP Configuration:**
```typescript
// File: app/convex/http.ts
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
```

This already handles magic link callbacks. No additional backend work needed.

---

### Phase 6: Frontend - Verification Callback Page

**Objective:** Create a page to handle the magic link callback and redirect.

#### Cycle 6.1: Email Verification Page

**Note:** Convex Auth handles the verification via HTTP callbacks. The frontend needs to handle:
1. Displaying "Verifying..." state
2. Redirecting to dashboard after successful verification
3. Showing errors for invalid/expired links

**Implementation:**
```typescript
// File: app/src/app/verify-email/page.tsx (NEW)

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth } from "convex/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error from callback
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    // If authenticated, redirect to dashboard
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-destructive">Verification Failed</CardTitle>
            <CardDescription>
              {error === "expired"
                ? "This link has expired. Please request a new one."
                : "There was a problem verifying your email."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/login" className="text-primary hover:underline">
              Return to sign in
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Verifying...</CardTitle>
          <CardDescription>
            Please wait while we verify your email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Files Created:**
- `app/src/app/verify-email/page.tsx`

---

### Phase 7: E2E Testing with Resend API

**Objective:** Create comprehensive E2E tests for magic link authentication using Resend API for email retrieval.

#### Cycle 7.1: Setup E2E Test Structure

```bash
# Create test structure
mkdir -p tasks/00008-magic-link-authentication/tests/e2e
mkdir -p tasks/00008-magic-link-authentication/tests/validation-videos

cd tasks/00008-magic-link-authentication/tests

# Create package.json
cat > package.json << 'EOF'
{
  "name": "task-00008-tests",
  "private": true,
  "devDependencies": {
    "@playwright/test": "^1.57.0",
    "resend": "^3.0.0"
  }
}
EOF

# Install dependencies
npm install
```

**Playwright Config:**
```typescript
// File: tasks/00008-magic-link-authentication/tests/playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    cwd: '../../../app',
    timeout: 120000,
  },
});
```

---

#### Cycle 7.2: Magic Link Request E2E Test

**RED - Test First:**
```typescript
// File: tasks/00008-magic-link-authentication/tests/e2e/magic-link.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Magic Link Authentication', () => {
  test('should display magic link option on login page', async ({ page }) => {
    await page.goto('/login');

    // Verify password form is shown by default
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Click to switch to magic link
    await page.click('button:has-text("Sign in with Email Link")');

    // Verify magic link form is shown
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).not.toBeVisible();
  });

  test('should request magic link and show success message', async ({ page }) => {
    await page.goto('/login');

    // Switch to magic link form
    await page.click('button:has-text("Sign in with Email Link")');

    // Fill email
    await page.fill('input[type="email"]', 'test@example.com');

    // Submit
    await page.click('button:has-text("Send Magic Link")');

    // Should show success message
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('test@example.com')).toBeVisible();
  });

  test('should toggle between password and magic link forms', async ({ page }) => {
    await page.goto('/login');

    // Initially password form
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Switch to magic link
    await page.click('button:has-text("Sign in with Email Link")');
    await expect(page.getByLabel(/password/i)).not.toBeVisible();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();

    // Switch back to password
    await page.click('button:has-text("Sign in with Password")');
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});
```

**GREEN:** Run tests and verify they pass.

---

#### Cycle 7.3: Resend API Integration Test

**Note:** This test verifies the complete flow including email retrieval from Resend API.

```typescript
// File: tasks/00008-magic-link-authentication/tests/e2e/magic-link-resend.spec.ts

import { test, expect } from '@playwright/test';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

test.describe('Magic Link with Resend API', () => {
  test('should send magic link email via Resend', async ({ page }) => {
    const resend = new Resend(resendApiKey);
    const testEmail = `magic-${Date.now()}@example.com`;

    // 1. Request magic link
    await page.goto('/login');
    await page.click('button:has-text("Sign in with Email Link")');
    await page.fill('input[type="email"]', testEmail);
    await page.click('button:has-text("Send Magic Link")');

    // 2. Verify success message
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });

    // 3. Check Resend API for the email (with retry)
    let ourEmail = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (!ourEmail && attempts < maxAttempts) {
      await page.waitForTimeout(1000); // Wait between attempts

      const { data: emails } = await resend.emails.list();
      ourEmail = emails?.find((msg: any) => msg.to?.[0] === testEmail);
      attempts++;
    }

    expect(ourEmail).toBeDefined();
    expect(ourEmail?.subject).toContain('Sign in');
  });

  test('should complete magic link flow end-to-end with Resend', async ({ page }) => {
    const resend = new Resend(resendApiKey);
    const testEmail = `e2e-${Date.now()}@example.com`;

    // 1. Request magic link
    await page.goto('/login');
    await page.click('button:has-text("Sign in with Email Link")');
    await page.fill('input[type="email"]', testEmail);
    await page.click('button:has-text("Send Magic Link")');
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });

    // 2. Get the magic link from Resend API
    let ourEmail = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (!ourEmail && attempts < maxAttempts) {
      await page.waitForTimeout(1000);
      const { data: emails } = await resend.emails.list();
      ourEmail = emails?.find((msg: any) => msg.to?.[0] === testEmail);
      attempts++;
    }

    expect(ourEmail).toBeDefined();

    // 3. Get full email content and extract magic link
    const { data: fullEmail } = await resend.emails.get(ourEmail!.id);
    expect(fullEmail).toBeDefined();

    const htmlContent = fullEmail?.html || '';
    const linkMatch = htmlContent.match(/href="([^"]*callback[^"]*)"/);
    expect(linkMatch).toBeDefined();

    const magicLink = linkMatch![1];

    // 4. Click the magic link
    await page.goto(magicLink);

    // 5. Should be redirected to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

    // 6. Should be authenticated
    await expect(page.getByText(new RegExp(`Signed in as.*${testEmail}`))).toBeVisible();
  });
});
```

---

#### Cycle 7.4: Error Handling Tests

```typescript
// Add to: tasks/00008-magic-link-authentication/tests/e2e/magic-link.spec.ts

test('should show error for invalid email format', async ({ page }) => {
  await page.goto('/login');
  await page.click('button:has-text("Sign in with Email Link")');

  // Try to submit without email
  await page.click('button:has-text("Send Magic Link")');

  // HTML5 validation should prevent submission
  // The email input should have :invalid state
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toHaveAttribute('required', '');
});

test('should handle expired magic link gracefully', async ({ page }) => {
  // Navigate to verify page with error parameter
  await page.goto('/verify-email?error=expired');

  // Should show error message
  await expect(page.getByText(/expired/i)).toBeVisible();
  await expect(page.getByText(/request a new one/i)).toBeVisible();

  // Should have link to return to login
  await expect(page.getByRole('link', { name: /return to sign in/i })).toBeVisible();
});
```

---

#### Cycle 7.5: Generate Validation Trace

```bash
cd tasks/00008-magic-link-authentication/tests

# Set Resend API key for tests
export RESEND_API_KEY=re_test_xxxxxxxxx  # or your actual test key

# Run tests (generates trace.zip automatically)
npx playwright test

# Copy trace to validation-videos/
cp test-results/*/trace.zip validation-videos/magic-link-trace.zip

# Verify trace works
npx playwright show-trace validation-videos/magic-link-trace.zip
```

---

### Phase 8: Logging Integration

**Objective:** Add structured logging throughout the magic link flow.

```typescript
// File: app/src/components/auth/MagicLinkForm.tsx (MODIFY)

import { logger, LOG_TOPICS } from '@/lib/logger';

// In handleSubmit:
logger.info(LOG_TOPICS.Auth, 'MagicLinkForm', 'Magic link requested', {
  email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
});

// On success:
logger.info(LOG_TOPICS.Auth, 'MagicLinkForm', 'Magic link sent successfully');

// On error:
logger.error(LOG_TOPICS.Auth, 'MagicLinkForm', 'Failed to send magic link', {
  error: error.message,
});
```

---

## Component Design

### ShadCN Components Required

| Component | Purpose | Already Installed |
|-----------|---------|-------------------|
| Card | Form container | Yes |
| Input | Email field | Yes |
| Label | Form labels | Yes |
| Button | Submit button, toggles | Yes |

### Component Hierarchy

```
Login Page
├── AuthMethodToggle
│   ├── [Password Form] (existing LoginForm)
│   └── [Magic Link Form] (new MagicLinkForm)
├── Switch Button ("Sign in with Email Link" / "Sign in with Password")
└── Register Link
```

---

## Environment Configuration

### Local Development

**Required Services:**
```bash
# Terminal 1: Next.js
cd app
npm run dev

# Terminal 2: Convex
cd app
npx convex dev
```

**Environment Variables (app/.env.local):**
```bash
CONVEX_DEPLOYMENT=dev:your-deployment-name
```

**Convex Environment Variables:**
```bash
# Set Resend test API key in Convex
npx convex env set AUTH_RESEND_KEY=re_test_xxxxxxxxx
```

### E2E Testing Environment Variables

**For Resend API access in tests:**
```bash
# Set in your test environment or .env.test
export RESEND_API_KEY=re_test_xxxxxxxxx  # test mode
# OR
export RESEND_API_KEY=re_xxxxxxxxx       # production mode
```

---

## File Summary

### New Files

| File | Purpose |
|------|---------|
| `app/src/components/auth/MagicLinkForm.tsx` | Magic link request form component |
| `app/src/components/auth/__tests__/MagicLinkForm.test.tsx` | Component tests |
| `app/src/app/verify-email/page.tsx` | Email verification callback page |
| `app/convex/__tests__/magicLinkAuth.test.ts` | Backend tests |
| `tasks/00008-magic-link-authentication/tests/e2e/magic-link.spec.ts` | E2E tests |
| `tasks/00008-magic-link-authentication/tests/e2e/magic-link-resend.spec.ts` | Resend API integration tests |
| `tasks/00008-magic-link-authentication/tests/playwright.config.ts` | Playwright config |
| `tasks/00008-magic-link-authentication/tests/package.json` | E2E test dependencies |

### Modified Files

| File | Change |
|------|--------|
| `app/convex/auth.ts` | Add Resend provider |
| `app/src/app/login/page.tsx` | Add magic link toggle |

---

## Dependency Graph

```
Phase 1: Backend - Resend Provider Configuration
└── Cycle 1.1: Install and configure Resend
└── Cycle 1.2: Configure Resend API key

Phase 2: Backend - Email Template
└── Cycle 2.1: Create HTML email template

Phase 3: Frontend - Magic Link Form
└── Cycle 3.1: MagicLinkForm rendering
└── Cycle 3.2: Success state

Phase 4: Frontend - Update Login Page (depends on Phase 3)
└── Cycle 4.1: Add auth method toggle

Phase 5: Backend - Verification Callback (already handled by Convex Auth)

Phase 6: Frontend - Verification Page
└── Cycle 6.1: Create verify-email page

Phase 7: E2E Testing with Resend API (depends on Phases 1-6)
├── Cycle 7.1: Setup test structure
├── Cycle 7.2: Magic link request tests
├── Cycle 7.3: Resend API integration tests
├── Cycle 7.4: Error handling tests
└── Cycle 7.5: Generate validation trace

Phase 8: Logging Integration
└── Add structured logging throughout
```

---

## Success Criteria

### Functional Requirements

- [ ] User can request magic link via email from login page
- [ ] Magic link email arrives via Resend
- [ ] Clicking magic link authenticates user
- [ ] User is redirected to dashboard after verification
- [ ] Session persists across page refreshes
- [ ] Invalid/expired links show appropriate error messages
- [ ] Password login continues to work alongside magic link

### Technical Requirements

- [ ] All backend tests passing (`magicLinkAuth.test.ts`)
- [ ] All component tests passing (`MagicLinkForm.test.tsx`)
- [ ] E2E tests passing with Playwright
- [ ] Resend API integration test passing
- [ ] Validation trace generated (`trace.zip`)
- [ ] Structured logging throughout auth flow
- [ ] Code follows Convex rules (validators, args, returns)

### Deliverables

- [ ] Working magic link authentication feature
- [ ] Integration with existing password auth
- [ ] Test suite (backend + frontend + E2E)
- [ ] Validation trace.zip
- [ ] Test report (`test-report.md`)
- [ ] Structured logging implemented

---

## Risks & Mitigations

### High Risk

1. **Resend Provider Configuration**
   - **Risk:** Convex Auth Resend provider may require specific configuration
   - **Mitigation:** Review Convex Auth Resend docs early, test minimal config first
   - **Docs:** https://labs.convex.dev/auth/config/email

2. **Test Mode vs Production Mode**
   - **Risk:** Test emails may not be retrievable via API the same way as production
   - **Mitigation:** Test with both modes early, adjust retrieval logic if needed

### Medium Risk

1. **Callback URL Configuration**
   - **Risk:** Magic link callback URL may not match local dev setup
   - **Mitigation:** Configure `CONVEX_SITE_URL` correctly in Convex dashboard

2. **Token Expiration Timing**
   - **Risk:** 10-minute expiration may cause flaky E2E tests
   - **Mitigation:** Use generous timeouts in E2E tests, retry logic in Resend API polling

3. **Resend API Rate Limiting**
   - **Risk:** Rapid E2E test runs may hit Resend API rate limits
   - **Mitigation:** Add delays between test runs, use unique test emails

### Low Risk

1. **UI Toggle State**
   - **Risk:** Auth method toggle state may be confusing
   - **Mitigation:** Clear visual distinction between forms

---

## Time Estimates

| Phase | Cycles | Est. Time | Notes |
|-------|--------|-----------|-------|
| 1 - Backend Config | 2 | 1 hour | Resend provider setup |
| 2 - Email Template | 1 | 30 min | HTML template |
| 3 - Magic Link Form | 2 | 1.5 hours | Component + tests |
| 4 - Login Page Update | 1 | 1 hour | Auth toggle |
| 5 - Callback Handling | 0 | 0 | Already handled |
| 6 - Verify Page | 1 | 45 min | Error handling |
| 7 - E2E Testing | 5 | 3 hours | Including Resend API |
| 8 - Logging | 1 | 30 min | Add logging |
| **TOTAL** | **13** | **8.5 hours** | With buffer |

---

## Open Questions

1. **Callback URL in Local Dev?**
   - What should `CONVEX_SITE_URL` be set to?
   - Likely: `http://localhost:3000`

2. **Account Linking Behavior?**
   - If user already has password account, does magic link merge or create new?
   - Per ADR 0001: Same email should link to same user

3. **Resend Test Mode Email Retrieval?**
   - Do test mode emails have the same structure as production?
   - Can we reliably extract links from test emails?

---

## Next Steps

**After Approval:**

1. Start with Phase 1, Cycle 1.1
2. Follow TDD strictly: RED -> GREEN -> REFACTOR
3. One test at a time, no batching
4. Update PROGRESS.md after each phase
5. Commit after each phase with descriptive message
6. Generate trace.zip after all E2E tests pass
7. Create test report when feature complete

**Before Starting:**
- Get approval on this plan
- Clarify open questions
- Ensure dev environment is running (Next.js + Convex)
- Review Convex Auth Resend provider docs
- Get Resend API key (test or production)

---

## Approval Checklist

Before proceeding with implementation, confirm:

- [ ] TDD approach is acceptable (test-first, one at a time)
- [ ] File structure and organization looks correct
- [ ] Integration with existing password auth is clear
- [ ] Resend-only approach (no Mailtrap/Mailpit) is approved
- [ ] E2E test coverage with Resend API is sufficient
- [ ] Risk mitigation strategies are sound
- [ ] Success criteria are clear
- [ ] Any open questions are resolved

---

**Plan Status:** Ready for Review
**Next Action:** Await approval to begin Phase 1, Cycle 1.1
