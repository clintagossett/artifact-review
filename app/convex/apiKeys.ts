import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createLogger, Topics } from "./lib/logger";

const log = createLogger("apiKeys");

/**
 * List API keys for the current user.
 */
export const list = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const keys = await ctx.db
            .query("apiKeys")
            .withIndex("by_createdBy_active", (q) =>
                q.eq("createdBy", userId).eq("isDeleted", false)
            )
            .collect();

        // Basic list for now.
        return keys;
    },
});

/**
 * Create a new API Key.
 * Returns the raw key ONLY ONCE.
 */
export const create = action({
    args: {
        name: v.string(), // Key Label
        agentId: v.optional(v.id("agents")),
        scopes: v.array(v.string()), // ["editor"]
        expirationDays: v.optional(v.number()), // 30, 90, 365, or null (never)
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        // 1. Validate Agent Ownership if provided
        if (args.agentId) {
            // Use runQuery for internal query call
            const agent = await ctx.runQuery(internal.agents.getByIdInternal, { id: args.agentId });
            if (!agent || agent.createdBy !== userId) {
                throw new Error("Invalid Agent ID");
            }
        }

        // 2. Generate Key
        // Format: ar_live_[32_chars]
        const randomBytes = new Uint8Array(24); // 24 bytes => ~32 Base64 chars
        crypto.getRandomValues(randomBytes);
        const randomString = btoa(String.fromCharCode(...randomBytes))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
        const prefix = "ar_live_";
        const key = `${prefix}${randomString}`;

        // 3. Hash Key (SHA-256)
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        // 4. Calculate Expiration
        let expiresAt: number | undefined;
        if (args.expirationDays) {
            expiresAt = Date.now() + args.expirationDays * 24 * 60 * 60 * 1000;
        }

        // 5. Store Metadata (via internal mutation)
        await ctx.runMutation(internal.apiKeys.createInternal, {
            createdBy: userId,
            agentId: args.agentId,
            name: args.name,
            prefix: prefix + randomString.substring(0, 4), // Store prefix + first 4 chars of random part
            keyHash: keyHash,
            scopes: args.scopes,
            expiresAt: expiresAt,
        });

        log.info(Topics.Auth, "API Key created", {
            userId: userId.toString(),
            agentId: args.agentId?.toString(),
        });

        // 6. Return RAW key
        return {
            key: key,
            name: args.name,
            prefix: prefix,
        };
    },
});

/**
 * Revoke (delete) an API Key.
 */
const revokeKey = mutation({
    args: {
        id: v.id("apiKeys"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const key = await ctx.db.get(args.id);
        if (!key || key.createdBy !== userId) {
            throw new Error("Key not found or access denied");
        }

        await ctx.db.patch(args.id, {
            isDeleted: true,
            deletedAt: Date.now(),
            deletedBy: userId,
        });

        log.info(Topics.Auth, "API Key revoked", {
            userId: userId.toString(),
            keyId: args.id.toString(),
        });
    },
});

// Internal helper for mutation from action
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
// import { api } from "./_generated/api"; // Circular dependency risk? imports `api` which imports `agents`.
// Use `internal` for consistency.

export const createInternal = internalMutation({
    args: {
        createdBy: v.id("users"),
        agentId: v.optional(v.id("agents")),
        name: v.string(),
        prefix: v.string(),
        keyHash: v.string(),
        scopes: v.array(v.string()),
        expiresAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("apiKeys", {
            ...args,
            createdAt: Date.now(),
            isDeleted: false,
        });
    },
});

export const validateInternal = internalQuery({
    args: {
        prefix: v.string(),
        keyHash: v.string(),
    },
    handler: async (ctx, args) => {
        // Prefix is only 4 chars, so collisions are expected.
        // We must check all matches.
        const candidates = await ctx.db
            .query("apiKeys")
            .withIndex("by_prefix", (q) => q.eq("prefix", args.prefix))
            .collect();

        // Find the one that matches the hash and is valid
        const keyRecord = candidates.find(k =>
            k.keyHash === args.keyHash &&
            !k.isDeleted &&
            (!k.expiresAt || k.expiresAt > Date.now())
        );

        if (!keyRecord) return null;

        return {
            userId: keyRecord.createdBy,
            agentId: keyRecord.agentId,
            scopes: keyRecord.scopes,
        };
    },
});

export { revokeKey as delete };
