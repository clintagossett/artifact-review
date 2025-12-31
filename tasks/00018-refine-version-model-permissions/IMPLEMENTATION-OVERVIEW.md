# Implementation Overview: Artifact Version, Upload, Storage & Retrieval Architecture

**Task:** 00018 - Refine Document Version Model and Permissioning
**Date:** 2025-12-31
**Status:** Analysis Complete

---

## Table of Contents

1. [Data Model Architecture](#1-data-model-architecture)
2. [Upload Flow](#2-upload-flow)
3. [Storage Architecture](#3-storage-architecture)
4. [Retrieval Patterns](#4-retrieval-patterns)
5. [Current Gaps & Issues](#5-current-gaps--issues)
6. [Recommendations](#6-recommendations)

---

## 1. Data Model Architecture

### 1.1 Entity Hierarchy

```
                                  ┌──────────────┐
                                  │    users     │
                                  │   (Convex    │
                                  │    Auth)     │
                                  └──────┬───────┘
                                         │ creatorId
                                         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              artifacts                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ _id, title, description, creatorId, shareToken, isDeleted,          │   │
│  │ deletedAt, createdAt, updatedAt                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │ artifactId (1:N)
                     ┌─────────────────┴─────────────────┐
                     │                                   │
                     ▼                                   ▼
    ┌────────────────────────────────┐    ┌────────────────────────────────┐
    │      artifactVersions          │    │     artifactReviewers          │
    │ ┌────────────────────────────┐ │    │ ┌────────────────────────────┐ │
    │ │ _id, artifactId,           │ │    │ │ _id, artifactId, email,    │ │
    │ │ versionNumber, fileType,   │ │    │ │ userId, invitedBy,         │ │
    │ │ htmlContent?, markdownContent? │ │    │ │ invitedAt, status,        │ │
    │ │ entryPoint?, fileSize,     │ │    │ │ isDeleted, deletedAt       │ │
    │ │ isDeleted, deletedAt,      │ │    │ └────────────────────────────┘ │
    │ │ createdAt                  │ │    └────────────────────────────────┘
    │ │ ❌ Missing: authorId       │ │
    │ │ ❌ Missing: description    │ │
    │ └────────────────────────────┘ │
    └──────────────────┬─────────────┘
                       │ versionId (1:N, ZIP only)
                       ▼
    ┌────────────────────────────────────┐
    │         artifactFiles              │
    │ ┌────────────────────────────────┐ │
    │ │ _id, versionId, filePath,      │ │
    │ │ storageId, mimeType, fileSize, │ │
    │ │ isDeleted, deletedAt           │ │
    │ └────────────────────────────────┘ │
    └────────────────────────────────────┘
```

### 1.2 Schema Details

#### artifacts Table

**Purpose:** Container for versioned artifact content with sharing capabilities.

| Field | Type | Validator | Purpose |
|-------|------|-----------|---------|
| _id | Id | `v.id("artifacts")` | Auto-generated PK |
| _creationTime | number | `v.number()` | Auto-generated timestamp |
| title | string | `v.string()` | Display name |
| description | string? | `v.optional(v.string())` | User notes |
| creatorId | Id<"users"> | `v.id("users")` | Owner reference |
| shareToken | string | `v.string()` | URL-safe nanoid(8) |
| isDeleted | boolean | `v.boolean()` | Soft delete flag |
| deletedAt | number? | `v.optional(v.number())` | Deletion timestamp |
| createdAt | number | `v.number()` | Creation timestamp |
| updatedAt | number | `v.number()` | Last modification |

**Indexes:**
| Name | Fields | Purpose |
|------|--------|---------|
| by_creator | ["creatorId"] | List all user artifacts |
| by_creator_active | ["creatorId", "isDeleted"] | Dashboard listing (primary) |
| by_share_token | ["shareToken"] | Public access lookup |

---

#### artifactVersions Table

**Purpose:** Individual versions of an artifact, each representing an upload iteration.

| Field | Type | Validator | Purpose |
|-------|------|-----------|---------|
| _id | Id | `v.id("artifactVersions")` | Auto-generated PK |
| _creationTime | number | `v.number()` | Auto-generated timestamp |
| artifactId | Id<"artifacts"> | `v.id("artifacts")` | Parent artifact FK |
| versionNumber | number | `v.number()` | Sequential (1, 2, 3...) |
| fileType | union | `v.union(v.literal("zip"), v.literal("html"), v.literal("markdown"))` | Content type |
| htmlContent | string? | `v.optional(v.string())` | Inline HTML content |
| markdownContent | string? | `v.optional(v.string())` | Inline Markdown content |
| entryPoint | string? | `v.optional(v.string())` | ZIP entry file path |
| fileSize | number | `v.number()` | Content size in bytes |
| isDeleted | boolean | `v.boolean()` | Soft delete flag |
| deletedAt | number? | `v.optional(v.number())` | Deletion timestamp |
| createdAt | number | `v.number()` | Creation timestamp |

**Missing Fields (Task 18):**
| Field | Proposed Type | Purpose |
|-------|---------------|---------|
| authorId | `v.id("users")` | Who created this version |
| description | `v.optional(v.string())` | Version notes/changelog |

**Indexes:**
| Name | Fields | Purpose |
|------|--------|---------|
| by_artifact | ["artifactId"] | All versions (including deleted) |
| by_artifact_active | ["artifactId", "isDeleted"] | Active versions (version switcher) |
| by_artifact_version | ["artifactId", "versionNumber"] | Specific version lookup |

**Proposed New Index:**
| Name | Fields | Purpose |
|------|--------|---------|
| by_author | ["authorId"] | Versions by user |

---

#### artifactFiles Table

**Purpose:** Individual files extracted from ZIP artifacts.

| Field | Type | Validator | Purpose |
|-------|------|-----------|---------|
| _id | Id | `v.id("artifactFiles")` | Auto-generated PK |
| _creationTime | number | `v.number()` | Auto-generated timestamp |
| versionId | Id<"artifactVersions"> | `v.id("artifactVersions")` | Parent version FK |
| filePath | string | `v.string()` | Relative path ("assets/logo.png") |
| storageId | Id<"_storage"> | `v.id("_storage")` | Convex File Storage ref |
| mimeType | string | `v.string()` | Content-Type for serving |
| fileSize | number | `v.number()` | File size in bytes |
| isDeleted | boolean | `v.boolean()` | Soft delete flag |
| deletedAt | number? | `v.optional(v.number())` | Deletion timestamp |

**Indexes:**
| Name | Fields | Purpose |
|------|--------|---------|
| by_version | ["versionId"] | All files for version |
| by_version_path | ["versionId", "filePath"] | O(1) path lookup (HTTP serving) |
| by_version_active | ["versionId", "isDeleted"] | Active files for UI |

---

### 1.3 File Type Storage Patterns

| File Type | Content Storage | Files Table | Serving Pattern |
|-----------|-----------------|-------------|-----------------|
| **html** | `htmlContent` field (inline) | Not used | Direct from field |
| **markdown** | `markdownContent` field (inline) | Not used | Render then serve |
| **zip** | `artifactFiles` table | 1-500 files | HTTP proxy from storage |

---

### 1.4 Soft Delete Patterns

All tables follow ADR 0011 soft delete strategy:

```
isDeleted: boolean    // false = active, true = deleted
deletedAt?: number    // Unix timestamp when deleted
```

**Cascade Behavior:**

```
artifacts.softDelete
    ├── artifact.isDeleted = true
    └── FOR EACH version:
            ├── version.isDeleted = true
            └── FOR EACH file (if ZIP):
                    └── file.isDeleted = true

artifactVersions.softDeleteVersion
    ├── version.isDeleted = true
    └── FOR EACH file:
            └── file.isDeleted = true
```

**Protection:** Cannot delete last active version:
```typescript
if (activeVersions.length === 1 && activeVersions[0]._id === args.versionId) {
  throw new Error("Cannot delete the last active version");
}
```

---

## 2. Upload Flow

### 2.1 Upload Flow Diagram

```
                         Frontend (React)
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │  HTML   │         │Markdown │         │   ZIP   │
    │  File   │         │  File   │         │  File   │
    └────┬────┘         └────┬────┘         └────┬────┘
         │                    │                    │
    FileReader            FileReader           (Binary)
    .readAsText()        .readAsText()            │
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│              useArtifactUpload Hook                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │ - Detects file type from extension               │   │
│  │ - Reads text content (HTML/MD) or keeps binary   │   │
│  │ - Calls appropriate mutation                     │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     ┌────▼────┐      ┌───▼────┐      ┌────▼────┐
     │artifacts│      │artifacts│      │zipUpload│
     │.create  │      │.create  │      │.create* │
     │(HTML)   │      │(Markdown)      │(ZIP)    │
     └────┬────┘      └───┬────┘      └────┬────┘
          │               │                 │
          └───────────────┼─────────────────┘
                          ▼
              ┌────────────────────┐
              │ Create artifact +  │
              │ version 1 record   │
              └─────────┬──────────┘
                        │
        ┌───────────────┴───────────────┐
        │ (ZIP only)                    │
        ▼                               ▼
┌───────────────────┐           ┌──────────────┐
│ Generate upload   │           │ Return IDs   │
│ URL, upload file, │           │ to frontend  │
│ trigger processing│           │              │
└─────────┬─────────┘           └──────────────┘
          │
          ▼
┌───────────────────────────────────────────────────────┐
│              zipProcessor.processZipFile              │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 1. Fetch ZIP from storage                       │  │
│  │ 2. Extract with JSZip                           │  │
│  │ 3. Detect entry point (index.html, main.html)   │  │
│  │ 4. For each file:                               │  │
│  │    - Store in Convex File Storage               │  │
│  │    - Create artifactFiles record                │  │
│  │ 5. Update version with entryPoint               │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### 2.2 HTML/Markdown Upload Flow

**Frontend:**
```typescript
// useArtifactUpload.ts
const content = await readFileAsText(file);  // Read entire file as string
await createArtifact({
  title,
  description,
  fileType: "html",  // or "markdown"
  htmlContent: content,  // or markdownContent
  fileSize: file.size,
});
```

**Backend (artifacts.create):**
```typescript
// 1. Auth check
const userId = await getAuthUserId(ctx);
if (!userId) throw new Error("Not authenticated");

// 2. Create artifact
const artifactId = await ctx.db.insert("artifacts", {
  title, description, creatorId: userId,
  shareToken: nanoid(8),
  isDeleted: false, createdAt: now, updatedAt: now,
});

// 3. Create version 1 with inline content
const versionId = await ctx.db.insert("artifactVersions", {
  artifactId, versionNumber: 1, fileType,
  htmlContent,  // Stored inline in DB
  fileSize, isDeleted: false, createdAt: now,
});
```

**Inline Storage Rationale:**
- HTML/Markdown files are typically small (1-100KB)
- No need for separate file storage
- Simpler retrieval (single query)
- Real-time updates possible

---

### 2.3 ZIP Upload Flow

**Step 1: Create Artifact + Get Upload URL**
```typescript
// zipUpload.createArtifactWithZip
const artifactId = await ctx.db.insert("artifacts", {...});
const versionId = await ctx.db.insert("artifactVersions", {
  fileType: "zip",
  // htmlContent/markdownContent NOT set
  entryPoint: undefined,  // Set after processing
});
const uploadUrl = await ctx.storage.generateUploadUrl();
return { uploadUrl, artifactId, versionId, shareToken };
```

**Step 2: Client Uploads ZIP to Storage**
```typescript
// Frontend uploads directly to Convex Storage URL
const response = await fetch(uploadUrl, {
  method: "POST",
  body: zipFile,
  headers: { "Content-Type": "application/zip" },
});
const { storageId } = await response.json();
```

**Step 3: Trigger ZIP Processing**
```typescript
// zipUpload.triggerZipProcessing (action)
await ctx.runAction(internal.zipProcessor.processZipFile, {
  versionId, storageId,
});
```

**Step 4: Extract and Store Files**
```typescript
// zipProcessor.processZipFile (Node.js action)
const zipUrl = await ctx.storage.getUrl(args.storageId);
const zipBuffer = await fetch(zipUrl).then(r => r.arrayBuffer());
const zip = await new JSZip().loadAsync(zipBuffer);

for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
  if (zipEntry.dir) continue;

  const content = await zipEntry.async("arraybuffer");
  const mimeType = getMimeType(relativePath);

  // Store file in Convex Storage
  await ctx.runAction(internal.zipProcessorMutations.storeExtractedFile, {
    versionId, filePath: relativePath,
    content: Array.from(new Uint8Array(content)),
    mimeType,
  });
}

// Update version with entry point
await ctx.runMutation(internal.zipProcessorMutations.markProcessingComplete, {
  versionId, entryPoint,
});
```

---

### 2.4 Version Creation (Adding New Versions)

```typescript
// artifacts.addVersion
// 1. Auth + ownership check
const userId = await getAuthUserId(ctx);
const artifact = await ctx.db.get(args.artifactId);
if (artifact.creatorId !== userId) {
  throw new Error("Not authorized");  // OWNER ONLY
}

// 2. Calculate next version number
const versions = await ctx.db.query("artifactVersions")
  .withIndex("by_artifact", q => q.eq("artifactId", args.artifactId))
  .collect();
const maxVersionNumber = Math.max(...versions.map(v => v.versionNumber), 0);
const newVersionNumber = maxVersionNumber + 1;

// 3. Create version record
const versionId = await ctx.db.insert("artifactVersions", {
  artifactId, versionNumber: newVersionNumber,
  fileType, htmlContent/markdownContent, entryPoint,
  fileSize, isDeleted: false, createdAt: now,
});

// 4. Update artifact timestamp
await ctx.db.patch(args.artifactId, { updatedAt: now });
```

**Key Observation:**
- New versions can ONLY be created by artifact owner
- **No authorId field** - assumes version author = artifact owner
- **Gap:** Cannot track if someone else created a version (future feature)

---

## 3. Storage Architecture

### 3.1 Storage Locations

```
┌──────────────────────────────────────────────────────────────────┐
│                     CONVEX DATABASE                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ artifactVersions                                           │  │
│  │   htmlContent: "<!DOCTYPE html>..."   (inline)             │  │
│  │   markdownContent: "# Title..."       (inline)             │  │
│  │   entryPoint: "index.html"            (path reference)     │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ artifactFiles (metadata)                                   │  │
│  │   filePath: "assets/logo.png"                              │  │
│  │   storageId: Id<"_storage">  ─────────────────────┐        │  │
│  │   mimeType: "image/png"                           │        │  │
│  └───────────────────────────────────────────────────┼────────┘  │
└──────────────────────────────────────────────────────┼───────────┘
                                                       │
                                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   CONVEX FILE STORAGE                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ _storage                                                   │  │
│  │   Files stored as blobs with sha256 hash                   │  │
│  │   Accessed via ctx.storage.getUrl(storageId)               │  │
│  │                                                            │  │
│  │   Limits (Professional Plan):                              │  │
│  │     - 100GB total storage                                  │  │
│  │     - 50GB bandwidth/month                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Storage by Content Type

| Content Type | Storage Location | Max Size | Notes |
|--------------|------------------|----------|-------|
| HTML (single file) | `artifactVersions.htmlContent` | 5MB | Inline in DB |
| Markdown (single file) | `artifactVersions.markdownContent` | 5MB | Inline in DB |
| ZIP (original) | Not stored | N/A | Deleted after extraction |
| ZIP extracted files | `_storage` via `artifactFiles.storageId` | 20MB each | Up to 500 files |

### 3.3 File Limits (per ADR 0002)

| Limit Type | Value |
|------------|-------|
| Total ZIP size | 100MB |
| Total extracted size | 200MB |
| Maximum files per ZIP | 500 |
| Individual file size | 20MB |
| HTML/Markdown file | 5MB |

### 3.4 MIME Type Detection

```typescript
// convex/lib/mimeTypes.ts
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  // ... etc
};

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}
```

---

## 4. Retrieval Patterns

### 4.1 Retrieval Flow Diagram

```
                         Frontend Request
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │ Version │         │ Version │         │ File    │
    │   by    │         │   by    │         │ Request │
    │   ID    │         │ Number  │         │ (ZIP)   │
    └────┬────┘         └────┬────┘         └────┬────┘
         │                    │                    │
    getVersion           getVersionByNumber       │
    (query)              (query)                  │
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                 Query Resolution                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Version by ID:                                   │   │
│  │   ctx.db.get(versionId)                          │   │
│  │                                                  │   │
│  │ Version by Number:                               │   │
│  │   ctx.db.query("artifactVersions")               │   │
│  │     .withIndex("by_artifact_version",            │   │
│  │       q => q.eq("artifactId", id)                │   │
│  │              .eq("versionNumber", num))          │   │
│  │     .first()                                     │   │
│  │                                                  │   │
│  │ File by Path (HTTP):                             │   │
│  │   ctx.db.query("artifactFiles")                  │   │
│  │     .withIndex("by_version_path",                │   │
│  │       q => q.eq("versionId", vId)                │   │
│  │              .eq("filePath", path))              │   │
│  │     .unique()                                    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │   Content Serving     │
               │  (based on fileType)  │
               └───────────┬───────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     ┌────▼────┐      ┌───▼────┐      ┌────▼────┐
     │  HTML   │      │Markdown│      │  ZIP    │
     │ Inline  │      │ Inline │      │  File   │
     │ Content │      │Content │      │ Storage │
     └────┬────┘      └───┬────┘      └────┬────┘
          │               │                 │
   Return as-is    Render to HTML    Fetch from storage
          │               │                 │
          └───────────────┼─────────────────┘
                          ▼
                   Return Response
```

### 4.2 Version Retrieval Queries

**Get Version by ID:**
```typescript
// artifacts.getVersion
export const getVersion = query({
  args: { versionId: v.id("artifactVersions") },
  returns: v.union(v.object({...}), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.versionId);  // Direct lookup
    // ❌ NO AUTH CHECK - anyone with ID can read!
  },
});
```

**Get Version by Number:**
```typescript
// artifacts.getVersionByNumber
export const getVersionByNumber = query({
  args: {
    artifactId: v.id("artifacts"),
    versionNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.query("artifactVersions")
      .withIndex("by_artifact_version", q =>
        q.eq("artifactId", args.artifactId)
         .eq("versionNumber", args.versionNumber)
      )
      .first();

    if (!version || version.isDeleted) return null;
    return version;
    // ❌ NO AUTH CHECK
  },
});
```

**Get Latest Version:**
```typescript
// artifacts.getLatestVersion
export const getLatestVersion = query({
  args: { artifactId: v.id("artifacts") },
  handler: async (ctx, args) => {
    const versions = await ctx.db.query("artifactVersions")
      .withIndex("by_artifact_active", q =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .order("desc")
      .collect();  // Gets all, then takes first

    return versions[0] || null;
    // ❌ NO AUTH CHECK
    // Note: Could optimize with .take(1) but needs descending by versionNumber
  },
});
```

**List Versions:**
```typescript
// artifacts.getVersions
export const getVersions = query({
  args: { artifactId: v.id("artifacts") },
  handler: async (ctx, args) => {
    const versions = await ctx.db.query("artifactVersions")
      .withIndex("by_artifact_active", q =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .order("desc")
      .collect();

    // Project only needed fields for version switcher
    return versions.map(v => ({
      _id: v._id, versionNumber: v.versionNumber,
      fileType: v.fileType, fileSize: v.fileSize,
      createdAt: v.createdAt, /* ... */
    }));
    // ❌ NO AUTH CHECK
  },
});
```

### 4.3 HTTP File Serving (ZIP Artifacts)

**URL Pattern:** `GET /artifact/{shareToken}/v{version}/{filePath}`

**Flow:**
```typescript
// convex/http.ts
http.route({
  pathPrefix: "/artifact/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // 1. Parse URL
    const url = new URL(request.url);
    const [shareToken, versionStr, ...pathParts] = parseUrl(url.pathname);
    const versionNumber = parseInt(versionStr.replace("v", ""));
    const filePath = pathParts.join("/") || "index.html";

    // 2. Lookup artifact by share token (internal query)
    const artifact = await ctx.runQuery(
      internal.artifacts.getByShareTokenInternal,
      { shareToken }
    );
    if (!artifact) return new Response("Artifact not found", { status: 404 });

    // 3. Lookup version
    const version = await ctx.runQuery(
      internal.artifacts.getVersionByNumberInternal,
      { artifactId: artifact._id, versionNumber }
    );
    if (!version) return new Response("Version not found", { status: 404 });

    // 4. Handle by file type
    if (version.fileType === "html" && version.htmlContent) {
      return new Response(version.htmlContent, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    if (version.fileType === "zip") {
      // 5. Lookup file by path
      const file = await ctx.runQuery(internal.artifacts.getFileByPath, {
        versionId: version._id,
        filePath: decodeURIComponent(filePath),
      });
      if (!file) return new Response("File not found", { status: 404 });

      // 6. Fetch from storage
      const fileUrl = await ctx.storage.getUrl(file.storageId);
      const fileResponse = await fetch(fileUrl);
      const fileBuffer = await fileResponse.arrayBuffer();

      return new Response(fileBuffer, {
        headers: {
          "Content-Type": file.mimeType,
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }
  }),
});
```

**Index Usage:**
| Query | Index Used | Complexity |
|-------|------------|------------|
| Artifact by shareToken | `by_share_token` | O(1) |
| Version by artifact + number | `by_artifact_version` | O(1) |
| File by version + path | `by_version_path` | O(1) |

### 4.4 Caching Strategy

**Current Implementation:**
```typescript
headers: {
  "Cache-Control": "public, max-age=31536000",  // 1 year
  "Access-Control-Allow-Origin": "*",
}
```

**Rationale:**
- Versions are immutable (content never changes)
- Long cache = fewer storage fetches
- CORS enabled for iframe embedding

**Limitation:**
- No CDN caching (files are gated by permission proxy)
- Per ADR 0002: This is acceptable tradeoff for security

---

## 5. Current Gaps & Issues

### 5.1 Missing Version Authorship

**Problem:** No tracking of who created each version.

**Current Behavior:**
```typescript
// artifacts.create
await ctx.db.insert("artifactVersions", {
  artifactId,
  versionNumber: 1,
  // ❌ Missing: authorId
});
```

**Impact:**
- Cannot attribute versions to specific users
- Assumes artifact owner = version author (not always true)
- Blocks future features: reviewer-submitted versions, audit trails

**Solution (Task 18):**
```typescript
await ctx.db.insert("artifactVersions", {
  artifactId,
  versionNumber: 1,
  authorId: userId,  // ✅ Track who created
  description: args.description,  // ✅ Optional version notes
});
```

### 5.2 Inconsistent Permission Checks

**Problem:** Mutations have auth checks, queries do not.

| Operation | Auth Check | Gap |
|-----------|------------|-----|
| `artifacts.create` | YES (requires auth) | None |
| `artifacts.addVersion` | YES (owner check) | None |
| `artifacts.softDelete` | YES (owner check) | None |
| `artifacts.softDeleteVersion` | YES (owner check) | None |
| `artifacts.get` | NO | Anyone can read by ID |
| `artifacts.getVersion` | NO | Anyone can read by ID |
| `artifacts.getVersionByNumber` | NO | Anyone can read |
| `artifacts.getVersions` | NO | Anyone can list |
| `artifacts.getLatestVersion` | NO | Anyone can get latest |
| `artifacts.getFilesByVersion` | NO | Anyone can list files |

**Risk:** Anyone with a version ID can read version content (including inline HTML/Markdown).

**Mitigating Factor:**
- IDs are unguessable (Convex IDs are random)
- Public access is intentional via shareToken
- BUT: internal/private artifacts would leak

**Solution (Task 18):**
```typescript
// Add to all version queries:
async function checkArtifactAccess(
  ctx: QueryCtx,
  artifactId: Id<"artifacts">
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  const artifact = await ctx.db.get(artifactId);

  if (!artifact || artifact.isDeleted) return false;

  // Owner has access
  if (userId && artifact.creatorId === userId) return true;

  // Reviewer has access
  if (userId) {
    const reviewer = await ctx.db.query("artifactReviewers")
      .withIndex("by_artifact_active", q =>
        q.eq("artifactId", artifactId).eq("isDeleted", false)
      )
      .filter(q => q.eq(q.field("userId"), userId))
      .first();
    if (reviewer) return true;
  }

  // Public access via shareToken is OK
  // (these queries are typically called after shareToken lookup)
  return true;  // Or require explicit shareToken validation
}
```

### 5.3 Missing Version Metadata

**Problem:** No way to add notes/changelog to versions.

**Current Schema:**
```typescript
artifactVersions: defineTable({
  // ... existing fields
  // ❌ Missing: description field
})
```

**Impact:**
- Cannot explain what changed between versions
- No version history context
- Poor UX for collaboration

**Solution:**
```typescript
artifactVersions: defineTable({
  // ... existing fields
  description: v.optional(v.string()),  // "Fixed chart colors"
})
```

### 5.4 Filter vs withIndex Usage

**Problem:** One query uses `filter` which violates Convex rules.

**Location:** `sharing.getUserPermission`
```typescript
const reviewer = await ctx.db.query("artifactReviewers")
  .withIndex("by_artifact_active", q =>
    q.eq("artifactId", args.artifactId).eq("isDeleted", false)
  )
  .filter(q => q.eq(q.field("userId"), userId))  // ❌ filter usage
  .first();
```

**Same pattern in:** `commentPermissions.requireCommentPermission`
```typescript
const reviewers = await ctx.db.query("artifactReviewers")
  .withIndex("by_artifact_active", q =>
    q.eq("artifactId", artifact._id).eq("isDeleted", false)
  )
  .collect();
const isReviewer = reviewers.some(r => r.userId === userId);
```

**Impact:**
- Scans all reviewers for artifact (not O(1))
- Works but suboptimal for artifacts with many reviewers

**Solution:** Add index `by_artifact_user`:
```typescript
.index("by_artifact_user", ["artifactId", "userId"])
```

Then:
```typescript
const reviewer = await ctx.db.query("artifactReviewers")
  .withIndex("by_artifact_user", q =>
    q.eq("artifactId", artifactId).eq("userId", userId)
  )
  .filter(q => q.eq(q.field("isDeleted"), false))  // Still need filter for isDeleted
  .first();
```

### 5.5 HTTP Route Permission Checks

**Problem:** HTTP file serving has no authentication.

**Current Behavior:**
```typescript
http.route({
  pathPrefix: "/artifact/",
  handler: httpAction(async (ctx, request) => {
    // Uses shareToken for artifact lookup
    // No user authentication
    // Anyone with shareToken can access any version
  }),
});
```

**This is intentional:**
- Per ADR 0002: shareToken enables public access
- Files are "public" once you have the shareToken

**BUT:** No way to:
- Restrict specific versions
- Require authentication for private artifacts
- Implement viewer-only vs full access

**Future consideration:** Add optional auth token in header or query param.

### 5.6 Version Number Calculation Race Condition

**Problem:** Concurrent addVersion calls could create duplicate version numbers.

**Current Implementation:**
```typescript
// 1. Get all versions (not atomic with insert)
const versions = await ctx.db.query("artifactVersions")
  .withIndex("by_artifact")
  .collect();

// 2. Calculate max
const maxVersionNumber = Math.max(...versions.map(v => v.versionNumber), 0);

// 3. Insert with next number (could be duplicate!)
await ctx.db.insert("artifactVersions", {
  versionNumber: maxVersionNumber + 1,
});
```

**Impact:** If two users upload simultaneously, both could get version 2.

**Mitigation:**
- Currently owner-only, so race is unlikely
- Convex transactions are serializable, so this might not be an issue
- BUT: should add unique constraint or use atomic counter

**Solution Options:**
1. Rely on Convex transaction isolation (verify behavior)
2. Add `by_artifact_version` index with `.unique()` call to fail on duplicate
3. Use optimistic locking pattern

---

## 6. Recommendations

### 6.1 Schema Changes (Task 18)

**artifactVersions table:**

```typescript
artifactVersions: defineTable({
  // Existing fields
  artifactId: v.id("artifacts"),
  versionNumber: v.number(),
  fileType: v.union(v.literal("zip"), v.literal("html"), v.literal("markdown")),
  htmlContent: v.optional(v.string()),
  markdownContent: v.optional(v.string()),
  entryPoint: v.optional(v.string()),
  fileSize: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),

  // NEW FIELDS
  authorId: v.id("users"),  // Who created this version
  description: v.optional(v.string()),  // Version notes
})
  // Existing indexes
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_active", ["artifactId", "isDeleted"])
  .index("by_artifact_version", ["artifactId", "versionNumber"])
  // NEW INDEX
  .index("by_author", ["authorId"])
```

**artifactReviewers table (new index):**

```typescript
artifactReviewers: defineTable({
  // ... existing fields
})
  // ... existing indexes
  .index("by_artifact_user", ["artifactId", "userId"])  // NEW
```

### 6.2 Permission Model ADR

**Recommendation:** Write ADR documenting these decisions:

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Who creates versions? | Owner only | Keep simple, add can-edit later |
| Who views versions? | Owner, Reviewers, shareToken holders | Current behavior is correct |
| Who deletes versions? | Owner only | Current behavior is correct |
| Version states? | Not now | Defer draft/published to future |
| can-edit permission? | Not now | Add when needed |

### 6.3 Permission Check Implementation

**Create helper function:**

```typescript
// convex/lib/versionPermissions.ts

/**
 * Check if user can access an artifact's versions.
 * Returns true if:
 * 1. User is artifact owner
 * 2. User is an invited reviewer
 * 3. Artifact is accessed via shareToken (implicit - caller validates)
 */
export async function canAccessArtifact(
  ctx: QueryCtx,
  artifactId: Id<"artifacts">,
  options?: { requireAuth?: boolean }
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);

  // If auth required and not authenticated, deny
  if (options?.requireAuth && !userId) {
    return false;
  }

  const artifact = await ctx.db.get(artifactId);
  if (!artifact || artifact.isDeleted) {
    return false;
  }

  // Owner always has access
  if (userId && artifact.creatorId === userId) {
    return true;
  }

  // Check if invited reviewer
  if (userId) {
    const reviewer = await ctx.db.query("artifactReviewers")
      .withIndex("by_artifact_user", q =>
        q.eq("artifactId", artifactId).eq("userId", userId)
      )
      .filter(q => q.eq(q.field("isDeleted"), false))
      .first();

    if (reviewer) {
      return true;
    }
  }

  // For public access via shareToken, caller should have already
  // validated the shareToken. Return true to allow.
  return true;
}
```

**Apply to version queries:**

```typescript
export const getVersion = query({
  args: { versionId: v.id("artifactVersions") },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version || version.isDeleted) return null;

    // Permission check
    const hasAccess = await canAccessArtifact(ctx, version.artifactId);
    if (!hasAccess) return null;

    return version;
  },
});
```

### 6.4 Migration Strategy

**Phase 1: Make authorId Optional**
```typescript
authorId: v.optional(v.id("users")),
```

**Phase 2: Backfill Existing Versions**
```typescript
// Migration script
const versions = await ctx.db.query("artifactVersions").collect();
for (const version of versions) {
  if (!version.authorId) {
    const artifact = await ctx.db.get(version.artifactId);
    await ctx.db.patch(version._id, {
      authorId: artifact!.creatorId,
    });
  }
}
```

**Phase 3: Make authorId Required**
```typescript
authorId: v.id("users"),
```

### 6.5 Update Operations Checklist

| Operation | Change Needed |
|-----------|---------------|
| `artifacts.create` | Set `authorId: userId` on version |
| `artifacts.addVersion` | Set `authorId: userId` on version |
| `zipUpload.createArtifactWithZip` | Set `authorId: userId` on version |
| `artifacts.getVersion` | Add permission check |
| `artifacts.getVersionByNumber` | Add permission check |
| `artifacts.getVersions` | Add permission check |
| `artifacts.getLatestVersion` | Add permission check |
| `artifacts.getFilesByVersion` | Add permission check |
| `sharing.getUserPermission` | Replace filter with index |

### 6.6 Testing Strategy

**Test Categories:**

1. **Authorship Tests**
   - Version has authorId set on creation
   - authorId matches authenticated user
   - Backfill migration works correctly

2. **Permission Tests**
   - Owner can access all versions
   - Reviewer can access versions
   - Unauthenticated user denied (when required)
   - shareToken access works
   - Non-reviewer denied

3. **Edge Cases**
   - Deleted artifact versions inaccessible
   - Deleted version inaccessible
   - Removed reviewer loses access

---

## Summary

### Current State Assessment

| Area | Status | Notes |
|------|--------|-------|
| Data Model | Good | Well-structured hierarchy |
| Upload Flow | Good | Clean separation HTML/MD vs ZIP |
| Storage Architecture | Good | Per ADR 0002/0009 |
| Retrieval Performance | Good | O(1) lookups via indexes |
| **Version Authorship** | **GAP** | No authorId field |
| **Query Permissions** | **GAP** | No auth checks on reads |
| **Version Metadata** | **GAP** | No description field |
| Filter Usage | Minor | One query uses filter |

### Priority for Task 18

1. **HIGH:** Add authorId field to artifactVersions
2. **HIGH:** Add permission checks to all version queries
3. **MEDIUM:** Add description field to artifactVersions
4. **MEDIUM:** Write permission model ADR
5. **LOW:** Add by_artifact_user index to artifactReviewers
6. **LOW:** Address version number race condition

### Files to Modify

| File | Changes |
|------|---------|
| `convex/schema.ts` | Add authorId, description fields; add indexes |
| `convex/artifacts.ts` | Set authorId; add permission checks |
| `convex/zipUpload.ts` | Set authorId on version creation |
| `convex/lib/versionPermissions.ts` (NEW) | Permission helper functions |
| `convex/sharing.ts` | Use new index for reviewer lookup |

---

**Document Prepared For:** Task 18 Implementation
**Next Step:** Create ADR 0013 for Version Permission Model
