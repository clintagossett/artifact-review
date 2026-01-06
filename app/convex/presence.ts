import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

const PRESENCE_HEARTBEAT_MS = 30000; // 30 seconds
const PRESENCE_SLA_MS = 45000; // 45 seconds (grace period)

/**
 * Update user presence for an artifact version
 */
export const update = mutation({
    args: {
        artifactId: v.id("artifacts"),
        versionId: v.id("artifactVersions"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const now = Date.now();

        // Find existing presence for this user + artifact
        const existing = await ctx.db
            .query("presence")
            .withIndex("by_userId_artifactId", (q) =>
                q.eq("userId", userId).eq("artifactId", args.artifactId)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                versionId: args.versionId,
                lastSeenAt: now,
            });
        } else {
            await ctx.db.insert("presence", {
                artifactId: args.artifactId,
                versionId: args.versionId,
                userId: userId,
                lastSeenAt: now,
                createdAt: now,
            });
        }

        return null;
    },
});

/**
 * List active users for an artifact
 * Enriches userId with names from the users table.
 */
export const list = query({
    args: {
        artifactId: v.id("artifacts"),
    },
    returns: v.array(
        v.object({
            userId: v.id("users"),
            versionId: v.id("artifactVersions"),
            name: v.string(),
            lastSeenAt: v.number(),
        })
    ),
    handler: async (ctx, args) => {
        const cutoff = Date.now() - PRESENCE_SLA_MS;

        const activePresence = await ctx.db
            .query("presence")
            .withIndex("by_artifactId_lastSeenAt", (q) =>
                q.eq("artifactId", args.artifactId).gt("lastSeenAt", cutoff)
            )
            .collect();

        const enriched = await Promise.all(
            activePresence.map(async (p) => {
                const user = await ctx.db.get(p.userId);
                return {
                    userId: p.userId,
                    versionId: p.versionId,
                    name: user?.name || user?.email || "Unknown User",
                    lastSeenAt: p.lastSeenAt,
                };
            })
        );

        return enriched;
    },
});
