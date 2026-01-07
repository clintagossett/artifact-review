import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Store extracted file from ZIP archive
 * Uses action for storage.store() then calls mutation to create DB record
 */
// storeExtractedFile action removed as it's replaced by direct storage call in zipProcessor.ts

/**
 * Create artifactFile record in database (called from storeExtractedFile action)
 */
export const createArtifactFileRecord = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    path: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    size: v.number(),
  },
  returns: v.id("artifactFiles"),
  handler: async (ctx, args) => {
    const fileId = await ctx.db.insert("artifactFiles", {
      versionId: args.versionId,
      path: args.path,
      storageId: args.storageId,
      mimeType: args.mimeType,
      size: args.size,
      isDeleted: false,
      createdAt: Date.now(),
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
