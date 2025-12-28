# ADR 0012: Unified Artifact Storage Strategy

**Status:** Proposed
**Date:** 2025-12-28
**Decision Maker:** Clint Gossett
**Supersedes:** Parts of ADR 0002 (inline storage), parts of ADR 0009 (ZIP-only `artifactFiles`)

## TL;DR

Store ALL artifact content (HTML, Markdown, ZIP, and future types) through the `artifactFiles` table with `_storage` backend. Remove inline `htmlContent` and `markdownContent` fields from `artifactVersions`. Change `fileType` from union of literals to `v.string()` with application-level validation for extensibility.

## Quick Reference

| Item | Current State | New State |
|------|--------------|-----------|
| HTML storage | Inline in `artifactVersions.htmlContent` | `artifactFiles` -> `_storage` |
| Markdown storage | Inline in `artifactVersions.markdownContent` | `artifactFiles` -> `_storage` |
| ZIP storage | `artifactFiles` -> `_storage` | `artifactFiles` -> `_storage` (unchanged) |
| File type validation | `v.union(v.literal("zip"), ...)` | `v.string()` + app validation |
| Adding new types | Requires schema migration | No schema changes needed |

## Context

### Current State: Mixed Storage Approach

The current schema uses two different storage strategies:

**Strategy A: Inline Content (HTML/Markdown)**
```typescript
artifactVersions: defineTable({
  fileType: v.union(v.literal("zip"), v.literal("html"), v.literal("markdown")),
  htmlContent: v.optional(v.string()),      // Content stored inline
  markdownContent: v.optional(v.string()),  // Content stored inline
  // ...
})
```

**Strategy B: External Storage (ZIP)**
```typescript
artifactFiles: defineTable({
  versionId: v.id("artifactVersions"),
  filePath: v.string(),
  storageId: v.id("_storage"),  // Content in Convex storage
  // ...
})
```

### Problems with Mixed Approach

1. **Two code paths for serving content:**
   - HTML/Markdown: Read from `artifactVersions.htmlContent` or `markdownContent`
   - ZIP: Query `artifactFiles`, get `storageId`, fetch from storage

2. **Inconsistent API surface:**
   - Single-file: Content comes from version document
   - Multi-file: Content comes from separate query + storage fetch

3. **Schema changes required for new types:**
   - Adding `.txt` support requires adding `textContent: v.optional(v.string())`
   - Adding `.csv` requires adding `csvContent: v.optional(v.string())`
   - Each new type = schema migration

4. **Document size concerns:**
   - Inline content bloats version documents
   - Large HTML (>100KB) pushes toward 1MB document limit
   - Queries that fetch version list also load content unnecessarily

5. **No file metadata for inline content:**
   - ZIP files have `mimeType`, `fileSize` in `artifactFiles`
   - Inline HTML/Markdown lack these fields

## Decision

**Unify ALL artifact storage through the `artifactFiles` table.**

### Schema Changes

**Remove from `artifactVersions`:**
```typescript
// REMOVE these fields:
htmlContent: v.optional(v.string()),      // DELETE
markdownContent: v.optional(v.string()),  // DELETE
```

**Change `fileType` validation:**
```typescript
// FROM:
fileType: v.union(v.literal("zip"), v.literal("html"), v.literal("markdown"))

// TO:
fileType: v.string()  // Application-level validation
```

**Keep `artifactFiles` unchanged** (already supports this pattern):
```typescript
artifactFiles: defineTable({
  versionId: v.id("artifactVersions"),
  filePath: v.string(),                // "index.html" for single-file artifacts
  storageId: v.id("_storage"),
  mimeType: v.string(),
  fileSize: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
```

### Storage Pattern by File Type

| File Type | `artifactFiles` Rows | `filePath` Value |
|-----------|---------------------|------------------|
| HTML (single) | 1 | `"index.html"` |
| Markdown (single) | 1 | `"index.md"` or `"README.md"` |
| Text (single) | 1 | `"content.txt"` or original filename |
| CSV (single) | 1 | Original filename |
| ZIP (multi) | N | Extracted paths: `"assets/logo.png"` |

### Application-Level File Type Validation

Since `fileType` becomes `v.string()`, validation moves to TypeScript:

```typescript
// convex/lib/fileTypes.ts

export const SUPPORTED_FILE_TYPES = [
  "html",
  "markdown",
  "zip",
  // Future: "txt", "csv", "pdf", etc.
] as const;

export type SupportedFileType = typeof SUPPORTED_FILE_TYPES[number];

// Validator for use in mutations
export function isValidFileType(type: string): type is SupportedFileType {
  return SUPPORTED_FILE_TYPES.includes(type as SupportedFileType);
}

// Use in mutations:
export const createVersion = mutation({
  args: {
    artifactId: v.id("artifacts"),
    fileType: v.string(),  // Accept any string
    // ...
  },
  returns: v.id("artifactVersions"),
  handler: async (ctx, args) => {
    // Validate at application layer
    if (!isValidFileType(args.fileType)) {
      throw new Error(`Unsupported file type: ${args.fileType}. Supported: ${SUPPORTED_FILE_TYPES.join(", ")}`);
    }
    // ...
  },
});
```

### Adding New File Types

**Before (current approach):**
1. Add new field to schema: `newTypeContent: v.optional(v.string())`
2. Run schema migration
3. Update all queries/mutations
4. Deploy

**After (unified approach):**
1. Add type to `SUPPORTED_FILE_TYPES` array
2. Update upload handler to accept new MIME type
3. Deploy (no schema changes)

```typescript
// Example: Adding CSV support
export const SUPPORTED_FILE_TYPES = [
  "html",
  "markdown",
  "zip",
  "csv",  // Just add here
] as const;
```

## Implementation Examples

### Upload Single HTML File

```typescript
export const uploadHtmlVersion = mutation({
  args: {
    artifactId: v.id("artifacts"),
    content: v.string(),
    fileName: v.optional(v.string()),  // Default: "index.html"
  },
  returns: v.id("artifactVersions"),
  handler: async (ctx, args) => {
    // 1. Create version record
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId: args.artifactId,
      versionNumber: await getNextVersionNumber(ctx, args.artifactId),
      fileType: "html",
      entryPoint: args.fileName ?? "index.html",
      fileSize: new Blob([args.content]).size,
      isDeleted: false,
      deletedAt: undefined,
      createdAt: Date.now(),
    });

    // 2. Store content in _storage via internal action
    const storageId = await ctx.scheduler.runAfter(0, internal.storage.storeText, {
      versionId,
      content: args.content,
      filePath: args.fileName ?? "index.html",
      mimeType: "text/html",
    });

    return versionId;
  },
});
```

### Serve Any File Type (Unified)

```typescript
// Single code path for ALL file types
export const getFileContent = query({
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
      .withIndex("by_version_path", q =>
        q.eq("versionId", args.versionId).eq("filePath", args.filePath)
      )
      .unique();

    if (!file || file.isDeleted) return null;

    return {
      storageId: file.storageId,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    };
  },
});
```

### HTTP Proxy (Unchanged from ADR 0002)

```typescript
// Works identically for HTML, Markdown, ZIP, or any future type
http.route({
  path: "/a/:token/v:version/*filePath",
  method: "GET",
  handler: async (ctx, request) => {
    const { token, version, filePath } = parseParams(request);

    // 1. Resolve artifact and version
    const artifact = await ctx.runQuery(api.artifacts.getByToken, { token });
    const versionRecord = await ctx.runQuery(api.versions.getByNumber, {
      artifactId: artifact._id,
      versionNumber: parseInt(version),
    });

    // 2. Get file (same query for ALL types)
    const file = await ctx.runQuery(api.files.getByPath, {
      versionId: versionRecord._id,
      filePath: filePath || versionRecord.entryPoint,
    });

    // 3. Fetch and serve
    const blob = await ctx.storage.get(file.storageId);
    return new Response(blob, {
      headers: { "Content-Type": file.mimeType },
    });
  },
});
```

## Migration Path

### Phase 1: Add Support for New Pattern

1. Keep existing inline fields (backward compatible)
2. Add upload flows that use `artifactFiles` for all types
3. Update serving logic to check `artifactFiles` first, fall back to inline

```typescript
// Transitional serving logic
async function getContent(ctx, versionId: Id<"artifactVersions">, filePath: string) {
  // Try new pattern first
  const file = await ctx.db.query("artifactFiles")
    .withIndex("by_version_path", q => q.eq("versionId", versionId).eq("filePath", filePath))
    .unique();

  if (file && !file.isDeleted) {
    return { storageId: file.storageId, mimeType: file.mimeType };
  }

  // Fall back to legacy inline content
  const version = await ctx.db.get(versionId);
  if (version?.htmlContent) {
    // Convert inline to blob response
    return { content: version.htmlContent, mimeType: "text/html" };
  }
  if (version?.markdownContent) {
    return { content: version.markdownContent, mimeType: "text/markdown" };
  }

  return null;
}
```

### Phase 2: Migrate Existing Data

Run a one-time migration to move inline content to `artifactFiles`:

```typescript
// Migration script (run once)
export const migrateInlineContent = internalMutation({
  args: {},
  returns: v.object({ migrated: v.number() }),
  handler: async (ctx) => {
    let migrated = 0;

    // Find versions with inline content
    const versions = await ctx.db.query("artifactVersions").collect();

    for (const version of versions) {
      if (version.htmlContent) {
        // Store HTML in _storage
        const storageId = await storeTextContent(ctx, version.htmlContent);

        // Create artifactFiles entry
        await ctx.db.insert("artifactFiles", {
          versionId: version._id,
          filePath: "index.html",
          storageId,
          mimeType: "text/html",
          fileSize: new Blob([version.htmlContent]).size,
          isDeleted: false,
          deletedAt: undefined,
        });

        // Clear inline content
        await ctx.db.patch(version._id, {
          htmlContent: undefined,
          entryPoint: "index.html",
        });

        migrated++;
      }

      // Similar for markdownContent...
    }

    return { migrated };
  },
});
```

### Phase 3: Remove Inline Fields

After migration complete and verified:

```typescript
// Final schema (no inline content fields)
artifactVersions: defineTable({
  artifactId: v.id("artifacts"),
  versionNumber: v.number(),
  fileType: v.string(),              // Extensible
  entryPoint: v.optional(v.string()),
  fileSize: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),
})
```

## Consequences

### Positive

- **One code path for serving** - All content retrieved via `artifactFiles` -> `_storage`
- **Extensible file types** - Add `.txt`, `.csv`, `.pdf` without schema changes
- **Consistent metadata** - All files have `mimeType`, `fileSize`, `filePath`
- **Smaller version documents** - No inline content bloating queries
- **Simpler mental model** - "Everything is a file in storage"
- **Better caching potential** - Storage IDs enable CDN caching (future)
- **Unified permissions** - File-level access control applies to all types

### Negative

- **Extra storage lookup for simple HTML** - One additional query + storage fetch
  - **Mitigation:** Convex storage is fast (<10ms), negligible impact
  - **Mitigation:** Can batch with version query if needed

- **Database no longer enforces file type validity** - `v.string()` accepts anything
  - **Mitigation:** Application-level validation with clear error messages
  - **Mitigation:** TypeScript types catch invalid types at compile time

- **Migration required** - Existing inline content must be moved
  - **Mitigation:** Phased approach with backward compatibility
  - **Mitigation:** Can run during low-traffic period

- **More storage operations** - Every file write goes through `_storage`
  - **Mitigation:** Already doing this for ZIP files, proven pattern
  - **Mitigation:** Convex storage is designed for this use case

### Neutral

- Storage costs unchanged (content is same size regardless of location)
- HTTP proxy pattern unchanged (ADR 0002 still applies)
- Soft delete pattern unchanged (ADR 0011 still applies)

## Relationship to Existing ADRs

### ADR 0002: HTML Artifact Storage Strategy

**Still applies:**
- HTTP proxy with per-request permission checks
- Convex storage for MVP, R2 migration path
- File size limits and restrictions

**Superseded by this ADR:**
- "Simple HTML -> Store in Convex database (as text)"
- Now: ALL content goes to `artifactFiles` -> `_storage`

### ADR 0009: Artifact File Storage Structure

**Still applies:**
- Flat `artifactFiles` table pattern
- Compound index `by_version_path` for O(1) lookups
- Soft deletion cascades

**Extended by this ADR:**
- Originally designed for ZIP extraction only
- Now: Handles ALL file types (HTML, Markdown, future types)
- Single-file artifacts = 1 row in `artifactFiles`

## Extensibility Examples

### Adding Text File Support

```typescript
// 1. Add to supported types (no schema change)
export const SUPPORTED_FILE_TYPES = ["html", "markdown", "zip", "txt"] as const;

// 2. Update upload to accept .txt
const ALLOWED_EXTENSIONS = {
  html: [".html", ".htm"],
  markdown: [".md", ".markdown"],
  txt: [".txt"],
  zip: [".zip"],
};
```

### Adding CSV Support

```typescript
// Same pattern - just configuration
export const SUPPORTED_FILE_TYPES = ["html", "markdown", "zip", "txt", "csv"] as const;

const ALLOWED_EXTENSIONS = {
  // ...existing
  csv: [".csv"],
};

const MIME_TYPES = {
  // ...existing
  csv: "text/csv",
};
```

### Adding PDF Support (Future)

```typescript
// Binary files work the same way
export const SUPPORTED_FILE_TYPES = ["html", "markdown", "zip", "txt", "csv", "pdf"] as const;

// Viewer logic changes, but storage is identical
```

## References

- [ADR 0002: HTML Artifact Storage](./0002-html-artifact-storage.md) - HTTP proxy pattern
- [ADR 0009: Artifact File Storage Structure](./0009-artifact-file-storage-structure.md) - `artifactFiles` table design
- [ADR 0011: Soft Delete Strategy](./0011-soft-delete-strategy.md) - Deletion pattern
- [Convex File Storage](https://docs.convex.dev/file-storage) - Storage backend
- [Convex Rules](../convex-rules.md) - Query and mutation patterns
