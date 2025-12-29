# Comments Schema

**Task:** 00017 - Implement Commenting | **Phase:** 2 - Build Backend | **Date:** 2025-12-28

---

## Overview

Two tables for collaborative commenting on artifact versions:
- **`comments`** - Top-level comments with versioned JSON target metadata
- **`commentReplies`** - Replies to comments (separate table for independent CRUD)

**Key Principle:** Backend stores/retrieves; frontend interprets targeting. The `target` field is an opaque JSON blob owned by the frontend.

---

## Schema Definition

### Comments Table

```typescript
// convex/schema.ts

comments: defineTable({
  // === RELATIONSHIPS ===
  versionId: v.id("artifactVersions"),  // Which version this comment is on
  authorId: v.id("users"),               // Who created the comment

  // === CONTENT ===
  content: v.string(),                   // Comment text (required)
  resolved: v.boolean(),                 // Thread resolution status
  resolvedBy: v.optional(v.id("users")), // Who last resolved (audit)
  resolvedAt: v.optional(v.number()),    // When last resolved (audit)

  // === TARGET (frontend-owned JSON) ===
  targetSchemaVersion: v.number(),       // Version of target format (currently: 1)
  target: v.any(),                       // Opaque JSON - see TargetMetadataV1

  // === EDIT TRACKING ===
  isEdited: v.boolean(),                 // Has been edited after creation
  editedAt: v.optional(v.number()),      // Last edit timestamp

  // === SOFT DELETE (ADR 0011) ===
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),

  // === TIMESTAMPS ===
  createdAt: v.number(),
})
  .index("by_version_active", ["versionId", "isDeleted"])  // Primary query
  .index("by_version", ["versionId"])                       // Cascade delete
  .index("by_author", ["authorId"])                         // User's comments
  .index("by_author_active", ["authorId", "isDeleted"])     // User dashboard
```

### Comment Replies Table

```typescript
// convex/schema.ts

commentReplies: defineTable({
  // === RELATIONSHIPS ===
  commentId: v.id("comments"),   // Parent comment
  authorId: v.id("users"),       // Who created the reply

  // === CONTENT ===
  content: v.string(),           // Reply text (required)

  // === EDIT TRACKING ===
  isEdited: v.boolean(),
  editedAt: v.optional(v.number()),

  // === SOFT DELETE (ADR 0011) ===
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),

  // === TIMESTAMPS ===
  createdAt: v.number(),
})
  .index("by_comment_active", ["commentId", "isDeleted"])  // Primary query
  .index("by_comment", ["commentId"])                       // Cascade delete
  .index("by_author", ["authorId"])
  .index("by_author_active", ["authorId", "isDeleted"])
```

---

## Design Principles

### 1. Versioned JSON for Target Metadata

**Why:** Target location is frontend-specific (DOM elements, text selections, page paths). Using opaque JSON lets frontend evolve targeting without backend changes. Supports HTML, Markdown, and future formats with one schema.

**Current Version:** `targetSchemaVersion: 1`

```typescript
// app/src/lib/comments/targetSchema.ts (frontend type)

interface TargetMetadataV1 {
  // What was commented on
  type: "text" | "element" | "general";
  selectedText?: string;      // For text selections
  elementType?: string;       // "button", "heading", "image", etc.
  elementId?: string;         // DOM id or selector
  elementPreview?: string;    // Human-readable preview

  // Where in the artifact
  page?: string;              // For multi-page ZIPs: "/about.html"
  location?: {
    containerType: "tab" | "accordion" | "modal" | "visible";
    containerLabel?: string;
    isHidden?: boolean;
  };

  // Future extensions
  markdown?: {
    headingAnchor?: string;
    lineStart?: number;
    lineEnd?: number;
    codeBlockId?: string;
  };
}
```

**Version Rules:**
- New optional fields = no version bump
- Breaking changes = bump version, frontend handles migration
- Backend never interprets target content

### 2. Separate Tables for Replies

**Why:** Enables independent CRUD operations on replies (edit, delete) without modifying parent comment. Avoids array mutation issues and Convex array limits (8192).

### 3. Resolution Tracking

**Why:** Audit trail for who resolved comments and when.

**Behavior:**
- `resolved: true` -> set `resolvedBy` and `resolvedAt`
- `resolved: false` -> clear both to `undefined`
- Re-resolving updates to latest resolver

---

## Index Strategy

| Table | Index | Fields | Use Case |
|-------|-------|--------|----------|
| comments | `by_version_active` | `[versionId, isDeleted]` | Load active comments for viewer |
| comments | `by_version` | `[versionId]` | Cascade soft delete |
| comments | `by_author_active` | `[authorId, isDeleted]` | User's comment history |
| commentReplies | `by_comment_active` | `[commentId, isDeleted]` | Load replies for comment |
| commentReplies | `by_comment` | `[commentId]` | Cascade soft delete |

**Note:** Cannot index JSON fields. Filter by `target.page` client-side. If performance requires, add denormalized `page` field later.

---

## Permission Model

### Roles

| Role | Code | Who |
|------|------|-----|
| Owner | `"owner"` | Artifact creator |
| Reviewer | `"can-comment"` | Invited collaborator |

### Permissions

| Action | Owner | Reviewer |
|--------|-------|----------|
| View | Yes | Yes |
| Create | Yes | Yes |
| Edit own | Yes | Yes |
| Delete own | Yes | Yes |
| Delete any | Yes | No |
| Resolve | Yes | Yes |

**Key Rules:**
- Only author can edit their content
- Only owner can delete others' content (moderation)
- Both roles can toggle resolution

---

## Usage Examples

### Creating a Comment

```typescript
// Frontend
const target: TargetMetadataV1 = {
  type: "text",
  selectedText: "Contact our support team",
  page: "/faq.html",
  location: { containerType: "accordion", containerLabel: "FAQ Section 3" },
};

await ctx.runMutation(api.comments.create, {
  versionId,
  content: "This should be a clickable email link",
  targetSchemaVersion: 1,
  target,
});
```

### Querying Comments

```typescript
// Backend: convex/comments.ts
const comments = await ctx.db
  .query("comments")
  .withIndex("by_version_active", (q) =>
    q.eq("versionId", versionId).eq("isDeleted", false)
  )
  .collect();

// Get replies for each comment
const withReplies = await Promise.all(
  comments.map(async (comment) => ({
    ...comment,
    replies: await ctx.db
      .query("commentReplies")
      .withIndex("by_comment_active", (q) =>
        q.eq("commentId", comment._id).eq("isDeleted", false)
      )
      .order("asc")
      .collect(),
  }))
);
```

### Stored Document Example

```typescript
{
  _id: "abc123",
  versionId: "version456",
  authorId: "user789",
  content: "Button color should be blue per brand guidelines",
  resolved: false,
  resolvedBy: undefined,
  resolvedAt: undefined,
  targetSchemaVersion: 1,
  target: {
    type: "element",
    elementType: "button",
    elementId: "submit-form-btn",
    elementPreview: "Submit Application",
    page: "/apply/step2.html",
    location: { containerType: "tab", containerLabel: "Personal Info" },
  },
  isEdited: false,
  editedAt: undefined,
  isDeleted: false,
  deletedAt: undefined,
  createdAt: 1703808000000,
}
```

---

## Permission Helper Functions

```typescript
// convex/lib/commentPermissions.ts

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Require owner or reviewer permission. Throws if unauthorized. */
export async function requireCommentPermission(
  ctx: QueryCtx | MutationCtx,
  versionId: Id<"artifactVersions">
): Promise<"owner" | "can-comment"> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Authentication required");

  const version = await ctx.db.get(versionId);
  if (!version || version.isDeleted) throw new Error("Version not found");

  const artifact = await ctx.db.get(version.artifactId);
  if (!artifact || artifact.isDeleted) throw new Error("Artifact not found");

  if (artifact.creatorId === userId) return "owner";

  const reviewer = await ctx.db
    .query("artifactReviewers")
    .withIndex("by_artifact_active", (q) =>
      q.eq("artifactId", artifact._id).eq("isDeleted", false)
    )
    .filter((q) => q.eq(q.field("userId"), userId))
    .first();

  if (reviewer) return "can-comment";
  throw new Error("No permission to comment");
}

/** Only author can edit. */
export function canEdit(authorId: Id<"users">, userId: Id<"users">): boolean {
  return authorId === userId;
}

/** Author or artifact owner can delete. */
export async function canDelete(
  ctx: QueryCtx | MutationCtx,
  authorId: Id<"users">,
  versionId: Id<"artifactVersions">,
  userId: Id<"users">
): Promise<boolean> {
  if (authorId === userId) return true;

  const version = await ctx.db.get(versionId);
  if (!version) return false;

  const artifact = await ctx.db.get(version.artifactId);
  return artifact?.creatorId === userId;
}
```

---

## Frontend Type Definitions

```typescript
// app/src/lib/comments/targetSchema.ts

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

export function parseTarget(version: number, target: unknown): TargetMetadata {
  if (version === 1) return target as TargetMetadataV1;
  console.warn(`Unknown target schema version: ${version}`);
  return target as TargetMetadataV1; // Best effort fallback
}
```

---

## Migration: Add to Schema

Add to `convex/schema.ts`:

```typescript
// ============================================================================
// COMMENTS
// ============================================================================

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
```

**Impact:** No changes to existing tables. Two new tables added.

---

## Constraints & Rules

1. **Soft delete** - Follows ADR 0011 (`isDeleted` + `deletedAt`)
2. **Target is opaque** - Backend stores JSON without validation; frontend owns structure
3. **Author-only edit** - Only the comment/reply author can edit content
4. **Owner moderation** - Artifact owner can delete any comment/reply
5. **Cascade delete** - When version is deleted, soft-delete all comments and replies
6. **No filter queries** - Use `withIndex` per Convex rules; no `filter()` on queries
7. **Version for evolution** - Bump `targetSchemaVersion` for breaking JSON changes
