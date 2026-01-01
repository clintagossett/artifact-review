/**
 * Migration Script: Convert Inline Content to Unified Storage
 *
 * Task: 00018 - Phase 1 - Upload Flow + Write Permissions
 * Step: 8 - Migration Script
 *
 * This script migrates existing artifacts from inline content storage
 * (htmlContent/markdownContent fields) to unified blob storage (artifactFiles table).
 *
 * ## Migration Process
 * 1. Check status: `npx convex run migrations/migrateToUnifiedStorage:countPendingMigrations`
 * 2. Dry run: `npx convex run migrations/migrateToUnifiedStorage:migrateBatch --args '{"dryRun": true}'`
 * 3. Run migration: `npx convex run migrations/migrateToUnifiedStorage:migrateBatch --args '{"batchSize": 25}'`
 * 4. Backfill createdBy: `npx convex run migrations/migrateToUnifiedStorage:backfillCreatedBy`
 * 5. Verify: `npx convex run migrations/migrateToUnifiedStorage:verifyMigration`
 */

import { internalMutation, internalQuery, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Count versions needing migration
 */
export const countPendingMigrations = internalQuery({
  args: {},
  returns: v.object({
    total: v.number(),
    withInlineContent: v.number(),
    withArtifactFiles: v.number(),
    needsMigration: v.number(),
    needsCreatedByBackfill: v.number(),
  }),
  handler: async (ctx) => {
    const versions = await ctx.db.query("artifactVersions").collect();

    let withInlineContent = 0;
    let withArtifactFiles = 0;
    let needsCreatedByBackfill = 0;

    for (const version of versions) {
      // Check for inline content
      if ((version as any).htmlContent || (version as any).markdownContent) {
        withInlineContent++;
      }

      // Check for artifactFiles
      const files = await ctx.db
        .query("artifactFiles")
        .withIndex("by_version", (q) => q.eq("versionId", version._id))
        .first();
      if (files) {
        withArtifactFiles++;
      }

      // Check if createdBy needs backfill
      if (!version.createdBy) {
        needsCreatedByBackfill++;
      }
    }

    // Versions needing migration: have inline content but no artifactFiles
    const needsMigration = await countVersionsNeedingMigration(ctx, versions);

    return {
      total: versions.length,
      withInlineContent,
      withArtifactFiles,
      needsMigration,
      needsCreatedByBackfill,
    };
  },
});

/**
 * Helper to count versions that need migration (have inline content but no artifactFiles)
 */
async function countVersionsNeedingMigration(ctx: any, versions: any[]): Promise<number> {
  let count = 0;
  for (const version of versions) {
    const hasInline = (version as any).htmlContent || (version as any).markdownContent;
    if (hasInline) {
      const files = await ctx.db
        .query("artifactFiles")
        .withIndex("by_version", (q: any) => q.eq("versionId", version._id))
        .first();
      if (!files) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Migrate a batch of versions from inline content to blob storage
 *
 * Run with: npx convex run migrations/migrateToUnifiedStorage:migrateBatch
 */
export const migrateBatch = internalAction({
  args: {
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    processed: v.number(),
    migrated: v.number(),
    skipped: v.number(),
    errors: v.array(v.string()),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args): Promise<{
    processed: number;
    migrated: number;
    skipped: number;
    errors: string[];
    hasMore: boolean;
  }> => {
    const batchSize = args.batchSize ?? 25;
    const dryRun = args.dryRun ?? false;

    // Get versions needing migration
    const versionsToMigrate: any[] = await ctx.runQuery(
      internal.migrations.migrateToUnifiedStorage.getVersionsToMigrate,
      { batchSize }
    );

    let processed = 0;
    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const versionData of versionsToMigrate) {
      processed++;

      if (dryRun) {
        migrated++;
        continue;
      }

      try {
        // Store content in file storage (only available in actions)
        const contentBlob = new Blob([versionData.content], { type: versionData.mimeType });
        const storageId = await ctx.storage.store(contentBlob);

        // Call mutation to create file record and update version
        await ctx.runMutation(
          internal.migrations.migrateToUnifiedStorage.migrateVersionInternal,
          {
            versionId: versionData.versionId,
            filePath: versionData.filePath,
            storageId,
            mimeType: versionData.mimeType,
            fileSize: contentBlob.size,
            isDeleted: versionData.isDeleted,
            deletedAt: versionData.deletedAt,
            createdBy: versionData.createdBy,
          }
        );

        migrated++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Version ${versionData.versionId}: ${msg}`);
      }
    }

    // Check if there are more to process
    const hasMore: boolean = await ctx.runQuery(
      internal.migrations.migrateToUnifiedStorage.hasMoreToMigrate,
      {}
    );

    return {
      processed,
      migrated,
      skipped,
      errors,
      hasMore,
    };
  },
});

/**
 * Get versions that need migration (called by migrateBatch action)
 */
export const getVersionsToMigrate = internalQuery({
  args: {
    batchSize: v.number(),
  },
  returns: v.array(
    v.object({
      versionId: v.id("artifactVersions"),
      content: v.string(),
      filePath: v.string(),
      mimeType: v.string(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdBy: v.union(v.id("users"), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const versions = await ctx.db.query("artifactVersions").collect();
    const result: any[] = [];

    for (const version of versions) {
      if (result.length >= args.batchSize) break;

      // Check if has inline content
      const htmlContent = (version as any).htmlContent as string | undefined;
      const markdownContent = (version as any).markdownContent as string | undefined;

      if (!htmlContent && !markdownContent) {
        continue; // No inline content, skip
      }

      // Check if already has artifactFiles
      const existingFiles = await ctx.db
        .query("artifactFiles")
        .withIndex("by_version", (q) => q.eq("versionId", version._id))
        .first();

      if (existingFiles) {
        continue; // Already migrated, skip entirely
      }

      // Get parent artifact for createdBy backfill
      const artifact = await ctx.db.get(version.artifactId);
      if (!artifact) {
        continue; // Skip orphaned versions
      }

      // Prepare data for migration
      const content = htmlContent || markdownContent!;
      const filePath = version.entryPoint || (htmlContent ? "index.html" : "README.md");
      const mimeType = htmlContent ? "text/html" : "text/markdown";

      result.push({
        versionId: version._id,
        content,
        filePath,
        mimeType,
        isDeleted: version.isDeleted,
        deletedAt: version.deletedAt,
        createdBy: version.createdBy || artifact.creatorId,
      });
    }

    return result;
  },
});

/**
 * Internal mutation to create file record and update version
 */
export const migrateVersionInternal = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    filePath: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileSize: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdBy: v.union(v.id("users"), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Create artifactFiles record
    await ctx.db.insert("artifactFiles", {
      versionId: args.versionId,
      filePath: args.filePath,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      isDeleted: args.isDeleted,
      deletedAt: args.deletedAt,
    });

    // Update version with entryPoint and createdBy
    const updates: any = {
      entryPoint: args.filePath,
    };
    if (args.createdBy) {
      updates.createdBy = args.createdBy;
    }
    await ctx.db.patch(args.versionId, updates);

    return null;
  },
});

/**
 * Check if there are more versions to migrate
 */
export const hasMoreToMigrate = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const versions = await ctx.db.query("artifactVersions").collect();

    for (const version of versions) {
      const htmlContent = (version as any).htmlContent as string | undefined;
      const markdownContent = (version as any).markdownContent as string | undefined;

      if (!htmlContent && !markdownContent) {
        continue;
      }

      const existingFiles = await ctx.db
        .query("artifactFiles")
        .withIndex("by_version", (q) => q.eq("versionId", version._id))
        .first();

      if (!existingFiles) {
        return true; // Found at least one version needing migration
      }
    }

    return false;
  },
});

/**
 * Backfill createdBy field for versions that don't have it
 */
export const backfillCreatedBy = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    updated: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    let updated = 0;
    const errors: string[] = [];

    const versions = await ctx.db
      .query("artifactVersions")
      .collect();

    for (const version of versions) {
      if (updated >= batchSize) break;

      if (version.createdBy) {
        continue; // Already has createdBy
      }

      const artifact = await ctx.db.get(version.artifactId);
      if (!artifact) {
        errors.push(`Version ${version._id}: No parent artifact`);
        continue;
      }

      await ctx.db.patch(version._id, {
        createdBy: artifact.creatorId,
      });
      updated++;
    }

    return { updated, errors };
  },
});

/**
 * Verify migration completeness
 */
export const verifyMigration = internalQuery({
  args: {},
  returns: v.object({
    isComplete: v.boolean(),
    issues: v.array(v.string()),
    stats: v.object({
      totalVersions: v.number(),
      versionsWithFiles: v.number(),
      versionsWithCreatedBy: v.number(),
      versionsWithEntryPoint: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const versions = await ctx.db.query("artifactVersions").collect();
    const issues: string[] = [];

    let versionsWithFiles = 0;
    let versionsWithCreatedBy = 0;
    let versionsWithEntryPoint = 0;

    for (const version of versions) {
      // Check for artifactFiles (required for non-ZIP in unified model)
      if (version.fileType !== "zip") {
        const files = await ctx.db
          .query("artifactFiles")
          .withIndex("by_version", (q) => q.eq("versionId", version._id))
          .first();
        if (files) {
          versionsWithFiles++;
        } else {
          issues.push(`Version ${version._id} (${version.fileType}): Missing artifactFiles`);
        }
      } else {
        versionsWithFiles++; // ZIP files already use artifactFiles
      }

      // Check createdBy
      if (version.createdBy) {
        versionsWithCreatedBy++;
      } else {
        issues.push(`Version ${version._id}: Missing createdBy`);
      }

      // Check entryPoint
      if (version.entryPoint) {
        versionsWithEntryPoint++;
      } else {
        issues.push(`Version ${version._id}: Missing entryPoint`);
      }
    }

    return {
      isComplete: issues.length === 0,
      issues: issues.slice(0, 50), // Limit output
      stats: {
        totalVersions: versions.length,
        versionsWithFiles,
        versionsWithCreatedBy,
        versionsWithEntryPoint,
      },
    };
  },
});

/**
 * Fix missing entryPoints for ZIP versions
 */
export const fixMissingEntryPoints = internalMutation({
  args: {},
  returns: v.object({
    fixed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const versions = await ctx.db.query("artifactVersions").collect();
    let fixed = 0;
    const errors: string[] = [];

    for (const version of versions) {
      if (version.entryPoint) {
        continue; // Already has entryPoint
      }

      try {
        // For ZIP files, find the first HTML file in artifactFiles
        if (version.fileType === "zip") {
          const htmlFile = await ctx.db
            .query("artifactFiles")
            .withIndex("by_version", (q) => q.eq("versionId", version._id))
            .filter((q) => q.eq(q.field("mimeType"), "text/html"))
            .first();

          if (htmlFile) {
            await ctx.db.patch(version._id, {
              entryPoint: htmlFile.filePath,
            });
            fixed++;
          } else {
            // No HTML file, use first file
            const firstFile = await ctx.db
              .query("artifactFiles")
              .withIndex("by_version", (q) => q.eq("versionId", version._id))
              .first();

            if (firstFile) {
              await ctx.db.patch(version._id, {
                entryPoint: firstFile.filePath,
              });
              fixed++;
            } else {
              // No files at all - set default entryPoint
              await ctx.db.patch(version._id, {
                entryPoint: "index.html",
              });
              fixed++;
              errors.push(`Version ${version._id}: No files found, set default entryPoint`);
            }
          }
        } else {
          // Non-ZIP should have been handled by migration
          errors.push(`Version ${version._id}: Non-ZIP without entryPoint`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Version ${version._id}: ${msg}`);
      }
    }

    return { fixed, errors };
  },
});
