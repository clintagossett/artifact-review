import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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

/**
 * Edit comment content (Agent).
 */
export const editComment = internalMutation({
    args: {
        commentId: v.id("comments"),
        content: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const comment = await ctx.db.get(args.commentId);
        if (!comment || comment.isDeleted) throw new Error("Comment not found");

        if (comment.createdBy !== args.userId) {
            throw new Error("Unauthorized: Can only edit own comments");
        }

        const now = Date.now();
        await ctx.db.patch(args.commentId, {
            content: args.content,
            isEdited: true,
            editedAt: now,
        });
    }
});

/**
 * Delete comment (Agent).
 */
export const deleteComment = internalMutation({
    args: {
        commentId: v.id("comments"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const comment = await ctx.db.get(args.commentId);
        if (!comment || comment.isDeleted) throw new Error("Comment not found");

        if (comment.createdBy !== args.userId) {
            throw new Error("Unauthorized: Can only delete own comments");
        }

        const now = Date.now();
        await ctx.db.patch(args.commentId, {
            isDeleted: true,
            deletedAt: now,
            deletedBy: args.userId,
        });

        // Cascade to replies
        const replies = await ctx.db
            .query("commentReplies")
            .withIndex("by_commentId_active", (q) =>
                q.eq("commentId", args.commentId).eq("isDeleted", false)
            )
            .collect();

        for (const reply of replies) {
            await ctx.db.patch(reply._id, {
                isDeleted: true,
                deletedAt: now,
                deletedBy: args.userId,
            });
        }
    }
});

/**
 * Edit reply (Agent).
 */
export const editReply = internalMutation({
    args: {
        replyId: v.id("commentReplies"),
        content: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const reply = await ctx.db.get(args.replyId);
        if (!reply || reply.isDeleted) throw new Error("Reply not found");

        if (reply.createdBy !== args.userId) {
            throw new Error("Unauthorized: Can only edit own replies");
        }

        const now = Date.now();
        await ctx.db.patch(args.replyId, {
            content: args.content,
            isEdited: true,
            editedAt: now,
        });
    }
});

/**
 * Delete reply (Agent).
 */
export const deleteReply = internalMutation({
    args: {
        replyId: v.id("commentReplies"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const reply = await ctx.db.get(args.replyId);
        if (!reply || reply.isDeleted) throw new Error("Reply not found");

        if (reply.createdBy !== args.userId) {
            throw new Error("Unauthorized: Can only delete own replies");
        }

        const now = Date.now();
        await ctx.db.patch(args.replyId, {
            isDeleted: true,
            deletedAt: now,
            deletedBy: args.userId,
        });
    }
});

// ============================================================================
// SHARING & ACCESS MANAGEMENT (Agent API)
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
 * Create or update share link (Agent).
 */
export const createShareLink = internalMutation({
    args: {
        artifactId: v.id("artifacts"),
        userId: v.id("users"),
        enabled: v.optional(v.boolean()),
        capabilities: v.optional(v.object({
            readComments: v.boolean(),
            writeComments: v.boolean(),
        })),
    },
    returns: v.object({
        shareUrl: v.string(),
        enabled: v.boolean(),
        capabilities: v.object({
            readComments: v.boolean(),
            writeComments: v.boolean(),
        }),
    }),
    handler: async (ctx, args) => {
        const now = Date.now();
        const siteUrl = process.env.SITE_URL || "https://artifact.review";

        // Check for existing share
        const existingShare = await ctx.db
            .query("artifactShares")
            .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
            .first();

        const defaultCapabilities = { readComments: true, writeComments: false };
        const capabilities = args.capabilities ?? defaultCapabilities;
        const enabled = args.enabled ?? true;

        if (existingShare) {
            // Update existing share
            await ctx.db.patch(existingShare._id, {
                enabled,
                capabilities,
                updatedBy: args.userId,
                updatedAt: now,
            });

            return {
                shareUrl: `${siteUrl}/share/${existingShare.token}`,
                enabled,
                capabilities,
            };
        }

        // Create new share
        const token = crypto.randomUUID();
        await ctx.db.insert("artifactShares", {
            token,
            artifactId: args.artifactId,
            capabilities,
            enabled,
            createdBy: args.userId,
            createdAt: now,
        });

        return {
            shareUrl: `${siteUrl}/share/${token}`,
            enabled,
            capabilities,
        };
    },
});

/**
 * Update share link settings (Agent).
 */
export const updateShareLink = internalMutation({
    args: {
        artifactId: v.id("artifacts"),
        userId: v.id("users"),
        enabled: v.optional(v.boolean()),
        capabilities: v.optional(v.object({
            readComments: v.boolean(),
            writeComments: v.boolean(),
        })),
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

        const now = Date.now();
        const siteUrl = process.env.SITE_URL || "https://artifact.review";

        const updates: any = {
            updatedBy: args.userId,
            updatedAt: now,
        };

        if (args.enabled !== undefined) {
            updates.enabled = args.enabled;
        }
        if (args.capabilities !== undefined) {
            updates.capabilities = args.capabilities;
        }

        await ctx.db.patch(share._id, updates);

        return {
            shareUrl: `${siteUrl}/share/${share.token}`,
            enabled: args.enabled ?? share.enabled,
            capabilities: args.capabilities ?? share.capabilities,
        };
    },
});

/**
 * Delete (disable) share link (Agent).
 */
export const deleteShareLink = internalMutation({
    args: {
        artifactId: v.id("artifacts"),
        userId: v.id("users"),
    },
    returns: v.boolean(),
    handler: async (ctx, args) => {
        const share = await ctx.db
            .query("artifactShares")
            .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
            .first();

        if (!share) return false;

        await ctx.db.patch(share._id, {
            enabled: false,
            updatedBy: args.userId,
            updatedAt: Date.now(),
        });

        return true;
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
 * Grant access to an artifact (Agent).
 */
export const grantAccess = internalMutation({
    args: {
        artifactId: v.id("artifacts"),
        userId: v.id("users"),
        email: v.string(),
    },
    returns: v.id("artifactAccess"),
    handler: async (ctx, args) => {
        const normalizedEmail = args.email.toLowerCase().trim();
        const now = Date.now();

        // Check if user with this email exists
        const existingUser = await ctx.db
            .query("users")
            .withIndex("email", (q) => q.eq("email", normalizedEmail))
            .first();

        // Check for existing access
        if (existingUser) {
            const existingAccess = await ctx.db
                .query("artifactAccess")
                .withIndex("by_artifactId_userId", (q) =>
                    q.eq("artifactId", args.artifactId).eq("userId", existingUser._id)
                )
                .first();

            if (existingAccess) {
                if (existingAccess.isDeleted) {
                    // Un-delete
                    await ctx.db.patch(existingAccess._id, {
                        isDeleted: false,
                        deletedAt: undefined,
                        lastSentAt: now,
                        sendCount: existingAccess.sendCount + 1,
                    });
                }
                return existingAccess._id;
            }

            // Create new access for existing user
            return await ctx.db.insert("artifactAccess", {
                artifactId: args.artifactId,
                userId: existingUser._id,
                createdBy: args.userId,
                createdAt: now,
                lastSentAt: now,
                sendCount: 1,
                isDeleted: false,
            });
        }

        // Check for existing invite from this owner
        let userInvite = await ctx.db
            .query("userInvites")
            .withIndex("by_email_createdBy", (q) =>
                q.eq("email", normalizedEmail).eq("createdBy", args.userId)
            )
            .first();

        if (!userInvite) {
            // Create new invite
            const inviteId = await ctx.db.insert("userInvites", {
                email: normalizedEmail,
                createdBy: args.userId,
                createdAt: now,
                isDeleted: false,
            });
            userInvite = await ctx.db.get(inviteId);
        }

        // Check for existing access with this invite
        const existingInviteAccess = await ctx.db
            .query("artifactAccess")
            .withIndex("by_artifactId_userInviteId", (q) =>
                q.eq("artifactId", args.artifactId).eq("userInviteId", userInvite!._id)
            )
            .first();

        if (existingInviteAccess) {
            if (existingInviteAccess.isDeleted) {
                await ctx.db.patch(existingInviteAccess._id, {
                    isDeleted: false,
                    deletedAt: undefined,
                    lastSentAt: now,
                    sendCount: existingInviteAccess.sendCount + 1,
                });
            }
            return existingInviteAccess._id;
        }

        // Create new access for invite
        return await ctx.db.insert("artifactAccess", {
            artifactId: args.artifactId,
            userInviteId: userInvite!._id,
            createdBy: args.userId,
            createdAt: now,
            lastSentAt: now,
            sendCount: 1,
            isDeleted: false,
        });
    },
});

/**
 * Revoke access (Agent).
 */
export const revokeAccess = internalMutation({
    args: {
        accessId: v.id("artifactAccess"),
        userId: v.id("users"),
    },
    returns: v.boolean(),
    handler: async (ctx, args) => {
        const access = await ctx.db.get(args.accessId);
        if (!access || access.isDeleted) return false;

        await ctx.db.patch(args.accessId, {
            isDeleted: true,
            deletedAt: Date.now(),
        });

        return true;
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
