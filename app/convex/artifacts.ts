import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { nanoid } from "nanoid";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Create a new artifact with version 1
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    fileType: v.union(
      v.literal("zip"),
      v.literal("html"),
      v.literal("markdown")
    ),
    // Type-specific content
    htmlContent: v.optional(v.string()),
    markdownContent: v.optional(v.string()),
    entryPoint: v.optional(v.string()),
    fileSize: v.number(),
  },
  returns: v.object({
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
    versionNumber: v.number(),
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

    // Create version 1
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      versionNumber: 1,
      fileType: args.fileType,
      htmlContent: args.htmlContent,
      markdownContent: args.markdownContent,
      entryPoint: args.entryPoint,
      fileSize: args.fileSize,
      isDeleted: false,
      createdAt: now,
    });

    return {
      artifactId,
      versionId,
      versionNumber: 1,
      shareToken,
    };
  },
});

/**
 * Get artifact by ID
 */
export const get = query({
  args: {
    id: v.id("artifacts"),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      creatorId: v.id("users"),
      shareToken: v.string(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get version by ID
 */
export const getVersion = query({
  args: {
    versionId: v.id("artifactVersions"),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifactVersions"),
      _creationTime: v.number(),
      artifactId: v.id("artifacts"),
      versionNumber: v.number(),
      fileType: v.union(
        v.literal("zip"),
        v.literal("html"),
        v.literal("markdown")
      ),
      htmlContent: v.optional(v.string()),
      markdownContent: v.optional(v.string()),
      entryPoint: v.optional(v.string()),
      fileSize: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.versionId);
  },
});

/**
 * Get all files for a version
 */
export const getFilesByVersion = query({
  args: {
    versionId: v.id("artifactVersions"),
  },
  returns: v.array(
    v.object({
      _id: v.id("artifactFiles"),
      _creationTime: v.number(),
      versionId: v.id("artifactVersions"),
      filePath: v.string(),
      storageId: v.id("_storage"),
      mimeType: v.string(),
      fileSize: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artifactFiles")
      .withIndex("by_version_active", (q) =>
        q.eq("versionId", args.versionId).eq("isDeleted", false)
      )
      .collect();
  },
});

/**
 * Get artifact by share token (public access)
 */
export const getByShareToken = query({
  args: {
    shareToken: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      creatorId: v.id("users"),
      shareToken: v.string(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // No authentication required - public access via share token
    const artifact = await ctx.db
      .query("artifacts")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    // Return null if not found or deleted
    if (!artifact || artifact.isDeleted) {
      return null;
    }

    return artifact;
  },
});

/**
 * List user's artifacts (active only)
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("artifacts"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      creatorId: v.id("users"),
      shareToken: v.string(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user's active artifacts
    return await ctx.db
      .query("artifacts")
      .withIndex("by_creator_active", (q) =>
        q.eq("creatorId", userId).eq("isDeleted", false)
      )
      .collect();
  },
});

/**
 * Add a new version to an existing artifact
 */
export const addVersion = mutation({
  args: {
    artifactId: v.id("artifacts"),
    fileType: v.union(
      v.literal("zip"),
      v.literal("html"),
      v.literal("markdown")
    ),
    // Type-specific content
    htmlContent: v.optional(v.string()),
    markdownContent: v.optional(v.string()),
    entryPoint: v.optional(v.string()),
    fileSize: v.number(),
  },
  returns: v.object({
    versionId: v.id("artifactVersions"),
    versionNumber: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify artifact exists and belongs to user
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }
    if (artifact.creatorId !== userId) {
      throw new Error("Not authorized");
    }

    // Get max version number for this artifact
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact", (q) => q.eq("artifactId", args.artifactId))
      .collect();

    const maxVersionNumber = Math.max(...versions.map((v) => v.versionNumber), 0);
    const newVersionNumber = maxVersionNumber + 1;

    const now = Date.now();

    // Create new version
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId: args.artifactId,
      versionNumber: newVersionNumber,
      fileType: args.fileType,
      htmlContent: args.htmlContent,
      markdownContent: args.markdownContent,
      entryPoint: args.entryPoint,
      fileSize: args.fileSize,
      isDeleted: false,
      createdAt: now,
    });

    // Update artifact's updatedAt timestamp
    await ctx.db.patch(args.artifactId, {
      updatedAt: now,
    });

    return {
      versionId,
      versionNumber: newVersionNumber,
    };
  },
});

/**
 * Soft delete an artifact (cascades to all versions and files)
 */
export const softDelete = mutation({
  args: {
    id: v.id("artifacts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify artifact exists and belongs to user
    const artifact = await ctx.db.get(args.id);
    if (!artifact) {
      throw new Error("Artifact not found");
    }
    if (artifact.creatorId !== userId) {
      throw new Error("Not authorized");
    }

    const now = Date.now();

    // Soft delete artifact
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: now,
    });

    // Cascade: Soft delete all versions
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact", (q) => q.eq("artifactId", args.id))
      .collect();

    for (const version of versions) {
      if (!version.isDeleted) {
        await ctx.db.patch(version._id, {
          isDeleted: true,
          deletedAt: now,
        });

        // Cascade: Soft delete all files for this version
        const files = await ctx.db
          .query("artifactFiles")
          .withIndex("by_version", (q) => q.eq("versionId", version._id))
          .collect();

        for (const file of files) {
          if (!file.isDeleted) {
            await ctx.db.patch(file._id, {
              isDeleted: true,
              deletedAt: now,
            });
          }
        }
      }
    }

    return null;
  },
});

/**
 * Soft delete a specific version (and its files)
 */
export const softDeleteVersion = mutation({
  args: {
    versionId: v.id("artifactVersions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get version
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new Error("Version not found");
    }

    // Verify artifact belongs to user
    const artifact = await ctx.db.get(version.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }
    if (artifact.creatorId !== userId) {
      throw new Error("Not authorized");
    }

    // Check if this is the last active version
    const activeVersions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", version.artifactId).eq("isDeleted", false)
      )
      .collect();

    if (activeVersions.length === 1 && activeVersions[0]._id === args.versionId) {
      throw new Error("Cannot delete the last active version");
    }

    const now = Date.now();

    // Soft delete version
    await ctx.db.patch(args.versionId, {
      isDeleted: true,
      deletedAt: now,
    });

    // Cascade: Soft delete all files for this version
    const files = await ctx.db
      .query("artifactFiles")
      .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
      .collect();

    for (const file of files) {
      if (!file.isDeleted) {
        await ctx.db.patch(file._id, {
          isDeleted: true,
          deletedAt: now,
        });
      }
    }

    return null;
  },
});

/**
 * Get all versions for an artifact (for version switcher UI)
 */
export const getVersions = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.array(
    v.object({
      _id: v.id("artifactVersions"),
      _creationTime: v.number(),
      artifactId: v.id("artifacts"),
      versionNumber: v.number(),
      fileType: v.union(
        v.literal("zip"),
        v.literal("html"),
        v.literal("markdown")
      ),
      fileSize: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .order("desc")
      .collect();

    // Project only the fields needed for the version switcher UI
    return versions.map((v) => ({
      _id: v._id,
      _creationTime: v._creationTime,
      artifactId: v.artifactId,
      versionNumber: v.versionNumber,
      fileType: v.fileType,
      fileSize: v.fileSize,
      createdAt: v.createdAt,
    }));
  },
});

/**
 * Get a specific version by artifact ID and version number
 */
export const getVersionByNumber = query({
  args: {
    artifactId: v.id("artifacts"),
    versionNumber: v.number(),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifactVersions"),
      _creationTime: v.number(),
      artifactId: v.id("artifacts"),
      versionNumber: v.number(),
      fileType: v.union(
        v.literal("zip"),
        v.literal("html"),
        v.literal("markdown")
      ),
      htmlContent: v.optional(v.string()),
      markdownContent: v.optional(v.string()),
      entryPoint: v.optional(v.string()),
      fileSize: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const version = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_version", (q) =>
        q.eq("artifactId", args.artifactId).eq("versionNumber", args.versionNumber)
      )
      .first();

    if (!version || version.isDeleted) {
      return null;
    }

    return version;
  },
});

/**
 * Get the latest (highest version number) for an artifact
 */
export const getLatestVersion = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifactVersions"),
      _creationTime: v.number(),
      artifactId: v.id("artifacts"),
      versionNumber: v.number(),
      fileType: v.union(
        v.literal("zip"),
        v.literal("html"),
        v.literal("markdown")
      ),
      htmlContent: v.optional(v.string()),
      markdownContent: v.optional(v.string()),
      entryPoint: v.optional(v.string()),
      fileSize: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get all active versions, sorted descending
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .order("desc")
      .collect();

    // Return the first one (highest version number)
    return versions[0] || null;
  },
});

/**
 * List all HTML files in a ZIP artifact version (for multi-page navigation)
 */
export const listHtmlFiles = query({
  args: {
    versionId: v.id("artifactVersions"),
  },
  returns: v.array(
    v.object({
      filePath: v.string(),
      mimeType: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("artifactFiles")
      .withIndex("by_version_active", (q) =>
        q.eq("versionId", args.versionId).eq("isDeleted", false)
      )
      .collect();

    // Filter to only HTML files
    return files
      .filter((f) => f.mimeType === "text/html")
      .map((f) => ({
        filePath: f.filePath,
        mimeType: f.mimeType,
      }));
  },
});

/**
 * Internal query: Get file by version and path (for HTTP serving)
 */
export const getFileByPath = internalQuery({
  args: {
    versionId: v.id("artifactVersions"),
    filePath: v.string(),
  },
  returns: v.union(
    v.object({
      storageId: v.id("_storage"),
      mimeType: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("artifactFiles")
      .withIndex("by_version_path", (q) =>
        q.eq("versionId", args.versionId).eq("filePath", args.filePath)
      )
      .unique();

    if (!file || file.isDeleted) {
      return null;
    }

    return {
      storageId: file.storageId,
      mimeType: file.mimeType,
    };
  },
});

/**
 * Internal query: Get version by artifact and version number (for HTTP actions)
 */
export const getVersionByNumberInternal = internalQuery({
  args: {
    artifactId: v.id("artifacts"),
    versionNumber: v.number(),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifactVersions"),
      _creationTime: v.number(),
      artifactId: v.id("artifacts"),
      versionNumber: v.number(),
      fileType: v.union(
        v.literal("zip"),
        v.literal("html"),
        v.literal("markdown")
      ),
      htmlContent: v.optional(v.string()),
      markdownContent: v.optional(v.string()),
      entryPoint: v.optional(v.string()),
      fileSize: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const version = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_version", (q) =>
        q.eq("artifactId", args.artifactId).eq("versionNumber", args.versionNumber)
      )
      .first();

    if (!version || version.isDeleted) {
      return null;
    }

    return version;
  },
});

/**
 * Internal query: Get artifact by share token (for HTTP actions)
 */
export const getByShareTokenInternal = internalQuery({
  args: {
    shareToken: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      creatorId: v.id("users"),
      shareToken: v.string(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const artifact = await ctx.db
      .query("artifacts")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!artifact || artifact.isDeleted) {
      return null;
    }

    return artifact;
  },
});
