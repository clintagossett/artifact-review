import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { Id, Doc } from "../_generated/dataModel";

// ============================================================================
// TEST HELPERS
// ============================================================================

async function createTestUser(
  t: ReturnType<typeof convexTest>,
  email: string
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email,
      name: email.split("@")[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const orgId = await ctx.db.insert("organizations", {
      name: "Test Org",
      createdAt: Date.now(),
      createdBy: userId,
    });

    await ctx.db.insert("members", {
      userId,
      organizationId: orgId,
      roles: ["owner"],
      createdAt: Date.now(),
      createdBy: userId,
    });

    return userId;
  });
}

async function createTestArtifact(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  name: string
): Promise<{ artifactId: Id<"artifacts">; shareToken: string }> {
  return await t.run(async (ctx) => {
    const membership: any = await (ctx.db.query("members") as any)
      .withIndex("by_userId", (q: any) => q.eq("userId", userId as any))
      .first();

    if (!membership) throw new Error("Test User missing organization");

    const now = Date.now();
    const shareToken = "test-token-" + now;
    const artifactId = await ctx.db.insert("artifacts", {
      name,
      createdBy: userId,
      organizationId: membership.organizationId,
      shareToken,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create a version
    await ctx.db.insert("artifactVersions", {
      artifactId,
      number: 1,
      createdBy: userId,
      fileType: "html",
      entryPoint: "index.html",
      size: 1000,
      isDeleted: false,
      createdAt: now,
    });

    return { artifactId, shareToken };
  });
}

// ============================================================================
// AGENT API - LIST ARTIFACTS
// ============================================================================

describe("agentApi - listArtifacts", () => {
  it("should return empty array when user has no artifacts", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");

    const artifacts = await t.query(internal.agentApi.listArtifacts, { userId });

    expect(artifacts).toHaveLength(0);
  });

  it("should return all artifacts for a user", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");

    await createTestArtifact(t, userId, "Artifact 1");
    await createTestArtifact(t, userId, "Artifact 2");

    const artifacts = await t.query(internal.agentApi.listArtifacts, { userId });

    expect(artifacts).toHaveLength(2);
    expect(artifacts.map(a => a.name).sort()).toEqual(["Artifact 1", "Artifact 2"]);
  });

  it("should include stats for each artifact", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

    // Add a comment
    const version = await t.run(async (ctx) => {
      return await ctx.db
        .query("artifactVersions")
        .withIndex("by_artifactId_active", (q: any) =>
          q.eq("artifactId", artifactId).eq("isDeleted", false)
        )
        .first();
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("comments", {
        versionId: version!._id,
        createdBy: userId,
        content: "Test comment",
        target: { _version: 1, type: "general" },
        isEdited: false,
        isDeleted: false,
        createdAt: Date.now(),
      });
    });

    const artifacts = await t.query(internal.agentApi.listArtifacts, { userId });

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].stats.commentCount).toBe(1);
    expect(artifacts[0].stats.unresolvedCommentCount).toBe(1);
    expect(artifacts[0].latestVersion).toBe(1);
  });

  it("should not return deleted artifacts", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");

    const { artifactId } = await createTestArtifact(t, userId, "Deleted Artifact");

    // Soft delete the artifact
    await t.run(async (ctx) => {
      await ctx.db.patch(artifactId, { isDeleted: true });
    });

    const artifacts = await t.query(internal.agentApi.listArtifacts, { userId });

    expect(artifacts).toHaveLength(0);
  });
});

// ============================================================================
// AGENT API - SHARE LINK
// ============================================================================

describe("agentApi - sharelink", () => {
  describe("getShareLink", () => {
    it("should return null when no share link exists", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      const result = await t.query(internal.agentApi.getShareLink, { artifactId });

      expect(result).toBeNull();
    });

    it("should return share link details when exists", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      // Create share link manually
      await t.run(async (ctx) => {
        await ctx.db.insert("artifactShares", {
          token: "test-public-token",
          artifactId,
          capabilities: { readComments: true, writeComments: false },
          enabled: true,
          createdBy: userId,
          createdAt: Date.now(),
        });
      });

      const result = await t.query(internal.agentApi.getShareLink, { artifactId });

      expect(result).not.toBeNull();
      expect(result!.enabled).toBe(true);
      expect(result!.capabilities.readComments).toBe(true);
      expect(result!.capabilities.writeComments).toBe(false);
      expect(result!.shareUrl).toContain("test-public-token");
    });
  });

  describe("createShareLink", () => {
    it("should create a new share link", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      const result = await t.mutation(internal.agentApi.createShareLink, {
        artifactId,
        userId,
      });

      expect(result.enabled).toBe(true);
      expect(result.capabilities.readComments).toBe(true);
      expect(result.shareUrl).toContain("/share/");
    });

    it("should create share link with custom capabilities", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      const result = await t.mutation(internal.agentApi.createShareLink, {
        artifactId,
        userId,
        enabled: true,
        capabilities: { readComments: true, writeComments: true },
      });

      expect(result.capabilities.readComments).toBe(true);
      expect(result.capabilities.writeComments).toBe(true);
    });

    it("should update existing share link if called again", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      // Create initial
      const result1 = await t.mutation(internal.agentApi.createShareLink, {
        artifactId,
        userId,
        capabilities: { readComments: false, writeComments: false },
      });

      // Update with new capabilities
      const result2 = await t.mutation(internal.agentApi.createShareLink, {
        artifactId,
        userId,
        capabilities: { readComments: true, writeComments: true },
      });

      // Should have same URL but updated capabilities
      expect(result2.shareUrl).toBe(result1.shareUrl);
      expect(result2.capabilities.readComments).toBe(true);
      expect(result2.capabilities.writeComments).toBe(true);
    });
  });

  describe("updateShareLink", () => {
    it("should update enabled state", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      // Create share link first
      await t.mutation(internal.agentApi.createShareLink, {
        artifactId,
        userId,
      });

      // Disable it
      const result = await t.mutation(internal.agentApi.updateShareLink, {
        artifactId,
        userId,
        enabled: false,
      });

      expect(result).not.toBeNull();
      expect(result!.enabled).toBe(false);
    });

    it("should return null if no share link exists", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      const result = await t.mutation(internal.agentApi.updateShareLink, {
        artifactId,
        userId,
        enabled: false,
      });

      expect(result).toBeNull();
    });
  });

  describe("deleteShareLink", () => {
    it("should disable an existing share link", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      // Create share link
      await t.mutation(internal.agentApi.createShareLink, {
        artifactId,
        userId,
      });

      // Delete it
      const deleted = await t.mutation(internal.agentApi.deleteShareLink, {
        artifactId,
        userId,
      });

      expect(deleted).toBe(true);

      // Verify it's disabled
      const shareLink = await t.query(internal.agentApi.getShareLink, { artifactId });
      expect(shareLink!.enabled).toBe(false);
    });

    it("should return false if no share link exists", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      const deleted = await t.mutation(internal.agentApi.deleteShareLink, {
        artifactId,
        userId,
      });

      expect(deleted).toBe(false);
    });
  });
});

// ============================================================================
// AGENT API - ACCESS MANAGEMENT
// ============================================================================

describe("agentApi - access", () => {
  describe("listAccess", () => {
    it("should return empty array when no access granted", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      const access = await t.query(internal.agentApi.listAccess, { artifactId });

      expect(access).toHaveLength(0);
    });

    it("should list granted access with user details", async () => {
      const t = convexTest(schema);
      const ownerId = await createTestUser(t, "owner@test.com");
      const reviewerId = await createTestUser(t, "reviewer@test.com");
      const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

      // Grant access to reviewer
      await t.mutation(internal.agentApi.grantAccess, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
      });

      const access = await t.query(internal.agentApi.listAccess, { artifactId });

      expect(access).toHaveLength(1);
      expect(access[0].email).toBe("reviewer@test.com");
      expect(access[0].role).toBe("can-comment");
      expect(access[0].status).toBe("added");
    });

    it("should show pending status for non-existent users", async () => {
      const t = convexTest(schema);
      const ownerId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

      // Grant access to non-existent user
      await t.mutation(internal.agentApi.grantAccess, {
        artifactId,
        userId: ownerId,
        email: "pending@test.com",
      });

      const access = await t.query(internal.agentApi.listAccess, { artifactId });

      expect(access).toHaveLength(1);
      expect(access[0].email).toBe("pending@test.com");
      expect(access[0].status).toBe("pending");
    });
  });

  describe("grantAccess", () => {
    it("should grant access to existing user", async () => {
      const t = convexTest(schema);
      const ownerId = await createTestUser(t, "owner@test.com");
      const reviewerId = await createTestUser(t, "reviewer@test.com");
      const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

      const accessId = await t.mutation(internal.agentApi.grantAccess, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
      });

      expect(accessId).toBeDefined();

      const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
      expect(access?.userId).toBe(reviewerId);
      expect(access?.userInviteId).toBeUndefined();
    });

    it("should create invite for non-existent user", async () => {
      const t = convexTest(schema);
      const ownerId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

      const accessId = await t.mutation(internal.agentApi.grantAccess, {
        artifactId,
        userId: ownerId,
        email: "newuser@test.com",
      });

      expect(accessId).toBeDefined();

      const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
      expect(access?.userId).toBeUndefined();
      expect(access?.userInviteId).toBeDefined();
    });

    it("should be idempotent for same user", async () => {
      const t = convexTest(schema);
      const ownerId = await createTestUser(t, "owner@test.com");
      await createTestUser(t, "reviewer@test.com");
      const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

      const accessId1 = await t.mutation(internal.agentApi.grantAccess, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
      });

      const accessId2 = await t.mutation(internal.agentApi.grantAccess, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
      });

      // Should return same ID
      expect(accessId1).toBe(accessId2);
    });

    it("should un-delete previously revoked access", async () => {
      const t = convexTest(schema);
      const ownerId = await createTestUser(t, "owner@test.com");
      await createTestUser(t, "reviewer@test.com");
      const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

      // Grant
      const accessId = await t.mutation(internal.agentApi.grantAccess, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
      });

      // Revoke
      await t.mutation(internal.agentApi.revokeAccess, {
        accessId,
        userId: ownerId,
      });

      // Re-grant
      const newAccessId = await t.mutation(internal.agentApi.grantAccess, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
      });

      expect(newAccessId).toBe(accessId);

      const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
      expect(access?.isDeleted).toBe(false);
    });
  });

  describe("revokeAccess", () => {
    it("should soft delete access record", async () => {
      const t = convexTest(schema);
      const ownerId = await createTestUser(t, "owner@test.com");
      await createTestUser(t, "reviewer@test.com");
      const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

      const accessId = await t.mutation(internal.agentApi.grantAccess, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
      });

      const revoked = await t.mutation(internal.agentApi.revokeAccess, {
        accessId,
        userId: ownerId,
      });

      expect(revoked).toBe(true);

      const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
      expect(access?.isDeleted).toBe(true);
    });

    it("should return false for already-deleted access", async () => {
      const t = convexTest(schema);
      const ownerId = await createTestUser(t, "owner@test.com");
      await createTestUser(t, "reviewer@test.com");
      const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

      // Grant and immediately revoke
      const accessId = await t.mutation(internal.agentApi.grantAccess, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
      });

      await t.mutation(internal.agentApi.revokeAccess, {
        accessId,
        userId: ownerId,
      });

      // Try to revoke again - should return false
      const revoked = await t.mutation(internal.agentApi.revokeAccess, {
        accessId,
        userId: ownerId,
      });

      expect(revoked).toBe(false);
    });
  });
});

// ============================================================================
// AGENT API - STATS
// ============================================================================

describe("agentApi - getStats", () => {
  it("should return artifact info", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId, shareToken } = await createTestArtifact(t, userId, "Test Artifact");

    const stats = await t.query(internal.agentApi.getStats, { artifactId });

    expect(stats.artifact.id).toBe(artifactId);
    expect(stats.artifact.name).toBe("Test Artifact");
    expect(stats.artifact.shareToken).toBe(shareToken);
  });

  it("should count comments across versions", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

    // Get the version
    const version = await t.run(async (ctx) => {
      return await ctx.db
        .query("artifactVersions")
        .withIndex("by_artifactId_active", (q: any) =>
          q.eq("artifactId", artifactId).eq("isDeleted", false)
        )
        .first();
    });

    // Add comments
    await t.run(async (ctx) => {
      await ctx.db.insert("comments", {
        versionId: version!._id,
        createdBy: userId,
        content: "Comment 1",
        target: { _version: 1, type: "general" },
        isEdited: false,
        isDeleted: false,
        createdAt: Date.now(),
      });

      await ctx.db.insert("comments", {
        versionId: version!._id,
        createdBy: userId,
        content: "Comment 2",
        target: { _version: 1, type: "general" },
        isEdited: false,
        isDeleted: false,
        createdAt: Date.now(),
        resolvedUpdatedAt: Date.now(), // This one is resolved
      });
    });

    const stats = await t.query(internal.agentApi.getStats, { artifactId });

    expect(stats.stats.commentCount).toBe(2);
    expect(stats.stats.unresolvedCommentCount).toBe(1);
  });

  it("should return version breakdown", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

    const stats = await t.query(internal.agentApi.getStats, { artifactId });

    expect(stats.versions).toHaveLength(1);
    expect(stats.versions[0].number).toBe(1);
    expect(stats.versions[0].commentCount).toBe(0);
  });

  it("should count views from access records", async () => {
    const t = convexTest(schema);
    const ownerId = await createTestUser(t, "owner@test.com");
    const reviewerId = await createTestUser(t, "reviewer@test.com");
    const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

    // Grant access with view record
    await t.run(async (ctx) => {
      await ctx.db.insert("artifactAccess", {
        artifactId,
        userId: reviewerId,
        createdBy: ownerId,
        createdAt: Date.now(),
        lastSentAt: Date.now(),
        sendCount: 1,
        firstViewedAt: Date.now() - 3600000,
        lastViewedAt: Date.now() - 1800000,
        isDeleted: false,
      });
    });

    const stats = await t.query(internal.agentApi.getStats, { artifactId });

    expect(stats.stats.totalViews).toBe(1);
    expect(stats.stats.uniqueViewers).toBe(1);
    expect(stats.stats.lastViewedAt).toBeDefined();
    expect(stats.stats.lastViewedBy).toBe("reviewer");
  });

  it("should throw error for non-existent artifact", async () => {
    const t = convexTest(schema);

    await expect(
      t.query(internal.agentApi.getStats, { artifactId: "invalid-id" as any })
    ).rejects.toThrow();
  });
});
