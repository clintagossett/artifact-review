# Task 00032: Integrate Resend Email

**GitHub Issue:** #31
**Related Project:** 

---

## Resume (Start Here)

**Last Updated:** 2026-01-06 (Session 1)

**Current Status:** ✅ COMPLETED

**Phase:** Complete

### Completed Work

1.  **Researched Resend Component** - Reviewed documentation and requirements.
2.  **Explored Codebase** - Analyzed current email implementation in `auth.ts` and `access.ts`.
3.  **Created Implementation Plan** - Defined steps for migration.
4.  **Created Task Folder** - Initialized `tasks/00032-integrate-resend-email`.
5.  **Installed Component** - Installed `@convex-dev/resend`.
6.  **Configured Component** - Created `convex.config.ts` and `lib/resend.ts`.
7.  **Migrated Logic** - Updated `auth.ts` and `access.ts` to use the component.
8.  **Configured Environment** - Set up `RESEND_TEST_MODE`, `AUTH_EMAIL_FROM`, and `NOTIFICATION_FROM_EMAIL`.
9.  **Verified** - Tested email sending and verified fixes.
10. **Updated Documentation** - Updated ADR-0004 and .env.local.example.

### Next Steps

1.  **Install Component** - Install `@convex-dev/resend`.
2.  **Configure Component** - Create `convex.config.ts` and `lib/resend.ts`.
3.  **Migrate Logic** - Update `auth.ts` and `access.ts` to use the component.
4.  **Verify** - Test email sending.

---

## Objective

Update the email implementation to use the Resend Convex Component (@convex-dev/resend) instead of the direct Resend SDK usage. This improves reliability, adds webhook support potential, and aligns with Convex best practices.

---

## Implementation Plan

### [Convex] Resend Component Setup

#### [NEW] `convex/convex.config.ts`
- Initialize the Convex app and use the `resend` component.

#### [NEW] `convex/lib/resend.ts`
- Initialize the `Resend` component client for use across the application.

### [Authentication]
#### [MODIFY] `convex/auth.ts`
- Replace direct `resend` SDK usage with the `Resend` component client in `sendVerificationRequest`.

### [Access/Invitations]
#### [MODIFY] `convex/access.ts`
- Replace direct `resend` SDK usage in `sendEmailInternal` with `resend.sendEmail`.

## Verification Plan

### Automated Tests
- Run existing tests to ensure no regressions in invitation flow:
  `npm test -- access.test.ts`

### Manual Verification
- **Magic Link**: Attempt to sign in via magic link. Verify email is enqueued in Convex and sent by Resend.
- **Invitation**: Invite a new user to an artifact. Verify invitation email is enqueued and sent.
- **Convex Dashboard**: Monitor the `resend` component logs and state in the Convex dashboard.

---

## GitHub Issue Draft

Title: Integrate Resend Convex Component

Body:
We need to update our email implementation to use the official Resend Convex Component (@convex-dev/resend). This will replace our direct usage of the Resend Node.js SDK.

**Objectives:**
- Install `@convex-dev/resend`
- Configure `convex/convex.config.ts`
- Create shared `convex/lib/resend.ts` client
- Update `convex/auth.ts` (Magic Links) to use the component
- Update `convex/access.ts` (Invitations) to use the component
- Verify email delivery for both flows

**Resources:**
- https://www.convex.dev/components/resend
