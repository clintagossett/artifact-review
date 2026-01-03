# Subtask 04: Frontend - Forgot Password Flow

**Agent:** TDD Developer (or Frontend specialist)
**Type:** Frontend (React + Next.js)
**Complexity:** Simple
**Dependencies:** Subtasks 02 & 03 complete (can start in parallel with 03)

---

## Objective

Implement a forgot password page that guides users through password reset via magic link and settings.

**Flow:**
1. User visits `/forgot-password`
2. Enters email
3. Receives magic link email (standard, reused infrastructure)
4. Clicks link → authenticated → redirected to dashboard
5. User navigates to Settings → changes password (within 15-min grace period)

---

## Deliverables

### Files to Create

| File | Purpose |
|------|---------|
| `app/src/app/forgot-password/page.tsx` | Forgot password route (public) |
| `app/src/components/auth/ForgotPasswordForm.tsx` | Email input form |
| `app/src/__tests__/auth/ForgotPasswordPage.test.tsx` | Page tests |
| `app/src/__tests__/auth/ForgotPasswordForm.test.tsx` | Form tests |

### ShadCN Components Required

| Component | Usage |
|-----------|-------|
| Button | Submit, back buttons |
| Input | Email input |
| Label | Form label |
| Card, CardHeader, CardContent | Form container |
| Alert, AlertDescription | Success message, errors |

---

## Implementation Details

### 1. Forgot Password Page

**File:** `app/src/app/forgot-password/page.tsx`

```typescript
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PublicOnlyPage } from "@/components/auth/PublicOnlyPage";

export default function ForgotPasswordPage() {
  return (
    <PublicOnlyPage>
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Back Button */}
        <Link
          href="/login"
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Login</span>
        </Link>

        <ForgotPasswordForm />
      </div>
    </PublicOnlyPage>
  );
}
```

**Tests:**
- [ ] Page renders correctly
- [ ] Redirects authenticated users to dashboard
- [ ] Back button links to login
- [ ] Form renders

---

### 2. Forgot Password Form

**File:** `app/src/components/auth/ForgotPasswordForm.tsx`

```typescript
"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GradientLogo } from "@/components/shared/GradientLogo";
import { IconInput } from "@/components/shared/IconInput";
import { Mail, ArrowRight, AlertCircle, CheckCircle2, Lock } from "lucide-react";

export function ForgotPasswordForm() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    setIsLoading(true);

    try {
      // Send standard magic link (no custom template needed)
      await signIn("resend", {
        email,
        redirectTo: "/settings", // Redirect to settings after auth
      });
      setSuccess(true);
    } catch {
      setError("Failed to send magic link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Logo */}
      <div className="flex justify-center">
        <GradientLogo icon={Lock} />
      </div>

      {/* Headings */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
        <p className="text-gray-600">
          We'll send you a magic link to sign in and reset your password
        </p>
      </div>

      {success ? (
        /* Success State */
        <div className="space-y-6">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Check your email!</strong> We've sent a magic link to{" "}
              <span className="font-medium">{email}</span>
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              What to do next:
            </h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Check your email inbox for the magic link</li>
              <li>Click the link to sign in automatically</li>
              <li>Go to Settings to change your password</li>
              <li>
                You'll have <strong>15 minutes</strong> to change your password
                without entering your current password
              </li>
            </ol>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSuccess(false)}
          >
            Send another link
          </Button>
        </div>
      ) : (
        /* Form State */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Box */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-900 mb-1">
                  How password reset works
                </p>
                <p className="text-xs text-purple-700">
                  We'll email you a secure link. After clicking it, you'll have
                  15 minutes to change your password in Settings—no current
                  password needed.
                </p>
              </div>
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <IconInput
              id="email"
              type="email"
              icon={Mail}
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send Magic Link
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* Help Text */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Remember your password?{" "}
          <a
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-semibold transition"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
```

**Tests:**
- [ ] Form renders correctly
- [ ] Email validation works
- [ ] Submit sends magic link
- [ ] Success state shows after submit
- [ ] Success message includes email
- [ ] Instructions are clear
- [ ] "Send another link" button resets form
- [ ] Error handling for failed sends
- [ ] Loading state during submission
- [ ] Disabled state during loading

---

## Key Design Decisions

### No Custom Email Template (Initially)

**Decision:** Use standard magic link email, redirect to `/settings` after auth.

**Rationale:**
- Simpler implementation
- Reuses existing infrastructure
- Magic link already creates fresh grace period
- Users can change password within 15 minutes

**Future Enhancement:** Add custom forgot password email template with specific instructions if user feedback indicates confusion.

### Clear User Instructions

The success state provides step-by-step instructions:
1. Check email
2. Click link
3. Go to Settings
4. 15-minute window to change password

This ensures users understand the flow.

---

## Integration with Login Page

### Add "Forgot Password?" Link to Login

**File:** `app/src/components/auth/LoginForm.tsx`

Add link below password field (password mode only):

```typescript
{/* After password input, before submit button */}
{authMethod === "password" && (
  <div className="flex justify-end">
    <Link
      href="/forgot-password"
      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
    >
      Forgot password?
    </Link>
  </div>
)}
```

**Tests:**
- [ ] Link appears in password mode
- [ ] Link does not appear in magic link mode
- [ ] Link navigates to /forgot-password

---

## Magic Link Redirect

**Key Implementation Detail:**

```typescript
await signIn("resend", {
  email,
  redirectTo: "/settings", // <-- Redirect to settings, not dashboard
});
```

After authentication, user lands on Settings page with:
- Fresh grace period (15 minutes)
- Can change password without current password

---

## Testing Strategy

### Unit Tests

- ForgotPasswordForm component
- Form validation
- Success/error states
- Loading states

### Integration Tests

- Full forgot password flow
- Email sending (mock Resend)
- Redirect behavior
- Settings page integration

### E2E Test (Manual)

1. Visit `/forgot-password`
2. Enter email
3. Check email inbox
4. Click magic link
5. Verify redirect to `/settings`
6. Verify grace period active
7. Change password successfully

---

## Acceptance Criteria

- [ ] Forgot password page accessible at `/forgot-password`
- [ ] Public page (does not require authentication)
- [ ] Redirects authenticated users to dashboard
- [ ] Email validation works
- [ ] Magic link sent successfully
- [ ] Success message clear and helpful
- [ ] Instructions guide user through process
- [ ] Redirect to `/settings` works
- [ ] Grace period active after magic link auth
- [ ] "Forgot password?" link on login page
- [ ] Link only shows in password mode
- [ ] All components tested
- [ ] No console errors
- [ ] Follows design system

---

## Security Considerations

- [ ] No email enumeration (same response whether email exists or not)
- [ ] Rate limiting (future enhancement - 5 requests per hour per IP)
- [ ] Magic link expiry (10 minutes, handled by Resend)
- [ ] Single-use links (handled by Convex Auth)

---

## Handoff to Agent

When ready, provide:
1. This README
2. `docs/development/testing-guide.md`
3. `docs/development/workflow.md`
4. Existing auth components:
   - `app/src/components/auth/LoginForm.tsx`
   - `app/src/components/auth/RegisterForm.tsx`
   - `app/src/app/login/page.tsx`

Instruct agent to:
- Follow TDD workflow
- Match existing auth page styling
- Write tests in `tasks/00014-settings-page-implementation/04-frontend-forgot-password/tests/`
- Update LoginForm to add "Forgot password?" link
- Create validation video when complete
