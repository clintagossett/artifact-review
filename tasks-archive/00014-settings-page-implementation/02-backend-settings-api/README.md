# Subtask 02: Backend - Settings API

**Agent:** TDD Developer
**Type:** Backend (Convex)
**Complexity:** Medium
**Dependencies:** None (can start immediately)

---

## Objective

Implement all backend Convex functions needed for the Settings page:
- Grace period status tracking
- User name updates
- Password changes with grace period validation
- Re-authentication magic link

---

## Deliverables

### Files to Create

| File | Type | Purpose |
|------|------|---------|
| `app/convex/settings.ts` | New | Settings-related queries, mutations, actions |
| `app/convex/__tests__/settings.test.ts` | New | Backend tests for settings functions |

### Files to Modify

| File | Modification |
|------|--------------|
| `app/convex/users.ts` | Add `updateName` mutation |
| `app/convex/__tests__/users.test.ts` | Add tests for `updateName` |

---

## Implementation Details

### 1. Grace Period Status Query

**Function:** `settings.getGracePeriodStatus`

```typescript
// app/convex/settings.ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";

// Grace period: 15 minutes in production, 5 seconds in tests
const GRACE_PERIOD_MS = process.env.NODE_ENV === 'test'
  ? 5 * 1000
  : 15 * 60 * 1000;

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
      return {
        isWithinGracePeriod: false,
        expiresAt: null,
        sessionCreatedAt: null
      };
    }

    const sessionId = await getAuthSessionId(ctx);
    if (!sessionId) {
      return {
        isWithinGracePeriod: false,
        expiresAt: null,
        sessionCreatedAt: null
      };
    }

    const session = await ctx.db.get(sessionId);
    if (!session) {
      return {
        isWithinGracePeriod: false,
        expiresAt: null,
        sessionCreatedAt: null
      };
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

**Tests:**
- [ ] Returns false when not authenticated
- [ ] Returns false when no session
- [ ] Returns true when session < grace period (5s in tests)
- [ ] Returns false when session > grace period (after 6s wait)
- [ ] Includes correct expiry timestamp
- [ ] Includes session creation timestamp
- [ ] Timer countdown works correctly
- [ ] Dynamically transitions from fresh to stale state

**Testing Grace Period Expiry:**

The grace period is set to **5 seconds** in test mode (vs 15 minutes in production) via `NODE_ENV=test`. This allows testing expiry without long waits:

```typescript
// Example test
test('grace period expires after 5 seconds', async () => {
  const sessionId = await createTestSession();

  // Immediately after creation: within grace period
  const status1 = await ctx.runQuery(api.settings.getGracePeriodStatus);
  expect(status1.isWithinGracePeriod).toBe(true);

  // Wait 6 seconds (exceeds 5-second test grace period)
  await sleep(6000);

  // After expiry: outside grace period
  const status2 = await ctx.runQuery(api.settings.getGracePeriodStatus);
  expect(status2.isWithinGracePeriod).toBe(false);
  expect(status2.expiresAt).toBe(null);
});
```

---

### 2. Update User Name Mutation

**Function:** `users.updateName`

```typescript
// app/convex/users.ts (add to existing file)
export const updateName = mutation({
  args: {
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate name
    if (!args.name.trim()) {
      throw new Error("Name cannot be empty");
    }

    if (args.name.length > 100) {
      throw new Error("Name too long (max 100 characters)");
    }

    // Update user
    await ctx.db.patch(userId, { name: args.name.trim() });

    return null;
  },
});
```

**Tests:**
- [ ] Updates user name successfully
- [ ] Throws error when not authenticated
- [ ] Throws error when name is empty
- [ ] Throws error when name is whitespace only
- [ ] Throws error when name exceeds 100 chars
- [ ] Trims whitespace from name

---

### 3. Change Password Mutation

**Function:** `settings.changePassword`

```typescript
// app/convex/settings.ts
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

    if (!/\d/.test(args.newPassword)) {
      return { success: false, error: "Password must contain a number" };
    }

    if (!/[a-zA-Z]/.test(args.newPassword)) {
      return { success: false, error: "Password must contain a letter" };
    }

    // Check grace period
    const sessionId = await getAuthSessionId(ctx);
    const session = sessionId ? await ctx.db.get(sessionId) : null;
    const GRACE_PERIOD_MS = 15 * 60 * 1000;
    const isWithinGracePeriod = session &&
      (Date.now() - session._creationTime) < GRACE_PERIOD_MS;

    // If outside grace period, require current password
    if (!isWithinGracePeriod && !args.currentPassword) {
      return {
        success: false,
        error: "Current password required"
      };
    }

    // If current password provided, verify it
    if (args.currentPassword) {
      // TODO: Implement password verification
      // Need to research Convex Auth password verification API
      // May need to query authAccounts table
    }

    // TODO: Update password
    // Need to research Convex Auth password update API
    // May need to update authAccounts table directly

    return { success: true };
  },
});
```

**Tests:**
- [ ] Changes password successfully within grace period
- [ ] Changes password successfully with current password
- [ ] Rejects password < 8 characters
- [ ] Rejects password without number
- [ ] Rejects password without letter
- [ ] Requires current password outside grace period
- [ ] Rejects incorrect current password
- [ ] Returns error when not authenticated

---

### 4. Send Re-auth Magic Link Action

**Function:** `settings.sendReauthMagicLink`

```typescript
// app/convex/settings.ts
import { action } from "./_generated/server";

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

    // Send magic link using existing infrastructure
    // TODO: Integrate with existing Resend magic link flow
    // May need to call signIn action or use internal API
    // Redirect should default to "/settings"
    const redirect = args.redirectTo || "/settings";

    return null;
  },
});
```

**Tests:**
- [ ] Sends magic link to authenticated user
- [ ] Throws error when not authenticated
- [ ] Uses default redirect to /settings
- [ ] Uses custom redirect when provided
- [ ] Integration with Resend (mock in tests)

---

## Technical Investigation Required

Before full implementation, research:

1. **Password Verification**
   - How to verify current password with Convex Auth
   - Likely involves querying `authAccounts` table
   - Check Convex Auth docs for password verification API

2. **Password Update**
   - How to update password hash with Convex Auth
   - Options:
     - Convex Auth internal API
     - Direct `authAccounts` table update
     - Delete and recreate password account
   - Must maintain proper bcrypt hashing

3. **Session ID Access**
   - Verify `getAuthSessionId` works as expected
   - Test accessing `authSessions` table
   - Confirm session structure

4. **Magic Link Re-auth**
   - How to trigger magic link send from backend action
   - May reuse client-side `signIn("resend", ...)` flow
   - Or expose server-side magic link generation

---

## Testing Strategy

### Unit Tests (Backend)

Create `app/convex/__tests__/settings.test.ts`:
- Mock auth context (userId, sessionId)
- Test all validation logic
- Test grace period calculations
- Mock database operations

### Integration Tests

- Test with real Convex dev server
- Verify session queries work
- Test password updates end-to-end
- Test magic link generation

---

## Acceptance Criteria

- [ ] All functions have correct validators (args + returns)
- [ ] All functions follow Convex rules (from `docs/architecture/convex-rules.md`)
- [ ] Grace period calculation is accurate
- [ ] Password validation matches frontend standard
- [ ] All functions have comprehensive tests
- [ ] Tests achieve >90% coverage
- [ ] Backend follows TDD workflow (tests first)
- [ ] No security vulnerabilities (SQL injection, etc.)
- [ ] Proper error messages for all failure cases

---

## TDD Workflow

1. **RED** - Write failing test
2. **GREEN** - Minimal code to pass
3. **REFACTOR** - Clean up
4. **REPEAT** - Next test

For each function:
1. Start with simplest test case
2. Add edge cases
3. Add error cases
4. Refactor once all tests pass

---

## Security Considerations

- [ ] Grace period validated server-side (not client)
- [ ] Password validation server-side (defense in depth)
- [ ] Current password required outside grace period
- [ ] Session ID cannot be forged
- [ ] Password hashes never exposed
- [ ] Rate limiting considered (future enhancement)

---

## Dependencies for Frontend

Frontend subtask (03) will depend on these APIs being ready:
- `settings.getGracePeriodStatus` - for banner display
- `users.updateName` - for name editing
- `settings.changePassword` - for password form
- `settings.sendReauthMagicLink` - for re-auth button

Frontend can start building UI with mocks while backend is in progress.

---

## Handoff to TDD Agent

When ready, hand off with:
1. This README
2. `docs/architecture/convex-rules.md`
3. `tasks/00014-settings-page-implementation/01-architecture-phased-planning/ARCHITECTURE.md`
4. `tasks/00014-settings-page-implementation/01-architecture-phased-planning/DECISIONS.md`
5. Existing auth code in `app/convex/auth.ts`

Instruct agent to:
- Follow TDD workflow strictly
- Research Convex Auth APIs before implementing password functions
- Write tests in `tasks/00014-settings-page-implementation/02-backend-settings-api/tests/`
- Create validation video when complete
