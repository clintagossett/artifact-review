/**
 * Test: Read Permission Helpers (Phase 2 - Step 1)
 * Task 00018 - Refine Single-File Artifact Upload and Versioning
 * Subtask: 02 - Phase 2 Retrieval + Read Permissions
 *
 * Tests for centralized read permission helpers in convex/lib/permissions.ts
 */

import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

describe("Read Permission Helpers", () => {
  describe("getArtifactPermission", () => {
    it("should return 'owner' for artifact creator", async () => {
      const t = convexTest(schema);

      // Create user
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "owner@example.com",
          name: "Owner User",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create artifact
      const artifactId = await t.run(async (ctx) => {
        const shareToken = "test123";
        return await ctx.db.insert("artifacts", {
          name: "Test Artifact",
          createdBy: userId,
          shareToken,
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Check permission as owner (simulate authenticated user)
      const asOwner = t.withIdentity({ subject: userId });
      const permission = await asOwner.run(async (ctx) => {
        const { getArtifactPermission } = await import(
          "../lib/permissions"
        );
        return await getArtifactPermission(ctx, artifactId);
      });

      expect(permission).toBe("owner");
    });

    it("should return 'reviewer' for invited reviewer", async () => {
      const t = convexTest(schema);

      // Create owner
      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "owner@example.com",
          name: "Owner",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create reviewer
      const reviewerId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "reviewer@example.com",
          name: "Reviewer",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create artifact
      const artifactId = await t.run(async (ctx) => {
        return await ctx.db.insert("artifacts", {
          name: "Test Artifact",
          createdBy: ownerId,
          shareToken: "test456",
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Invite reviewer (Path A: existing user, no userInvite needed)
      await t.run(async (ctx) => {
        return await ctx.db.insert("artifactAccess", {
          createdAt: Date.now(),
          artifactId,
          userId: reviewerId,
          createdBy: ownerId,
          lastSentAt: Date.now(),
          sendCount: 1,
          isDeleted: false,
        });
      });

      // Check permission as reviewer (simulate authenticated user)
      const asReviewer = t.withIdentity({ subject: reviewerId });
      const permission = await asReviewer.run(async (ctx) => {
        const { getArtifactPermission } = await import(
          "../lib/permissions"
        );
        return await getArtifactPermission(ctx, artifactId);
      });

      expect(permission).toBe("reviewer");
    });

    it("should return 'public' for unauthenticated user", async () => {
      const t = convexTest(schema);

      // Create owner
      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "owner@example.com",
          name: "Owner",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create artifact
      const artifactId = await t.run(async (ctx) => {
        return await ctx.db.insert("artifacts", {
          name: "Test Artifact",
          createdBy: ownerId,
          shareToken: "public789",
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Check permission without authentication
      const permission = await t.run(async (ctx) => {
        const { getArtifactPermission } = await import(
          "../lib/permissions"
        );
        return await getArtifactPermission(ctx, artifactId);
      });

      // Should return "public" since artifact exists and has shareToken
      expect(permission).toBe("public");
    });

    it("should return null for deleted artifact", async () => {
      const t = convexTest(schema);

      // Create owner
      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "owner@example.com",
          name: "Owner",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create deleted artifact
      const artifactId = await t.run(async (ctx) => {
        return await ctx.db.insert("artifacts", {
          name: "Deleted Artifact",
          createdBy: ownerId,
          shareToken: "deleted123",
          isDeleted: true,
          deletedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Check permission - should return null
      const permission = await t.run(async (ctx) => {
        const { getArtifactPermission } = await import(
          "../lib/permissions"
        );
        return await getArtifactPermission(ctx, artifactId);
      });

      expect(permission).toBeNull();
    });

    it("should return null for non-existent artifact", async () => {
      const t = convexTest(schema);

      const fakeId = "jd7abc123" as Id<"artifacts">;

      const permission = await t.run(async (ctx) => {
        const { getArtifactPermission } = await import(
          "../lib/permissions"
        );
        return await getArtifactPermission(ctx, fakeId);
      });

      expect(permission).toBeNull();
    });
  });

  describe("canViewArtifact", () => {
    it("should return true for owner", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "owner@example.com",
          name: "Owner",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const artifactId = await t.run(async (ctx) => {
        return await ctx.db.insert("artifacts", {
          name: "Test Artifact",
          createdBy: userId,
          shareToken: "test123",
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const canView = await t.run(async (ctx) => {
        const { canViewArtifact } = await import(
          "../lib/permissions"
        );
        return await canViewArtifact(ctx, artifactId);
      });

      expect(canView).toBe(true);
    });

    it("should return true for public user", async () => {
      const t = convexTest(schema);

      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "owner@example.com",
          name: "Owner",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const artifactId = await t.run(async (ctx) => {
        return await ctx.db.insert("artifacts", {
          name: "Test Artifact",
          createdBy: ownerId,
          shareToken: "public123",
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const canView = await t.run(async (ctx) => {
        const { canViewArtifact } = await import(
          "../lib/permissions"
        );
        return await canViewArtifact(ctx, artifactId);
      });

      expect(canView).toBe(true);
    });

    it("should return false for deleted artifact", async () => {
      const t = convexTest(schema);

      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "owner@example.com",
          name: "Owner",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const artifactId = await t.run(async (ctx) => {
        return await ctx.db.insert("artifacts", {
          name: "Deleted Artifact",
          createdBy: ownerId,
          shareToken: "deleted123",
          isDeleted: true,
          deletedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const canView = await t.run(async (ctx) => {
        const { canViewArtifact } = await import(
          "../lib/permissions"
        );
        return await canViewArtifact(ctx, artifactId);
      });

      expect(canView).toBe(false);
    });
  });

  describe("canViewVersion", () => {
    it("should return true if can view parent artifact", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "owner@example.com",
          name: "Owner",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const artifactId = await t.run(async (ctx) => {
        return await ctx.db.insert("artifacts", {
          name: "Test Artifact",
          createdBy: userId,
          shareToken: "test123",
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const versionId = await t.run(async (ctx) => {
        return await ctx.db.insert("artifactVersions", {
          artifactId,
          number: 1,
          createdBy: userId,
          fileType: "html",
          entryPoint: "index.html",
          size: 1024,
          isDeleted: false,
          createdAt: Date.now(),
        });
      });

      const canView = await t.run(async (ctx) => {
        const { canViewVersion } = await import(
          "../lib/permissions"
        );
        return await canViewVersion(ctx, versionId);
      });

      expect(canView).toBe(true);
    });

    it("should return false for deleted version", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "owner@example.com",
          name: "Owner",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const artifactId = await t.run(async (ctx) => {
        return await ctx.db.insert("artifacts", {
          name: "Test Artifact",
          createdBy: userId,
          shareToken: "test123",
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const versionId = await t.run(async (ctx) => {
        return await ctx.db.insert("artifactVersions", {
          artifactId,
          number: 1,
          createdBy: userId,
          fileType: "html",
          entryPoint: "index.html",
          size: 1024,
          isDeleted: true,
          deletedAt: Date.now(),
          createdAt: Date.now(),
        });
      });

      const canView = await t.run(async (ctx) => {
        const { canViewVersion } = await import(
          "../lib/permissions"
        );
        return await canViewVersion(ctx, versionId);
      });

      expect(canView).toBe(false);
    });
  });

  describe("getArtifactByShareToken", () => {
    it("should return artifact and permission for valid token", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "owner@example.com",
          name: "Owner",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const shareToken = "validToken123";
      await t.run(async (ctx) => {
        return await ctx.db.insert("artifacts", {
          name: "Test Artifact",
          createdBy: userId,
          shareToken,
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.run(async (ctx) => {
        const { getArtifactByShareToken } = await import(
          "../lib/permissions"
        );
        return await getArtifactByShareToken(ctx, shareToken);
      });

      expect(result).not.toBeNull();
      expect(result?.artifact.shareToken).toBe(shareToken);
      expect(result?.permission).toBe("public");
    });

    it("should return null for deleted artifact", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "owner@example.com",
          name: "Owner",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const shareToken = "deletedToken";
      await t.run(async (ctx) => {
        return await ctx.db.insert("artifacts", {
          name: "Deleted Artifact",
          createdBy: userId,
          shareToken,
          isDeleted: true,
          deletedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await t.run(async (ctx) => {
        const { getArtifactByShareToken } = await import(
          "../lib/permissions"
        );
        return await getArtifactByShareToken(ctx, shareToken);
      });

      expect(result).toBeNull();
    });

    it("should return null for invalid token", async () => {
      const t = convexTest(schema);

      const result = await t.run(async (ctx) => {
        const { getArtifactByShareToken } = await import(
          "../lib/permissions"
        );
        return await getArtifactByShareToken(ctx, "nonExistentToken");
      });

      expect(result).toBeNull();
    });
  });
});
