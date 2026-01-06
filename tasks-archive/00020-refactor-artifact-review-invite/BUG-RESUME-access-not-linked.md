# Bug Resume: Invited User Can't Access Artifact

**Status:** In Progress - Need Convex data inspection
**Date:** 2026-01-03

---

## The Bug

An invited user who signed up successfully is getting "You don't have access" when trying to view the artifact they were invited to.

**Screenshot:** User sees lock icon with "You don't have access to 'Index'"

**URL:** `localhost:3000/a/5tQ-v50E`

---

## What We Know

### User IDs (from logs)
- **Owner:** `jx7a9m6e393wtvjrreykmdzdr17y3tby`
- **Invited User:** `jx7c0k451p6yerefhbv8f31zrx7yhxwg`

### Invitation Details
- **Email invited:** `clintagossett+20260103@gmail.com`
- **User confirms:** They signed up with the SAME email (brand new user)
- **Email was sent successfully** at 10:00:03 AM (confirmed in logs)

### The Problem
The `artifactAccess` record has:
```javascript
{
  userInviteId: "kx71x0vpt83g7abcw0frprdeqd7yh02h",  // Still set!
  userId: undefined  // NOT linked to the user!
}
```

The `getPermission` query only checks `by_artifactId_userId` index, so it doesn't find the access record.

---

## Root Cause Hypothesis

The `linkInvitesToUserInternal` function either:
1. Was never called (auth callback issue)
2. Was called but didn't find the userInvites record (email mismatch)
3. Was called but failed silently

### Auth Callback Flow (convex/auth.ts:55-79)
```typescript
async createOrUpdateUser(ctx, args) {
  // Check if user exists by email (NOT normalized!)
  const existingUser = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", args.profile.email))
    .first();

  // Only link for NEW users
  if (args.profile.email && !existingUser) {
    await ctx.scheduler.runAfter(0, internal.access.linkInvitesToUserInternal, {
      userId,
      email: args.profile.email,
    });
  }
}
```

**Potential issue:** If user was considered "existing" (maybe from previous test?), the link wouldn't be called.

---

## Data to Inspect with Convex MCP

1. **Users table:**
   - Find user with email `clintagossett+20260103@gmail.com`
   - Verify user ID matches `jx7c0k451p6yerefhbv8f31zrx7yhxwg`

2. **userInvites table:**
   - Find record with email `clintagossett+20260103@gmail.com`
   - Check if `convertedToUserId` is set

3. **artifactAccess table:**
   - Find record with `userInviteId: "kx71x0vpt83g7abcw0frprdeqd7yh02h"`
   - Verify `userId` is NOT set (that's the bug)

4. **Check if multiple users exist** with similar emails

---

## Debug Functions Added

Two temporary functions added to `convex/access.ts`:

### 1. `debugAccessData` (query)
Returns current user's email, all userInvites, and access records.

### 2. `manualLinkInvites` (mutation)
Manually links invites for an email to the current user.
```typescript
// Call as invited user:
api.access.manualLinkInvites({ email: "clintagossett+20260103@gmail.com" })
```

---

## Quick Fix (if needed)

If data inspection confirms the access record just needs linking:

```typescript
// In Convex dashboard or via mutation:
// 1. Update artifactAccess record
await ctx.db.patch("ks7c6nb40k1sks4wybdxrmtyn97yh0wc", {
  userId: "jx7c0k451p6yerefhbv8f31zrx7yhxwg",
  userInviteId: undefined,
});

// 2. Update userInvites record
await ctx.db.patch("kx71x0vpt83g7abcw0frprdeqd7yh02h", {
  convertedToUserId: "jx7c0k451p6yerefhbv8f31zrx7yhxwg",
});
```

---

## Long-term Fix Needed

After identifying root cause:

1. **If email case mismatch:** Normalize email in auth callback before querying
2. **If existing user detection wrong:** Add logging to auth callback
3. **If scheduler failed:** Add error handling/retry logic
4. **Consider:** Always call link function, even for "existing" users (idempotent)

---

## Files Modified During Investigation

| File | Changes |
|------|---------|
| `convex/access.ts` | Added logging to `linkInvitesToUserInternal`, added `debugAccessData` query, added `manualLinkInvites` mutation |

---

## Related Commits Today

```
f094998 Fix getAccessById return validator by projecting fields
27ecf3c Fix React hooks violation in ArtifactSettingsClient
78b5072 Add implementation notes for task 20 improvements
```
