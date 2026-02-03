# Dev Plan: Novu Subscriber Synchronization

## Overview

Implement automatic Novu subscriber synchronization when users sign up or update their profile. This ensures users are registered as Novu subscribers so they can receive notifications.

## Tests to Write (TDD Order)

### Unit Tests (`tests/unit/`)

#### 1. createOrUpdateSubscriber Action Tests

- [x] **Test 1: Successfully creates subscriber with full user data**
  - Input: userId, email, name, avatarUrl
  - Assert: Novu `subscribers.identify()` called with correct subscriberId and profile data

- [x] **Test 2: Creates subscriber with minimal data (userId only)**
  - Input: userId, no email/name/avatarUrl
  - Assert: Novu `subscribers.identify()` called with just subscriberId

- [x] **Test 3: Gracefully skips when NOVU_SECRET_KEY is not set**
  - Setup: No NOVU_SECRET_KEY env var
  - Assert: No Novu API call, returns null without throwing
  - Assert: Warning logged

- [x] **Test 4: Propagates Novu API errors**
  - Setup: Novu API throws error
  - Assert: Action throws (allows Convex scheduler to retry)

#### 2. Auth Integration Tests

- [x] **Test 5: New user signup triggers subscriber sync**
  - Action: User signs up (createOrUpdateUser callback fires)
  - Assert: `createOrUpdateSubscriber` scheduled with user data

- [x] **Test 6: User profile update triggers subscriber sync**
  - Action: Existing user updates name/image
  - Assert: `createOrUpdateSubscriber` scheduled with updated data

### Integration Tests (if applicable)

- [x] **Test 7: End-to-end subscriber creation flow**
  - Mock Novu API
  - User signs up
  - Assert: Subscriber created in mock Novu

## Implementation Steps

### Step 1: Add `createOrUpdateSubscriber` Internal Action

**File:** `convex/novu.ts`

```typescript
export const createOrUpdateSubscriber = internalAction({
  args: {
    userId: v.id("users"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const apiKey = process.env.NOVU_SECRET_KEY;
    if (!apiKey) {
      console.warn("Missing NOVU_SECRET_KEY. Skipping subscriber sync.");
      return null;
    }

    const novuOptions = process.env.NOVU_API_URL
      ? { backendUrl: process.env.NOVU_API_URL }
      : undefined;
    const novu = new Novu(apiKey, novuOptions);

    // identify() is idempotent - creates or updates subscriber
    await novu.subscribers.identify(args.userId, {
      email: args.email,
      firstName: args.name,
      avatar: args.avatarUrl,
    });

    return null;
  },
});
```

### Step 2: Integrate with Auth Callback

**File:** `convex/auth.ts`

Add subscriber sync in the `createOrUpdateUser` callback after user creation/update:

```typescript
// After creating or updating user, sync to Novu
await ctx.scheduler.runAfter(0, internal.novu.createOrUpdateSubscriber, {
  userId,
  email: args.profile.email,
  name: args.profile.name ?? existingUser?.name,
  avatarUrl: args.profile.image ?? existingUser?.image,
});
```

### Step 3: Add Subscriber Sync to Profile Updates (if needed)

**File:** `convex/users.ts` (if exists and has profile update)

Ensure any user profile update (name change, avatar change) also triggers subscriber sync.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `convex/novu.ts` | Modify | Add `createOrUpdateSubscriber` internalAction |
| `convex/auth.ts` | Modify | Add scheduler call in createOrUpdateUser callback |
| `tasks/00043-novu-comment-notifications/01-subscriber-sync/tests/unit/novu-subscriber.test.ts` | Create | Unit tests for createOrUpdateSubscriber |
| `tasks/00043-novu-comment-notifications/01-subscriber-sync/tests/unit/auth-subscriber-sync.test.ts` | Create | Tests for auth integration |

## Acceptance Criteria Checklist

- [x] New users are automatically registered as Novu subscribers on signup
- [x] User profile updates sync to Novu subscriber profile
- [x] Works gracefully when NOVU_SECRET_KEY is not configured (no errors, warning logged)
- [x] Unit tests pass for `createOrUpdateSubscriber` action
- [x] Auth callback tests verify subscriber sync is scheduled
- [x] Existing notification triggers still work (no regressions)

## Dependencies

- Requires `NOVU_SECRET_KEY` environment variable for full functionality
- Uses existing `@novu/node` package (already in project)
- Depends on Convex scheduler for async execution

## Notes

- Using `ctx.scheduler.runAfter(0, ...)` for async execution (non-blocking)
- `novu.subscribers.identify()` is idempotent - safe to call multiple times
- SubscriberId = Convex userId (string) - matches existing notification trigger pattern
- No schema changes required
