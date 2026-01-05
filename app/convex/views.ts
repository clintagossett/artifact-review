import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

const VIEW_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Record a new view for an artifact version.
 * Implements the 3-tier tracking model with a 5-minute debounce.
 */
export const record = mutation({
    args: {
        artifactId: v.id("artifacts"),
        versionId: v.id("artifactVersions"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const now = Date.now();

        // 1. Check existing version stats for debounce logic
        const existingStats = await ctx.db
            .query("artifactVersionStats")
            .withIndex("by_versionId_userId", (q) =>
                q.eq("versionId", args.versionId).eq("userId", userId)
            )
            .unique();

        const isNewSession = !existingStats || (now - existingStats.lastViewedAt) > VIEW_DEBOUNCE_MS;

        if (isNewSession) {
            // TIER 3: Ledger - Log the granular view record
            await ctx.db.insert("artifactViews", {
                artifactId: args.artifactId,
                versionId: args.versionId,
                userId: userId,
                viewedAt: now,
            });

            // TIER 2: Aggregate - Upsert into artifactVersionStats
            if (existingStats) {
                await ctx.db.patch(existingStats._id, {
                    lastViewedAt: now,
                    viewCount: existingStats.viewCount + 1,
                });
            } else {
                await ctx.db.insert("artifactVersionStats", {
                    artifactId: args.artifactId,
                    versionId: args.versionId,
                    userId: userId,
                    firstViewedAt: now,
                    lastViewedAt: now,
                    viewCount: 1,
                });
            }
        } else if (existingStats) {
            // Just refresh the last seen time in the aggregate
            await ctx.db.patch(existingStats._id, {
                lastViewedAt: now,
            });
        }

        // TIER 1/Cache: Update main artifactAccess record
        const access = await ctx.db
            .query("artifactAccess")
            .withIndex("by_artifactId_userId", (q) =>
                q.eq("artifactId", args.artifactId).eq("userId", userId)
            )
            .unique();

        if (access) {
            await ctx.db.patch(access._id, {
                firstViewedAt: access.firstViewedAt ?? now,
                lastViewedAt: now,
            });
        }

        return null;
    },
});

/**
 * List view stats for all users of a specific artifact version.
 * (Requirement 2 & 3 - Optimized Tier 2 Lookup)
 */
export const listByVersion = query({
    args: {
        versionId: v.id("artifactVersions"),
    },
    returns: v.array(
        v.object({
            userId: v.id("users"),
            name: v.string(),
            viewCount: v.number(),
            firstViewedAt: v.number(),
            lastViewedAt: v.number(),
        })
    ),
    handler: async (ctx, args) => {
        const stats = await ctx.db
            .query("artifactVersionStats")
            .withIndex("by_versionId_userId", (q) => q.eq("versionId", args.versionId))
            .collect();

        const enriched = await Promise.all(
            stats.map(async (s) => {
                const user = await ctx.db.get(s.userId);
                return {
                    userId: s.userId,
                    name: user?.name || user?.email || "Unknown User",
                    viewCount: s.viewCount,
                    firstViewedAt: s.firstViewedAt,
                    lastViewedAt: s.lastViewedAt,
                };
            })
        );

        return enriched.sort((a, b) => b.lastViewedAt - a.lastViewedAt);
    },
});

/**
 * List all version stats for a specific user on an artifact.
 * (Requirement 4 - Optimized Tier 2 Lookup)
 */
export const listByUser = query({
    args: {
        artifactId: v.id("artifacts"),
        userId: v.id("users"),
    },
    returns: v.array(
        v.object({
            versionId: v.id("artifactVersions"),
            viewCount: v.number(),
            firstViewedAt: v.number(),
            lastViewedAt: v.number(),
        })
    ),
    handler: async (ctx, args) => {
        const stats = await ctx.db
            .query("artifactVersionStats")
            .withIndex("by_userId_artifactId", (q) =>
                q.eq("userId", args.userId).eq("artifactId", args.artifactId)
            )
            .collect();

        return stats.map((s) => ({
            versionId: s.versionId,
            viewCount: s.viewCount,
            firstViewedAt: s.firstViewedAt,
            lastViewedAt: s.lastViewedAt,
        }));
    },
});

/**
 * List all version stats for all users of a specific artifact.
 * Used for building the User-vs-Version matrix in the dashboard.
 */
export const listAllStats = query({
    args: {
        artifactId: v.id("artifacts"),
    },
    returns: v.array(
        v.object({
            userId: v.id("users"),
            versionId: v.id("artifactVersions"),
            viewCount: v.number(),
            firstViewedAt: v.number(),
            lastViewedAt: v.number(),
        })
    ),
    handler: async (ctx, args) => {
        return await ctx.db
            .query("artifactVersionStats")
            .withIndex("by_artifactId_versionId", (q) => q.eq("artifactId", args.artifactId))
            .collect();
    },
});
