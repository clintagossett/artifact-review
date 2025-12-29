# Commenting Schema Design

**Task:** 00017 - Implement Commenting
**Phase:** 2 - Build Backend
**Author:** Architect Agent
**Date:** 2025-12-28
**Status:** Ready for Review (v2 - Refactored)

---

## Executive Summary

This document defines the Convex database schema for the commenting feature.

**Key Design Principle:** Separate backend concerns from frontend concerns. The backend stores and retrieves comments; the frontend interprets where they point to within an artifact.

**v2 Changes:** Replaced 8 HTML-specific fields with a single versioned `target` JSON object. This provides:
- Flexibility for different artifact types (HTML, Markdown, ZIP)
- Frontend ownership of targeting logic
- Schema evolution via versioning
- Cleaner, leaner backend schema

---

## Table of Contents

1. [Field Analysis: Backend vs Frontend](#field-analysis-backend-vs-frontend)
2. [Refactored Schema Design](#refactored-schema-design)
3. [Target Metadata Schema](#target-metadata-schema)
4. [Concrete Examples](#concrete-examples)
5. [Tradeoffs](#tradeoffs)
6. [Schema Versioning Strategy](#schema-versioning-strategy)
7. [Comment Replies Table](#comment-replies-table)
8. [Index Strategy](#index-strategy)
9. [Permission Model](#permission-model)
10. [Migration Notes](#migration-notes)

---

## Field Analysis: Backend vs Frontend

### Original Schema Fields

| Field | Backend Concern? | Frontend Concern? | Analysis |
|-------|------------------|-------------------|----------|
| `versionId` | **Yes** | No | Needed for queries, permissions, relationships |
| `authorId` | **Yes** | No | Needed for permissions, author lookup |
| `content` | **Yes** | No | Core comment data, stored and retrieved |
| `resolved` | **Yes** | No | Backend tracks resolution state, affects queries |
| `isEdited` | **Yes** | No | Audit/display flag |
| `editedAt` | **Yes** | No | Audit timestamp |
| `isDeleted` | **Yes** | No | Soft delete pattern (ADR 0011) |
| `deletedAt` | **Yes** | No | Soft delete timestamp |
| `createdAt` | **Yes** | No | Ordering, display |
| `targetType` | Maybe | **Yes** | "text" vs "element" is HTML-specific terminology |
| `highlightedText` | No | **Yes** | Only meaningful to HTML/JS frontend |
| `elementType` | No | **Yes** | HTML element categorization |
| `elementId` | No | **Yes** | DOM-specific identifier |
| `elementPreview` | No | **Yes** | Display text for UI |
| `page` | Maybe | **Yes** | Path within ZIP, could be indexed but rarely queried |
| `locationType` | No | **Yes** | Tab/accordion - pure UI concept |
| `locationLabel` | No | **Yes** | Display label |
| `locationIsHidden` | No | **Yes** | UI state indicator |

### Conclusion

**Backend needs:**
- Relationships: `versionId`, `authorId`
- Core data: `content`, `resolved`
- Resolution audit: `resolvedBy`, `resolvedAt`
- Lifecycle: `isEdited`, `editedAt`, `isDeleted`, `deletedAt`, `createdAt`

**Frontend owns:**
- Everything about WHERE the comment points (target location)
- Everything about HOW to display the target reference

---

## Refactored Schema Design

### Comments Table

```typescript
// convex/schema.ts

comments: defineTable({
  // ============================================================================
  // RELATIONSHIPS (Backend concerns)
  // ============================================================================

  /**
   * Reference to the artifact version this comment is on.
   * Comments are version-specific - each version has its own comments.
   */
  versionId: v.id("artifactVersions"),

  /**
   * Reference to the user who created the comment.
   * Used for permission checks (author can edit/delete their own).
   */
  authorId: v.id("users"),

  // ============================================================================
  // CONTENT (Backend concerns)
  // ============================================================================

  /**
   * The comment text content.
   * Required, non-empty.
   */
  content: v.string(),

  /**
   * Whether the comment thread is resolved.
   * Resolution indicates the feedback has been addressed.
   * Can be toggled by owner or any reviewer with can-comment permission.
   */
  resolved: v.boolean(),

  /**
   * Reference to the user who last resolved this comment.
   * Set when `resolved` is toggled to `true`.
   * Undefined when `resolved` is `false` or has never been resolved.
   */
  resolvedBy: v.optional(v.id("users")),

  /**
   * Timestamp when the comment was last resolved.
   * Unix timestamp in milliseconds.
   * Set when `resolved` is toggled to `true`.
   * Undefined when `resolved` is `false` or has never been resolved.
   */
  resolvedAt: v.optional(v.number()),

  // ============================================================================
  // TARGET METADATA (Frontend-owned, versioned JSON)
  // ============================================================================

  /**
   * Version of the target metadata schema.
   * Allows frontend to evolve targeting format without backend changes.
   *
   * Version history:
   * - 1: Initial schema (HTML text/element targeting)
   *
   * See "Target Metadata Schema" section for structure per version.
   */
  targetSchemaVersion: v.number(),

  /**
   * Opaque JSON blob containing target location data.
   *
   * The backend stores and retrieves this without interpretation.
   * The frontend is responsible for:
   * - Encoding target location when creating comments
   * - Decoding and interpreting when displaying comments
   * - Handling version migrations client-side
   *
   * Structure depends on targetSchemaVersion.
   * See "Target Metadata Schema" section for details.
   */
  target: v.any(),

  // ============================================================================
  // EDIT TRACKING (Backend concerns)
  // ============================================================================

  /**
   * Whether the comment has been edited after creation.
   * Used to show "edited" indicator in UI.
   */
  isEdited: v.boolean(),

  /**
   * Timestamp of the last edit.
   * Unix timestamp in milliseconds.
   * Undefined if never edited.
   */
  editedAt: v.optional(v.number()),

  // ============================================================================
  // SOFT DELETE (ADR 0011)
  // ============================================================================

  /**
   * Soft deletion flag.
   * When true, comment is hidden from queries.
   */
  isDeleted: v.boolean(),

  /**
   * Timestamp when soft deleted.
   * Unix timestamp in milliseconds.
   */
  deletedAt: v.optional(v.number()),

  // ============================================================================
  // TIMESTAMPS
  // ============================================================================

  /**
   * Timestamp when comment was created.
   * Unix timestamp in milliseconds.
   * Used for ordering comments chronologically.
   */
  createdAt: v.number(),
})
  // ============================================================================
  // INDEXES
  // ============================================================================

  /**
   * Primary query pattern: Get all active comments for a version.
   * Used by: getCommentsByVersion query
   */
  .index("by_version_active", ["versionId", "isDeleted"])

  /**
   * Get all comments for a version (including deleted).
   * Used by: Admin/debug views, cascade soft delete
   */
  .index("by_version", ["versionId"])

  /**
   * Get comments by author (including deleted).
   * Used by: User's own comments view, permission checks
   */
  .index("by_author", ["authorId"])

  /**
   * Get active comments by author.
   * Used by: User's comment history, dashboard
   */
  .index("by_author_active", ["authorId", "isDeleted"])
```

### Field Summary

| Field | Type | Validator | Required | Notes |
|-------|------|-----------|----------|-------|
| `versionId` | Id | `v.id("artifactVersions")` | Yes | Foreign key to version |
| `authorId` | Id | `v.id("users")` | Yes | Comment creator |
| `content` | string | `v.string()` | Yes | Comment text |
| `resolved` | boolean | `v.boolean()` | Yes | Thread resolution status |
| `resolvedBy` | Id | `v.optional(v.id("users"))` | No | Who last resolved (audit trail) |
| `resolvedAt` | number | `v.optional(v.number())` | No | When last resolved (audit trail) |
| `targetSchemaVersion` | number | `v.number()` | Yes | Version of target metadata format |
| `target` | any | `v.any()` | Yes | Opaque JSON for target location |
| `isEdited` | boolean | `v.boolean()` | Yes | Has been edited |
| `editedAt` | number | `v.optional(v.number())` | No | Last edit timestamp |
| `isDeleted` | boolean | `v.boolean()` | Yes | Soft delete flag |
| `deletedAt` | number | `v.optional(v.number())` | No | Deletion timestamp |
| `createdAt` | number | `v.number()` | Yes | Creation timestamp |

**Reduced from 17 fields to 13 fields** - cleaner, backend-focused schema.

---

## Target Metadata Schema

The `target` field is a versioned JSON blob. The frontend defines, owns, and interprets this structure. The backend simply stores and returns it.

### Version 1: Initial Schema

```typescript
// Frontend type definition (NOT in Convex schema)
// File: app/src/components/comments/targetSchema.ts

/**
 * Target metadata schema version 1.
 * Supports HTML artifacts (single file, ZIP multi-page).
 */
interface TargetMetadataV1 {
  // ============================================================================
  // WHAT was commented on
  // ============================================================================

  /**
   * Type of target.
   * - "text": A text selection
   * - "element": A UI element (button, image, heading, etc.)
   * - "general": Comment on the whole page/artifact (no specific target)
   */
  type: "text" | "element" | "general";

  /**
   * The selected/highlighted text (for type="text").
   * Stored for display in comment card.
   */
  selectedText?: string;

  /**
   * Element category (for type="element").
   * e.g., "button", "heading", "image", "section", "text"
   */
  elementType?: string;

  /**
   * Element identifier (for type="element").
   * Typically a DOM id, data attribute, or generated selector.
   */
  elementId?: string;

  /**
   * Human-readable preview of the element (for type="element").
   * e.g., "Submit Button", "Hero Image"
   */
  elementPreview?: string;

  // ============================================================================
  // WHERE in the artifact
  // ============================================================================

  /**
   * Page path for multi-page artifacts (ZIP bundles).
   * e.g., "/index.html", "/about/team.html"
   * Null/undefined for single-page HTML or Markdown.
   */
  page?: string;

  /**
   * Location context for hidden content (tabs, accordions, etc.).
   */
  location?: {
    /**
     * Type of container.
     * - "tab": Inside a tab panel
     * - "accordion": Inside an accordion/collapsible
     * - "modal": Inside a modal/dialog
     * - "visible": Always visible (default)
     */
    containerType: "tab" | "accordion" | "modal" | "visible";

    /**
     * Label of the container (e.g., tab name, accordion title).
     */
    containerLabel?: string;

    /**
     * Whether the content is currently hidden.
     * True if in inactive tab, collapsed accordion, etc.
     */
    isHidden?: boolean;
  };

  // ============================================================================
  // ARTIFACT TYPE EXTENSIONS (for future)
  // ============================================================================

  /**
   * Markdown-specific targeting (reserved for future).
   * Could include: heading anchor, line range, code block identifier.
   */
  markdown?: {
    headingAnchor?: string;
    lineStart?: number;
    lineEnd?: number;
    codeBlockId?: string;
  };
}
```

### How to Use Versions

```typescript
// Frontend: Creating a comment
const target: TargetMetadataV1 = {
  type: "text",
  selectedText: "Click here to learn more",
  page: "/faq.html",
  location: {
    containerType: "accordion",
    containerLabel: "FAQ Section 3",
    isHidden: true,
  },
};

// When calling the mutation
await createComment({
  versionId,
  content: "This link doesn't work",
  targetSchemaVersion: 1,
  target,  // Stored as-is
});

// Frontend: Reading a comment
const comment = await getComment(commentId);

if (comment.targetSchemaVersion === 1) {
  const target = comment.target as TargetMetadataV1;
  // Now TypeScript knows the structure
  if (target.type === "text") {
    showHighlightedText(target.selectedText);
  }
}
```

---

## Concrete Examples

### Example 1: HTML Text Selection Comment

**Scenario:** User selects text "Contact our support team" on a single-page HTML artifact.

```typescript
// Stored in database
{
  _id: "abc123",
  versionId: "version456",
  authorId: "user789",
  content: "This should be a clickable email link",
  resolved: false,
  targetSchemaVersion: 1,
  target: {
    type: "text",
    selectedText: "Contact our support team",
    page: null,  // Single-page HTML, no path
    location: {
      containerType: "visible",
      isHidden: false,
    },
  },
  isEdited: false,
  isDeleted: false,
  createdAt: 1703808000000,
}
```

### Example 2: HTML Element Comment (in a Tab)

**Scenario:** User comments on a button inside a tab panel in a ZIP bundle.

```typescript
// Stored in database
{
  _id: "def456",
  versionId: "version456",
  authorId: "user789",
  content: "Button color should be blue per brand guidelines",
  resolved: false,
  targetSchemaVersion: 1,
  target: {
    type: "element",
    elementType: "button",
    elementId: "submit-form-btn",
    elementPreview: "Submit Application",
    page: "/apply/step2.html",
    location: {
      containerType: "tab",
      containerLabel: "Personal Info",
      isHidden: false,
    },
  },
  isEdited: false,
  isDeleted: false,
  createdAt: 1703808000000,
}
```

### Example 3: Markdown Comment (Future)

**Scenario:** User comments on a code block in a Markdown artifact.

```typescript
// Stored in database
{
  _id: "ghi789",
  versionId: "version456",
  authorId: "user789",
  content: "This code example has a syntax error",
  resolved: false,
  targetSchemaVersion: 1,
  target: {
    type: "element",
    elementType: "code-block",
    elementPreview: "```javascript\nconst x = ...\n```",
    markdown: {
      codeBlockId: "code-block-3",
      lineStart: 15,
      lineEnd: 22,
    },
  },
  isEdited: false,
  isDeleted: false,
  createdAt: 1703808000000,
}
```

### Example 4: General Page Comment

**Scenario:** User comments on the overall page without a specific target.

```typescript
// Stored in database
{
  _id: "jkl012",
  versionId: "version456",
  authorId: "user789",
  content: "The overall layout looks cluttered",
  resolved: true,
  targetSchemaVersion: 1,
  target: {
    type: "general",
    page: "/index.html",
  },
  isEdited: false,
  isDeleted: false,
  createdAt: 1703808000000,
}
```

---

## Tradeoffs

### What We Gain

| Benefit | Description |
|---------|-------------|
| **Flexibility** | Frontend can evolve target schema without backend changes |
| **Artifact-agnostic** | Same backend works for HTML, Markdown, PDF, etc. |
| **Simpler schema** | 13 fields instead of 17 |
| **No field bloat** | No unused optional fields for different artifact types |
| **Frontend ownership** | Clear separation of concerns |
| **Version support** | Can introduce breaking changes with new schema versions |

### What We Lose

| Tradeoff | Mitigation |
|----------|------------|
| **No server-side validation of target** | Frontend validates before sending; backend validates `targetSchemaVersion` is a number and `target` is an object |
| **No indexing on target fields** | If we need to query "all comments on page X", we cannot use an index. See mitigation below. |
| **Type safety in backend** | Backend treats `target` as opaque; only frontend has type definitions |
| **Backend cannot filter by target properties** | Fetch all comments for version, filter in frontend |

### Mitigation: What if we need to query by page?

If we discover that querying by page is critical (e.g., "show comments for this page only" in multi-page ZIPs), we have options:

**Option A: Add a `page` field at top level**

```typescript
comments: defineTable({
  // ... other fields ...

  /**
   * Page path extracted from target for indexing.
   * Null for single-page artifacts.
   * Duplicates target.page but enables efficient queries.
   */
  page: v.optional(v.string()),

  target: v.any(),
})
  .index("by_version_page_active", ["versionId", "page", "isDeleted"])
```

This is **denormalization** - storing `page` twice for query performance.

**Option B: Client-side filtering**

For most use cases, fetching all comments for a version and filtering by page client-side is acceptable:

```typescript
const allComments = await getCommentsByVersion(versionId);
const pageComments = allComments.filter(c => c.target.page === currentPage);
```

**Recommendation:** Start with Option B. If performance becomes an issue, add `page` as a top-level field later. The JSON approach doesn't prevent this evolution.

---

## Schema Versioning Strategy

### Version Number Semantics

| Version | Meaning |
|---------|---------|
| 1 | Initial schema - HTML text/element targeting |
| 2 | (Future) Markdown-specific fields |
| 3 | (Future) PDF annotation support |

### Frontend Version Handling

```typescript
// app/src/lib/comments/targetParser.ts

import { TargetMetadataV1 } from "./schemas/v1";
// import { TargetMetadataV2 } from "./schemas/v2";  // Future

export type TargetMetadata = TargetMetadataV1; // | TargetMetadataV2

export function parseTarget(
  schemaVersion: number,
  target: unknown
): TargetMetadata {
  switch (schemaVersion) {
    case 1:
      return target as TargetMetadataV1;

    // case 2:
    //   return migrateV1toV2(target as TargetMetadataV1);

    default:
      console.warn(`Unknown target schema version: ${schemaVersion}`);
      // Fallback: return as v1 with best effort
      return target as TargetMetadataV1;
  }
}

// Future: Migration function
// function migrateV1toV2(v1: TargetMetadataV1): TargetMetadataV2 {
//   return {
//     ...v1,
//     newFieldInV2: computeDefault(v1),
//   };
// }
```

### Version Migration Philosophy

1. **Backward compatible by default**: New optional fields don't require version bump
2. **Bump version for breaking changes**: Required fields, renamed fields, structural changes
3. **Client handles migrations**: Old comments with v1 are interpreted by current frontend
4. **No server-side migrations**: Backend stores what frontend sends, returns it unchanged

### Current Version: 1

For Phase 2 implementation, use `targetSchemaVersion: 1` with the structure defined in [Target Metadata Schema](#target-metadata-schema).

---

## Comment Replies Table

Replies remain simple - they don't have target metadata (they inherit the parent comment's target).

```typescript
// convex/schema.ts

commentReplies: defineTable({
  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  /**
   * Reference to the parent comment.
   * Replies always belong to exactly one comment.
   */
  commentId: v.id("comments"),

  /**
   * Reference to the user who created the reply.
   * Used for permission checks (author can edit/delete their own).
   */
  authorId: v.id("users"),

  // ============================================================================
  // CONTENT
  // ============================================================================

  /**
   * The reply text content.
   * Required, non-empty.
   */
  content: v.string(),

  // ============================================================================
  // EDIT TRACKING
  // ============================================================================

  /**
   * Whether the reply has been edited after creation.
   * Used to show "edited" indicator in UI.
   */
  isEdited: v.boolean(),

  /**
   * Timestamp of the last edit.
   * Unix timestamp in milliseconds.
   * Undefined if never edited.
   */
  editedAt: v.optional(v.number()),

  // ============================================================================
  // SOFT DELETE (ADR 0011)
  // ============================================================================

  /**
   * Soft deletion flag.
   * When true, reply is hidden from queries.
   */
  isDeleted: v.boolean(),

  /**
   * Timestamp when soft deleted.
   * Unix timestamp in milliseconds.
   */
  deletedAt: v.optional(v.number()),

  // ============================================================================
  // TIMESTAMPS
  // ============================================================================

  /**
   * Timestamp when reply was created.
   * Unix timestamp in milliseconds.
   * Used for ordering replies chronologically.
   */
  createdAt: v.number(),
})
  // ============================================================================
  // INDEXES
  // ============================================================================

  /**
   * Primary query pattern: Get all active replies for a comment.
   * Used by: getCommentsByVersion query (to assemble full comments)
   */
  .index("by_comment_active", ["commentId", "isDeleted"])

  /**
   * Get all replies for a comment (including deleted).
   * Used by: Admin/debug views, cascade soft delete
   */
  .index("by_comment", ["commentId"])

  /**
   * Get replies by author (including deleted).
   * Used by: Permission checks
   */
  .index("by_author", ["authorId"])

  /**
   * Get active replies by author.
   * Used by: User's activity history
   */
  .index("by_author_active", ["authorId", "isDeleted"])
```

### Field Summary

| Field | Type | Validator | Required | Notes |
|-------|------|-----------|----------|-------|
| `commentId` | Id | `v.id("comments")` | Yes | Foreign key to comment |
| `authorId` | Id | `v.id("users")` | Yes | Reply creator |
| `content` | string | `v.string()` | Yes | Reply text |
| `isEdited` | boolean | `v.boolean()` | Yes | Has been edited |
| `editedAt` | number | `v.optional(v.number())` | No | Last edit timestamp |
| `isDeleted` | boolean | `v.boolean()` | Yes | Soft delete flag |
| `deletedAt` | number | `v.optional(v.number())` | No | Deletion timestamp |
| `createdAt` | number | `v.number()` | Yes | Creation timestamp |

---

## Index Strategy

### Comments Table Indexes

| Index Name | Fields | Query Pattern | Usage |
|------------|--------|---------------|-------|
| `by_version_active` | `[versionId, isDeleted]` | Get active comments for viewer | Primary query for comment panel |
| `by_version` | `[versionId]` | Get all comments (including deleted) | Admin views, cascade delete |
| `by_author` | `[authorId]` | Get user's comments | Activity history |
| `by_author_active` | `[authorId, isDeleted]` | Get user's active comments | Dashboard, permission checks |

### Comment Replies Table Indexes

| Index Name | Fields | Query Pattern | Usage |
|------------|--------|---------------|-------|
| `by_comment_active` | `[commentId, isDeleted]` | Get active replies for a comment | Primary query when loading comments |
| `by_comment` | `[commentId]` | Get all replies (including deleted) | Cascade soft delete |
| `by_author` | `[authorId]` | Get user's replies | Activity history |
| `by_author_active` | `[authorId, isDeleted]` | Get user's active replies | Dashboard |

### Why No Index on Target Fields?

The `target` field is `v.any()` (JSON blob). Convex cannot index into JSON structures. This is an intentional tradeoff:

| Query Need | Solution |
|------------|----------|
| Comments for a version | Use `by_version_active` index |
| Comments by page (multi-page ZIP) | Fetch all version comments, filter client-side |
| Comments by element type | Fetch all version comments, filter client-side |

If client-side filtering becomes a performance issue, we can add denormalized top-level fields (e.g., `page`) with indexes.

---

## Permission Model

Commenting requires authentication. Only two roles exist for comment operations.

### Roles

| Role | Code | Description |
|------|------|-------------|
| Owner | `"owner"` | Creator of the artifact |
| Reviewer | `"can-comment"` | Invited collaborator with commenting permission |

### Permission Matrix: Comments

| Action | Owner | Reviewer |
|--------|-------|----------|
| **View comments** | Yes | Yes |
| **Create comment** | Yes | Yes |
| **Edit own comment** | Yes | Yes |
| **Delete own comment** | Yes | Yes |
| **Delete any comment** | Yes | No |
| **Resolve/Unresolve** | Yes | Yes |

### Permission Matrix: Replies

| Action | Owner | Reviewer |
|--------|-------|----------|
| **View replies** | Yes | Yes |
| **Create reply** | Yes | Yes |
| **Edit own reply** | Yes | Yes |
| **Delete own reply** | Yes | Yes |
| **Delete any reply** | Yes | No |

### Permission Rules

1. **Viewing:** Both owner and reviewers can view all comments and replies
2. **Creating:** Both owner and reviewers can create comments and replies
3. **Editing:** Only the author can edit their own content (owner cannot edit others' content)
4. **Deleting own:** Any author can delete their own comment or reply
5. **Deleting any:** Only the artifact owner can delete other users' comments/replies (moderation)
6. **Resolving:** Both owner and reviewers can toggle resolution status

### Resolution Tracking

When a user toggles `resolved` to `true`:
- `resolvedBy` is set to the current user's ID
- `resolvedAt` is set to the current timestamp

When a user toggles `resolved` to `false`:
- `resolvedBy` is cleared (`undefined`)
- `resolvedAt` is cleared (`undefined`)

If the same or different user re-resolves the comment later, `resolvedBy` and `resolvedAt` update to reflect the latest resolution.

### Permission Check Examples

```typescript
// convex/lib/commentPermissions.ts

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Check if user can create/reply on this artifact version.
 * Returns the permission level or throws if unauthorized.
 */
export async function requireCommentPermission(
  ctx: QueryCtx | MutationCtx,
  versionId: Id<"artifactVersions">
): Promise<"owner" | "can-comment"> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required to comment");
  }

  // Get version and parent artifact
  const version = await ctx.db.get(versionId);
  if (!version || version.isDeleted) {
    throw new Error("Version not found");
  }

  const artifact = await ctx.db.get(version.artifactId);
  if (!artifact || artifact.isDeleted) {
    throw new Error("Artifact not found");
  }

  // Check if owner
  if (artifact.creatorId === userId) {
    return "owner";
  }

  // Check if invited reviewer
  const reviewer = await ctx.db
    .query("artifactReviewers")
    .withIndex("by_artifact_active", (q) =>
      q.eq("artifactId", artifact._id).eq("isDeleted", false)
    )
    .filter((q) => q.eq(q.field("userId"), userId))
    .first();

  if (reviewer) {
    return "can-comment";
  }

  throw new Error("You don't have permission to comment on this artifact");
}

/**
 * Check if user can edit a comment/reply.
 * Only the author can edit their own content.
 */
export function canEdit(
  authorId: Id<"users">,
  userId: Id<"users">
): boolean {
  return authorId === userId;
}

/**
 * Check if user can delete a comment/reply.
 * Author can delete their own; artifact owner can delete any.
 */
export async function canDelete(
  ctx: QueryCtx | MutationCtx,
  authorId: Id<"users">,
  versionId: Id<"artifactVersions">,
  userId: Id<"users">
): Promise<boolean> {
  // Author can always delete their own
  if (authorId === userId) {
    return true;
  }

  // Check if user is artifact owner
  const version = await ctx.db.get(versionId);
  if (!version) return false;

  const artifact = await ctx.db.get(version.artifactId);
  if (!artifact) return false;

  return artifact.creatorId === userId;
}
```

---

## Migration Notes

### Impact on Existing Schema

**No changes to existing tables.** The commenting feature adds two new tables:

| Table | Status | Impact |
|-------|--------|--------|
| `users` | Unchanged | Referenced by `authorId` |
| `artifacts` | Unchanged | Referenced indirectly via versions |
| `artifactVersions` | Unchanged | Referenced by `versionId` |
| `artifactFiles` | Unchanged | No relation |
| `artifactReviewers` | Unchanged | Used for permission checks |
| `comments` | **NEW** | Added |
| `commentReplies` | **NEW** | Added |

### Full Schema Addition

Add to `convex/schema.ts`:

```typescript
const schema = defineSchema({
  ...authTables,

  // ... existing tables (users, artifacts, artifactVersions, etc.) ...

  // ============================================================================
  // COMMENTS TABLE
  // ============================================================================
  /**
   * Comments on artifact versions.
   *
   * Target location is stored as versioned JSON for flexibility.
   * See: tasks/00017-implement-commenting/02-phase-2-backend/schema.md
   */
  comments: defineTable({
    versionId: v.id("artifactVersions"),
    authorId: v.id("users"),
    content: v.string(),
    resolved: v.boolean(),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    targetSchemaVersion: v.number(),
    target: v.any(),
    isEdited: v.boolean(),
    editedAt: v.optional(v.number()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_version_active", ["versionId", "isDeleted"])
    .index("by_version", ["versionId"])
    .index("by_author", ["authorId"])
    .index("by_author_active", ["authorId", "isDeleted"]),

  // ============================================================================
  // COMMENT REPLIES TABLE
  // ============================================================================
  /**
   * Replies to comments (first-class entities for independent CRUD).
   * See: tasks/00017-implement-commenting/02-phase-2-backend/schema.md
   */
  commentReplies: defineTable({
    commentId: v.id("comments"),
    authorId: v.id("users"),
    content: v.string(),
    isEdited: v.boolean(),
    editedAt: v.optional(v.number()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_comment_active", ["commentId", "isDeleted"])
    .index("by_comment", ["commentId"])
    .index("by_author", ["authorId"])
    .index("by_author_active", ["authorId", "isDeleted"]),
});
```

### Frontend Type Definitions

Create a new file for target schema types:

```typescript
// app/src/lib/comments/targetSchema.ts

/**
 * Target metadata version 1 - HTML/Markdown targeting
 */
export interface TargetMetadataV1 {
  type: "text" | "element" | "general";
  selectedText?: string;
  elementType?: string;
  elementId?: string;
  elementPreview?: string;
  page?: string;
  location?: {
    containerType: "tab" | "accordion" | "modal" | "visible";
    containerLabel?: string;
    isHidden?: boolean;
  };
  markdown?: {
    headingAnchor?: string;
    lineStart?: number;
    lineEnd?: number;
    codeBlockId?: string;
  };
}

export type TargetMetadata = TargetMetadataV1;

export const CURRENT_TARGET_SCHEMA_VERSION = 1;
```

---

## Summary

### v2 Schema Changes

| Change | Before (v1) | After (v2) |
|--------|-------------|------------|
| Target fields | 8 separate fields | 1 JSON field + version |
| Field count | 17 | 13 |
| Backend responsibility | Interpret target data | Store/retrieve opaque JSON |
| Frontend responsibility | Use backend fields | Own target schema entirely |
| Flexibility | Add new field = schema change | Add to JSON = no backend change |
| Indexing | Could index any field | Cannot index JSON internals |
| Multi-format support | HTML-specific | Ready for Markdown, PDF, etc. |

### Key Design Principles

1. **Backend owns lifecycle:** Relationships, content, editing, deletion, timestamps
2. **Frontend owns targeting:** Where the comment points, how to display it
3. **Version for evolution:** `targetSchemaVersion` allows breaking changes
4. **Start simple, add if needed:** No page index yet, add later if required

### Next Steps

Once approved, proceed to:
- Subtask 2.2: Implement CRUD operations
- Subtask 2.3: Add permission checks
- Subtask 2.4: Write tests
- Create `app/src/lib/comments/targetSchema.ts` for frontend type definitions
