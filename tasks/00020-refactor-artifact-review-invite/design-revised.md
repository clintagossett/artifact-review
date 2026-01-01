# Revised Design: Two-Table Invitation & Access Model

**Task:** 00020 - Refactor and Artifact Review Invite
**Date:** 2025-12-31
**Status:** Draft - Pending Validation

---

## Overview

This design separates **pending users (PII)** from **access grants (no PII)** using two tables.

### Design Principles

1. **PII Isolation** - Personal data (email, name) lives in one table only
2. **Clean References** - Access table uses IDs only, no personal data
3. **Privacy Between Inviters** - Different inviters have separate invite records
4. **No Status Enum** - State derived from data (userId presence, isDeleted, etc.)

---

## Data Model

### Table: `userInvites`

Pending users who don't have accounts yet. **Contains PII.**

```typescript
userInvites: defineTable({
  email: v.string(),                           // PII
  name: v.optional(v.string()),                // PII (parsed from "Name <email>" format)
  createdBy: v.id("users"),                    // Who first invited this email
  // _creationTime provided by Convex
  convertedToUserId: v.optional(v.id("users")),// Set when user signs up
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
  .index("by_email_createdBy", ["email", "createdBy"])  // Unique lookup
  .index("by_email", ["email"])                         // For linking on signup
```

**Uniqueness:** One record per (email, createdBy) pair.

**Why per-inviter?** Privacy. If Alice and Bob both invite luke@..., neither should know the other invited him.

### Table: `artifactAccess`

Access grants linking artifacts to users or pending users. **No PII.**

```typescript
artifactAccess: defineTable({
  artifactId: v.id("artifacts"),

  // One of these is set (mutually exclusive - cleared on linking)
  userId: v.optional(v.id("users")),           // Existing user
  userInviteId: v.optional(v.id("userInvites")),// OR pending user

  // Record creation
  createdBy: v.id("users"),                    // Who granted access
  // _creationTime provided by Convex

  // Invitation tracking
  lastSentAt: v.number(),                      // Equals _creationTime on first send
  sendCount: v.number(),                       // Starts at 1

  // Engagement tracking
  firstViewedAt: v.optional(v.number()),
  lastViewedAt: v.optional(v.number()),

  // Soft delete
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
  .index("by_artifact", ["artifactId", "isDeleted"])
  .index("by_artifact_user", ["artifactId", "userId"])
  .index("by_artifact_userInvite", ["artifactId", "userInviteId"])
  .index("by_user", ["userId", "isDeleted"])
  .index("by_userInvite", ["userInviteId"])
```

---

## Lifecycle

### Creating Access

**Existing user (has account):**
```
1. Owner invites bob@...
2. Lookup user by email → found (userId = X)
3. Create artifactAccess:
   - userId = X
   - userInviteId = null
   - sendCount = 1, lastSentAt = now
4. Send notification email
```

**New user (no account):**
```
1. Owner (Alice) invites luke@...
2. Lookup user by email → not found
3. Lookup userInvites by (email, createdBy=Alice) → not found
4. Create userInvites:
   - email = luke@...
   - createdBy = Alice
5. Create artifactAccess:
   - userId = null
   - userInviteId = new invite ID
   - sendCount = 1, lastSentAt = now
6. Send invitation email
```

**Same owner, same email, different artifact:**
```
1. Alice invites luke@... to Artifact B
2. Lookup userInvites by (email, createdBy=Alice) → found (reuse)
3. Create artifactAccess:
   - userInviteId = existing invite ID
4. Send invitation email
```

### User Signup (Linking)

When a new user signs up, the auth callback triggers linking:

```
1. User signs up with email luke@...
2. New user created with userId = Y

3. Query: userInvites.by_email("luke@...")
   → Returns ALL invites for this email (from any inviter)

4. For each userInvite:
   - Set convertedToUserId = Y

5. For each userInvite, query: artifactAccess.by_userInvite(inviteId)
   → Returns all access records pointing to this invite

6. For each artifactAccess:
   - Set userId = Y
   - Clear userInviteId = null
```

**Result:** All pending invites across all inviters are now linked to the new user.

### Revoking Access

```
1. Owner removes reviewer
2. Set artifactAccess.isDeleted = true, deletedAt = now
3. userInvites unchanged (may be used by other artifacts)
```

### Re-inviting After Revocation

```
1. Owner invites previously-revoked email
2. Lookup existing artifactAccess for (artifact, email)
3. If found and isDeleted = true:
   - Un-delete: isDeleted = false, deletedAt = null
   - Update: lastSentAt = now, sendCount += 1
4. Send invitation email
```

---

## State Derivation

No status enum. State is derived:

| Situation | Data | Derived State |
|-----------|------|---------------|
| Pending (no account) | `userInviteId` set, `userId` null | "Pending" |
| Has access | `userId` set, `isDeleted` false | "Added" |
| Viewed | `userId` set, `firstViewedAt` set | "Viewed" |
| Revoked | `isDeleted` true | "Removed" |

```typescript
function deriveStatus(access: ArtifactAccess): string {
  if (access.isDeleted) return "removed";
  if (!access.userId) return "pending";
  if (access.firstViewedAt) return "viewed";
  return "added";
}
```

---

## Validation Scenarios

_To be validated before implementation._

### Scenario 1: Invite Existing User

```
Input: Owner invites bob@... (Bob has an account)

Expected:
- userInvites: NO record created (Bob already has account)
- artifactAccess: Created with userId = Bob's ID
- Email sent to Bob
```

### Scenario 2: Invite New User

```
Input: Owner (Alice) invites luke@... (no account)

Expected:
- userInvites: Created {email: luke@..., createdBy: Alice}
- artifactAccess: Created with userInviteId (no userId yet)
- Email sent to Luke
```

### Scenario 3: Same Owner Invites Same Email to Multiple Artifacts

```
Input: Alice invites luke@... to Artifact A, then to Artifact B

Expected:
- userInvites: ONE record (reused)
- artifactAccess: TWO records, both pointing to same userInviteId
- Two emails sent (one per artifact)
```

### Scenario 4: Different Owners Invite Same Email

```
Input: Alice invites luke@... to Artifact A
       Bob invites luke@... to Artifact B

Expected:
- userInvites: TWO records (privacy - separate per inviter)
  - {email: luke@..., createdBy: Alice}
  - {email: luke@..., createdBy: Bob}
- artifactAccess: TWO records, each pointing to respective userInviteId
```

### Scenario 5: Pending User Signs Up

```
Input: Luke signs up with luke@...

Expected:
- userInvites: ALL records with email=luke@... get convertedToUserId set
- artifactAccess: ALL records with those userInviteIds get:
  - userId = Luke's new ID
  - userInviteId = cleared (or kept for audit?)
```

### Scenario 6: Resend Invitation

```
Input: Owner clicks "Resend" for pending invite

Expected:
- userInvites: No change
- artifactAccess: lastSentAt updated, sendCount incremented
- Email resent
```

### Scenario 7: Revoke Access (Existing User)

```
Input: Owner removes Bob from Artifact A

Expected:
- artifactAccess: isDeleted = true, deletedAt = now
- Bob can no longer view Artifact A
```

### Scenario 8: Revoke Access (Pending User)

```
Input: Owner removes pending invite for luke@...

Expected:
- artifactAccess: isDeleted = true
- userInvites: unchanged (might be used by other artifacts)
- Luke won't get access if/when they sign up (for this artifact)
```

### Scenario 9: Re-invite After Revocation

```
Input: Owner previously revoked luke@..., now invites again

Expected:
- Option A: Un-delete existing artifactAccess record
- Option B: Create new artifactAccess record
- (Need to decide which approach)
```

### Scenario 10: Permission Check (Critical Path)

```
Input: User tries to view/comment on artifact

Query:
- artifactAccess.by_artifact_user(artifactId, userId)
- Return first where isDeleted = false

Expected: O(1) lookup
```

### Scenario 11: "Shared With Me" Query

```
Input: User wants to see all artifacts they have access to

Query:
- artifactAccess.by_user(userId, isDeleted=false)

Expected: Returns all artifacts user can access
```

### Scenario 12: Owner Views Reviewer List

```
Input: Owner opens share dialog for artifact

Query:
- artifactAccess.by_artifact(artifactId, isDeleted=false)
- For each with userInviteId: fetch userInvites for email/name
- For each with userId: fetch users for display name

Expected: Combined list of pending + active reviewers
```

---

## Decisions Made

1. **Re-invite after revoke:** Un-delete existing record (update lastSentAt, sendCount)
2. **On linking:** Clear `userInviteId`, set `userId` (clean state, no ambiguity)

## Open Questions

1. **View tracking:** How/when do we call the mutation to record firstViewedAt/lastViewedAt?

---

## Migration Path

_TBD after validation scenarios are confirmed._

Current `artifactReviewers` table needs to be migrated to new structure.
