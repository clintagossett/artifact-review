# Settings Page Architecture

**Date:** 2025-12-27
**Status:** Accepted
**Author:** Software Architect Agent

---

## Executive Summary

This document outlines the architecture for implementing the Settings page with a 15-minute grace period system for password changes. The design leverages the existing Convex Auth infrastructure while adding server-side session timestamp tracking for security.

---

## Current State Analysis

### Existing Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| Convex Auth | Implemented | Password + Magic Link (Resend) providers |
| `users` table | Extended | Has `name`, `email`, `username` fields |
| `authSessions` table | Built-in | Convex Auth manages sessions |
| Magic link email | Implemented | Via Resend, 10-minute expiry |
| Password authentication | Implemented | Via `@convex-dev/auth/providers/Password` |
| User queries | Implemented | `getCurrentUser`, `getByEmail`, `getByUsername` |

### Key Files

```
app/convex/
  auth.ts          # Convex Auth setup with Password + Email providers
  schema.ts        # User schema with authTables extension
  users.ts         # User queries
  http.ts          # HTTP routes (auth routes added via auth.addHttpRoutes)

app/src/
  components/auth/
    LoginForm.tsx           # Login with password + magic link toggle
    AuthMethodToggle.tsx    # Toggle between auth methods
    ProtectedPage.tsx       # Auth wrapper component
```

### Gap Analysis

| Feature | Current State | Required for Settings |
|---------|--------------|----------------------|
| Update user name | Not implemented | Needed |
| Change password | Not implemented | Needed |
| Grace period tracking | Not implemented | Needed |
| Re-auth magic link | Not implemented | Needed |
| Session timestamp access | Limited | Need to expose |
| Forgot password page | Not implemented | Needed |

---

## System Design

### Core Concept: 15-Minute Grace Period

The grace period allows users to change their password without entering their current password if they authenticated within the last 15 minutes.

```
                          Authentication Event
                                  |
                                  v
                    +--------------------------+
                    |   lastAuthenticatedAt    |
                    |      = Date.now()        |
                    +--------------------------+
                                  |
          +--- Within 15 mins ----+---- After 15 mins ---+
          |                                               |
          v                                               v
+-------------------+                         +-------------------+
|   Fresh Auth      |                         |   Stale Auth      |
|   (Green Banner)  |                         |   (Orange Banner) |
|                   |                         |                   |
| No current        |                         | Current password  |
| password needed   |                         | required OR       |
+-------------------+                         | magic link reauth |
                                              +-------------------+
```

### Architecture Decision: Server-Side vs Client-Side Timestamp

**Decision: Server-side timestamp storage with client-side caching**

**Rationale:**
1. **Security**: Client-side timestamps can be manipulated; server-side is authoritative
2. **Cross-device consistency**: Session timestamps should apply per-session, not per-device
3. **Convex Auth integration**: Session creation is already server-side; we extend it

**Implementation Approach:**

The `authSessions` table managed by Convex Auth already stores `_creationTime` for each session. We will use this timestamp as the grace period reference rather than adding a new field.

```typescript
// Session lookup for grace period check
const session = await ctx.db
  .query("authSessions")
  .withIndex("sessionId", (q) => q.eq("sessionId", currentSessionId))
  .unique();

const gracePeriodMs = 15 * 60 * 1000; // 15 minutes
const isWithinGracePeriod = session &&
  (Date.now() - session._creationTime) < gracePeriodMs;
```

**Alternative Considered (Rejected):**

Storing `lastAuthenticatedAt` in the `users` table was considered but rejected because:
- It doesn't differentiate between devices/sessions
- A user logging in on device B would reset the timer for device A
- Session-level tracking is more secure and accurate

---

## Component Architecture

### Backend (Convex)

```
convex/
  auth.ts                    # Existing - no changes needed
  users.ts                   # Extend with updateName mutation
  settings.ts (NEW)          # Settings-specific functions
    - getGracePeriodStatus   # Query: check if within grace period
    - changePassword         # Mutation: update password
    - sendReauthMagicLink    # Action: send re-auth email
```

### Frontend (React)

```
src/app/
  settings/
    page.tsx                 # Settings page route
  forgot-password/
    page.tsx                 # Forgot password page route

src/components/
  settings/
    SettingsPage.tsx         # Main container
    AccountInfoSection.tsx   # Email (read-only) + name editing
    PasswordSection.tsx      # Password change with grace period
    GracePeriodBanner.tsx    # Fresh/stale state banners
    DebugToggle.tsx          # Dev-only debug controls

src/hooks/
  useGracePeriod.ts          # Hook for grace period state + timer
```

### Component Hierarchy

```
<SettingsPage>
  <Header>
    <BackButton />
    <Title />
  </Header>

  <DebugToggle />  (dev only)

  <AccountInfoSection>
    <EmailDisplay />           (read-only)
    <NameEditor />             (inline edit)
  </AccountInfoSection>

  <PasswordSection>
    <GracePeriodBanner>        (fresh: green | stale: orange)
      <CountdownTimer />       (if fresh)
      <ReauthButton />         (if stale)
    </GracePeriodBanner>

    <PasswordChangeForm>
      <CurrentPasswordInput /> (only if stale)
      <NewPasswordInput />
      <ConfirmPasswordInput />
      <SubmitButton />
    </PasswordChangeForm>
  </PasswordSection>
</SettingsPage>
```

---

## API Design

### Queries

#### `settings.getGracePeriodStatus`

Returns the current grace period state for the authenticated user.

```typescript
export const getGracePeriodStatus = query({
  args: {},
  returns: v.object({
    isWithinGracePeriod: v.boolean(),
    expiresAt: v.union(v.number(), v.null()),  // timestamp or null if expired
    hasPassword: v.boolean(),  // whether user has set a password
  }),
  handler: async (ctx) => {
    // 1. Get authenticated session
    // 2. Check session creation time against 15-minute window
    // 3. Return grace period status
  },
});
```

### Mutations

#### `users.updateName`

Updates the user's display name.

```typescript
export const updateName = mutation({
  args: {
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Require authentication
    // 2. Validate name (non-empty, reasonable length)
    // 3. Update user record
  },
});
```

#### `settings.changePassword`

Changes the user's password with grace period validation.

```typescript
export const changePassword = mutation({
  args: {
    currentPassword: v.optional(v.string()),  // required if outside grace period
    newPassword: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Require authentication
    // 2. Check grace period status
    // 3. If outside grace period, verify current password
    // 4. Validate new password (min 8 chars)
    // 5. Update password hash
    // 6. Return success/error
  },
});
```

### Actions

#### `settings.sendReauthMagicLink`

Sends a magic link email for re-authentication.

```typescript
export const sendReauthMagicLink = action({
  args: {
    redirectTo: v.optional(v.string()),  // default: "/settings"
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Get current user's email
    // 2. Generate magic link with redirect
    // 3. Send email via Resend with re-auth specific template
  },
});
```

---

## Email Templates

### Re-authentication Email

```html
Subject: Re-authenticate to Artifact Review

<h1>Re-authenticate to change your password</h1>
<p>You requested to re-authenticate so you can update your password settings.</p>
<a href="{url}">Click to Re-authenticate</a>
<p>This link expires in 10 minutes.</p>
<p>After clicking, you'll have 15 minutes to change your password without entering your current password.</p>
```

### Forgot Password Email

```html
Subject: Sign in to reset your Artifact Review password

<h1>Reset your password</h1>
<p>Click below to sign in. Once authenticated, go to Settings to change your password.</p>
<a href="{url}">Sign in to Artifact Review</a>
<p>This link expires in 10 minutes.</p>
<hr>
<p><strong>How to reset your password:</strong></p>
<ol>
  <li>Click the link above to sign in</li>
  <li>Navigate to Settings</li>
  <li>Change your password (no current password needed for 15 minutes)</li>
</ol>
```

---

## Security Considerations

### Password Change Security

| Scenario | Requirement | Rationale |
|----------|------------|-----------|
| Within grace period | New password only | Recent auth = high confidence |
| Outside grace period | Current password OR magic link | Verify identity |
| No existing password | New password only | Setting first password |

### Grace Period Security

1. **Server-side validation**: Grace period checked on server, not client
2. **Session-bound**: Tied to specific session, not user account
3. **Time-limited**: 15 minutes maximum, non-extendable except via re-auth
4. **Re-auth creates new session**: Magic link re-auth starts fresh 15-minute window

### Rate Limiting (Future Enhancement)

- Magic link requests: 5 per hour per email
- Password change attempts: 5 per hour per user
- Failed password verifications: 5 per hour, then lockout

---

## Integration Points

### Convex Auth Password Provider

The existing `Password` provider from `@convex-dev/auth/providers/Password` handles:
- Password hashing (bcrypt)
- Password verification
- Session creation on password login

For password changes, we need to interface with Convex Auth's internal password update mechanism.

**Investigation Needed:** Determine if Convex Auth exposes a password update API or if we need to directly update the `authAccounts` table.

### Session Management

Convex Auth's `authSessions` table structure (based on Convex Auth documentation):

```typescript
// authSessions table (managed by Convex Auth)
{
  _id: Id<"authSessions">,
  _creationTime: number,
  userId: Id<"users">,
  // Other session metadata
}
```

We will query this table to determine grace period status.

### Magic Link Flow

The existing magic link flow via `signIn("resend", { email, redirectTo })` can be reused for re-authentication. The key difference is:
1. User is already logged in
2. Redirect goes to `/settings` instead of `/dashboard`
3. Email copy explains re-auth purpose

---

## Debug Mode

### Purpose

Allow developers to test both grace period states without waiting 15 minutes.

### Implementation

```typescript
// Dev-only toggle (removed in production build)
const [debugOverride, setDebugOverride] = useState<'auto' | 'fresh' | 'stale'>('auto');

// Compute effective state
const effectiveGracePeriod =
  debugOverride === 'auto' ? actualGracePeriodStatus :
  debugOverride === 'fresh' ? true : false;
```

### Production Safeguard

```typescript
// Only render debug toggle in development
{process.env.NODE_ENV === 'development' && <DebugToggle />}
```

---

## Open Technical Questions

### Q1: How to update password with Convex Auth?

**Options:**
1. Use Convex Auth's internal password update mechanism (if exposed)
2. Directly update the `authAccounts` table password hash
3. Delete existing password account and re-create with new password

**Recommendation:** Research Convex Auth documentation; likely option 1 or 2.

### Q2: Session ID access for grace period check

**Question:** How do we get the current session ID to query `authSessions`?

**Likely Answer:** Convex Auth likely provides session info through the auth context. Need to verify API.

### Q3: Cross-device session behavior

**Question:** Should logging in on a new device invalidate grace periods on other devices?

**Recommendation:** No - each session has its own grace period based on its creation time. This is more user-friendly and consistent with the session model.

### Q4: Forgot password vs Settings password change

**Question:** Should forgot password create a new "grace period" session?

**Recommendation:** Yes - when a user signs in via forgot password magic link, they get a fresh session with a new 15-minute grace period.

---

## Alternatives Considered

### Alternative 1: Separate Reset Password Flow

**Description:** Implement a traditional password reset with reset tokens, separate from magic links.

**Rejected Because:**
- Duplicates functionality already available via magic links
- More complex implementation
- Not aligned with "magic-link-first" philosophy

### Alternative 2: Client-Side Grace Period Only

**Description:** Track `lastAuthenticatedAt` purely in localStorage.

**Rejected Because:**
- Security vulnerability (can be manipulated)
- Doesn't persist across devices correctly
- Not suitable for production security requirements

### Alternative 3: Extended User Schema for Session Tracking

**Description:** Add `lastAuthenticatedAt` to the `users` table.

**Rejected Because:**
- Wrong granularity (user-level vs session-level)
- Doesn't support multi-device scenarios correctly
- Convex Auth already tracks session creation time

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Grace period accuracy | 100% | Server-side validation matches client display |
| Password change success | >99% | Error rate for valid password changes |
| Re-auth email delivery | >99% | Successful email sends via Resend |
| User confusion | Minimal | Support tickets related to password changes |

---

## References

- `figma-designs/AUTHENTICATION.md` - Authentication system design
- `figma-designs/src/app/components/SettingsPage.tsx` - Reference UI implementation
- `docs/architecture/decisions/0001-authentication-provider.md` - Auth provider ADR
- `docs/architecture/convex-rules.md` - Convex implementation guidelines
- [Convex Auth Documentation](https://labs.convex.dev/auth)
