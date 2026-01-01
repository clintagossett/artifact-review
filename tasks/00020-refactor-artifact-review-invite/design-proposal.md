# Design Proposal: Refactored Invitation System

**Task:** 00020 - Refactor and Artifact Review Invite
**Author:** Software Architect
**Date:** 2025-12-31
**Status:** Proposal

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Analysis](#problem-analysis)
3. [Industry Pattern Research](#industry-pattern-research)
4. [Proposed Architecture](#proposed-architecture)
5. [Data Model](#data-model)
6. [State Machine](#state-machine)
7. [UX Flows](#ux-flows)
8. [API Surface](#api-surface)
9. [Edge Cases](#edge-cases)
10. [Migration Path](#migration-path)
11. [Alternatives Considered](#alternatives-considered)
12. [Implementation Phases](#implementation-phases)

---

## Executive Summary

The current invitation system conflates two distinct concepts:
1. **System Invitations** - Inviting someone to join the platform
2. **Document Review Invitations** - Inviting someone to review a specific artifact

This proposal introduces a **two-table architecture** that separates these concerns, enabling:
- Multiple artifact invitations per person
- Proper invitation lifecycle tracking
- Re-send capability for both invitation types
- Clear "accepted by viewing" semantics for document invitations

**Key Insight:** A reviewer record should track the *relationship* between a user and an artifact, while a separate invitation record tracks the *invitation lifecycle*.

---

## Problem Analysis

### Current State

The current `artifactReviewers` table serves dual purposes:

```typescript
// Current schema (simplified)
artifactReviewers: {
  artifactId: Id<"artifacts">,
  email: string,
  userId: Id<"users"> | null,  // null = pending system invite
  status: "pending" | "accepted",  // Conflates system + doc invite status
  invitedBy: Id<"users">,
  invitedAt: number,
}
```

**Problems with current design:**

| Issue | Impact |
|-------|--------|
| **Status conflation** | `status: "pending"` means "user hasn't created account" but could also mean "user hasn't viewed artifact" |
| **No re-send tracking** | No way to know when an invitation was last sent |
| **Single invitation per email** | Same email can only have one invitation per artifact (no re-invite after revocation) |
| **No first-view tracking** | Cannot determine if a reviewer has actually engaged with the artifact |
| **userId ambiguity** | `userId: null` means "no account yet" but also controls access logic |

### Requirements Analysis

From the problem statement:

| Requirement | Current Support | Proposed Solution |
|-------------|-----------------|-------------------|
| Multiple artifacts per invitee | Partial (separate records) | Full (via invitations table) |
| System vs doc invites | Conflated | Separate tables |
| Existing user invites | Yes | Yes (improved flow) |
| New user invites | Yes (creates 2 implicit invites) | Explicit tracking |
| Pending state clarity | Unclear | Clear state machine |
| Re-send capability | No tracking | Yes, with timestamps |

---

## Industry Pattern Research

### Google Docs Sharing

**Model:** Permissions are first-class, invitations are transient
- Sharing creates a permission record immediately
- Email notifications are fire-and-forget
- "Pending" state exists only for users not in Google workspace
- Re-sharing just sends another notification

**Takeaway:** Separate permission from notification.

### Slack Workspace Invites

**Model:** Two-tier invitation system
- Workspace invitations (system level) are managed by admins
- Channel invitations (resource level) are automatic for workspace members
- Pending invitations have expiration and resend capability
- Clear distinction between "invited" and "member" states

**Takeaway:** System invites and resource invites are fundamentally different.

### GitHub Collaborators

**Model:** Invitation-first, permission-second
- Adding a collaborator creates a pending invitation
- User must accept to get access
- Invitations expire after 7 days
- Owner can resend or revoke pending invitations
- Once accepted, invitation becomes a "collaboration" record

**Takeaway:** Explicit acceptance improves security and UX clarity.

### Figma File Sharing

**Model:** Link-based + explicit invites
- Public links grant view access
- Explicit invites grant edit/comment permissions
- Invites sent to non-users create placeholder accounts
- User claims account on first access

**Takeaway:** Placeholder accounts bridge the gap between invite and signup.

### Synthesis: Best Practices

1. **Separate invitation lifecycle from permission state**
2. **Track invitation send history for re-send capability**
3. **Use explicit acceptance or implicit first-view as "accepted"**
4. **Handle existing vs new users differently**
5. **Consider expiration for security-sensitive invites**

---

## Proposed Architecture

### Overview

```
                          ┌─────────────────────────────────────┐
                          │           Platform Users            │
                          │  (users table from Convex Auth)     │
                          └────────────────┬────────────────────┘
                                           │
                   ┌───────────────────────┼───────────────────────┐
                   │                       │                       │
                   ▼                       ▼                       ▼
    ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
    │   systemInvites      │  │   artifactReviewers  │  │    reviewInvites     │
    │  (platform signup)   │  │   (permission/role)  │  │  (doc invite state)  │
    └──────────────────────┘  └──────────────────────┘  └──────────────────────┘
              │                         │                         │
              │                         │                         │
              ▼                         ▼                         ▼
    For users who don't       The permission record      Tracks invitation
    have an account yet       (now always has userId     lifecycle for each
                             once linked)                artifact invite
```

### Design Decisions

**Decision 1: Three-table architecture**
- `systemInvites` - Tracks platform signup invitations
- `artifactReviewers` - Stores permission/role (always has userId when active)
- `reviewInvites` - Tracks document invitation lifecycle

**Decision 2: "Accepted by viewing" semantics**
- A review invitation is marked "viewed" when the invitee first accesses the artifact
- This is separate from system invite acceptance (account creation)

**Decision 3: Email as the linking key**
- Consistent with ADR 0010
- System invites and review invites linked via email
- When user signs up, pending invites are linked via email match

---

## Data Model

### Table: systemInvites (NEW)

Platform-level invitations for users who don't have accounts.

| Field | Type | Validator | Notes |
|-------|------|-----------|-------|
| _id | Id | v.id("systemInvites") | Auto |
| _creationTime | number | v.number() | Auto |
| email | string | v.string() | Normalized lowercase, unique |
| invitedBy | Id<users> | v.id("users") | Who sent the invite |
| status | literal | v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")) | State |
| invitedAt | number | v.number() | First invitation timestamp |
| lastSentAt | number | v.number() | Last email send timestamp |
| sendCount | number | v.number() | Number of times email sent |
| acceptedAt | number? | v.optional(v.number()) | When user created account |
| userId | Id<users>? | v.optional(v.id("users")) | Linked user after signup |
| expiresAt | number? | v.optional(v.number()) | Optional expiration |
| isDeleted | boolean | v.boolean() | Soft delete |
| deletedAt | number? | v.optional(v.number()) | Deletion timestamp |

**Indexes:**
- `by_email` - Lookup by email
- `by_status` - List pending/expired invites
- `by_user` - Find invite for a user

### Table: artifactReviewers (MODIFIED)

Permission record linking users to artifacts. **Now always has userId when active.**

| Field | Type | Validator | Notes |
|-------|------|-----------|-------|
| _id | Id | v.id("artifactReviewers") | Auto |
| _creationTime | number | v.number() | Auto |
| artifactId | Id<artifacts> | v.id("artifacts") | The artifact |
| userId | Id<users> | v.id("users") | **Now required** |
| role | literal | v.literal("can-comment") | Permission level |
| addedBy | Id<users> | v.id("users") | Who granted access |
| addedAt | number | v.number() | When access granted |
| firstViewedAt | number? | v.optional(v.number()) | First artifact view |
| lastViewedAt | number? | v.optional(v.number()) | Most recent view |
| isDeleted | boolean | v.boolean() | Soft delete (revoked) |
| deletedAt | number? | v.optional(v.number()) | Revocation timestamp |

**Changes from current:**
- `userId` is now **required** (not nullable)
- Removed `email` (moved to reviewInvites)
- Removed `status` (replaced by firstViewedAt tracking)
- Added `firstViewedAt` and `lastViewedAt` for engagement tracking
- Renamed `invitedBy` to `addedBy` (clearer semantics)

**Indexes:**
- `by_artifact` - List reviewers for an artifact
- `by_artifact_active` - Active reviewers only
- `by_user` - Artifacts user has access to
- `by_user_artifact` - Unique constraint check

### Table: reviewInvites (NEW)

Tracks the invitation lifecycle for each artifact invite.

| Field | Type | Validator | Notes |
|-------|------|-----------|-------|
| _id | Id | v.id("reviewInvites") | Auto |
| _creationTime | number | v.number() | Auto |
| artifactId | Id<artifacts> | v.id("artifacts") | Target artifact |
| email | string | v.string() | Recipient email (normalized) |
| invitedBy | Id<users> | v.id("users") | Who sent the invite |
| status | literal | v.union(v.literal("pending"), v.literal("linked"), v.literal("expired"), v.literal("revoked")) | State |
| invitedAt | number | v.number() | First invitation timestamp |
| lastSentAt | number | v.number() | Last email send timestamp |
| sendCount | number | v.number() | Email send count |
| linkedAt | number? | v.optional(v.number()) | When converted to artifactReviewer |
| reviewerId | Id<artifactReviewers>? | v.optional(v.id("artifactReviewers")) | Linked reviewer record |
| expiresAt | number? | v.optional(v.number()) | Optional expiration |
| isDeleted | boolean | v.boolean() | Soft delete |
| deletedAt | number? | v.optional(v.number()) | Deletion timestamp |

**Indexes:**
- `by_artifact` - All invites for an artifact
- `by_artifact_email` - Lookup by artifact + email
- `by_email` - All invites for an email
- `by_status` - Filter by status

### Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌──────────────┐         ┌──────────────────┐         ┌──────────────┐   │
│   │   users      │◄────────┤ artifactReviewers│─────────►│  artifacts   │   │
│   │  (account)   │ userId  │   (permission)   │artifactId│              │   │
│   └──────────────┘         └──────────────────┘         └──────────────┘   │
│          ▲                          ▲                                       │
│          │                          │                                       │
│          │ userId (optional)        │ reviewerId (optional)                │
│          │                          │                                       │
│   ┌──────────────┐         ┌──────────────────┐                            │
│   │ systemInvites│         │   reviewInvites  │                            │
│   │ (platform)   │         │   (document)     │                            │
│   └──────────────┘         └──────────────────┘                            │
│          │                          │                                       │
│          └──────────────────────────┘                                       │
│                      │                                                      │
│                      ▼                                                      │
│               email (linking key)                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## State Machine

### System Invite States

```
                    ┌─────────────┐
          invite    │             │
    ────────────────►   pending   │
                    │             │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ accepted │  │ expired  │  │ (resend) │
       │          │  │          │  │  pending │
       └──────────┘  └──────────┘  └──────────┘
              │
              │ user created
              ▼
       ┌──────────┐
       │  users   │
       │  table   │
       └──────────┘
```

**Transitions:**
- `pending` -> `accepted`: User creates account with matching email
- `pending` -> `expired`: Expiration time reached (optional feature)
- `pending` -> `pending`: Re-send (updates lastSentAt, increments sendCount)

### Review Invite States

```
                    ┌─────────────┐
          invite    │             │
    ────────────────►   pending   │
                    │             │
                    └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────┐        ┌──────────┐        ┌──────────┐
│  linked  │        │  revoked │        │  expired │
│          │        │          │        │          │
└────┬─────┘        └──────────┘        └──────────┘
     │
     │ creates
     ▼
┌──────────────────┐
│ artifactReviewers│
│    (active)      │
└──────────────────┘
```

**Transitions:**
- `pending` -> `linked`: User exists or signs up, reviewer record created
- `pending` -> `revoked`: Owner revokes before user accepts
- `pending` -> `expired`: Expiration time reached
- `pending` -> `pending`: Re-send (updates lastSentAt, increments sendCount)

### Combined Flow: New User Invited to Review

```
1. Owner invites alice@example.com to artifact A

   ┌───────────────────────┐     ┌───────────────────────┐
   │ systemInvites         │     │ reviewInvites         │
   │ email: alice@...      │     │ artifactId: A         │
   │ status: pending       │     │ email: alice@...      │
   └───────────────────────┘     │ status: pending       │
                                 └───────────────────────┘

2. Owner invites alice@example.com to artifact B

   ┌───────────────────────┐     ┌───────────────────────┐
   │ systemInvites         │     │ reviewInvites (A)     │
   │ email: alice@...      │     │ status: pending       │
   │ status: pending       │     ├───────────────────────┤
   │ (same record)         │     │ reviewInvites (B)     │
   └───────────────────────┘     │ status: pending       │
                                 └───────────────────────┘

3. Alice signs up with alice@example.com

   ┌───────────────────────┐     ┌───────────────────────┐
   │ systemInvites         │     │ reviewInvites (A)     │
   │ status: accepted      │     │ status: linked        │
   │ userId: alice_user_id │     │ reviewerId: rev_A     │
   └───────────────────────┘     ├───────────────────────┤
                                 │ reviewInvites (B)     │
   ┌───────────────────────┐     │ status: linked        │
   │ users                 │     │ reviewerId: rev_B     │
   │ _id: alice_user_id    │     └───────────────────────┘
   └───────────────────────┘
                                 ┌───────────────────────┐
                                 │ artifactReviewers (A) │
                                 │ userId: alice_user_id │
                                 │ firstViewedAt: null   │
                                 ├───────────────────────┤
                                 │ artifactReviewers (B) │
                                 │ userId: alice_user_id │
                                 │ firstViewedAt: null   │
                                 └───────────────────────┘

4. Alice views artifact A

   ┌───────────────────────┐
   │ artifactReviewers (A) │
   │ firstViewedAt: now()  │
   └───────────────────────┘
```

---

## UX Flows

### Flow 1: Invite Existing User

```
Owner clicks "Invite Reviewer"
            │
            ▼
    ┌───────────────────┐
    │ Enter email       │
    │ bob@example.com   │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ System checks:    │
    │ User exists?      │
    └─────────┬─────────┘
              │ YES
              ▼
    ┌───────────────────────────────────────┐
    │ 1. Create artifactReviewers record    │
    │ 2. Create reviewInvites (status:linked)│
    │ 3. Send notification email            │
    └─────────┬─────────────────────────────┘
              │
              ▼
    ┌───────────────────┐
    │ UI shows:         │
    │ "Bob added as     │
    │  reviewer"        │
    │ Status: Added     │
    └───────────────────┘
```

### Flow 2: Invite New User

```
Owner clicks "Invite Reviewer"
            │
            ▼
    ┌───────────────────┐
    │ Enter email       │
    │ alice@example.com │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ System checks:    │
    │ User exists?      │
    └─────────┬─────────┘
              │ NO
              ▼
    ┌───────────────────────────────────────┐
    │ 1. Create/update systemInvites record │
    │ 2. Create reviewInvites (pending)     │
    │ 3. Send invitation email              │
    └─────────┬─────────────────────────────┘
              │
              ▼
    ┌───────────────────┐
    │ UI shows:         │
    │ "Invitation sent  │
    │  to Alice"        │
    │ Status: Pending   │
    └───────────────────┘
```

### Flow 3: New User Accepts Invitation

```
Alice clicks email link
            │
            ▼
    ┌───────────────────┐
    │ /a/{shareToken}   │
    │ (artifact viewer) │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ Not logged in     │
    │ Show: "Sign in    │
    │ to comment"       │
    └─────────┬─────────┘
              │
    Alice clicks "Sign in"
              │
              ▼
    ┌───────────────────┐
    │ Magic link flow   │
    │ (alice@email.com) │
    └─────────┬─────────┘
              │
    Auth callback fires
              │
              ▼
    ┌───────────────────────────────────────┐
    │ 1. Create user account                │
    │ 2. Link systemInvites -> accepted     │
    │ 3. For each reviewInvites (pending):  │
    │    - Create artifactReviewers record  │
    │    - Update reviewInvites -> linked   │
    └─────────┬─────────────────────────────┘
              │
    Redirect to /a/{shareToken}
              │
              ▼
    ┌───────────────────┐
    │ Alice can now     │
    │ comment on        │
    │ artifact          │
    └───────────────────┘
```

### Flow 4: Re-send Invitation

```
Owner views reviewers list
            │
            ▼
    ┌─────────────────────────────────┐
    │ Reviewers:                      │
    │ - bob@ex.com     [Added]        │
    │ - alice@ex.com   [Pending]      │
    │                  [Resend][Remove]│
    └─────────────────┬───────────────┘
              │
    Owner clicks "Resend"
              │
              ▼
    ┌───────────────────────────────────────┐
    │ 1. Update reviewInvites.lastSentAt    │
    │ 2. Increment reviewInvites.sendCount  │
    │ 3. Send invitation email              │
    └─────────┬─────────────────────────────┘
              │
              ▼
    ┌───────────────────┐
    │ Toast: "Invite    │
    │ resent to Alice"  │
    │                   │
    │ UI shows:         │
    │ "Sent 2x"         │
    └───────────────────┘
```

### Flow 5: View Pending Invitations (Invitee)

```
Alice logs in (has pending invites)
            │
            ▼
    ┌───────────────────┐
    │ Dashboard shows:  │
    │                   │
    │ "You have 2 new   │
    │  artifacts to     │
    │  review"          │
    └─────────┬─────────┘
              │
              ▼
    ┌─────────────────────────────────┐
    │ Pending Reviews:                │
    │ - "Q1 Strategy" from Bob        │
    │   [View] [Dismiss]              │
    │ - "Roadmap 2025" from Carol     │
    │   [View] [Dismiss]              │
    └─────────────────────────────────┘
```

### ASCII Component Mockups

**Share Modal (Owner View):**
```
┌────────────────────────────────────────────────────┐
│ Share "Q1 Strategy"                          [X]   │
├────────────────────────────────────────────────────┤
│                                                    │
│ Add reviewer                                       │
│ ┌────────────────────────────────┐ ┌──────────┐   │
│ │ Enter email address...          │ │  Invite  │   │
│ └────────────────────────────────┘ └──────────┘   │
│                                                    │
│ ─────────────────────────────────────────────────  │
│                                                    │
│ Current reviewers                                  │
│                                                    │
│ ┌────────────────────────────────────────────────┐ │
│ │ bob@example.com                                │ │
│ │ Status: Added (viewed Jan 15)      [Remove]    │ │
│ ├────────────────────────────────────────────────┤ │
│ │ alice@example.com                              │ │
│ │ Status: Pending (sent 2x)    [Resend][Remove]  │ │
│ ├────────────────────────────────────────────────┤ │
│ │ carol@example.com                              │ │
│ │ Status: Added (not viewed)          [Remove]   │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ ─────────────────────────────────────────────────  │
│                                                    │
│ Share link                                         │
│ ┌────────────────────────────────────┐ ┌───────┐  │
│ │ https://app.../a/abc123xy          │ │ Copy  │  │
│ └────────────────────────────────────┘ └───────┘  │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Reviewer Status Badges:**
```
┌─────────────────────────────────────────────────────┐
│ Status Types:                                       │
│                                                     │
│ ┌─────────┐  User exists, reviewer record created,  │
│ │ Added   │  has NOT viewed artifact yet            │
│ └─────────┘                                         │
│                                                     │
│ ┌─────────┐  Invitation sent, user does NOT have    │
│ │ Pending │  an account yet (can resend)            │
│ └─────────┘                                         │
│                                                     │
│ ┌─────────┐  User exists, reviewer record created,  │
│ │ Viewed  │  HAS viewed artifact (shows date)       │
│ └─────────┘                                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## API Surface

### Queries

#### getReviewers

Get all reviewers and pending invites for an artifact.

- **Path:** `api.sharing.getReviewers`
- **Args:** `{ artifactId: v.id("artifacts") }`
- **Returns:**
```typescript
v.array(v.object({
  id: v.string(),  // reviewerId or inviteId
  type: v.union(v.literal("reviewer"), v.literal("invite")),
  email: v.string(),
  displayName: v.optional(v.string()),
  status: v.union(
    v.literal("added"),      // Has account, reviewer record exists
    v.literal("pending"),    // No account yet
    v.literal("viewed")      // Has account and has viewed
  ),
  firstViewedAt: v.optional(v.number()),
  lastSentAt: v.optional(v.number()),
  sendCount: v.optional(v.number()),
  addedAt: v.number(),
}))
```
- **Auth:** Required, owner only

#### getMyPendingReviews

Get artifacts the current user has been invited to but hasn't viewed yet.

- **Path:** `api.sharing.getMyPendingReviews`
- **Args:** `{}`
- **Returns:**
```typescript
v.array(v.object({
  artifactId: v.id("artifacts"),
  artifactTitle: v.string(),
  invitedBy: v.object({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }),
  invitedAt: v.number(),
}))
```
- **Auth:** Required

### Mutations

#### inviteReviewer

Invite a user to review an artifact.

- **Path:** `api.sharing.inviteReviewer`
- **Args:**
```typescript
{
  artifactId: v.id("artifacts"),
  email: v.string(),
}
```
- **Returns:** `v.object({ type: v.union(v.literal("added"), v.literal("invited")), id: v.string() })`
- **Auth:** Required, owner only
- **Behavior:**
  - If user exists: Create `artifactReviewers` + `reviewInvites` (linked)
  - If user doesn't exist: Create `systemInvites` (if new) + `reviewInvites` (pending)
  - Send notification email

#### resendInvitation

Resend an invitation email.

- **Path:** `api.sharing.resendInvitation`
- **Args:**
```typescript
{
  inviteId: v.id("reviewInvites"),
}
```
- **Returns:** `v.null()`
- **Auth:** Required, owner only
- **Behavior:**
  - Verify invite is still pending
  - Update `lastSentAt` and increment `sendCount`
  - Send invitation email

#### removeReviewer

Remove a reviewer or revoke a pending invitation.

- **Path:** `api.sharing.removeReviewer`
- **Args:**
```typescript
{
  // One of these is required
  reviewerId: v.optional(v.id("artifactReviewers")),
  inviteId: v.optional(v.id("reviewInvites")),
}
```
- **Returns:** `v.null()`
- **Auth:** Required, owner only
- **Behavior:**
  - If `reviewerId`: Soft-delete the reviewer record
  - If `inviteId`: Set invite status to "revoked"

#### recordArtifactView (Internal)

Record that a reviewer viewed an artifact.

- **Path:** `internal.sharing.recordArtifactView`
- **Args:**
```typescript
{
  artifactId: v.id("artifacts"),
  userId: v.id("users"),
}
```
- **Returns:** `v.null()`
- **Behavior:**
  - Find reviewer record
  - Set `firstViewedAt` if null
  - Update `lastViewedAt`

#### linkPendingInvitations (Internal)

Link pending invitations when a user signs up. **Modified from current implementation.**

- **Path:** `internal.sharing.linkPendingInvitations`
- **Args:**
```typescript
{
  userId: v.id("users"),
  email: v.string(),
}
```
- **Returns:** `v.null()`
- **Behavior:**
  1. Find `systemInvites` with matching email, update to "accepted"
  2. Find all `reviewInvites` with matching email and status "pending"
  3. For each: Create `artifactReviewers` record, update invite to "linked"

---

## Edge Cases

### Edge Case 1: Invite Same Email Twice

**Scenario:** Owner invites alice@example.com, then tries to invite again.

**Behavior:**
- Check for existing non-revoked `reviewInvites` for this artifact + email
- If found: Offer "Resend" instead of creating duplicate
- Error message: "This email has already been invited. Would you like to resend?"

### Edge Case 2: Revoke Then Re-invite

**Scenario:** Owner invites alice, revokes, then invites again.

**Behavior:**
- Allow creating new `reviewInvites` record
- The old invite remains with status "revoked"
- Fresh invitation flow starts

### Edge Case 3: User Changes Email After Invite

**Scenario:** Alice is invited as alice@company.com but signs up with alice@gmail.com.

**Behavior:**
- System invite and review invites remain pending
- User would need to be re-invited with correct email
- Consider: Allow owner to "reassign" invitation to different email (future feature)

### Edge Case 4: Concurrent Invites from Multiple Owners

**Scenario:** Bob and Carol both invite alice@example.com to different artifacts simultaneously.

**Behavior:**
- Each creates their own `reviewInvites` record
- Both can proceed independently
- Only one `systemInvites` record created (idempotent)

### Edge Case 5: Owner Removes Self as Reviewer

**Scenario:** Owner is also listed as a reviewer (shouldn't happen but could via data issue).

**Behavior:**
- Owner permission takes precedence
- Cannot "remove" owner from their own artifact
- Reviewer record for owner should not exist

### Edge Case 6: Artifact Deleted with Pending Invites

**Scenario:** Owner deletes artifact while invitations are pending.

**Behavior:**
- `reviewInvites` soft-deleted along with artifact (cascade)
- No need to send notification to pending invitees
- If invitee clicks old email link: Show "Artifact not found"

### Edge Case 7: Re-send Limit

**Scenario:** Owner keeps spamming resend.

**Behavior:**
- Track `sendCount` on `reviewInvites`
- Consider: Rate limit or warning after N resends (e.g., 5)
- Consider: Cooldown period between resends (e.g., 1 hour)

---

## Migration Path

### Phase 1: Add New Tables (Non-Breaking)

1. Add `systemInvites` table to schema
2. Add `reviewInvites` table to schema
3. Add new fields to `artifactReviewers` (`firstViewedAt`, `lastViewedAt`)
4. Deploy schema changes

### Phase 2: Dual-Write Migration

1. Modify `inviteReviewer` to write to both old and new structures
2. Create migration script to backfill:
   - Create `reviewInvites` for existing `artifactReviewers`
   - Create `systemInvites` for pending invitations (userId is null)

```typescript
// Migration script (one-time)
export const migrateInvitesToNewSchema = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    let migrated = 0;

    // Get all existing reviewer records
    const reviewers = await ctx.db.query("artifactReviewers").collect();

    for (const reviewer of reviewers) {
      // Check if reviewInvite already exists
      const existing = await ctx.db
        .query("reviewInvites")
        .withIndex("by_artifact_email", (q) =>
          q.eq("artifactId", reviewer.artifactId).eq("email", reviewer.email)
        )
        .first();

      if (existing) continue;

      // Create reviewInvites record
      await ctx.db.insert("reviewInvites", {
        artifactId: reviewer.artifactId,
        email: reviewer.email,
        invitedBy: reviewer.invitedBy,
        status: reviewer.userId ? "linked" : "pending",
        invitedAt: reviewer.invitedAt,
        lastSentAt: reviewer.invitedAt,
        sendCount: 1,
        linkedAt: reviewer.userId ? reviewer.invitedAt : undefined,
        reviewerId: reviewer.userId ? reviewer._id : undefined,
        isDeleted: reviewer.isDeleted,
        deletedAt: reviewer.deletedAt,
      });

      // Create systemInvites if pending
      if (!reviewer.userId) {
        const existingSystemInvite = await ctx.db
          .query("systemInvites")
          .withIndex("by_email", (q) => q.eq("email", reviewer.email))
          .first();

        if (!existingSystemInvite) {
          await ctx.db.insert("systemInvites", {
            email: reviewer.email,
            invitedBy: reviewer.invitedBy,
            status: "pending",
            invitedAt: reviewer.invitedAt,
            lastSentAt: reviewer.invitedAt,
            sendCount: 1,
            isDeleted: false,
          });
        }
      }

      migrated++;
    }

    return migrated;
  },
});
```

### Phase 3: Switch to New Logic

1. Update `inviteReviewer` to use new tables
2. Update `getReviewers` to read from both sources
3. Update auth callback to use new linking logic
4. Update permission checks

### Phase 4: Cleanup (Optional)

1. Remove deprecated fields from `artifactReviewers`
2. Update all queries to use new structure only
3. Consider removing `email` from `artifactReviewers` (now in `reviewInvites`)

### Rollback Plan

- Phase 1-2: Simply revert schema, no data loss
- Phase 3: Keep old mutation logic behind feature flag, revert flag
- Phase 4: More complex, requires re-adding deprecated fields

---

## Alternatives Considered

### Alternative A: Single Table with Status Enum

**Approach:** Keep one `artifactReviewers` table but add more statuses.

```typescript
status: v.union(
  v.literal("pending_system"),    // User doesn't have account
  v.literal("pending_document"),  // User has account, hasn't viewed
  v.literal("viewed"),            // User has viewed
  v.literal("revoked"),           // Access revoked
)
```

**Pros:**
- Simpler schema, fewer tables
- Easier queries

**Cons:**
- Status enum grows over time
- Loses send history tracking
- Hard to model multiple invitations to same email
- Conflates system and document concepts

**Decision:** Rejected - violates separation of concerns

### Alternative B: Invitation-Only Model

**Approach:** No `artifactReviewers` table, just invitations with permissions.

```typescript
reviewInvites: {
  ...inviteFields,
  permission: v.literal("can-comment"),
  viewedAt: v.optional(v.number()),
}
```

**Pros:**
- Single source of truth for permissions
- Simpler mental model

**Cons:**
- Harder to query "who has access to this artifact"
- Permission logic mixed with invitation lifecycle
- No separation between "access granted" and "invitation sent"

**Decision:** Rejected - permissions should be explicit, not derived

### Alternative C: Event Sourcing

**Approach:** Store invitation events, derive current state.

```typescript
invitationEvents: {
  type: v.union(
    v.literal("invited"),
    v.literal("resent"),
    v.literal("accepted"),
    v.literal("revoked"),
    v.literal("viewed"),
  ),
  artifactId: v.id("artifacts"),
  email: v.string(),
  timestamp: v.number(),
  metadata: v.any(),
}
```

**Pros:**
- Complete audit trail
- Flexible for future requirements
- Can rebuild any state

**Cons:**
- Complex queries for current state
- Overkill for MVP
- Performance concerns at scale

**Decision:** Rejected - too complex for current needs, can migrate later if needed

---

## Implementation Phases

### Phase 1: Schema and Internal Mutations (1-2 days)

**Scope:**
- Add new tables to schema
- Implement internal mutations for linking
- Update auth callback
- Unit tests for state transitions

**Deliverables:**
- Updated `convex/schema.ts`
- New `convex/invitations.ts` (or extend `convex/sharing.ts`)
- Tests for invitation lifecycle

### Phase 2: Public API (1-2 days)

**Scope:**
- Update `inviteReviewer` mutation
- Implement `resendInvitation` mutation
- Update `getReviewers` query
- Implement `removeReviewer` for both types

**Deliverables:**
- Updated public API
- API tests

### Phase 3: View Tracking (1 day)

**Scope:**
- Implement `recordArtifactView`
- Hook into artifact viewer
- Update `getReviewers` to include view status

**Deliverables:**
- View tracking working
- Integration tests

### Phase 4: Frontend Updates (2-3 days)

**Scope:**
- Update ShareModal UI
- Add resend button
- Add view status display
- Add pending reviews dashboard

**Deliverables:**
- Updated ShareModal
- Pending reviews component
- E2E tests

### Phase 5: Migration and Cleanup (1 day)

**Scope:**
- Run migration script
- Verify data integrity
- Remove deprecated fields (optional)

**Deliverables:**
- Migrated data
- Cleanup PR

**Total Estimated Effort:** 6-9 days

---

## Appendix: ShadCN Components Required

| Component | Purpose | Customization |
|-----------|---------|---------------|
| Dialog | ShareModal container | None |
| Input | Email input | With Label |
| Button | Invite, Resend, Remove | Variants: default, outline, ghost |
| Badge | Status display | Custom colors for states |
| Table | Reviewer list | With actions column |
| Toast | Success/error feedback | None |
| Dropdown | Remove confirmation | DropdownMenu |
| Tooltip | Status explanation | None |
| Card | Pending reviews list | With actions |
| Skeleton | Loading states | None |

---

## References

- **ADR 0010:** Reviewer Invitation Account Linking (predecessor)
- **ADR 0001:** Authentication Provider
- **ADR 0004:** Email Strategy
- **Task 00011:** Present Artifact Version for Commenting
- **Current Schema:** `app/convex/schema.ts`
- **Current Sharing Code:** `app/convex/sharing.ts`
