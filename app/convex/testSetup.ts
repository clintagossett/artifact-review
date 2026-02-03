import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const setup = internalMutation({
    args: {},
    handler: async (ctx) => {
        // 1. Create specific test user if needed, or use existing one?
        // We can't easily "create" a user with auth ID.
        // Instead, we will search for an existing user or create a fake one?
        // Auth relies on `getAuthUserId`.
        // API Keys link to `userId`.
        // I need a valid `userId` (Id<"users">).

        // Grab the first user in DB
        const user = await ctx.db.query("users").first();
        if (!user) throw new Error("No users found. Run app first?");

        // 2. Create Agent
        const agentId = await ctx.db.insert("agents", {
            createdBy: user._id,
            name: "Test Agent",
            role: "Tester",
            isDeleted: false,
            createdAt: Date.now(),
        });

        // 3. Create API Key
        // Use the action `apiKeys.create`? No, action requires auth context.
        // Use `internal.apiKeys.createInternal` directly? 
        // Yes, but I need to generate the raw key and hash it here.

        const randomString = "TESTKEY1234567890";
        const prefix = "ar_live_";
        const key = `${prefix}${randomString}`;

        // Hash
        // Note: Node crypto required? Convex runtime supports Web Crypto API.
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        await ctx.db.insert("apiKeys", {
            createdBy: user._id,
            agentId: agentId,
            name: "Test API Key",
            prefix: prefix + randomString.substring(0, 4),
            keyHash: keyHash,
            scopes: ["all"],
            isDeleted: false,
            createdAt: Date.now(),
        });

        return { key, userId: user._id, agentId };
    },
});


export const setupComment = internalMutation({
    args: {
        userId: v.id("users"),
        versionId: v.id("artifactVersions"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("comments", {
            versionId: args.versionId,
            createdBy: args.userId,
            content: args.content,
            target: {},
            isEdited: false,
            isDeleted: false,
            createdAt: Date.now(),
        });
        return { success: true };
    },
});
