# Resume: Task 00014 - Forgot Password and Reset Password Implementation

**Quick pickup file for continuing this task**

---

## TL;DR

Build forgot password using **magic link with deep link** to password reset section. No separate token system needed.

## Decision Made

**Flow:**
1. User clicks "Forgot password?" → `/forgot-password` page
2. Page explains: "We'll send a magic link that takes you directly to reset your password"
3. User enters email → sends magic link with `?redirect=/settings/password`
4. Click link → authenticated → lands on password reset section
5. User changes password → done

## Why This Approach

- Reuses existing magic link infra (Resend, Convex Auth)
- No new schema/token system
- Modern pattern (Instagram, Slack)

## Next: Build These

1. `/app/forgot-password/page.tsx` - explains flow, has email form
2. `ForgotPasswordForm.tsx` - sends magic link with redirect param
3. Modify magic link to support redirect after auth
4. `/app/settings/password/page.tsx` - password change UI
5. `ChangePasswordForm.tsx` - new password with validation
6. `updatePassword` mutation in Convex

## Key Files Reference

- Current magic link: `app/convex/auth.ts` (provider: `"resend"`)
- Login form with forgot link: `app/src/components/auth/LoginForm.tsx:152-157`
- Existing auth tests: `app/src/__tests__/auth/`

## Open Questions

- Does Convex Auth magic link support custom redirect params? May need to check docs or test.
- Settings page structure - does `/settings` exist or need to create?
