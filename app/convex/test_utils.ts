import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { nanoid } from "nanoid";
import { Id } from "./_generated/dataModel";

/**
 * Internal mutation to create artifact for testing (skips auth)
 */
export const createArtifactForTest = internalMutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        size: v.number(),
    },
    handler: async (ctx, args) => {
        // Fetch the specific browser user if possible
        let user = await ctx.db.query("users")
            .filter(q => q.eq(q.field("email"), "clintagossett@gmail.com"))
            .first();

        if (!user) {
            // Fallback to any user
            user = await ctx.db.query("users").first();
        }
        if (!user) {
            const userId = await ctx.db.insert("users", {
                name: "Test User",
                email: "test@example.com",
                createdAt: Date.now(),
                // Add other required fields if any, checking schema if needed
                // Assuming minimal schema for now based on typical setup
            });
            user = await ctx.db.get(userId);
        }
        const userId = user!._id;

        // Task 33: Ensure User has Organization
        let membership = await ctx.db.query("members")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .first();

        if (!membership) {
            // Bootstrap org if missing (legacy test users)
            const orgId = await ctx.db.insert("organizations", {
                name: "Test Org",
                createdAt: Date.now(),
                createdBy: userId,
            });
            const memberId = await ctx.db.insert("members", {
                userId,
                organizationId: orgId,
                roles: ["owner"],
                createdAt: Date.now(),
                createdBy: userId,
            });
            membership = await ctx.db.get(memberId);
        }

        const organizationId = membership!.organizationId;

        const now = Date.now();
        const shareToken = nanoid(8);

        // Create artifact
        const artifactId = await ctx.db.insert("artifacts", {
            name: args.name,
            description: args.description,
            createdBy: userId,
            organizationId,
            shareToken,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
        });

        // Create version 1 with ZIP type
        const versionId = await ctx.db.insert("artifactVersions", {
            artifactId,
            number: 1,
            createdBy: userId,
            fileType: "zip",
            entryPoint: "index.html",
            size: args.size,
            isDeleted: false,
            createdAt: now,
        });

        // Generate upload URL
        const uploadUrl = await ctx.storage.generateUploadUrl();

        return {
            uploadUrl,
            artifactId,
            versionId,
            shareToken,
        };
    },
});

/**
 * Internal action to trigger processing for testing
 */
export const triggerZipProcessingForTest = internalAction({
    args: {
        versionId: v.id("artifactVersions"),
        storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        // Trigger the ZIP processor
        await ctx.runAction(internal.zipProcessor.processZipFile, {
            versionId: args.versionId,
            storageId: args.storageId,
        });
    },
});
