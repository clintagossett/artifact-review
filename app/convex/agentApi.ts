import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Get the latest version ID for an artifact.
 * Used by HTTP API to resolve artifact -> version -> comments.
 */
export const getLatestVersionId = internalQuery({
    args: {
        artifactId: v.id("artifacts"),
    },
    handler: async (ctx, args) => {
        const version = await ctx.db
            .query("artifactVersions")
            .withIndex("by_artifactId_active", (q) =>
                q.eq("artifactId", args.artifactId).eq("isDeleted", false)
            )
            .order("desc")
            .first();

        return version?._id ?? null;
    },
});

/**
 * Get active comments for a version (Internal).
 * Returns nested replies and W3C compatible target.
 */
export const getComments = internalQuery({
    args: {
        versionId: v.id("artifactVersions"),
    },
    handler: async (ctx, args) => {
        // Get active comments
        const comments = await ctx.db
            .query("comments")
            .withIndex("by_versionId_active", (q) =>
                q.eq("versionId", args.versionId).eq("isDeleted", false)
            )
            .order("asc")
            .collect();

        // Enrich with authors and replies
        const enriched = await Promise.all(
            comments.map(async (comment) => {
                const author = await ctx.db.get(comment.createdBy);

                // Fetch active replies for this comment
                const replies = await ctx.db
                    .query("commentReplies")
                    .withIndex("by_commentId_active", (q) =>
                        q.eq("commentId", comment._id).eq("isDeleted", false)
                    )
                    .collect();

                const enrichedReplies = await Promise.all(
                    replies.map(async (reply) => {
                        const replyAuthor = await ctx.db.get(reply.createdBy);
                        const anyReply = reply as any;
                        return {
                            id: reply._id,
                            content: reply.content,
                            createdAt: reply.createdAt,
                            author: {
                                name: anyReply.agentName || replyAuthor?.name || "Unknown",
                                agentId: anyReply.agentId,
                            },
                        };
                    })
                );

                const anyComment = comment as any; // Handle agent fields

                // Construct W3C Target safely
                let safeTarget = comment.target;
                if (!safeTarget || !safeTarget.selector) {
                    safeTarget = {
                        source: "",
                        selector: {
                            type: "TextQuoteSelector",
                            exact: "Legacy: Position lost",
                            prefix: "",
                            suffix: ""
                        }
                    };
                }

                return {
                    id: comment._id,
                    content: comment.content,
                    createdAt: comment.createdAt,
                    resolved: !!comment.resolvedUpdatedAt,
                    target: safeTarget,
                    author: {
                        name: anyComment.agentName || author?.name || "Unknown",
                        avatar: author?.image,
                        agentId: anyComment.agentId,
                    },
                    replies: enrichedReplies
                };
            })
        );

        return enriched;
    },
});

/**
 * create a new comment (Agent).
 */
export const createComment = internalMutation({
    args: {
        versionId: v.id("artifactVersions"),
        content: v.string(),
        target: v.any(), // Validated by HTTP handler
        agentId: v.optional(v.id("agents")),
        agentName: v.optional(v.string()),
        userId: v.id("users"), // The user associated with the API key
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const commentId = await ctx.db.insert("comments", {
            versionId: args.versionId,
            createdBy: args.userId,
            agentId: args.agentId,
            agentName: args.agentName,
            content: args.content,
            target: args.target,
            isEdited: false,
            isDeleted: false,
            createdAt: now,
        });

        // Trigger Notification (simplified logic for Agent)
        const version = await ctx.db.get(args.versionId);
        if (version) {
            const artifact = await ctx.db.get(version.artifactId);
            if (artifact && artifact.createdBy !== args.userId) {
                const siteUrl = process.env.CONVEX_SITE_URL || "";
                const artifactUrl = `${siteUrl}/artifacts/${artifact.shareToken}/v${version.number}`;

                await ctx.scheduler.runAfter(0, internal.novu.triggerCommentNotification, {
                    subscriberId: artifact.createdBy,
                    artifactDisplayTitle: `${artifact.name} (v${version.number})`,
                    artifactUrl,
                    authorName: args.agentName || "AI Agent",
                    authorAvatarUrl: undefined, // Agents don't have avatars yet
                    commentPreview: args.content.slice(0, 50)
                });
            }
        }

        return commentId;
    }
});

/**
 * Create a reply (Agent).
 */
export const createReply = internalMutation({
    args: {
        commentId: v.id("comments"),
        content: v.string(),
        agentId: v.optional(v.id("agents")),
        agentName: v.optional(v.string()),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const comment = await ctx.db.get(args.commentId);
        if (!comment || comment.isDeleted) throw new Error("Comment not found");

        const now = Date.now();
        const replyId = await ctx.db.insert("commentReplies", {
            commentId: args.commentId,
            createdBy: args.userId,
            agentId: args.agentId,
            agentName: args.agentName,
            content: args.content,
            isEdited: false,
            isDeleted: false,
            createdAt: now,
        });

        // Notifications would go here (omitted for brevity, similar to commentReplies.ts)

        return replyId;
    }
});

/**
 * Update status (Agent).
 */
export const updateCommentStatus = internalMutation({
    args: {
        commentId: v.id("comments"),
        resolved: v.boolean(),
        userId: v.id("users"), // Actor
    },
    handler: async (ctx, args) => {
        const comment = await ctx.db.get(args.commentId);
        if (!comment || comment.isDeleted) throw new Error("Comment not found");

        const isCurrentlyResolved = !!comment.resolvedUpdatedAt;
        if (isCurrentlyResolved === args.resolved) return; // No change

        const now = Date.now();
        await ctx.db.patch(args.commentId, {
            resolvedUpdatedAt: args.resolved ? now : undefined,
            resolvedUpdatedBy: args.userId,
        });
    }
});
