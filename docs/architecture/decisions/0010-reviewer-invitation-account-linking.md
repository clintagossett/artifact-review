# ADR 0010: Reviewer Invitation Account Linking

**Status:** Accepted
**Date:** 2025-12-27
**Decision Maker:** Clint Gossett
**Scope:** Email invitations only (MVP)

## Context

The Share Button feature (Task 00011, Subtasks 02-05) allows artifact owners to invite reviewers by email. This creates a critical challenge:

**The Problem:**
1. Owner invites `reviewer@company.com` with "can-comment" permission
2. System creates `artifactReviewers` record with `userId: null` (reviewer has no account yet)
3. Reviewer eventually signs up using `reviewer@company.com`
4. **How do we link the pending invitation to their new user account?**

**Why This Matters:**
- Invited reviewers should immediately have access when they sign up
- Multiple artifacts might be shared with the same email before signup
- Permission checks need to work for both authenticated and pending users
- User experience must be seamless (no manual "claim invitation" step)

**Current State:**
- ADR 0001 established email-based account linking for OAuth providers
- `artifactReviewers` table has nullable `userId` field and `status: "pending" | "accepted"`
- `inviteReviewer` mutation checks for existing users at invitation time
- No mechanism exists to link pending invitations when new users sign up

## Options

### Option A: Link at Signup (Auth Hook) ⭐ RECOMMENDED

**Mechanism:** Call linking function during user creation/first login.

**Implementation:**
```typescript
// convex/sharing.ts
export const linkPendingInvitations = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Find all pending invitations for this email
    const pendingInvitations = await ctx.db
      .query("artifactReviewers")
      .withIndex("by_email", q => q.eq("email", normalizedEmail))
      .filter(q => q.eq(q.field("userId"), null))
      .collect();

    // Link each invitation to the new user account
    for (const invitation of pendingInvitations) {
      await ctx.db.patch(invitation._id, {
        userId: args.userId,
        status: "accepted",
      });
    }
  },
});

// convex/auth.ts (existing auth callback)
callbacks: {
  async createOrUpdateUser(ctx, args) {
    // ... existing account linking logic from ADR 0001 ...

    const userId = existingUser?._id ?? await ctx.db.insert("users", {
      email: args.profile.email,
      name: args.profile.name,
      image: args.profile.image,
      emailVerificationTime: args.profile.emailVerified ? Date.now() : undefined,
    });

    // NEW: Link any pending reviewer invitations
    if (args.profile.email && !existingUser) {
      await ctx.scheduler.runAfter(0, internal.sharing.linkPendingInvitations, {
        userId,
        email: args.profile.email,
      });
    }

    return userId;
  },
}
```

**Pros:**
- ✅ Immediate access: User can access all invited artifacts on first login
- ✅ Clean separation: Auth flow handles linking, permission checks stay simple
- ✅ Batch operation: Links ALL pending invitations at once
- ✅ No performance impact on artifact viewing

**Cons:**
- ❌ Requires modifying auth flow (cross-feature dependency)
- ❌ Adds complexity to user creation flow
- ❌ Async via scheduler (slight delay, but acceptable)

---

### Option B: Link at First Access (Lazy Linking)

**Mechanism:** Check for pending invitations during permission check.

**Implementation:**
```typescript
// convex/sharing.ts
export const getUserPermission = query({
  args: { artifactId: v.id("artifacts") },
  returns: v.union(
    v.literal("owner"),
    v.literal("can-comment"),
    v.literal("view-only"),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const artifact = await ctx.db.get(args.artifactId);

    if (!artifact) return null;

    // Owner check
    if (userId === artifact.creatorId) return "owner";

    // NEW: Lazy linking logic
    if (userId) {
      const user = await ctx.db.get(userId);
      const pendingInvite = await ctx.db
        .query("artifactReviewers")
        .withIndex("by_artifact_email", q =>
          q.eq("artifactId", args.artifactId)
           .eq("email", user.email)
        )
        .first();

      // Link invitation if found
      if (pendingInvite && !pendingInvite.userId) {
        await ctx.db.patch(pendingInvite._id, {
          userId,
          status: "accepted",
        });
        return pendingInvite.permission;
      }
    }

    // ... rest of permission logic ...
  }
});
```

**Pros:**
- ✅ No auth flow modification needed
- ✅ Self-contained within sharing feature
- ✅ Works automatically on first artifact access

**Cons:**
- ❌ Mutation in a query (violates Convex best practices - queries should be read-only)
- ❌ Performance: Adds checks to every permission query
- ❌ Only links one artifact at a time (multiple invited artifacts require multiple accesses)
- ❌ Complex permission check logic (harder to test)

---

### Option C: Background Job (Periodic Linking)

**Mechanism:** Cron job periodically scans for new users and links pending invitations.

**Implementation:**
```typescript
// convex/crons.ts
export default {
  linkPendingReviewers: {
    schedule: "0 */6 * * *", // Every 6 hours
    handler: async (ctx) => {
      // Find users created in last 6 hours
      const cutoff = Date.now() - 6 * 60 * 60 * 1000;
      const newUsers = await ctx.db
        .query("users")
        .filter(q => q.gte(q.field("_creationTime"), cutoff))
        .collect();

      for (const user of newUsers) {
        if (user.email) {
          await ctx.runMutation(internal.sharing.linkPendingInvitations, {
            userId: user._id,
            email: user.email,
          });
        }
      }
    },
  },
};
```

**Pros:**
- ✅ No impact on auth flow
- ✅ No impact on permission checks
- ✅ Simple, isolated implementation

**Cons:**
- ❌ Delayed access: Users wait up to 6 hours for invitations to link
- ❌ Poor user experience (invited users can't access artifacts immediately)
- ❌ Unnecessary complexity (cron infrastructure)
- ❌ Potential for duplicate processing

---

## Decision

**Choose Option A: Link at Signup (Auth Hook)**

**Rationale:**
1. **User Experience Priority:** Immediate access is critical for invited reviewers
2. **Consistency with ADR 0001:** Already using email-based linking in auth flow
3. **Performance:** One-time cost at signup vs. cost on every permission check
4. **Batch Efficiency:** Links all pending invitations at once
5. **Clean Architecture:** Permission checks remain simple and read-only

**Tradeoff Accepted:**
- We add a dependency between the sharing feature and auth flow
- This is acceptable because account linking is already a core responsibility of the auth system (established in ADR 0001)

## Consequences

### Positive

- ✅ Seamless UX: Invited users immediately see all shared artifacts
- ✅ Simple permission checks: No mutation logic in queries
- ✅ Batch efficiency: One auth hook links multiple artifacts
- ✅ Testable: Clear separation between auth and permission logic
- ✅ Consistent: Extends existing email-based linking pattern

### Negative

- ❌ Cross-feature coupling: Sharing feature depends on auth flow
- ❌ Auth complexity: Adds another responsibility to user creation
- ❌ Async linking: Slight delay via scheduler (acceptable, sub-second)

### Migration Impact

**This decision is compatible with future auth provider migration:**
- Email remains the linking key (not provider-specific ID)
- When migrating to Clerk (per ADR 0001), the linking logic moves but pattern stays the same
- Pending invitations remain intact during migration

## Implementation Details

### Changes Required

**1. Add to `convex/sharing.ts`:**
- New `linkPendingInvitations` internal mutation
- Test coverage for linking logic

**2. Modify `convex/auth.ts`:**
- Call `linkPendingInvitations` in `createOrUpdateUser` callback
- Only for new users (not existing account logins)
- Use scheduler to avoid blocking auth flow

**3. Update `inviteReviewer` mutation:**
- Already checks for existing users at invitation time
- Document that `userId` and `status` are set immediately if user exists

### Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| User exists when invited | `userId` set immediately, `status: "accepted"` |
| User signs up later | Auth hook links invitation, `status: "accepted"` |
| Multiple artifacts shared with same email | All linked in single batch |
| User signs up with different email | Invitations remain pending (expected) |
| Email case mismatch | Normalized to lowercase (consistent) |

### Testing Strategy

**Unit Tests:**
```typescript
describe("linkPendingInvitations", () => {
  it("should link all pending invitations for user email");
  it("should update status from pending to accepted");
  it("should handle multiple artifacts for same email");
  it("should ignore already-linked invitations");
  it("should normalize email case");
});

describe("auth callback integration", () => {
  it("should call linkPendingInvitations for new users");
  it("should not call linkPendingInvitations for existing users");
  it("should handle users without email gracefully");
});
```

**Integration Tests:**
```typescript
describe("invitation linking flow", () => {
  it("invited user immediately has access after signup");
  it("user invited to multiple artifacts sees all on first login");
  it("existing user invited gets immediate access");
});
```

### Performance Considerations

**Auth Flow Impact:**
- Linking happens async via scheduler (non-blocking)
- Typical case: 1-5 invitations per user (low overhead)
- Worst case: 100+ invitations (still acceptable, <1s total)

**Permission Check Impact:**
- No change to permission check performance
- Remains a simple query (no mutation logic)

## References

### Related ADRs
- [ADR 0001: Authentication Provider](./0001-authentication-provider.md) - Email-based account linking
- [ADR 0004: Email Strategy](./0004-email-strategy.md) - Resend integration (future: actual invitation emails)

### Related Tasks
- Task 00011: Present Artifact Version for Commenting
  - Subtask 01: Share Button Planning
  - Subtask 02: Schema & Backend Foundation (BLOCKED until this ADR is accepted)
  - Subtask 03: ShareModal UI Shell (BLOCKED until this ADR is accepted)

### Technical References
- [Convex Auth Callbacks](https://labs.convex.dev/auth/advanced)
- [Convex Scheduler](https://docs.convex.dev/scheduling)
- Share Button Architecture: `tasks/00011-present-artifact-version-for-commenting/01-share-button-planning/ARCHITECTURE.md`

## Related Decision: Email Sending

### Context

The original plan was to mock email sending (console.log only). However, this makes the "invite by email" feature non-functional - reviewers have no way to know they were invited.

### Decision: Implement Email Sending Now

**We will implement actual email sending as part of Subtask 02**, not defer it to a future task.

**Rationale:**
1. Without emails, email invitations are broken (owner must manually share links)
2. Resend is already chosen (ADR 0004) and configured
3. Implementation is straightforward (Convex action + email template)
4. Critical for feature to be useful in MVP

### Implementation

**Email Configuration:**
```bash
# app/.env.local
NOTIFICATION_FROM_EMAIL=notifications@artifactreview-early.xyz
```

**Email Action:**
```typescript
// convex/sharing.ts
import { Resend } from "resend";

export const sendInvitationEmail = action({
  args: {
    reviewerId: v.id("artifactReviewers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reviewer = await ctx.runQuery(internal.sharing.getReviewerById, {
      reviewerId: args.reviewerId,
    });

    const artifact = await ctx.runQuery(internal.artifacts.getById, {
      artifactId: reviewer.artifactId,
    });

    const inviter = await ctx.runQuery(internal.users.getById, {
      userId: reviewer.invitedBy,
    });

    const resend = new Resend(process.env.AUTH_RESEND_KEY);

    await resend.emails.send({
      from: process.env.NOTIFICATION_FROM_EMAIL!,
      to: reviewer.email,
      subject: `You've been invited to review "${artifact.title}"`,
      html: renderInvitationEmail({ artifact, reviewer, inviter }),
    });
  },
});
```

**Email Template (Simple):**
```html
Subject: You've been invited to review "Landing Page Redesign"

Hi,

[Inviter Name] invited you to review their artifact.

Artifact: [Artifact Title]
Permission: [Can Comment / View Only]

[View Artifact Button]
→ https://artifactreview.app/a/[shareToken]

---
Artifact Review
```

**Testing:**
- **Local/CI:** Use Mailpit (per ADR 0001) to capture emails without sending
- **Unit tests:** Mock Resend API
- **E2E tests:** Verify email sent via Resend test mode

---

## Related Decision: Post-Authentication Deep Linking

### Context

When a reviewer clicks an invitation email link, they may not be authenticated. We need to ensure they're redirected back to the artifact after logging in, not sent to the dashboard.

**User Flow:**
1. Reviewer clicks email link → `/a/abc123xyz`
2. Not authenticated → Sees artifact + "Login to comment" banner
3. Clicks "Login to comment"
4. Completes authentication (magic link or OAuth)
5. **Should redirect back to `/a/abc123xyz`** (not `/dashboard`)
6. Can now comment immediately

### Decision: Query Parameter Redirect

**We will use URL query parameters to preserve the intended destination.**

**Rationale:**
1. Simple to implement (no session storage)
2. Works across auth methods (magic link, OAuth)
3. Survives page refreshes
4. Easy to test

### Implementation

**On Artifact Page (Unauthenticated User):**
```typescript
// app/src/app/a/[shareToken]/page.tsx

function UnauthenticatedBanner({ shareToken }: { shareToken: string }) {
  function handleLoginClick() {
    const returnTo = `/a/${shareToken}`;
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  return (
    <div className="bg-blue-50 p-4 rounded">
      <p>Login to view and comment on this artifact</p>
      <button onClick={handleLoginClick}>Login to Comment</button>
    </div>
  );
}
```

**In Auth Callback:**
```typescript
// app/src/app/auth/callback/route.ts (or wherever Convex Auth callback is)

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo');

  // Validate redirect URL (prevent open redirect attacks)
  const isValidRedirect = (url: string | null): boolean => {
    if (!url) return false;
    // Only allow relative URLs starting with /
    return url.startsWith('/') && !url.startsWith('//');
  };

  if (returnTo && isValidRedirect(returnTo)) {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  // Default: redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

**Security Considerations:**
- **Validate redirect URLs:** Only allow relative paths (prevent open redirect)
- **Pattern:** `^/[^/]` (starts with `/`, not `//`)
- **Block:** Absolute URLs, protocol-relative URLs (`//evil.com`)

### Testing

```typescript
describe("Post-auth deep linking", () => {
  it("redirects to artifact after login from email link");
  it("redirects to dashboard if no returnTo parameter");
  it("blocks absolute URLs (open redirect attack)");
  it("blocks protocol-relative URLs");
  it("allows valid relative paths");
});
```

---

## Scope

This ADR covers reviewer invitations via email with "can-comment" permission.

**Included:**
- Email invitations (not public share links)
- Single permission level: "can-comment"
- Email sending via Resend
- Deep linking after authentication

**Out of scope (future consideration):**
- Public share links
- "View-only" permission level

