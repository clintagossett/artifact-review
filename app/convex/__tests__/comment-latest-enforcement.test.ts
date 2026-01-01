/**
 * Unit tests for comment enforcement on latest version only
 * Task 00021 - Subtask 01: Version Management
 *
 * Tests that comments can only be created on the latest version of an artifact.
 */

import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

describe("comment latest version enforcement", () => {
  let t: ReturnType<typeof convexTest>;
  let asUser: ReturnType<typeof t.withIdentity>;
  let userId: Id<"users">;
  let artifactId: Id<"artifacts">;
  let version1Id: Id<"artifactVersions">;
  let version2Id: Id<"artifactVersions">;

  beforeEach(async () => {
    t = convexTest(schema);

    // Create a test user
    userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        emailVerificationTime: Date.now(),
      });
    });

    // Create authenticated context
    asUser = t.withIdentity({ subject: userId });

    // Create artifact with two versions
    const result = await t.run(async (ctx) => {
      const shareToken = "testcmt";
      const now = Date.now();

      const artifactId = await ctx.db.insert("artifacts", {
        title: "Test Artifact",
        creatorId: userId,
        shareToken,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });

      const version1Id = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        fileSize: 1000,
        isDeleted: false,
        createdAt: now,
      });

      const version2Id = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 2,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        fileSize: 2000,
        isDeleted: false,
        createdAt: now + 1000,
      });

      return { artifactId, version1Id, version2Id };
    });

    artifactId = result.artifactId;
    version1Id = result.version1Id;
    version2Id = result.version2Id;
  });

  it("should allow comments on the latest version", async () => {
    // Create comment on version 2 (latest)
    const commentId = await asUser.mutation(api.comments.create, {
      versionId: version2Id,
      content: "This is a comment on the latest version",
      target: { _version: 1, type: "general" },
    });

    expect(commentId).toBeDefined();

    // Verify comment was created
    const comments = await asUser.query(api.comments.getByVersion, {
      versionId: version2Id,
    });

    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe("This is a comment on the latest version");
  });

  it("should reject comments on non-latest version", async () => {
    // Try to create comment on version 1 (not latest)
    await expect(
      asUser.mutation(api.comments.create, {
        versionId: version1Id,
        content: "This should fail",
        target: { _version: 1, type: "general" },
      })
    ).rejects.toThrow("Comments are only allowed on the latest version");
  });

  it("should allow comments on old version after latest is deleted", async () => {
    // Delete version 2 (the latest)
    await t.run(async (ctx) => {
      await ctx.db.patch(version2Id, {
        isDeleted: true,
        deletedAt: Date.now(),
        deletedBy: userId,
      });
    });

    // Now version 1 should be the latest, so comments should be allowed
    const commentId = await asUser.mutation(api.comments.create, {
      versionId: version1Id,
      content: "Comment after latest was deleted",
      target: { _version: 1, type: "general" },
    });

    expect(commentId).toBeDefined();

    // Verify comment was created
    const comments = await asUser.query(api.comments.getByVersion, {
      versionId: version1Id,
    });

    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe("Comment after latest was deleted");
  });

  it("should reject comments when version becomes non-latest after new version added", async () => {
    // First, verify we can comment on version 2
    await asUser.mutation(api.comments.create, {
      versionId: version2Id,
      content: "Initial comment",
      target: { _version: 1, type: "general" },
    });

    // Add version 3
    const version3Id = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 3,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        fileSize: 3000,
        isDeleted: false,
        createdAt: now,
      });
    });

    // Now version 2 is no longer latest, comments should fail
    await expect(
      asUser.mutation(api.comments.create, {
        versionId: version2Id,
        content: "This should fail now",
        target: { _version: 1, type: "general" },
      })
    ).rejects.toThrow("Comments are only allowed on the latest version");

    // But version 3 should work
    const commentId = await asUser.mutation(api.comments.create, {
      versionId: version3Id,
      content: "Comment on new latest",
      target: { _version: 1, type: "general" },
    });

    expect(commentId).toBeDefined();
  });

  it("should provide clear error message for non-latest version", async () => {
    // Try to create comment on version 1 and verify error message
    try {
      await asUser.mutation(api.comments.create, {
        versionId: version1Id,
        content: "This should fail with clear message",
        target: { _version: 1, type: "general" },
      });
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      expect(String(error)).toContain("Comments are only allowed on the latest version");
    }
  });
});
