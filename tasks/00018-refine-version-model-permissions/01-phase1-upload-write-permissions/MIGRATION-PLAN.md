# Migration Plan: Inline Content → Unified Blob Storage

**Task:** 00018 - Phase 1
**Created:** 2025-12-31
**Updated:** 2025-12-31 (aligned with official Convex migration patterns)

---

## Overview

This document outlines the 3-step migration strategy for converting existing artifacts from inline content storage to unified blob storage.

**Migration Strategy:** Zero-downtime, backward-compatible migration

**Convex Best Practices:** ✅ This plan follows official Convex migration patterns:
- Uses `internalAction` for storage operations (`ctx.storage.store()`)
- Uses `internalMutation` for database updates
- Actions call mutations via `ctx.runMutation()` for transactional integrity
- Batch processing with resumability
- 3-step schema evolution (backward compatible → migrate → cleanup)

**References:**
- [Intro to Migrations](https://stack.convex.dev/intro-to-migrations)
- [Stateful Online Migrations](https://stack.convex.dev/migrating-data-with-mutations)

---

## Three-Step Migration Process

```
Step 1: Backward Compatible Schema
↓
Step 2: Migrate Existing Data
↓
Step 3: Clean Up Schema (Remove Backward Compatibility)
```

---

## Step 1: New Backward Compatible Schema

**Goal:** Add new fields while keeping old fields working

**When:** During Phase 1 implementation (Steps 2-3 in IMPLEMENTATION-PLAN.md)

**Schema Changes:**

### artifactVersions Table

```typescript
artifactVersions: defineTable({
  // Existing fields (KEEP ALL)
  artifactId: v.id("artifacts"),
  versionNumber: v.number(),
  fileType: v.union(v.literal("zip"), v.literal("html"), v.literal("markdown")), // Keep union temporarily
  htmlContent: v.optional(v.string()),      // ⚠️ KEEP (deprecated, will remove in Step 3)
  markdownContent: v.optional(v.string()),  // ⚠️ KEEP (deprecated, will remove in Step 3)
  entryPoint: v.optional(v.string()),       // ⚠️ Still optional
  fileSize: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),

  // NEW fields (all optional for backward compatibility)
  createdBy: v.optional(v.id("users")),     // ✅ NEW - will be required in Step 3
  versionName: v.optional(v.string()),      // ✅ NEW - stays optional
  deletedBy: v.optional(v.id("users")),     // ✅ NEW - stays optional
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_active", ["artifactId", "isDeleted"])
  .index("by_artifact_version", ["artifactId", "versionNumber"])
  .index("by_created_by", ["createdBy"])    // ✅ NEW
```

### artifacts Table

```typescript
artifacts: defineTable({
  // Existing fields (no changes)
  title: v.string(),
  description: v.optional(v.string()),
  creatorId: v.id("users"),
  shareToken: v.string(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),

  // NEW field
  deletedBy: v.optional(v.id("users")),     // ✅ NEW
})
  // ... existing indexes unchanged
```

### artifactFiles Table

```typescript
artifactFiles: defineTable({
  // Existing fields (no changes)
  versionId: v.id("artifactVersions"),
  filePath: v.string(),
  storageId: v.id("_storage"),
  mimeType: v.string(),
  fileSize: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),

  // NEW field
  deletedBy: v.optional(v.id("users")),     // ✅ NEW
})
  .index("by_version", ["versionId"])
  .index("by_version_path", ["versionId", "filePath"])
  .index("by_version_active", ["versionId", "isDeleted"])
```

**Key Points:**
- ✅ Old fields remain (`htmlContent`, `markdownContent`)
- ✅ New fields are optional (no data breakage)
- ✅ Existing queries still work
- ✅ New mutations can use new pattern
- ✅ Old mutations can still use old pattern (if needed)

**Validation:**
- [ ] Schema deploys successfully
- [ ] Existing artifacts still viewable
- [ ] No runtime errors
- [ ] Old queries return correct data

---

## Step 2: Migrate Existing Data

**Goal:** Convert all inline content to blob storage

**When:** During Phase 1 implementation (Step 8 in IMPLEMENTATION-PLAN.md)

**Migration Process:**

### 2.1 Create Migration Mutations

**Location:** `/app/convex/migrations/migrateToUnifiedStorage.ts`

```typescript
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Count versions needing migration
 */
export const countPendingMigrations = internalQuery({
  args: {},
  returns: v.object({
    totalVersions: v.number(),
    pendingMigration: v.number(),
    missingCreatedBy: v.number(),
    missingEntryPoint: v.number(),
  }),
  handler: async (ctx) => {
    const versions = await ctx.db.query("artifactVersions").collect();

    let pendingMigration = 0;
    let missingCreatedBy = 0;
    let missingEntryPoint = 0;

    for (const version of versions) {
      // Has inline content but no artifactFiles row?
      if (version.htmlContent || version.markdownContent) {
        const hasFile = await ctx.db
          .query("artifactFiles")
          .withIndex("by_version", (q) => q.eq("versionId", version._id))
          .first();

        if (!hasFile) {
          pendingMigration++;
        }
      }

      if (!version.createdBy) missingCreatedBy++;
      if (!version.entryPoint && version.fileType !== "zip") missingEntryPoint++;
    }

    return {
      totalVersions: versions.length,
      pendingMigration,
      missingCreatedBy,
      missingEntryPoint,
    };
  },
});

/**
 * Get versions needing migration
 * Returns batch of versions with inline content that need conversion
 */
export const getVersionsToMigrate = internalQuery({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.array(v.object({
    versionId: v.id("artifactVersions"),
    artifactId: v.id("artifacts"),
    content: v.string(),
    filePath: v.string(),
    mimeType: v.string(),
    fileType: v.string(),
  })),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 10;
    const result = [];

    // Get all versions (acceptable for one-time migration)
    const allVersions = await ctx.db.query("artifactVersions").collect();

    for (const version of allVersions) {
      if (result.length >= batchSize) break;

      // Skip if no inline content
      if (!version.htmlContent && !version.markdownContent) continue;

      // Skip if already has artifactFiles row
      const existingFile = await ctx.db
        .query("artifactFiles")
        .withIndex("by_version", (q) => q.eq("versionId", version._id))
        .first();

      if (existingFile) continue;

      // Determine content and file metadata
      if (version.htmlContent) {
        result.push({
          versionId: version._id,
          artifactId: version.artifactId,
          content: version.htmlContent,
          filePath: "index.html",
          mimeType: "text/html",
          fileType: version.fileType,
        });
      } else if (version.markdownContent) {
        result.push({
          versionId: version._id,
          artifactId: version.artifactId,
          content: version.markdownContent,
          filePath: "README.md",
          mimeType: "text/markdown",
          fileType: version.fileType,
        });
      }
    }

    return result;
  },
});

/**
 * Migrate a single version (ACTION - can use ctx.storage.store)
 * Stores content as blob and calls mutation to update database
 */
export const migrateVersion = internalAction({
  args: {
    versionId: v.id("artifactVersions"),
    artifactId: v.id("artifacts"),
    content: v.string(),
    filePath: v.string(),
    mimeType: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // ✅ Storage operations work in actions
    const contentBlob = new Blob([args.content], { type: args.mimeType });
    const storageId = await ctx.storage.store(contentBlob);

    // Get parent artifact for createdBy backfill
    const artifact = await ctx.runQuery(internal.migrations.migrateToUnifiedStorage.getArtifact, {
      artifactId: args.artifactId,
    });

    if (!artifact) {
      throw new Error(`Artifact ${args.artifactId} not found`);
    }

    // Call mutation to update database
    await ctx.runMutation(internal.migrations.migrateToUnifiedStorage.applyMigration, {
      versionId: args.versionId,
      storageId,
      filePath: args.filePath,
      mimeType: args.mimeType,
      fileSize: args.content.length,
      createdBy: artifact.creatorId,
    });

    return null;
  },
});

/**
 * Helper query to get artifact for createdBy backfill
 */
export const getArtifact = internalQuery({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.union(
    v.object({
      creatorId: v.id("users"),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) return null;
    return { creatorId: artifact.creatorId };
  },
});

/**
 * Apply migration to database (MUTATION - updates DB only)
 * Creates artifactFiles row and updates version metadata
 */
export const applyMigration = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    storageId: v.id("_storage"),
    filePath: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    createdBy: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Create artifactFiles row
    await ctx.db.insert("artifactFiles", {
      versionId: args.versionId,
      filePath: args.filePath,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      isDeleted: false,
    });

    // Update version with new fields
    await ctx.db.patch(args.versionId, {
      createdBy: args.createdBy,
      entryPoint: args.filePath,
    });

    return null;
  },
});

/**
 * Batch migration coordinator (ACTION - orchestrates the process)
 * Calls getVersionsToMigrate, then migrates each version
 */
export const migrateBatch = internalAction({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    migrated: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 10;

    // Get batch of versions to migrate
    const versions = await ctx.runQuery(
      internal.migrations.migrateToUnifiedStorage.getVersionsToMigrate,
      { batchSize }
    );

    let migrated = 0;
    const errors: string[] = [];

    // Migrate each version
    for (const version of versions) {
      try {
        await ctx.runAction(internal.migrations.migrateToUnifiedStorage.migrateVersion, {
          versionId: version.versionId,
          artifactId: version.artifactId,
          content: version.content,
          filePath: version.filePath,
          mimeType: version.mimeType,
        });
        migrated++;
      } catch (error) {
        errors.push(`Version ${version.versionId}: ${error}`);
      }
    }

    return {
      processed: versions.length,
      migrated,
      errors,
    };
  },
});

/**
 * Backfill createdBy for versions missing it
 */
export const backfillCreatedBy = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;

    const versions = await ctx.db
      .query("artifactVersions")
      .filter((q) => q.eq(q.field("createdBy"), undefined))
      .take(batchSize);

    for (const version of versions) {
      const artifact = await ctx.db.get(version.artifactId);
      if (artifact) {
        await ctx.db.patch(version._id, {
          createdBy: artifact.creatorId,
        });
      }
    }

    return { updated: versions.length };
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
  }),
  handler: async (ctx) => {
    const issues: string[] = [];

    // Check for versions with inline content but no artifactFiles
    const versionsWithInlineContent = await ctx.db
      .query("artifactVersions")
      .filter((q) =>
        q.or(
          q.neq(q.field("htmlContent"), undefined),
          q.neq(q.field("markdownContent"), undefined)
        )
      )
      .collect();

    for (const version of versionsWithInlineContent) {
      const file = await ctx.db
        .query("artifactFiles")
        .withIndex("by_version", (q) => q.eq("versionId", version._id))
        .first();

      if (!file) {
        issues.push(`Version ${version._id} has inline content but no artifactFiles row`);
      }
    }

    // Check for versions missing createdBy
    const versionsWithoutCreatedBy = await ctx.db
      .query("artifactVersions")
      .filter((q) => q.eq(q.field("createdBy"), undefined))
      .collect();

    if (versionsWithoutCreatedBy.length > 0) {
      issues.push(`${versionsWithoutCreatedBy.length} versions missing createdBy field`);
    }

    // Check for single-file versions missing entryPoint
    const versionsWithoutEntryPoint = await ctx.db
      .query("artifactVersions")
      .filter((q) =>
        q.and(
          q.neq(q.field("fileType"), "zip"),
          q.eq(q.field("entryPoint"), undefined)
        )
      )
      .collect();

    if (versionsWithoutEntryPoint.length > 0) {
      issues.push(`${versionsWithoutEntryPoint.length} single-file versions missing entryPoint`);
    }

    return {
      isComplete: issues.length === 0,
      issues,
    };
  },
});
```

### 2.2 Migration Execution Plan

**Prerequisites:**
- [ ] Step 1 schema changes deployed
- [ ] All new code deployed (Steps 4-7 in IMPLEMENTATION-PLAN.md)
- [ ] Migration script tested on dev/staging

**Execution Steps:**

1. **Check migration status:**
   ```bash
   npx convex run migrations/migrateToUnifiedStorage:countPendingMigrations
   ```

   Expected output:
   ```json
   {
     "totalVersions": 150,
     "pendingMigration": 75,
     "missingCreatedBy": 75,
     "missingEntryPoint": 75
   }
   ```

2. **Migrate in batches:**
   ```bash
   # Migrate 10 versions at a time (this is an ACTION that coordinates everything)
   npx convex run migrations/migrateToUnifiedStorage:migrateBatch '{"batchSize": 10}'
   ```

   Expected output:
   ```json
   {
     "processed": 10,
     "migrated": 10,
     "errors": []
   }
   ```

   Repeat until `processed: 0` (no more to migrate)

3. **Backfill createdBy (if needed):**
   ```bash
   npx convex run migrations/migrateToUnifiedStorage:backfillCreatedBy
   ```

   This handles any versions that had content but missing createdBy

4. **Verify completeness:**
   ```bash
   npx convex run migrations/migrateToUnifiedStorage:verifyMigration
   ```

   Expected output:
   ```json
   {
     "isComplete": true,
     "issues": []
   }
   ```

**Rollback Plan:**
- Inline content fields still exist, so old viewer still works
- If migration has errors, fix and re-run batches
- Can continue using inline content until migration complete

**Validation:**
- [ ] All versions have artifactFiles rows
- [ ] All versions have createdBy set
- [ ] All single-file versions have entryPoint set
- [ ] Content preserved (spot-check random samples)
- [ ] No orphaned versions

---

## Step 3: Clean Up Schema (Remove Backward Compatibility)

**Goal:** Remove deprecated fields and make new fields required

**When:** AFTER Phase 2 (Retrieval + Read Permissions) is complete

**Why After Phase 2:**
- Phase 1 changes upload (write path)
- Phase 2 changes retrieval (read path)
- Must update both paths before removing old fields
- Viewer must read from artifactFiles before removing inline content

**Schema Changes:**

### artifactVersions Table

```typescript
artifactVersions: defineTable({
  // Existing fields (unchanged)
  artifactId: v.id("artifacts"),
  versionNumber: v.number(),
  fileSize: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),

  // CHANGED: fileType from union → string
  fileType: v.string(),                     // ✅ CHANGED (extensible)

  // CHANGED: Required fields (were optional)
  createdBy: v.id("users"),                 // ✅ CHANGED (was optional)
  entryPoint: v.string(),                   // ✅ CHANGED (was optional)

  // NEW fields (stay optional)
  versionName: v.optional(v.string()),
  deletedBy: v.optional(v.id("users")),

  // REMOVED FIELDS:
  // htmlContent: v.optional(v.string()),      // ❌ REMOVED
  // markdownContent: v.optional(v.string()),  // ❌ REMOVED
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_active", ["artifactId", "isDeleted"])
  .index("by_artifact_version", ["artifactId", "versionNumber"])
  .index("by_created_by", ["createdBy"])
```

### artifacts & artifactFiles Tables

```typescript
// artifacts - only change is deletedBy (already added in Step 1)
artifacts: defineTable({
  // ... all existing fields
  deletedBy: v.optional(v.id("users")),     // Already added in Step 1
})

// artifactFiles - only change is deletedBy (already added in Step 1)
artifactFiles: defineTable({
  // ... all existing fields
  deletedBy: v.optional(v.id("users")),     // Already added in Step 1
})
```

**Pre-Cleanup Checklist:**
- [ ] Phase 1 complete (upload uses blob storage)
- [ ] Phase 2 complete (viewer reads from blob storage)
- [ ] Migration 100% complete (verified)
- [ ] All versions have createdBy and entryPoint
- [ ] No code references htmlContent or markdownContent

**Cleanup Steps:**

1. **Remove code references:**
   ```bash
   # Search for any remaining references
   grep -r "htmlContent" app/convex/
   grep -r "markdownContent" app/convex/
   grep -r "htmlContent" app/src/
   grep -r "markdownContent" app/src/
   ```

   Remove or update all references

2. **Update schema:**
   - Remove `htmlContent` and `markdownContent` fields
   - Change `fileType` from union to `v.string()`
   - Change `createdBy` from optional to required
   - Change `entryPoint` from optional to required

3. **Deploy schema changes:**
   ```bash
   npx convex deploy
   ```

4. **Monitor for errors:**
   - Check Convex logs for any query/mutation failures
   - Verify viewer still works
   - Test upload flow

**Validation:**
- [ ] Schema deployed successfully
- [ ] No runtime errors
- [ ] Viewer loads artifacts correctly
- [ ] Upload creates artifacts correctly
- [ ] No references to removed fields

---

## Migration Timeline Summary

| Step | Description | Phase | Can Deploy? | Rollback Risk |
|------|-------------|-------|:-----------:|:-------------:|
| 1 | Add new optional fields | Phase 1 | ✅ Yes | Low |
| 2 | Migrate existing data | Phase 1 | ✅ Yes | Low (old fields remain) |
| 3 | Remove old fields | After Phase 2 | ✅ Yes | Medium (requires Phase 2 complete) |

**Key Safety Features:**
- ✅ Zero-downtime deployment (backward compatible)
- ✅ Incremental migration (batch by batch)
- ✅ Dry-run testing (validate before real run)
- ✅ Verification queries (confirm completeness)
- ✅ Rollback possible at each step

---

## Testing the Migration

### Unit Tests (Convex)

**Location:** `/tasks/00018-refine-version-model-permissions/01-phase1-upload-write-permissions/tests/convex/migration.test.ts`

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
  });

  describe("verifyMigration", () => {
    it("returns isComplete true when all migrated");
    it("lists issues when migration incomplete");
  });
});
```

### Manual Testing

**Before migration:**
1. Create test artifacts with inline content (HTML and Markdown)
2. Note artifact IDs and content
3. Verify they display correctly

**During migration:**
1. Run dry-run on test data
2. Check logs for correct behavior
3. Run real migration on test data
4. Verify artifactFiles rows created

**After migration:**
1. Verify test artifacts still viewable (using old inline fields)
2. Check database confirms artifactFiles rows exist
3. Create NEW artifact (should use blob storage)
4. Confirm new artifact works correctly

---

## Success Criteria

**Step 1 Complete:**
- [ ] Schema deployed with new optional fields
- [ ] Existing artifacts still work
- [ ] New uploads use blob storage
- [ ] Old uploads still use inline content

**Step 2 Complete:**
- [ ] 100% of versions migrated to blob storage
- [ ] 100% of versions have createdBy
- [ ] 100% of single-file versions have entryPoint
- [ ] Verification query returns `isComplete: true`
- [ ] Spot-checked artifacts display correctly

**Step 3 Complete (After Phase 2):**
- [ ] Old fields removed from schema
- [ ] Required fields enforced
- [ ] No code references old fields
- [ ] All tests pass
- [ ] Production artifacts work correctly

---

## References

- Implementation Plan: `IMPLEMENTATION-PLAN.md`
- Schema Changes: `../SCHEMA-CHANGES-SUMMARY.md`
- End State Design: `../END-STATE-DESIGN.md`
- Current Schema: `/app/convex/schema.ts`
