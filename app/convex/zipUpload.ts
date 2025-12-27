import { mutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { nanoid } from "nanoid";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Create artifact with ZIP file type and generate upload URL
 * This is step 1 of the ZIP upload flow
 */
export const createArtifactWithZip = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    fileSize: v.number(),
    entryPoint: v.optional(v.string()),
  },
  returns: v.object({
    uploadUrl: v.string(),
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
    shareToken: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const shareToken = nanoid(8);

    // Create artifact
    const artifactId = await ctx.db.insert("artifacts", {
      title: args.title,
      description: args.description,
      creatorId: userId,
      shareToken,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create version 1 with ZIP type
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      versionNumber: 1,
      fileType: "zip",
      entryPoint: args.entryPoint,
      fileSize: args.fileSize,
      isDeleted: false,
      createdAt: now,
    });

    // Generate upload URL for the ZIP file
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
 * Trigger ZIP file processing after upload
 * This is step 2 of the ZIP upload flow (called after client uploads ZIP to storage)
 */
export const triggerZipProcessing = action({
  args: {
    versionId: v.id("artifactVersions"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Trigger the ZIP processor to extract and store files
    await ctx.runAction(internal.zipProcessor.processZipFile, {
      versionId: args.versionId,
      storageId: args.storageId,
    });

    return null;
  },
});
