# Design Challenge: Single-Table vs Three-Table Architecture

**Task:** 00020 - Refactor and Artifact Review Invite
**Author:** Software Architect
**Date:** 2025-12-31
**Status:** Analysis

---

## The Proposal Under Scrutiny

The user proposes a **single-table design** where `reviewInvites` handles everything:

```typescript
reviewInvites: {
  artifactId: Id<"artifacts">,
  email: string,
  permission: "can-comment",        // Permission stored here
  userId?: Id<"users">,             // Points to user when linked
  systemInviteId?: Id<"systemInvites">,  // Points to system invite
  status: "pending" | "linked" | "viewed" | "revoked",
  invitedAt: number,
  lastSentAt: number,
  sendCount: number,
  firstViewedAt?: number,
  lastViewedAt?: number,
  // ... lifecycle tracking
}
```

This would replace both `artifactReviewers` (permissions) and `reviewInvites` (invitation lifecycle) from the three-table proposal.

---

## 1. What Makes This Proposal Attractive

### Simplicity of Mental Model

The single-table approach is immediately intuitive: "An invitation contains everything about the relationship between a person and an artifact." This matches how a non-technical stakeholder would describe the feature.

### Fewer Joins and Cross-References

With three tables, getting full invitation context requires understanding relationships:
- `reviewInvites` -> `artifactReviewers` (via `reviewerId`)
- `reviewInvites` -> `systemInvites` (via email)
- `artifactReviewers` -> `users` (via `userId`)

With one table, the data is co-located. A single read gives you everything.

### Simpler CRUD Operations

**Three-table invite flow:**
```typescript
// When existing user is invited:
1. Create artifactReviewers record
2. Create reviewInvites record (status: "linked")
3. Set reviewInvites.reviewerId = new reviewer ID
```

**Single-table invite flow:**
```typescript
// When existing user is invited:
1. Create reviewInvites record (with userId, status: "linked")
```

Half the writes. Half the code. Half the potential for bugs.

### No Orphaned Records

With three tables, you can have consistency issues:
- A `reviewInvites` with no corresponding `artifactReviewers`
- An `artifactReviewers` record with no corresponding `reviewInvites`

Single-table design is atomic - the record either exists or it doesn't.

### Lower Cognitive Load for New Developers

A developer joining the project sees one table for review access. Simple. The three-table design requires understanding why permissions and invitations are separate concepts.

---

## 2. The Problems This Creates

### Problem 1: Permission Checks Become Expensive

**The Critical Query:** "Does user X have access to artifact Y?"

This query runs on every artifact view, every comment submission, every file serve. It must be fast.

**Three-table approach:**
```typescript
// O(1) lookup via compound index
const reviewer = await ctx.db
  .query("artifactReviewers")
  .withIndex("by_user_artifact", (q) =>
    q.eq("userId", userId).eq("artifactId", artifactId)
  )
  .first();

return reviewer && !reviewer.isDeleted;
```

**Single-table approach:**
```typescript
// Problem: The table is keyed by invitation, not by user+artifact
// You need to query by email OR userId

// If user has an account:
const inviteByUser = await ctx.db
  .query("reviewInvites")
  .withIndex("by_artifact_user", (q) =>
    q.eq("artifactId", artifactId).eq("userId", userId)
  )
  .first();

// But wait - what if they were invited before they had an account?
// The record might have email but no userId... except we're supposed
// to link them. But can we guarantee that linking happened?
```

The fundamental issue: **Invitations are keyed by email (identity before account), but permissions are queried by userId (identity after account).**

When these live in the same record, you need indexes for both access patterns, and you need to guarantee perfect data linking.

### Problem 2: The "Revoke and Re-invite" Paradox

**Scenario:** Alice is invited, revoked, then invited again.

**Three-table approach:**
```
reviewInvites:
  - id: ri1, status: "revoked", email: alice@...
  - id: ri2, status: "pending", email: alice@...

artifactReviewers:
  - id: ar1, isDeleted: true   (from first invite)
  - id: ar2, isDeleted: false  (from second invite)
```

The history is preserved. We can answer: "How many times has Alice been invited? When was she revoked? When was she re-invited?"

**Single-table approach:**
```
reviewInvites:
  - id: ri1, status: "revoked", email: alice@...
  - id: ri2, status: "pending", email: alice@...
```

Same structure... but now we have two records for the same email+artifact. Which one determines permission? The one with `status: "linked"` that is not deleted? What if she's revoked from one and pending on another?

You need query logic like:
```typescript
// Find the "current" invitation for permission checking
const currentInvite = await ctx.db
  .query("reviewInvites")
  .withIndex("by_artifact_email", (q) =>
    q.eq("artifactId", artifactId).eq("email", email)
  )
  .filter((q) => q.neq(q.field("status"), "revoked"))
  .order("desc")  // Most recent
  .first();
```

**Wait - we can't use `filter()` in Convex!** This violates our core Convex rules.

You'd need to model this differently, perhaps with a `currentInviteId` field on... but on what table? We don't have a permission table.

### Problem 3: Permission Changes Without Re-invitation

**Future requirement:** "Change Alice from 'can-comment' to 'can-edit'."

**Three-table approach:**
```typescript
// Simple patch on the permission record
await ctx.db.patch(reviewerId, { role: "can-edit" });
// The invitation record remains untouched - that was about the invite, not permission
```

**Single-table approach:**
```typescript
// Patch the invitation?
await ctx.db.patch(inviteId, { permission: "can-edit" });
// But this is an "invitation" - semantically, we're changing a permission, not re-inviting
// The lastSentAt, sendCount, invitedAt fields make no sense for a permission change
```

The single table conflates two lifecycles:
1. **Invitation lifecycle:** pending -> linked -> viewed (or revoked)
2. **Permission lifecycle:** can-comment -> can-edit -> removed

These can evolve independently. Merging them forces awkward semantics.

### Problem 4: Index Explosion

**Indexes needed for three-table design:**

`artifactReviewers`:
- `by_artifact` - List reviewers for artifact
- `by_user` - List artifacts user can access
- `by_user_artifact` - Permission check (compound)
- `by_artifact_active` - Active reviewers only

`reviewInvites`:
- `by_artifact` - All invites for artifact
- `by_email` - Invites for email (for linking)
- `by_artifact_email` - Check for duplicate invite

**Indexes needed for single-table design:**

`reviewInvites`:
- `by_artifact` - All invites for artifact
- `by_artifact_active` - Active invites only
- `by_email` - For linking on signup
- `by_artifact_email` - Check for duplicate
- `by_userId` - Find invites for a user
- `by_artifact_userId` - Permission check for logged-in users
- `by_artifact_userId_active` - Active permission check
- `by_status` - Find pending/linked/revoked

You actually end up with MORE indexes because you're serving two different access patterns with one table.

### Problem 5: Audit Trail Confusion

**Question:** "When did Alice gain access to this artifact?"

**Three-table approach:**
```
artifactReviewers.addedAt = when they got permission
reviewInvites.linkedAt = when invitation was linked
reviewInvites.invitedAt = when they were first invited
```

Clear separation of concepts.

**Single-table approach:**
```
reviewInvites.invitedAt = when they were invited
reviewInvites.linkedAt = when they gained permission (same record)
```

This works, but it's overloading the record. Now one row tracks:
- When invited
- How many times email was sent
- When they signed up
- When they first viewed
- What permission they have
- Whether access is revoked

That's 6+ concerns in one record. It violates Single Responsibility Principle at the data model level.

### Problem 6: The systemInviteId Foreign Key Problem

The proposal includes:
```typescript
systemInviteId?: Id<"systemInvites">
```

This creates a circular dependency problem:
1. `reviewInvites` points to `systemInvites`
2. But `systemInvites` needs to exist first
3. If a new user is invited to 3 artifacts, you create 3 `reviewInvites` all pointing to the same `systemInvites`
4. When they sign up, you need to update the `reviewInvites` records with `userId`

This is actually identical complexity to the three-table approach - you still have two tables (`reviewInvites` and `systemInvites`) with a relationship. The single-table claim only removed `artifactReviewers`, not `systemInvites`.

---

## 3. Concrete Query Comparisons

### Query 1: "Does this user have permission to comment?"

**Three-table:**
```typescript
const reviewer = await ctx.db
  .query("artifactReviewers")
  .withIndex("by_user_artifact", (q) =>
    q.eq("userId", userId).eq("artifactId", artifactId).eq("isDeleted", false)
  )
  .first();
return reviewer !== null;
// Index: by_user_artifact (userId, artifactId, isDeleted)
// Complexity: O(1)
```

**Single-table:**
```typescript
const invite = await ctx.db
  .query("reviewInvites")
  .withIndex("by_artifact_userId_active", (q) =>
    q.eq("artifactId", artifactId).eq("userId", userId).eq("status", "linked")
  )
  .first();
return invite !== null && !invite.isDeleted;
// Index: by_artifact_userId_active (artifactId, userId, status)
// Complexity: O(1), but requires 4-field compound index
// Problem: status must be exact match, can't query "linked OR viewed"
```

Single-table works here but requires a more complex index. The "linked OR viewed" problem means you might need multiple queries or a different status model.

### Query 2: "List all artifacts this user can access"

**Three-table:**
```typescript
const reviewers = await ctx.db
  .query("artifactReviewers")
  .withIndex("by_user_active", (q) =>
    q.eq("userId", userId).eq("isDeleted", false)
  )
  .collect();
return reviewers.map(r => r.artifactId);
// Clean, simple, fast
```

**Single-table:**
```typescript
const invites = await ctx.db
  .query("reviewInvites")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  // Can't filter by status with index! Status is not in the index key
  .collect();
return invites
  .filter(i => !i.isDeleted && (i.status === "linked" || i.status === "viewed"))
  .map(i => i.artifactId);
// Problem: Post-fetch filtering! Reads all invites, filters in memory.
// This gets slower as user accumulates more invites (including revoked ones)
```

**This is a serious problem.** Post-fetch filtering violates Convex best practices and doesn't scale.

### Query 3: "List all pending invitations for this artifact"

**Three-table:**
```typescript
const invites = await ctx.db
  .query("reviewInvites")
  .withIndex("by_artifact_status", (q) =>
    q.eq("artifactId", artifactId).eq("status", "pending")
  )
  .collect();
// Clean index on invitation status
```

**Single-table:**
```typescript
// Same query works here - this is the invitation lifecycle use case
// which the single-table handles naturally
```

No difference - this is the invitation lifecycle query, which both approaches handle equally well.

### Query 4: "Get reviewer details with user info for the share dialog"

**Three-table:**
```typescript
const reviewers = await ctx.db
  .query("artifactReviewers")
  .withIndex("by_artifact_active", (q) =>
    q.eq("artifactId", artifactId).eq("isDeleted", false)
  )
  .collect();

const invites = await ctx.db
  .query("reviewInvites")
  .withIndex("by_artifact", (q) => q.eq("artifactId", artifactId))
  .collect();

// Merge: For each reviewer, find matching invite for send history
// For pending invites (no reviewer), show pending status
```

**Single-table:**
```typescript
const invites = await ctx.db
  .query("reviewInvites")
  .withIndex("by_artifact_active", (q) =>
    q.eq("artifactId", artifactId).eq("isDeleted", false)
  )
  .collect();
// Already have everything in one record - simpler!
```

Single-table wins here. The owner's "Manage Reviewers" dialog is simpler with co-located data.

---

## 4. Performance Analysis

| Query Pattern | Three-Table | Single-Table | Winner |
|--------------|-------------|--------------|--------|
| Permission check | O(1) | O(1)* | Tie (*requires complex index) |
| List user's accessible artifacts | O(n) indexed | O(n) + filter | Three-table |
| List artifact's reviewers | O(n) + O(m) join | O(n) | Single-table |
| Pending invite count | O(1) indexed | O(1) indexed | Tie |
| Re-invite after revoke | Clean insert | Needs dedup logic | Three-table |

The critical difference is in **"List user's accessible artifacts"** - this is a common query for any "Shared with me" feature. With single-table, you read all invitation records (including revoked ones) and filter in memory. This becomes slower as the user's history grows.

---

## 5. How Each Approach Handles Future Requirements

### Requirement: "Add 'can-edit' permission level"

**Three-table:** Add `role: v.union(v.literal("can-comment"), v.literal("can-edit"))` to `artifactReviewers`. Permission queries unchanged. Invitations unchanged.

**Single-table:** Add `permission: v.union(...)` to `reviewInvites`. But now updating permission means patching an "invitation" record, which is semantically confusing.

**Winner: Three-table** (cleaner separation)

### Requirement: "Invite to multiple artifacts at once"

**Three-table:** Create one `systemInvites`, multiple `reviewInvites`, multiple `artifactReviewers`. Clear 1:N relationship.

**Single-table:** Create one `systemInvites`, multiple `reviewInvites`. Same structure.

**Winner: Tie**

### Requirement: "Show when reviewer last viewed each artifact"

**Three-table:** `artifactReviewers.lastViewedAt` - simple field on the permission record.

**Single-table:** `reviewInvites.lastViewedAt` - stored on invitation, which is a slight semantic stretch but works.

**Winner: Tie** (slight edge to three-table for semantics)

### Requirement: "Allow reviewers to view all versions, not just latest"

**Three-table:** `artifactReviewers.accessLevel: "all-versions" | "latest-only"` - permission change only.

**Single-table:** Same field on `reviewInvites`, but now an "invitation" record controls access level for an ongoing relationship.

**Winner: Three-table** (permissions should be on permission records)

### Requirement: "Implement invitation expiration"

**Three-table:** `reviewInvites.expiresAt` - invitation concern only, doesn't affect `artifactReviewers`.

**Single-table:** `reviewInvites.expiresAt` - works naturally since it IS an invitation record.

**Winner: Single-table** (this is the use case it excels at)

### Requirement: "Transfer artifact ownership"

**Three-table:** Owner logic is in `artifacts.creatorId`. Reviewers remain unchanged. New owner gets `artifactReviewers` record (or is removed from it if they had one).

**Single-table:** Same story, but if the previous owner had an invitation record, you have weird status management.

**Winner: Three-table** (edge case, but cleaner)

---

## 6. Recommendation

### The Verdict: Three-Table Architecture is Better

Despite the initial appeal of simplicity, the **three-table design** is the right choice for these reasons:

1. **Permission checks are critical-path operations** - They must be O(1) with simple indexes. The three-table design enables a clean `by_user_artifact` index on `artifactReviewers` that serves this use case perfectly.

2. **Separation of concerns scales better** - As the product evolves (multiple permission levels, access controls, team features), having a dedicated permission table prevents the invitation table from becoming a kitchen sink.

3. **Convex query patterns favor it** - Avoiding `filter()` requires proper indexes. The three-table design allows each table to have indexes optimized for its specific access patterns without index explosion.

4. **The "shared with me" query is important** - Listing artifacts a user can access is a core feature. The three-table design serves this with a clean indexed query. Single-table requires post-fetch filtering or complex denormalization.

5. **Audit trails are clearer** - "When was Alice invited?" vs "When did Alice gain access?" vs "What permission does Alice have?" are three different questions. Three tables = three clear answers.

### When Single-Table Would Be Right

The single-table approach would be preferable if:

- Permission model is guaranteed to never change (unlikely)
- "Shared with me" is not a feature (unlikely for a review platform)
- Invitation resend/history is not needed (explicitly required)
- Development speed trumps long-term maintainability (not our stance)

### The User's Valid Point

The user correctly identified that `artifactReviewers` and `reviewInvites` both point to the artifact. This feels redundant. The key insight is:

> **The relationship between an email and an artifact (invitation) is not the same as the relationship between a user and an artifact (permission).**

Before signup, we have only an email. After signup, we have a user ID. The invitation record bridges that gap, but once bridged, the permission record takes over for all runtime access checks.

Think of it like:
- **Invitation** = "You're invited to the party"
- **Permission** = "You're on the guest list"

The invitation got you on the guest list, but the bouncer (permission check) only looks at the guest list.

---

## Summary Table

| Criterion | Three-Table | Single-Table |
|-----------|-------------|--------------|
| Permission check performance | Optimal | Requires complex index |
| "Shared with me" query | Optimal | Post-fetch filter (bad) |
| Owner's reviewer list | Requires join | Optimal |
| Invitation history | Optimal | Optimal |
| Future permission types | Clean | Semantic confusion |
| Index count | Lower | Higher |
| Developer cognitive load | Higher initially | Lower initially |
| Long-term maintainability | Higher | Lower |
| Matches Convex best practices | Yes | Partial (filter concerns) |

**Final Recommendation:** Proceed with the three-table architecture as originally proposed.

---

## Appendix: Revised Three-Table Schema

For clarity, here's the three-table design with the insights from this analysis:

### systemInvites
```
Platform-level invitations for users without accounts.
One record per email (not per artifact).
Tracks platform invitation lifecycle.
```

### artifactReviewers
```
Permission records linking users to artifacts.
Always has userId (created when invite is linked).
Optimized for permission check queries.
Tracks view engagement (firstViewedAt, lastViewedAt).
```

### reviewInvites
```
Invitation lifecycle for artifact-specific invites.
Tracks email send history, pending/linked status.
Links to artifactReviewers when user exists.
One record per artifact+email combination.
```

This separation allows:
- **systemInvites**: Indexed by email for signup linking
- **artifactReviewers**: Indexed by userId for permission checks
- **reviewInvites**: Indexed by email+artifact for invitation management
