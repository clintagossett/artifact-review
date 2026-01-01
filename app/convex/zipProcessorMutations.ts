import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Store extracted file from ZIP archive
 * Uses action for storage.store() then calls mutation to create DB record
 */
export const storeExtractedFile = internalAction({
  args: {
    versionId: v.id("artifactVersions"),
    filePath: v.string(),
    content: v.array(v.number()), // Uint8Array as number array
    mimeType: v.string(),
  },
  returns: v.id("artifactFiles"),
  handler: async (ctx, args): Promise<Id<"artifactFiles">> => {
    // Convert number array back to Uint8Array and create Blob
    const blob = new Blob([new Uint8Array(args.content)], { type: args.mimeType });

    // Store in Convex storage (only available in actions)
    const storageId = await ctx.storage.store(blob);

    // Create artifactFile record via mutation
    const fileId = await ctx.runMutation(internal.zipProcessorMutations.createArtifactFileRecord, {
      versionId: args.versionId,
      filePath: args.filePath,
      storageId,
      mimeType: args.mimeType,
      fileSize: args.content.length,
    });

    return fileId;
  },
});

/**
 * Create artifactFile record in database (called from storeExtractedFile action)
 */
export const createArtifactFileRecord = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    filePath: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  returns: v.id("artifactFiles"),
  handler: async (ctx, args) => {
    const fileId = await ctx.db.insert("artifactFiles", {
      versionId: args.versionId,
      filePath: args.filePath,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      isDeleted: false,
    });
    return fileId;
  },
});

/**
 * Mark ZIP processing as complete and update entry point
 */
export const markProcessingComplete = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    entryPoint: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.versionId, {
      entryPoint: args.entryPoint,
    });
    return null;
  },
});

/**
 * Mark ZIP processing as failed with error details
 * Task 00019 - Phase 1: Soft-delete version on processing error
 */
export const markProcessingError = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.error(`ZIP processing error for version ${args.versionId}:`, args.error);

    // Soft-delete the version on error to prevent partial artifacts
    // This makes the version invisible to users
    await ctx.db.patch(args.versionId, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return null;
  },
});
