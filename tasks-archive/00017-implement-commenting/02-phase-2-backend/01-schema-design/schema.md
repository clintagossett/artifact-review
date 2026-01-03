# Comments Schema

**Task:** 00017 - Implement Commenting | **Phase:** 2 - Build Backend | **Date:** 2025-12-28

---

## Overview

Two tables for collaborative commenting on artifact versions:
- **`comments`** - Top-level comments with self-describing JSON target metadata (13 fields)
- **`commentReplies`** - Replies to comments (separate table for independent CRUD) (9 fields)

**Key Principle:** Backend stores/retrieves; frontend interprets targeting. The `target` field is a self-describing opaque JSON blob owned by the frontend, containing its own `_version` field.

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

  // === RESOLUTION STATE ===
  resolved: v.boolean(),                         // Current resolution status
  resolvedChangedBy: v.optional(v.id("users")),  // Who last changed resolved status
  resolvedChangedAt: v.optional(v.number()),     // When resolved status last changed

  // === TARGET (self-describing JSON) ===
  target: v.any(),  // Opaque JSON with _version inside - see TargetMetadataV1

  // === EDIT TRACKING ===
  isEdited: v.boolean(),                 // Has been edited after creation
  editedAt: v.optional(v.number()),      // Last edit timestamp

  // === SOFT DELETE (ADR 0011) ===
  isDeleted: v.boolean(),                // Soft deletion flag
  deletedBy: v.optional(v.id("users")),  // Who soft deleted (audit)
  deletedAt: v.optional(v.number()),     // When soft deleted

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
  isDeleted: v.boolean(),                // Soft deletion flag
  deletedBy: v.optional(v.id("users")),  // Who soft deleted (audit)
  deletedAt: v.optional(v.number()),     // When soft deleted

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

### 1. Self-Describing JSON for Target Metadata

**Why version is inside target:**
- **Consistency:** Backend truly doesn't interpret, so version belongs with the data
- **Self-describing:** Version and data travel together as one unit
- **Simpler schema:** Fewer top-level fields

**Current Version:** `_version: 1` (inside target JSON)

```typescript
// app/src/lib/comments/targetSchema.ts (frontend type)

interface TargetMetadataV1 {
  _version: 1;  // Required - identifies schema version

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
- Breaking changes = bump `_version`, frontend handles migration
- Backend never interprets target content

### 2. Separate Tables for Replies

**Why:** Enables independent CRUD operations on replies (edit, delete) without modifying parent comment. Avoids array mutation issues and Convex array limits (8192).

### 3. Resolution State Tracking

**Why:** Full audit trail for who changed resolution status and when, for both resolve AND unresolve actions.

**Naming Convention:**
- `resolvedChangedBy` / `resolvedChangedAt` uses "Changed" because:
  - We're tracking a state **change** (toggle), not an edit to content
  - "Changed" is accurate for both resolve and unresolve actions
  - Matches common patterns (SAP uses `changedBy/At`)
  - More precise than "modified" or "edited" which imply content changes

**Behavior:**
- On creation: `resolved: false`, both tracking fields are `undefined`
- On first toggle (resolve): set `resolvedChangedBy` and `resolvedChangedAt`
- On subsequent toggles (resolve or unresolve): update both fields to current user/time
- Fields are NEVER cleared once set - they always reflect the last change

**Example Timeline:**
```
1. Comment created:     resolved=false, changedBy=undefined, changedAt=undefined
2. Alice resolves:      resolved=true,  changedBy=Alice,     changedAt=T1
3. Bob unresolves:      resolved=false, changedBy=Bob,       changedAt=T2
4. Alice re-resolves:   resolved=true,  changedBy=Alice,     changedAt=T3
```

### 4. Soft Delete Audit Trail

**Why:** Consistency with resolution tracking - track who deleted and when for audit purposes.

**Behavior:**
- On soft delete: set `isDeleted: true`, `deletedBy`, and `deletedAt`
- On restore (if implemented): clear all three fields (`isDeleted: false`, others `undefined`)

**Example:**
```typescript
// Soft delete
await ctx.db.patch(commentId, {
  isDeleted: true,
  deletedBy: userId,
  deletedAt: Date.now(),
});

// Restore (if needed)
await ctx.db.patch(commentId, {
  isDeleted: false,
  deletedBy: undefined,
  deletedAt: undefined,
});
```

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
| Resolve/Unresolve | Yes | Yes |

**Key Rules:**
- Only author can edit their content
- Only owner can delete others' content (moderation)
- Both roles can toggle resolution status

---

## Usage Examples

### Creating a Comment

```typescript
// Frontend
const target: TargetMetadataV1 = {
  _version: 1,
  type: "text",
  selectedText: "Contact our support team",
  page: "/faq.html",
  location: { containerType: "accordion", containerLabel: "FAQ Section 3" },
};

await ctx.runMutation(api.comments.create, {
  versionId,
  content: "This should be a clickable email link",
  target,
});
```

### Toggling Resolution

```typescript
// Backend: convex/comments.ts
export const toggleResolved = mutation({
  args: { commentId: v.id("comments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    await ctx.db.patch(args.commentId, {
      resolved: !comment.resolved,
      resolvedChangedBy: userId,
      resolvedChangedAt: now,
    });
  },
});
```

### Soft Deleting a Comment

```typescript
// Backend: convex/comments.ts
export const softDelete = mutation({
  args: { commentId: v.id("comments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    // Verify permission (author or owner can delete)
    const canDeleteComment = await canDelete(ctx, comment.authorId, comment.versionId, userId);
    if (!canDeleteComment) throw new Error("No permission to delete");

    await ctx.db.patch(args.commentId, {
      isDeleted: true,
      deletedBy: userId,
      deletedAt: now,
    });
  },
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
// Newly created comment (never resolved, not deleted)
{
  _id: "abc123",
  versionId: "version456",
  authorId: "user789",
  content: "Button color should be blue per brand guidelines",
  resolved: false,
  resolvedChangedBy: undefined,
  resolvedChangedAt: undefined,
  target: {
    _version: 1,
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
  deletedBy: undefined,
  deletedAt: undefined,
  createdAt: 1703808000000,
}

// After being resolved, then unresolved by different user
{
  _id: "abc123",
  // ... same fields ...
  resolved: false,                    // Currently unresolved
  resolvedChangedBy: "user456",       // Bob unresolved it
  resolvedChangedAt: 1703894400000,   // When Bob unresolved
  // ... same fields ...
}

// After being soft deleted by artifact owner
{
  _id: "abc123",
  // ... same fields ...
  isDeleted: true,
  deletedBy: "owner123",              // Owner deleted it
  deletedAt: 1703980800000,           // When deleted
  // ... same fields ...
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
  _version: 1;
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
export const CURRENT_TARGET_VERSION = 1;

export function parseTarget(target: unknown): TargetMetadata {
  const t = target as { _version?: number };
  if (t._version === 1) return target as TargetMetadataV1;
  console.warn(`Unknown target version: ${t._version}`);
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
  resolvedChangedBy: v.optional(v.id("users")),
  resolvedChangedAt: v.optional(v.number()),
  target: v.any(),
  isEdited: v.boolean(),
  editedAt: v.optional(v.number()),
  isDeleted: v.boolean(),
  deletedBy: v.optional(v.id("users")),
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
  deletedBy: v.optional(v.id("users")),
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

1. **Soft delete with audit** - Follows ADR 0011 (`isDeleted` + `deletedBy` + `deletedAt`)
2. **Target is self-describing** - Contains `_version` field; backend stores without validation
3. **Author-only edit** - Only the comment/reply author can edit content
4. **Owner moderation** - Artifact owner can delete any comment/reply
5. **Cascade delete** - When version is deleted, soft-delete all comments and replies
6. **No filter queries** - Use `withIndex` per Convex rules; no `filter()` on queries
7. **Version inside JSON** - Bump `target._version` for breaking changes
8. **Resolution tracking persists** - `resolvedChangedBy/At` are never cleared, always reflect last change
9. **Delete tracking clears on restore** - `deletedBy/At` are cleared when `isDeleted` becomes `false`
