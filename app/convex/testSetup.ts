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
        const commentId = await ctx.db.insert("comments", {
            versionId: args.versionId,
            createdBy: args.userId,
            content: args.content,
            target: {},
            isEdited: false,
            isDeleted: false,
            createdAt: Date.now(),
        });
        return { success: true, commentId };
    },
});

/**
 * Setup test reply with configurable agentId/agentName for migration testing.
 *
 * Test cases:
 * 1. UI-created reply: no agentId, no agentName
 * 2. API-created reply (old): agentId + agentName (needs migration)
 * 3. API-created reply (new): agentId only, no agentName
 * 4. Edge case: agentName but no agentId (shouldn't happen, but test it)
 */
export const setupReply = internalMutation({
    args: {
        commentId: v.id("comments"),
        userId: v.id("users"),
        content: v.string(),
        // Optional agent fields for testing different scenarios
        agentId: v.optional(v.id("agents")),
        agentName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Build the reply document with optional agent fields
        const replyDoc: any = {
            commentId: args.commentId,
            createdBy: args.userId,
            content: args.content,
            isEdited: false,
            isDeleted: false,
            createdAt: Date.now(),
        };

        // Only add agent fields if provided (to test different scenarios)
        if (args.agentId !== undefined) {
            replyDoc.agentId = args.agentId;
        }
        if (args.agentName !== undefined) {
            replyDoc.agentName = args.agentName;
        }

        const replyId = await ctx.db.insert("commentReplies", replyDoc);
        return { replyId };
    },
});

/**
 * Setup multiple test replies for migration testing.
 * Creates all 4 test cases in one call for convenience.
 */
export const setupMigrationTestReplies = internalMutation({
    args: {
        commentId: v.id("comments"),
        userId: v.id("users"),
        agentId: v.id("agents"),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const results: { case: string; replyId: any; hasAgentId: boolean; hasAgentName: boolean }[] = [];

        // Case 1: UI-created reply (no agent fields)
        const reply1 = await ctx.db.insert("commentReplies", {
            commentId: args.commentId,
            createdBy: args.userId,
            content: "UI-created reply - no agent fields",
            isEdited: false,
            isDeleted: false,
            createdAt: now,
        });
        results.push({ case: "ui_created", replyId: reply1, hasAgentId: false, hasAgentName: false });

        // Case 2: Old API-created reply (agentId + agentName - needs migration)
        const reply2 = await ctx.db.insert("commentReplies", {
            commentId: args.commentId,
            createdBy: args.userId,
            content: "Old API reply - has agentName (needs migration)",
            agentId: args.agentId,
            agentName: "Stale Agent Name",
            isEdited: false,
            isDeleted: false,
            createdAt: now + 1,
        } as any);
        results.push({ case: "old_api_with_agentName", replyId: reply2, hasAgentId: true, hasAgentName: true });

        // Case 3: New API-created reply (agentId only, no agentName)
        const reply3 = await ctx.db.insert("commentReplies", {
            commentId: args.commentId,
            createdBy: args.userId,
            content: "New API reply - agentId only",
            agentId: args.agentId,
            isEdited: false,
            isDeleted: false,
            createdAt: now + 2,
        } as any);
        results.push({ case: "new_api_agentId_only", replyId: reply3, hasAgentId: true, hasAgentName: false });

        // Case 4: Edge case - agentName but no agentId (shouldn't happen in practice)
        const reply4 = await ctx.db.insert("commentReplies", {
            commentId: args.commentId,
            createdBy: args.userId,
            content: "Edge case - agentName without agentId",
            agentName: "Orphaned Agent Name",
            isEdited: false,
            isDeleted: false,
            createdAt: now + 3,
        } as any);
        results.push({ case: "orphaned_agentName", replyId: reply4, hasAgentId: false, hasAgentName: true });

        return { replies: results };
    },
});
