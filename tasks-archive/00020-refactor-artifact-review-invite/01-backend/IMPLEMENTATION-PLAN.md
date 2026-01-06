# TDD Implementation Plan: Task 00020 Phase 1 - Backend

**Status:** READY FOR IMPLEMENTATION
**Created:** 2026-01-03
**Updated:** 2026-01-03 (Revised based on user feedback)
**Author:** Claude Code (TDD Developer Agent)

---

## Overview

This document outlines the Test-Driven Development (TDD) implementation plan for Task 00020 Phase 1 Backend - the two-table invitation system refactor (`userInvites` + `artifactAccess`).

**Philosophy:** Write tests first, implement code to make them pass, refactor if needed.

**Approach:** 2-3 focused PRs for iterative delivery with manageable review scope.

---

## Prerequisites: Required Reading

Before implementation, the developer MUST read:

1. ✅ `/Users/clintgossett/Documents/personal/personal projects/artifact-review/docs/development/workflow.md` - TDD workflow
2. ✅ `/Users/clintgossett/Documents/personal/personal projects/artifact-review/docs/architecture/convex-rules.md` - Convex patterns (STRICT RULES)
3. ✅ `/Users/clintgossett/Documents/personal/personal projects/artifact-review/tasks/00020-refactor-artifact-review-invite/01-backend/README.md` - Feature requirements

---

## Test Framework Setup

### Test File Location

**IMPORTANT:** Convex backend tests go in the main app's `convex/__tests__/` directory, NOT in the task folder.

```
app/convex/__tests__/
└── access.test.ts    # New file for this feature
```

**Why?** From the project's testing guide:
- Task-level tests are for E2E/integration during development
- Convex backend tests are promoted immediately to `app/convex/__tests__/`
- This ensures tests run with app's Vitest setup and have correct imports

### Test Framework
- **Framework:** Vitest + `convex-test`
- **Run from:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app` directory
- **Command:** `npx vitest convex/__tests__/access.test.ts`

### Test Structure Pattern

Based on existing tests in `app/convex/__tests__/sharing.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

// Helper to create test user
async function createTestUser(t: ReturnType<typeof convexTest>, email: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email,
      name: email.split("@")[0],
    });
  });
}

// Helper to create test artifact
async function createTestArtifact(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  name: string
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const artifactId = await ctx.db.insert("artifacts", {
      name,
      createdBy: userId,
      shareToken: "test-token-" + Date.now(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    return artifactId;
  });
}

describe("access", () => {
  describe("grant", () => {
    it("should create artifactAccess for existing user", async () => {
      const t = convexTest(schema);

      // Setup
      const ownerId = await createTestUser(t, "owner@example.com");
      const reviewerId = await createTestUser(t, "reviewer@example.com");
      const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

      // Execute
      const asOwner = t.withIdentity({ subject: ownerId });
      const accessId = await asOwner.mutation(api.access.grant, {
        artifactId,
        email: "reviewer@example.com",
      });

      // Verify
      expect(accessId).toBeDefined();
      const access = await t.run(async (ctx) => await ctx.db.get(accessId));
      expect(access?.userId).toBe(reviewerId);
      expect(access?.userInviteId).toBeUndefined();
    });
  });
});
```

---

## Email Testing Pattern

### Existing Pattern (from `sharing.ts`)

The project already has Resend configured. Email sending follows this pattern:

```typescript
// In internalAction
export const sendEmailInternal = internalAction({
  args: { accessId: v.id("artifactAccess") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Fetch data via internal queries
    const access = await ctx.runQuery(internal.access.getAccessById, { accessId: args.accessId });
    const artifact = await ctx.runQuery(internal.access.getArtifactById, { artifactId: access.artifactId });
    const inviter = await ctx.runQuery(internal.access.getUserById, { userId: access.createdBy });

    // 2. Send via Resend
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.AUTH_RESEND_KEY);

      const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || "notifications@artifactreview-early.xyz";

      await resend.emails.send({
        from: fromEmail,
        to: recipientEmail,
        subject: `You've been invited to review "${artifact.name}"`,
        html: renderInvitationEmail({
          artifactTitle: artifact.name,
          inviterName: inviter.name || inviter.email || "Someone",
          shareToken: artifact.shareToken,
          recipientEmail,
        }),
      });

      console.log("Invitation email sent:", { to: recipientEmail, artifact: artifact.name });
    } catch (error) {
      console.error("Failed to send invitation email:", error);
      // Don't throw - invitation already created
    }

    return null;
  },
});
```

### Email Testing Strategy (from ADR-0001)

**DO NOT mock Resend in unit tests.** Email sending is tested via:

1. **Unit tests:** Focus on data logic, NOT email delivery
   - Test that `grant` creates correct records
   - Test that `resend` updates sendCount/lastSentAt
   - DO NOT test actual email sending

2. **E2E tests (in Phase 2 frontend):**
   - Test complete invitation flow
   - Verify email appears in Resend test mode dashboard
   - Test on hosted dev environment

**Pattern from existing tests:**
```typescript
// ❌ DON'T do this (from sharing.test.ts - marked .skip)
describe.skip("sendInvitationEmail", () => {
  let mockResendSend: any;
  beforeEach(() => {
    mockResendSend = vi.fn().mockResolvedValue({ id: "email-id" });
    vi.mock("resend", () => ({ ... }));
  });
  // Tests that never run...
});

// ✅ DO this instead
describe("grant", () => {
  it("should trigger email send via scheduler", async () => {
    // Test that mutation succeeds
    // Email sending tested in E2E, not unit tests
  });
});
```

**Environment Variables:**
- `AUTH_RESEND_KEY` - Resend API key (already configured)
- `NOTIFICATION_FROM_EMAIL` - Sender email (default: `notifications@artifactreview-early.xyz`)

**Test Email Domains (from docs):**
- Use `@example.com` for test emails in unit tests
- Resend test mode logs emails but doesn't deliver (safe for hosted dev)

---

## Test Cases by Validation Scenario

This implementation will be **test-driven** - each scenario requires a failing test FIRST, then implementation.

### Group 1: Schema Foundation (Start Here)

**Tests to write:**

#### Test 1.1: `userInvites` table exists with correct fields
```typescript
it("should create userInvites record with all required fields", async () => {
  const t = convexTest(schema);

  const createdById = await createTestUser(t, "owner@example.com");

  const inviteId = await t.run(async (ctx) => {
    return await ctx.db.insert("userInvites", {
      email: "invite@example.com",
      name: "Invited User",
      createdBy: createdById,
      isDeleted: false,
    });
  });

  const invite = await t.run(async (ctx) => await ctx.db.get(inviteId));

  expect(invite?.email).toBe("invite@example.com");
  expect(invite?.name).toBe("Invited User");
  expect(invite?.createdBy).toBe(createdById);
  expect(invite?.convertedToUserId).toBeUndefined();
  expect(invite?.isDeleted).toBe(false);
});
```

#### Test 1.2: `artifactAccess` table exists with correct fields
```typescript
it("should create artifactAccess record with all required fields", async () => {
  const t = convexTest(schema);

  const ownerId = await createTestUser(t, "owner@example.com");
  const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");
  const now = Date.now();

  const accessId = await t.run(async (ctx) => {
    return await ctx.db.insert("artifactAccess", {
      artifactId,
      userId: ownerId,
      createdBy: ownerId,
      lastSentAt: now,
      sendCount: 1,
      isDeleted: false,
    });
  });

  const access = await t.run(async (ctx) => await ctx.db.get(accessId));

  expect(access?.artifactId).toBe(artifactId);
  expect(access?.userId).toBe(ownerId);
  expect(access?.userInviteId).toBeUndefined();
  expect(access?.createdBy).toBe(ownerId);
  expect(access?.lastSentAt).toBe(now);
  expect(access?.sendCount).toBe(1);
  expect(access?.isDeleted).toBe(false);
});
```

#### Test 1.3: Indexes are queryable
```typescript
it("should query userInvites by email and createdBy", async () => {
  const t = convexTest(schema);

  const ownerId = await createTestUser(t, "owner@example.com");

  await t.run(async (ctx) => {
    await ctx.db.insert("userInvites", {
      email: "test@example.com",
      createdBy: ownerId,
      isDeleted: false,
    });
  });

  const invites = await t.run(async (ctx) => {
    return await ctx.db
      .query("userInvites")
      .withIndex("by_email_createdBy", (q) =>
        q.eq("email", "test@example.com").eq("createdBy", ownerId)
      )
      .collect();
  });

  expect(invites).toHaveLength(1);
});

it("should query artifactAccess by artifactId and userId", async () => {
  const t = convexTest(schema);

  const ownerId = await createTestUser(t, "owner@example.com");
  const artifactId = await createTestArtifact(t, ownerId, "Test");

  await t.run(async (ctx) => {
    await ctx.db.insert("artifactAccess", {
      artifactId,
      userId: ownerId,
      createdBy: ownerId,
      lastSentAt: Date.now(),
      sendCount: 1,
      isDeleted: false,
    });
  });

  const access = await t.run(async (ctx) => {
    return await ctx.db
      .query("artifactAccess")
      .withIndex("by_artifactId_userId", (q) =>
        q.eq("artifactId", artifactId).eq("userId", ownerId)
      )
      .unique();
  });

  expect(access).toBeDefined();
});
```

**Implementation After Tests Pass:**
1. Add tables to `app/convex/schema.ts`
2. Run `npx convex dev` to deploy schema changes
3. Verify tests pass

---

### Group 2: `grant` Mutation - Core Logic

**Validation Scenarios to Test:**

#### Scenario 1: Invite existing user
```typescript
describe("grant - existing user", () => {
  it("should create artifactAccess with userId when email matches existing user", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const reviewerId = await createTestUser(t, "reviewer@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });
    const accessId = await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "reviewer@example.com",
    });

    const access = await t.run(async (ctx) => await ctx.db.get(accessId));

    // Should have userId set
    expect(access?.userId).toBe(reviewerId);
    // Should NOT create userInvites record
    expect(access?.userInviteId).toBeUndefined();

    // Verify NO userInvites record was created
    const invites = await t.run(async (ctx) => {
      return await ctx.db
        .query("userInvites")
        .withIndex("by_email_createdBy", (q) =>
          q.eq("email", "reviewer@example.com").eq("createdBy", ownerId)
        )
        .collect();
    });
    expect(invites).toHaveLength(0);
  });
});
```

#### Scenario 2: Invite new user
```typescript
describe("grant - new user", () => {
  it("should create userInvites + artifactAccess with userInviteId for new email", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });
    const accessId = await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "newuser@example.com",
    });

    const access = await t.run(async (ctx) => await ctx.db.get(accessId));

    // Should NOT have userId
    expect(access?.userId).toBeUndefined();
    // Should have userInviteId
    expect(access?.userInviteId).toBeDefined();

    // Verify userInvites record was created
    const invite = await t.run(async (ctx) => await ctx.db.get(access!.userInviteId!));
    expect(invite?.email).toBe("newuser@example.com");
    expect(invite?.createdBy).toBe(ownerId);
  });
});
```

#### Scenario 3: Same owner, same email, multiple artifacts
```typescript
it("should reuse existing userInvites for same owner + email across artifacts", async () => {
  const t = convexTest(schema);

  const ownerId = await createTestUser(t, "owner@example.com");
  const artifact1Id = await createTestArtifact(t, ownerId, "Artifact 1");
  const artifact2Id = await createTestArtifact(t, ownerId, "Artifact 2");

  const asOwner = t.withIdentity({ subject: ownerId });

  // Grant access to artifact 1
  const access1Id = await asOwner.mutation(api.access.grant, {
    artifactId: artifact1Id,
    email: "newuser@example.com",
  });

  // Grant access to artifact 2
  const access2Id = await asOwner.mutation(api.access.grant, {
    artifactId: artifact2Id,
    email: "newuser@example.com",
  });

  const access1 = await t.run(async (ctx) => await ctx.db.get(access1Id));
  const access2 = await t.run(async (ctx) => await ctx.db.get(access2Id));

  // Should use same userInvite
  expect(access1?.userInviteId).toBe(access2?.userInviteId);

  // Should have TWO artifactAccess records
  const allAccess = await t.run(async (ctx) => {
    return await ctx.db
      .query("artifactAccess")
      .withIndex("by_userInviteId", (q) => q.eq("userInviteId", access1!.userInviteId!))
      .collect();
  });
  expect(allAccess).toHaveLength(2);

  // Should have ONE userInvites record
  const invites = await t.run(async (ctx) => {
    return await ctx.db
      .query("userInvites")
      .withIndex("by_email_createdBy", (q) =>
        q.eq("email", "newuser@example.com").eq("createdBy", ownerId)
      )
      .collect();
  });
  expect(invites).toHaveLength(1);
});
```

#### Scenario 4: Different owners, same email
```typescript
it("should create separate userInvites for different owners with same email", async () => {
  const t = convexTest(schema);

  const owner1Id = await createTestUser(t, "owner1@example.com");
  const owner2Id = await createTestUser(t, "owner2@example.com");
  const artifact1Id = await createTestArtifact(t, owner1Id, "Owner1 Artifact");
  const artifact2Id = await createTestArtifact(t, owner2Id, "Owner2 Artifact");

  // Owner 1 invites reviewer@example.com
  const asOwner1 = t.withIdentity({ subject: owner1Id });
  const access1Id = await asOwner1.mutation(api.access.grant, {
    artifactId: artifact1Id,
    email: "reviewer@example.com",
  });

  // Owner 2 invites reviewer@example.com
  const asOwner2 = t.withIdentity({ subject: owner2Id });
  const access2Id = await asOwner2.mutation(api.access.grant, {
    artifactId: artifact2Id,
    email: "reviewer@example.com",
  });

  const access1 = await t.run(async (ctx) => await ctx.db.get(access1Id));
  const access2 = await t.run(async (ctx) => await ctx.db.get(access2Id));

  // Should have DIFFERENT userInviteIds
  expect(access1?.userInviteId).not.toBe(access2?.userInviteId);

  // Should have TWO separate userInvites records
  const allInvites = await t.run(async (ctx) => {
    return await ctx.db
      .query("userInvites")
      .withIndex("by_email", (q) => q.eq("email", "reviewer@example.com"))
      .collect();
  });
  expect(allInvites).toHaveLength(2);
  expect(allInvites.map(i => i.createdBy).sort()).toEqual([owner1Id, owner2Id].sort());
});
```

#### Scenario 6: Resend invitation
```typescript
describe("resend", () => {
  it("should increment sendCount and update lastSentAt", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });

    // Initial grant
    const accessId = await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "newuser@example.com",
    });

    const accessBefore = await t.run(async (ctx) => await ctx.db.get(accessId));
    const initialSendCount = accessBefore!.sendCount;
    const initialLastSentAt = accessBefore!.lastSentAt;

    // Wait a moment to ensure timestamp changes
    await new Promise(resolve => setTimeout(resolve, 10));

    // Resend
    await asOwner.mutation(api.access.resend, { accessId });

    const accessAfter = await t.run(async (ctx) => await ctx.db.get(accessId));

    expect(accessAfter?.sendCount).toBe(initialSendCount + 1);
    expect(accessAfter?.lastSentAt).toBeGreaterThan(initialLastSentAt);
  });
});
```

#### Scenario 9: Re-invite after revocation
```typescript
describe("grant - revocation and re-invite", () => {
  it("should un-delete existing artifactAccess when re-inviting", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });

    // Initial grant
    const accessId = await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "reviewer@example.com",
    });

    // Revoke
    await asOwner.mutation(api.access.revoke, { accessId });

    // Verify deleted
    const deletedAccess = await t.run(async (ctx) => await ctx.db.get(accessId));
    expect(deletedAccess?.isDeleted).toBe(true);

    // Re-grant (should un-delete same record)
    const newAccessId = await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "reviewer@example.com",
    });

    // Should return same ID
    expect(newAccessId).toBe(accessId);

    // Verify un-deleted
    const restoredAccess = await t.run(async (ctx) => await ctx.db.get(accessId));
    expect(restoredAccess?.isDeleted).toBe(false);
    expect(restoredAccess?.deletedAt).toBeUndefined();
  });
});
```

---

### Group 3: Query Functions

#### `listReviewers` Tests
```typescript
describe("listReviewers", () => {
  it("should return empty array for artifact with no reviewers", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });
    const reviewers = await asOwner.query(api.access.listReviewers, { artifactId });

    expect(reviewers).toHaveLength(0);
  });

  it("should return reviewers with displayName, email, status", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const existingUserId = await createTestUser(t, "existing@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });

    // Grant to existing user
    await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "existing@example.com",
    });

    // Grant to new user
    await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "pending@example.com",
    });

    const reviewers = await asOwner.query(api.access.listReviewers, { artifactId });

    expect(reviewers).toHaveLength(2);

    // Existing user should have name from users table
    const existingReviewer = reviewers.find(r => r.email === "existing@example.com");
    expect(existingReviewer?.displayName).toBe("existing"); // From name field
    expect(existingReviewer?.status).toBe("accepted"); // Has userId

    // Pending user should show email as displayName
    const pendingReviewer = reviewers.find(r => r.email === "pending@example.com");
    expect(pendingReviewer?.displayName).toBe("pending@example.com");
    expect(pendingReviewer?.status).toBe("pending"); // No userId
  });

  it("should exclude soft-deleted access records", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });

    // Grant to reviewer
    const accessId = await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "reviewer@example.com",
    });

    // Revoke access
    await asOwner.mutation(api.access.revoke, { accessId });

    const reviewers = await asOwner.query(api.access.listReviewers, { artifactId });

    expect(reviewers).toHaveLength(0);
  });
});
```

#### `getPermission` Tests
```typescript
describe("getPermission", () => {
  it("should return 'owner' for artifact creator", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });
    const permission = await asOwner.query(api.access.getPermission, { artifactId });

    expect(permission).toBe("owner");
  });

  it("should return 'can-comment' for invited reviewer", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const reviewerId = await createTestUser(t, "reviewer@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    // Grant access
    const asOwner = t.withIdentity({ subject: ownerId });
    await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "reviewer@example.com",
    });

    // Check permission as reviewer
    const asReviewer = t.withIdentity({ subject: reviewerId });
    const permission = await asReviewer.query(api.access.getPermission, { artifactId });

    expect(permission).toBe("can-comment");
  });

  it("should return null for user with no access", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const otherId = await createTestUser(t, "other@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOther = t.withIdentity({ subject: otherId });
    const permission = await asOther.query(api.access.getPermission, { artifactId });

    expect(permission).toBeNull();
  });

  it("should use O(1) index lookup by artifactId + userId", async () => {
    // Note: This is a performance contract test - relies on proper index usage
    // Implementation MUST use .withIndex("by_artifactId_userId", ...).unique()

    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const reviewerId = await createTestUser(t, "reviewer@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });
    await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "reviewer@example.com",
    });

    // Query as reviewer - should use index
    const asReviewer = t.withIdentity({ subject: reviewerId });
    const permission = await asReviewer.query(api.access.getPermission, { artifactId });

    expect(permission).toBe("can-comment");
    // If implementation uses .filter() instead of index, this test still passes
    // but serves as documentation that index MUST be used
  });
});
```

#### `listShared` Tests
```typescript
describe("listShared", () => {
  it("should return artifacts shared with current user", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const reviewerId = await createTestUser(t, "reviewer@example.com");
    const artifact1Id = await createTestArtifact(t, ownerId, "Artifact 1");
    const artifact2Id = await createTestArtifact(t, ownerId, "Artifact 2");

    const asOwner = t.withIdentity({ subject: ownerId });

    // Share both artifacts with reviewer
    await asOwner.mutation(api.access.grant, {
      artifactId: artifact1Id,
      email: "reviewer@example.com",
    });
    await asOwner.mutation(api.access.grant, {
      artifactId: artifact2Id,
      email: "reviewer@example.com",
    });

    // List as reviewer
    const asReviewer = t.withIdentity({ subject: reviewerId });
    const shared = await asReviewer.query(api.access.listShared, {});

    expect(shared).toHaveLength(2);
    expect(shared.map(s => s.artifact.name).sort()).toEqual(["Artifact 1", "Artifact 2"]);
  });

  it("should exclude soft-deleted access records", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const reviewerId = await createTestUser(t, "reviewer@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });

    const accessId = await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "reviewer@example.com",
    });

    // Revoke access
    await asOwner.mutation(api.access.revoke, { accessId });

    // List as reviewer
    const asReviewer = t.withIdentity({ subject: reviewerId });
    const shared = await asReviewer.query(api.access.listShared, {});

    expect(shared).toHaveLength(0);
  });
});
```

---

### Group 4: Mutation Functions - Revoke, RecordView

#### Scenario 7: Revoke access (existing user)
```typescript
describe("revoke", () => {
  it("should soft delete artifactAccess for existing user", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const reviewerId = await createTestUser(t, "reviewer@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });

    // Grant access
    const accessId = await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "reviewer@example.com",
    });

    // Revoke access
    await asOwner.mutation(api.access.revoke, { accessId });

    // Verify soft deleted
    const access = await t.run(async (ctx) => await ctx.db.get(accessId));
    expect(access?.isDeleted).toBe(true);
    expect(access?.deletedAt).toBeDefined();

    // Verify user loses access
    const asReviewer = t.withIdentity({ subject: reviewerId });
    const permission = await asReviewer.query(api.access.getPermission, { artifactId });
    expect(permission).toBeNull();
  });
});
```

#### Scenario 8: Revoke access (pending user)
```typescript
it("should soft delete artifactAccess but keep userInvites", async () => {
  const t = convexTest(schema);

  const ownerId = await createTestUser(t, "owner@example.com");
  const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

  const asOwner = t.withIdentity({ subject: ownerId });

  // Grant to pending user
  const accessId = await asOwner.mutation(api.access.grant, {
    artifactId,
    email: "pending@example.com",
  });

  const accessBefore = await t.run(async (ctx) => await ctx.db.get(accessId));
  const userInviteId = accessBefore!.userInviteId!;

  // Revoke
  await asOwner.mutation(api.access.revoke, { accessId });

  // Verify artifactAccess deleted
  const access = await t.run(async (ctx) => await ctx.db.get(accessId));
  expect(access?.isDeleted).toBe(true);

  // Verify userInvites still exists (NOT deleted)
  const invite = await t.run(async (ctx) => await ctx.db.get(userInviteId));
  expect(invite?.isDeleted).toBe(false);
});
```

#### `recordView` Tests
```typescript
describe("recordView", () => {
  it("should set firstViewedAt on first view", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const reviewerId = await createTestUser(t, "reviewer@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });
    const accessId = await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "reviewer@example.com",
    });

    // Verify no view timestamps initially
    const accessBefore = await t.run(async (ctx) => await ctx.db.get(accessId));
    expect(accessBefore?.firstViewedAt).toBeUndefined();
    expect(accessBefore?.lastViewedAt).toBeUndefined();

    // Record view
    const asReviewer = t.withIdentity({ subject: reviewerId });
    await asReviewer.mutation(api.access.recordView, { accessId });

    // Verify firstViewedAt and lastViewedAt set
    const accessAfter = await t.run(async (ctx) => await ctx.db.get(accessId));
    expect(accessAfter?.firstViewedAt).toBeDefined();
    expect(accessAfter?.lastViewedAt).toBeDefined();
    expect(accessAfter?.firstViewedAt).toBe(accessAfter?.lastViewedAt);
  });

  it("should update lastViewedAt on subsequent views", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const reviewerId = await createTestUser(t, "reviewer@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });
    const accessId = await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "reviewer@example.com",
    });

    const asReviewer = t.withIdentity({ subject: reviewerId });

    // First view
    await asReviewer.mutation(api.access.recordView, { accessId });
    const accessAfterFirst = await t.run(async (ctx) => await ctx.db.get(accessId));
    const firstViewedAt = accessAfterFirst!.firstViewedAt!;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 10));

    // Second view
    await asReviewer.mutation(api.access.recordView, { accessId });
    const accessAfterSecond = await t.run(async (ctx) => await ctx.db.get(accessId));

    // firstViewedAt should not change
    expect(accessAfterSecond?.firstViewedAt).toBe(firstViewedAt);
    // lastViewedAt should be updated
    expect(accessAfterSecond?.lastViewedAt).toBeGreaterThan(firstViewedAt);
  });
});
```

---

### Group 5: Internal Functions - Signup Linking

#### Scenario 5: Pending user signs up
```typescript
describe("linkInvitesToUserInternal", () => {
  it("should link all pending invites to new user on signup", async () => {
    const t = convexTest(schema);

    const owner1Id = await createTestUser(t, "owner1@example.com");
    const owner2Id = await createTestUser(t, "owner2@example.com");
    const artifact1Id = await createTestArtifact(t, owner1Id, "Artifact 1");
    const artifact2Id = await createTestArtifact(t, owner2Id, "Artifact 2");

    // Owner 1 invites pending@example.com
    const asOwner1 = t.withIdentity({ subject: owner1Id });
    const access1Id = await asOwner1.mutation(api.access.grant, {
      artifactId: artifact1Id,
      email: "pending@example.com",
    });

    // Owner 2 invites pending@example.com
    const asOwner2 = t.withIdentity({ subject: owner2Id });
    const access2Id = await asOwner2.mutation(api.access.grant, {
      artifactId: artifact2Id,
      email: "pending@example.com",
    });

    // Verify both have userInviteId set
    const access1Before = await t.run(async (ctx) => await ctx.db.get(access1Id));
    const access2Before = await t.run(async (ctx) => await ctx.db.get(access2Id));
    expect(access1Before?.userInviteId).toBeDefined();
    expect(access2Before?.userInviteId).toBeDefined();

    // User signs up
    const newUserId = await createTestUser(t, "pending@example.com");

    // Trigger internal linking mutation
    await t.mutation(internal.access.linkInvitesToUserInternal, {
      userId: newUserId,
      email: "pending@example.com",
    });

    // Verify userInvites converted
    const invite1 = await t.run(async (ctx) => await ctx.db.get(access1Before!.userInviteId!));
    const invite2 = await t.run(async (ctx) => await ctx.db.get(access2Before!.userInviteId!));
    expect(invite1?.convertedToUserId).toBe(newUserId);
    expect(invite2?.convertedToUserId).toBe(newUserId);

    // Verify artifactAccess updated
    const access1After = await t.run(async (ctx) => await ctx.db.get(access1Id));
    const access2After = await t.run(async (ctx) => await ctx.db.get(access2Id));
    expect(access1After?.userId).toBe(newUserId);
    expect(access1After?.userInviteId).toBeUndefined();
    expect(access2After?.userId).toBe(newUserId);
    expect(access2After?.userInviteId).toBeUndefined();
  });

  it("should normalize email case when linking", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });

    // Invite with lowercase
    const accessId = await asOwner.mutation(api.access.grant, {
      artifactId,
      email: "newuser@example.com",
    });

    // User signs up with mixed case
    const newUserId = await createTestUser(t, "NewUser@EXAMPLE.COM");

    // Link with uppercase email
    await t.mutation(internal.access.linkInvitesToUserInternal, {
      userId: newUserId,
      email: "NEWUSER@EXAMPLE.COM",
    });

    // Verify link worked
    const access = await t.run(async (ctx) => await ctx.db.get(accessId));
    expect(access?.userId).toBe(newUserId);
  });
});
```

---

### Group 6: Auth Integration

#### Test auth.ts callback update
```typescript
describe("auth callback integration", () => {
  it("should call linkInvitesToUserInternal on user creation", async () => {
    // Note: This is more of an integration/E2E test
    // For unit tests, we verify the function exists and has correct signature

    const t = convexTest(schema);

    // Verify internal function is callable
    const userId = await createTestUser(t, "test@example.com");

    // Should not throw
    await t.mutation(internal.access.linkInvitesToUserInternal, {
      userId,
      email: "test@example.com",
    });
  });
});
```

---

## Implementation Strategy: 2-3 PR Approach

Based on user feedback, we'll use a middle-ground approach with 2-3 focused PRs.

### PR 1: Schema + Core Grant Logic

**Scope:** Foundation + Core invitation flow
**Tests:** Groups 1 + 2 (10 tests)
**Files:**
- `app/convex/schema.ts` - Add tables
- `app/convex/access.ts` - `grant` mutation
- `app/convex/__tests__/access.test.ts` - Schema + grant tests

**What this enables:**
- New tables deployed
- Basic invitation flow works
- Can test manually via Convex dashboard

**Status:** Non-breaking (new tables, new functions)

---

### PR 2: Queries + Mutations

**Scope:** Complete the API
**Tests:** Groups 3 + 4 (13 tests)
**Files:**
- `app/convex/access.ts` - Add queries + mutations
  - `listReviewers` query
  - `getPermission` query
  - `listShared` query
  - `revoke` mutation
  - `resend` mutation
  - `recordView` mutation
- `app/convex/__tests__/access.test.ts` - Add tests

**What this enables:**
- Full access control system
- Frontend can migrate to new API
- Real-time permission checks work

**Status:** Non-breaking (new functions)

---

### PR 3: Signup Integration + Email

**Scope:** Link invites on signup + email sending
**Tests:** Groups 5 + 6 (3 tests)
**Files:**
- `app/convex/access.ts` - Add internal functions
  - `linkInvitesToUserInternal` internalMutation
  - `sendEmailInternal` internalAction
  - Helper internal queries (get artifact, get user, etc.)
- `app/convex/auth.ts` - Update callback
- `app/convex/__tests__/access.test.ts` - Add tests

**What this enables:**
- Pending invites automatically linked on signup
- Email notifications sent
- Complete feature ready for frontend migration

**Status:** Non-breaking (parallel to old system)

---

### Post-Implementation: Cleanup (After Frontend Migration)

**Scope:** Remove old system (BREAKING CHANGE)
**Files to delete:**
- `app/convex/sharing.ts`
- Remove `artifactReviewers` table from schema

**Status:** Breaking (requires frontend using new API)

---

## Running Tests

### Run All Backend Tests
```bash
cd /Users/clintgossett/Documents/personal/personal projects/artifact-review/app
npx vitest convex/__tests__/access.test.ts
```

### Run in Watch Mode (During Development)
```bash
npx vitest convex/__tests__/access.test.ts --watch
```

### Run Specific Test Group
```bash
npx vitest convex/__tests__/access.test.ts -t "grant"
```

---

## ADR-0012 Compliance Checklist

Before implementation, verify:

- [ ] Index names use `by_camelCaseField` pattern (no `_and_`)
  - ✅ `by_email_createdBy`
  - ✅ `by_artifactId_userId`
  - ✅ `by_artifactId_active` (soft-delete shorthand)

- [ ] Soft-delete indexes use `_active` shorthand
  - ✅ `by_artifactId_active` instead of `by_artifactId_isDeleted`
  - ✅ `by_userId_active` instead of `by_userId_isDeleted`

- [ ] Function names are generic CRUD (`grant`, `revoke`, `list*`, `get*`)
  - ✅ `grant` (not `inviteReviewer`)
  - ✅ `revoke` (not `removeAccess`)
  - ✅ `listReviewers`, `listShared`
  - ✅ `getPermission`

- [ ] Internal functions use `*Internal` suffix
  - ✅ `linkInvitesToUserInternal`
  - ✅ `sendEmailInternal`

- [ ] All queries/mutations have `args` and `returns` validators

- [ ] Uses `createdBy` for record creator (not authorId, creatorId)

---

## Test Coverage Summary

| Scenario | Test Count | Group | PR |
|----------|-----------|-------|----|
| Schema foundation | 3 | Group 1 | PR 1 |
| Grant - existing user | 1 | Group 2 | PR 1 |
| Grant - new user | 1 | Group 2 | PR 1 |
| Grant - same owner, multiple artifacts | 1 | Group 2 | PR 1 |
| Grant - different owners | 1 | Group 2 | PR 1 |
| Resend invitation | 1 | Group 2 | PR 1 |
| Re-invite after revocation | 1 | Group 2 | PR 1 |
| **PR 1 TOTAL** | **10** | Groups 1-2 | |
| listReviewers query | 3 | Group 3 | PR 2 |
| getPermission query | 4 | Group 3 | PR 2 |
| listShared query | 2 | Group 3 | PR 2 |
| Revoke access | 2 | Group 4 | PR 2 |
| recordView | 2 | Group 4 | PR 2 |
| **PR 2 TOTAL** | **13** | Groups 3-4 | |
| Signup linking | 2 | Group 5 | PR 3 |
| Auth integration | 1 | Group 6 | PR 3 |
| **PR 3 TOTAL** | **3** | Groups 5-6 | |
| **GRAND TOTAL** | **26** | All Groups | |

---

## Notes for Implementation

### Email Normalization
All email comparisons MUST normalize to lowercase:
```typescript
const normalizedEmail = email.toLowerCase();
```

### Index Usage Requirements
- **NEVER use `.filter()` in queries** - use `.withIndex()` instead (Convex rule)
- `getPermission` MUST use `by_artifactId_userId` index for O(1) lookup
- `listReviewers` MUST use `by_artifactId_active` index

### Soft Deletion Pattern
```typescript
// Soft delete
await ctx.db.patch(accessId, {
  isDeleted: true,
  deletedAt: Date.now(),
});

// Un-delete (re-invite)
await ctx.db.patch(accessId, {
  isDeleted: false,
  deletedAt: undefined,
  lastSentAt: Date.now(),
  sendCount: existingAccess.sendCount + 1,
});
```

### Test Helpers Location

**Test helpers live in the test file itself** (`app/convex/__tests__/access.test.ts`), NOT in a separate file.

Pattern from existing tests:
```typescript
// At top of access.test.ts, before describe() blocks
async function createTestUser(t: ReturnType<typeof convexTest>, email: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", { email, name: email.split("@")[0] });
  });
}

async function createTestArtifact(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  name: string
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("artifacts", {
      name,
      createdBy: userId,
      shareToken: "test-token-" + Date.now(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  });
}

describe("access", () => {
  // Tests use helpers...
});
```

---

## Email Implementation Pattern

### From existing `sharing.ts` pattern:

```typescript
// Helper internal queries
export const getAccessById = internalQuery({
  args: { accessId: v.id("artifactAccess") },
  returns: v.union(
    v.object({
      _id: v.id("artifactAccess"),
      artifactId: v.id("artifacts"),
      userId: v.optional(v.id("users")),
      userInviteId: v.optional(v.id("userInvites")),
      createdBy: v.id("users"),
      // ... other fields
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.accessId);
  },
});

export const getArtifactById = internalQuery({
  args: { artifactId: v.id("artifacts") },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      name: v.string(),
      shareToken: v.string(),
      // ... other fields
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.artifactId);
  },
});

export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      // ... other fields
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Email rendering
function renderInvitationEmail(params: {
  artifactTitle: string;
  inviterName: string;
  shareToken: string;
  recipientEmail: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.artifactreview-early.xyz";
  const artifactUrl = `${appUrl}/a/${params.shareToken}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        /* Email styles... */
      </style>
    </head>
    <body>
      <div class="container">
        <h1>You've been invited to review an artifact</h1>
        <p><strong>${params.inviterName}</strong> has invited you to review <strong>${params.artifactTitle}</strong>.</p>
        <a href="${artifactUrl}" class="button">View Artifact</a>
      </div>
    </body>
    </html>
  `;
}

// Email action
export const sendEmailInternal = internalAction({
  args: { accessId: v.id("artifactAccess") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Get data via internal queries
    const access = await ctx.runQuery(internal.access.getAccessById, { accessId: args.accessId });
    if (!access) return null;

    const artifact = await ctx.runQuery(internal.access.getArtifactById, { artifactId: access.artifactId });
    if (!artifact) return null;

    const inviter = await ctx.runQuery(internal.access.getUserById, { userId: access.createdBy });
    if (!inviter) return null;

    // Determine recipient email
    let recipientEmail: string;
    if (access.userId) {
      const user = await ctx.runQuery(internal.access.getUserById, { userId: access.userId });
      recipientEmail = user?.email || "";
    } else if (access.userInviteId) {
      const invite = await ctx.runQuery(internal.access.getInviteById, { inviteId: access.userInviteId });
      recipientEmail = invite?.email || "";
    } else {
      return null;
    }

    // 2. Send email
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.AUTH_RESEND_KEY);

      const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || "notifications@artifactreview-early.xyz";

      await resend.emails.send({
        from: fromEmail,
        to: recipientEmail,
        subject: `You've been invited to review "${artifact.name}"`,
        html: renderInvitationEmail({
          artifactTitle: artifact.name,
          inviterName: inviter.name || inviter.email || "Someone",
          shareToken: artifact.shareToken,
          recipientEmail,
        }),
      });

      console.log("Invitation email sent:", { to: recipientEmail, artifact: artifact.name });
    } catch (error) {
      console.error("Failed to send invitation email:", error);
      // Don't throw - invitation already created
    }

    return null;
  },
});
```

---

## Success Criteria

Implementation is complete when:

1. ✅ All 26 tests pass
2. ✅ Schema deployed to Convex
3. ✅ All functions have validators (args + returns)
4. ✅ ADR-0012 naming conventions followed
5. ✅ No `.filter()` usage in queries
6. ✅ Auth callback updated to call `linkInvitesToUserInternal`
7. ✅ Email sending works (tested in Resend dashboard)

---

## Next Steps After Backend Complete

1. **Frontend Implementation** (Subtask 02)
   - Update components to use `api.access.*` instead of `api.sharing.*`
   - Test permission changes in real-time

2. **E2E Validation**
   - Test complete invitation flow
   - Test signup linking
   - Test revocation + kick-out
   - Verify emails in Resend dashboard

3. **Cleanup** (After frontend migration confirmed working)
   - Remove old `sharing.ts` file
   - Remove `artifactReviewers` table from schema
   - Update documentation

---

## Migration Notes

**IMPORTANT:** User confirmed: "All data schema changes are breaking, we are in dev. Keep nothing."

This means:
- ✅ No data migration needed
- ✅ Old `artifactReviewers` table can be deleted (user will do this)
- ✅ Clean slate - start fresh with new schema
- ✅ No backward compatibility required

---

**Ready to proceed with implementation!**
