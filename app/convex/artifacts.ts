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
    name: v.string(),
    description: v.optional(v.string()),
    fileType: v.string(),  // Validated at application level
    content: v.string(),   // File content as text
    originalFileName: v.optional(v.string()),
    versionName: v.optional(v.string()),
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
    const data = new TextEncoder().encode(args.content);
    const size = data.byteLength;

    if (size > MAX_SINGLE_FILE_SIZE) {
      throw new Error(`File too large. Maximum: 5MB, got: ${(size / 1024 / 1024).toFixed(2)}MB`);
    }

    // 4. Determine file path and MIME type
    const path = args.originalFileName || getDefaultFilePath(args.fileType);

    // 5. Store content in Convex file storage (only available in actions)
    const storageId = await ctx.storage.store(data);

    // 6. Call mutation to create artifact, version, and file records
    const result: {
      artifactId: Id<"artifacts">;
      versionId: Id<"artifactVersions">;
      number: number;
      shareToken: string;
    } = await ctx.runMutation(internal.artifacts.createInternal, {
      userId,
      name: args.name,
      description: args.description,
      fileType: args.fileType,
      versionName: args.versionName,
      path,
      storageId,
      mimeType: getMimeType(args.fileType),
      size: size,
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
    name: v.string(),
    description: v.optional(v.string()),
    fileType: v.string(),
    versionName: v.optional(v.string()),
    path: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    size: v.number(),
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
      name: args.name,
      description: args.description,
      createdBy: args.userId,
      shareToken,
      isDeleted: false,
      createdAt: now,
    });

    // Create version record (unified storage)
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      number: 1,
      createdBy: args.userId,
      name: args.versionName,
      fileType: args.fileType,
      entryPoint: args.filePath,
      size: args.size,
      isDeleted: false,
      createdAt: now,
      // Keep inline content fields undefined (not used in new pattern)
    });

    // Create file record
    await ctx.db.insert("artifactFiles", {
      versionId,
      path: args.filePath,
      storageId: args.storageId,
      mimeType: args.mimeType,
      size: args.size,
      isDeleted: false,
      createdAt: now,
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
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
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
      size: v.number(),
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
      size: version.size,
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
      path: v.string(),
      storageId: v.id("_storage"),
      mimeType: v.string(),
      size: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artifactFiles")
      .withIndex("by_versionId_active", (q) =>
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
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
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
    // No authentication required - public access via share token
    const artifact = await ctx.db
      .query("artifacts")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
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
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
      shareToken: v.string(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      deletedBy: v.optional(v.id("users")),
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
      .withIndex("by_createdBy_active", (q) =>
        q.eq("createdBy", userId).eq("isDeleted", false)
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
      name: string;
      description?: string;
      createdBy: Id<"users">;
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
    if (artifact.createdBy !== userId) {
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
    const size = contentBlob.size;

    if (size > MAX_SINGLE_FILE_SIZE) {
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
      size: size,
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
    size: v.number(),
  },
  returns: v.object({
    versionId: v.id("artifactVersions"),
    number: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get max version number for this artifact
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
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
      entryPoint: args.path,
      size: args.size,
      isDeleted: false,
      createdAt: now,
    });

    // Create file record
    await ctx.db.insert("artifactFiles", {
      createdAt: Date.now(),
      versionId,
      path: args.path,
      storageId: args.storageId,
      mimeType: args.mimeType,
      size: args.size,
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
    if (artifact.createdBy !== userId) {
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
    if (artifact.createdBy !== userId) {
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
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.id))
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
          .withIndex("by_versionId", (q) => q.eq("versionId", version._id))
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
    if (artifact.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    // Check if this is the last active version
    const activeVersions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifactId_active", (q) =>
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
      .withIndex("by_versionId", (q) => q.eq("versionId", args.versionId))
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
      size: v.number(),
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
      .withIndex("by_artifactId_active", (q) =>
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
      size: v.size,
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
      size: v.number(),
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
      .withIndex("by_artifactId_number", (q) =>
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
      size: version.size,
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
      size: v.number(),
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
      .withIndex("by_artifactId_active", (q) =>
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
      size: latestVersion.size,
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
      path: v.string(),
      mimeType: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("artifactFiles")
      .withIndex("by_versionId_active", (q) =>
        q.eq("versionId", args.versionId).eq("isDeleted", false)
      )
      .collect();

    // Filter to only HTML files
    return files
      .filter((f) => f.mimeType === "text/html")
      .map((f) => ({
        path: f.path,
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
    path: v.string(),
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
      .withIndex("by_versionId_path", (q) =>
        q.eq("versionId", args.versionId).eq("path", args.path)
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
      size: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const version = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifactId_number", (q) =>
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
      size: version.size,
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
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
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
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
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
    const artifact = await ctx.db
      .query("artifacts")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
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
      size: v.number(),
      path: v.string(),
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
      .withIndex("by_versionId_path", (q) =>
        q.eq("versionId", args.versionId).eq("path", version.entryPoint!)
      )
      .first();

    if (!file || file.isDeleted) {
      return null;
    }

    // 4. Get signed URL from ctx.storage.getUrl(file.storageId)
    const url = await ctx.storage.getUrl(file.storageId);

    // 5. Return { url, mimeType, size, path, fileType }
    return {
      url,
      mimeType: file.mimeType,
      size: file.size,
      path: file.path,
      fileType: version.fileType,
    };
  },
});

/**
 * Update artifact name and description (owner only)
 * Task 00022 - Subtask 03
 *
 * @throws "Not authenticated" - No user session
 * @throws "Artifact not found" - Does not exist or is deleted
 * @throws "Not authorized" - User is not the owner
 * @throws "Name cannot be empty" - Empty after trim
 * @throws "Name too long (max 100 characters)" - Exceeds limit
 * @throws "Description too long (max 500 characters)" - Exceeds limit
 */
export const updateDetails = mutation({
  args: {
    artifactId: v.id("artifacts"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Authenticate
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 2. Get artifact
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact || artifact.isDeleted) {
      throw new Error("Artifact not found");
    }

    // 3. Verify ownership
    if (artifact.createdBy !== userId) {
      throw new Error("Not authorized: Only the owner can update details");
    }

    // 4. Validate name
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Name cannot be empty");
    }
    if (trimmedName.length > 100) {
      throw new Error("Name too long (max 100 characters)");
    }

    // 5. Validate description
    let trimmedDescription: string | undefined = undefined;
    if (args.description !== undefined) {
      trimmedDescription = args.description.trim();
      if (trimmedDescription.length > 500) {
        throw new Error("Description too long (max 500 characters)");
      }
      // Allow empty string to clear description
      if (trimmedDescription === "") {
        trimmedDescription = undefined;
      }
    }

    // 6. Update artifact
    await ctx.db.patch(args.artifactId, {
      name: trimmedName,
      description: trimmedDescription,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get artifact details for settings page (owner only)
 * Task 00022 - Subtask 04
 *
 * Includes enriched fields:
 * - creatorEmail: Email of the user who created the artifact
 * - versionCount: Number of active (non-deleted) versions
 * - totalFileSize: Sum of file sizes from all active versions
 *
 * @returns Enriched artifact data or null if not found/deleted
 * @throws "Not authenticated" - No user session
 * @throws "Not authorized" - User is not the owner
 */
export const getDetailsForSettings = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      name: v.string(),
      description: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      creatorEmail: v.optional(v.string()),
      versionCount: v.number(),
      totalFileSize: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // 1. Authenticate
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 2. Get artifact
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact || artifact.isDeleted) {
      return null;
    }

    // 3. Verify ownership (only owner can access settings)
    if (artifact.createdBy !== userId) {
      throw new Error("Not authorized: Only the owner can access settings");
    }

    // 4. Get creator email
    const creator = await ctx.db.get(artifact.createdBy);
    const creatorEmail = creator?.email;

    // 5. Count active versions and sum file sizes
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifactId_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .collect();

    const versionCount = versions.length;
    const totalFileSize = versions.reduce((sum, v) => sum + v.size, 0);

    // 6. Return enriched data
    return {
      _id: artifact._id,
      name: artifact.name,
      description: artifact.description,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
      creatorEmail,
      versionCount,
      totalFileSize,
    };
  },
});
