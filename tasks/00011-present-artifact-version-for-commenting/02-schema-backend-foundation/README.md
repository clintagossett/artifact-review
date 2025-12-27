# Subtask 02: Schema & Backend Foundation

**Parent Task:** 00011-present-artifact-version-for-commenting
**Status:** OPEN
**Created:** 2025-12-27

---

## Overview

Implement the database schema and all Convex queries/mutations for the Share Button feature with full test coverage.

**This subtask can run in parallel with Subtask 03 (ShareModal UI Shell).**

---

## Goals

1. Add `artifactReviewers` table to Convex schema
2. Add `shareLinkPermission` field to `artifacts` table
3. Implement all sharing queries and mutations in `convex/sharing.ts`
4. Achieve 100% test coverage on sharing functions

---

## 🚨 SCOPE BOUNDARIES

### Email Sending: REAL IMPLEMENTATION (Updated Scope)

**SCOPE CHANGE:** We ARE implementing email sending now (not mocking).

**Rationale:** Without emails, the "invite by email" feature is non-functional. See ADR 0010 for full decision.

**Implementation:**
```typescript
// 1. New action to send invitation email
export const sendInvitationEmail = action({
  args: { reviewerId: v.id("artifactReviewers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get reviewer, artifact, inviter details
    // Send email via Resend
    // Use NOTIFICATION_FROM_EMAIL env var
  }
});

// 2. Modify inviteReviewer to trigger email
export const inviteReviewer = mutation({
  handler: async (ctx, args) => {
    // 1. Verify owner
    // 2. Create artifactReviewer record
    const reviewerId = await ctx.db.insert("artifactReviewers", { ... });

    // 3. Schedule email send (async, non-blocking)
    await ctx.scheduler.runAfter(0, internal.sharing.sendInvitationEmail, {
      reviewerId,
    });

    // 4. Return reviewer ID
    return reviewerId;
  }
});
```

**What you're building:**
- ✅ Database record created
- ✅ UI shows "Pending" status
- ✅ **Actual email sent via Resend**
- ✅ Email template with artifact link
- ✅ Uses `notifications@artifactreview-early.xyz` as sender

**Environment Configuration:**
```bash
# app/.env.local
NOTIFICATION_FROM_EMAIL=notifications@artifactreview-early.xyz
AUTH_RESEND_KEY=re_xxx  # Already configured for magic links
```

**Email Template:**
- Subject: `You've been invited to review "[Artifact Title]"`
- Body: Inviter name, artifact title, permission level, direct link
- Link: `https://artifactreview.app/a/[shareToken]`

**Testing:**
- Mock Resend API in unit tests
- Use Mailpit for local E2E testing (per ADR 0001)

---

### Commenting: INFRASTRUCTURE ONLY

This subtask builds the **permission infrastructure** that commenting will later use:

**What you're building:**
- ✅ `getUserPermission` query - Returns user's access level
- ✅ Permission levels: "owner", "can-comment", "view-only", null
- ✅ Permission resolution order (owner → reviewer → link → no access)

**What you're NOT building:**
- ❌ Comment database schema
- ❌ Comment queries/mutations
- ❌ @mentions logic
- ❌ Threading logic

**The Interface:**
Future commenting features (Task 00012) will simply call:
```typescript
const permission = await ctx.runQuery(api.sharing.getUserPermission, { artifactId });
if (permission === "can-comment" || permission === "owner") {
  // Allow comment creation
}
```

Your job is to provide the `getUserPermission` query. The commenting system is someone else's job.

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| **ADR 0010** | **PROPOSED** | **BLOCKING:** Must be accepted before implementation starts |

**Why Blocked:**
This subtask implements the `inviteReviewer` mutation and `linkPendingInvitations` internal mutation. The architecture for linking pending invitations to new user accounts must be decided first.

**See:** `docs/architecture/decisions/0010-reviewer-invitation-account-linking.md`

**Blocks:**
- Subtask 04 (Backend-Frontend Integration) - Cannot start until this is complete

---

## Tasks

### 2.1 Schema Updates (Simplified for MVP)

**File:** `app/convex/schema.ts`

- [ ] Add `artifactReviewers` table definition
- [ ] Add indexes: `by_artifact`, `by_artifact_active`, `by_artifact_email`, `by_email`, `by_user`
- ~~Add `shareLinkPermission` field~~ **REMOVED** - No public links in MVP

**Schema Addition:**

```typescript
// Add to schema.ts
artifactReviewers: defineTable({
  artifactId: v.id("artifacts"),
  email: v.string(),
  userId: v.union(v.id("users"), v.null()),
  // NO permission field - all invited users get "can-comment" access
  invitedBy: v.id("users"),
  invitedAt: v.number(),
  status: v.union(v.literal("pending"), v.literal("accepted")),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_active", ["artifactId", "isDeleted"])
  .index("by_artifact_email", ["artifactId", "email"])
  .index("by_email", ["email"])
  .index("by_user", ["userId"]),

// No changes to artifacts table needed (shareToken already exists)
```

### 2.2 Create sharing.ts Functions

**File:** `app/convex/sharing.ts`

**Queries:**
- [ ] `getReviewers` - List reviewers for artifact (owner only)
- [ ] `getUserPermission` - Returns "owner", "can-comment", or null

**Mutations:**
- [ ] `inviteReviewer` - Add reviewer by email (triggers email send)
- [ ] `removeReviewer` - Soft delete reviewer
- [ ] `linkPendingInvitations` - Link pending invitations to new user (internal)

**Actions:**
- [ ] `sendInvitationEmail` - Send invitation email via Resend (internal)

**Email Template:**
- [ ] Create HTML email template function
- [ ] Include: inviter name, artifact title, "You've been invited to comment", direct link
- [ ] Use `NOTIFICATION_FROM_EMAIL` environment variable

**REMOVED (No longer needed):**
- ~~`getShareLinkSettings`~~ - No public links
- ~~`updateReviewerPermission`~~ - No permission changes (everyone gets "can-comment")
- ~~`updateShareLinkPermission`~~ - No public links

### 2.3 Tests

**Location:** `tasks/00011-present-artifact-version-for-commenting/02-schema-backend-foundation/tests/convex/`

**Test File:** `sharing.test.ts`

**Test Cases:**

```typescript
// sharing.test.ts
describe("inviteReviewer", () => {
  it("should create reviewer record when owner invites");
  it("should trigger email send via scheduler");
  it("should reject when caller is not owner");
  it("should reject duplicate email invitations");
  it("should normalize email to lowercase");
  it("should link to existing user if email matches");
  it("should reject invalid email format");
});

describe("getReviewers", () => {
  it("should return empty array for artifact with no reviewers");
  it("should return all active reviewers");
  it("should exclude soft-deleted reviewers");
  it("should reject when caller is not owner");
  it("should enrich with user data when available");
  it("should show 'pending' status for uninvited users");
  it("should show 'accepted' status for logged-in users");
});

describe("removeReviewer", () => {
  it("should soft delete reviewer");
  it("should reject when caller is not owner");
  it("should reject when reviewer not found");
});

describe("getUserPermission", () => {
  it("should return 'owner' for artifact creator");
  it("should return 'can-comment' for invited reviewer");
  it("should return null for user with no access");
  it("should return null for unauthenticated user");
});

describe("linkPendingInvitations", () => {
  it("should link all pending invitations for user email");
  it("should update status from pending to accepted");
  it("should handle multiple artifacts for same email");
  it("should ignore already-linked invitations");
  it("should normalize email case");
});

describe("sendInvitationEmail", () => {
  it("should send email via Resend");
  it("should include artifact title in subject");
  it("should include inviter name in body");
  it("should include permission level in body");
  it("should include direct artifact link");
  it("should use NOTIFICATION_FROM_EMAIL as sender");
  it("should handle Resend API errors gracefully");
});
```

---

## Acceptance Criteria

- [ ] Schema deploys without errors
- [ ] All mutations enforce owner-only access
- [ ] All queries return correct data
- [ ] 100% test coverage on sharing.ts
- [ ] No use of `filter` (indexes only)
- [ ] All functions follow Convex rules (new function syntax with `args`, `returns`, `handler`)

---

## Deliverables

| File | Description |
|------|-------------|
| `app/convex/schema.ts` | Updated with `artifactReviewers` table and `shareLinkPermission` field |
| `app/convex/sharing.ts` | New file with all sharing queries and mutations |
| `tests/convex/sharing.test.ts` | Comprehensive test suite |
| `test-report.md` | Test coverage report |

---

## Interface Contract (Simplified for MVP)

The following types define the contract between backend (this subtask) and frontend (Subtask 03):

```typescript
type Permission = "owner" | "can-comment" | null;
type ReviewerStatus = "pending" | "accepted";

interface Reviewer {
  _id: Id<"artifactReviewers">;
  email: string;
  userId: Id<"users"> | null;
  // NO permission field - all invited users have "can-comment" access
  status: ReviewerStatus;
  invitedAt: number;
  user?: {
    name?: string;
    email?: string;
  };
}

// ShareLinkSettings REMOVED - no public links in MVP
```

---

## Test Infrastructure Setup

```bash
# From app/ directory
npm install -D convex-test vitest
```

---

## References

- **Implementation Plan:** `01-share-button-planning/IMPLEMENTATION-PLAN.md`
- **Architecture:** `01-share-button-planning/ARCHITECTURE.md`
- **Convex Rules:** `docs/architecture/convex-rules.md`
- **TDD Workflow:** `docs/development/workflow.md`
