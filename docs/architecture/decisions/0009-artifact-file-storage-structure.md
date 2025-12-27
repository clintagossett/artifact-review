# ADR 0009: Artifact File Storage Structure

**Status:** Accepted
**Date:** 2025-12-26
**Decision Maker:** Clint Gossett

## TL;DR

Store extracted artifact files (from ZIP uploads) in a flat `artifactFiles` table with path strings, not nested JSON trees. Uses separate table rows with compound index for O(1) path lookups. Validated by working chef implementation.

## Quick Reference

| Item | Value |
|------|-------|
| **Storage pattern** | Flat table with `filePath` string field |
| **Table name** | `artifactFiles` |
| **Key index** | `by_version_path: [versionId, filePath]` |
| **Lookup complexity** | O(1) via compound index |
| **Chef validation** | Proven working in htmlreview implementation |

## Context

Task 10 (Artifact Upload & Creation) requires storing multi-file HTML projects uploaded as ZIP archives. Each ZIP contains a directory structure with HTML, CSS, JavaScript, images, and other assets that must be:

1. **Extracted and stored individually** - Preserve file-level metadata and permissions
2. **Served via HTTP proxy** - Per ADR 0002, files served at `/a/{token}/v{version}/{filePath}`
3. **Looked up by path** - Fast resolution of relative paths like `assets/logo.png`
4. **Queryable** - List all files for a version, filter by type, check sizes
5. **Deletable** - Soft delete entire versions with cascade to files

### Problem Statement

**Question:** How should we represent the extracted file tree in the database?

**Options Considered:**
- **Option A:** Embedded array in version document: `files: [{path: "assets/logo.png", storageId: "..."}]`
- **Option B:** Store ZIP file, extract on every request (rejected - too slow)
- **Option C:** Nested tree JSON in version document: `{assets: {logo: {storageId: "..."}}}`
- **Option D:** Separate table with flat path strings (chef pattern)

## Decision

**Use Option D: Separate `artifactFiles` table with flat path strings.**

Each file from extracted ZIP is stored as an individual row in `artifactFiles` table, with `filePath` containing the relative path as a string (e.g., `"assets/logo.png"`).

### Schema Definition

```typescript
// New table for Task 10
artifactFiles: defineTable({
  versionId: v.id("artifactVersions"),       // Link to specific version
  filePath: v.string(),                      // Relative path: "assets/logo.png"
  storageId: v.id("_storage"),               // Convex File Storage reference
  mimeType: v.string(),                      // Content-Type for serving
  fileSize: v.number(),                      // Bytes
  isDeleted: v.boolean(),                    // Soft deletion flag
  deletedAt: v.optional(v.number()),         // Soft deletion timestamp
})
  .index("by_version", ["versionId"])
  .index("by_version_path", ["versionId", "filePath"])      // ⭐ Critical for O(1) lookups
  .index("by_version_active", ["versionId", "isDeleted"]),  // Active files only
```

### Example Data

When this ZIP is uploaded:
```
my-dashboard.zip
├── index.html
├── app.js
└── assets/
    ├── logo.png
    └── chart-data.json
```

Creates these rows in `artifactFiles`:

| versionId | filePath | storageId | mimeType | fileSize | isDeleted |
|-----------|----------|-----------|----------|----------|-----------|
| v123 | `index.html` | storage_a | text/html | 1024 | false |
| v123 | `app.js` | storage_b | application/javascript | 2048 | false |
| v123 | `assets/logo.png` | storage_c | image/png | 3072 | false |
| v123 | `assets/chart-data.json` | storage_d | application/json | 512 | false |

## Rationale

### Why Separate Table (Not Embedded Array)

**Advantages:**
1. **No document size limit concerns** - Convex documents limited to 1MB; 500 files × metadata could exceed this
2. **Efficient queries** - Can filter files by type, size, etc. without loading entire array
3. **Atomic updates** - Add/remove individual files without patching large arrays
4. **Better indexing** - Compound index on `[versionId, filePath]` enables O(1) lookups
5. **Soft deletion** - Mark individual files as deleted without complex array manipulation

**Embedded Array Issues:**
- 500 files = ~100KB metadata (risky near 1MB limit)
- Must load entire array to find one file
- Soft delete requires filtering array on every query
- No compound indexes on array elements

### Why Flat Paths (Not Nested Tree)

**Advantages:**
1. **Simple storage** - Just insert row with path string
2. **O(1) lookups** - Direct index hit on `[versionId, "assets/logo.png"]`
3. **HTTP proxy friendly** - Incoming path `/assets/logo.png` maps directly to `filePath` field
4. **Easy listing** - Query all files for version with single index scan
5. **Proven pattern** - Chef implementation validates this works

**Nested Tree Issues:**
- Must traverse tree to find file (O(depth) complexity)
- Complex mutation logic (patch nested objects)
- No schema validation (requires `v.any()`)
- Harder to query (can't use indexes on nested structure)
- Path → storage ID requires recursive search

### Chef Implementation Validation

The htmlreview chef implementation uses this exact pattern:

**Chef Schema** (`convex/schema.ts`):
```typescript
documentAssets: defineTable({
  documentId: v.id("documents"),
  filePath: v.string(),
  storageId: v.id("_storage"),
  mimeType: v.string(),
  fileSize: v.number(),
}).index("by_document", ["documentId"])
  .index("by_document_path", ["documentId", "filePath"]),
```

**Chef Path Lookup** (`convex/documents.ts`):
```typescript
const asset = await ctx.db
  .query("documentAssets")
  .withIndex("by_document_path", (q) =>
    q.eq("documentId", args.documentId).eq("filePath", args.filePath)
  )
  .unique();
```

**Proven to work** in production-like environment serving multi-file HTML projects.

## Implementation Examples

### Storing Files (After ZIP Extraction)

```typescript
// In zipProcessor action after extracting each file
export const storeExtractedFile = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    filePath: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  returns: v.id("artifactFiles"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("artifactFiles", {
      versionId: args.versionId,
      filePath: args.filePath,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      isDeleted: false,
      deletedAt: undefined,
    });
  },
});
```

### Path Lookup (HTTP Proxy)

```typescript
// Serve file at /a/{token}/v1/assets/logo.png
export const getFileByPath = query({
  args: {
    versionId: v.id("artifactVersions"),
    filePath: v.string(),
  },
  returns: v.union(
    v.object({
      storageId: v.id("_storage"),
      mimeType: v.string(),
      fileSize: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("artifactFiles")
      .withIndex("by_version_path", (q) =>
        q.eq("versionId", args.versionId).eq("filePath", args.filePath)
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))  // Exclude soft-deleted
      .unique();

    if (!file) return null;

    return {
      storageId: file.storageId,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    };
  },
});
```

### List All Files for Version

```typescript
export const listVersionFiles = query({
  args: { versionId: v.id("artifactVersions") },
  returns: v.array(v.object({
    _id: v.id("artifactFiles"),
    filePath: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artifactFiles")
      .withIndex("by_version_active", (q) =>
        q.eq("versionId", args.versionId).eq("isDeleted", false)
      )
      .collect();
  },
});
```

### Soft Delete Version (Cascade to Files)

```typescript
export const softDeleteVersion = mutation({
  args: { versionId: v.id("artifactVersions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Soft delete version
    await ctx.db.patch(args.versionId, {
      isDeleted: true,
      deletedAt: now,
    });

    // 2. Cascade soft delete to all files
    const files = await ctx.db
      .query("artifactFiles")
      .withIndex("by_version_active", (q) =>
        q.eq("versionId", args.versionId).eq("isDeleted", false)
      )
      .collect();

    for (const file of files) {
      await ctx.db.patch(file._id, {
        isDeleted: true,
        deletedAt: now,
      });
    }

    return null;
  },
});
```

## Consequences

### Positive

- ✅ **O(1) path lookups** - Compound index enables instant file resolution
- ✅ **No document size limits** - Each file is separate row, unlimited files
- ✅ **Simple storage logic** - Straightforward inserts after extraction
- ✅ **Easy queries** - Filter by type, size, version without loading all data
- ✅ **Soft deletion support** - Mark files as deleted without data loss
- ✅ **Proven working** - Chef implementation validates approach
- ✅ **Aligns with ADR 0002** - HTTP proxy pattern works naturally with flat paths
- ✅ **Type safe** - Full schema validation, no `v.any()`

### Negative

- ⚠️ **Multiple DB writes** - One insert per file (vs one insert with array)
  - **Mitigation:** Use internal mutations, writes are fast in Convex
- ⚠️ **No inherent directory structure** - Must parse paths to build tree for UI
  - **Mitigation:** Parse `filePath` client-side when rendering folder tree
- ⚠️ **More DB rows** - 500 files = 500 rows vs 1 document
  - **Mitigation:** Convex handles millions of rows efficiently, not a concern

### Trade-offs Accepted

**We accept:**
- Parsing paths to render folder trees in UI
- Multiple DB writes during ZIP extraction

**We gain:**
- O(1) path lookups (critical for HTTP proxy performance)
- No document size concerns (scale to 1000s of files)
- Simple, maintainable code
- Proven pattern from working implementation

## Alternatives Considered

### Alt 1: Embedded Array in Version Document

```typescript
artifactVersions: defineTable({
  // ...
  files: v.array(v.object({
    path: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileSize: v.number(),
  })),
})
```

**Rejected because:**
- ❌ Document size limit risk (500 files × 200 bytes = 100KB+ metadata)
- ❌ Must load entire array to find one file
- ❌ No compound index on array elements
- ❌ Soft deletion requires filtering array on every query
- ❌ Complex patch logic for adding/removing files

### Alt 2: Nested Tree JSON

```typescript
artifactVersions: defineTable({
  // ...
  fileTree: v.any(), // {assets: {logo: {storageId: "..."}}}
})
```

**Rejected because:**
- ❌ Path lookup requires recursive tree traversal (O(depth))
- ❌ No schema validation (`v.any()` is unsafe)
- ❌ Complex mutation logic to navigate and update tree
- ❌ Can't use indexes on nested structure
- ❌ Harder to query (e.g., "find all images")

### Alt 3: Store ZIP, Extract on Every Request

```typescript
artifactVersions: defineTable({
  // ...
  zipStorageId: v.id("_storage"), // Original ZIP
})
```

**Rejected because:**
- ❌ Must extract ZIP on every file request (slow, CPU-intensive)
- ❌ Can't check permissions on individual files
- ❌ No per-file metadata (size, MIME type)
- ❌ Memory intensive for large ZIPs
- ❌ Poor performance, user experience suffers

## Migration from Chef Pattern

The chef implementation uses `documentAssets` table. For our implementation:

**Chef:**
```typescript
documentAssets: defineTable({
  documentId: v.id("documents"),  // Links to document
  // ...
})
```

**Our Version:**
```typescript
artifactFiles: defineTable({
  versionId: v.id("artifactVersions"),  // Links to version (more granular)
  // ...
  isDeleted: v.boolean(),               // Add soft deletion
  deletedAt: v.optional(v.number()),
})
```

**Key Differences:**
1. Link to `versionId` instead of `documentId` (matches our versioning model)
2. Add soft deletion fields (required per earlier design decisions)
3. Add `by_version_active` index for soft-deleted file filtering

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Lookup file by path | O(1) | Compound index on `[versionId, filePath]` |
| List all files for version | O(n) | Index scan on `by_version_active` |
| List files by type | O(n) | Scan + filter (acceptable, infrequent operation) |
| Delete version | O(n) | Must update n file rows (acceptable, infrequent) |
| Insert file | O(1) | Single row insert |

**Expected file counts:** 10-100 files typical, 500 max per version (per ADR 0002)

## Related Decisions

- [ADR 0002: HTML Artifact Storage](./0002-html-artifact-storage.md) - HTTP proxy pattern, file size limits
- [Convex Rules](../convex-rules.md) - Index usage, query patterns

## References

### Chef Implementation
- **Location:** `/Users/clintgossett/Downloads/htmlreview_-_collaborative_html_document_review_platform`
- **Schema:** `convex/schema.ts` (documentAssets table)
- **Path Lookup:** `convex/documents.ts` (getAssetByPath query)
- **HTTP Serving:** `convex/router.ts` (project file serving)

### Convex Documentation
- [Indexes](https://docs.convex.dev/database/indexes)
- [Compound Indexes](https://docs.convex.dev/database/indexes#compound-indexes)
- [File Storage](https://docs.convex.dev/file-storage)

## Implementation Checklist

For Task 10 implementation:

- [ ] Create `artifactFiles` table with schema above
- [ ] Add indexes: `by_version`, `by_version_path`, `by_version_active`
- [ ] Implement `storeExtractedFile` internal mutation
- [ ] Implement `getFileByPath` query for HTTP proxy
- [ ] Implement `listVersionFiles` query for UI
- [ ] Implement soft deletion cascade logic
- [ ] Test with 500-file ZIP (max limit per ADR 0002)
- [ ] Test path lookup performance
- [ ] Test soft deletion cascades correctly
