# Task 00014: Settings Page Implementation

**GitHub Issue:** #14

---

## Resume (Start Here)

**Last Updated:** 2025-12-27 (Session 2)

### Current Status: ✅ READY FOR IMPLEMENTATION

**Phase:** Planning complete. All decisions made. Ready to start Phase 1.

### What We Did This Session (Session 2)

1. **Expanded scope** - Changed from "forgot password only" to full settings page implementation
2. **Reviewed designs** - Read AUTHENTICATION.md and SettingsPage.tsx from figma-designs
3. **Created subtask 01** - Architecture and phased planning
4. **Ran architect agent** - Completed comprehensive architecture analysis and 6-phase plan
5. **Made key decisions**:
   - Email: Reuse standard magic link (no custom template)
   - Debug toggle: Remove in production
   - Password validation: Reuse existing RegisterForm standard
6. **Documented decisions** - Created DECISIONS.md with component reuse strategy

### What We Did Previously (Session 1)

1. **Created GitHub issue** - Issue #14 created
2. **Researched best practices** - Reviewed modern auth UX (Stytch, Instagram, Slack approach)
3. **Analyzed current auth** - Found we have both password + magic link auth via Convex Auth + Resend
4. **Decided on approach** - Magic link with instructional email text (no deep linking)

### Decision

**Approach: Magic Link with Instructional Email**

Use standard magic link flow, but the forgot password email includes clear instructions telling users how to change their password in settings after they log in.

**User Flow:**
1. User clicks "Forgot password?" on login page
2. Forgot Password page explains the flow and collects email
3. User receives magic link email with **special instructional text** about resetting password in settings
4. User clicks link → authenticated → lands on dashboard
5. User navigates to Settings → changes password

**Why This Approach:**
- Reuses existing magic link infrastructure completely (no modifications)
- Only requires a different email template/copy for forgot password context
- Simplest implementation
- No deep linking or redirect params needed
- Forgot password page + email clearly guide users

### Next Steps

1. **Create forgot password page** - `/app/forgot-password/page.tsx` with explanatory copy
2. **Create ForgotPasswordForm component** - Email input, triggers magic link with "forgot password" context
3. **Create forgot password email template** - Magic link + instructions on how to reset in settings
4. **Create password change section in settings** - Where user actually changes their password
5. **Create ChangePasswordForm component** - Current password (optional?) + new password with validation
6. **Add backend mutation** - `updatePassword` function in Convex
7. **Test end-to-end flow**
8. **Create validation video**

---

## Objective

Implement a complete Settings page with:
- Account information display and editing (name, email)
- Password change with 15-minute grace period system
- Magic link re-authentication flow
- Two-state UI (fresh auth vs stale auth)
- Forgot password integration

---

## Key Features from Design

### 15-Minute Grace Period System

The settings page uses a two-state system based on authentication freshness:

**State 1: Fresh Authentication (Within 15 mins)**
- ✅ Green banner with countdown timer
- NO current password required
- User can immediately change password

**State 2: Stale Authentication (After 15 mins)**
- 🔒 Orange banner with re-auth prompt
- Current password required OR
- Magic link re-authentication option

### Account Information
- Display email (read-only)
- Edit name with inline editing
- Save/cancel controls

### Password Management
- Change password form
- Validation (min 8 chars, passwords match)
- Grace period-aware UI
- Magic link re-auth option

### Debug Mode
- Toggle to test both states
- Development-only feature
- Helps with testing without waiting

---

## Technical Requirements

### Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Settings Page | `/app/settings/page.tsx` | Main settings container |
| Account Info Section | Component within settings | Display/edit account details |
| Password Change Section | Component within settings | Password change with grace period logic |
| Grace Period Banner | Component within settings | Visual indicator of auth state |
| Forgot Password Page | `/app/forgot-password/page.tsx` | Entry point for password reset flow |
| Debug Toggle | Component within settings | Testing tool (dev only) |

### Backend (Convex)

| Function | Type | Purpose |
|----------|------|---------|
| `updateUserName` | Mutation | Update user's display name |
| `changePassword` | Mutation | Update password (with grace period validation) |
| `getAuthTimestamp` | Query | Get last authentication timestamp |
| `sendMagicLinkReauth` | Action | Send re-auth magic link pointing to /settings |

### Email Templates

| Template | Purpose |
|----------|---------|
| Forgot password magic link | Instructions to reset in settings after login |
| Re-auth magic link | Re-authenticate to access grace period |

---

## Acceptance Criteria

- [ ] User can access settings page from dashboard
- [ ] Settings page displays account information (email, name)
- [ ] User can edit and save their name
- [ ] User sees appropriate banner based on authentication freshness
- [ ] Within 15 mins of login: Can change password without current password
- [ ] After 15 mins: Must provide current password OR re-authenticate
- [ ] Countdown timer shows time remaining in grace period
- [ ] Magic link re-authentication works and redirects to settings
- [ ] Password validation works (min 8 chars, passwords match)
- [ ] Success/error feedback for all actions
- [ ] Debug toggle works for testing (dev only)
- [ ] Forgot password page links to login
- [ ] Forgot password email has clear instructions

---

## Subtasks

### Planning (Complete)
- [01-architecture-phased-planning](./01-architecture-phased-planning/) - Architecture review and phased implementation plan (✅ COMPLETE)

### Implementation (Ready to Start)

**Backend** (Can start immediately):
- [02-backend-settings-api](./02-backend-settings-api/) - All Convex functions for Settings (TDD Agent)

**Frontend** (Depends on backend):
- [03-frontend-settings-page](./03-frontend-settings-page/) - Settings page UI with grace period system (TDD/Frontend Agent)
- [04-frontend-forgot-password](./04-frontend-forgot-password/) - Forgot password page and flow (TDD/Frontend Agent)

**Parallelization Strategy:**
- Subtask 02 (backend) can start immediately
- Subtasks 03 & 04 (frontend) can start with mocked APIs while 02 is in progress
- Subtasks 03 & 04 can be done by the same agent or different agents in parallel

---

## Implementation Decisions

All key decisions have been made (see [DECISIONS.md](./01-architecture-phased-planning/DECISIONS.md)):

✅ **Email Template:** Reuse standard magic link (no custom template)
✅ **Debug Toggle:** Remove completely in production
✅ **Password Validation:** Reuse existing RegisterForm standard (8 chars, number, letter)
✅ **Implementation Approach:** 6-phase incremental plan

## Open Questions

- What other settings might be needed in the future (notifications, billing, team management)?
- How do we handle grace period across multiple devices/sessions? (Answered: each session has its own grace period)

---

## Related Documentation

- `figma-designs/AUTHENTICATION.md` - Complete auth system design
- `figma-designs/src/app/components/SettingsPage.tsx` - Reference implementation
- `docs/architecture/convex-rules.md` - Backend implementation rules
- `tasks/00008-magic-link-authentication/` - Magic link implementation
