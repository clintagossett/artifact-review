/**
 * Comment Operations
 *
 * Public API for comment CRUD operations.
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
      createdBy: v.id("users"),
      content: v.string(),
      resolved: v.boolean(),
      resolvedBy: v.optional(v.id("users")),
      resolvedAt: v.optional(v.number()),
      resolvedUpdatedAt: v.optional(v.number()),
      resolvedUpdatedBy: v.optional(v.id("users")),
      target: v.any(),
      isEdited: v.boolean(),
      editedAt: v.optional(v.number()),
      isDeleted: v.boolean(),
      deletedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      agentId: v.optional(v.id("agents")),
      agentName: v.optional(v.string()),
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
      .withIndex("by_versionId_active", (q) =>
        q.eq("versionId", args.versionId).eq("isDeleted", false)
      )
      .order("asc")
      .collect();

    // Enrich with author data and reply counts
    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.createdBy);

        // Count active replies
        const replies = await ctx.db
          .query("commentReplies")
          .withIndex("by_commentId_active", (q) =>
            q.eq("commentId", comment._id).eq("isDeleted", false)
          )
          .collect();

        return {
          ...comment,
          resolved: !!comment.resolvedUpdatedAt,
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
 * Thin wrapper: auth → permission check → delegate to shared internal.
 */
export const create = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    content: v.string(),
    target: v.any(),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    // UI-specific: session auth + reviewer access check
    await requireCommentPermission(ctx, args.versionId);

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Delegate to shared internal (validation, DB write, notification)
    const commentId: string = await ctx.runMutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId: args.versionId,
        content: args.content,
        target: args.target,
        userId,
      }
    );

    return commentId as any;
  },
});

/**
 * Update a comment's content (author only).
 *
 * Thin wrapper: auth → permission check → delegate to shared internal.
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

    // UI-specific: verify user has access to the version
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment has been deleted");
    await requireCommentPermission(ctx, comment.versionId);

    // Delegate to shared internal (author check, validation, DB write)
    await ctx.runMutation(internal.commentsInternal.editCommentInternal, {
      commentId: args.commentId,
      content: args.content,
      userId,
    });

    return null;
  },
});

/**
 * Toggle the resolved status of a comment.
 *
 * Thin wrapper: auth → permission check → delegate to shared internal.
 */
export const toggleResolved = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // UI-specific: verify user has access to the version
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment has been deleted");
    await requireCommentPermission(ctx, comment.versionId);

    // Delegate to shared internal (toggle, no explicit resolved arg)
    await ctx.runMutation(internal.commentsInternal.toggleResolvedInternal, {
      commentId: args.commentId,
      userId,
    });

    return null;
  },
});

/**
 * Soft delete a comment and cascade to all replies.
 *
 * Thin wrapper: auth → permission check → delegate to shared internal.
 */
export const softDelete = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // UI-specific: DEFENSE-IN-DEPTH access check
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment already deleted");
    await requireCommentPermission(ctx, comment.versionId);

    // Delegate to shared internal (permission check, cascade delete)
    await ctx.runMutation(internal.commentsInternal.deleteCommentInternal, {
      commentId: args.commentId,
      userId,
    });

    return null;
  },
});

/**
 * Get comments via public share token (no auth required).
 *
 * Validates the share token and checks if annotations are visible
 * based on the access mode (view_read or view_readwrite).
 *
 * @returns Comments array or null if access mode doesn't allow viewing annotations
 */
export const getByVersionPublic = query({
  args: {
    versionId: v.id("artifactVersions"),
    publicShareToken: v.string(),
  },
  returns: v.union(
    v.array(
      v.object({
        _id: v.id("comments"),
        _creationTime: v.number(),
        versionId: v.id("artifactVersions"),
        createdBy: v.id("users"),
        content: v.string(),
        resolved: v.boolean(),
        resolvedBy: v.optional(v.id("users")),
        resolvedAt: v.optional(v.number()),
        resolvedUpdatedAt: v.optional(v.number()),
        resolvedUpdatedBy: v.optional(v.id("users")),
        target: v.any(),
        isEdited: v.boolean(),
        editedAt: v.optional(v.number()),
        isDeleted: v.boolean(),
        deletedBy: v.optional(v.id("users")),
        deletedAt: v.optional(v.number()),
        createdAt: v.number(),
        agentId: v.optional(v.id("agents")),
        agentName: v.optional(v.string()),
        author: v.object({
          name: v.optional(v.string()),
          email: v.optional(v.string()),
        }),
        replyCount: v.number(),
      })
    ),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Look up share by token
    const share = await ctx.db
      .query("artifactShares")
      .withIndex("by_token", (q) => q.eq("token", args.publicShareToken))
      .first();

    // Return null if not found, disabled, or view-only mode
    if (!share || !share.enabled) {
      return null;
    }

    // readComments capability required to see annotations
    if (!share.capabilities.readComments) {
      return null;
    }

    // Get the version and verify it belongs to the shared artifact
    const version = await ctx.db.get(args.versionId);
    if (!version || version.isDeleted) {
      return null;
    }

    // Verify version belongs to the shared artifact
    if (version.artifactId !== share.artifactId) {
      return null;
    }

    // Get active comments using index (no filter!)
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_versionId_active", (q) =>
        q.eq("versionId", args.versionId).eq("isDeleted", false)
      )
      .order("asc")
      .collect();

    // Enrich with author data and reply counts
    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.createdBy);

        // Count active replies
        const replies = await ctx.db
          .query("commentReplies")
          .withIndex("by_commentId_active", (q) =>
            q.eq("commentId", comment._id).eq("isDeleted", false)
          )
          .collect();

        return {
          ...comment,
          resolved: !!comment.resolvedUpdatedAt,
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
 * Create a comment via public share link (authenticated users only).
 *
 * Thin wrapper: auth → share token validation → delegate to shared internal.
 */
export const createViaPublicShare = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    publicShareToken: v.string(),
    content: v.string(),
    target: v.any(),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    // Require authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required to comment");
    }

    // Look up share by token
    const share = await ctx.db
      .query("artifactShares")
      .withIndex("by_token", (q) => q.eq("token", args.publicShareToken))
      .first();

    // Validate share link
    if (!share || !share.enabled) {
      throw new Error("Share link not found or disabled");
    }

    // writeComments capability required to create comments
    if (!share.capabilities.writeComments) {
      throw new Error("This share link does not allow comments");
    }

    // Get the version and verify it belongs to the shared artifact
    const version = await ctx.db.get(args.versionId);
    if (!version || version.isDeleted) {
      throw new Error("Version not found");
    }

    // Verify version belongs to the shared artifact
    if (version.artifactId !== share.artifactId) {
      throw new Error("Version does not belong to shared artifact");
    }

    // Delegate to shared internal (latest-version check, validation, DB write, notification)
    const commentId: string = await ctx.runMutation(
      internal.commentsInternal.createCommentInternal,
      {
        versionId: args.versionId,
        content: args.content,
        target: args.target,
        userId,
      }
    );

    return commentId as any;
  },
});
