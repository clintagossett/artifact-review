# Implementation Plan: Phase 2 - Retrieval Operations + Read Permissions

**Task:** 00018 - Refine Single-File Artifact Upload and Versioning
**Subtask:** 02 - Phase 2 Retrieval + Read Permissions
**Created:** 2025-12-31
**Status:** Ready for Implementation

---

## Overview

This document provides a step-by-step implementation plan for Phase 2: Retrieval Operations + Read Permissions. Each step is designed to be:

1. **Independently testable** - Can verify correctness before moving to next step
2. **Backward compatible** - Existing functionality continues working during transition
3. **Incrementally deployable** - Can deploy after each step if needed

**Phase 2 Focus:**
- Update retrieval queries to read from blob storage
- Implement read permission checks
- Update HTTP serving to use unified pattern
- Update viewer UI to fetch from blob URLs
- E2E tests for complete flow
- Cleanup deprecated inline fields

**Prerequisites (Phase 1 Complete):**
- Schema has unified storage fields (`entryPoint`, `createdBy`, etc.)
- Upload mutations store files as blobs in `artifactFiles` + `_storage`
- Write permissions enforced (owner-only for add/update/delete)
- No migration needed (dev delete/reset approach)

---

## Pre-Implementation Checklist

Before starting, ensure:

- [ ] Dev servers running (`./scripts/start-dev-servers.sh`)
- [ ] Phase 1 tests passing
- [ ] Read `docs/architecture/convex-rules.md` (Convex patterns)
- [ ] Read `END-STATE-DESIGN.md` Section 4 (Retrieval Pattern)
- [ ] Understand current HTTP serving in `convex/http.ts`

---

## Implementation Steps

### Step 1: Create Read Permission Helper Module

**Goal:** Create centralized read permission helpers for consistent access control.

**Location:** `/app/convex/lib/permissions.ts` (NEW FILE)

**What to Create:**

```typescript
// convex/lib/permissions.ts

import { QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Permission levels for artifact access
 */
export type PermissionLevel = "owner" | "reviewer" | "public" | null;

/**
 * Check what permission level a user has for an artifact.
 *
 * Returns:
 * - "owner" if user is the artifact creator
 * - "reviewer" if user is an invited reviewer
 * - "public" if artifact has a valid shareToken (anyone can view)
 * - null if access is denied
 */
export async function getArtifactPermission(
  ctx: QueryCtx,
  artifactId: Id<"artifacts">
): Promise<PermissionLevel> {
  // Get artifact
  const artifact = await ctx.db.get(artifactId);
  if (!artifact || artifact.isDeleted) {
    return null;
  }

  // Check if user is authenticated
  const userId = await getAuthUserId(ctx);

  // Owner check
  if (userId && artifact.creatorId === userId) {
    return "owner";
  }

  // Reviewer check
  if (userId) {
    const reviewer = await ctx.db
      .query("artifactReviewers")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", artifactId).eq("isDeleted", false)
      )
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (reviewer) {
      return "reviewer";
    }
  }

  // Public access via shareToken (artifact exists and is not deleted)
  // Anyone with the shareToken can view
  return "public";
}

/**
 * Check if user can view an artifact (any permission level grants view access).
 */
export async function canViewArtifact(
  ctx: QueryCtx,
  artifactId: Id<"artifacts">
): Promise<boolean> {
  const permission = await getArtifactPermission(ctx, artifactId);
  return permission !== null;
}

/**
 * Check if user can view a specific version.
 * Currently same as artifact access (versions inherit artifact permissions).
 */
export async function canViewVersion(
  ctx: QueryCtx,
  versionId: Id<"artifactVersions">
): Promise<boolean> {
  const version = await ctx.db.get(versionId);
  if (!version || version.isDeleted) {
    return false;
  }
  return canViewArtifact(ctx, version.artifactId);
}

/**
 * Get artifact by share token with permission check.
 * Returns artifact if valid shareToken, null otherwise.
 */
export async function getArtifactByShareToken(
  ctx: QueryCtx,
  shareToken: string
): Promise<{
  artifact: Awaited<ReturnType<typeof ctx.db.get>> & { _id: Id<"artifacts"> };
  permission: PermissionLevel;
} | null> {
  const artifact = await ctx.db
    .query("artifacts")
    .withIndex("by_share_token", (q) => q.eq("shareToken", shareToken))
    .first();

  if (!artifact || artifact.isDeleted) {
    return null;
  }

  const permission = await getArtifactPermission(ctx, artifact._id);
  if (!permission) {
    return null;
  }

  return { artifact, permission };
}
```

**Validation Criteria:**
- [ ] File compiles without TypeScript errors
- [ ] Functions exported correctly
- [ ] Can import in other Convex files

**Test Plan:**
- Unit test `getArtifactPermission()` returns correct levels
- Unit test `canViewArtifact()` for owner, reviewer, public scenarios
- Unit test `getArtifactByShareToken()` for valid/invalid tokens

---

### Step 2: Create Unified Content Retrieval Query

**Goal:** Create a query that retrieves content from blob storage (unified pattern).

**Location:** `/app/convex/artifacts.ts`

**New Query:**

```typescript
/**
 * Get entry point content for a version (unified storage pattern).
 *
 * This is the primary retrieval method for displaying artifact content.
 * For single-file artifacts, this returns the only file's signed URL.
 * For multi-file artifacts, this returns the entry point file's URL.
 *
 * Returns signed URL that expires after a short period (Convex default).
 */
export const getEntryPointContent = query({
  args: {
    versionId: v.id("artifactVersions"),
  },
  returns: v.union(
    v.object({
      url: v.string(),
      mimeType: v.string(),
      fileSize: v.number(),
      filePath: v.string(),
      fileType: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // 1. Get version
    const version = await ctx.db.get(args.versionId);
    if (!version || version.isDeleted) {
      return null;
    }

    // 2. Check permission
    const canView = await canViewVersion(ctx, args.versionId);
    if (!canView) {
      return null;
    }

    // 3. Get file from artifactFiles using entryPoint
    const entryPoint = version.entryPoint;
    if (!entryPoint) {
      // Legacy version without entryPoint - fall back to default
      // This shouldn't happen after Phase 1 migration
      return null;
    }

    const file = await ctx.db
      .query("artifactFiles")
      .withIndex("by_version_path", (q) =>
        q.eq("versionId", args.versionId).eq("filePath", entryPoint)
      )
      .unique();

    if (!file || file.isDeleted) {
      return null;
    }

    // 4. Get signed URL from storage
    const url = await ctx.storage.getUrl(file.storageId);
    if (!url) {
      return null;
    }

    return {
      url,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      filePath: file.filePath,
      fileType: version.fileType,
    };
  },
});

/**
 * Get any file by path within a version (for multi-file navigation).
 *
 * Used when navigating between files in ZIP artifacts or fetching assets.
 */
export const getFileContent = query({
  args: {
    versionId: v.id("artifactVersions"),
    filePath: v.string(),
  },
  returns: v.union(
    v.object({
      url: v.string(),
      mimeType: v.string(),
      fileSize: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // 1. Check permission
    const canView = await canViewVersion(ctx, args.versionId);
    if (!canView) {
      return null;
    }

    // 2. Get file
    const file = await ctx.db
      .query("artifactFiles")
      .withIndex("by_version_path", (q) =>
        q.eq("versionId", args.versionId).eq("filePath", args.filePath)
      )
      .unique();

    if (!file || file.isDeleted) {
      return null;
    }

    // 3. Get signed URL
    const url = await ctx.storage.getUrl(file.storageId);
    if (!url) {
      return null;
    }

    return {
      url,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    };
  },
});

/**
 * Get file tree for a version (for file navigation UI).
 *
 * For single-file artifacts: Returns array with one item.
 * For multi-file artifacts: Returns array with all files, sorted.
 */
export const getFileTree = query({
  args: {
    versionId: v.id("artifactVersions"),
  },
  returns: v.array(
    v.object({
      filePath: v.string(),
      mimeType: v.string(),
      fileSize: v.number(),
      isEntryPoint: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Check permission
    const canView = await canViewVersion(ctx, args.versionId);
    if (!canView) {
      return [];
    }

    // 2. Get version for entryPoint
    const version = await ctx.db.get(args.versionId);
    if (!version || version.isDeleted) {
      return [];
    }

    // 3. Get all active files
    const files = await ctx.db
      .query("artifactFiles")
      .withIndex("by_version_active", (q) =>
        q.eq("versionId", args.versionId).eq("isDeleted", false)
      )
      .collect();

    // 4. Sort by filePath and mark entry point
    return files
      .map((f) => ({
        filePath: f.filePath,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
        isEntryPoint: f.filePath === version.entryPoint,
      }))
      .sort((a, b) => {
        // Entry point first, then alphabetical
        if (a.isEntryPoint) return -1;
        if (b.isEntryPoint) return 1;
        return a.filePath.localeCompare(b.filePath);
      });
  },
});
```

**Validation Criteria:**
- [ ] Queries return signed URLs for blob content
- [ ] Permission checks block unauthorized access
- [ ] Returns null for deleted/missing content

**Test Plan:**
- Test owner can get entry point content
- Test reviewer can get entry point content
- Test public user can get content via shareToken
- Test unauthorized user gets null
- Test deleted version returns null
- Test file tree returns correct structure

---

### Step 3: Update HTTP Serving for Unified Pattern

**Goal:** Update HTTP routes to serve content from blob storage using unified pattern.

**Location:** `/app/convex/http.ts`

**Changes:**

The current HTTP handler has separate logic for HTML (inline) vs ZIP (blob). Update to use unified blob pattern:

```typescript
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
    const filePath = pathSegments.slice(2).join("/") || null; // null means use entryPoint

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

      // 4. UNIFIED PATTERN: Get file from artifactFiles
      const requestedPath = filePath || version.entryPoint;

      if (!requestedPath) {
        return new Response("No entry point defined for this version", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
      }

      const file = await ctx.runQuery(internal.artifacts.getFileByPath, {
        versionId: version._id,
        filePath: requestedPath,
      });

      if (!file) {
        return new Response(`File not found: ${requestedPath}`, {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        });
      }

      // 5. Fetch from storage and serve
      const fileUrl = await ctx.storage.getUrl(file.storageId);
      if (!fileUrl) {
        return new Response("File content not found in storage", {
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

      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": file.mimeType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
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
```

**Key Changes from Current:**
- Remove `if (version.fileType === "html" && version.htmlContent)` branch
- Remove inline content serving
- Always use `artifactFiles` lookup for all file types
- Same code path for HTML, Markdown, and ZIP

**Validation Criteria:**
- [ ] HTML artifacts serve from blob storage
- [ ] Markdown artifacts serve from blob storage
- [ ] ZIP artifacts continue to work
- [ ] Correct Content-Type headers
- [ ] CORS headers present

**Test Plan:**
- Test serving HTML file via HTTP
- Test serving Markdown file via HTTP
- Test serving ZIP entry point via HTTP
- Test serving nested file in ZIP
- Test 404 for missing files

---

### Step 4: Update Internal Queries for HTTP Actions

**Goal:** Ensure internal queries used by HTTP actions work with unified pattern.

**Location:** `/app/convex/artifacts.ts`

**Update `getVersionByNumberInternal`:**

The current return type includes `htmlContent` and `markdownContent`. Update to focus on unified fields:

```typescript
/**
 * Internal query: Get version by artifact and version number (for HTTP actions)
 *
 * Updated for unified storage pattern - returns entryPoint, not inline content.
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
      fileType: v.string(),
      entryPoint: v.optional(v.string()),
      fileSize: v.number(),
      isDeleted: v.boolean(),
      createdAt: v.number(),
      // createdBy and versionName available but not needed for HTTP serving
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

    return {
      _id: version._id,
      _creationTime: version._creationTime,
      artifactId: version.artifactId,
      versionNumber: version.versionNumber,
      fileType: version.fileType,
      entryPoint: version.entryPoint,
      fileSize: version.fileSize,
      isDeleted: version.isDeleted,
      createdAt: version.createdAt,
    };
  },
});
```

**Note:** We project only needed fields in the handler to avoid returning deprecated `htmlContent`/`markdownContent` fields.

**Validation Criteria:**
- [ ] Internal query returns correct fields
- [ ] No references to inline content
- [ ] entryPoint is included

---

### Step 5: Update Viewer Frontend - Fetch Content from Blob URL

**Goal:** Update DocumentViewer to fetch content from blob storage URLs.

**Location:** `/app/src/components/artifact/DocumentViewer.tsx`

**Current Behavior:**
The viewer currently loads content via the HTTP route `/api/artifact/{shareToken}/v{version}/{page}`. This will continue to work because we're updating the HTTP handler (Step 3) to use blob storage.

**Required Changes:**

1. **Verify iframe loading works** - The iframe already points to the proxy URL which calls our HTTP endpoint. After Step 3, this should "just work".

2. **Add loading state for content** - Optional but recommended:

```typescript
// Add state for tracking content loading
const [contentLoading, setContentLoading] = useState(true);
const [contentError, setContentError] = useState<string | null>(null);

// In iframe onLoad handler
const handleIframeLoad = () => {
  setContentLoading(false);
};

const handleIframeError = () => {
  setContentLoading(false);
  setContentError("Failed to load artifact content");
};

// In render
<div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden relative">
  {contentLoading && (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
    </div>
  )}
  {contentError && (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
      <div className="text-red-600">{contentError}</div>
    </div>
  )}
  <iframe
    ref={iframeRef}
    src={artifactUrl}
    className={`w-full h-[1000px] border-0 ${contentLoading ? 'invisible' : ''}`}
    title="HTML Document Preview"
    onLoad={handleIframeLoad}
    onError={handleIframeError}
  />
</div>
```

3. **Handle Markdown rendering** - If fileType is markdown, the viewer may need to render it differently. Currently, the HTTP endpoint returns raw markdown content. Options:
   - Serve rendered HTML from backend (preferred for consistency)
   - Add client-side markdown rendering

**For Phase 2, recommendation:** Keep current behavior where HTTP serves raw content. Markdown rendering will be addressed if needed - the iframe may already handle it or a separate markdown component can be used.

**Validation Criteria:**
- [ ] Viewer loads HTML content from blob storage
- [ ] Viewer loads Markdown content from blob storage
- [ ] Loading states display correctly
- [ ] Error states display correctly

---

### Step 6: Update Version Queries for Viewer

**Goal:** Ensure version listing queries work correctly and don't expose deprecated fields.

**Location:** `/app/convex/artifacts.ts`

**Update `getVersions` return type:**

```typescript
/**
 * Get all versions for an artifact (for version switcher UI)
 *
 * Returns metadata only - no content. Content is fetched separately.
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
      versionName: v.optional(v.string()),  // NEW: Version label
      createdBy: v.optional(v.id("users")), // NEW: Who created
      fileType: v.string(),
      fileSize: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Check permission
    const canView = await canViewArtifact(ctx, args.artifactId);
    if (!canView) {
      return [];
    }

    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .order("desc")
      .collect();

    // Project only needed fields (exclude inline content)
    return versions.map((v) => ({
      _id: v._id,
      _creationTime: v._creationTime,
      artifactId: v.artifactId,
      versionNumber: v.versionNumber,
      versionName: v.versionName,
      createdBy: v.createdBy,
      fileType: v.fileType,
      fileSize: v.fileSize,
      createdAt: v.createdAt,
    }));
  },
});
```

**Add creator name lookup for version switcher:**

```typescript
/**
 * Get versions with creator names for UI display.
 */
export const getVersionsWithCreators = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.array(
    v.object({
      _id: v.id("artifactVersions"),
      versionNumber: v.number(),
      versionName: v.optional(v.string()),
      creatorName: v.optional(v.string()),
      fileType: v.string(),
      fileSize: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const canView = await canViewArtifact(ctx, args.artifactId);
    if (!canView) {
      return [];
    }

    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .order("desc")
      .collect();

    // Fetch creator names
    const results = await Promise.all(
      versions.map(async (v) => {
        let creatorName: string | undefined;
        if (v.createdBy) {
          const user = await ctx.db.get(v.createdBy);
          creatorName = user?.name || undefined;
        }
        return {
          _id: v._id,
          versionNumber: v.versionNumber,
          versionName: v.versionName,
          creatorName,
          fileType: v.fileType,
          fileSize: v.fileSize,
          createdAt: v.createdAt,
        };
      })
    );

    return results;
  },
});
```

**Validation Criteria:**
- [ ] Version list shows correct metadata
- [ ] Permission check blocks unauthorized access
- [ ] Creator names displayed in version switcher

---

### Step 7: Add Read Permission Checks to Existing Queries

**Goal:** Add permission checks to all public queries that return artifact data.

**Location:** `/app/convex/artifacts.ts`

**Queries to update:**

1. **`getVersion`** - Add permission check
2. **`getVersionByNumber`** - Add permission check
3. **`getLatestVersion`** - Add permission check
4. **`getByShareToken`** - Already handles deleted check, add explicit permission response

**Example update for `getVersion`:**

```typescript
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
      versionName: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      fileType: v.string(),
      entryPoint: v.optional(v.string()),
      fileSize: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      // Note: htmlContent/markdownContent NOT returned
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Check permission first
    const canView = await canViewVersion(ctx, args.versionId);
    if (!canView) {
      return null;
    }

    const version = await ctx.db.get(args.versionId);
    if (!version) {
      return null;
    }

    // Project only relevant fields (exclude deprecated inline content)
    return {
      _id: version._id,
      _creationTime: version._creationTime,
      artifactId: version.artifactId,
      versionNumber: version.versionNumber,
      versionName: version.versionName,
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
```

**Validation Criteria:**
- [ ] All queries check permissions
- [ ] Unauthorized access returns null
- [ ] No inline content fields returned

---

### Step 8: Cleanup - Remove Deprecated Fields from Schema

**Goal:** Remove deprecated inline content fields after retrieval is working.

**IMPORTANT:** Only do this step AFTER:
- Steps 1-7 are complete and tested
- All retrieval uses blob storage
- HTTP serving works correctly
- Viewer displays content correctly

**Location:** `/app/convex/schema.ts`

**Changes:**

```typescript
// REMOVE these fields from artifactVersions:
// htmlContent: v.optional(v.string()),    // REMOVE
// markdownContent: v.optional(v.string()),// REMOVE

// CHANGE entryPoint to required:
// entryPoint: v.optional(v.string()),     // BEFORE
entryPoint: v.string(),                    // AFTER

// CHANGE createdBy to required:
// createdBy: v.optional(v.id("users")),   // BEFORE
createdBy: v.id("users"),                  // AFTER
```

**Note about dev environment:** Per task guidelines, we're using delete/reset approach in dev rather than migrations. This means:
1. Delete all test data
2. Update schema
3. Deploy
4. Create fresh test data using new mutations

**Validation Criteria:**
- [ ] Schema deploys without errors
- [ ] All functions compile (no references to removed fields)
- [ ] Create new artifact - works
- [ ] View artifact - works
- [ ] No TypeScript errors

---

### Step 9: E2E Tests for Complete Flow

**Goal:** End-to-end tests covering upload through viewing.

**Location:** `/tasks/00018-refine-version-model-permissions/02-phase2-retrieval-read-permissions/tests/e2e/`

**Test Structure:**

```
tests/e2e/
├── package.json              # Playwright + dependencies
├── playwright.config.ts      # Configuration
├── helpers/
│   └── auth.ts               # Sign-in helpers
└── specs/
    ├── view-artifact.spec.ts # View tests
    ├── permissions.spec.ts   # Permission tests
    └── version-switch.spec.ts# Version switching tests
```

**Test Scenarios:**

#### 1. View Artifact (`view-artifact.spec.ts`)

```typescript
test.describe('Phase 2: View Artifacts', () => {
  test('owner can view HTML artifact', async ({ page }) => {
    // 1. Sign in
    // 2. Navigate to dashboard
    // 3. Click on an artifact
    // 4. Verify content loads in iframe
    // 5. Verify no errors
  });

  test('owner can view Markdown artifact', async ({ page }) => {
    // Similar to above
  });

  test('public user can view via share link', async ({ page }) => {
    // 1. Get share URL (without signing in)
    // 2. Navigate to share URL
    // 3. Verify content loads
  });
});
```

#### 2. Permissions (`permissions.spec.ts`)

```typescript
test.describe('Phase 2: Read Permissions', () => {
  test('unauthorized user cannot access deleted artifact', async ({ page }) => {
    // Attempt to access deleted artifact URL
    // Expect 404 or appropriate error
  });

  test('reviewer can view artifact they are invited to', async ({ page }) => {
    // 1. Sign in as owner
    // 2. Create artifact
    // 3. Invite reviewer
    // 4. Sign out
    // 5. Sign in as reviewer
    // 6. Navigate to artifact
    // 7. Verify content loads
  });
});
```

#### 3. Version Switching (`version-switch.spec.ts`)

```typescript
test.describe('Phase 2: Version Switching', () => {
  test('can switch between versions', async ({ page }) => {
    // 1. Create artifact with multiple versions (via API/mutation)
    // 2. Navigate to artifact
    // 3. Open version dropdown
    // 4. Select different version
    // 5. Verify content changes
  });

  test('version switcher shows creator names', async ({ page }) => {
    // Verify version metadata displays correctly
  });
});
```

**Validation Criteria:**
- [ ] All E2E tests pass
- [ ] Video recordings captured
- [ ] Tests use central `/samples/` for test files

---

### Step 10: Backend Tests for Read Permissions

**Goal:** Comprehensive backend tests for retrieval and permissions.

**Location:** `/tasks/00018-refine-version-model-permissions/02-phase2-retrieval-read-permissions/tests/convex/`

**Test Files:**

#### 1. Permission Helpers (`permissions.test.ts`)

```typescript
describe("permissions helpers", () => {
  describe("getArtifactPermission", () => {
    it("returns 'owner' for artifact creator");
    it("returns 'reviewer' for invited reviewer");
    it("returns 'public' for anyone (via shareToken)");
    it("returns null for deleted artifact");
    it("returns null for non-existent artifact");
  });

  describe("canViewArtifact", () => {
    it("returns true for owner");
    it("returns true for reviewer");
    it("returns true for public user");
    it("returns false for deleted artifact");
  });

  describe("canViewVersion", () => {
    it("returns true if can view parent artifact");
    it("returns false for deleted version");
  });
});
```

#### 2. Content Retrieval (`retrieval.test.ts`)

```typescript
describe("content retrieval", () => {
  describe("getEntryPointContent", () => {
    it("returns signed URL for HTML artifact");
    it("returns signed URL for Markdown artifact");
    it("returns correct mimeType");
    it("returns null for deleted version");
    it("returns null for unauthorized access");
  });

  describe("getFileContent", () => {
    it("returns signed URL for any file path");
    it("returns null for non-existent file");
  });

  describe("getFileTree", () => {
    it("returns single file for HTML artifact");
    it("returns multiple files for ZIP artifact");
    it("marks entry point correctly");
    it("sorts alphabetically with entry point first");
  });
});
```

#### 3. Version Queries (`versions.test.ts`)

```typescript
describe("version queries", () => {
  describe("getVersions", () => {
    it("returns all active versions");
    it("excludes deleted versions");
    it("returns empty for unauthorized access");
    it("includes versionName and createdBy");
  });

  describe("getVersionsWithCreators", () => {
    it("includes creator names");
    it("handles missing creator gracefully");
  });
});
```

**Validation Criteria:**
- [ ] All backend tests pass
- [ ] 100% coverage of permission scenarios
- [ ] Edge cases handled

---

## Success Criteria Summary

**Retrieval Works:**
- [ ] Content loaded from blob storage (`_storage`)
- [ ] Signed URLs returned to frontend
- [ ] HTTP serving uses unified pattern
- [ ] Viewer displays HTML correctly
- [ ] Viewer displays Markdown correctly
- [ ] No references to inline content fields in retrieval code

**Permissions Work:**
- [ ] ShareToken grants public view access
- [ ] Reviewers can view artifacts they're invited to
- [ ] Owners can view their artifacts
- [ ] Unauthorized access returns null/404
- [ ] Deleted artifacts return 404

**UI Works:**
- [ ] Viewer loads content via HTTP proxy
- [ ] Loading states display appropriately
- [ ] Error states display appropriately
- [ ] Version switcher shows version metadata
- [ ] Version switching works correctly

**Cleanup Complete:**
- [ ] `htmlContent` field removed from schema
- [ ] `markdownContent` field removed from schema
- [ ] `entryPoint` is required (not optional)
- [ ] `createdBy` is required (not optional)
- [ ] No TypeScript errors

**Tests Pass:**
- [ ] All backend tests pass (Tier 1)
- [ ] E2E tests pass (Tier 2)
- [ ] Test report created

---

## Deployment Strategy

### Development Environment

1. Complete Steps 1-7 sequentially
2. Test each step thoroughly
3. Deploy and verify
4. Complete Step 8 (schema cleanup)
5. Run E2E tests (Step 9)
6. Document in test report

### Production Environment

**Since we're in dev mode (delete/reset approach):**
1. This is development-only work
2. No production migration needed
3. When going to production, ensure all data uses new pattern

---

## References

- Parent Task README: `../README.md`
- End-State Design: `../END-STATE-DESIGN.md` (Section 4: Retrieval Pattern)
- Phase 1 Implementation Plan: `../01-phase1-upload-write-permissions/IMPLEMENTATION-PLAN.md`
- Convex Rules: `docs/architecture/convex-rules.md`
- Current Schema: `app/convex/schema.ts`
- Current HTTP Routes: `app/convex/http.ts`
- Current Viewer: `app/src/components/artifact/DocumentViewer.tsx`

---

**Document Author:** Software Architect Agent
**Last Updated:** 2025-12-31
**Version:** 1.0
