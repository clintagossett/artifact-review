# Resume: Task 00014 - Forgot Password and Reset Password Implementation

**Quick pickup file for continuing this task**

---

## TL;DR

Build forgot password using **magic link with instructional email text**. No deep linking - just tell user in the email how to reset password in settings.

## Decision Made

**Flow:**
1. User clicks "Forgot password?" → `/forgot-password` page
2. Page explains: "We'll send a magic link to sign you in"
3. User enters email → sends magic link with **forgot password email template**
4. Email includes: magic link + "After signing in, go to Settings → Password to change it"
5. Click link → authenticated → dashboard
6. User goes to Settings → changes password

## Why This Approach

- Reuses existing magic link infra completely
- Only new thing: different email template with instructions
- No redirect params or deep linking needed
- Simplest possible implementation

## Next: Build These

1. `/app/forgot-password/page.tsx` - explains flow, has email form
2. `ForgotPasswordForm.tsx` - sends magic link (may need context flag for email template)
3. Forgot password email template - magic link + instructions
4. `/app/settings/page.tsx` - settings page with password section
5. `ChangePasswordForm.tsx` - new password with validation
6. `updatePassword` mutation in Convex

## Key Files Reference

- Current magic link email: `app/convex/auth.ts` (MagicLinkEmail provider)
- Login form with forgot link: `app/src/components/auth/LoginForm.tsx:152-157`
- Existing auth tests: `app/src/__tests__/auth/`

## Open Questions

- Should changing password require current password?
- Does settings page exist already?
