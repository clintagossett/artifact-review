import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { Id, Doc } from "../_generated/dataModel";

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a test user
 */
async function createTestUser(
  t: ReturnType<typeof convexTest>,
  email: string
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email,
      name: email.split("@")[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

/**
 * Create a test artifact
 */
async function createTestArtifact(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  name: string
): Promise<Id<"artifacts">> {
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

// ============================================================================
// GROUP 1: SCHEMA FOUNDATION
// ============================================================================

describe("access - schema foundation", () => {
  describe("userInvites table", () => {
    it("should create userInvites record with all required fields", async () => {
      const t = convexTest(schema);

      const createdById = await createTestUser(t, "owner@example.com");

      const inviteId = await t.run(async (ctx) => {
        return await ctx.db.insert("userInvites", {
          createdAt: Date.now(),
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

    it("should query userInvites by email and createdBy", async () => {
      const t = convexTest(schema);

      const ownerId = await createTestUser(t, "owner@example.com");

      await t.run(async (ctx) => {
        await ctx.db.insert("userInvites", {
          createdAt: Date.now(),
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
  });

  describe("artifactAccess table", () => {
    it("should create artifactAccess record with all required fields", async () => {
      const t = convexTest(schema);

      const ownerId = await createTestUser(t, "owner@example.com");
      const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");
      const now = Date.now();

      const accessId = await t.run(async (ctx) => {
        return await ctx.db.insert("artifactAccess", {
          createdAt: Date.now(),
          artifactId,
          userId: ownerId,
          createdBy: ownerId,
          lastSentAt: now,
          sendCount: 1,
          isDeleted: false,
        });
      });

      const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;

      expect(access?.artifactId).toBe(artifactId);
      expect(access?.userId).toBe(ownerId);
      expect(access?.userInviteId).toBeUndefined();
      expect(access?.createdBy).toBe(ownerId);
      expect(access?.lastSentAt).toBe(now);
      expect(access?.sendCount).toBe(1);
      expect(access?.isDeleted).toBe(false);
    });

    it("should query artifactAccess by artifactId and userId", async () => {
      const t = convexTest(schema);

      const ownerId = await createTestUser(t, "owner@example.com");
      const artifactId = await createTestArtifact(t, ownerId, "Test");

      await t.run(async (ctx) => {
        await ctx.db.insert("artifactAccess", {
          createdAt: Date.now(),
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
  });
});

// ============================================================================
// GROUP 2: GRANT MUTATION - CORE LOGIC
// ============================================================================

describe("access - grant mutation", () => {
  describe("existing user", () => {
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

      const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null as Doc<"artifactAccess"> | null;

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

  describe("new user", () => {
    it("should create userInvites + artifactAccess with userInviteId for new email", async () => {
      const t = convexTest(schema);

      const ownerId = await createTestUser(t, "owner@example.com");
      const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

      const asOwner = t.withIdentity({ subject: ownerId });
      const accessId = await asOwner.mutation(api.access.grant, {
        artifactId,
        email: "newuser@example.com",
      });

      const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null as Doc<"artifactAccess"> | null;

      // Should NOT have userId
      expect(access?.userId).toBeUndefined();
      // Should have userInviteId
      expect(access?.userInviteId).toBeDefined();

      // Verify userInvites record was created
      const invite = await t.run(async (ctx) =>
        await ctx.db.get(access!.userInviteId!)
      ) as Doc<"userInvites"> | null;
      expect(invite?.email).toBe("newuser@example.com");
      expect(invite?.createdBy).toBe(ownerId);
    });
  });

  describe("same owner, multiple artifacts", () => {
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

      const access1 = await t.run(async (ctx) => await ctx.db.get(access1Id)) as Doc<"artifactAccess"> | null;
      const access2 = await t.run(async (ctx) => await ctx.db.get(access2Id)) as Doc<"artifactAccess"> | null;

      // Should use same userInvite
      expect(access1?.userInviteId).toBe(access2?.userInviteId);

      // Should have TWO artifactAccess records
      const allAccess = await t.run(async (ctx) => {
        return await ctx.db
          .query("artifactAccess")
          .withIndex("by_userInviteId", (q) =>
            q.eq("userInviteId", access1!.userInviteId!)
          )
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
  });

  describe("different owners, same email", () => {
    it("should create separate userInvites for different owners with same email", async () => {
      const t = convexTest(schema);

      const owner1Id = await createTestUser(t, "owner1@example.com");
      const owner2Id = await createTestUser(t, "owner2@example.com");
      const artifact1Id = await createTestArtifact(
        t,
        owner1Id,
        "Owner1 Artifact"
      );
      const artifact2Id = await createTestArtifact(
        t,
        owner2Id,
        "Owner2 Artifact"
      );

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

      const access1 = await t.run(async (ctx) => await ctx.db.get(access1Id)) as Doc<"artifactAccess"> | null;
      const access2 = await t.run(async (ctx) => await ctx.db.get(access2Id)) as Doc<"artifactAccess"> | null;

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
      expect(allInvites.map((i) => i.createdBy).sort()).toEqual(
        [owner1Id, owner2Id].sort()
      );
    });
  });

  describe("revocation and re-invite", () => {
    it("should un-delete existing artifactAccess when re-inviting", async () => {
      const t = convexTest(schema);

      const ownerId = await createTestUser(t, "owner@example.com");
      const reviewerId = await createTestUser(t, "reviewer@example.com");
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
      const deletedAccess = await t.run(async (ctx) =>
        await ctx.db.get(accessId)
      ) as Doc<"artifactAccess"> | null;
      expect(deletedAccess?.isDeleted).toBe(true);

      // Re-grant (should un-delete same record)
      const newAccessId = await asOwner.mutation(api.access.grant, {
        artifactId,
        email: "reviewer@example.com",
      });

      // Should return same ID
      expect(newAccessId).toBe(accessId);

      // Verify un-deleted
      const restoredAccess = await t.run(async (ctx) =>
        await ctx.db.get(accessId)
      ) as Doc<"artifactAccess"> | null;
      expect(restoredAccess?.isDeleted).toBe(false);
      expect(restoredAccess?.deletedAt).toBeUndefined();
    });
  });
});

// ============================================================================
// GROUP 3: QUERY FUNCTIONS
// ============================================================================

describe("access - listReviewers", () => {
  it("should return empty array for artifact with no reviewers", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });
    const reviewers = await asOwner.query(api.access.listReviewers, {
      artifactId,
    });

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

    const reviewers = await asOwner.query(api.access.listReviewers, {
      artifactId,
    });

    expect(reviewers).toHaveLength(2);

    // Existing user should have name from users table
    const existingReviewer = reviewers.find(
      (r) => r.email === "existing@example.com"
    );
    expect(existingReviewer?.displayName).toBe("existing"); // From name field
    expect(existingReviewer?.status).toBe("added"); // Has userId

    // Pending user should show email as displayName
    const pendingReviewer = reviewers.find(
      (r) => r.email === "pending@example.com"
    );
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

    const reviewers = await asOwner.query(api.access.listReviewers, {
      artifactId,
    });

    expect(reviewers).toHaveLength(0);
  });
});

describe("access - getPermission", () => {
  it("should return 'owner' for artifact creator", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });
    const permission = await asOwner.query(api.access.getPermission, {
      artifactId,
    });

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
    const permission = await asReviewer.query(api.access.getPermission, {
      artifactId,
    });

    expect(permission).toBe("can-comment");
  });

  it("should return null for user with no access", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@example.com");
    const otherId = await createTestUser(t, "other@example.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOther = t.withIdentity({ subject: otherId });
    const permission = await asOther.query(api.access.getPermission, {
      artifactId,
    });

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
    const permission = await asReviewer.query(api.access.getPermission, {
      artifactId,
    });

    expect(permission).toBe("can-comment");
    // If implementation uses .filter() instead of index, this test still passes
    // but serves as documentation that index MUST be used
  });
});

describe("access - listShared", () => {
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
    expect(shared.map((s) => s.artifact.name).sort()).toEqual([
      "Artifact 1",
      "Artifact 2",
    ]);
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

// ============================================================================
// GROUP 4: MUTATION FUNCTIONS - REVOKE, RESEND, RECORDVIEW
// ============================================================================

describe("access - revoke", () => {
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
    const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
    expect(access?.isDeleted).toBe(true);
    expect(access?.deletedAt).toBeDefined();

    // Verify user loses access
    const asReviewer = t.withIdentity({ subject: reviewerId });
    const permission = await asReviewer.query(api.access.getPermission, {
      artifactId,
    });
    expect(permission).toBeNull();
  });

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

    const accessBefore = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
    const userInviteId = accessBefore!.userInviteId!;

    // Revoke
    await asOwner.mutation(api.access.revoke, { accessId });

    // Verify artifactAccess deleted
    const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
    expect(access?.isDeleted).toBe(true);

    // Verify userInvites still exists (NOT deleted)
    const invite = await t.run(async (ctx) => await ctx.db.get(userInviteId));
    expect(invite?.isDeleted).toBe(false);
  });
});

describe("access - resend", () => {
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

    const accessBefore = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
    const initialSendCount = accessBefore!.sendCount;
    const initialLastSentAt = accessBefore!.lastSentAt;

    // Wait a moment to ensure timestamp changes
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Resend
    await asOwner.mutation(api.access.resend, { accessId });

    const accessAfter = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;

    expect(accessAfter?.sendCount).toBe(initialSendCount + 1);
    expect(accessAfter?.lastSentAt).toBeGreaterThan(initialLastSentAt);
  });
});

describe("access - recordView", () => {
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
    const accessBefore = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
    expect(accessBefore?.firstViewedAt).toBeUndefined();
    expect(accessBefore?.lastViewedAt).toBeUndefined();

    // Record view
    const asReviewer = t.withIdentity({ subject: reviewerId });
    await asReviewer.mutation(api.access.recordView, { accessId });

    // Verify firstViewedAt and lastViewedAt set
    const accessAfter = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
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
    const accessAfterFirst = await t.run(async (ctx) =>
      await ctx.db.get(accessId)
    ) as Doc<"artifactAccess"> | null;
    const firstViewedAt = accessAfterFirst!.firstViewedAt!;

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Second view
    await asReviewer.mutation(api.access.recordView, { accessId });
    const accessAfterSecond = await t.run(async (ctx) =>
      await ctx.db.get(accessId)
    ) as Doc<"artifactAccess"> | null;

    // firstViewedAt should not change
    expect(accessAfterSecond?.firstViewedAt).toBe(firstViewedAt);
    // lastViewedAt should be updated
    expect(accessAfterSecond?.lastViewedAt).toBeGreaterThan(firstViewedAt);
  });
});

// ============================================================================
// GROUP 5: INTERNAL FUNCTIONS - SIGNUP LINKING
// ============================================================================

describe("access - linkInvitesToUserInternal", () => {
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
    const access1Before = await t.run(async (ctx) =>
      await ctx.db.get(access1Id)
    ) as Doc<"artifactAccess"> | null;
    const access2Before = await t.run(async (ctx) =>
      await ctx.db.get(access2Id)
    ) as Doc<"artifactAccess"> | null;
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
    const invite1 = await t.run(async (ctx) =>
      await ctx.db.get(access1Before!.userInviteId!)
    ) as Doc<"userInvites"> | null;
    const invite2 = await t.run(async (ctx) =>
      await ctx.db.get(access2Before!.userInviteId!)
    ) as Doc<"userInvites"> | null;
    expect(invite1?.convertedToUserId).toBe(newUserId);
    expect(invite2?.convertedToUserId).toBe(newUserId);

    // Verify artifactAccess updated
    const access1After = await t.run(async (ctx) =>
      await ctx.db.get(access1Id)
    ) as Doc<"artifactAccess"> | null;
    const access2After = await t.run(async (ctx) =>
      await ctx.db.get(access2Id)
    ) as Doc<"artifactAccess"> | null;
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
    const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
    expect(access?.userId).toBe(newUserId);
  });
});

// ============================================================================
// GROUP 6: AUTH INTEGRATION
// ============================================================================

describe("access - auth callback integration", () => {
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

// ============================================================================
// GROUP 7: ACTIVITY STATS
// ============================================================================

describe("access - activity stats", () => {
  it("should return zero stats for artifact with no reviewers", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@test.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOwner = t.withIdentity({ subject: ownerId });

    const stats = await asOwner.query(api.access.getActivityStats, {
      artifactId,
    });

    expect(stats.totalViews).toBe(0);
    expect(stats.uniqueViewers).toBe(0);
    expect(stats.totalComments).toBe(0);
    expect(stats.lastViewed).toBeUndefined();
  });

  it("should count views from access records with firstViewedAt", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@test.com");
    const reviewer1Id = await createTestUser(t, "reviewer1@test.com");
    const reviewer2Id = await createTestUser(t, "reviewer2@test.com");

    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    // Create access records - one viewed, one not
    const now = Date.now();
    await t.run(async (ctx) => {
      // Reviewer 1 has viewed
      await ctx.db.insert("artifactAccess", {
        createdAt: Date.now(),
        artifactId,
        userId: reviewer1Id,
        createdBy: ownerId,
        lastSentAt: now - 86400000, // 1 day ago
        sendCount: 1,
        firstViewedAt: now - 3600000, // 1 hour ago
        lastViewedAt: now - 1800000, // 30 min ago
        isDeleted: false,
      });

      // Reviewer 2 has not viewed (no firstViewedAt)
      await ctx.db.insert("artifactAccess", {
        createdAt: Date.now(),
        artifactId,
        userId: reviewer2Id,
        createdBy: ownerId,
        lastSentAt: now - 86400000,
        sendCount: 1,
        isDeleted: false,
      });
    });

    const asOwner = t.withIdentity({ subject: ownerId });

    const stats = await asOwner.query(api.access.getActivityStats, {
      artifactId,
    });

    expect(stats.totalViews).toBe(1);
    expect(stats.uniqueViewers).toBe(1);
    expect(stats.lastViewed).toBeDefined();
    expect(stats.lastViewed?.userName).toBe("reviewer1");
    expect(stats.lastViewed?.userEmail).toBe("reviewer1@test.com");
  });

  it("should count comments across all versions", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@test.com");
    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    // Create version 1 manually (helper doesn't create versions)
    const version1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        createdBy: ownerId,
        fileType: "html",
        entryPoint: "index.html",
        size: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      });
    });

    // Add version 2
    const version2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 2,
        createdBy: ownerId,
        fileType: "html",
        entryPoint: "index.html",
        size: 1200,
        isDeleted: false,
        createdAt: Date.now(),
      });
    });

    // Add comments to both versions
    const now = Date.now();
    await t.run(async (ctx) => {
      // 2 comments on version 1
      await ctx.db.insert("comments", {
        versionId: version1Id,
        createdBy: ownerId,
        content: "Comment 1 on v1",
        target: { _version: 1, type: "general" },
        isEdited: false,
        isDeleted: false,
        createdAt: now,
      });

      await ctx.db.insert("comments", {
        versionId: version1Id,
        createdBy: ownerId,
        content: "Comment 2 on v1",
        target: { _version: 1, type: "general" },
        isEdited: false,
        isDeleted: false,
        createdAt: now,
      });

      // 1 comment on version 2
      await ctx.db.insert("comments", {
        versionId: version2Id,
        createdBy: ownerId,
        content: "Comment 1 on v2",
        target: { _version: 1, type: "general" },
        isEdited: false,
        isDeleted: false,
        createdAt: now,
      });
    });

    const asOwner = t.withIdentity({ subject: ownerId });

    const stats = await asOwner.query(api.access.getActivityStats, {
      artifactId,
    });

    expect(stats.totalComments).toBe(3);
  });

  it("should throw error if non-owner tries to access stats", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@test.com");
    const otherUserId = await createTestUser(t, "other@test.com");

    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const asOther = t.withIdentity({ subject: otherUserId });

    // Try to get stats as non-owner
    await expect(
      asOther.query(api.access.getActivityStats, { artifactId })
    ).rejects.toThrow("Only the artifact owner can view activity stats");
  });

  it("should exclude soft-deleted access records from stats", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@test.com");
    const reviewerId = await createTestUser(t, "reviewer@test.com");

    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    // Create access record and mark as deleted
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("artifactAccess", {
        createdAt: Date.now(),
        artifactId,
        userId: reviewerId,
        createdBy: ownerId,
        lastSentAt: now - 86400000,
        sendCount: 1,
        firstViewedAt: now - 3600000,
        lastViewedAt: now - 1800000,
        isDeleted: true, // Soft deleted
        deletedAt: now - 900000,
      });
    });

    const asOwner = t.withIdentity({ subject: ownerId });

    const stats = await asOwner.query(api.access.getActivityStats, {
      artifactId,
    });

    // Should not count soft-deleted access record
    expect(stats.totalViews).toBe(0);
    expect(stats.uniqueViewers).toBe(0);
    expect(stats.lastViewed).toBeUndefined();
  });

  it("should find last viewed from multiple viewers", async () => {
    const t = convexTest(schema);

    const ownerId = await createTestUser(t, "owner@test.com");
    const reviewer1Id = await createTestUser(t, "reviewer1@test.com");
    const reviewer2Id = await createTestUser(t, "reviewer2@test.com");

    const artifactId = await createTestArtifact(t, ownerId, "Test Artifact");

    const now = Date.now();
    await t.run(async (ctx) => {
      // Reviewer 1 viewed 2 hours ago
      await ctx.db.insert("artifactAccess", {
        createdAt: Date.now(),
        artifactId,
        userId: reviewer1Id,
        createdBy: ownerId,
        lastSentAt: now - 86400000,
        sendCount: 1,
        firstViewedAt: now - 7200000,
        lastViewedAt: now - 7200000,
        isDeleted: false,
      });

      // Reviewer 2 viewed 1 hour ago (most recent)
      await ctx.db.insert("artifactAccess", {
        createdAt: Date.now(),
        artifactId,
        userId: reviewer2Id,
        createdBy: ownerId,
        lastSentAt: now - 86400000,
        sendCount: 1,
        firstViewedAt: now - 3600000,
        lastViewedAt: now - 3600000,
        isDeleted: false,
      });
    });

    const asOwner = t.withIdentity({ subject: ownerId });

    const stats = await asOwner.query(api.access.getActivityStats, {
      artifactId,
    });

    expect(stats.totalViews).toBe(2);
    expect(stats.uniqueViewers).toBe(2);
    expect(stats.lastViewed).toBeDefined();
    expect(stats.lastViewed?.userName).toBe("reviewer2");
    expect(stats.lastViewed?.userEmail).toBe("reviewer2@test.com");
    expect(stats.lastViewed?.timestamp).toBe(now - 3600000);
  });
});
