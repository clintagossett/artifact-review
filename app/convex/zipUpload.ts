import { mutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { nanoid } from "nanoid";
import { getAuthUserId } from "@convex-dev/auth/server";
import { validateZipSize } from "./lib/fileTypes";

/**
 * Create artifact with ZIP file type and generate upload URL
 * This is step 1 of the ZIP upload flow
 * Task 00019 - Phase 1: Added size validation
 */
export const createArtifactWithZip = mutation({
  args: {
    name: v.string(),
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

    // Validate ZIP size before creating records
    validateZipSize(args.fileSize);

    const now = Date.now();
    const shareToken = nanoid(8);

    // Create artifact
    const artifactId = await ctx.db.insert("artifacts", {
      name: args.name,
      description: args.description,
      createdBy: userId,
      shareToken,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create version 1 with ZIP type
    // Note: entryPoint will be updated by zipProcessor after extraction
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      number: 1,
      createdBy: userId,
      fileType: "zip",
      entryPoint: args.entryPoint || "index.html", // Default, updated after ZIP processing
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
 * Add a ZIP version to an existing artifact
 * Task 00019 - Phase 1: New function for ZIP versioning
 */
export const addZipVersion = mutation({
  args: {
    artifactId: v.id("artifacts"),
    fileSize: v.number(),
    name: v.optional(v.string()),
  },
  returns: v.object({
    uploadUrl: v.string(),
    versionId: v.id("artifactVersions"),
    number: v.number(),
  }),
  handler: async (ctx, args) => {
    // 1. Authenticate
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 2. Validate ZIP size
    validateZipSize(args.fileSize);

    // 3. Verify artifact exists and user is owner
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact || artifact.isDeleted) {
      throw new Error("Artifact not found");
    }
    if (artifact.createdBy !== userId) {
      throw new Error("Not authorized: Only the owner can add versions");
    }

    // 4. Get next version number (query existing versions)
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .collect();
    const maxVersionNumber = Math.max(...versions.map((v) => v.number), 0);
    const newVersionNumber = maxVersionNumber + 1;

    const now = Date.now();

    // 5. Create version record with fileType: "zip"
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId: args.artifactId,
      number: newVersionNumber,
      createdBy: userId,
      name: args.name,
      fileType: "zip",
      entryPoint: "index.html", // Updated after extraction
      fileSize: args.fileSize,
      isDeleted: false,
      createdAt: now,
    });

    // 6. Update artifact timestamp
    await ctx.db.patch(args.artifactId, {
      updatedAt: now,
    });

    // 7. Generate and return upload URL
    const uploadUrl = await ctx.storage.generateUploadUrl();

    return {
      uploadUrl,
      versionId,
      number: newVersionNumber,
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
