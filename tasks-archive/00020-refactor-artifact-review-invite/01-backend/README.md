# Subtask 01: Backend Implementation

**Parent Task:** 00020-refactor-artifact-review-invite
**Status:** COMPLETE
**Created:** 2026-01-03
**Completed:** 2026-01-06

---

## Objective

Implement the schema changes and Convex backend functions for the two-table invitation system (`userInvites` + `artifactAccess`).

---

## Deliverables

### 1. Schema Changes (`convex/schema.ts`)

Add two new tables with ADR-0012 compliant naming:

#### Table: `userInvites`

```typescript
userInvites: defineTable({
  email: v.string(),
  name: v.optional(v.string()),
  createdBy: v.id("users"),
  convertedToUserId: v.optional(v.id("users")),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
  .index("by_email_createdBy", ["email", "createdBy"])
  .index("by_email", ["email"])
  .index("by_convertedToUserId", ["convertedToUserId"]),
```

#### Table: `artifactAccess`

```typescript
artifactAccess: defineTable({
  artifactId: v.id("artifacts"),
  userId: v.optional(v.id("users")),
  userInviteId: v.optional(v.id("userInvites")),
  createdBy: v.id("users"),
  lastSentAt: v.number(),
  sendCount: v.number(),
  firstViewedAt: v.optional(v.number()),
  lastViewedAt: v.optional(v.number()),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
  .index("by_artifactId_active", ["artifactId", "isDeleted"])
  .index("by_artifactId_userId", ["artifactId", "userId"])
  .index("by_artifactId_userInviteId", ["artifactId", "userInviteId"])
  .index("by_userId_active", ["userId", "isDeleted"])
  .index("by_userInviteId", ["userInviteId"]),
```

### 2. New File: `convex/access.ts`

#### Queries

| Function | Purpose | Args | Returns |
|----------|---------|------|---------|
| `listReviewers` | List reviewers for share dialog | `{ artifactId }` | `Array<{ displayName, email, status, accessId, sendCount, lastSentAt }>` |
| `getPermission` | Check current user's permission on artifact | `{ artifactId }` | `"owner" \| "can-comment" \| null` |
| `listShared` | List artifacts shared with current user | `{}` | `Array<{ artifact, accessRecord }>` |

#### Mutations

| Function | Purpose | Args | Returns |
|----------|---------|------|---------|
| `grant` | Invite reviewer (existing or new user) | `{ artifactId, email }` | `Id<"artifactAccess">` |
| `revoke` | Soft delete access record | `{ accessId }` | `null` |
| `resend` | Increment sendCount, update lastSentAt, trigger email | `{ accessId }` | `null` |
| `recordView` | Set firstViewedAt/lastViewedAt | `{ accessId }` | `null` |

#### Internal Functions

| Function | Type | Purpose | Args |
|----------|------|---------|------|
| `linkInvitesToUserInternal` | `internalMutation` | Called on signup to link pending invites | `{ userId, email }` |
| `sendEmailInternal` | `internalAction` | Send invitation/notification email via Resend | `{ accessId }` |

### 3. Modify: `convex/auth.ts`

Update `createOrUpdateUser` callback:
- Replace `internal.sharing.linkPendingInvitations` with `internal.access.linkInvitesToUserInternal`

### 4. Cleanup

After verification:
- Delete `convex/sharing.ts`
- Remove `artifactReviewers` table from schema

---

## Implementation Order

1. Add `userInvites` and `artifactAccess` tables to `schema.ts`
2. Create `convex/access.ts` with core functions:
   - `grant` mutation
   - `linkInvitesToUserInternal` internal mutation
   - `listReviewers` query
   - `getPermission` query
3. Update `auth.ts` callback
4. Add remaining functions: `revoke`, `resend`, `recordView`, `sendEmailInternal`
5. Cleanup old files

---

## Key Behaviors

### `grant` Mutation Logic

1. Check if email belongs to existing user
   - If YES: Create `artifactAccess` with `userId`, no `userInvites`
   - If NO: Continue to step 2
2. Check if `userInvites` exists for (email, createdBy)
   - If NO: Create `userInvites` record
3. Check if `artifactAccess` exists for this artifact + user/invite
   - If YES and `isDeleted=true`: Un-delete, update `lastSentAt`/`sendCount`
   - If NO: Create new `artifactAccess`
4. Trigger `sendEmailInternal`

### `linkInvitesToUserInternal` Logic

Called on user signup:
1. Query all `userInvites` by email
2. For each invite:
   - Set `convertedToUserId = userId`
3. For each invite, query all `artifactAccess` by `userInviteId`
4. For each access:
   - Set `userId = newUserId`
   - Clear `userInviteId = undefined`

---

## Validation Scenarios (Backend Focus)

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 1 | Invite existing user | `artifactAccess` with `userId`, no `userInvites` created |
| 2 | Invite new user | `userInvites` + `artifactAccess` with `userInviteId` |
| 3 | Same owner, same email, multiple artifacts | One `userInvites`, multiple `artifactAccess` |
| 4 | Different owners, same email | Separate `userInvites` per owner |
| 5 | Pending user signs up | All invites linked, access records updated |
| 6 | Resend invitation | `lastSentAt` updated, `sendCount` incremented |
| 7 | Revoke access (existing) | `isDeleted=true`, user loses access |
| 8 | Revoke access (pending) | `isDeleted=true`, `userInvites` unchanged |
| 9 | Re-invite after revocation | Un-delete existing record |
| 10 | Permission check | O(1) via `by_artifactId_userId` index |

---

## ADR-0012 Compliance Checklist

- [ ] Index names use `by_camelCaseField` pattern (no `_and_`)
- [ ] Soft-delete indexes use `_active` shorthand
- [ ] Function names are generic CRUD (`grant`, `revoke`, `list*`, `get*`)
- [ ] Internal functions use `*Internal` suffix
- [ ] All queries/mutations have `args` and `returns` validators
- [ ] Uses `createdBy` for record creator (not authorId, creatorId)

---

## Files

| File | Description |
|------|-------------|
| `README.md` | This file |
| `tests/` | Backend unit tests (to be created) |

---

## How This Will Be Used

The backend provides the data layer and API for the frontend components in `02-frontend`. The `getPermission` query is especially critical as it powers real-time permission changes (kick-out when revoked).
