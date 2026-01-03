# Schema Changes Summary - Task 00018

**Last Updated:** 2025-12-31

This document provides a quick reference for all schema changes needed for the unified storage model.

---

## Overview

**Goal:** Unified file storage where ALL file types (HTML, Markdown, future types) use the same storage pattern:
- Content stored in Convex `_storage` (blobs)
- File metadata in `artifactFiles` table
- No type-specific inline content fields

---

## Changes by Table

### 1. `artifacts` Table

**ADD:**
- `deletedBy: v.optional(v.id("users"))` - Track who soft-deleted the artifact

**KEEP (No Changes):**
- `creatorId: v.id("users")` - Already tracks who created the artifact
- All other existing fields

**Updated Schema:**
```typescript
artifacts: defineTable({
  title: v.string(),
  description: v.optional(v.string()),
  creatorId: v.id("users"),          // Who created artifact
  shareToken: v.string(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),  // NEW: Who deleted artifact
  createdAt: v.number(),
})
  // ... existing indexes unchanged
```

---

### 2. `artifactVersions` Table

**REMOVE:**
- `htmlContent: v.optional(v.string())` - ❌ Delete this field
- `markdownContent: v.optional(v.string())` - ❌ Delete this field

**CHANGE:**
- `fileType` - From `v.union(v.literal("zip"), v.literal("html"), v.literal("markdown"))`
  → To `v.string()` (application-level validation for extensibility)
- `entryPoint` - From `v.optional(v.string())`
  → To `v.string()` (required, always points to main file)

**ADD:**
- `createdBy: v.id("users")` - Track who created this version
- `versionName: v.optional(v.string())` - Optional version label (e.g., "Draft 1", "Final")
- `deletedBy: v.optional(v.id("users"))` - Track who soft-deleted this version

**Updated Schema:**
```typescript
artifactVersions: defineTable({
  artifactId: v.id("artifacts"),
  versionNumber: v.number(),

  // AUTHORSHIP & METADATA
  createdBy: v.id("users"),               // NEW: Who created this version
  versionName: v.optional(v.string()),    // NEW: Version label/name

  // FILE TYPE & LOCATION
  fileType: v.string(),                   // CHANGED: Extensible string
  entryPoint: v.string(),                 // CHANGED: Required (was optional)
  fileSize: v.number(),

  // SOFT DELETE
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),   // NEW: Who deleted version

  // TIMESTAMPS
  createdAt: v.number(),

  // REMOVED FIELDS:
  // htmlContent: REMOVED - use artifactFiles
  // markdownContent: REMOVED - use artifactFiles
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_active", ["artifactId", "isDeleted"])
  .index("by_artifact_version", ["artifactId", "versionNumber"])
  .index("by_created_by", ["createdBy"])  // NEW: List versions by creator
```

---

### 3. `artifactFiles` Table

**ADD:**
- `deletedBy: v.optional(v.id("users"))` - Track who soft-deleted this file

**KEEP (No Changes to existing fields):**
- All existing fields remain

**Note:** This table already has the correct structure for unified storage.
- Single-file artifacts: ONE row per version (the entry point file)
- Multi-file artifacts: MULTIPLE rows per version (all extracted files)

**Updated Schema:**
```typescript
artifactFiles: defineTable({
  versionId: v.id("artifactVersions"),
  filePath: v.string(),
  storageId: v.id("_storage"),
  mimeType: v.string(),
  fileSize: v.number(),

  // SOFT DELETE
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),  // NEW: Who deleted file
})
  .index("by_version", ["versionId"])
  .index("by_version_path", ["versionId", "filePath"])
  .index("by_version_active", ["versionId", "isDeleted"])
```

---

## Audit Trail Pattern

**Consistent across all tables:**
- `createdBy` / `creatorId` → Who created the record
- `createdAt` → When it was created
- `deletedBy` → Who soft-deleted it
- `deletedAt` → When it was deleted
- `isDeleted` → Whether it's deleted

**Why this matters:**
- Enables full audit trail for compliance
- Supports future collaboration features
- Attribution for all modifications
- Required for multi-user workflows

---

## Migration Requirements

### Phase 1: Schema Migration (Backward Compatible)

**Step 1: Add new optional fields**
```typescript
// Add as optional first
createdBy: v.optional(v.id("users")),
versionName: v.optional(v.string()),
deletedBy: v.optional(v.id("users")),
entryPoint: v.optional(v.string()),  // Keep optional temporarily
```

**Step 2: Backfill existing data**
```typescript
// For each existing version:
// 1. Get parent artifact
// 2. Set createdBy = artifact.creatorId
// 3. Convert inline content (htmlContent/markdownContent) to blob
// 4. Create artifactFiles row with storageId
// 5. Set entryPoint to file path (e.g., "index.html", "README.md")
```

**Step 3: Make fields required**
```typescript
// Once all data backfilled:
createdBy: v.id("users"),        // Remove optional
entryPoint: v.string(),          // Remove optional
```

**Step 4: Remove deprecated fields**
```typescript
// Delete from schema:
// htmlContent: v.optional(v.string()),     // ❌ REMOVE
// markdownContent: v.optional(v.string()), // ❌ REMOVE
```

### Phase 2: Application Code Migration

**Upload Mutations:**
- Update `artifacts.create` to store content as blob + create `artifactFiles` row
- Update `artifacts.addVersion` to store content as blob + create `artifactFiles` row
- Set `createdBy` field from current user ID
- Set `entryPoint` to appropriate file path

**Retrieval Queries:**
- Update queries to read from `artifactFiles` instead of inline fields
- Fetch blob URL using `ctx.storage.getUrl(storageId)`
- Handle both old format (during migration) and new format

---

## Storage Pattern Examples

### HTML Artifact (Single File)

**Before (Current - WRONG):**
```typescript
{
  _id: "jh77x23...",
  artifactId: "kg45a12...",
  versionNumber: 1,
  fileType: "html",
  htmlContent: "<html>...</html>",  // ❌ Inline storage
  fileSize: 45230,
}
```

**After (End State - CORRECT):**
```typescript
// artifactVersions:
{
  _id: "jh77x23...",
  artifactId: "kg45a12...",
  versionNumber: 1,
  createdBy: "u789abc...",
  versionName: undefined,
  fileType: "html",
  entryPoint: "index.html",
  fileSize: 45230,
  isDeleted: false,
  createdAt: 1735686400000,
}

// artifactFiles:
{
  _id: "af23x98...",
  versionId: "jh77x23...",
  filePath: "index.html",
  storageId: "_storage:abc123...",  // ✅ Blob in _storage
  mimeType: "text/html",
  fileSize: 45230,
  isDeleted: false,
}
```

### Markdown Artifact (Single File)

**Before (Current - WRONG):**
```typescript
{
  _id: "mk55y67...",
  artifactId: "kg45a12...",
  versionNumber: 1,
  fileType: "markdown",
  markdownContent: "# Hello\n...",  // ❌ Inline storage
  fileSize: 8192,
}
```

**After (End State - CORRECT):**
```typescript
// artifactVersions:
{
  _id: "mk55y67...",
  artifactId: "kg45a12...",
  versionNumber: 1,
  createdBy: "u789abc...",
  versionName: "Initial Draft",
  fileType: "markdown",
  entryPoint: "README.md",
  fileSize: 8192,
  isDeleted: false,
  createdAt: 1735686400000,
}

// artifactFiles:
{
  _id: "af88z12...",
  versionId: "mk55y67...",
  filePath: "README.md",
  storageId: "_storage:def456...",  // ✅ Blob in _storage
  mimeType: "text/markdown",
  fileSize: 8192,
  isDeleted: false,
}
```

### Multi-File ZIP (For Comparison)

**Current (Already correct):**
```typescript
// artifactVersions:
{
  _id: "pq12r34...",
  artifactId: "kg45a12...",
  versionNumber: 1,
  fileType: "zip",
  entryPoint: "index.html",  // ✅ Points to main file
  fileSize: 125000,
}

// artifactFiles (multiple rows):
{
  versionId: "pq12r34...",
  filePath: "index.html",
  storageId: "_storage:ghi789...",
  mimeType: "text/html",
  fileSize: 45230,
},
{
  versionId: "pq12r34...",
  filePath: "assets/style.css",
  storageId: "_storage:jkl012...",
  mimeType: "text/css",
  fileSize: 12800,
},
// ... more files
```

**After adding audit trails:**
```typescript
// artifactVersions:
{
  _id: "pq12r34...",
  artifactId: "kg45a12...",
  versionNumber: 1,
  createdBy: "u789abc...",        // NEW
  versionName: "Beta Release",    // NEW
  fileType: "zip",
  entryPoint: "index.html",
  fileSize: 125000,
  isDeleted: false,
  deletedBy: undefined,           // NEW
  deletedAt: undefined,
  createdAt: 1735686400000,
}

// artifactFiles (multiple rows):
{
  versionId: "pq12r34...",
  filePath: "index.html",
  storageId: "_storage:ghi789...",
  mimeType: "text/html",
  fileSize: 45230,
  isDeleted: false,
  deletedBy: undefined,           // NEW
  deletedAt: undefined,
},
// ... more files with same deletedBy field
```

---

## Validation Rules

### Application-Level fileType Validation

Since `fileType` is now `v.string()` (not union), add validation in mutation handlers:

```typescript
const ALLOWED_FILE_TYPES = ["html", "markdown", "zip"] as const;
type FileType = typeof ALLOWED_FILE_TYPES[number];

function validateFileType(fileType: string): fileType is FileType {
  return ALLOWED_FILE_TYPES.includes(fileType as FileType);
}

// In mutation:
if (!validateFileType(args.fileType)) {
  throw new Error(`Invalid fileType: ${args.fileType}. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}`);
}
```

**Why not in schema?**
- Makes adding new types trivial (just update the array)
- Avoids schema migrations for new file types
- Maintains flexibility for experimentation

---

## Benefits of Unified Storage

**Consistency:**
- ✅ Same code path for all file types
- ✅ Same retrieval logic
- ✅ Same permission checks

**Extensibility:**
- ✅ Add PDF, JSON, TXT, CSV without schema changes
- ✅ Just update validation array + upload handler

**Simplicity:**
- ✅ Single-file = Multi-file with 1 file
- ✅ No type-specific branching logic
- ✅ Easier to reason about

**Forward Compatibility:**
- ✅ Naturally extends to multi-file artifacts (Task 19+)
- ✅ Can add assets to HTML/Markdown later (CSS, images)
- ✅ File tree navigation works for all types

---

## Next Steps

1. **Phase 1: Upload** (Current Focus)
   - Implement schema changes (backward compatible)
   - Update upload mutations
   - Create migration script
   - Test single-file uploads with new storage

2. **Phase 2: Retrieval + Permissions** (After Phase 1)
   - Update retrieval queries
   - Add permission checks
   - Update viewer UI
   - End-to-end testing

---

**Reference:**
- Full design: `END-STATE-DESIGN.md`
- Task overview: `README.md`
- Current schema: `/app/convex/schema.ts`
