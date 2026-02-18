/**
 * Agent API - Internal Queries and Version Management
 *
 * This file contains Agent-API-specific query functions and version management
 * internals. All comment, reply, access, and share mutations have been extracted
 * to shared internal files:
 * - commentsInternal.ts (comments + replies)
 * - accessInternal.ts (grant/revoke access)
 * - sharesInternal.ts (share link management)
 *
 * Remaining in this file:
 * - getLatestVersion, getComments - query helpers for HTTP handlers
 * - listArtifacts, getStats, listAccess - agent-specific aggregate queries
 * - getShareLink, getShareRecordByArtifact - share link queries
 * - listVersionsInternal - version listing
 * - softDeleteVersionInternal, updateVersionNameInternal, restoreVersionInternal - version mutations
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { MAX_VERSION_NAME_LENGTH } from "./lib/fileTypes";

// ============================================================================
// QUERY HELPERS (used by HTTP handlers)
// ============================================================================

/**
 * Get the latest version for an artifact.
 * Used by HTTP API to resolve artifact -> version -> comments.
 */
export const getLatestVersion = internalQuery({
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

        return version ? { _id: version._id, number: version.number } : null;
    },
});

/**
 * Get active comments for a version (Internal).
 * Returns nested replies and W3C compatible target.
 * Agent-API-specific response shape (different from UI query).
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

                        // Look up agent name if this is an agent-created reply
                        let displayName = replyAuthor?.name || "Unknown";
                        if (anyReply.agentId) {
                            const agent = await ctx.db.get(anyReply.agentId) as { name?: string } | null;
                            if (agent?.name) {
                                displayName = agent.name;
                            }
                        }

                        return {
                            id: reply._id,
                            content: reply.content,
                            createdAt: reply.createdAt,
                            author: {
                                name: displayName,
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

                // Look up agent name if this is an agent-created comment
                let displayName = author?.name || "Unknown";
                if (anyComment.agentId) {
                    const agent = await ctx.db.get(anyComment.agentId) as { name?: string } | null;
                    if (agent?.name) {
                        displayName = agent.name;
                    }
                }

                return {
                    id: comment._id,
                    content: comment.content,
                    createdAt: comment.createdAt,
                    resolved: !!comment.resolvedUpdatedAt,
                    target: safeTarget,
                    author: {
                        name: displayName,
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

// ============================================================================
// AGENT-SPECIFIC AGGREGATE QUERIES
// ============================================================================

/**
 * List all artifacts for a user (Agent).
 */
export const listArtifacts = internalQuery({
    args: {
        userId: v.id("users"),
    },
    returns: v.array(v.object({
        id: v.id("artifacts"),
        name: v.string(),
        shareToken: v.string(),
        shareUrl: v.string(),
        createdAt: v.number(),
        latestVersion: v.number(),
        stats: v.object({
            totalViews: v.number(),
            commentCount: v.number(),
            unresolvedCommentCount: v.number(),
        }),
    })),
    handler: async (ctx, args) => {
        // Get all non-deleted artifacts for user
        const artifacts = await ctx.db
            .query("artifacts")
            .withIndex("by_createdBy_active", (q) =>
                q.eq("createdBy", args.userId).eq("isDeleted", false)
            )
            .collect();

        const siteUrl = process.env.SITE_URL || "https://artifact.review";

        const results = await Promise.all(
            artifacts.map(async (artifact) => {
                // Get latest version
                const latestVersion = await ctx.db
                    .query("artifactVersions")
                    .withIndex("by_artifactId_active", (q) =>
                        q.eq("artifactId", artifact._id).eq("isDeleted", false)
                    )
                    .order("desc")
                    .first();

                // Get all versions for comment counting
                const versions = await ctx.db
                    .query("artifactVersions")
                    .withIndex("by_artifactId_active", (q) =>
                        q.eq("artifactId", artifact._id).eq("isDeleted", false)
                    )
                    .collect();

                // Count comments across all versions
                let totalComments = 0;
                let unresolvedComments = 0;
                for (const version of versions) {
                    const comments = await ctx.db
                        .query("comments")
                        .withIndex("by_versionId_active", (q) =>
                            q.eq("versionId", version._id).eq("isDeleted", false)
                        )
                        .collect();
                    totalComments += comments.length;
                    unresolvedComments += comments.filter(c => !c.resolvedUpdatedAt).length;
                }

                // Count views from access records
                const accessRecords = await ctx.db
                    .query("artifactAccess")
                    .withIndex("by_artifactId_active", (q) =>
                        q.eq("artifactId", artifact._id).eq("isDeleted", false)
                    )
                    .collect();
                const totalViews = accessRecords.filter(a => a.firstViewedAt).length;

                return {
                    id: artifact._id,
                    name: artifact.name,
                    shareToken: artifact.shareToken,
                    shareUrl: `${siteUrl}/a/${artifact.shareToken}`,
                    createdAt: artifact.createdAt,
                    latestVersion: latestVersion?.number ?? 0,
                    stats: {
                        totalViews,
                        commentCount: totalComments,
                        unresolvedCommentCount: unresolvedComments,
                    },
                };
            })
        );

        return results;
    },
});

/**
 * Get share link for an artifact (Agent).
 */
export const getShareLink = internalQuery({
    args: {
        artifactId: v.id("artifacts"),
    },
    returns: v.union(
        v.object({
            shareUrl: v.string(),
            enabled: v.boolean(),
            capabilities: v.object({
                readComments: v.boolean(),
                writeComments: v.boolean(),
            }),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const share = await ctx.db
            .query("artifactShares")
            .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
            .first();

        if (!share) return null;

        const siteUrl = process.env.SITE_URL || "https://artifact.review";

        return {
            shareUrl: `${siteUrl}/share/${share.token}`,
            enabled: share.enabled,
            capabilities: share.capabilities,
        };
    },
});

/**
 * Get the share record ID for an artifact (used by HTTP handlers to bridge
 * artifact-based lookups to shareId-based shared internals).
 */
export const getShareRecordByArtifact = internalQuery({
    args: {
        artifactId: v.id("artifacts"),
    },
    returns: v.union(
        v.object({
            _id: v.id("artifactShares"),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const share = await ctx.db
            .query("artifactShares")
            .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
            .first();

        if (!share) return null;
        return { _id: share._id };
    },
});

/**
 * List access records for an artifact (Agent).
 */
export const listAccess = internalQuery({
    args: {
        artifactId: v.id("artifacts"),
    },
    returns: v.array(v.object({
        id: v.id("artifactAccess"),
        email: v.string(),
        name: v.optional(v.string()),
        role: v.string(),
        status: v.string(),
        firstViewedAt: v.optional(v.number()),
        lastViewedAt: v.optional(v.number()),
    })),
    handler: async (ctx, args) => {
        const accessRecords = await ctx.db
            .query("artifactAccess")
            .withIndex("by_artifactId_active", (q) =>
                q.eq("artifactId", args.artifactId).eq("isDeleted", false)
            )
            .collect();

        const results = await Promise.all(
            accessRecords.map(async (access) => {
                let email = "";
                let name: string | undefined;
                let status = "pending";

                if (access.userId) {
                    const user = await ctx.db.get(access.userId);
                    email = user?.email ?? "";
                    name = user?.name;
                    status = access.firstViewedAt ? "viewed" : "added";
                } else if (access.userInviteId) {
                    const invite = await ctx.db.get(access.userInviteId);
                    email = invite?.email ?? "";
                    name = invite?.name;
                    status = "pending";
                }

                return {
                    id: access._id,
                    email,
                    name,
                    role: "can-comment", // Currently only role we support
                    status,
                    firstViewedAt: access.firstViewedAt,
                    lastViewedAt: access.lastViewedAt,
                };
            })
        );

        return results;
    },
});

/**
 * Get stats for an artifact (Agent).
 */
export const getStats = internalQuery({
    args: {
        artifactId: v.id("artifacts"),
    },
    returns: v.object({
        artifact: v.object({
            id: v.id("artifacts"),
            name: v.string(),
            shareToken: v.string(),
            createdAt: v.number(),
        }),
        stats: v.object({
            totalViews: v.number(),
            uniqueViewers: v.number(),
            commentCount: v.number(),
            unresolvedCommentCount: v.number(),
            lastViewedAt: v.optional(v.number()),
            lastViewedBy: v.optional(v.string()),
        }),
        versions: v.array(v.object({
            number: v.number(),
            commentCount: v.number(),
            viewCount: v.number(),
        })),
    }),
    handler: async (ctx, args) => {
        const artifact = await ctx.db.get(args.artifactId);
        if (!artifact) throw new Error("Artifact not found");

        // Get access records for view stats
        const accessRecords = await ctx.db
            .query("artifactAccess")
            .withIndex("by_artifactId_active", (q) =>
                q.eq("artifactId", args.artifactId).eq("isDeleted", false)
            )
            .collect();

        const viewedRecords = accessRecords.filter(a => a.firstViewedAt);
        const totalViews = viewedRecords.length;
        const uniqueViewers = viewedRecords.length;

        // Find last viewed
        let lastViewedAt: number | undefined;
        let lastViewedBy: string | undefined;

        if (viewedRecords.length > 0) {
            const sorted = viewedRecords.sort((a, b) =>
                (b.lastViewedAt ?? 0) - (a.lastViewedAt ?? 0)
            );
            const lastViewer = sorted[0];
            lastViewedAt = lastViewer.lastViewedAt;

            if (lastViewer.userId) {
                const user = await ctx.db.get(lastViewer.userId);
                lastViewedBy = user?.name ?? user?.email;
            }
        }

        // Get versions with comment counts
        const versions = await ctx.db
            .query("artifactVersions")
            .withIndex("by_artifactId_active", (q) =>
                q.eq("artifactId", args.artifactId).eq("isDeleted", false)
            )
            .collect();

        let totalComments = 0;
        let unresolvedComments = 0;

        const versionStats = await Promise.all(
            versions.map(async (version) => {
                const comments = await ctx.db
                    .query("comments")
                    .withIndex("by_versionId_active", (q) =>
                        q.eq("versionId", version._id).eq("isDeleted", false)
                    )
                    .collect();

                totalComments += comments.length;
                unresolvedComments += comments.filter(c => !c.resolvedUpdatedAt).length;

                return {
                    number: version.number,
                    commentCount: comments.length,
                    viewCount: 0, // Per-version views not tracked
                };
            })
        );

        return {
            artifact: {
                id: artifact._id,
                name: artifact.name,
                shareToken: artifact.shareToken,
                createdAt: artifact.createdAt,
            },
            stats: {
                totalViews,
                uniqueViewers,
                commentCount: totalComments,
                unresolvedCommentCount: unresolvedComments,
                lastViewedAt,
                lastViewedBy,
            },
            versions: versionStats.sort((a, b) => a.number - b.number),
        };
    },
});

// ============================================================================
// VERSION MANAGEMENT
// ============================================================================

/**
 * List active versions for an artifact (Agent).
 */
export const listVersionsInternal = internalQuery({
    args: {
        artifactId: v.id("artifacts"),
    },
    returns: v.array(v.object({
        number: v.number(),
        name: v.union(v.string(), v.null()),
        fileType: v.string(),
        size: v.number(),
        createdAt: v.number(),
        isLatest: v.boolean(),
    })),
    handler: async (ctx, args) => {
        const versions = await ctx.db
            .query("artifactVersions")
            .withIndex("by_artifactId_active", (q) =>
                q.eq("artifactId", args.artifactId).eq("isDeleted", false)
            )
            .collect();

        if (versions.length === 0) return [];

        const maxNumber = Math.max(...versions.map((v) => v.number));

        return versions
            .sort((a, b) => a.number - b.number)
            .map((v) => ({
                number: v.number,
                name: v.name ?? null,
                fileType: v.fileType,
                size: v.size,
                createdAt: v.createdAt,
                isLatest: v.number === maxNumber,
            }));
    },
});

/**
 * Soft-delete a version (Agent).
 * Cannot delete the last active version.
 */
export const softDeleteVersionInternal = internalMutation({
    args: {
        artifactId: v.id("artifacts"),
        number: v.number(),
        userId: v.id("users"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const version = await ctx.db
            .query("artifactVersions")
            .withIndex("by_artifactId_number", (q) =>
                q.eq("artifactId", args.artifactId).eq("number", args.number)
            )
            .first();

        if (!version || version.isDeleted) {
            throw new Error("Version not found");
        }

        // Check this isn't the last active version
        const activeVersions = await ctx.db
            .query("artifactVersions")
            .withIndex("by_artifactId_active", (q) =>
                q.eq("artifactId", args.artifactId).eq("isDeleted", false)
            )
            .collect();

        if (activeVersions.length <= 1) {
            throw new Error("Cannot delete the last active version");
        }

        const now = Date.now();

        // Soft-delete version
        await ctx.db.patch(version._id, {
            isDeleted: true,
            deletedAt: now,
            deletedBy: args.userId,
        });

        // Cascade soft-delete to artifact files
        const files = await ctx.db
            .query("artifactFiles")
            .withIndex("by_versionId_active", (q) =>
                q.eq("versionId", version._id).eq("isDeleted", false)
            )
            .collect();

        for (const file of files) {
            await ctx.db.patch(file._id, {
                isDeleted: true,
                deletedAt: now,
                deletedBy: args.userId,
            });
        }

        return null;
    },
});

/**
 * Update version name (Agent).
 */
export const updateVersionNameInternal = internalMutation({
    args: {
        artifactId: v.id("artifacts"),
        number: v.number(),
        name: v.union(v.string(), v.null()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        if (args.name !== null && args.name.length > MAX_VERSION_NAME_LENGTH) {
            throw new Error(`Version name must be ${MAX_VERSION_NAME_LENGTH} characters or less`);
        }

        const version = await ctx.db
            .query("artifactVersions")
            .withIndex("by_artifactId_number", (q) =>
                q.eq("artifactId", args.artifactId).eq("number", args.number)
            )
            .first();

        if (!version || version.isDeleted) {
            throw new Error("Version not found");
        }

        await ctx.db.patch(version._id, {
            name: args.name ?? undefined,
        });

        return null;
    },
});

/**
 * Restore a soft-deleted version (Agent).
 */
export const restoreVersionInternal = internalMutation({
    args: {
        artifactId: v.id("artifacts"),
        number: v.number(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const version = await ctx.db
            .query("artifactVersions")
            .withIndex("by_artifactId_number", (q) =>
                q.eq("artifactId", args.artifactId).eq("number", args.number)
            )
            .first();

        if (!version) {
            throw new Error("Version not found");
        }

        if (!version.isDeleted) {
            throw new Error("Version is not deleted");
        }

        // Restore version
        await ctx.db.patch(version._id, {
            isDeleted: false,
            deletedAt: undefined,
            deletedBy: undefined,
        });

        // Cascade restore to artifact files
        const files = await ctx.db
            .query("artifactFiles")
            .withIndex("by_versionId", (q) =>
                q.eq("versionId", version._id)
            )
            .collect();

        for (const file of files) {
            if (file.isDeleted) {
                await ctx.db.patch(file._id, {
                    isDeleted: false,
                    deletedAt: undefined,
                    deletedBy: undefined,
                });
            }
        }

        return null;
    },
});
