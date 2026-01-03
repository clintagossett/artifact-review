# Implementation Architecture: Two-Table Invitation System

**Task:** 00020 - Refactor Artifact Review Invite
**Date:** 2026-01-01
**Status:** Ready for Implementation
**Design Source:** `design-revised.md`, `diagrams.md`

---

## 1. Schema Changes

### New Table: `userInvites`

Pending users who do not have accounts yet. Contains PII.

```typescript
// Add to convex/schema.ts
userInvites: defineTable({
  email: v.string(),
  name: v.optional(v.string()),
  createdBy: v.id("users"),
  convertedToUserId: v.optional(v.id("users")),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
  .index("by_email_and_createdBy", ["email", "createdBy"])
  .index("by_email", ["email"])
  .index("by_convertedToUserId", ["convertedToUserId"]),
```

### New Table: `artifactAccess`

Access grants linking artifacts to users or pending users. No PII.

```typescript
// Add to convex/schema.ts
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
  .index("by_artifact_and_isDeleted", ["artifactId", "isDeleted"])
  .index("by_artifact_and_userId", ["artifactId", "userId"])
  .index("by_artifact_and_userInviteId", ["artifactId", "userInviteId"])
  .index("by_userId_and_isDeleted", ["userId", "isDeleted"])
  .index("by_userInviteId", ["userInviteId"]),
```

### Table to Remove (after full migration)

The existing `artifactReviewers` table will be deprecated. Since we have no production data, we can remove it immediately after implementing the new tables.

---

## 2. Backend Functions

### File: `convex/access.ts` (new file)

#### Queries

| Function | Purpose | Args | Returns |
|----------|---------|------|---------|
| `getArtifactReviewers` | List reviewers for share dialog | `{ artifactId }` | `Array<{ displayName, email, status, accessId, sendCount, lastSentAt }>` |
| `getUserPermission` | Check user permission on artifact (used as subscription for real-time permission changes) | `{ artifactId }` | `"owner" \| "can-comment" \| null` |
| `getSharedWithMe` | List artifacts shared with current user | `{}` | `Array<{ artifact, accessRecord }>` |

#### Mutations

| Function | Purpose | Args | Returns |
|----------|---------|------|---------|
| `grantAccess` | Invite reviewer (existing or new user) | `{ artifactId, email }` | `Id<"artifactAccess">` |
| `revokeAccess` | Soft delete access record | `{ accessId }` | `null` |
| `resendInvitation` | Increment sendCount, update lastSentAt, trigger email | `{ accessId }` | `null` |
| `recordView` | Set firstViewedAt/lastViewedAt | `{ accessId }` | `null` |

#### Internal Mutations

| Function | Purpose | Args | Returns |
|----------|---------|------|---------|
| `linkUserInvitesToUser` | Called on signup to link pending invites | `{ userId, email }` | `null` |

#### Internal Actions

| Function | Purpose | Args | Returns |
|----------|---------|------|---------|
| `sendAccessEmail` | Send invitation/notification email via Resend | `{ accessId }` | `null` |

### File: `convex/auth.ts` (modify)

Update `createOrUpdateUser` callback:
- Replace `internal.sharing.linkPendingInvitations` with `internal.access.linkUserInvitesToUser`

---

## 3. Frontend

### Components to Create

| Component | Location | Purpose | Key Props |
|-----------|----------|---------|-----------|
| `ReviewerList` | `components/artifacts/ReviewerList.tsx` | Display list of reviewers in ShareModal | `artifactId` |
| `ReviewerRow` | `components/artifacts/ReviewerRow.tsx` | Single reviewer with status, actions | `reviewer, onResend, onRemove` |
| `InviteReviewerForm` | `components/artifacts/InviteReviewerForm.tsx` | Email input + invite button | `artifactId, onInvited` |

### Components to Modify

| Component | Location | Changes |
|-----------|----------|---------|
| `ShareModal` | `components/artifacts/ShareModal.tsx` | Add ReviewerList, InviteReviewerForm, keep link sharing |
| `ArtifactViewer` | `components/artifacts/ArtifactViewer.tsx` | Add permission subscription, kick-out handler with graceful UX |

### Hooks to Create

| Hook | Location | Purpose |
|------|----------|---------|
| `useArtifactAccess` | `hooks/useArtifactAccess.ts` | Query `getArtifactReviewers`, manage loading state |
| `useUserPermission` | `hooks/useUserPermission.ts` | Query `getUserPermission` for current artifact |

### Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| `deriveReviewerStatus` | `lib/access.ts` | Derive status from access record: `pending \| added \| viewed \| removed` |

### Reactive Permission Handling

Frontend subscribes to `getUserPermission` query via Convex's real-time subscription. When permission becomes `null` (revoked) mid-session:

1. **Show toast notification:** "Your access was revoked"
2. **Redirect to dashboard:** Navigate user away from artifact
3. **Preserve local draft comments:** Store any unsaved comment text in sessionStorage as a UX kindness (user can paste elsewhere)

**Edge case:** In-flight mutations during revoke are allowed to complete. This is a rare race condition and acceptable - the mutation will succeed but subsequent actions will be blocked.

**Implementation notes:**
- Use `useEffect` to watch permission changes
- Only trigger kick-out when permission transitions from truthy to `null` (not on initial load)
- Debounce redirect slightly to ensure toast is visible

---

## 4. Files Manifest

### New Files

```
convex/
  access.ts                    # All access-related queries/mutations

app/src/
  components/artifacts/
    ReviewerList.tsx           # List of reviewers
    ReviewerRow.tsx            # Single reviewer row
    InviteReviewerForm.tsx     # Email invite form
  hooks/
    useArtifactAccess.ts       # Reviewers query hook
    useUserPermission.ts       # Permission query hook
  lib/
    access.ts                  # Status derivation, email parsing
```

### Files to Modify

```
convex/
  schema.ts                    # Add userInvites, artifactAccess tables
  auth.ts                      # Update linking callback

app/src/
  components/artifacts/
    ShareModal.tsx             # Integrate new components
```

### Files to Delete (cleanup)

```
convex/
  sharing.ts                   # Replace entirely with access.ts

  # After verification only:
  # Remove artifactReviewers from schema.ts
```

---

## 5. Implementation Order

1. **Schema** - Add `userInvites` and `artifactAccess` tables to `schema.ts`
2. **Core Backend** - Create `convex/access.ts` with:
   - `grantAccess` mutation
   - `linkUserInvitesToUser` internal mutation
   - `getArtifactReviewers` query
   - `getUserPermission` query
3. **Auth Integration** - Update `auth.ts` callback to use new linking function
4. **Remaining Backend** - Add `revokeAccess`, `resendInvitation`, `recordView`, `sendAccessEmail`
5. **Frontend Utilities** - Create `lib/access.ts` with `deriveReviewerStatus`
6. **Frontend Hooks** - Create `useArtifactAccess`, `useUserPermission`
7. **Frontend Components** - Create `ReviewerRow`, `ReviewerList`, `InviteReviewerForm`
8. **ShareModal Integration** - Wire up new components in ShareModal
9. **Cleanup** - Remove old `sharing.ts`, remove `artifactReviewers` from schema

---

## 6. Validation Checklist

The 12 scenarios from design that must pass:

| # | Scenario | Test |
|---|----------|------|
| 1 | Invite existing user | Creates `artifactAccess` with `userId`, no `userInvites` |
| 2 | Invite new user | Creates `userInvites` + `artifactAccess` with `userInviteId` |
| 3 | Same owner invites same email to multiple artifacts | One `userInvites`, multiple `artifactAccess` records |
| 4 | Different owners invite same email | Separate `userInvites` per owner (privacy) |
| 5 | Pending user signs up | All `userInvites` get `convertedToUserId`, all `artifactAccess` get `userId` + clear `userInviteId` |
| 6 | Resend invitation | `lastSentAt` updated, `sendCount` incremented, email sent |
| 7 | Revoke access (existing user) | `isDeleted=true`, user loses access |
| 8 | Revoke access (pending user) | `isDeleted=true` on access, `userInvites` unchanged |
| 9 | Re-invite after revocation | Un-delete existing record, update `lastSentAt`/`sendCount` |
| 10 | Permission check (critical path) | O(1) lookup via `by_artifact_and_userId` index |
| 11 | "Shared with me" query | Uses `by_userId_and_isDeleted` index |
| 12 | Owner views reviewer list | Combines pending + active via `by_artifact_and_isDeleted` index |
| 13 | Real-time revocation | Reviewer is kicked out immediately when owner revokes access (toast + redirect) |

---

## Notes

- **No migration needed** - We are in dev with no production data
- **Delete old table** - `artifactReviewers` can be removed once new system is verified
- **State derivation** - No status enum; derive from `userId`, `userInviteId`, `isDeleted`, `firstViewedAt`
- **View tracking deferred** - When/how to call `recordView` determined during implementation
