import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

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
 * Bypasses standard auth permissions (caller must verify).
 */
export const getComments = internalQuery({
    args: {
        versionId: v.id("artifactVersions"),
    },
    handler: async (ctx, args) => {
        // Get active comments using index
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

                // Handle Agent attribution if present
                const anyComment = comment as any; // Cast for TS if types are stale

                return {
                    id: comment._id,
                    content: comment.content,
                    createdAt: comment.createdAt,
                    editedAt: comment.editedAt,
                    isResolved: !!comment.resolvedUpdatedAt,
                    replyCount: replies.length,
                    author: {
                        name: anyComment.agentName || author?.name || "Unknown",
                        agentId: anyComment.agentId, // Ensure schema updated
                        email: author?.email,
                    },
                };
            })
        );

        return enriched;
    },
});
