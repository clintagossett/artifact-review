# Implementation Plan: Phase 1 - Upload Flow + Write Permissions

**Task:** 00018 - Refine Single-File Artifact Upload and Versioning
**Subtask:** 01 - Phase 1 Upload Flow + Write Permissions
**Created:** 2025-12-31
**Status:** Ready for Implementation

---

## Overview

This document provides a step-by-step implementation plan for Phase 1: Upload Flow + Write Permissions. Each step is designed to be:

1. **Independently testable** - Can verify correctness before moving to next step
2. **Backward compatible** - Existing functionality continues working during migration
3. **Incrementally deployable** - Can deploy after each step if needed

**Phase 1 Focus:**
- Schema changes for unified storage model
- Upload mutations to store files as blobs
- Write permission enforcement (owner-only)
- Migration script for existing data
- Backend tests for upload + write operations

**Out of Scope (Phase 2):**
- Retrieval/read operations
- Viewer UI updates
- Read permissions

---

## Pre-Implementation Checklist

Before starting, ensure:

- [ ] Dev servers running (`./scripts/start-dev-servers.sh`)
- [ ] Current tests passing
- [ ] Read `docs/architecture/convex-rules.md` (Convex patterns)
- [ ] Read `END-STATE-DESIGN.md` (target schema)
- [ ] Read `SCHEMA-CHANGES-SUMMARY.md` (quick reference)

---

## Implementation Steps

### Step 1: Create File Type Helper Module

**Goal:** Create centralized file type validation and helper functions.

**Location:** `/app/convex/lib/fileTypes.ts` (NEW FILE)

**What to Create:**

```typescript
// convex/lib/fileTypes.ts

/**
 * File type validation and utilities for unified storage.
 *
 * Application-level validation allows adding new file types
 * without schema migrations.
 */

/**
 * Supported single-file types (HTML, Markdown)
 * These are stored directly in artifactFiles with one row per version.
 */
export const SUPPORTED_SINGLE_FILE_TYPES = ["html", "markdown"] as const;

/**
 * All supported file types (including multi-file ZIP)
 */
export const SUPPORTED_FILE_TYPES = [...SUPPORTED_SINGLE_FILE_TYPES, "zip"] as const;

export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];
export type SupportedSingleFileType = (typeof SUPPORTED_SINGLE_FILE_TYPES)[number];

/**
 * Validate that a file type string is supported
 */
export function isValidFileType(type: string): type is SupportedFileType {
  return (SUPPORTED_FILE_TYPES as readonly string[]).includes(type);
}

/**
 * Validate that a file type is a single-file type (not ZIP)
 */
export function isSingleFileType(type: string): type is SupportedSingleFileType {
  return (SUPPORTED_SINGLE_FILE_TYPES as readonly string[]).includes(type);
}

/**
 * Get default file path for a file type.
 * Used when no original filename is provided.
 */
export function getDefaultFilePath(fileType: string): string {
  switch (fileType) {
    case "html":
      return "index.html";
    case "markdown":
      return "README.md";
    case "zip":
      return "index.html";
    default:
      return "content";
  }
}

/**
 * Get MIME type for a file type.
 * Used for Content-Type header when serving files.
 */
export function getMimeType(fileType: string): string {
  switch (fileType) {
    case "html":
      return "text/html";
    case "markdown":
      return "text/markdown";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

/**
 * Maximum file size for single-file artifacts (5MB)
 */
export const MAX_SINGLE_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Maximum characters for version name
 */
export const MAX_VERSION_NAME_LENGTH = 100;
```

**Validation Criteria:**
- [ ] File compiles without TypeScript errors
- [ ] Functions exported correctly
- [ ] Can import in other Convex files

**Test Plan:**
- Unit tests for `isValidFileType()`
- Unit tests for `isSingleFileType()`
- Unit tests for `getDefaultFilePath()`
- Unit tests for `getMimeType()`

---

### Step 2: Schema Changes - Add New Optional Fields

**Goal:** Add new fields to schema as optional (backward compatible).

**Location:** `/app/convex/schema.ts`

**Changes to `artifacts` table:**

```typescript
// ADD to artifacts table:
deletedBy: v.optional(v.id("users")),  // Track who soft-deleted
```

**Changes to `artifactVersions` table:**

```typescript
// ADD these fields:
createdBy: v.optional(v.id("users")),     // Who created this version
versionName: v.optional(v.string()),       // Optional version label
deletedBy: v.optional(v.id("users")),      // Who deleted this version

// ADD new index:
.index("by_created_by", ["createdBy"])
```

**Changes to `artifactFiles` table:**

```typescript
// ADD to artifactFiles table:
deletedBy: v.optional(v.id("users")),  // Track who soft-deleted
```

**Important Notes:**
- Keep `htmlContent` and `markdownContent` for now (removed in Step 8)
- Keep `fileType` as union for now (changed in Step 3)
- Keep `entryPoint` as optional for now (made required in Step 8)
- All new fields are OPTIONAL to maintain backward compatibility

**Validation Criteria:**
- [ ] `npx convex dev` runs without errors
- [ ] Schema deploys successfully
- [ ] Existing queries still work
- [ ] Existing mutations still work

**Test Plan:**
- Run existing test suite - should pass unchanged

---

### Step 3: Schema Changes - Change fileType to String

**Goal:** Make fileType extensible for future file types.

**Location:** `/app/convex/schema.ts`

**Change in `artifactVersions` table:**

```typescript
// CHANGE from:
fileType: v.union(
  v.literal("zip"),
  v.literal("html"),
  v.literal("markdown")
),

// CHANGE to:
fileType: v.string(),
```

**Update Return Type Validators:**

All queries returning `artifactVersions` need their `returns` validators updated:

1. `artifacts.getVersion` - Change `fileType` validator
2. `artifacts.getVersionByNumber` - Change `fileType` validator
3. `artifacts.getLatestVersion` - Change `fileType` validator
4. `artifacts.getVersions` - Change `fileType` validator
5. `artifacts.getVersionByNumberInternal` - Change `fileType` validator

**Example Change:**

```typescript
// BEFORE:
fileType: v.union(
  v.literal("zip"),
  v.literal("html"),
  v.literal("markdown")
),

// AFTER:
fileType: v.string(),
```

**Validation Criteria:**
- [ ] Schema deploys successfully
- [ ] All existing data still readable
- [ ] Queries return correct file types as strings

**Test Plan:**
- Query existing versions - fileType should be string
- Create new version - should work with string validation

---

### Step 4: Update `artifacts.create` Mutation for Unified Storage

**Goal:** Store content as blobs instead of inline, create `artifactFiles` row.

**Location:** `/app/convex/artifacts.ts`

**What to Change:**

1. Update args to accept `content` string instead of type-specific fields
2. Store content in Convex file storage
3. Create `artifactFiles` row
4. Set `createdBy` and `entryPoint`

**New Mutation Signature:**

```typescript
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    fileType: v.string(),  // Validated at application level
    content: v.string(),   // File content as text
    originalFileName: v.optional(v.string()),
    versionName: v.optional(v.string()),
  },
  returns: v.object({
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
    versionNumber: v.number(),
    shareToken: v.string(),
  }),
  handler: async (ctx, args) => {
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
    const contentBlob = new Blob([args.content]);
    const fileSize = contentBlob.size;

    if (fileSize > MAX_SINGLE_FILE_SIZE) {
      throw new Error(`File too large. Maximum: 5MB, got: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // 4. Determine file path and MIME type
    const filePath = args.originalFileName || getDefaultFilePath(args.fileType);
    const mimeType = getMimeType(args.fileType);

    const now = Date.now();
    const shareToken = nanoid(8);

    // 5. Create artifact
    const artifactId = await ctx.db.insert("artifacts", {
      title: args.title,
      description: args.description,
      creatorId: userId,
      shareToken,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // 6. Store content in Convex file storage
    const storageId = await ctx.storage.store(contentBlob);

    // 7. Create version record (unified storage)
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      versionNumber: 1,
      createdBy: userId,
      versionName: args.versionName,
      fileType: args.fileType,
      entryPoint: filePath,
      fileSize,
      isDeleted: false,
      createdAt: now,
      // Keep inline content fields undefined (not used in new pattern)
    });

    // 8. Create file record
    await ctx.db.insert("artifactFiles", {
      versionId,
      filePath,
      storageId,
      mimeType,
      fileSize,
      isDeleted: false,
    });

    return {
      artifactId,
      versionId,
      versionNumber: 1,
      shareToken,
    };
  },
});
```

**Important Notes:**
- Import helpers from `./lib/fileTypes`
- Uses `ctx.storage.store()` to store content as blob
- Creates `artifactFiles` row for unified storage pattern
- Sets `createdBy` and `entryPoint` on version
- Does NOT set `htmlContent`/`markdownContent` (deprecated)

**Validation Criteria:**
- [ ] Create HTML artifact - stores in blob storage
- [ ] Create Markdown artifact - stores in blob storage
- [ ] `artifactFiles` row created with correct data
- [ ] `entryPoint` set correctly
- [ ] `createdBy` set to current user
- [ ] File size validation works

**Test Plan:**
- Test HTML upload creates correct structure
- Test Markdown upload creates correct structure
- Test file size limit enforcement
- Test invalid file type rejection
- Test unauthenticated user rejection

---

### Step 5: Update `artifacts.addVersion` Mutation for Unified Storage

**Goal:** Store new versions as blobs with proper metadata.

**Location:** `/app/convex/artifacts.ts`

**New Mutation Signature:**

```typescript
export const addVersion = mutation({
  args: {
    artifactId: v.id("artifacts"),
    fileType: v.string(),
    content: v.string(),
    originalFileName: v.optional(v.string()),
    versionName: v.optional(v.string()),
  },
  returns: v.object({
    versionId: v.id("artifactVersions"),
    versionNumber: v.number(),
  }),
  handler: async (ctx, args) => {
    // 1. Authenticate
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 2. Verify artifact exists and user is owner
    const artifact = await ctx.db.get(args.artifactId);
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
    const contentBlob = new Blob([args.content]);
    const fileSize = contentBlob.size;

    if (fileSize > MAX_SINGLE_FILE_SIZE) {
      throw new Error(`File too large. Maximum: 5MB`);
    }

    // 5. Calculate next version number
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact", (q) => q.eq("artifactId", args.artifactId))
      .collect();
    const maxVersionNumber = Math.max(...versions.map((v) => v.versionNumber), 0);
    const newVersionNumber = maxVersionNumber + 1;

    // 6. Prepare file metadata
    const filePath = args.originalFileName || getDefaultFilePath(args.fileType);
    const mimeType = getMimeType(args.fileType);

    // 7. Store content
    const storageId = await ctx.storage.store(contentBlob);

    const now = Date.now();

    // 8. Create version record
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId: args.artifactId,
      versionNumber: newVersionNumber,
      createdBy: userId,
      versionName: args.versionName,
      fileType: args.fileType,
      entryPoint: filePath,
      fileSize,
      isDeleted: false,
      createdAt: now,
    });

    // 9. Create file record
    await ctx.db.insert("artifactFiles", {
      versionId,
      filePath,
      storageId,
      mimeType,
      fileSize,
      isDeleted: false,
    });

    // 10. Update artifact timestamp
    await ctx.db.patch(args.artifactId, {
      updatedAt: now,
    });

    return {
      versionId,
      versionNumber: newVersionNumber,
    };
  },
});
```

**Permission Enforcement:**
- Check `artifact.creatorId !== userId` before allowing version creation
- Return clear error message: "Not authorized: Only the owner can add versions"

**Validation Criteria:**
- [ ] Owner can add version successfully
- [ ] Non-owner gets authorization error
- [ ] Version number increments correctly
- [ ] `artifactFiles` row created
- [ ] `createdBy` set to current user
- [ ] Artifact `updatedAt` updated

**Test Plan:**
- Test owner can add version
- Test non-owner cannot add version
- Test unauthenticated user cannot add version
- Test version numbering is sequential
- Test file metadata is correct

---

### Step 6: Create `artifacts.updateVersionName` Mutation

**Goal:** Allow owner to update version name after creation.

**Location:** `/app/convex/artifacts.ts` (NEW MUTATION)

```typescript
/**
 * Update the name/label of a version (owner only)
 */
export const updateVersionName = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    versionName: v.union(v.string(), v.null()),  // null to clear
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
    if (args.versionName !== null && args.versionName.length > MAX_VERSION_NAME_LENGTH) {
      throw new Error(`Version name too long. Maximum: ${MAX_VERSION_NAME_LENGTH} characters`);
    }

    // 5. Update version name
    await ctx.db.patch(args.versionId, {
      versionName: args.versionName ?? undefined,
    });

    return null;
  },
});
```

**Validation Criteria:**
- [ ] Owner can set version name
- [ ] Owner can clear version name (set to null)
- [ ] Non-owner gets authorization error
- [ ] Name length validation works

**Test Plan:**
- Test owner can set version name
- Test owner can clear version name
- Test non-owner cannot update
- Test name length validation

---

### Step 7: Update `artifacts.softDeleteVersion` for Audit Trail

**Goal:** Add `deletedBy` field when soft deleting.

**Location:** `/app/convex/artifacts.ts`

**Changes:**

```typescript
export const softDeleteVersion = mutation({
  args: {
    versionId: v.id("artifactVersions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // ... existing auth and validation ...

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
```

**Also update `artifacts.softDelete` (artifact deletion):**

```typescript
// When soft deleting artifact:
await ctx.db.patch(args.id, {
  isDeleted: true,
  deletedAt: now,
  deletedBy: userId,  // NEW: Track who deleted
});

// When cascading to versions:
await ctx.db.patch(version._id, {
  isDeleted: true,
  deletedAt: now,
  deletedBy: userId,  // NEW: Track who deleted
});

// When cascading to files:
await ctx.db.patch(file._id, {
  isDeleted: true,
  deletedAt: now,
  deletedBy: userId,  // NEW: Track who deleted
});
```

**Validation Criteria:**
- [ ] `deletedBy` set on version soft delete
- [ ] `deletedBy` cascaded to files
- [ ] Existing delete behavior unchanged

**Test Plan:**
- Test soft delete sets `deletedBy`
- Test cascade sets `deletedBy` on all records

---

### Step 8: Migration Script - Convert Inline Content to Blobs

**Goal:** Migrate existing data from inline content to unified storage.

**Location:** `/app/convex/migrations/migrateToUnifiedStorage.ts` (NEW FILE)

```typescript
// convex/migrations/migrateToUnifiedStorage.ts

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

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
    const needsMigration = withInlineContent -
      (await countVersionsWithBothInlineAndFiles(ctx, versions));

    return {
      total: versions.length,
      withInlineContent,
      withArtifactFiles,
      needsMigration: Math.max(0, withInlineContent),
      needsCreatedByBackfill,
    };
  },
});

// Helper to count versions that have both inline content and artifact files
async function countVersionsWithBothInlineAndFiles(ctx: any, versions: any[]): Promise<number> {
  let count = 0;
  for (const version of versions) {
    const hasInline = (version as any).htmlContent || (version as any).markdownContent;
    if (hasInline) {
      const files = await ctx.db
        .query("artifactFiles")
        .withIndex("by_version", (q: any) => q.eq("versionId", version._id))
        .first();
      if (files) {
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
export const migrateBatch = internalMutation({
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
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 25;
    const dryRun = args.dryRun ?? false;

    let processed = 0;
    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Get versions with inline content
    const versions = await ctx.db
      .query("artifactVersions")
      .collect();

    for (const version of versions) {
      if (processed >= batchSize) break;

      // Check if has inline content
      const htmlContent = (version as any).htmlContent as string | undefined;
      const markdownContent = (version as any).markdownContent as string | undefined;

      if (!htmlContent && !markdownContent) {
        continue; // No inline content, skip
      }

      processed++;

      // Check if already has artifactFiles
      const existingFiles = await ctx.db
        .query("artifactFiles")
        .withIndex("by_version", (q) => q.eq("versionId", version._id))
        .first();

      if (existingFiles) {
        skipped++;
        continue; // Already migrated
      }

      // Get parent artifact for createdBy backfill
      const artifact = await ctx.db.get(version.artifactId);
      if (!artifact) {
        errors.push(`Version ${version._id}: Orphaned (no parent artifact)`);
        continue;
      }

      try {
        // Determine content and metadata
        const content = htmlContent || markdownContent!;
        const fileType = htmlContent ? "html" : "markdown";
        const filePath = version.entryPoint ||
          (htmlContent ? "index.html" : "README.md");
        const mimeType = htmlContent ? "text/html" : "text/markdown";

        if (dryRun) {
          migrated++;
          continue;
        }

        // Store content in file storage
        const contentBlob = new Blob([content]);
        const storageId = await ctx.storage.store(contentBlob);

        // Create artifactFiles record
        await ctx.db.insert("artifactFiles", {
          versionId: version._id,
          filePath,
          storageId,
          mimeType,
          fileSize: contentBlob.size,
          isDeleted: version.isDeleted,
          deletedAt: version.deletedAt,
        });

        // Update version with entryPoint and createdBy (if missing)
        const updates: any = {
          entryPoint: filePath,
        };
        if (!version.createdBy) {
          updates.createdBy = artifact.creatorId;
        }
        await ctx.db.patch(version._id, updates);

        migrated++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Version ${version._id}: ${msg}`);
      }
    }

    // Check if there are more to process
    const remaining = await ctx.db
      .query("artifactVersions")
      .collect();
    let hasMore = false;
    for (const v of remaining) {
      if ((v as any).htmlContent || (v as any).markdownContent) {
        const files = await ctx.db
          .query("artifactFiles")
          .withIndex("by_version", (q) => q.eq("versionId", v._id))
          .first();
        if (!files) {
          hasMore = true;
          break;
        }
      }
    }

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
```

**Migration Process:**

1. **Check status:**
   ```bash
   npx convex run migrations/migrateToUnifiedStorage:countPendingMigrations
   ```

2. **Dry run (optional):**
   ```bash
   npx convex run migrations/migrateToUnifiedStorage:migrateBatch --args '{"dryRun": true}'
   ```

3. **Run migration in batches:**
   ```bash
   npx convex run migrations/migrateToUnifiedStorage:migrateBatch --args '{"batchSize": 25}'
   # Repeat until hasMore is false
   ```

4. **Backfill createdBy if needed:**
   ```bash
   npx convex run migrations/migrateToUnifiedStorage:backfillCreatedBy
   ```

5. **Verify completion:**
   ```bash
   npx convex run migrations/migrateToUnifiedStorage:verifyMigration
   ```

**Validation Criteria:**
- [ ] Migration script runs without errors
- [ ] All inline content converted to blobs
- [ ] All versions have `createdBy` set
- [ ] All versions have `entryPoint` set
- [ ] `verifyMigration` returns `isComplete: true`

**Test Plan:**
- Test migration on dev environment first
- Verify content is accessible after migration
- Verify no data loss

---

### Step 9: Update Frontend Upload Hook (Optional - for testing)

**Goal:** Update frontend to use new mutation signature.

**Location:** `/app/src/hooks/useArtifactUpload.ts`

**Note:** This step is optional for Phase 1 backend work. Full frontend updates come in Phase 2.

**Minimal changes for testing:**

```typescript
// Update the mutation call to use new signature
const result = await createMutation({
  title,
  description,
  fileType,
  content,  // File content as string
  originalFileName: file.name,
  versionName: undefined,
});
```

**Validation Criteria:**
- [ ] Can upload HTML file via UI
- [ ] Can upload Markdown file via UI
- [ ] Upload creates correct database structure

---

### Step 10: Testing Strategy - Two Tiers

**Goal:** Comprehensive test coverage for Phase 1 functionality with two levels of testing.

**Testing Tiers:**

| Tier | Type | Status | Location |
|------|------|--------|----------|
| 1 | Convex Backend Tests | **MANDATORY** | `tests/convex/` |
| 2 | Full E2E Tests | **RECOMMENDED** | `tests/e2e/` |

**Deployment Options:**
- ✅ Can deploy with Tier 1 only (if manual testing documented)
- ✅ Recommended: Include minimal Tier 2 (upload flow validation)

---

#### Tier 1: Convex Backend Tests (MANDATORY)

**Location:** `/tasks/00018-refine-version-model-permissions/01-phase1-upload-write-permissions/tests/convex/`

**Why Mandatory:**
- Fast feedback loop (milliseconds)
- Validates mutation logic, permission checks, database operations
- Catches bugs before deployment
- Required for TDD workflow

**Test Files:**

##### 1. File Type Helpers (`fileTypes.test.ts`)

```typescript
describe("fileTypes helpers", () => {
  describe("isValidFileType", () => {
    it("returns true for 'html'");
    it("returns true for 'markdown'");
    it("returns true for 'zip'");
    it("returns false for 'pdf'");
    it("returns false for empty string");
  });

  describe("isSingleFileType", () => {
    it("returns true for 'html'");
    it("returns true for 'markdown'");
    it("returns false for 'zip'");
  });

  describe("getDefaultFilePath", () => {
    it("returns 'index.html' for html");
    it("returns 'README.md' for markdown");
  });

  describe("getMimeType", () => {
    it("returns 'text/html' for html");
    it("returns 'text/markdown' for markdown");
  });
});
```

##### 2. Create Mutation (`create.test.ts`)

```typescript
describe("artifacts.create", () => {
  describe("successful creation", () => {
    it("creates HTML artifact with blob storage");
    it("creates Markdown artifact with blob storage");
    it("creates artifactFiles row with correct metadata");
    it("sets entryPoint on version");
    it("sets createdBy to current user");
    it("returns correct artifact data");
  });

  describe("validation", () => {
    it("rejects unauthenticated user");
    it("rejects invalid file type");
    it("rejects file over 5MB limit");
    it("rejects ZIP file type (use different upload)");
  });

  describe("file metadata", () => {
    it("uses original filename when provided");
    it("uses default filename when not provided");
    it("sets correct MIME type");
  });
});
```

##### 3. Add Version Mutation (`addVersion.test.ts`)

```typescript
describe("artifacts.addVersion", () => {
  describe("successful version creation", () => {
    it("adds new version with blob storage");
    it("increments version number correctly");
    it("creates artifactFiles row");
    it("sets createdBy to current user");
    it("updates artifact updatedAt");
  });

  describe("permission enforcement", () => {
    it("allows owner to add version");
    it("rejects non-owner with proper error message");
    it("rejects unauthenticated user");
  });

  describe("validation", () => {
    it("rejects deleted artifact");
    it("rejects invalid file type");
    it("rejects file over size limit");
  });
});
```

##### 4. Update Version Name Mutation (`updateVersionName.test.ts`)

```typescript
describe("artifacts.updateVersionName", () => {
  it("allows owner to set version name");
  it("allows owner to clear version name (set to undefined)");
  it("rejects non-owner with proper error message");
  it("rejects name over 100 characters");
  it("rejects deleted version");
  it("rejects non-existent version");
});
```

##### 5. Soft Delete Audit Trail (`softDelete.test.ts`)

```typescript
describe("soft delete audit trail", () => {
  describe("artifacts.softDeleteVersion", () => {
    it("sets deletedBy on version");
    it("sets deletedBy on cascaded files");
    it("only owner can delete");
    it("rejects non-owner with proper error message");
    it("prevents deleting last active version");
  });

  describe("artifacts.softDelete", () => {
    it("sets deletedBy on artifact");
    it("sets deletedBy on cascaded versions");
    it("sets deletedBy on cascaded files");
    it("only owner can delete");
  });
});
```

##### 6. Migration Script (`migration.test.ts`)

```typescript
describe("migration script", () => {
  describe("countPendingMigrations", () => {
    it("counts versions with inline content");
    it("identifies versions needing createdBy backfill");
    it("returns zero when all migrated");
  });

  describe("migrateBatch", () => {
    it("converts inline HTML to blob storage");
    it("converts inline Markdown to blob storage");
    it("creates correct artifactFiles rows");
    it("sets entryPoint on migrated versions");
    it("backfills createdBy from artifact.creatorId");
    it("skips already migrated versions");
    it("handles orphaned versions gracefully");
    it("dry-run mode does not modify data");
    it("processes batchSize correctly");
  });

  describe("verifyMigration", () => {
    it("returns isComplete true when all migrated");
    it("lists issues when migration incomplete");
    it("detects missing artifactFiles rows");
    it("detects missing createdBy fields");
  });
});
```

**Tier 1 Validation Criteria:**
- [ ] All Convex tests pass
- [ ] 100% coverage of mutations
- [ ] All permission scenarios tested
- [ ] Migration validation comprehensive
- [ ] Error messages validated

---

#### Tier 2: Full E2E Tests (RECOMMENDED)

**Location:** `/tasks/00018-refine-version-model-permissions/01-phase1-upload-write-permissions/tests/e2e/`

**Why Recommended (not mandatory):**
- Validates frontend-to-backend integration
- Catches upload flow issues (file picker, upload hooks, progress tracking)
- Documents expected behavior visually (video recordings)
- Provides confidence for deployment

**Scope for Phase 1:**
- Minimal upload flow validation only
- Full E2E coverage deferred to Phase 2 (when viewer updates)

**Test Files:**

##### Setup Files

```
tests/e2e/
├── package.json              # Playwright + dependencies
├── playwright.config.ts      # Playwright configuration
├── helpers/
│   └── auth.ts              # Sign-in helpers
└── specs/
    └── upload-flow.spec.ts  # Upload tests
```

##### 1. Upload Flow (`specs/upload-flow.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';
import { signIn } from '../helpers/auth';

test.describe('Phase 1: Upload Flow', () => {
  test('owner can upload HTML artifact via UI', async ({ page }) => {
    // 1. Sign in as owner
    await signIn(page, 'owner@example.com');

    // 2. Navigate to upload
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'New Artifact' }).click();

    // 3. Upload HTML file from central samples
    const samplePath = path.join(
      __dirname,
      '../../../../../../samples/01-valid/html/simple-html/v1/index.html'
    );
    await page.setInputFiles('input[type="file"]', samplePath);

    // 4. Fill in title
    await page.fill('input[name="title"]', 'Test HTML Artifact');

    // 5. Submit
    await page.getByRole('button', { name: 'Create' }).click();

    // 6. Verify artifact was created (redirect to artifact page)
    await expect(page).toHaveURL(/\/a\/[a-zA-Z0-9]+/);

    // 7. Verify success message appears
    await expect(page.getByText(/Artifact created/i)).toBeVisible();
  });

  test('owner can upload Markdown artifact via UI', async ({ page }) => {
    await signIn(page, 'owner@example.com');

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'New Artifact' }).click();

    const samplePath = path.join(
      __dirname,
      '../../../../../../samples/01-valid/markdown/simple-markdown/v1/README.md'
    );
    await page.setInputFiles('input[type="file"]', samplePath);

    await page.fill('input[name="title"]', 'Test Markdown Artifact');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page).toHaveURL(/\/a\/[a-zA-Z0-9]+/);
    await expect(page.getByText(/Artifact created/i)).toBeVisible();
  });

  test('shows error for invalid file type', async ({ page }) => {
    await signIn(page, 'owner@example.com');

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'New Artifact' }).click();

    // Try to upload a PDF (not supported)
    const invalidPath = path.join(__dirname, '../../../../../../samples/02-invalid/invalid-types/document.pdf');
    await page.setInputFiles('input[type="file"]', invalidPath);

    // Expect error message
    await expect(page.getByText(/Invalid file type/i)).toBeVisible();
  });
});
```

**Tier 2 Validation Criteria:**
- [ ] Upload HTML test passes
- [ ] Upload Markdown test passes
- [ ] Error handling test passes
- [ ] Video recording captured for each test
- [ ] Videos stored in `tests/e2e/validation-videos/`

**Note:** All E2E tests MUST produce video recordings (mandatory per project guidelines).

---

#### Deployment Decision Matrix

| Scenario | Tier 1 (Convex) | Tier 2 (E2E) | Manual Testing | Can Deploy? |
|----------|:---------------:|:------------:|:--------------:|:-----------:|
| Ideal | ✅ Pass | ✅ Pass | N/A | ✅ Yes |
| Acceptable | ✅ Pass | ❌ Skip | ✅ Documented | ✅ Yes |
| Not Ready | ❌ Fail | - | - | ❌ No |
| Not Ready | ✅ Pass | - | ❌ None | ⚠️ Risky |

**Recommended Path:**
1. Write Tier 1 tests (mandatory)
2. Implement features to pass Tier 1
3. Write Tier 2 upload tests (1-2 tests)
4. Document manual testing in `test-report.md`
5. Deploy with confidence

---

#### Test Execution Order

**Development Workflow:**
1. Write Tier 1 test for feature
2. Implement feature to pass test
3. Verify locally
4. Move to next feature
5. After all features: Write Tier 2 upload tests
6. Create validation video
7. Document in test report

**Pre-Deployment Checklist:**
- [ ] All Tier 1 tests pass (100%)
- [ ] Migration tested on staging data copy
- [ ] Manual upload tested (at minimum)
- [ ] (Recommended) Tier 2 upload tests pass
- [ ] Test report created (`test-report.md`)
- [ ] Validation video available (if E2E tests run)

---

#### Test Report Template

**Location:** `/tasks/00018-refine-version-model-permissions/01-phase1-upload-write-permissions/test-report.md`

```markdown
# Phase 1 Test Report

**Date:** YYYY-MM-DD
**Tester:** [Your Name]

## Tier 1: Convex Backend Tests

- [ ] All tests pass
- [ ] Coverage: X%
- [ ] Test execution time: Xms

## Tier 2: Full E2E Tests

- [ ] Upload HTML test: PASS/SKIP
- [ ] Upload Markdown test: PASS/SKIP
- [ ] Error handling test: PASS/SKIP
- [ ] Videos recorded: YES/NO

## Manual Testing

### Upload HTML Artifact
- [ ] Tested
- Screenshot: [link]
- Notes: [observations]

### Upload Markdown Artifact
- [ ] Tested
- Screenshot: [link]
- Notes: [observations]

### Permission Enforcement
- [ ] Non-owner blocked from upload
- Screenshot: [link]

## Migration Validation

- [ ] Ran migration on staging copy
- [ ] X versions migrated successfully
- [ ] No data loss
- [ ] Verification query confirms integrity

## Deployment Decision

**Ready to deploy:** YES/NO
**Blocker (if any):** [describe]
```

---

## Post-Implementation Cleanup (Step 11 - After Phase 2)

**Note:** This step happens AFTER Phase 2 (retrieval) is complete.

### Remove Deprecated Fields from Schema

Once Phase 2 is complete and verified:

1. Remove `htmlContent` from `artifactVersions`
2. Remove `markdownContent` from `artifactVersions`
3. Change `entryPoint` to required `v.string()`
4. Change `createdBy` to required `v.id("users")`

**Do NOT do this in Phase 1** - retrieval still needs these fields during transition.

---

## Deployment Strategy

### Development Environment

1. Run all steps sequentially
2. Test thoroughly after each step
3. Run migration on dev data
4. Verify with frontend

### Production Environment

1. Deploy schema changes (Steps 2-3)
2. Deploy mutation updates (Steps 4-7)
3. Test new upload flow
4. Run migration script (Step 8) in batches
5. Monitor for errors
6. Verify with `verifyMigration`

### Rollback Plan

If issues occur:

1. **Schema changes:** New fields are optional, no rollback needed
2. **Mutation changes:** Frontend can fall back to old API if needed
3. **Migration:** Inline content preserved until Phase 2 cleanup

---

## Success Criteria Summary

**Upload Works:**
- [ ] HTML files stored as blobs in `_storage`
- [ ] Markdown files stored as blobs in `_storage`
- [ ] `artifactFiles` rows created correctly
- [ ] `entryPoint` set to appropriate file path
- [ ] `createdBy` set from current user

**Permissions Work:**
- [ ] Only owner can upload versions
- [ ] Only owner can update version names
- [ ] Only owner can delete versions
- [ ] Non-owners get proper error messages

**Migration Works:**
- [ ] All existing inline content converted to blobs
- [ ] All existing versions have `createdBy` set
- [ ] All existing versions have `entryPoint` set
- [ ] No data loss
- [ ] `verifyMigration` returns `isComplete: true`

**Tests Pass:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage meets requirements

---

## References

- Parent Task README: `../README.md`
- End-State Design: `../END-STATE-DESIGN.md`
- Schema Changes Summary: `../SCHEMA-CHANGES-SUMMARY.md`
- Convex Rules: `docs/architecture/convex-rules.md`
- Current Schema: `app/convex/schema.ts`
- Current Mutations: `app/convex/artifacts.ts`

---

**Document Author:** Software Architect Agent
**Last Updated:** 2025-12-31
**Version:** 1.0
