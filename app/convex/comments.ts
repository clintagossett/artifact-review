/**
 * Comment Operations
 *
 * Public API for comment CRUD operations.
 * All functions enforce permission checks via requireCommentPermission helper.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  requireCommentPermission,
  canEditComment,
  canDeleteComment,
} from "./lib/commentPermissions";

/**
 * Get all active comments for an artifact version.
 *
 * Returns comments with enriched author data and reply counts.
 * Requires owner or reviewer permission.
 */
export const getByVersion = query({
  args: {
    versionId: v.id("artifactVersions"),
  },
  returns: v.array(
    v.object({
      _id: v.id("comments"),
      _creationTime: v.number(),
      versionId: v.id("artifactVersions"),
      authorId: v.id("users"),
      content: v.string(),
      resolved: v.boolean(),
      resolvedChangedBy: v.optional(v.id("users")),
      resolvedChangedAt: v.optional(v.number()),
      target: v.any(),
      isEdited: v.boolean(),
      editedAt: v.optional(v.number()),
      isDeleted: v.boolean(),
      deletedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      author: v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
      replyCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Verify permission (throws if unauthorized)
    await requireCommentPermission(ctx, args.versionId);

    // Get active comments using index (no filter!)
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_version_active", (q) =>
        q.eq("versionId", args.versionId).eq("isDeleted", false)
      )
      .order("asc")
      .collect();

    // Enrich with author data and reply counts
    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);

        // Count active replies
        const replies = await ctx.db
          .query("commentReplies")
          .withIndex("by_comment_active", (q) =>
            q.eq("commentId", comment._id).eq("isDeleted", false)
          )
          .collect();

        return {
          ...comment,
          author: {
            name: author?.name,
            email: author?.email,
          },
          replyCount: replies.length,
        };
      })
    );

    return enriched;
  },
});

/**
 * Create a new comment on a version.
 *
 * Requires owner or reviewer permission.
 * Content is validated and trimmed before storage.
 * Task 00021 - Subtask 01: Only allow comments on the latest version
 */
export const create = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    content: v.string(),
    target: v.any(),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    // Verify permission
    await requireCommentPermission(ctx, args.versionId);

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get the version being commented on
    const version = await ctx.db.get(args.versionId);
    if (!version) throw new Error("Version not found");

    // Check if this version is the latest (Task 00021 - Subtask 01)
    const latestVersion = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", version.artifactId).eq("isDeleted", false)
      )
      .order("desc")
      .first();

    if (!latestVersion || version._id !== latestVersion._id) {
      throw new Error("Comments are only allowed on the latest version");
    }

    // Validate content
    const trimmedContent = args.content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Comment content cannot be empty");
    }
    if (trimmedContent.length > 10000) {
      throw new Error("Comment content exceeds maximum length (10000 characters)");
    }

    const now = Date.now();

    // Create comment
    const commentId = await ctx.db.insert("comments", {
      versionId: args.versionId,
      authorId: userId,
      content: trimmedContent,
      resolved: false,
      target: args.target,
      isEdited: false,
      isDeleted: false,
      createdAt: now,
    });

    return commentId;
  },
});

/**
 * Update a comment's content (author only).
 *
 * Sets isEdited flag and editedAt timestamp.
 * Returns null if content is unchanged (no-op).
 */
export const updateContent = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment has been deleted");

    // Verify user has permission to view this version
    await requireCommentPermission(ctx, comment.versionId);

    // Check if user can edit this comment (must be author)
    if (!canEditComment(comment.authorId, userId)) {
      throw new Error("Only the comment author can edit");
    }

    // Validate content
    const trimmedContent = args.content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Comment content cannot be empty");
    }
    if (trimmedContent.length > 10000) {
      throw new Error("Comment content exceeds maximum length (10000 characters)");
    }

    // Skip update if content is unchanged
    if (trimmedContent === comment.content) {
      return null;
    }

    const now = Date.now();

    // Update comment
    await ctx.db.patch(args.commentId, {
      content: trimmedContent,
      isEdited: true,
      editedAt: now,
    });

    return null;
  },
});

/**
 * Toggle the resolved status of a comment.
 *
 * Tracks who changed the status and when.
 * Requires owner or reviewer permission.
 */
export const toggleResolved = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment has been deleted");

    // Verify permission on the version
    await requireCommentPermission(ctx, comment.versionId);

    const now = Date.now();

    // Toggle resolved status and track who/when
    await ctx.db.patch(args.commentId, {
      resolved: !comment.resolved,
      resolvedChangedBy: userId,
      resolvedChangedAt: now,
    });

    return null;
  },
});

/**
 * Soft delete a comment and cascade to all replies.
 *
 * Author can delete own comment.
 * Artifact owner can delete any comment (moderation).
 * All replies are also soft deleted with same deletedBy/deletedAt.
 */
export const softDelete = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment already deleted");

    // DEFENSE-IN-DEPTH: Verify user has access to this artifact first
    await requireCommentPermission(ctx, comment.versionId);

    // Check if user can delete (author or artifact owner)
    const canDelete = await canDeleteComment(ctx, comment, userId);
    if (!canDelete) {
      throw new Error("Only the comment author or artifact owner can delete");
    }

    const now = Date.now();

    // Soft delete comment with audit trail
    await ctx.db.patch(args.commentId, {
      isDeleted: true,
      deletedBy: userId,
      deletedAt: now,
    });

    // Cascade soft delete to all replies
    const replies = await ctx.db
      .query("commentReplies")
      .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
      .collect();

    for (const reply of replies) {
      if (!reply.isDeleted) {
        await ctx.db.patch(reply._id, {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: now,
        });
      }
    }

    return null;
  },
});
