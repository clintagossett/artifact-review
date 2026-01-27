# Subtask 01: Novu Subscriber Synchronization

## Objective

Ensure users are registered as Novu subscribers when they sign up or log in, so they can receive notifications. The `subscriberId` passed to Novu must match what the backend uses when triggering notifications.

## Context

Currently:
- `convex/novu.ts` triggers notifications using `subscriberId` (which is the Convex `userId`)
- `NotificationCenter.tsx` uses `subscriberId={userId}`
- **Missing**: Novu doesn't know about these users until they're explicitly created as subscribers

Without subscriber sync, notifications will fail silently because Novu has no record of the user.

## Technical Approach

### Option A: Create Subscriber on First Notification (Lazy)
- Modify `triggerCommentNotification` and `triggerReplyNotification` to use `novu.subscribers.identify()` before `novu.trigger()`
- Pros: Simple, no auth changes needed
- Cons: First notification to new user might have delay

### Option B: Create Subscriber on User Signup (Eager) - RECOMMENDED
- Add a Novu subscriber creation step in the auth flow
- Use Convex's `afterUserCreatedOrUpdated` callback or a post-signup action
- Pros: Users are ready for notifications immediately
- Cons: Requires integration with auth flow

### Recommended Implementation

1. Create `convex/novu.ts` internal action: `createOrUpdateSubscriber`
2. Call it from user creation/update hooks
3. Include user metadata (email, name) for Novu's subscriber profile

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `convex/novu.ts` | Modify | Add `createOrUpdateSubscriber` internal action |
| `convex/auth.ts` | Modify | Add afterUserCreated callback to sync subscriber |
| `convex/users.ts` | Modify | Call subscriber sync when user updates profile |

## Implementation Details

### New Internal Action in `convex/novu.ts`

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

    const novu = new Novu(apiKey);

    await novu.subscribers.identify(args.userId, {
      email: args.email,
      firstName: args.name,
      avatar: args.avatarUrl,
    });

    return null;
  },
});
```

### Auth Integration

In `convex/auth.ts`, add callback:
```typescript
callbacks: {
  afterUserCreatedOrUpdated: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (user) {
      await ctx.scheduler.runAfter(0, internal.novu.createOrUpdateSubscriber, {
        userId: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: user.image,
      });
    }
  },
}
```

## Test Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| New user signup | User signs up via magic link | Novu subscriber created with userId |
| User updates profile | User changes their name | Novu subscriber updated with new name |
| Missing NOVU_SECRET_KEY | Env var not set | Graceful skip with warning log |
| Subscriber already exists | Same user logs in again | Novu identifies (upserts) without error |

## Dependencies

- Subtask 02 (Novu Workflow Setup) must be complete for notifications to work
- Requires `NOVU_SECRET_KEY` environment variable

## Acceptance Criteria

- [ ] New users are automatically registered as Novu subscribers
- [ ] User profile updates sync to Novu subscriber profile
- [ ] Works gracefully when NOVU_SECRET_KEY is not configured
- [ ] Unit tests pass for createOrUpdateSubscriber action
