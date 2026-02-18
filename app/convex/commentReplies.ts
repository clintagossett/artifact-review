/**
 * Comment Reply Operations
 *
 * Public API for reply CRUD operations.
 * Mutations are thin wrappers: authenticate → permission check → delegate to shared internal.
 * Queries remain inline (read-only, no duplication concern).
 */

import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  requireCommentPermission,
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
      agentId: v.optional(v.id("agents")),
      agentName: v.optional(v.string()),
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
            name: agentName || author?.name, // Agent name takes precedence for agent replies
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
 * Thin wrapper: auth → permission check → delegate to shared internal.
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

    // UI-specific: verify parent comment and permission
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Cannot reply to deleted comment");
    await requireCommentPermission(ctx, comment.versionId);

    // Delegate to shared internal (validation, DB write, notification)
    const replyId: string = await ctx.runMutation(
      internal.commentsInternal.createReplyInternal,
      {
        commentId: args.commentId,
        content: args.content,
        userId,
      }
    );

    return replyId as any;
  },
});

/**
 * Update a reply's content (author only).
 *
 * Thin wrapper: auth → permission check → delegate to shared internal.
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

    // UI-specific: verify access to the version
    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");
    if (reply.isDeleted) throw new Error("Reply has been deleted");

    const comment = await ctx.db.get(reply.commentId);
    if (!comment || comment.isDeleted) {
      throw new Error("Parent comment not found or deleted");
    }
    await requireCommentPermission(ctx, comment.versionId);

    // Delegate to shared internal (author check, validation, DB write)
    await ctx.runMutation(internal.commentsInternal.editReplyInternal, {
      replyId: args.replyId,
      content: args.content,
      userId,
    });

    return null;
  },
});

/**
 * Soft delete a reply.
 *
 * Thin wrapper: auth → permission check → delegate to shared internal.
 */
export const softDeleteReply = mutation({
  args: {
    replyId: v.id("commentReplies"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // UI-specific: DEFENSE-IN-DEPTH access check
    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");
    if (reply.isDeleted) throw new Error("Reply already deleted");

    const comment = await ctx.db.get(reply.commentId);
    if (!comment) throw new Error("Parent comment not found");
    await requireCommentPermission(ctx, comment.versionId);

    // Delegate to shared internal (permission check, soft delete)
    await ctx.runMutation(internal.commentsInternal.deleteReplyInternal, {
      replyId: args.replyId,
      userId,
    });

    return null;
  },
});
