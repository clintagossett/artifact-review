/**
 * Comment Reply Operations
 *
 * Public API for reply CRUD operations.
 * All functions inherit permission from parent comment's version.
 */

import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  requireCommentPermission,
  canEditReply,
  canDeleteReply,
} from "./lib/commentPermissions";

/**
 * Get all active replies for a comment.
 *
 * Returns replies with enriched author data.
 * Requires owner or reviewer permission (inherits from parent comment).
 */
export const getReplies = query({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.array(
    v.object({
      _id: v.id("commentReplies"),
      _creationTime: v.number(),
      commentId: v.id("comments"),
      createdBy: v.id("users"),
      content: v.string(),
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
    })
  ),
  handler: async (ctx, args) => {
    // Get parent comment to verify permission
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // If comment is deleted, return empty array (graceful degradation)
    // This prevents errors when browser subscriptions are still active after deletion
    if (comment.isDeleted) return [];

    // Verify permission on the version
    await requireCommentPermission(ctx, comment.versionId);

    // Get active replies using index
    const replies = await ctx.db
      .query("commentReplies")
      .withIndex("by_commentId_active", (q) =>
        q.eq("commentId", args.commentId).eq("isDeleted", false)
      )
      .order("asc")
      .collect();

    // Enrich with author data and agent lookup
    const enriched = await Promise.all(
      replies.map(async (reply) => {
        const author = await ctx.db.get(reply.createdBy);
        const anyReply = reply as any;

        // Look up agent name at display time if agentId is present
        let agentName: string | undefined;
        if (anyReply.agentId) {
          const agent = await ctx.db.get(anyReply.agentId) as { name?: string } | null;
          agentName = agent?.name;
        }

        return {
          ...reply,
          agentName, // Computed at display time, not stored
          author: {
            name: author?.name,
            email: author?.email,
          },
        };
      })
    );

    return enriched;
  },
});

/**
 * Create a new reply to a comment.
 *
 * Requires owner or reviewer permission (inherits from parent comment).
 * Content is validated and trimmed before storage.
 */
export const createReply = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
  },
  returns: v.id("commentReplies"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get parent comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Cannot reply to deleted comment");

    // Verify permission on the version
    await requireCommentPermission(ctx, comment.versionId);

    // Validate content
    const trimmedContent = args.content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Reply content cannot be empty");
    }
    if (trimmedContent.length > 5000) {
      throw new Error("Reply content exceeds maximum length (5000 characters)");
    }

    const now = Date.now();

    // Create reply
    const replyId = await ctx.db.insert("commentReplies", {
      commentId: args.commentId,
      createdBy: userId,
      content: trimmedContent,
      isEdited: false,
      isDeleted: false,
      createdAt: now,
    });

    // NOTIFICATION LOGIC
    // Notify: 1) Original comment author, 2) Other thread participants
    const version = await ctx.db.get(comment.versionId);
    if (!version) {
      console.error("Version not found for reply notification");
      return replyId;
    }

    const artifact = await ctx.db.get(version.artifactId);
    if (!artifact) {
      console.error("Artifact not found for reply notification");
      return replyId;
    }

    const author = await ctx.db.get(userId);
    const siteUrl = process.env.CONVEX_SITE_URL || "";
    const artifactUrl = `${siteUrl}/artifacts/${artifact.shareToken}/v${version.number}`;

    // Collect all unique participants to notify (excluding self)
    const participantsToNotify = new Set<string>();

    // 1. Add original comment author (if not self)
    if (comment.createdBy !== userId) {
      participantsToNotify.add(comment.createdBy);
    }

    // 2. Add all previous repliers in this thread (if not self)
    const existingReplies = await ctx.db
      .query("commentReplies")
      .withIndex("by_commentId_active", (q) =>
        q.eq("commentId", args.commentId).eq("isDeleted", false)
      )
      .collect();

    for (const reply of existingReplies) {
      if (reply.createdBy !== userId && reply._id !== replyId) {
        participantsToNotify.add(reply.createdBy);
      }
    }

    // Send notification to each participant
    for (const participantId of participantsToNotify) {
      await ctx.scheduler.runAfter(0, internal.novu.triggerReplyNotification, {
        subscriberId: participantId,
        artifactDisplayTitle: `${artifact.name} (v${version.number})`,
        artifactUrl,
        authorName: author?.name || "Someone",
        authorAvatarUrl: author?.image,
        commentPreview: trimmedContent.length > 50
          ? `${trimmedContent.slice(0, 50)}...`
          : trimmedContent,
        isCommentAuthor: participantId === comment.createdBy,
      });
    }

    return replyId;
  },
});

/**
 * Update a reply's content (author only).
 *
 * Sets isEdited flag and editedAt timestamp.
 * Returns null if content is unchanged (no-op).
 */
export const updateReply = mutation({
  args: {
    replyId: v.id("commentReplies"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get reply
    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");
    if (reply.isDeleted) throw new Error("Reply has been deleted");

    // Get parent comment to verify permission
    const comment = await ctx.db.get(reply.commentId);
    if (!comment || comment.isDeleted) {
      throw new Error("Parent comment not found or deleted");
    }

    // Verify permission on the version
    await requireCommentPermission(ctx, comment.versionId);

    // Check if user can edit this reply (must be creator)
    if (!canEditReply(reply.createdBy, userId)) {
      throw new Error("Only the reply author can edit");
    }

    // Validate content
    const trimmedContent = args.content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Reply content cannot be empty");
    }
    if (trimmedContent.length > 5000) {
      throw new Error("Reply content exceeds maximum length (5000 characters)");
    }

    // Skip update if content is unchanged
    if (trimmedContent === reply.content) {
      return null;
    }

    const now = Date.now();

    // Update reply
    await ctx.db.patch(args.replyId, {
      content: trimmedContent,
      isEdited: true,
      editedAt: now,
    });

    return null;
  },
});

/**
 * Soft delete a reply.
 *
 * Author can delete own reply.
 * Artifact owner can delete any reply (moderation).
 */
export const softDeleteReply = mutation({
  args: {
    replyId: v.id("commentReplies"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get reply
    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");
    if (reply.isDeleted) throw new Error("Reply already deleted");

    // Get parent comment
    const comment = await ctx.db.get(reply.commentId);
    if (!comment) throw new Error("Parent comment not found");

    // DEFENSE-IN-DEPTH: Verify user has access to this artifact first
    await requireCommentPermission(ctx, comment.versionId);

    // Check if user can delete (creator or artifact owner)
    const canDelete = await canDeleteReply(ctx, comment.versionId, reply.createdBy, userId);
    if (!canDelete) {
      throw new Error("Only the reply author or artifact owner can delete");
    }

    const now = Date.now();

    // Soft delete reply with audit trail
    await ctx.db.patch(args.replyId, {
      isDeleted: true,
      deletedBy: userId,
      deletedAt: now,
    });

    return null;
  },
});
