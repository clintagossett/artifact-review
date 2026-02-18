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

      const shareId = await t.mutation(internal.sharesInternal.createShareLinkInternal, {
        artifactId,
        userId,
      });

      expect(shareId).toBeDefined();

      // Verify created share
      const share = await t.run(async (ctx) => await ctx.db.get(shareId)) as any;
      expect(share.enabled).toBe(true);
      // Default capabilities when none specified
      expect(share.capabilities.readComments).toBe(false);
      expect(share.capabilities.writeComments).toBe(false);
    });

    it("should create share link with custom capabilities", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      const shareId = await t.mutation(internal.sharesInternal.createShareLinkInternal, {
        artifactId,
        userId,
        capabilities: { readComments: true, writeComments: true },
      });

      const share = await t.run(async (ctx) => await ctx.db.get(shareId)) as any;
      expect(share.capabilities.readComments).toBe(true);
      expect(share.capabilities.writeComments).toBe(true);
    });

    it("should be idempotent - return existing share if called again", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      // Create initial
      const shareId1 = await t.mutation(internal.sharesInternal.createShareLinkInternal, {
        artifactId,
        userId,
        capabilities: { readComments: false, writeComments: false },
      });

      // Call again - should return same ID (idempotent)
      const shareId2 = await t.mutation(internal.sharesInternal.createShareLinkInternal, {
        artifactId,
        userId,
        capabilities: { readComments: true, writeComments: true },
      });

      // Should return same share ID
      expect(shareId2).toBe(shareId1);
    });
  });

  describe("updateShareLink", () => {
    it("should update enabled state", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      // Create share link first
      const shareId = await t.mutation(internal.sharesInternal.createShareLinkInternal, {
        artifactId,
        userId,
      });

      // Disable it
      await t.mutation(internal.sharesInternal.updateShareLinkInternal, {
        shareId,
        userId,
        enabled: false,
      });

      // Verify updated
      const share = await t.run(async (ctx) => await ctx.db.get(shareId)) as any;
      expect(share.enabled).toBe(false);
    });

    it("should throw if no share link exists", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      await createTestArtifact(t, userId, "Test Artifact");

      await expect(
        t.mutation(internal.sharesInternal.updateShareLinkInternal, {
          shareId: "invalid-id" as any,
          userId,
          enabled: false,
        })
      ).rejects.toThrow();
    });
  });

  describe("deleteShareLink", () => {
    it("should disable an existing share link", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      const { artifactId } = await createTestArtifact(t, userId, "Test Artifact");

      // Create share link
      const shareId = await t.mutation(internal.sharesInternal.createShareLinkInternal, {
        artifactId,
        userId,
      });

      // Delete it
      await t.mutation(internal.sharesInternal.deleteShareLinkInternal, {
        shareId,
        userId,
      });

      // Verify it's disabled
      const share = await t.run(async (ctx) => await ctx.db.get(shareId)) as any;
      expect(share.enabled).toBe(false);
    });

    it("should throw if no share link exists", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t, "owner@test.com");
      await createTestArtifact(t, userId, "Test Artifact");

      await expect(
        t.mutation(internal.sharesInternal.deleteShareLinkInternal, {
          shareId: "invalid-id" as any,
          userId,
        })
      ).rejects.toThrow();
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
      await t.mutation(internal.accessInternal.grantAccessInternal, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
        skipEmail: true,
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
      await t.mutation(internal.accessInternal.grantAccessInternal, {
        artifactId,
        userId: ownerId,
        email: "pending@test.com",
        skipEmail: true,
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

      const accessId = await t.mutation(internal.accessInternal.grantAccessInternal, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
        skipEmail: true,
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

      const accessId = await t.mutation(internal.accessInternal.grantAccessInternal, {
        artifactId,
        userId: ownerId,
        email: "newuser@test.com",
        skipEmail: true,
      });

      expect(accessId).toBeDefined();

      const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
      expect(access?.userId).toBeUndefined();
      expect(access?.userInviteId).toBeDefined();
    });

    it("should throw for duplicate access (same user)", async () => {
      const t = convexTest(schema);
      const ownerId = await createTestUser(t, "owner@test.com");
      await createTestUser(t, "reviewer@test.com");
      const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

      await t.mutation(internal.accessInternal.grantAccessInternal, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
        skipEmail: true,
      });

      // Second grant should throw (user already has access)
      await expect(
        t.mutation(internal.accessInternal.grantAccessInternal, {
          artifactId,
          userId: ownerId,
          email: "reviewer@test.com",
          skipEmail: true,
        })
      ).rejects.toThrow("already has access");
    });

    it("should un-delete previously revoked access", async () => {
      const t = convexTest(schema);
      const ownerId = await createTestUser(t, "owner@test.com");
      await createTestUser(t, "reviewer@test.com");
      const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

      // Grant
      const accessId = await t.mutation(internal.accessInternal.grantAccessInternal, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
        skipEmail: true,
      });

      // Revoke
      await t.mutation(internal.accessInternal.revokeAccessInternal, {
        accessId,
        userId: ownerId,
      });

      // Re-grant
      const newAccessId = await t.mutation(internal.accessInternal.grantAccessInternal, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
        skipEmail: true,
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

      const accessId = await t.mutation(internal.accessInternal.grantAccessInternal, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
        skipEmail: true,
      });

      await t.mutation(internal.accessInternal.revokeAccessInternal, {
        accessId,
        userId: ownerId,
      });

      const access = await t.run(async (ctx) => await ctx.db.get(accessId)) as Doc<"artifactAccess"> | null;
      expect(access?.isDeleted).toBe(true);
    });

    it("should throw for already-deleted access", async () => {
      const t = convexTest(schema);
      const ownerId = await createTestUser(t, "owner@test.com");
      await createTestUser(t, "reviewer@test.com");
      const { artifactId } = await createTestArtifact(t, ownerId, "Test Artifact");

      // Grant and immediately revoke
      const accessId = await t.mutation(internal.accessInternal.grantAccessInternal, {
        artifactId,
        userId: ownerId,
        email: "reviewer@test.com",
        skipEmail: true,
      });

      await t.mutation(internal.accessInternal.revokeAccessInternal, {
        accessId,
        userId: ownerId,
      });

      // Try to revoke again - should throw
      await expect(
        t.mutation(internal.accessInternal.revokeAccessInternal, {
          accessId,
          userId: ownerId,
        })
      ).rejects.toThrow("already deleted");
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
