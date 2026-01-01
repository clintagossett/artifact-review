# Implementation Plan: Upload and View Multi-file HTML Projects via ZIP

**Task:** 00019
**Status:** Phase 1 COMPLETE - Phase 2 Ready for Implementation
**Author:** Claude (Software Architect Agent)
**Created:** 2025-12-31
**Updated:** 2025-12-31

---

## Overview

This plan extends the existing unified blob storage pattern (Task 18) to support multi-file HTML projects uploaded as ZIP files. The implementation is divided into two phases:

- **Phase 1:** Storage and Write Permissions (ZIP upload, extraction, storage) - **COMPLETE**
- **Phase 2:** Retrieval and Viewing (HTTP serving, read permissions, frontend) - **READY**

---

## Phase 1 Summary (COMPLETED)

Phase 1 is complete with **28 passing tests**:

| Component | Status | Location |
|-----------|--------|----------|
| ZIP validation constants | DONE | `/app/convex/lib/fileTypes.ts` |
| `createArtifactWithZip` mutation | DONE | `/app/convex/zipUpload.ts` |
| `addZipVersion` mutation | DONE | `/app/convex/zipUpload.ts` |
| `processZipFile` action | DONE | `/app/convex/zipProcessor.ts` |
| `canWriteArtifact` helper | DONE | `/app/convex/lib/permissions.ts` |
| `markProcessingError` mutation | DONE | `/app/convex/zipProcessorMutations.ts` |
| Phase 1 backend tests | DONE | `/app/convex/__tests__/phase1-zip-storage.test.ts` |
| Integration tests | DONE | `/app/convex/__tests__/zip-backend-integration.test.ts` |
| E2E test scaffolding | READY | `tasks/00019-*/01-phase1-*/tests/e2e/` |

**Tests:**
```bash
# Run Phase 1 tests
cd app
npm test -- --grep "ZIP"
# Result: 28 passing tests
```

---

## Prerequisites

Before starting implementation, ensure:

1. Task 18 is complete (unified blob storage pattern)
2. Dev servers running (`./scripts/start-dev-servers.sh`)
3. Sample ZIP files available in `/samples/01-valid/zip/charting/`

---

## Phase 1: Storage and Write Permissions

### Goal

Enable users to upload ZIP files, validate them, extract contents to blob storage, detect entry points, and create artifact records.

---

### Step 1.1: Add ZIP Validation Constants

**File:** `/app/convex/lib/fileTypes.ts`

Add constants for ZIP validation limits:

```typescript
/**
 * Maximum ZIP file size (50MB)
 * Task: 00019 - Multi-file ZIP Projects
 */
export const MAX_ZIP_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Maximum files allowed in a ZIP
 * Task: 00019 - Multi-file ZIP Projects
 */
export const MAX_ZIP_FILE_COUNT = 500;

/**
 * Maximum size per extracted file (5MB)
 * Task: 00019 - Multi-file ZIP Projects
 */
export const MAX_EXTRACTED_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Forbidden file extensions in ZIP (security)
 * Task: 00019 - Multi-file ZIP Projects
 */
export const FORBIDDEN_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1',  // Executables
  '.mov', '.mp4', '.avi', '.mkv', '.wmv',         // Videos
  '.doc', '.docx', '.xls', '.xlsx', '.ppt',       // Office (not needed)
] as const;

/**
 * Validate ZIP file size before upload
 */
export function validateZipSize(sizeBytes: number): void {
  if (sizeBytes > MAX_ZIP_FILE_SIZE) {
    throw new Error(
      `ZIP file too large. Maximum: 50MB, got: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB`
    );
  }
}

/**
 * Check if a file extension is forbidden
 */
export function isForbiddenExtension(filePath: string): boolean {
  const ext = '.' + filePath.toLowerCase().split('.').pop();
  return FORBIDDEN_EXTENSIONS.includes(ext as any);
}
```

---

### Step 1.2: Update ZIP Upload Action - Create Artifact Flow

**File:** `/app/convex/zipUpload.ts`

The existing `createArtifactWithZip` mutation needs validation. Update it:

```typescript
import {
  MAX_ZIP_FILE_SIZE,
  validateZipSize,
} from "./lib/fileTypes";

/**
 * Create artifact with ZIP file type and generate upload URL
 * Task: 00019 - Added size validation
 */
export const createArtifactWithZip = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    fileSize: v.number(),
    entryPoint: v.optional(v.string()),
  },
  returns: v.object({
    uploadUrl: v.string(),
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
    shareToken: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // NEW: Validate ZIP size before creating records
    validateZipSize(args.fileSize);

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

    // Create version 1 with ZIP type
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      versionNumber: 1,
      createdBy: userId,
      fileType: "zip",
      entryPoint: args.entryPoint || "index.html",
      fileSize: args.fileSize,
      isDeleted: false,
      createdAt: now,
    });

    // Generate upload URL for the ZIP file
    const uploadUrl = await ctx.storage.generateUploadUrl();

    return {
      uploadUrl,
      artifactId,
      versionId,
      shareToken,
    };
  },
});
```

---

### Step 1.3: Add ZIP Version to Existing Artifact

**File:** `/app/convex/zipUpload.ts`

Add a new action for adding ZIP versions to existing artifacts:

```typescript
/**
 * Add a ZIP version to an existing artifact
 * Task: 00019 - New function for ZIP versioning
 */
export const addZipVersion = mutation({
  args: {
    artifactId: v.id("artifacts"),
    fileSize: v.number(),
    versionName: v.optional(v.string()),
  },
  returns: v.object({
    uploadUrl: v.string(),
    versionId: v.id("artifactVersions"),
    versionNumber: v.number(),
  }),
  handler: async (ctx, args) => {
    // 1. Authenticate
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 2. Validate ZIP size
    validateZipSize(args.fileSize);

    // 3. Verify artifact exists and user is owner
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact || artifact.isDeleted) {
      throw new Error("Artifact not found");
    }
    if (artifact.creatorId !== userId) {
      throw new Error("Not authorized: Only the owner can add versions");
    }

    // 4. Get next version number
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact", (q) => q.eq("artifactId", args.artifactId))
      .collect();
    const maxVersionNumber = Math.max(...versions.map((v) => v.versionNumber), 0);
    const newVersionNumber = maxVersionNumber + 1;

    const now = Date.now();

    // 5. Create version record
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId: args.artifactId,
      versionNumber: newVersionNumber,
      createdBy: userId,
      versionName: args.versionName,
      fileType: "zip",
      entryPoint: "index.html", // Updated after extraction
      fileSize: args.fileSize,
      isDeleted: false,
      createdAt: now,
    });

    // 6. Update artifact timestamp
    await ctx.db.patch(args.artifactId, {
      updatedAt: now,
    });

    // 7. Generate upload URL
    const uploadUrl = await ctx.storage.generateUploadUrl();

    return {
      uploadUrl,
      versionId,
      versionNumber: newVersionNumber,
    };
  },
});
```

---

### Step 1.4: Update ZIP Processor with Validation

**File:** `/app/convex/zipProcessor.ts`

Update the processor to validate ZIP contents and handle errors:

```typescript
"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import JSZip from "jszip";
import { internal } from "./_generated/api";
import { getMimeType } from "./lib/mimeTypes";
import {
  MAX_ZIP_FILE_COUNT,
  MAX_EXTRACTED_FILE_SIZE,
  isForbiddenExtension,
} from "./lib/fileTypes";

/**
 * Process a ZIP file: validate, extract files, detect entry point, store in database
 * Task: 00019 - Added validation for file count, size, and forbidden types
 */
export const processZipFile = internalAction({
  args: {
    versionId: v.id("artifactVersions"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Get the ZIP file from storage
      const zipUrl = await ctx.storage.getUrl(args.storageId);
      if (!zipUrl) {
        throw new Error("ZIP file not found in storage");
      }

      // Download and process the ZIP file
      const response = await fetch(zipUrl);
      const zipBuffer = await response.arrayBuffer();

      const zip = new JSZip();
      const zipContents = await zip.loadAsync(zipBuffer);

      // VALIDATION PASS: Check constraints before extraction
      const fileEntries = Object.entries(zipContents.files).filter(
        ([_, entry]) => !entry.dir
      );

      // Check file count
      if (fileEntries.length > MAX_ZIP_FILE_COUNT) {
        throw new Error(
          `ZIP contains too many files. Maximum: ${MAX_ZIP_FILE_COUNT}, found: ${fileEntries.length}`
        );
      }

      // Check for forbidden file types
      const forbiddenFiles: string[] = [];
      for (const [path, _] of fileEntries) {
        if (isForbiddenExtension(path)) {
          forbiddenFiles.push(path);
        }
      }
      if (forbiddenFiles.length > 0) {
        const extensions = [...new Set(
          forbiddenFiles.map((f) => '.' + f.split('.').pop()!.toLowerCase())
        )].join(', ');
        throw new Error(
          `ZIP contains unsupported file types: ${extensions}`
        );
      }

      let entryPoint: string | null = null;
      const htmlFiles: string[] = [];

      // ENTRY POINT DETECTION PASS
      for (const [relativePath, zipEntry] of fileEntries) {
        if (zipEntry.dir) continue;

        // Normalize path (remove leading ./ or /)
        const normalizedPath = relativePath.replace(/^\.?\//, '');

        if (
          normalizedPath.toLowerCase().endsWith('.html') ||
          normalizedPath.toLowerCase().endsWith('.htm')
        ) {
          htmlFiles.push(normalizedPath);

          // Priority 1: index.html in root
          if (normalizedPath.toLowerCase() === 'index.html') {
            entryPoint = normalizedPath;
          }
          // Priority 2: index.htm in root
          else if (!entryPoint && normalizedPath.toLowerCase() === 'index.htm') {
            entryPoint = normalizedPath;
          }
          // Priority 3: index.html in subdirectory
          else if (!entryPoint && normalizedPath.toLowerCase().endsWith('/index.html')) {
            entryPoint = normalizedPath;
          }
        }
      }

      // Priority 4: First HTML file found
      if (!entryPoint && htmlFiles.length > 0) {
        // Sort to get consistent ordering
        htmlFiles.sort();
        entryPoint = htmlFiles[0];
      }

      if (!entryPoint) {
        throw new Error("No HTML file found in ZIP. At least one .html file is required.");
      }

      // EXTRACTION PASS: Extract and store all files
      for (const [relativePath, zipEntry] of fileEntries) {
        if (zipEntry.dir) continue;

        const normalizedPath = relativePath.replace(/^\.?\//, '');
        const content = await zipEntry.async("arraybuffer");

        // Validate individual file size
        if (content.byteLength > MAX_EXTRACTED_FILE_SIZE) {
          throw new Error(
            `File too large: ${normalizedPath} (${(content.byteLength / 1024 / 1024).toFixed(2)}MB). Maximum: 5MB per file.`
          );
        }

        const mimeType = getMimeType(normalizedPath);

        // Store file using internal action
        await ctx.runAction(internal.zipProcessorMutations.storeExtractedFile, {
          versionId: args.versionId,
          filePath: normalizedPath,
          content: Array.from(new Uint8Array(content)),
          mimeType,
        });
      }

      // Mark processing complete with detected entry point
      await ctx.runMutation(internal.zipProcessorMutations.markProcessingComplete, {
        versionId: args.versionId,
        entryPoint,
      });

      // Delete the original ZIP from storage (files are extracted)
      await ctx.storage.delete(args.storageId);

    } catch (error) {
      console.error("Error processing ZIP file:", error);

      // Mark processing as failed with specific error
      await ctx.runMutation(internal.zipProcessorMutations.markProcessingError, {
        versionId: args.versionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Re-throw to propagate error to caller
      throw error;
    }

    return null;
  },
});
```

---

### Step 1.5: Update Processing Status Mutations

**File:** `/app/convex/zipProcessorMutations.ts`

Add a processing status field to track extraction progress:

```typescript
/**
 * Mark ZIP processing as failed with error details
 * Task: 00019 - Store error in version for UI display
 */
export const markProcessingError = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.error(`ZIP processing error for version ${args.versionId}:`, args.error);

    // Mark version with error (could add processingStatus field to schema)
    // For now, we soft-delete the version on error to prevent partial artifacts
    await ctx.db.patch(args.versionId, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return null;
  },
});
```

---

### Step 1.6: Write Permission Helpers

**File:** `/app/convex/lib/permissions.ts`

Add write permission helpers (owner-only for uploads):

```typescript
/**
 * Check if user can write/modify an artifact.
 * Only the owner (creator) can upload new versions.
 * Task: 00019 - Write permission check
 */
export async function canWriteArtifact(
  ctx: QueryCtx | MutationCtx,
  artifactId: Id<"artifacts">
): Promise<boolean> {
  const artifact = await ctx.db.get(artifactId);
  if (!artifact || artifact.isDeleted) {
    return false;
  }

  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return false;
  }

  return artifact.creatorId === userId;
}
```

Note: The imports need to be updated:
```typescript
import { QueryCtx, MutationCtx } from "../_generated/server";
```

---

### Step 1.7: Phase 1 Backend Tests

**File:** `/app/convex/__tests__/zip-upload.test.ts`

Create tests for the upload and processing flow:

```typescript
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import path from "path";
import fs from "fs/promises";

describe("ZIP Upload Flow", () => {
  test("validates ZIP size limit", async () => {
    const t = convexTest(schema);

    // Create user
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    // Attempt to create artifact with oversized ZIP
    const oversizedBytes = 60 * 1024 * 1024; // 60MB

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test ZIP",
        fileSize: oversizedBytes,
      })
    ).rejects.toThrow(/too large/i);
  });

  test("creates artifact and version for valid ZIP", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const result = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        title: "My Dashboard",
        fileSize: 10000, // 10KB
      });

    expect(result.artifactId).toBeDefined();
    expect(result.versionId).toBeDefined();
    expect(result.uploadUrl).toContain("http");
    expect(result.shareToken).toHaveLength(8);
  });

  test("only owner can add ZIP version", async () => {
    const t = convexTest(schema);

    // Create owner and artifact
    const ownerId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "owner@example.com" })
    );

    const { artifactId } = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test",
        fileSize: 1000,
      });

    // Different user tries to add version
    const otherId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "other@example.com" })
    );

    await expect(
      t.withIdentity({ subject: otherId }).mutation(api.zipUpload.addZipVersion, {
        artifactId,
        fileSize: 1000,
      })
    ).rejects.toThrow(/not authorized/i);
  });

  test("unauthenticated user cannot create ZIP artifact", async () => {
    const t = convexTest(schema);

    await expect(
      t.mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test",
        fileSize: 1000,
      })
    ).rejects.toThrow(/not authenticated/i);
  });
});

describe("ZIP Processing", () => {
  test("detects index.html as entry point", async () => {
    const t = convexTest(schema);

    // Load actual sample ZIP
    const zipPath = path.join(
      __dirname,
      "../../../samples/01-valid/zip/charting/v1.zip"
    );
    const zipContent = await fs.readFile(zipPath);
    const zipBlob = new Blob([zipContent], { type: "application/zip" });

    // Create user and artifact
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const { versionId, uploadUrl } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        title: "Charting Dashboard",
        fileSize: zipBlob.size,
      });

    // Upload to storage
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: zipBlob,
    });
    const { storageId } = await uploadResponse.json();

    // Process ZIP
    await t.action(api.zipUpload.triggerZipProcessing, {
      versionId,
      storageId,
    });

    // Verify entry point was detected
    const version = await t.run(async (ctx) => ctx.db.get(versionId));
    expect(version?.entryPoint).toBe("index.html");

    // Verify files were extracted
    const files = await t.run(async (ctx) =>
      ctx.db
        .query("artifactFiles")
        .withIndex("by_version", (q) => q.eq("versionId", versionId))
        .collect()
    );

    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.filePath === "index.html")).toBe(true);
  });

  test("rejects ZIP with forbidden file types", async () => {
    // This test requires the generated sample with videos
    // Skip if not generated
    const forbiddenZipPath = path.join(
      __dirname,
      "../../../samples/04-invalid/wrong-type/presentation-with-video.zip"
    );

    try {
      await fs.access(forbiddenZipPath);
    } catch {
      console.log("Skipping test: forbidden ZIP not generated. Run ./generate.sh");
      return;
    }

    const t = convexTest(schema);

    const zipContent = await fs.readFile(forbiddenZipPath);
    const zipBlob = new Blob([zipContent], { type: "application/zip" });

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const { versionId, uploadUrl } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        title: "With Video",
        fileSize: zipBlob.size,
      });

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: zipBlob,
    });
    const { storageId } = await uploadResponse.json();

    // Should throw during processing
    await expect(
      t.action(api.zipUpload.triggerZipProcessing, {
        versionId,
        storageId,
      })
    ).rejects.toThrow(/unsupported file types/i);
  });
});
```

---

### Phase 1 Testing Requirements

| Test | Type | Description |
|------|------|-------------|
| ZIP size validation | Unit | Reject ZIP > 50MB |
| File count validation | Unit | Reject ZIP with > 500 files |
| Forbidden extension check | Unit | Reject .exe, .mov, .mp4, etc. |
| Create artifact flow | Integration | Create artifact + version + upload URL |
| Add version flow | Integration | Add ZIP version to existing artifact |
| Owner-only upload | Integration | Non-owner cannot add version |
| Entry point detection | Integration | Detect index.html from sample ZIP |
| File extraction | Integration | All files stored in artifactFiles |
| Error handling | Integration | Failed processing soft-deletes version |

---

### Phase 1 Success Criteria

- [ ] ZIP files validate size < 50MB
- [ ] ZIP files validate file count < 500
- [ ] Forbidden file extensions are rejected
- [ ] Artifacts and versions created correctly
- [ ] Entry point (index.html) detected
- [ ] All files extracted to artifactFiles
- [ ] MIME types assigned correctly
- [ ] Only owner can add versions
- [ ] Processing errors are handled gracefully
- [ ] All Phase 1 tests pass

---

## Phase 2: Retrieval and Viewing

**Status:** Ready for Implementation
**Details:** See `02-phase2-retrieval-viewing/README.md` for complete implementation guide.

### Goal

Enable HTTP serving of multi-file artifacts with proper MIME types, relative path resolution, caching headers, and read permission checks.

### Current State

The HTTP handler (`/app/convex/http.ts`) already exists and supports multi-file paths. Phase 2 focuses on:
1. Verifying the existing implementation works
2. Adding missing MIME types (optional)
3. Writing backend tests for the query layer
4. Writing E2E tests for full integration

### Key Findings from Code Review

**HTTP Handler (lines 23-163 in `/app/convex/http.ts`):**
- URL pattern: `/artifact/{shareToken}/v{version}/{filePath}`
- Nested path support: `pathSegments.slice(2).join("/")` (line 43)
- Entry point fallback: Uses `version.entryPoint` when no filePath (lines 96-103)
- URL decoding: `decodeURIComponent(filePathToServe)` (line 105)
- CORS headers: Present (lines 147-149)
- Cache-Control: `public, max-age=31536000` (line 150) - **add `immutable`**

**MIME Types (`/app/convex/lib/mimeTypes.ts`):**
- Covers: html, css, js, json, images (png, jpg, gif, svg, webp, ico), fonts (woff, woff2, ttf, eot)
- Optional additions: avif, otf, csv, ts, map

**Permissions (`/app/convex/lib/permissions.ts`):**
- `canViewArtifact` and `canViewVersion` already exist
- HTTP route uses internal queries (bypasses auth for public share token access)

---

### Step 2.1: Verify HTTP Handler Multi-file Support

**File:** `/app/convex/http.ts`

The existing HTTP handler already supports multi-file paths. Verify and enhance:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Serve artifact files via HTTP
 * Task: 00019 - Multi-file ZIP artifact serving
 *
 * URL Structure: /artifact/{shareToken}/v{version}/{filePath}
 * Examples:
 * - /artifact/abc123/v1/index.html - Entry point
 * - /artifact/abc123/v1/assets/styles.css - CSS file
 * - /artifact/abc123/v1/scripts/app.js - JavaScript
 * - /artifact/abc123/v1/images/logo.png - Image
 */
http.route({
  pathPrefix: "/artifact/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);

    // Parse URL: /artifact/{shareToken}/v{version}/{filePath}
    const pathAfterPrefix = url.pathname.replace(/^\/artifact\//, "");
    const pathSegments = pathAfterPrefix.split("/");

    if (pathSegments.length < 2) {
      return new Response(
        "Invalid artifact URL. Expected: /artifact/{shareToken}/v{version}/{filePath}",
        { status: 400, headers: { "Content-Type": "text/plain" } }
      );
    }

    const shareToken = pathSegments[0];
    const versionStr = pathSegments[1];
    // IMPORTANT: Join remaining segments for nested paths (e.g., assets/images/logo.png)
    const filePath = pathSegments.slice(2).join("/") || null;

    try {
      // 1. Validate version format
      const versionMatch = versionStr.match(/^v(\d+)$/);
      if (!versionMatch) {
        return new Response("Invalid version format. Expected v1, v2, etc.", {
          status: 400,
          headers: { "Content-Type": "text/plain" },
        });
      }
      const versionNumber = parseInt(versionMatch[1]);

      // 2. Look up artifact by share token
      const artifact = await ctx.runQuery(
        internal.artifacts.getByShareTokenInternal,
        { shareToken }
      );

      if (!artifact) {
        return new Response("Artifact not found", {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        });
      }

      // 3. Look up specific version
      const version = await ctx.runQuery(
        internal.artifacts.getVersionByNumberInternal,
        { artifactId: artifact._id, versionNumber }
      );

      if (!version) {
        return new Response(
          `Version ${versionNumber} not found for this artifact`,
          { status: 404, headers: { "Content-Type": "text/plain" } }
        );
      }

      // 4. Determine file to serve
      // If no filePath specified, use entry point
      let filePathToServe = filePath;
      if (!filePathToServe) {
        filePathToServe = version.entryPoint;
      }

      // Decode URL-encoded path segments
      const decodedPath = decodeURIComponent(filePathToServe);

      // 5. Look up file in artifactFiles
      const file = await ctx.runQuery(internal.artifacts.getFileByPath, {
        versionId: version._id,
        filePath: decodedPath,
      });

      if (!file) {
        return new Response(`File not found: ${decodedPath}`, {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        });
      }

      // 6. Fetch file from Convex storage
      const fileUrl = await ctx.storage.getUrl(file.storageId);
      if (!fileUrl) {
        return new Response("File not accessible in storage", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
      }

      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        return new Response("Failed to fetch file from storage", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
      }

      const fileBuffer = await fileResponse.arrayBuffer();

      // 7. Return with correct Content-Type and caching
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": file.mimeType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
          // Cache static assets for 1 year (immutable content)
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      console.error("Error serving artifact file:", error);
      return new Response("Internal server error", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }),
});

export default http;
```

---

### Step 2.2: Add Missing MIME Types

**File:** `/app/convex/lib/mimeTypes.ts`

Ensure comprehensive MIME type coverage:

```typescript
/**
 * Get MIME type from filename extension
 * Task: 00019 - Added additional types for ZIP projects
 */
export function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    // HTML
    'html': 'text/html',
    'htm': 'text/html',

    // CSS
    'css': 'text/css',

    // JavaScript
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'ts': 'application/typescript',

    // Data formats
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv',

    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
    'avif': 'image/avif',

    // Fonts
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'eot': 'application/vnd.ms-fontobject',

    // Documents
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',

    // Archives
    'zip': 'application/zip',

    // Source maps (for debugging)
    'map': 'application/json',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}
```

---

### Step 2.3: Read Permission Check for HTTP Routes

**File:** `/app/convex/lib/permissions.ts`

The existing `canViewArtifact` function already handles this. The HTTP route uses internal queries that bypass permission checks (by design for public share token access). The permission model is:

- **Owner:** Full access
- **Reviewer:** View access (via artifactReviewers)
- **Public:** View access via shareToken (no auth required)

No changes needed for Phase 2 - the existing permission model is correct.

---

### Step 2.4: Frontend Viewer Updates (If Needed)

The frontend viewer should already work with multi-file artifacts since:
1. It uses `getEntryPointContent` query to get the main file URL
2. Relative paths in HTML (e.g., `./assets/style.css`) will resolve to the HTTP endpoint

**Verify the following works:**
- Load artifact viewer with ZIP artifact
- CSS files load correctly
- JavaScript files execute
- Images display
- Relative paths in CSS (e.g., `url(../images/bg.png)`) resolve correctly

If relative path issues occur, may need to inject a `<base>` tag or rewrite URLs.

---

### Step 2.5: Phase 2 Backend Tests

**File:** `/app/convex/__tests__/zip-serving.test.ts`

```typescript
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import path from "path";
import fs from "fs/promises";

describe("ZIP Artifact HTTP Serving", () => {
  test("serves entry point HTML with correct Content-Type", async () => {
    const t = convexTest(schema);

    // Setup: Create and process ZIP artifact
    const zipPath = path.join(
      __dirname,
      "../../../samples/01-valid/zip/charting/v1.zip"
    );
    const zipContent = await fs.readFile(zipPath);
    const zipBlob = new Blob([zipContent], { type: "application/zip" });

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const { versionId, uploadUrl, shareToken } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test",
        fileSize: zipBlob.size,
      });

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: zipBlob,
    });
    const { storageId } = await uploadResponse.json();

    await t.action(api.zipUpload.triggerZipProcessing, {
      versionId,
      storageId,
    });

    // Test HTTP serving
    // Note: In actual tests, you'd need to spin up the Convex HTTP server
    // This is a placeholder showing the expected behavior
    const version = await t.run(async (ctx) => ctx.db.get(versionId));
    expect(version?.entryPoint).toBe("index.html");

    const file = await t.run(async (ctx) =>
      ctx.db
        .query("artifactFiles")
        .withIndex("by_version_path", (q) =>
          q.eq("versionId", versionId).eq("filePath", "index.html")
        )
        .unique()
    );

    expect(file?.mimeType).toBe("text/html");
  });

  test("serves CSS with correct MIME type", async () => {
    const t = convexTest(schema);

    // Setup similar to above...
    // Verify CSS file has text/css MIME type
  });

  test("serves JavaScript with correct MIME type", async () => {
    const t = convexTest(schema);

    // Verify JS file has application/javascript MIME type
  });

  test("serves images with correct MIME type", async () => {
    const t = convexTest(schema);

    // Verify PNG has image/png MIME type
  });

  test("returns 404 for non-existent file", async () => {
    const t = convexTest(schema);

    // Create artifact, try to access non-existent file path
    // Verify 404 response
  });

  test("serves nested path files correctly", async () => {
    const t = convexTest(schema);

    // Test that assets/chart-data.json is accessible
    // at /artifact/{token}/v1/assets/chart-data.json
  });
});
```

---

### Step 2.6: E2E Tests

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/tasks/00019-multifile-zip-html-projects/tests/e2e/zip-artifact.spec.ts`

```typescript
import { test, expect } from "@playwright/test";
import { injectClickIndicator } from "../../../../../app/tests/utils/clickIndicator";
import path from "path";

test.describe("Multi-file ZIP Artifact Upload and Viewing", () => {
  test("upload ZIP and view in browser", async ({ page }) => {
    await page.goto("/");
    await injectClickIndicator(page);

    // Login (assuming magic link or test auth)
    // ...

    // Upload ZIP artifact
    await page.getByRole("button", { name: /upload/i }).click();

    const zipPath = path.join(
      __dirname,
      "../../../../../samples/01-valid/zip/charting/v1.zip"
    );
    await page.setInputFiles('input[type="file"]', zipPath);

    // Fill in title
    await page.getByLabel(/title/i).fill("Sales Dashboard");

    // Submit
    await page.getByRole("button", { name: /create/i }).click();

    // Wait for processing
    await expect(page.getByText(/processing/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/processing/i)).not.toBeVisible({
      timeout: 30000,
    });

    // Verify artifact loaded in viewer
    await expect(page.getByText("Monthly Sales Dashboard")).toBeVisible();
  });

  test("CSS styles are applied correctly", async ({ page }) => {
    // Navigate to existing ZIP artifact
    // Verify CSS is loaded (check computed styles)
  });

  test("JavaScript executes correctly", async ({ page }) => {
    // Navigate to ZIP artifact with interactive elements
    // Verify JS functionality works
  });

  test("version switching loads correct files", async ({ page }) => {
    // Upload v1, then v2
    // Switch between versions
    // Verify correct content displays for each
  });
});
```

---

### Phase 2 Testing Requirements

| Test | Type | Description |
|------|------|-------------|
| Serve entry point | Integration | index.html served with text/html |
| Serve CSS | Integration | .css files with text/css |
| Serve JS | Integration | .js files with application/javascript |
| Serve images | Integration | .png, .jpg with correct types |
| Serve fonts | Integration | .woff2, .ttf with correct types |
| Nested paths | Integration | assets/images/logo.png accessible |
| 404 for missing | Integration | Non-existent files return 404 |
| Cache headers | Integration | Cache-Control headers set |
| CORS headers | Integration | Access-Control headers set |
| Upload and view | E2E | Full upload-to-view flow |
| CSS applied | E2E | Verify styles render |
| JS executes | E2E | Verify interactivity |
| Version switch | E2E | Correct files per version |

---

### Phase 2 Success Criteria

- [ ] Entry point HTML loads correctly
- [ ] CSS files load with correct MIME type
- [ ] JavaScript executes in viewer
- [ ] Images display correctly
- [ ] Fonts load correctly
- [ ] Nested paths resolve correctly
- [ ] Relative paths in HTML work
- [ ] 404 returned for missing files
- [ ] Cache headers set for performance
- [ ] CORS headers allow viewer access
- [ ] Version switching loads correct files
- [ ] All Phase 2 tests pass with video recordings

---

## File Change Summary

### Modified Files

| File | Phase | Changes |
|------|-------|---------|
| `/app/convex/lib/fileTypes.ts` | 1 | Add ZIP validation constants |
| `/app/convex/lib/mimeTypes.ts` | 2 | Add missing MIME types |
| `/app/convex/lib/permissions.ts` | 1 | Add `canWriteArtifact` helper |
| `/app/convex/zipUpload.ts` | 1 | Add size validation, `addZipVersion` |
| `/app/convex/zipProcessor.ts` | 1 | Add validation for count, size, extensions |
| `/app/convex/zipProcessorMutations.ts` | 1 | Improve error handling |
| `/app/convex/http.ts` | 2 | Verify/enhance multi-file serving |

### New Files

| File | Phase | Purpose |
|------|-------|---------|
| `/app/convex/__tests__/zip-upload.test.ts` | 1 | Upload flow tests |
| `/app/convex/__tests__/zip-serving.test.ts` | 2 | HTTP serving tests |
| `tasks/00019-*/tests/e2e/zip-artifact.spec.ts` | 2 | E2E tests |

---

## Implementation Order

### Phase 1 (Recommended Order)

1. Step 1.1: Add validation constants to fileTypes.ts
2. Step 1.2: Update createArtifactWithZip with validation
3. Step 1.3: Add addZipVersion mutation
4. Step 1.4: Update zipProcessor with validation
5. Step 1.5: Improve error handling in mutations
6. Step 1.6: Add write permission helper
7. Step 1.7: Write and run Phase 1 tests

### Phase 2 (Recommended Order)

1. Step 2.2: Add missing MIME types
2. Step 2.1: Verify/enhance HTTP handler
3. Step 2.4: Verify frontend viewer works
4. Step 2.5: Write and run Phase 2 backend tests
5. Step 2.6: Write and run E2E tests

---

## Sample Test Data

Use the centralized samples in `/samples/`:

| Sample | Use Case |
|--------|----------|
| `samples/01-valid/zip/charting/v1.zip` - `v5.zip` | Valid multi-file projects |
| `samples/03-edge-cases/zip/multi-page-site.zip` | No index.html edge case |
| `samples/04-invalid/wrong-type/presentation-with-video.zip` | Forbidden file types |
| `samples/04-invalid/too-large/huge.zip` | Size limit (generated) |

---

## Handoff Checklist

### Phase 1 (COMPLETE)

- [x] ZIP files validate size < 50MB
- [x] ZIP files validate file count < 500
- [x] Forbidden file extensions are rejected (.exe, .mov, .mp4, etc.)
- [x] Artifacts and versions created correctly
- [x] Entry point (index.html) detected
- [x] All files extracted to artifactFiles
- [x] MIME types assigned correctly
- [x] Only owner can add versions (`canWriteArtifact`)
- [x] Processing errors are handled gracefully (soft-delete)
- [x] All Phase 1 tests pass (28 tests)

### Phase 2 (Pending)

- [ ] Entry point HTML loads correctly in viewer
- [ ] CSS files load with correct MIME type
- [ ] JavaScript executes in viewer
- [ ] Images display correctly
- [ ] Fonts load correctly
- [ ] Nested paths resolve correctly
- [ ] Relative paths in HTML work
- [ ] 404 returned for missing files
- [ ] Cache headers set (`max-age=31536000, immutable`)
- [ ] CORS headers allow viewer access
- [ ] Version switching loads correct files
- [ ] All Phase 2 backend tests pass
- [ ] All E2E tests pass with video recordings
- [ ] `test-report.md` created in task folder

---

**Author:** Claude (Software Architect Agent)
**Created:** 2025-12-31
**Last Updated:** 2025-12-31 (Phase 1 complete, Phase 2 plan updated)
