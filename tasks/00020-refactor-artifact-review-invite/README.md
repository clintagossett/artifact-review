# Task 00020: Refactor and Artifact Review Invite

**GitHub Issue:** [#20](https://github.com/clintagossett/artifact-review/issues/20)
**Status:** Planning
**Created:** 2025-12-31

---

## Resume (Start Here)

**Last Updated:** 2025-12-31 (Session 1)

### Current Status: 📋 Design Complete - Ready for Decision

**Phase:** Architecture design complete. Need to review and approve before implementation.

### What We Did This Session (Session 1)

1. **Created GitHub Issue #20** - Issue assigned, tracking established
2. **Defined scope** - Clarified the extensibility problems with current invite system:
   - System invites (join platform) conflated with document invites (review artifact)
   - Can't track multiple invitations per person properly
   - No re-send capability
   - No clear "viewed" tracking
   - Existing users still need to "accept" by viewing

3. **Architect designed solution** - Comprehensive design proposal created
   - Researched patterns from Slack, Google Docs, GitHub, Figma
   - Proposed three-table architecture (systemInvites, artifactReviewers, reviewInvites)
   - Designed state machines for invitation lifecycle
   - Created UX flows and API surface
   - Planned migration path
   - Document: `design-proposal.md`

4. **Challenged design** - User questioned need for both artifactReviewers + reviewInvites
   - Architect analyzed single-table alternative
   - Found critical performance issues with single-table approach
   - Permission checks would require post-fetch filtering (violates Convex rules)
   - "Shared with me" query becomes impossible to optimize
   - Recommendation: Stick with three-table design
   - Document: `design-challenge-single-table.md`

### Design Decision Needed

**Three-Table Architecture (Recommended):**
```
systemInvites      → Platform signup invitations
artifactReviewers  → Active permissions (userId required)
reviewInvites      → Invitation lifecycle tracking
```

**Why separate artifactReviewers from reviewInvites:**
- Permission checks are O(1) with simple index (critical path)
- Email-based invites vs userId-based permissions are different concerns
- "Shared with me" query needs efficient userId index
- Revoke/re-invite creates multiple records, ambiguous in single-table

### Next Steps

1. **Review design documents** - Read both design docs thoroughly:
   - `design-proposal.md` (main proposal)
   - `design-challenge-single-table.md` (tradeoff analysis)

2. **Make final decision** - Approve three-table design or request modifications

3. **Begin implementation** - Once approved:
   - Phase 1: Schema changes (new tables, new fields)
   - Phase 2: Internal mutations (linking logic)
   - Phase 3: Public API (inviteReviewer, resendInvitation, etc.)
   - Phase 4: Frontend (ShareModal updates)
   - Phase 5: Migration (backfill existing data)

4. **Estimated effort:** 6-9 days across 5 phases

---

## Objective

Refactor the artifact review invite functionality to improve code quality, maintainability, and user experience.

---

## Scope

### Problems with Current System

The current `artifactReviewers` table conflates two distinct concepts:
1. **System invitations** - inviting someone to join the platform
2. **Document review invitations** - inviting someone to review a specific artifact

**Current limitations:**
- Single email can only be invited once per artifact (no revoke/re-invite)
- Status field conflates "no account yet" with "hasn't viewed artifact"
- No re-send tracking (when was invite last sent? how many times?)
- No first-view tracking (has reviewer actually engaged?)
- Can't tell difference between "user hasn't signed up" vs "user hasn't viewed"

### In Scope

- Separate system invites from document invites
- Track multiple invitations per person per artifact
- Re-send capability with send history
- "Viewed" tracking for engagement metrics
- Support for both existing users and new users
- Migration from current schema to new schema

### Out of Scope

- Changing permission model (still "can-comment" only)
- Email template redesign
- Notification preferences
- Invitation expiration (optional in design, not MVP)

---

## Current State

**Current Schema:**
```typescript
artifactReviewers: {
  artifactId: Id<"artifacts">,
  email: string,
  userId: Id<"users"> | null,  // null = pending system invite
  status: "pending" | "accepted",  // Conflates system + doc invite
  invitedBy: Id<"users">,
  invitedAt: number,
}
```

**Issues:**
- `userId: null` means "no account" but permission checks need userId
- `status: "pending"` is ambiguous (pending account? pending view?)
- No re-send tracking
- Can't distinguish existing user invites from new user invites

## Options Considered

See detailed documents:
- `design-proposal.md` - Full three-table architecture
- `design-challenge-single-table.md` - Analysis of single-table alternative

### Option A: Three-Table Architecture (Recommended)

**Tables:**
- `systemInvites` - Platform signup tracking
- `artifactReviewers` - Active permissions (always has userId)
- `reviewInvites` - Invitation lifecycle

**Pros:**
- Clear separation of concerns
- O(1) permission checks
- Efficient "shared with me" queries
- No post-fetch filtering needed

**Cons:**
- More tables to understand
- More writes when inviting new users
- Requires careful linking logic

### Option B: Single-Table with Permissions

**One table:** `reviewInvites` with embedded permissions

**Pros:**
- Simpler mental model
- Fewer joins
- Atomic updates

**Cons:**
- Permission checks require post-fetch filtering (violates Convex best practices)
- "Shared with me" query can't use indexes efficiently
- Revoke/re-invite creates ambiguous state
- Table serves 6+ concerns (violates SRP)

## Decision

**Proceed with Option A (Three-Table Architecture)**

**Rationale:**
- Permission checks are on the critical path (every view, comment, file serve)
- Must be O(1) with simple indexes
- Separation of concerns improves long-term maintainability
- The architect's analysis shows single-table creates query performance issues

## Changes Made

**Planning Phase (Session 1):**
- Created GitHub Issue #20
- Created task folder structure
- Architect researched invitation patterns
- Created comprehensive design proposal
- Challenged design with single-table alternative
- Documented tradeoff analysis

**Implementation Phase:**
_(To be updated as work progresses)_

## Output

### Design Documents

| Document | Description |
|----------|-------------|
| `design-proposal.md` | Full three-table architecture proposal with data models, state machines, UX flows, API surface, migration plan, and implementation phases (6-9 day estimate) |
| `design-challenge-single-table.md` | Detailed analysis challenging the three-table approach with single-table alternative, including query performance comparisons and recommendation |

### Implementation Artifacts

_(To be added during implementation)_
- Schema changes
- Convex mutations/queries
- Frontend components
- Migration scripts
- Tests

## Testing

**Planning Phase:**
- No tests yet (design only)

**Implementation Phase:**
_(To be defined once implementation begins)_

Planned test coverage:
- Unit tests for invitation state machine
- Unit tests for linking logic
- Integration tests for API surface
- E2E tests for full invitation flows
- Migration validation tests
