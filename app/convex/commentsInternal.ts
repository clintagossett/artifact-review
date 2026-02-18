/**
 * Shared Internal Functions for Comments and Replies
 *
 * These internalMutation functions contain ALL business logic for comment/reply
 * operations. Both UI mutations and Agent API HTTP handlers call these internals.
 *
 * Design:
 * - Each function takes an explicit `userId` arg (caller authenticates first)
 * - Optional `agentId` for Agent API attribution
 * - All validation, DB writes, and notification scheduling lives here
 * - UI mutations are thin wrappers: getAuthUserId → permission check → call internal
 * - HTTP handlers are thin wrappers: requireAuth → requireArtifactOwner → call internal
 */

import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  canDeleteComment,
  canDeleteReply,
} from "./lib/commentPermissions";

// ============================================================================
// COMMENT INTERNALS
// ============================================================================

/**
 * Create a new comment on a version.
 *
 * Extracted from comments.create (lines 106-190).
 * Includes content validation, latest-version check, and notification scheduling.
 */
export const createCommentInternal = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    content: v.string(),
    target: v.any(),
    userId: v.id("users"),
    agentId: v.optional(v.id("agents")),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    // Get the version being commented on
    const version = await ctx.db.get(args.versionId);
    if (!version) throw new Error("Version not found");

    // Check if this version is the latest
    const latestVersion = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifactId_active", (q) =>
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

    // Create comment (with optional agentId for Agent API attribution)
    const commentId = await ctx.db.insert("comments", {
      versionId: args.versionId,
      createdBy: args.userId,
      agentId: args.agentId,
      content: trimmedContent,
      target: args.target,
      isEdited: false,
      isDeleted: false,
      createdAt: now,
    });

    // NOTIFICATION LOGIC
    // Notify the Artifact Owner when a new comment is posted
    const artifact = await ctx.db.get(version.artifactId);
    if (!artifact) {
      console.error("Artifact not found for notification");
      return commentId;
    }

    // Don't notify if the author is commenting on their own artifact
    if (artifact.createdBy !== args.userId) {
      const author = await ctx.db.get(args.userId);
      const siteUrl = process.env.CONVEX_SITE_URL || "";
      const artifactUrl = `${siteUrl}/artifacts/${artifact.shareToken}/v${version.number}`;

      // For agent comments, use agent name; for user comments, use user name
      let authorName = author?.name || "Someone";
      if (args.agentId) {
        const agent = await ctx.db.get(args.agentId);
        if (agent?.name) {
          authorName = agent.name;
        }
      }

      await ctx.scheduler.runAfter(0, internal.novu.triggerCommentNotification, {
        subscriberId: artifact.createdBy,
        artifactDisplayTitle: `${artifact.name} (v${version.number})`,
        artifactUrl,
        authorName,
        authorAvatarUrl: author?.image,
        commentPreview: trimmedContent.length > 50
          ? `${trimmedContent.slice(0, 50)}...`
          : trimmedContent,
      });
    }

    return commentId;
  },
});

/**
 * Update a comment's content.
 *
 * Extracted from comments.updateContent (lines 198-246).
 * Author-only edit with content validation.
 */
export const editCommentInternal = internalMutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment has been deleted");

    // Author check
    if (comment.createdBy !== args.userId) {
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
 * Soft delete a comment and cascade to all replies.
 *
 * Extracted from comments.softDelete (lines 292-342).
 * Author or artifact owner can delete (moderation).
 */
export const deleteCommentInternal = internalMutation({
  args: {
    commentId: v.id("comments"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment already deleted");

    // Permission: author OR artifact owner can delete
    const canDelete = await canDeleteComment(ctx, comment, args.userId);
    if (!canDelete) {
      throw new Error("Only the comment author or artifact owner can delete");
    }

    const now = Date.now();

    // Soft delete comment with audit trail
    await ctx.db.patch(args.commentId, {
      isDeleted: true,
      deletedBy: args.userId,
      deletedAt: now,
    });

    // Cascade soft delete to all replies
    const replies = await ctx.db
      .query("commentReplies")
      .withIndex("by_commentId", (q) => q.eq("commentId", args.commentId))
      .collect();

    for (const reply of replies) {
      if (!reply.isDeleted) {
        await ctx.db.patch(reply._id, {
          isDeleted: true,
          deletedBy: args.userId,
          deletedAt: now,
        });
      }
    }

    return null;
  },
});

/**
 * Toggle or set the resolved status of a comment.
 *
 * Extracted from comments.toggleResolved (lines 254-283).
 * If `resolved` is provided, set explicitly (Agent API).
 * If omitted, toggle current state (UI).
 */
export const toggleResolvedInternal = internalMutation({
  args: {
    commentId: v.id("comments"),
    userId: v.id("users"),
    resolved: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment has been deleted");

    const now = Date.now();
    const isCurrentlyResolved = !!comment.resolvedUpdatedAt;

    // Determine target state
    let shouldResolve: boolean;
    if (args.resolved !== undefined) {
      // Explicit set (Agent API)
      shouldResolve = args.resolved;
    } else {
      // Toggle (UI)
      shouldResolve = !isCurrentlyResolved;
    }

    // No-op if already in target state
    if (isCurrentlyResolved === shouldResolve) {
      return null;
    }

    await ctx.db.patch(args.commentId, {
      resolvedUpdatedAt: shouldResolve ? now : undefined,
      resolvedUpdatedBy: shouldResolve ? args.userId : undefined,
    });

    return null;
  },
});

// ============================================================================
// REPLY INTERNALS
// ============================================================================

/**
 * Create a new reply to a comment.
 *
 * Extracted from commentReplies.createReply (lines 102-198).
 * Includes content validation and full thread notification.
 */
export const createReplyInternal = internalMutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
    userId: v.id("users"),
    agentId: v.optional(v.id("agents")),
  },
  returns: v.id("commentReplies"),
  handler: async (ctx, args) => {
    // Get parent comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Cannot reply to deleted comment");

    // Validate content
    const trimmedContent = args.content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Reply content cannot be empty");
    }
    if (trimmedContent.length > 5000) {
      throw new Error("Reply content exceeds maximum length (5000 characters)");
    }

    const now = Date.now();

    // Create reply (with optional agentId for Agent API attribution)
    const replyId = await ctx.db.insert("commentReplies", {
      commentId: args.commentId,
      createdBy: args.userId,
      agentId: args.agentId,
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

    const author = await ctx.db.get(args.userId);
    const siteUrl = process.env.CONVEX_SITE_URL || "";
    const artifactUrl = `${siteUrl}/artifacts/${artifact.shareToken}/v${version.number}`;

    // For agent replies, use agent name
    let authorName = author?.name || "Someone";
    if (args.agentId) {
      const agent = await ctx.db.get(args.agentId);
      if (agent?.name) {
        authorName = agent.name;
      }
    }

    // Collect all unique participants to notify (excluding self)
    const participantsToNotify = new Set<string>();

    // 1. Add original comment author (if not self)
    if (comment.createdBy !== args.userId) {
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
      if (reply.createdBy !== args.userId && reply._id !== replyId) {
        participantsToNotify.add(reply.createdBy);
      }
    }

    // Send notification to each participant
    for (const participantId of participantsToNotify) {
      await ctx.scheduler.runAfter(0, internal.novu.triggerReplyNotification, {
        subscriberId: participantId,
        artifactDisplayTitle: `${artifact.name} (v${version.number})`,
        artifactUrl,
        authorName,
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
 * Update a reply's content.
 *
 * Extracted from commentReplies.updateReply (lines 206-260).
 * Author-only edit with content validation.
 */
export const editReplyInternal = internalMutation({
  args: {
    replyId: v.id("commentReplies"),
    content: v.string(),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get reply
    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");
    if (reply.isDeleted) throw new Error("Reply has been deleted");

    // Author check
    if (reply.createdBy !== args.userId) {
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
 * Extracted from commentReplies.softDeleteReply (lines 268-306).
 * Author or artifact owner can delete (moderation).
 */
export const deleteReplyInternal = internalMutation({
  args: {
    replyId: v.id("commentReplies"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get reply
    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");
    if (reply.isDeleted) throw new Error("Reply already deleted");

    // Get parent comment for permission check
    const comment = await ctx.db.get(reply.commentId);
    if (!comment) throw new Error("Parent comment not found");

    // Permission: author OR artifact owner can delete
    const canDelete = await canDeleteReply(ctx, comment.versionId, reply.createdBy, args.userId);
    if (!canDelete) {
      throw new Error("Only the reply author or artifact owner can delete");
    }

    const now = Date.now();

    // Soft delete reply with audit trail
    await ctx.db.patch(args.replyId, {
      isDeleted: true,
      deletedBy: args.userId,
      deletedAt: now,
    });

    return null;
  },
});
