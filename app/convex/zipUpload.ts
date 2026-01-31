import { mutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { nanoid } from "nanoid";
import { getAuthUserId } from "@convex-dev/auth/server";
import { validateZipSize } from "./lib/fileTypes";
import { createLogger, LOG_TOPICS } from "./lib/logger";

/**
 * Create artifact with ZIP file type and generate upload URL
 * This is step 1 of the ZIP upload flow
 * Task 00019 - Phase 1: Added size validation
 */
export const createArtifactWithZip = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    size: v.number(),
    entryPoint: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
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

    // Resolve Organization
    let organizationId = args.organizationId;
    if (!organizationId) {
      // Default to user's personal/first org
      const member = await ctx.db.query("members").withIndex("by_userId", q => q.eq("userId", userId)).first();
      if (!member) throw new Error("User has no organization");
      organizationId = member.organizationId;
    }

    // Validate ZIP size before creating records
    validateZipSize(args.size);

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
    // Note: entryPoint will be updated by zipProcessor after extraction
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      number: 1,
      createdBy: userId,
      fileType: "zip",
      entryPoint: args.entryPoint || "index.html", // Default, updated after ZIP processing
      size: args.size,
      status: "uploading", // Task 00049 - Set initial status
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
    size: v.number(),
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
    validateZipSize(args.size);

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
      size: args.size,
      status: "uploading", // Task 00049 - Set initial status
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

const triggerLog = createLogger("zipUpload.triggerZipProcessing");

/**
 * Trigger ZIP file processing after upload
 * This is step 2 of the ZIP upload flow (called after client uploads ZIP to storage)
 *
 * @param _testDelayMs - Optional delay in ms before completing (for visual/async testing)
 */
export const triggerZipProcessing = action({
  args: {
    versionId: v.id("artifactVersions"),
    storageId: v.id("_storage"),
    _testDelayMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    triggerLog.debug(LOG_TOPICS.Artifact, "Starting ZIP processing", {
      versionId: args.versionId,
      storageId: args.storageId,
      _testDelayMs: args._testDelayMs,
    });

    try {
      // Trigger the ZIP processor to extract and store files
      await ctx.runAction(internal.zipProcessor.processZipFile, {
        versionId: args.versionId,
        storageId: args.storageId,
        _testDelayMs: args._testDelayMs,
      });
      triggerLog.debug(LOG_TOPICS.Artifact, "ZIP processing completed successfully");
    } catch (error) {
      triggerLog.error(LOG_TOPICS.Artifact, "ZIP processing failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    return null;
  },
});
