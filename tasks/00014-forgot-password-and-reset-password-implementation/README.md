# Task 00014: Forgot Password and Reset Password Implementation

**GitHub Issue:** #14

---

## Resume (Start Here)

**Last Updated:** 2025-12-26 (Session 1)

### Current Status: 🎯 DECISION MADE - READY TO IMPLEMENT

**Phase:** Approach decided, ready for subtask breakdown and implementation.

### What We Did This Session (Session 1)

1. **Created GitHub issue** - Issue #14 created
2. **Researched best practices** - Reviewed modern auth UX (Stytch, Instagram, Slack approach)
3. **Analyzed current auth** - Found we have both password + magic link auth via Convex Auth + Resend
4. **Decided on approach** - Option C: Magic link with deep link to password reset section

### Decision

**Approach: Magic Link with Deep Link**

Rather than building a separate password reset token system, we'll leverage the existing magic link infrastructure with a redirect parameter that takes users directly to the password reset section after login.

**User Flow:**
1. User clicks "Forgot password?" on login page
2. Forgot Password page explains: "We'll email you a secure link. Click it to sign in and go directly to reset your password."
3. User enters email, we send magic link with redirect param (e.g., `?redirect=/settings/password`)
4. User clicks link → authenticated → lands directly on password reset section
5. User sets new password → done

**Why This Approach:**
- Reuses existing magic link infrastructure (Resend, 10-min expiry)
- No new token system or schema changes needed
- Simpler, less code to maintain
- Modern UX (Instagram, Slack pattern)
- Forgot password page explains the flow clearly to users

### Next Steps

1. **Create forgot password page** - `/app/forgot-password/page.tsx` with explanatory copy
2. **Create ForgotPasswordForm component** - Email input, reuses magic link sending with redirect param
3. **Modify magic link flow** - Support redirect query param after authentication
4. **Create password reset section** - In user settings/profile area
5. **Create ChangePasswordForm component** - New password input with validation
6. **Add backend mutation** - `updatePassword` function in Convex
7. **Test end-to-end flow**
8. **Create validation video**

---

## Objective

Implement a forgot password feature that allows users to reset their password by receiving a magic link that deep links them directly to the password reset section after authentication.

---

## Technical Requirements

### Frontend

| Component | Location | Purpose |
|-----------|----------|---------|
| Forgot Password Page | `/app/forgot-password/page.tsx` | Explains flow, contains form |
| ForgotPasswordForm | `/components/auth/ForgotPasswordForm.tsx` | Email input, sends magic link with redirect |
| Password Settings Section | `/app/settings/password/page.tsx` or similar | Where user lands to change password |
| ChangePasswordForm | `/components/auth/ChangePasswordForm.tsx` | New password input with validation |

### Backend

| Function | Purpose |
|----------|---------|
| Modify magic link auth | Support redirect param preservation |
| `updatePassword` mutation | Update user's password in database |

### Existing Infrastructure to Reuse

- Magic link sending via Resend (`signIn("resend", { email })`)
- Email template (may want to customize subject/copy for password reset context)
- 10-minute link expiry
- Convex Auth password provider

---

## Acceptance Criteria

- [ ] User can access forgot password page from login (`/forgot-password`)
- [ ] Forgot password page clearly explains the magic link flow
- [ ] User receives magic link email after submitting their email
- [ ] Magic link authenticates user AND redirects to password reset section
- [ ] User can set a new password with proper validation
- [ ] Success feedback and redirect to dashboard after password change
- [ ] Appropriate error handling throughout

---

## Files to Create/Modify

### Create
- `app/src/app/forgot-password/page.tsx`
- `app/src/components/auth/ForgotPasswordForm.tsx`
- `app/src/app/settings/password/page.tsx` (or integrate into existing settings)
- `app/src/components/auth/ChangePasswordForm.tsx`
- `app/convex/users.ts` - add `updatePassword` mutation

### Modify
- Magic link auth flow to support redirect param
- Possibly `auth.ts` for password update logic

### Tests
- `app/src/__tests__/auth/ForgotPasswordForm.test.tsx`
- `app/src/__tests__/auth/ChangePasswordForm.test.tsx`
- `app/convex/__tests__/updatePassword.test.ts`
