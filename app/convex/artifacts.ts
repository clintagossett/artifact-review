import { mutation, query, internalQuery, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { nanoid } from "nanoid";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  isValidFileType,
  isSingleFileType,
  getDefaultFilePath,
  getMimeType,
  MAX_SINGLE_FILE_SIZE,
  MAX_VERSION_NAME_LENGTH,
} from "./lib/fileTypes";
import { canViewVersion, canViewArtifact } from "./lib/permissions";

/**
 * Create a new artifact with version 1 (Unified Storage Pattern)
 * Task 00018 - Phase 1 - Step 4
 *
 * This is an action that validates, stores content, then calls mutation to create records.
 */
export const create = action({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    fileType: v.string(),  // Validated at application level
    content: v.string(),   // File content as text
    originalFileName: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  returns: v.object({
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
    number: v.number(),
    shareToken: v.string(),
  }),
  handler: async (ctx, args): Promise<{
    artifactId: Id<"artifacts">;
    versionId: Id<"artifactVersions">;
    number: number;
    shareToken: string;
  }> => {
    // 1. Authenticate
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 2. Validate file type
    if (!isValidFileType(args.fileType)) {
      throw new Error(`Unsupported file type: ${args.fileType}`);
    }
    if (!isSingleFileType(args.fileType)) {
      throw new Error(`Use ZIP upload for file type: ${args.fileType}`);
    }

    // 3. Calculate size and validate
    const contentBlob = new Blob([args.content], { type: getMimeType(args.fileType) });
    const fileSize = contentBlob.size;

    if (fileSize > MAX_SINGLE_FILE_SIZE) {
      throw new Error(`File too large. Maximum: 5MB, got: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // 4. Determine file path and MIME type
    const filePath = args.originalFileName || getDefaultFilePath(args.fileType);

    // 5. Store content in Convex file storage (only available in actions)
    const storageId = await ctx.storage.store(contentBlob);

    // 6. Call mutation to create artifact, version, and file records
    const result: {
      artifactId: Id<"artifacts">;
      versionId: Id<"artifactVersions">;
      number: number;
      shareToken: string;
    } = await ctx.runMutation(internal.artifacts.createInternal, {
      userId,
      title: args.title,
      description: args.description,
      fileType: args.fileType,
      name: args.name,
      filePath,
      storageId,
      mimeType: getMimeType(args.fileType),
      fileSize,
    });

    return result;
  },
});

/**
 * Internal mutation to create artifact, version, and file records
 * Called by create action after storing file
 */
export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    fileType: v.string(),
    name: v.optional(v.string()),
    filePath: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  returns: v.object({
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
    number: v.number(),
    shareToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const shareToken = nanoid(8);

    // Create artifact
    const artifactId = await ctx.db.insert("artifacts", {
      title: args.title,
      description: args.description,
      creatorId: args.userId,
      shareToken,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create version record (unified storage)
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      number: 1,
      createdBy: args.userId,
      name: args.name,
      fileType: args.fileType,
      entryPoint: args.filePath,
      fileSize: args.fileSize,
      isDeleted: false,
      createdAt: now,
      // Keep inline content fields undefined (not used in new pattern)
    });

    // Create file record
    await ctx.db.insert("artifactFiles", {
      versionId,
      filePath: args.filePath,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      isDeleted: false,
    });

    return {
      artifactId,
      versionId,
      number: 1,
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
 * Task 00018 - Phase 2 - Step 6: Added permission check, removed inline content fields
 * Task 00018 - Phase 2 - Step 8: Made entryPoint and createdBy required
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
      number: v.number(),
      name: v.optional(v.string()),
      createdBy: v.id("users"),
      fileType: v.string(),
      entryPoint: v.string(),
      fileSize: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Check permission
    const hasPermission = await canViewVersion(ctx, args.versionId);
    if (!hasPermission) {
      return null;
    }

    const version = await ctx.db.get(args.versionId);
    if (!version) {
      return null;
    }

    // Project only needed fields (exclude deprecated htmlContent/markdownContent)
    return {
      _id: version._id,
      _creationTime: version._creationTime,
      artifactId: version.artifactId,
      number: version.number,
      name: version.name,
      createdBy: version.createdBy,
      fileType: version.fileType,
      entryPoint: version.entryPoint,
      fileSize: version.fileSize,
      isDeleted: version.isDeleted,
      deletedAt: version.deletedAt,
      createdAt: version.createdAt,
    };
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
 * Add a new version to an existing artifact (Unified Storage Pattern)
 * Task 00018 - Phase 1 - Step 5
 *
 * This is an action that validates, stores content, then calls mutation to create records.
 */
export const addVersion = action({
  args: {
    artifactId: v.id("artifacts"),
    fileType: v.string(),  // Validated at application level
    content: v.string(),   // File content as text
    originalFileName: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  returns: v.object({
    versionId: v.id("artifactVersions"),
    number: v.number(),
  }),
  handler: async (ctx, args): Promise<{
    versionId: Id<"artifactVersions">;
    number: number;
  }> => {
    // 1. Authenticate
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 2. Verify artifact exists and user is owner
    const artifact: {
      _id: Id<"artifacts">;
      _creationTime: number;
      title: string;
      description?: string;
      creatorId: Id<"users">;
      shareToken: string;
      isDeleted: boolean;
      deletedAt?: number;
      deletedBy?: Id<"users">;
      createdAt: number;
      updatedAt: number;
    } | null = await ctx.runQuery(internal.artifacts.getByIdInternal, {
      artifactId: args.artifactId,
    });
    if (!artifact || artifact.isDeleted) {
      throw new Error("Artifact not found");
    }
    if (artifact.creatorId !== userId) {
      throw new Error("Not authorized: Only the owner can add versions");
    }

    // 3. Validate file type
    if (!isValidFileType(args.fileType)) {
      throw new Error(`Unsupported file type: ${args.fileType}`);
    }
    if (!isSingleFileType(args.fileType)) {
      throw new Error(`Use ZIP upload for file type: ${args.fileType}`);
    }

    // 4. Calculate size and validate
    const contentBlob = new Blob([args.content], { type: getMimeType(args.fileType) });
    const fileSize = contentBlob.size;

    if (fileSize > MAX_SINGLE_FILE_SIZE) {
      throw new Error(`File too large. Maximum: 5MB`);
    }

    // 5. Prepare file metadata
    const filePath = args.originalFileName || getDefaultFilePath(args.fileType);

    // 6. Store content
    const storageId = await ctx.storage.store(contentBlob);

    // 7. Call mutation to create version and file records
    const result: {
      versionId: Id<"artifactVersions">;
      number: number;
    } = await ctx.runMutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId: args.artifactId,
      fileType: args.fileType,
      name: args.name,
      filePath,
      storageId,
      mimeType: getMimeType(args.fileType),
      fileSize,
    });

    return result;
  },
});

/**
 * Internal mutation to add version and file records
 * Called by addVersion action after storing file
 */
export const addVersionInternal = internalMutation({
  args: {
    userId: v.id("users"),
    artifactId: v.id("artifacts"),
    fileType: v.string(),
    name: v.optional(v.string()),
    filePath: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  returns: v.object({
    versionId: v.id("artifactVersions"),
    number: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get max version number for this artifact
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact", (q) => q.eq("artifactId", args.artifactId))
      .collect();

    const maxVersionNumber = Math.max(...versions.map((v) => v.number), 0);
    const newVersionNumber = maxVersionNumber + 1;

    const now = Date.now();

    // Create version record (unified storage)
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId: args.artifactId,
      number: newVersionNumber,
      createdBy: args.userId,
      name: args.name,
      fileType: args.fileType,
      entryPoint: args.filePath,
      fileSize: args.fileSize,
      isDeleted: false,
      createdAt: now,
    });

    // Create file record
    await ctx.db.insert("artifactFiles", {
      versionId,
      filePath: args.filePath,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      isDeleted: false,
    });

    // Update artifact timestamp
    await ctx.db.patch(args.artifactId, {
      updatedAt: now,
    });

    return {
      versionId,
      number: newVersionNumber,
    };
  },
});

/**
 * Update the name/label of a version (owner only)
 * Task 00018 - Phase 1 - Step 6
 * Task 00021 - Subtask 01: Renamed from updateVersionName, field versionName -> name
 */
export const updateName = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    name: v.union(v.string(), v.null()),  // null to clear
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Authenticate
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 2. Get version
    const version = await ctx.db.get(args.versionId);
    if (!version || version.isDeleted) {
      throw new Error("Version not found");
    }

    // 3. Verify ownership
    const artifact = await ctx.db.get(version.artifactId);
    if (!artifact || artifact.isDeleted) {
      throw new Error("Artifact not found");
    }
    if (artifact.creatorId !== userId) {
      throw new Error("Not authorized: Only the owner can update version names");
    }

    // 4. Validate version name length
    if (args.name !== null && args.name.length > MAX_VERSION_NAME_LENGTH) {
      throw new Error(`Version name too long. Maximum: ${MAX_VERSION_NAME_LENGTH} characters`);
    }

    // 5. Update version name
    await ctx.db.patch(args.versionId, {
      name: args.name ?? undefined,
    });

    return null;
  },
});

/**
 * Soft delete an artifact (cascades to all versions and files)
 * Task 00018 - Phase 1 - Step 7: Added deletedBy audit trail
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

    // Soft delete artifact WITH deletedBy
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: now,
      deletedBy: userId,  // NEW: Track who deleted
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
          deletedBy: userId,  // NEW: Track who deleted
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
              deletedBy: userId,  // NEW: Track who deleted
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
 * Task 00018 - Phase 1 - Step 7: Added deletedBy audit trail
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

    // Soft delete version WITH deletedBy
    await ctx.db.patch(args.versionId, {
      isDeleted: true,
      deletedAt: now,
      deletedBy: userId,  // NEW: Track who deleted
    });

    // Cascade: Soft delete all files for this version WITH deletedBy
    const files = await ctx.db
      .query("artifactFiles")
      .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
      .collect();

    for (const file of files) {
      if (!file.isDeleted) {
        await ctx.db.patch(file._id, {
          isDeleted: true,
          deletedAt: now,
          deletedBy: userId,  // NEW: Track who deleted
        });
      }
    }

    return null;
  },
});

/**
 * Get all versions for an artifact (for version switcher UI)
 * Task 00018 - Phase 2 - Step 5: Added versionName, createdBy, and permission check
 * Task 00018 - Phase 2 - Step 8: Made createdBy required
 * Task 00021 - Subtask 01: Added isLatest computed field
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
      number: v.number(),
      name: v.optional(v.string()),
      createdBy: v.id("users"),
      fileType: v.string(),
      fileSize: v.number(),
      createdAt: v.number(),
      isLatest: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    // Check permission to view artifact
    const hasPermission = await canViewArtifact(ctx, args.artifactId);
    if (!hasPermission) {
      return [];
    }

    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .order("desc")
      .collect();

    // The first version (highest number) is the latest since we're ordered desc
    const latestId = versions[0]?._id;

    // Project only needed fields and add isLatest computed field
    return versions.map((v) => ({
      _id: v._id,
      _creationTime: v._creationTime,
      artifactId: v.artifactId,
      number: v.number,
      name: v.name,
      createdBy: v.createdBy,
      fileType: v.fileType,
      fileSize: v.fileSize,
      createdAt: v.createdAt,
      isLatest: v._id === latestId,
    }));
  },
});

/**
 * Get a specific version by artifact ID and version number
 * Task 00018 - Phase 2 - Step 6: Added permission check, removed inline content fields
 * Task 00018 - Phase 2 - Step 8: Made entryPoint and createdBy required
 */
export const getVersionByNumber = query({
  args: {
    artifactId: v.id("artifacts"),
    number: v.number(),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifactVersions"),
      _creationTime: v.number(),
      artifactId: v.id("artifacts"),
      number: v.number(),
      name: v.optional(v.string()),
      createdBy: v.id("users"),
      fileType: v.string(),
      entryPoint: v.string(),
      fileSize: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Check permission to view artifact
    const hasPermission = await canViewArtifact(ctx, args.artifactId);
    if (!hasPermission) {
      return null;
    }

    const version = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_version", (q) =>
        q.eq("artifactId", args.artifactId).eq("number", args.number)
      )
      .first();

    if (!version || version.isDeleted) {
      return null;
    }

    // Project only needed fields (exclude deprecated htmlContent/markdownContent)
    return {
      _id: version._id,
      _creationTime: version._creationTime,
      artifactId: version.artifactId,
      number: version.number,
      name: version.name,
      createdBy: version.createdBy,
      fileType: version.fileType,
      entryPoint: version.entryPoint,
      fileSize: version.fileSize,
      isDeleted: version.isDeleted,
      deletedAt: version.deletedAt,
      createdAt: version.createdAt,
    };
  },
});

/**
 * Get the latest (highest version number) for an artifact
 * Task 00018 - Phase 2 - Step 6: Added permission check, removed inline content fields
 * Task 00018 - Phase 2 - Step 8: Made entryPoint and createdBy required
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
      number: v.number(),
      name: v.optional(v.string()),
      createdBy: v.id("users"),
      fileType: v.string(),
      entryPoint: v.string(),
      fileSize: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Check permission to view artifact
    const hasPermission = await canViewArtifact(ctx, args.artifactId);
    if (!hasPermission) {
      return null;
    }

    // Get all active versions, sorted descending
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .order("desc")
      .collect();

    const latestVersion = versions[0] || null;
    if (!latestVersion) {
      return null;
    }

    // Project only needed fields (exclude deprecated htmlContent/markdownContent)
    return {
      _id: latestVersion._id,
      _creationTime: latestVersion._creationTime,
      artifactId: latestVersion.artifactId,
      number: latestVersion.number,
      name: latestVersion.name,
      createdBy: latestVersion.createdBy,
      fileType: latestVersion.fileType,
      entryPoint: latestVersion.entryPoint,
      fileSize: latestVersion.fileSize,
      isDeleted: latestVersion.isDeleted,
      deletedAt: latestVersion.deletedAt,
      createdAt: latestVersion.createdAt,
    };
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
 * Task 00018 - Phase 2 - Step 6: Removed inline content fields
 * Task 00018 - Phase 2 - Step 8: Made entryPoint and createdBy required
 */
export const getVersionByNumberInternal = internalQuery({
  args: {
    artifactId: v.id("artifacts"),
    number: v.number(),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifactVersions"),
      _creationTime: v.number(),
      artifactId: v.id("artifacts"),
      number: v.number(),
      name: v.optional(v.string()),
      createdBy: v.id("users"),
      fileType: v.string(),
      entryPoint: v.string(),
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
        q.eq("artifactId", args.artifactId).eq("number", args.number)
      )
      .first();

    if (!version || version.isDeleted) {
      return null;
    }

    // Project only needed fields (exclude deprecated htmlContent/markdownContent)
    return {
      _id: version._id,
      _creationTime: version._creationTime,
      artifactId: version.artifactId,
      number: version.number,
      name: version.name,
      createdBy: version.createdBy,
      fileType: version.fileType,
      entryPoint: version.entryPoint,
      fileSize: version.fileSize,
      isDeleted: version.isDeleted,
      deletedAt: version.deletedAt,
      createdAt: version.createdAt,
    };
  },
});

/**
 * Internal query: Get artifact by ID (for actions)
 */
export const getByIdInternal = internalQuery({
  args: {
    artifactId: v.id("artifacts"),
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
      deletedBy: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.artifactId);
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

/**
 * Get entry point content with signed URL (Phase 2 - Step 2)
 * Used by frontend to retrieve the main file content for viewing
 */
export const getEntryPointContent = query({
  args: { versionId: v.id("artifactVersions") },
  returns: v.union(
    v.object({
      url: v.union(v.string(), v.null()),
      mimeType: v.string(),
      fileSize: v.number(),
      filePath: v.string(),
      fileType: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // 1. Get version, check not deleted
    const version = await ctx.db.get(args.versionId);
    if (!version || version.isDeleted) {
      return null;
    }

    // 2. Check permission with canViewVersion()
    const hasPermission = await canViewVersion(ctx, args.versionId);
    if (!hasPermission) {
      return null;
    }

    // 3. Get file from artifactFiles where filePath === entryPoint
    if (!version.entryPoint) {
      return null;
    }

    const file = await ctx.db
      .query("artifactFiles")
      .withIndex("by_version_path", (q) =>
        q.eq("versionId", args.versionId).eq("filePath", version.entryPoint!)
      )
      .first();

    if (!file || file.isDeleted) {
      return null;
    }

    // 4. Get signed URL from ctx.storage.getUrl(file.storageId)
    const url = await ctx.storage.getUrl(file.storageId);

    // 5. Return { url, mimeType, fileSize, filePath, fileType }
    return {
      url,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      filePath: file.filePath,
      fileType: version.fileType,
    };
  },
});
