import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createLogger, Topics } from "./lib/logger";

const log = createLogger("agents");

/**
 * List all active agents for the current user.
 */
export const list = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const agents = await ctx.db
            .query("agents")
            .withIndex("by_createdBy_active", (q) =>
                q.eq("createdBy", userId).eq("isDeleted", false)
            )
            .collect();

        return agents;
    },
});

/**
 * Create a new Agent Profile.
 */
export const create = mutation({
    args: {
        name: v.string(),
        role: v.string(),
        avatar: v.optional(v.string()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const agentId = await ctx.db.insert("agents", {
            createdBy: userId,
            name: args.name,
            role: args.role,
            avatar: args.avatar,
            description: args.description,
            createdAt: Date.now(),
            isDeleted: false,
        });

        log.info(Topics.Auth, "Agent created", {
            userId: userId.toString(),
            agentId: agentId.toString(),
            name: args.name,
        });

        return agentId;
    },
});

/**
 * Update an Agent Profile.
 */
export const update = mutation({
    args: {
        id: v.id("agents"),
        name: v.optional(v.string()),
        role: v.optional(v.string()),
        avatar: v.optional(v.string()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const agent = await ctx.db.get(args.id);
        if (!agent || agent.createdBy !== userId || agent.isDeleted) {
            throw new Error("Agent not found or access denied");
        }

        const updates: any = {
            updatedAt: Date.now(),
        };
        if (args.name !== undefined) updates.name = args.name;
        if (args.role !== undefined) updates.role = args.role;
        if (args.avatar !== undefined) updates.avatar = args.avatar;
        if (args.description !== undefined) updates.description = args.description;

        await ctx.db.patch(args.id, updates);

        log.info(Topics.Auth, "Agent updated", {
            userId: userId.toString(),
            agentId: args.id.toString(),
        });
    },
});

/**
 * Soft-delete an Agent Profile.
 */
const deleteAgent = mutation({
    args: {
        id: v.id("agents"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const agent = await ctx.db.get(args.id);
        if (!agent || agent.createdBy !== userId || agent.isDeleted) {
            throw new Error("Agent not found or access denied");
        }

        await ctx.db.patch(args.id, {
            isDeleted: true,
            deletedAt: Date.now(),
            deletedBy: userId,
        });

        log.info(Topics.Auth, "Agent deleted", {
            userId: userId.toString(),
            agentId: args.id.toString(),
        });
    },
});

export { deleteAgent as delete };

import { internalQuery } from "./_generated/server";

export const getByIdInternal = internalQuery({
    args: { id: v.id("agents") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
