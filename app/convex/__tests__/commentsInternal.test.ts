/**
 * Direct tests for commentsInternal shared internal functions.
 *
 * These test the internal functions directly (as the Agent API path would call them),
 * complementing the UI wrapper tests in tests/convex-integration/comments.test.ts.
 */

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "../_generated/api";
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

async function createTestArtifactWithVersion(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">
): Promise<{
  artifactId: Id<"artifacts">;
  versionId: Id<"artifactVersions">;
}> {
  return await t.run(async (ctx) => {
    const membership: any = await (ctx.db.query("members") as any)
      .withIndex("by_userId", (q: any) => q.eq("userId", userId as any))
      .first();

    const now = Date.now();
    const artifactId = await ctx.db.insert("artifacts", {
      name: "Test Artifact",
      createdBy: userId,
      organizationId: membership.organizationId,
      shareToken: "test-token-" + now,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      number: 1,
      createdBy: userId,
      fileType: "html",
      entryPoint: "index.html",
      size: 1000,
      isDeleted: false,
      createdAt: now,
    });

    return { artifactId, versionId };
  });
}

// ============================================================================
// createCommentInternal
// ============================================================================

describe("commentsInternal - createCommentInternal", () => {
  it("should create a comment with valid content", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Great work on the landing page!",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    expect(commentId).toBeDefined();

    const comment = (await t.run(
      async (ctx) => await ctx.db.get(commentId)
    )) as Doc<"comments"> | null;
    expect(comment?.content).toBe("Great work on the landing page!");
    expect(comment?.createdBy).toBe(userId);
    expect(comment?.isEdited).toBe(false);
    expect(comment?.isDeleted).toBe(false);
  });

  it("should trim whitespace from content", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "  trimmed content  ",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    const comment = (await t.run(
      async (ctx) => await ctx.db.get(commentId)
    )) as Doc<"comments"> | null;
    expect(comment?.content).toBe("trimmed content");
  });

  it("should reject empty content", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    await expect(
      t.mutation(internal.commentsInternal.createCommentInternal, {
        versionId,
        content: "   ",
        target: { _version: 1, type: "general" },
        userId,
      })
    ).rejects.toThrow("Comment content cannot be empty");
  });

  it("should reject content exceeding 10000 characters", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const longContent = "x".repeat(10001);

    await expect(
      t.mutation(internal.commentsInternal.createCommentInternal, {
        versionId,
        content: longContent,
        target: { _version: 1, type: "general" },
        userId,
      })
    ).rejects.toThrow("Comment content exceeds maximum length");
  });

  it("should reject comments on non-latest version", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId, versionId: v1Id } =
      await createTestArtifactWithVersion(t, userId);

    // Create version 2 so v1 is no longer latest
    await t.run(async (ctx) => {
      await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 2,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 2000,
        isDeleted: false,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.mutation(internal.commentsInternal.createCommentInternal, {
        versionId: v1Id,
        content: "Comment on old version",
        target: { _version: 1, type: "general" },
        userId,
      })
    ).rejects.toThrow("Comments are only allowed on the latest version");
  });

  it("should store agentId when provided", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    // Create an agent record
    const agentId = await t.run(async (ctx) => {
      return await ctx.db.insert("agents", {
        name: "Test Agent",
        createdBy: userId,
        role: "coding",
        isDeleted: false,
        createdAt: Date.now(),
      });
    });

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Agent feedback",
        target: { _version: 1, type: "general" },
        userId,
        agentId,
      }
    );

    const comment = (await t.run(
      async (ctx) => await ctx.db.get(commentId)
    )) as any;
    expect(comment?.agentId).toBe(agentId);
  });
});

// ============================================================================
// editCommentInternal
// ============================================================================

describe("commentsInternal - editCommentInternal", () => {
  it("should edit comment content", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Original content",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    await t.mutation(internal.commentsInternal.editCommentInternal, {
      commentId,
      content: "Updated content",
      userId,
    });

    const comment = (await t.run(
      async (ctx) => await ctx.db.get(commentId)
    )) as Doc<"comments"> | null;
    expect(comment?.content).toBe("Updated content");
    expect(comment?.isEdited).toBe(true);
    expect(comment?.editedAt).toBeDefined();
  });

  it("should reject edit by non-author", async () => {
    const t = convexTest(schema);
    const author = await createTestUser(t, "author@test.com");
    const other = await createTestUser(t, "other@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, author);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Author's comment",
        target: { _version: 1, type: "general" },
        userId: author,
      }
    );

    await expect(
      t.mutation(internal.commentsInternal.editCommentInternal, {
        commentId,
        content: "Hijacked content",
        userId: other,
      })
    ).rejects.toThrow("Only the comment author can edit");
  });

  it("should reject empty content on edit", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Original",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    await expect(
      t.mutation(internal.commentsInternal.editCommentInternal, {
        commentId,
        content: "   ",
        userId,
      })
    ).rejects.toThrow("Comment content cannot be empty");
  });

  it("should no-op when content is unchanged", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Same content",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    await t.mutation(internal.commentsInternal.editCommentInternal, {
      commentId,
      content: "Same content",
      userId,
    });

    const comment = (await t.run(
      async (ctx) => await ctx.db.get(commentId)
    )) as Doc<"comments"> | null;
    expect(comment?.isEdited).toBe(false); // Should NOT be marked edited
  });

  it("should reject edit on deleted comment", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "To delete",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    await t.mutation(internal.commentsInternal.deleteCommentInternal, {
      commentId,
      userId,
    });

    await expect(
      t.mutation(internal.commentsInternal.editCommentInternal, {
        commentId,
        content: "Edit after delete",
        userId,
      })
    ).rejects.toThrow("Comment has been deleted");
  });
});

// ============================================================================
// deleteCommentInternal
// ============================================================================

describe("commentsInternal - deleteCommentInternal", () => {
  it("should soft delete a comment", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "To delete",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    await t.mutation(internal.commentsInternal.deleteCommentInternal, {
      commentId,
      userId,
    });

    const comment = (await t.run(
      async (ctx) => await ctx.db.get(commentId)
    )) as Doc<"comments"> | null;
    expect(comment?.isDeleted).toBe(true);
    expect(comment?.deletedBy).toBe(userId);
    expect(comment?.deletedAt).toBeDefined();
  });

  it("should cascade delete to replies", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent comment",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    const replyId = await t.mutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId,
        content: "A reply",
        userId,
      }
    );

    // Delete the parent comment
    await t.mutation(internal.commentsInternal.deleteCommentInternal, {
      commentId,
      userId,
    });

    // Reply should also be soft deleted
    const reply = (await t.run(
      async (ctx) => await ctx.db.get(replyId)
    )) as Doc<"commentReplies"> | null;
    expect(reply?.isDeleted).toBe(true);
  });

  it("should allow artifact owner to delete another user's comment", async () => {
    const t = convexTest(schema);
    const owner = await createTestUser(t, "owner@test.com");
    const reviewer = await createTestUser(t, "reviewer@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, owner);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Reviewer's comment",
        target: { _version: 1, type: "general" },
        userId: reviewer,
      }
    );

    // Owner deletes reviewer's comment (moderation)
    await t.mutation(internal.commentsInternal.deleteCommentInternal, {
      commentId,
      userId: owner,
    });

    const comment = (await t.run(
      async (ctx) => await ctx.db.get(commentId)
    )) as Doc<"comments"> | null;
    expect(comment?.isDeleted).toBe(true);
    expect(comment?.deletedBy).toBe(owner);
  });

  it("should reject delete by non-author non-owner", async () => {
    const t = convexTest(schema);
    const owner = await createTestUser(t, "owner@test.com");
    const reviewer = await createTestUser(t, "reviewer@test.com");
    const outsider = await createTestUser(t, "outsider@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, owner);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Reviewer's comment",
        target: { _version: 1, type: "general" },
        userId: reviewer,
      }
    );

    await expect(
      t.mutation(internal.commentsInternal.deleteCommentInternal, {
        commentId,
        userId: outsider,
      })
    ).rejects.toThrow("Only the comment author or artifact owner can delete");
  });

  it("should reject deleting already-deleted comment", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "To delete",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    await t.mutation(internal.commentsInternal.deleteCommentInternal, {
      commentId,
      userId,
    });

    await expect(
      t.mutation(internal.commentsInternal.deleteCommentInternal, {
        commentId,
        userId,
      })
    ).rejects.toThrow("Comment already deleted");
  });
});

// ============================================================================
// toggleResolvedInternal
// ============================================================================

describe("commentsInternal - toggleResolvedInternal", () => {
  it("should toggle from unresolved to resolved (UI mode)", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "To resolve",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    // Toggle (no explicit resolved arg = UI mode)
    await t.mutation(internal.commentsInternal.toggleResolvedInternal, {
      commentId,
      userId,
    });

    const comment = (await t.run(
      async (ctx) => await ctx.db.get(commentId)
    )) as Doc<"comments"> | null;
    expect(comment?.resolvedUpdatedAt).toBeDefined();
    expect(comment?.resolvedUpdatedBy).toBe(userId);
  });

  it("should toggle from resolved back to unresolved (UI mode)", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "To toggle",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    // Resolve
    await t.mutation(internal.commentsInternal.toggleResolvedInternal, {
      commentId,
      userId,
    });

    // Unresolve
    await t.mutation(internal.commentsInternal.toggleResolvedInternal, {
      commentId,
      userId,
    });

    const comment = (await t.run(
      async (ctx) => await ctx.db.get(commentId)
    )) as Doc<"comments"> | null;
    expect(comment?.resolvedUpdatedAt).toBeUndefined();
    expect(comment?.resolvedUpdatedBy).toBeUndefined();
  });

  it("should set resolved explicitly (Agent API mode)", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "To resolve explicitly",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    // Explicitly resolve (Agent API mode)
    await t.mutation(internal.commentsInternal.toggleResolvedInternal, {
      commentId,
      userId,
      resolved: true,
    });

    const comment = (await t.run(
      async (ctx) => await ctx.db.get(commentId)
    )) as Doc<"comments"> | null;
    expect(comment?.resolvedUpdatedAt).toBeDefined();
  });

  it("should no-op when already in target state", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Already unresolved",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    // Try to unresolve an already-unresolved comment
    await t.mutation(internal.commentsInternal.toggleResolvedInternal, {
      commentId,
      userId,
      resolved: false,
    });

    const comment = (await t.run(
      async (ctx) => await ctx.db.get(commentId)
    )) as Doc<"comments"> | null;
    expect(comment?.resolvedUpdatedAt).toBeUndefined();
  });

  it("should reject toggle on deleted comment", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "To delete",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    await t.mutation(internal.commentsInternal.deleteCommentInternal, {
      commentId,
      userId,
    });

    await expect(
      t.mutation(internal.commentsInternal.toggleResolvedInternal, {
        commentId,
        userId,
      })
    ).rejects.toThrow("Comment has been deleted");
  });
});

// ============================================================================
// createReplyInternal
// ============================================================================

describe("commentsInternal - createReplyInternal", () => {
  it("should create a reply to a comment", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent comment",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    const replyId = await t.mutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId,
        content: "A reply to the comment",
        userId,
      }
    );

    expect(replyId).toBeDefined();

    const reply = (await t.run(
      async (ctx) => await ctx.db.get(replyId)
    )) as Doc<"commentReplies"> | null;
    expect(reply?.content).toBe("A reply to the comment");
    expect(reply?.commentId).toBe(commentId);
    expect(reply?.isEdited).toBe(false);
    expect(reply?.isDeleted).toBe(false);
  });

  it("should reject empty reply content", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    await expect(
      t.mutation(internal.commentsInternal.createReplyInternal, {
        commentId,
        content: "   ",
        userId,
      })
    ).rejects.toThrow("Reply content cannot be empty");
  });

  it("should reject reply content exceeding 5000 characters", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    await expect(
      t.mutation(internal.commentsInternal.createReplyInternal, {
        commentId,
        content: "x".repeat(5001),
        userId,
      })
    ).rejects.toThrow("Reply content exceeds maximum length");
  });

  it("should reject reply to deleted comment", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "To delete",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    await t.mutation(internal.commentsInternal.deleteCommentInternal, {
      commentId,
      userId,
    });

    await expect(
      t.mutation(internal.commentsInternal.createReplyInternal, {
        commentId,
        content: "Reply after delete",
        userId,
      })
    ).rejects.toThrow("Cannot reply to deleted comment");
  });

  it("should store agentId on reply when provided", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const agentId = await t.run(async (ctx) => {
      return await ctx.db.insert("agents", {
        name: "Test Agent",
        createdBy: userId,
        role: "coding",
        isDeleted: false,
        createdAt: Date.now(),
      });
    });

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    const replyId = await t.mutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId,
        content: "Agent reply",
        userId,
        agentId,
      }
    );

    const reply = (await t.run(
      async (ctx) => await ctx.db.get(replyId)
    )) as any;
    expect(reply?.agentId).toBe(agentId);
  });
});

// ============================================================================
// editReplyInternal
// ============================================================================

describe("commentsInternal - editReplyInternal", () => {
  it("should edit reply content", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    const replyId = await t.mutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId,
        content: "Original reply",
        userId,
      }
    );

    await t.mutation(internal.commentsInternal.editReplyInternal, {
      replyId,
      content: "Updated reply",
      userId,
    });

    const reply = (await t.run(
      async (ctx) => await ctx.db.get(replyId)
    )) as Doc<"commentReplies"> | null;
    expect(reply?.content).toBe("Updated reply");
    expect(reply?.isEdited).toBe(true);
    expect(reply?.editedAt).toBeDefined();
  });

  it("should reject edit by non-author", async () => {
    const t = convexTest(schema);
    const author = await createTestUser(t, "author@test.com");
    const other = await createTestUser(t, "other@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, author);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent",
        target: { _version: 1, type: "general" },
        userId: author,
      }
    );

    const replyId = await t.mutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId,
        content: "Author's reply",
        userId: author,
      }
    );

    await expect(
      t.mutation(internal.commentsInternal.editReplyInternal, {
        replyId,
        content: "Hijacked",
        userId: other,
      })
    ).rejects.toThrow("Only the reply author can edit");
  });

  it("should reject empty content on reply edit", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    const replyId = await t.mutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId,
        content: "Original",
        userId,
      }
    );

    await expect(
      t.mutation(internal.commentsInternal.editReplyInternal, {
        replyId,
        content: "",
        userId,
      })
    ).rejects.toThrow("Reply content cannot be empty");
  });

  it("should no-op when reply content is unchanged", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    const replyId = await t.mutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId,
        content: "Same content",
        userId,
      }
    );

    await t.mutation(internal.commentsInternal.editReplyInternal, {
      replyId,
      content: "Same content",
      userId,
    });

    const reply = (await t.run(
      async (ctx) => await ctx.db.get(replyId)
    )) as Doc<"commentReplies"> | null;
    expect(reply?.isEdited).toBe(false);
  });
});

// ============================================================================
// deleteReplyInternal
// ============================================================================

describe("commentsInternal - deleteReplyInternal", () => {
  it("should soft delete a reply", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    const replyId = await t.mutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId,
        content: "To delete",
        userId,
      }
    );

    await t.mutation(internal.commentsInternal.deleteReplyInternal, {
      replyId,
      userId,
    });

    const reply = (await t.run(
      async (ctx) => await ctx.db.get(replyId)
    )) as Doc<"commentReplies"> | null;
    expect(reply?.isDeleted).toBe(true);
    expect(reply?.deletedBy).toBe(userId);
    expect(reply?.deletedAt).toBeDefined();
  });

  it("should allow artifact owner to delete another user's reply", async () => {
    const t = convexTest(schema);
    const owner = await createTestUser(t, "owner@test.com");
    const reviewer = await createTestUser(t, "reviewer@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, owner);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent",
        target: { _version: 1, type: "general" },
        userId: owner,
      }
    );

    const replyId = await t.mutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId,
        content: "Reviewer's reply",
        userId: reviewer,
      }
    );

    // Owner deletes reviewer's reply (moderation)
    await t.mutation(internal.commentsInternal.deleteReplyInternal, {
      replyId,
      userId: owner,
    });

    const reply = (await t.run(
      async (ctx) => await ctx.db.get(replyId)
    )) as Doc<"commentReplies"> | null;
    expect(reply?.isDeleted).toBe(true);
    expect(reply?.deletedBy).toBe(owner);
  });

  it("should reject delete by non-author non-owner", async () => {
    const t = convexTest(schema);
    const owner = await createTestUser(t, "owner@test.com");
    const reviewer = await createTestUser(t, "reviewer@test.com");
    const outsider = await createTestUser(t, "outsider@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, owner);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent",
        target: { _version: 1, type: "general" },
        userId: owner,
      }
    );

    const replyId = await t.mutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId,
        content: "Reviewer's reply",
        userId: reviewer,
      }
    );

    await expect(
      t.mutation(internal.commentsInternal.deleteReplyInternal, {
        replyId,
        userId: outsider,
      })
    ).rejects.toThrow("Only the reply author or artifact owner can delete");
  });

  it("should reject deleting already-deleted reply", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { versionId } = await createTestArtifactWithVersion(t, userId);

    const commentId = await t.mutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId,
        content: "Parent",
        target: { _version: 1, type: "general" },
        userId,
      }
    );

    const replyId = await t.mutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId,
        content: "To delete",
        userId,
      }
    );

    await t.mutation(internal.commentsInternal.deleteReplyInternal, {
      replyId,
      userId,
    });

    await expect(
      t.mutation(internal.commentsInternal.deleteReplyInternal, {
        replyId,
        userId,
      })
    ).rejects.toThrow("Reply already deleted");
  });
});
