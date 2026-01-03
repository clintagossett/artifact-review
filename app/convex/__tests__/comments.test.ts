import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../_generated/api";
import { internal } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

/**
 * Commenting Backend Test Suite
 *
 * This file tests all commenting functionality using TDD methodology.
 * Total tests: 92
 *
 * Test organization:
 * - Permission Helpers (12 tests)
 * - Comment CRUD Operations (43 tests)
 * - Reply CRUD Operations (34 tests)
 * - Integration Tests (3 tests)
 */

// ============================================================================
// TEST DATA SETUP
// ============================================================================

/**
 * Sample target metadata for comments.
 * Represents a text selection in an accordion on page /faq.html
 */
const sampleTarget = {
  _version: 1,
  type: "text" as const,
  selectedText: "Contact our support team",
  page: "/faq.html",
  location: {
    containerType: "accordion" as const,
    containerLabel: "FAQ Section 3",
  },
};

/**
 * Test data structure returned by setupTestData helper
 */
interface TestData {
  ownerId: Id<"users">;
  reviewerId: Id<"users">;
  outsiderId: Id<"users">;
  artifactId: Id<"artifacts">;
  versionId: Id<"artifactVersions">;
}

/**
 * Create test data: 3 users, 1 artifact, 1 version, 1 reviewer invitation.
 *
 * Users:
 * - Alice (owner): Creates and owns the artifact
 * - Bob (reviewer): Invited reviewer with accepted status
 * - Charlie (outsider): Has account but no access to artifact
 *
 * The artifact is an HTML artifact owned by Alice, with Bob as a reviewer.
 */
async function setupTestData(t: ReturnType<typeof convexTest>): Promise<TestData> {
  // Create users
  const ownerId = await t.run(async (ctx) =>
    await ctx.db.insert("users", {
      name: "Alice Owner",
      email: "alice@example.com",
    })
  );

  const reviewerId = await t.run(async (ctx) =>
    await ctx.db.insert("users", {
      name: "Bob Reviewer",
      email: "bob@example.com",
    })
  );

  const outsiderId = await t.run(async (ctx) =>
    await ctx.db.insert("users", {
      name: "Charlie Outsider",
      email: "charlie@example.com",
    })
  );

  // Create artifact (owned by Alice)
  const asOwner = t.withIdentity({ subject: ownerId });
  const now = Date.now();
  const artifactId = await asOwner.run(async (ctx) =>
    await ctx.db.insert("artifacts", {
      name: "Test Artifact",
      createdBy: ownerId,
      shareToken: "test1234",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    })
  );

  // Create version with storage
  const storageId = await asOwner.run(async (ctx) => {
    // Create a mock storage ID by uploading a small blob
    return await ctx.storage.store(new Blob(["<html><body>Test</body></html>"]));
  });

  const versionId = await asOwner.run(async (ctx) =>
    await ctx.db.insert("artifactVersions", {
      artifactId,
      number: 1,
      createdBy: ownerId,
      fileType: "html",
      entryPoint: "index.html",
      fileSize: 100,
      isDeleted: false,
      createdAt: now,
    })
  );

  // Create artifact file for the version
  await asOwner.run(async (ctx) =>
    await ctx.db.insert("artifactFiles", {
      versionId,
      filePath: "index.html",
      storageId,
      mimeType: "text/html",
      fileSize: 100,
      isDeleted: false,
    })
  );

  // Add Bob as reviewer (Path A: existing user, no userInvite needed)
  await asOwner.run(async (ctx) => {
    await ctx.db.insert("artifactAccess", {
      artifactId,
      userId: reviewerId,
      createdBy: ownerId,
      lastSentAt: now,
      sendCount: 1,
      isDeleted: false,
    });
  });

  return { ownerId, reviewerId, outsiderId, artifactId, versionId };
}

// ============================================================================
// PHASE 1: PERMISSION HELPERS
// ============================================================================

describe.skip("Permission Helpers", () => {
  describe.skip("requireCommentPermission", () => {
    it("should return 'owner' for artifact owner", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const role = await asOwner.run(async (ctx) => {
        const { requireCommentPermission } = await import("../lib/commentPermissions");
        return await requireCommentPermission(ctx, versionId);
      });

      expect(role).toBe("owner");
    });

    it("should return 'can-comment' for invited reviewer", async () => {
      const t = convexTest(schema);
      const { reviewerId, versionId } = await setupTestData(t);

      const asReviewer = t.withIdentity({ subject: reviewerId });
      const role = await asReviewer.run(async (ctx) => {
        const { requireCommentPermission } = await import("../lib/commentPermissions");
        return await requireCommentPermission(ctx, versionId);
      });

      expect(role).toBe("can-comment");
    });

    it("should throw 'Authentication required' for unauthenticated user", async () => {
      const t = convexTest(schema);
      const { versionId } = await setupTestData(t);

      await expect(async () => {
        await t.run(async (ctx) => {
          const { requireCommentPermission } = await import("../lib/commentPermissions");
          return await requireCommentPermission(ctx, versionId);
        });
      }).rejects.toThrow("Authentication required");
    });

    it("should throw 'No permission to comment' for outsider", async () => {
      const t = convexTest(schema);
      const { outsiderId, versionId } = await setupTestData(t);

      const asOutsider = t.withIdentity({ subject: outsiderId });
      await expect(async () => {
        await asOutsider.run(async (ctx) => {
          const { requireCommentPermission } = await import("../lib/commentPermissions");
          return await requireCommentPermission(ctx, versionId);
        });
      }).rejects.toThrow("No permission to comment");
    });

    it("should throw 'Version not found' for deleted version", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      // Soft delete the version
      const asOwner = t.withIdentity({ subject: ownerId });
      await asOwner.run(async (ctx) => {
        await ctx.db.patch(versionId, {
          isDeleted: true,
          deletedAt: Date.now(),
        });
      });

      await expect(async () => {
        await asOwner.run(async (ctx) => {
          const { requireCommentPermission } = await import("../lib/commentPermissions");
          return await requireCommentPermission(ctx, versionId);
        });
      }).rejects.toThrow("Version not found");
    });

    it("should throw 'Artifact not found' for deleted artifact", async () => {
      const t = convexTest(schema);
      const { ownerId, artifactId, versionId } = await setupTestData(t);

      // Soft delete the artifact
      const asOwner = t.withIdentity({ subject: ownerId });
      await asOwner.run(async (ctx) => {
        await ctx.db.patch(artifactId, {
          isDeleted: true,
          deletedAt: Date.now(),
        });
      });

      await expect(async () => {
        await asOwner.run(async (ctx) => {
          const { requireCommentPermission } = await import("../lib/commentPermissions");
          return await requireCommentPermission(ctx, versionId);
        });
      }).rejects.toThrow("Artifact not found");
    });
  });

  describe.skip("canEditComment", () => {
    it("should return true when user is comment author", async () => {
      const t = convexTest(schema);
      const { ownerId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const canEdit = await asOwner.run(async (ctx) => {
        const { canEditComment } = await import("../lib/commentPermissions");
        return canEditComment(ownerId, ownerId);
      });

      expect(canEdit).toBe(true);
    });

    it("should return false when user is not comment author", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId } = await setupTestData(t);

      const asReviewer = t.withIdentity({ subject: reviewerId });
      const canEdit = await asReviewer.run(async (ctx) => {
        const { canEditComment } = await import("../lib/commentPermissions");
        return canEditComment(ownerId, reviewerId);
      });

      expect(canEdit).toBe(false);
    });
  });

  describe.skip("canDeleteComment", () => {
    it("should return true when user is comment author", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      // Create a comment by owner
      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.run(async (ctx) =>
        await ctx.db.insert("comments", {
          versionId,
          createdBy: ownerId,
          content: "Test comment",
          resolved: false,
          target: sampleTarget,
          isEdited: false,
          isDeleted: false,
          createdAt: Date.now(),
        })
      );

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      if (!comment) throw new Error("Comment not found");

      const canDelete = await asOwner.run(async (ctx) => {
        const { canDeleteComment } = await import("../lib/commentPermissions");
        return await canDeleteComment(ctx, comment, ownerId);
      });

      expect(canDelete).toBe(true);
    });

    it("should return true when user is artifact owner", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      // Create a comment by reviewer
      const asReviewer = t.withIdentity({ subject: reviewerId });
      const commentId = await asReviewer.run(async (ctx) =>
        await ctx.db.insert("comments", {
          versionId,
          createdBy: reviewerId,
          content: "Test comment",
          resolved: false,
          target: sampleTarget,
          isEdited: false,
          isDeleted: false,
          createdAt: Date.now(),
        })
      );

      const comment = await asReviewer.run(async (ctx) => await ctx.db.get(commentId));
      if (!comment) throw new Error("Comment not found");

      // Owner tries to delete reviewer's comment
      const asOwner = t.withIdentity({ subject: ownerId });
      const canDelete = await asOwner.run(async (ctx) => {
        const { canDeleteComment } = await import("../lib/commentPermissions");
        return await canDeleteComment(ctx, comment, ownerId);
      });

      expect(canDelete).toBe(true);
    });

    it("should return false when reviewer tries to delete another reviewer's comment", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      // Create another reviewer
      const reviewer2Id = await t.run(async (ctx) =>
        await ctx.db.insert("users", {
          name: "Reviewer 2",
          email: "reviewer2@example.com",
        })
      );

      const asOwner = t.withIdentity({ subject: ownerId });
      await asOwner.run(async (ctx) => {
        const artifactId = (await ctx.db.get(versionId))!.artifactId;

        // Add reviewer2 (Path A: existing user, no userInvite needed)
        await ctx.db.insert("artifactAccess", {
          artifactId,
          userId: reviewer2Id,
          createdBy: ownerId,
          lastSentAt: Date.now(),
          sendCount: 1,
          isDeleted: false,
        });
      });

      // Create a comment by reviewer 1
      const asReviewer = t.withIdentity({ subject: reviewerId });
      const commentId = await asReviewer.run(async (ctx) =>
        await ctx.db.insert("comments", {
          versionId,
          createdBy: reviewerId,
          content: "Test comment",
          resolved: false,
          target: sampleTarget,
          isEdited: false,
          isDeleted: false,
          createdAt: Date.now(),
        })
      );

      const comment = await asReviewer.run(async (ctx) => await ctx.db.get(commentId));
      if (!comment) throw new Error("Comment not found");

      // Reviewer 2 tries to delete reviewer 1's comment
      const asReviewer2 = t.withIdentity({ subject: reviewer2Id });
      const canDelete = await asReviewer2.run(async (ctx) => {
        const { canDeleteComment } = await import("../lib/commentPermissions");
        return await canDeleteComment(ctx, comment, reviewer2Id);
      });

      expect(canDelete).toBe(false);
    });
  });
});

// Test execution will continue in phases...
// This file will be extended with Phase 2, 3, and 4 tests
// ============================================================================
// PHASE 2: COMMENT CRUD OPERATIONS
// ============================================================================

describe.skip("Comment Operations", () => {
  describe.skip("create", () => {
    it("should allow owner to create comment with valid content", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "This is a test comment",
        target: sampleTarget,
      });

      expect(commentId).toBeDefined();

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment).not.toBeNull();
      expect(comment?.content).toBe("This is a test comment");
      expect(comment?.resolved).toBe(false);
      expect(comment?.isEdited).toBe(false);
      expect(comment?.isDeleted).toBe(false);
    });

    it("should allow reviewer to create comment", async () => {
      const t = convexTest(schema);
      const { reviewerId, versionId } = await setupTestData(t);

      const asReviewer = t.withIdentity({ subject: reviewerId });
      const commentId = await asReviewer.mutation(api.comments.create, {
        versionId,
        content: "Reviewer comment",
        target: sampleTarget,
      });

      expect(commentId).toBeDefined();
    });

    it("should not allow outsider to create comment", async () => {
      const t = convexTest(schema);
      const { outsiderId, versionId } = await setupTestData(t);

      const asOutsider = t.withIdentity({ subject: outsiderId });
      await expect(async () => {
        await asOutsider.mutation(api.comments.create, {
          versionId,
          content: "Outsider comment",
          target: sampleTarget,
        });
      }).rejects.toThrow("No permission");
    });

    it("should reject empty content after trim", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      await expect(async () => {
        await asOwner.mutation(api.comments.create, {
          versionId,
          content: "   ",
          target: sampleTarget,
        });
      }).rejects.toThrow("Comment content cannot be empty");
    });

    it("should reject content exceeding 10,000 characters", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const longContent = "a".repeat(10001);
      await expect(async () => {
        await asOwner.mutation(api.comments.create, {
          versionId,
          content: longContent,
          target: sampleTarget,
        });
      }).rejects.toThrow("exceeds maximum length");
    });

    it("should trim whitespace from content", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "  trimmed content  ",
        target: sampleTarget,
      });

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.content).toBe("trimmed content");
    });

    it("should store target metadata as-is", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.target).toEqual(sampleTarget);
    });

    it("should set createdAt timestamp", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const before = Date.now();
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });
      const after = Date.now();

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.createdAt).toBeGreaterThanOrEqual(before);
      expect(comment?.createdAt).toBeLessThanOrEqual(after);
    });

    it("should not have resolution tracking fields on creation", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.resolvedChangedBy).toBeUndefined();
      expect(comment?.resolvedChangedAt).toBeUndefined();
    });
  });

  describe.skip("getByVersion", () => {
    it("should allow owner to query their version", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Comment 1",
        target: sampleTarget,
      });

      const comments = await asOwner.query(api.comments.getByVersion, { versionId });
      expect(comments).toHaveLength(1);
      expect(comments[0].content).toBe("Comment 1");
    });

    it("should allow reviewer to query version", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Comment 1",
        target: sampleTarget,
      });

      const asReviewer = t.withIdentity({ subject: reviewerId });
      const comments = await asReviewer.query(api.comments.getByVersion, { versionId });
      expect(comments).toHaveLength(1);
    });

    it("should not allow outsider to query", async () => {
      const t = convexTest(schema);
      const { outsiderId, versionId } = await setupTestData(t);

      const asOutsider = t.withIdentity({ subject: outsiderId });
      await expect(async () => {
        await asOutsider.query(api.comments.getByVersion, { versionId });
      }).rejects.toThrow("No permission");
    });

    it("should return empty array when no comments", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const comments = await asOwner.query(api.comments.getByVersion, { versionId });
      expect(comments).toEqual([]);
    });

    it("should exclude soft-deleted comments", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Comment 1",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.softDelete, { commentId });

      const comments = await asOwner.query(api.comments.getByVersion, { versionId });
      expect(comments).toHaveLength(0);
    });

    it("should include author data", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Comment 1",
        target: sampleTarget,
      });

      const comments = await asOwner.query(api.comments.getByVersion, { versionId });
      expect(comments[0].author.name).toBe("Alice Owner");
      expect(comments[0].author.email).toBe("alice@example.com");
    });

    it("should include reply count", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Comment 1",
        target: sampleTarget,
      });

      await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply 1",
      });

      const comments = await asOwner.query(api.comments.getByVersion, { versionId });
      expect(comments[0].replyCount).toBe(1);
    });
  });

  describe.skip("updateContent", () => {
    it("should allow author to update own comment", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Original",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.updateContent, {
        commentId,
        content: "Updated",
      });

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.content).toBe("Updated");
      expect(comment?.isEdited).toBe(true);
      expect(comment?.editedAt).toBeDefined();
    });

    it("should not allow non-author to update", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Original",
        target: sampleTarget,
      });

      const asReviewer = t.withIdentity({ subject: reviewerId });
      await expect(async () => {
        await asReviewer.mutation(api.comments.updateContent, {
          commentId,
          content: "Updated",
        });
      }).rejects.toThrow("Only the comment author can edit");
    });

    it("should not allow owner to edit others' comments", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asReviewer = t.withIdentity({ subject: reviewerId });
      const commentId = await asReviewer.mutation(api.comments.create, {
        versionId,
        content: "Original",
        target: sampleTarget,
      });

      const asOwner = t.withIdentity({ subject: ownerId });
      await expect(async () => {
        await asOwner.mutation(api.comments.updateContent, {
          commentId,
          content: "Updated",
        });
      }).rejects.toThrow("Only the comment author can edit");
    });

    it("should reject empty content after trim", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Original",
        target: sampleTarget,
      });

      await expect(async () => {
        await asOwner.mutation(api.comments.updateContent, {
          commentId,
          content: "   ",
        });
      }).rejects.toThrow("Comment content cannot be empty");
    });

    it("should reject content exceeding 10,000 characters", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Original",
        target: sampleTarget,
      });

      const longContent = "a".repeat(10001);
      await expect(async () => {
        await asOwner.mutation(api.comments.updateContent, {
          commentId,
          content: longContent,
        });
      }).rejects.toThrow("exceeds maximum length");
    });

    it("should return null for no-op when content unchanged", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Same",
        target: sampleTarget,
      });

      const result = await asOwner.mutation(api.comments.updateContent, {
        commentId,
        content: "Same",
      });

      expect(result).toBeNull();

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.isEdited).toBe(false);
    });

    it("should not allow editing deleted comment", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Original",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.softDelete, { commentId });

      await expect(async () => {
        await asOwner.mutation(api.comments.updateContent, {
          commentId,
          content: "Updated",
        });
      }).rejects.toThrow("Comment has been deleted");
    });

    it("should throw for invalid commentId", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      // Create and delete a comment to get a valid but non-existent ID
      const tempId = await asOwner.run(async (ctx) =>
        await ctx.db.insert("comments", {
          versionId,
          createdBy: ownerId,
          content: "temp",
          resolved: false,
          target: {},
          isEdited: false,
          isDeleted: false,
          createdAt: Date.now(),
        })
      );
      await asOwner.run(async (ctx) => await ctx.db.delete(tempId));

      await expect(async () => {
        await asOwner.mutation(api.comments.updateContent, {
          commentId: tempId,
          content: "Updated",
        });
      }).rejects.toThrow("Comment not found");
    });

    it("should trim whitespace from content", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Original",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.updateContent, {
        commentId,
        content: "  trimmed  ",
      });

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.content).toBe("trimmed");
    });
  });

  describe.skip("toggleResolved", () => {
    it("should allow owner to toggle resolution", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.toggleResolved, { commentId });

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.resolved).toBe(true);
    });

    it("should allow reviewer to toggle resolution", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      const asReviewer = t.withIdentity({ subject: reviewerId });
      await asReviewer.mutation(api.comments.toggleResolved, { commentId });

      const comment = await asReviewer.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.resolved).toBe(true);
    });

    it("should set tracking fields on first toggle", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.toggleResolved, { commentId });

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.resolvedChangedBy).toBe(ownerId);
      expect(comment?.resolvedChangedAt).toBeDefined();
    });

    it("should update tracking fields on subsequent toggles", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.toggleResolved, { commentId });
      
      const asReviewer = t.withIdentity({ subject: reviewerId });
      await asReviewer.mutation(api.comments.toggleResolved, { commentId });

      const comment = await asReviewer.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.resolved).toBe(false);
      expect(comment?.resolvedChangedBy).toBe(reviewerId);
    });

    it("should not allow toggling deleted comment", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.softDelete, { commentId });

      await expect(async () => {
        await asOwner.mutation(api.comments.toggleResolved, { commentId });
      }).rejects.toThrow("Comment has been deleted");
    });

    it("should throw for invalid commentId", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const tempId = await asOwner.run(async (ctx) =>
        await ctx.db.insert("comments", {
          versionId,
          createdBy: ownerId,
          content: "temp",
          resolved: false,
          target: {},
          isEdited: false,
          isDeleted: false,
          createdAt: Date.now(),
        })
      );
      await asOwner.run(async (ctx) => await ctx.db.delete(tempId));

      await expect(async () => {
        await asOwner.mutation(api.comments.toggleResolved, { commentId: tempId });
      }).rejects.toThrow("Comment not found");
    });

    it("should not allow outsider to toggle", async () => {
      const t = convexTest(schema);
      const { ownerId, outsiderId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      const asOutsider = t.withIdentity({ subject: outsiderId });
      await expect(async () => {
        await asOutsider.mutation(api.comments.toggleResolved, { commentId });
      }).rejects.toThrow("No permission");
    });
  });

  describe.skip("softDelete", () => {
    it("should allow author to delete own comment", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.softDelete, { commentId });

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.isDeleted).toBe(true);
      expect(comment?.deletedBy).toBe(ownerId);
      expect(comment?.deletedAt).toBeDefined();
    });

    it("should allow owner to delete any comment", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asReviewer = t.withIdentity({ subject: reviewerId });
      const commentId = await asReviewer.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      const asOwner = t.withIdentity({ subject: ownerId });
      await asOwner.mutation(api.comments.softDelete, { commentId });

      const comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.isDeleted).toBe(true);
      expect(comment?.deletedBy).toBe(ownerId);
    });

    it("should not allow reviewer to delete others' comments", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      const asReviewer = t.withIdentity({ subject: reviewerId });
      await expect(async () => {
        await asReviewer.mutation(api.comments.softDelete, { commentId });
      }).rejects.toThrow("Only the comment author or artifact owner can delete");
    });

    it("should not allow outsider to delete any comment", async () => {
      const t = convexTest(schema);
      const { ownerId, outsiderId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      const asOutsider = t.withIdentity({ subject: outsiderId });
      await expect(async () => {
        await asOutsider.mutation(api.comments.softDelete, { commentId });
      }).rejects.toThrow("No permission");
    });

    it("should not allow deleting already deleted comment", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.softDelete, { commentId });

      await expect(async () => {
        await asOwner.mutation(api.comments.softDelete, { commentId });
      }).rejects.toThrow("Comment already deleted");
    });

    it("should throw for invalid commentId", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const tempId = await asOwner.run(async (ctx) =>
        await ctx.db.insert("comments", {
          versionId,
          createdBy: ownerId,
          content: "temp",
          resolved: false,
          target: {},
          isEdited: false,
          isDeleted: false,
          createdAt: Date.now(),
        })
      );
      await asOwner.run(async (ctx) => await ctx.db.delete(tempId));

      await expect(async () => {
        await asOwner.mutation(api.comments.softDelete, { commentId: tempId });
      }).rejects.toThrow("Comment not found");
    });

    it("should cascade to all replies", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply 1",
      });

      await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply 2",
      });

      await asOwner.mutation(api.comments.softDelete, { commentId });

      const replies = await asOwner.run(async (ctx) =>
        await ctx.db
          .query("commentReplies")
          .withIndex("by_commentId", (q) => q.eq("commentId", commentId))
          .collect()
      );

      expect(replies).toHaveLength(2);
      expect(replies.every((r) => r.isDeleted === true)).toBe(true);
      expect(replies.every((r) => r.deletedBy === ownerId)).toBe(true);
    });

    it("should set deletedBy and deletedAt on cascaded replies", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test",
        target: sampleTarget,
      });

      await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply 1",
      });

      await asOwner.mutation(api.comments.softDelete, { commentId });

      const replies = await asOwner.run(async (ctx) =>
        await ctx.db
          .query("commentReplies")
          .withIndex("by_commentId", (q) => q.eq("commentId", commentId))
          .collect()
      );

      expect(replies[0].deletedBy).toBe(ownerId);
      expect(replies[0].deletedAt).toBeDefined();
    });
  });
});

// ============================================================================
// PHASE 3: REPLY CRUD OPERATIONS
// ============================================================================

describe.skip("Reply Operations", () => {
  describe.skip("getReplies", () => {
    it("should allow owner to query replies", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply 1",
      });

      const replies = await asOwner.query(api.commentReplies.getReplies, { commentId });
      expect(replies).toHaveLength(1);
      expect(replies[0].content).toBe("Reply 1");
    });

    it("should allow reviewer to query replies", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply 1",
      });

      const asReviewer = t.withIdentity({ subject: reviewerId });
      const replies = await asReviewer.query(api.commentReplies.getReplies, { commentId });
      expect(replies).toHaveLength(1);
    });

    it("should not allow outsider to query", async () => {
      const t = convexTest(schema);
      const { ownerId, outsiderId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const asOutsider = t.withIdentity({ subject: outsiderId });
      await expect(async () => {
        await asOutsider.query(api.commentReplies.getReplies, { commentId });
      }).rejects.toThrow("No permission");
    });

    it("should return empty array when no replies", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replies = await asOwner.query(api.commentReplies.getReplies, { commentId });
      expect(replies).toEqual([]);
    });

    it("should exclude soft-deleted replies", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply 1",
      });

      await asOwner.mutation(api.commentReplies.softDeleteReply, { replyId });

      const replies = await asOwner.query(api.commentReplies.getReplies, { commentId });
      expect(replies).toHaveLength(0);
    });

    it("should include author data", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply 1",
      });

      const replies = await asOwner.query(api.commentReplies.getReplies, { commentId });
      expect(replies[0].author.name).toBe("Alice Owner");
      expect(replies[0].author.email).toBe("alice@example.com");
    });

    it("should not allow querying deleted comment", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.softDelete, { commentId });

      await expect(async () => {
        await asOwner.query(api.commentReplies.getReplies, { commentId });
      }).rejects.toThrow("Comment has been deleted");
    });
  });

  describe.skip("createReply", () => {
    it("should allow owner to create reply", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "This is a reply",
      });

      expect(replyId).toBeDefined();

      const reply = await asOwner.run(async (ctx) => await ctx.db.get(replyId));
      expect(reply).not.toBeNull();
      expect(reply?.content).toBe("This is a reply");
      expect(reply?.isEdited).toBe(false);
      expect(reply?.isDeleted).toBe(false);
    });

    it("should allow reviewer to create reply", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const asReviewer = t.withIdentity({ subject: reviewerId });
      const replyId = await asReviewer.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reviewer reply",
      });

      expect(replyId).toBeDefined();
    });

    it("should not allow outsider to create reply", async () => {
      const t = convexTest(schema);
      const { ownerId, outsiderId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const asOutsider = t.withIdentity({ subject: outsiderId });
      await expect(async () => {
        await asOutsider.mutation(api.commentReplies.createReply, {
          commentId,
          content: "Outsider reply",
        });
      }).rejects.toThrow("No permission");
    });

    it("should reject empty content after trim", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      await expect(async () => {
        await asOwner.mutation(api.commentReplies.createReply, {
          commentId,
          content: "   ",
        });
      }).rejects.toThrow("Reply content cannot be empty");
    });

    it("should reject content exceeding 5,000 characters", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const longContent = "a".repeat(5001);
      await expect(async () => {
        await asOwner.mutation(api.commentReplies.createReply, {
          commentId,
          content: longContent,
        });
      }).rejects.toThrow("exceeds maximum length");
    });

    it("should not allow replying to deleted comment", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      await asOwner.mutation(api.comments.softDelete, { commentId });

      await expect(async () => {
        await asOwner.mutation(api.commentReplies.createReply, {
          commentId,
          content: "Reply",
        });
      }).rejects.toThrow("Cannot reply to deleted comment");
    });

    it("should set createdAt timestamp", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const before = Date.now();
      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply",
      });
      const after = Date.now();

      const reply = await asOwner.run(async (ctx) => await ctx.db.get(replyId));
      expect(reply?.createdAt).toBeGreaterThanOrEqual(before);
      expect(reply?.createdAt).toBeLessThanOrEqual(after);
    });

    it("should trim whitespace from content", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "  trimmed reply  ",
      });

      const reply = await asOwner.run(async (ctx) => await ctx.db.get(replyId));
      expect(reply?.content).toBe("trimmed reply");
    });
  });

  describe.skip("updateReply", () => {
    it("should allow author to update own reply", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Original",
      });

      await asOwner.mutation(api.commentReplies.updateReply, {
        replyId,
        content: "Updated",
      });

      const reply = await asOwner.run(async (ctx) => await ctx.db.get(replyId));
      expect(reply?.content).toBe("Updated");
      expect(reply?.isEdited).toBe(true);
      expect(reply?.editedAt).toBeDefined();
    });

    it("should not allow non-author to update", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Original",
      });

      const asReviewer = t.withIdentity({ subject: reviewerId });
      await expect(async () => {
        await asReviewer.mutation(api.commentReplies.updateReply, {
          replyId,
          content: "Updated",
        });
      }).rejects.toThrow("Only the reply author can edit");
    });

    it("should not allow owner to edit others' replies", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const asReviewer = t.withIdentity({ subject: reviewerId });
      const replyId = await asReviewer.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Original",
      });

      await expect(async () => {
        await asOwner.mutation(api.commentReplies.updateReply, {
          replyId,
          content: "Updated",
        });
      }).rejects.toThrow("Only the reply author can edit");
    });

    it("should reject empty content after trim", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Original",
      });

      await expect(async () => {
        await asOwner.mutation(api.commentReplies.updateReply, {
          replyId,
          content: "   ",
        });
      }).rejects.toThrow("Reply content cannot be empty");
    });

    it("should reject content exceeding 5,000 characters", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Original",
      });

      const longContent = "a".repeat(5001);
      await expect(async () => {
        await asOwner.mutation(api.commentReplies.updateReply, {
          replyId,
          content: longContent,
        });
      }).rejects.toThrow("exceeds maximum length");
    });

    it("should set isEdited and editedAt", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Original",
      });

      const replyBefore = await asOwner.run(async (ctx) => await ctx.db.get(replyId));
      expect(replyBefore?.isEdited).toBe(false);
      expect(replyBefore?.editedAt).toBeUndefined();

      await asOwner.mutation(api.commentReplies.updateReply, {
        replyId,
        content: "Updated",
      });

      const replyAfter = await asOwner.run(async (ctx) => await ctx.db.get(replyId));
      expect(replyAfter?.isEdited).toBe(true);
      expect(replyAfter?.editedAt).toBeDefined();
    });

    it("should return null for no-op when content unchanged", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Same",
      });

      const result = await asOwner.mutation(api.commentReplies.updateReply, {
        replyId,
        content: "Same",
      });

      expect(result).toBeNull();

      const reply = await asOwner.run(async (ctx) => await ctx.db.get(replyId));
      expect(reply?.isEdited).toBe(false);
    });

    it("should not allow editing deleted reply", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Original",
      });

      await asOwner.mutation(api.commentReplies.softDeleteReply, { replyId });

      await expect(async () => {
        await asOwner.mutation(api.commentReplies.updateReply, {
          replyId,
          content: "Updated",
        });
      }).rejects.toThrow("Reply has been deleted");
    });

    it("should not allow editing if parent comment deleted", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Original",
      });

      await asOwner.mutation(api.comments.softDelete, { commentId });

      // NOTE: When comment is deleted, cascade deletes all replies
      // So the error will be "Reply has been deleted" not "Parent comment..."
      await expect(async () => {
        await asOwner.mutation(api.commentReplies.updateReply, {
          replyId,
          content: "Updated",
        });
      }).rejects.toThrow("Reply has been deleted");
    });

    it("should throw for invalid replyId", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      // Create and delete a reply to get a valid but non-existent ID
      const tempId = await asOwner.run(async (ctx) =>
        await ctx.db.insert("commentReplies", {
          commentId,
          createdBy: ownerId,
          content: "temp",
          isEdited: false,
          isDeleted: false,
          createdAt: Date.now(),
        })
      );
      await asOwner.run(async (ctx) => await ctx.db.delete(tempId));

      await expect(async () => {
        await asOwner.mutation(api.commentReplies.updateReply, {
          replyId: tempId,
          content: "Updated",
        });
      }).rejects.toThrow("Reply not found");
    });

    it("should trim whitespace from content", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Original",
      });

      await asOwner.mutation(api.commentReplies.updateReply, {
        replyId,
        content: "  trimmed  ",
      });

      const reply = await asOwner.run(async (ctx) => await ctx.db.get(replyId));
      expect(reply?.content).toBe("trimmed");
    });
  });

  describe.skip("softDeleteReply", () => {
    it("should allow author to delete own reply", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply",
      });

      await asOwner.mutation(api.commentReplies.softDeleteReply, { replyId });

      const reply = await asOwner.run(async (ctx) => await ctx.db.get(replyId));
      expect(reply?.isDeleted).toBe(true);
      expect(reply?.deletedBy).toBe(ownerId);
      expect(reply?.deletedAt).toBeDefined();
    });

    it("should allow owner to delete any reply", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const asReviewer = t.withIdentity({ subject: reviewerId });
      const replyId = await asReviewer.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply",
      });

      await asOwner.mutation(api.commentReplies.softDeleteReply, { replyId });

      const reply = await asOwner.run(async (ctx) => await ctx.db.get(replyId));
      expect(reply?.isDeleted).toBe(true);
      expect(reply?.deletedBy).toBe(ownerId);
    });

    it("should not allow reviewer to delete others' replies", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply",
      });

      const asReviewer = t.withIdentity({ subject: reviewerId });
      await expect(async () => {
        await asReviewer.mutation(api.commentReplies.softDeleteReply, { replyId });
      }).rejects.toThrow("Only the reply author or artifact owner can delete");
    });

    it("should not allow outsider to delete any reply", async () => {
      const t = convexTest(schema);
      const { ownerId, outsiderId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply",
      });

      const asOutsider = t.withIdentity({ subject: outsiderId });
      await expect(async () => {
        await asOutsider.mutation(api.commentReplies.softDeleteReply, { replyId });
      }).rejects.toThrow("No permission");
    });

    it("should set deletedBy and deletedAt audit fields", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply",
      });

      const before = Date.now();
      await asOwner.mutation(api.commentReplies.softDeleteReply, { replyId });
      const after = Date.now();

      const reply = await asOwner.run(async (ctx) => await ctx.db.get(replyId));
      expect(reply?.deletedBy).toBe(ownerId);
      expect(reply?.deletedAt).toBeDefined();
      expect(reply?.deletedAt).toBeGreaterThanOrEqual(before);
      expect(reply?.deletedAt).toBeLessThanOrEqual(after);
    });

    it("should not allow deleting already deleted reply", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      const replyId = await asOwner.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply",
      });

      await asOwner.mutation(api.commentReplies.softDeleteReply, { replyId });

      await expect(async () => {
        await asOwner.mutation(api.commentReplies.softDeleteReply, { replyId });
      }).rejects.toThrow("Reply already deleted");
    });

    it("should throw for invalid replyId", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      // Create and delete a reply to get a valid but non-existent ID
      const tempId = await asOwner.run(async (ctx) =>
        await ctx.db.insert("commentReplies", {
          commentId,
          createdBy: ownerId,
          content: "temp",
          isEdited: false,
          isDeleted: false,
          createdAt: Date.now(),
        })
      );
      await asOwner.run(async (ctx) => await ctx.db.delete(tempId));

      await expect(async () => {
        await asOwner.mutation(api.commentReplies.softDeleteReply, { replyId: tempId });
      }).rejects.toThrow("Reply not found");
    });
  });
});

// ============================================================================
// PHASE 4: INTEGRATION TESTS
// ============================================================================

describe.skip("Integration Tests", () => {
  describe.skip("Cascade Delete", () => {
    it("should cascade delete from comment to all replies with correct audit trail", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      // Owner creates comment
      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Parent comment",
        target: sampleTarget,
      });

      // Reviewer adds 3 replies
      const asReviewer = t.withIdentity({ subject: reviewerId });
      await asReviewer.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply 1",
      });
      await asReviewer.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply 2",
      });
      await asReviewer.mutation(api.commentReplies.createReply, {
        commentId,
        content: "Reply 3",
      });

      // Owner deletes comment
      await asOwner.mutation(api.comments.softDelete, { commentId });

      // Verify all replies are soft deleted with correct audit trail
      const replies = await asOwner.run(async (ctx) =>
        await ctx.db
          .query("commentReplies")
          .withIndex("by_commentId", (q) => q.eq("commentId", commentId))
          .collect()
      );

      expect(replies).toHaveLength(3);
      expect(replies.every((r) => r.isDeleted === true)).toBe(true);
      expect(replies.every((r) => r.deletedBy === ownerId)).toBe(true);
      expect(replies.every((r) => r.deletedAt !== undefined)).toBe(true);
    });
  });

  describe.skip("Resolution Tracking", () => {
    it("should track resolution changes across multiple toggles correctly", async () => {
      const t = convexTest(schema);
      const { ownerId, reviewerId, versionId } = await setupTestData(t);

      // Owner creates comment
      const asOwner = t.withIdentity({ subject: ownerId });
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Test comment",
        target: sampleTarget,
      });

      // 1. Initial state: not resolved, no tracking
      let comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.resolved).toBe(false);
      expect(comment?.resolvedChangedBy).toBeUndefined();
      expect(comment?.resolvedChangedAt).toBeUndefined();

      // 2. Alice resolves
      await asOwner.mutation(api.comments.toggleResolved, { commentId });
      comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.resolved).toBe(true);
      expect(comment?.resolvedChangedBy).toBe(ownerId);
      const firstChangeTime = comment?.resolvedChangedAt;
      expect(firstChangeTime).toBeDefined();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 3. Bob unresolves
      const asReviewer = t.withIdentity({ subject: reviewerId });
      await asReviewer.mutation(api.comments.toggleResolved, { commentId });
      comment = await asReviewer.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.resolved).toBe(false);
      expect(comment?.resolvedChangedBy).toBe(reviewerId);
      expect(comment?.resolvedChangedAt).toBeGreaterThan(firstChangeTime!);

      // 4. Alice re-resolves
      await asOwner.mutation(api.comments.toggleResolved, { commentId });
      comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.resolved).toBe(true);
      expect(comment?.resolvedChangedBy).toBe(ownerId);
      expect(comment?.resolvedChangedAt).toBeGreaterThan(firstChangeTime!);
    });
  });

  describe.skip("Edit Tracking", () => {
    it("should track edits correctly with flags and timestamps", async () => {
      const t = convexTest(schema);
      const { ownerId, versionId } = await setupTestData(t);

      const asOwner = t.withIdentity({ subject: ownerId });

      // Create comment
      const commentId = await asOwner.mutation(api.comments.create, {
        versionId,
        content: "Original content",
        target: sampleTarget,
      });

      // 1. Initially not edited
      let comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.isEdited).toBe(false);
      expect(comment?.editedAt).toBeUndefined();

      // 2. Edit comment
      await asOwner.mutation(api.comments.updateContent, {
        commentId,
        content: "Updated content",
      });

      comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.content).toBe("Updated content");
      expect(comment?.isEdited).toBe(true);
      expect(comment?.editedAt).toBeDefined();

      // 3. No-op edit (same content)
      const editedAt1 = comment?.editedAt;
      await asOwner.mutation(api.comments.updateContent, {
        commentId,
        content: "Updated content",
      });

      comment = await asOwner.run(async (ctx) => await ctx.db.get(commentId));
      expect(comment?.editedAt).toBe(editedAt1); // Unchanged
    });
  });
});
