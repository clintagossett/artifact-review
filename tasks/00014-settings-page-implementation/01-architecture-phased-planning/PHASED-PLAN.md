# Settings Page Implementation - Phased Plan

**Date:** 2025-12-27
**Status:** Ready for Implementation
**Author:** Software Architect Agent

---

## Overview

This plan breaks the Settings page implementation into 6 phases, each independently testable and progressively building toward the complete feature. The phases are ordered to minimize risk and maximize early feedback.

**Total Estimated Effort:** 4-6 focused sessions

---

## Phase Summary

| Phase | Name | Complexity | Dependencies |
|-------|------|------------|--------------|
| 1 | Basic Settings Page Shell | Simple | None |
| 2 | Account Info Section | Simple | Phase 1 |
| 3 | Grace Period Infrastructure | Medium | Phase 2 |
| 4 | Password Change (Fresh Auth) | Medium | Phase 3 |
| 5 | Password Change (Stale Auth) | Medium | Phase 4 |
| 6 | Forgot Password Flow | Simple | Phase 5 |

---

## Phase 1: Basic Settings Page Shell

### Objective

Create the foundational Settings page with routing, layout, and navigation. No functionality yet.

### Complexity: Simple

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `app/src/app/settings/page.tsx` | New | Settings page route |
| `app/src/components/settings/SettingsPage.tsx` | New | Main layout component |
| `tasks/00014-settings-page-implementation/02-basic-shell/` | New | Subtask folder |

### Implementation Details

1. **Create settings route**
   - Protected page (wrap with `ProtectedPage`)
   - Basic layout matching dashboard style

2. **Create SettingsPage component**
   - Header with back button to dashboard
   - Page title and description
   - Empty content sections (placeholders)

3. **Add navigation from dashboard**
   - Settings link in dashboard header (if not present)

### ShadCN Components Required

| Component | Purpose |
|-----------|---------|
| Button | Back button, action buttons |
| Card | Section containers |

### Testing Requirements

- [ ] Settings route accessible at `/settings`
- [ ] Redirects to login if not authenticated
- [ ] Back button navigates to dashboard
- [ ] Page renders without errors

### Acceptance Criteria

- Settings page loads for authenticated users
- Back navigation works
- Layout matches design system (consistent with dashboard)
- No console errors

---

## Phase 2: Account Info Section

### Objective

Implement the account information section with email display (read-only) and editable name field.

### Complexity: Simple

### Dependencies

- Phase 1 complete

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `app/src/components/settings/AccountInfoSection.tsx` | New | Account info UI |
| `app/convex/users.ts` | Modify | Add `updateName` mutation |
| `tasks/00014-settings-page-implementation/03-account-info/` | New | Subtask folder |

### Implementation Details

1. **AccountInfoSection component**
   - Display email (disabled input)
   - Editable name with inline edit mode
   - Save/Cancel buttons when editing
   - Loading state during save
   - Success/error feedback via toast

2. **Backend: updateName mutation**
   ```typescript
   export const updateName = mutation({
     args: { name: v.string() },
     returns: v.null(),
     handler: async (ctx, args) => {
       const userId = await getAuthUserId(ctx);
       if (!userId) throw new Error("Not authenticated");
       await ctx.db.patch(userId, { name: args.name });
       return null;
     },
   });
   ```

### ShadCN Components Required

| Component | Purpose |
|-----------|---------|
| Input | Email and name fields |
| Label | Field labels |
| Button | Edit, Save, Cancel buttons |
| Card, CardHeader, CardContent | Section container |

### Testing Requirements

- [ ] Email displays correctly (read-only)
- [ ] Name can be edited inline
- [ ] Save updates name in database
- [ ] Cancel reverts to original name
- [ ] Loading state shows during save
- [ ] Toast shows success/error feedback
- [ ] Empty name rejected with validation error

### Acceptance Criteria

- Account info section renders correctly
- Name updates persist to database
- UI feedback is clear and immediate
- No regression in existing functionality

---

## Phase 3: Grace Period Infrastructure

### Objective

Implement the server-side grace period tracking and client-side state management. This is the foundation for the two-state password change UI.

### Complexity: Medium

### Dependencies

- Phase 2 complete

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `app/convex/settings.ts` | New | Settings-related functions |
| `app/src/hooks/useGracePeriod.ts` | New | Grace period hook |
| `app/src/components/settings/GracePeriodBanner.tsx` | New | Status banner component |
| `app/src/components/settings/DebugToggle.tsx` | New | Dev debug toggle |
| `tasks/00014-settings-page-implementation/04-grace-period/` | New | Subtask folder |

### Implementation Details

1. **Backend: getGracePeriodStatus query**
   ```typescript
   // app/convex/settings.ts
   import { query } from "./_generated/server";
   import { v } from "convex/values";
   import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";

   export const getGracePeriodStatus = query({
     args: {},
     returns: v.object({
       isWithinGracePeriod: v.boolean(),
       expiresAt: v.union(v.number(), v.null()),
       sessionCreatedAt: v.union(v.number(), v.null()),
     }),
     handler: async (ctx) => {
       const userId = await getAuthUserId(ctx);
       if (!userId) {
         return { isWithinGracePeriod: false, expiresAt: null, sessionCreatedAt: null };
       }

       // Get current session
       const sessionId = await getAuthSessionId(ctx);
       if (!sessionId) {
         return { isWithinGracePeriod: false, expiresAt: null, sessionCreatedAt: null };
       }

       const session = await ctx.db.get(sessionId);
       if (!session) {
         return { isWithinGracePeriod: false, expiresAt: null, sessionCreatedAt: null };
       }

       const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes
       const sessionCreatedAt = session._creationTime;
       const expiresAt = sessionCreatedAt + GRACE_PERIOD_MS;
       const isWithinGracePeriod = Date.now() < expiresAt;

       return {
         isWithinGracePeriod,
         expiresAt: isWithinGracePeriod ? expiresAt : null,
         sessionCreatedAt,
       };
     },
   });
   ```

2. **useGracePeriod hook**
   ```typescript
   // app/src/hooks/useGracePeriod.ts
   export function useGracePeriod() {
     const gracePeriodStatus = useQuery(api.settings.getGracePeriodStatus);
     const [timeRemaining, setTimeRemaining] = useState<number>(0);

     // Update countdown timer every second
     useEffect(() => {
       if (!gracePeriodStatus?.expiresAt) {
         setTimeRemaining(0);
         return;
       }

       const updateTimer = () => {
         const remaining = Math.max(0, gracePeriodStatus.expiresAt - Date.now());
         setTimeRemaining(remaining);
       };

       updateTimer();
       const interval = setInterval(updateTimer, 1000);
       return () => clearInterval(interval);
     }, [gracePeriodStatus?.expiresAt]);

     return {
       isWithinGracePeriod: gracePeriodStatus?.isWithinGracePeriod ?? false,
       expiresAt: gracePeriodStatus?.expiresAt ?? null,
       timeRemaining,
       isLoading: gracePeriodStatus === undefined,
     };
   }
   ```

3. **GracePeriodBanner component**
   - Fresh state: Green banner with countdown timer
   - Stale state: Orange banner with re-auth prompt
   - Timer format: "X minutes Y seconds"

4. **DebugToggle component**
   - Only renders in development
   - Three states: Auto, Fresh, Stale
   - Allows testing both UI states

### ShadCN Components Required

| Component | Purpose |
|-----------|---------|
| Alert | Banner container |
| Button | Debug toggle, re-auth button |

### Testing Requirements

- [ ] Grace period query returns correct status
- [ ] Timer counts down correctly
- [ ] Banner changes from green to orange when period expires
- [ ] Debug toggle switches between states (dev only)
- [ ] Hook handles loading state
- [ ] Query re-evaluates on timer expiry

### Acceptance Criteria

- Grace period status accurately reflects session age
- Countdown timer is accurate to the second
- UI transitions smoothly from fresh to stale
- Debug mode allows testing without waiting

### Technical Investigation

**Before implementation, verify:**
1. How to get session ID from Convex Auth context
2. Structure of `authSessions` table
3. Whether `getAuthSessionId` is the correct API

---

## Phase 4: Password Change (Fresh Auth State)

### Objective

Implement password change functionality for users within the grace period. This is the simpler case where no current password is required.

### Complexity: Medium

### Dependencies

- Phase 3 complete

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `app/src/components/settings/PasswordSection.tsx` | New | Password change UI |
| `app/convex/settings.ts` | Modify | Add `changePassword` mutation |
| `tasks/00014-settings-page-implementation/05-password-fresh/` | New | Subtask folder |

### Implementation Details

1. **PasswordSection component (fresh state only)**
   - New password input
   - Confirm password input
   - Submit button
   - Validation (min 8 chars, passwords match)
   - Success/error feedback

2. **Backend: changePassword mutation**
   ```typescript
   export const changePassword = mutation({
     args: {
       currentPassword: v.optional(v.string()),
       newPassword: v.string(),
     },
     returns: v.object({
       success: v.boolean(),
       error: v.optional(v.string()),
     }),
     handler: async (ctx, args) => {
       const userId = await getAuthUserId(ctx);
       if (!userId) {
         return { success: false, error: "Not authenticated" };
       }

       // Validate new password
       if (args.newPassword.length < 8) {
         return { success: false, error: "Password must be at least 8 characters" };
       }

       // Check grace period
       const sessionId = await getAuthSessionId(ctx);
       const session = sessionId ? await ctx.db.get(sessionId) : null;
       const GRACE_PERIOD_MS = 15 * 60 * 1000;
       const isWithinGracePeriod = session &&
         (Date.now() - session._creationTime) < GRACE_PERIOD_MS;

       // If outside grace period, require current password
       if (!isWithinGracePeriod && !args.currentPassword) {
         return { success: false, error: "Current password required" };
       }

       // TODO: Verify current password if provided
       // TODO: Update password in authAccounts table

       return { success: true };
     },
   });
   ```

3. **Password update implementation**
   - Research Convex Auth password update API
   - May need to use internal mutation or direct table access

### ShadCN Components Required

| Component | Purpose |
|-----------|---------|
| Input | Password fields |
| Label | Field labels |
| Button | Submit button |
| Card | Section container |

### Testing Requirements

- [ ] Password form renders correctly
- [ ] Validation works (min length, match)
- [ ] Submit updates password successfully
- [ ] Success feedback displayed
- [ ] Error handling for validation failures
- [ ] Loading state during submission

### Acceptance Criteria

- Users within grace period can change password
- No current password field shown when in grace period
- Validation prevents weak passwords
- Clear feedback on success/failure

### Technical Investigation

**Before implementation, verify:**
1. How to update password hash with Convex Auth
2. Whether we need to access `authAccounts` table directly
3. Password hashing algorithm used by Password provider

---

## Phase 5: Password Change (Stale Auth State)

### Objective

Implement password change for users outside the grace period, requiring either current password verification or magic link re-authentication.

### Complexity: Medium

### Dependencies

- Phase 4 complete

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `app/src/components/settings/PasswordSection.tsx` | Modify | Add stale state UI |
| `app/convex/settings.ts` | Modify | Add `sendReauthMagicLink` action |
| `app/convex/auth.ts` | Modify | Add re-auth email template |
| `tasks/00014-settings-page-implementation/06-password-stale/` | New | Subtask folder |

### Implementation Details

1. **Update PasswordSection for stale state**
   - Show current password field
   - Show "Send Magic Link to Re-authenticate" button
   - Orange banner with instructions

2. **Backend: verifyCurrentPassword**
   ```typescript
   // Internal function to verify current password
   async function verifyCurrentPassword(
     ctx: MutationCtx,
     userId: Id<"users">,
     password: string
   ): Promise<boolean> {
     // Look up authAccount for this user
     // Verify password against stored hash
     // Return true/false
   }
   ```

3. **Backend: sendReauthMagicLink action**
   ```typescript
   export const sendReauthMagicLink = action({
     args: {
       redirectTo: v.optional(v.string()),
     },
     returns: v.null(),
     handler: async (ctx, args) => {
       // Get current user's email
       const user = await ctx.runQuery(api.users.getCurrentUser);
       if (!user?.email) {
         throw new Error("User email not found");
       }

       // Send magic link via existing infrastructure
       // Use re-auth specific email template
       // Redirect to /settings after auth
     },
   });
   ```

4. **Re-auth email template**
   - Different subject line ("Re-authenticate to Artifact Review")
   - Explains why user received this email
   - Instructions about grace period

### ShadCN Components Required

| Component | Purpose |
|-----------|---------|
| Input | Current password field |
| Button | Send magic link button |
| Separator | Divide options |

### Testing Requirements

- [ ] Current password field shown when stale
- [ ] Current password verification works
- [ ] Magic link re-auth button sends email
- [ ] After re-auth, user lands on settings with fresh grace period
- [ ] Error handling for incorrect current password
- [ ] Loading states for all actions

### Acceptance Criteria

- Users outside grace period see correct UI
- Current password verification works correctly
- Magic link re-auth flow works end-to-end
- Clear feedback on all actions

### Email Testing

- Verify re-auth email sends correctly
- Test redirect to `/settings` after magic link click
- Verify new session creates fresh grace period

---

## Phase 6: Forgot Password Flow

### Objective

Implement the forgot password page that guides users through password reset via magic link and settings.

### Complexity: Simple

### Dependencies

- Phase 5 complete (full password change flow)

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `app/src/app/forgot-password/page.tsx` | New | Forgot password route |
| `app/src/components/auth/ForgotPasswordForm.tsx` | New | Email input form |
| `app/convex/auth.ts` | Modify | Add forgot password email template |
| `tasks/00014-settings-page-implementation/07-forgot-password/` | New | Subtask folder |

### Implementation Details

1. **Forgot password page**
   - Email input
   - Submit button
   - Clear instructions about the flow
   - Link back to login

2. **ForgotPasswordForm component**
   - Email validation
   - Loading state
   - Success state with instructions

3. **Forgot password email**
   - Different from standard magic link
   - Includes instructions to change password in settings
   - Steps: click link > go to settings > change password

4. **Integration with existing magic link**
   - Use same `signIn("resend", { email, redirectTo })` mechanism
   - Different email template based on context (if possible)
   - Or: use standard magic link with redirect to `/settings`

### ShadCN Components Required

| Component | Purpose |
|-----------|---------|
| Input | Email field |
| Button | Submit button |
| Label | Field label |
| Card | Form container |

### Testing Requirements

- [ ] Forgot password page accessible at `/forgot-password`
- [ ] Email validation works
- [ ] Magic link sent successfully
- [ ] Email contains correct instructions
- [ ] User lands on dashboard/settings after clicking link
- [ ] Back to login navigation works

### Acceptance Criteria

- Forgot password flow guides users clearly
- Email contains helpful instructions
- Users can successfully reset password via the flow
- No security vulnerabilities (enumeration, etc.)

### Implementation Option

**Simplified approach:** Since the existing magic link already authenticates users and creates a fresh grace period, the forgot password page can simply:
1. Explain the flow to users
2. Trigger standard magic link with redirect to `/settings`
3. Show success message with next steps

This avoids needing a separate email template initially.

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Convex Auth password update API unknown | Could block Phase 4 | Research API before Phase 4; have fallback plan |
| Session ID access unclear | Could block Phase 3 | Investigate Convex Auth docs; test in isolation first |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Grace period race conditions | Incorrect UI state | Use server-side as source of truth; handle edge cases |
| Email delivery issues | User can't re-auth | Reuse existing magic link infrastructure; monitor errors |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| UI doesn't match Figma exactly | Visual inconsistency | Accept minor deviations; iterate in future |
| Debug toggle in production | Security concern | Environment check; code review |

---

## Open Questions for User Decision

### Q1: Email Template Approach

**Question:** Should forgot password use a distinct email template or reuse the standard magic link email?

**Options:**
1. **Distinct template** - Different subject and body explaining password reset flow
2. **Reuse standard** - Same email, user just goes to settings after login

**Recommendation:** Start with option 2 (reuse standard), add distinct template if user feedback indicates confusion.

### Q2: Grace Period Duration

**Question:** Is 15 minutes the correct duration, or should this be configurable?

**Recommendation:** Hardcode 15 minutes initially; add configuration if needed later.

### Q3: Debug Toggle in Production

**Question:** Should the debug toggle be completely removed in production builds, or hidden behind a feature flag?

**Options:**
1. **Remove completely** - `process.env.NODE_ENV` check
2. **Feature flag** - Allow access for support/debugging

**Recommendation:** Option 1 (remove completely) for security.

### Q4: Password Strength Requirements

**Question:** Should we enforce additional password requirements beyond minimum 8 characters?

**Options:**
1. Minimum 8 characters only (current design)
2. Add strength meter and recommendations
3. Require mix of characters (uppercase, number, symbol)

**Recommendation:** Start with option 1; consider option 2 as future enhancement.

---

## Testing Strategy Summary

### Unit Tests (Per Phase)

- Backend mutations/queries
- Validation logic
- Grace period calculations

### Integration Tests (Per Phase)

- Full flow from UI to database
- Email sending (mock in tests)
- Authentication flows

### E2E Tests (After Phase 6)

- Complete forgot password flow
- Password change within grace period
- Password change outside grace period
- Magic link re-authentication

### Manual Testing Checklist

- [ ] Grace period timer is accurate
- [ ] UI transitions correctly at 15-minute mark
- [ ] Password change works in both states
- [ ] Re-auth magic link flow works
- [ ] Forgot password flow is clear
- [ ] Debug toggle (dev only) works correctly
- [ ] Mobile responsive

---

## Next Steps

1. **Start Phase 1** - Create basic settings page shell
2. **Research** - Before Phase 3, investigate Convex Auth session API
3. **Research** - Before Phase 4, investigate Convex Auth password update API
4. **Create subtask folders** as each phase begins

---

## Handoff Notes

When this plan is complete, hand off to the TDD Developer with:

1. This PHASED-PLAN.md
2. ARCHITECTURE.md
3. Any research findings on Convex Auth APIs
4. Prioritized phase list (recommend starting Phase 1 immediately)
