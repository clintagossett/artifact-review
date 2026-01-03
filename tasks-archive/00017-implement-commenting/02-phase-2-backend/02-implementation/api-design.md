# Comments API Design

**Task:** 00017 - Implement Commenting | **Subtask:** 02 - Implementation | **Date:** 2025-12-28

---

## Overview

This document defines the complete API contract for the commenting backend. All functions follow Convex rules from `docs/architecture/convex-rules.md`:

- New function syntax with `args`, `returns`, `handler`
- All validators required (use `v.null()` for void returns)
- Use `withIndex` instead of `filter` for queries
- Use `internalQuery`/`internalMutation` for private functions

---

## File Organization

```
app/convex/
├── comments.ts           # Comment operations (public)
├── commentReplies.ts     # Reply operations (public)
└── lib/
    └── commentPermissions.ts  # Permission helpers (internal)
```

---

## Permission Model

### Roles

| Role | Code | Who |
|------|------|-----|
| Owner | `"owner"` | Artifact creator (`artifact.creatorId === userId`) |
| Reviewer | `"can-comment"` | Invited collaborator (active `artifactReviewers` record) |

### Permission Matrix

| Action | Owner | Reviewer | No Auth |
|--------|-------|----------|---------|
| View comments | Yes | Yes | No |
| Create comment | Yes | Yes | No |
| Edit own comment | Yes | Yes | No |
| Edit other's comment | No | No | No |
| Delete own comment | Yes | Yes | No |
| Delete any comment | Yes | No | No |
| Resolve/Unresolve | Yes | Yes | No |

---

## Common Validators

### Reusable Validator Definitions

```typescript
// convex/lib/validators.ts (or inline in files)

import { v } from "convex/values";

// Comment document validator (for returns)
export const commentValidator = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
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
});

// Comment reply document validator (for returns)
export const replyValidator = v.object({
  _id: v.id("commentReplies"),
  _creationTime: v.number(),
  commentId: v.id("comments"),
  authorId: v.id("users"),
  content: v.string(),
  isEdited: v.boolean(),
  editedAt: v.optional(v.number()),
  isDeleted: v.boolean(),
  deletedBy: v.optional(v.id("users")),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),
});
```

---

## Comment Operations

### Location: `convex/comments.ts`

---

### getByVersion

**Purpose:** Get all active comments for an artifact version.

**Type:** `query` (public)

**Permission:** Owner or Reviewer

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireCommentPermission } from "./lib/commentPermissions";

export const getByVersion = query({
  args: {
    versionId: v.id("artifactVersions"),
  },
  returns: v.array(
    v.object({
      _id: v.id("comments"),
      _creationTime: v.number(),
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
      // Enriched author data
      author: v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
      // Reply count for display
      replyCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Verify permission (throws if unauthorized)
    await requireCommentPermission(ctx, args.versionId);

    // Get active comments using index (no filter!)
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_version_active", (q) =>
        q.eq("versionId", args.versionId).eq("isDeleted", false)
      )
      .order("asc")
      .collect();

    // Enrich with author data and reply counts
    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);

        // Count active replies
        const replies = await ctx.db
          .query("commentReplies")
          .withIndex("by_comment_active", (q) =>
            q.eq("commentId", comment._id).eq("isDeleted", false)
          )
          .collect();

        return {
          ...comment,
          author: {
            name: author?.name,
            email: author?.email,
          },
          replyCount: replies.length,
        };
      })
    );

    return enriched;
  },
});
```

**Index Used:** `by_version_active` on `["versionId", "isDeleted"]`

**Example Usage:**

```typescript
// Frontend
const comments = useQuery(api.comments.getByVersion, { versionId });

// Accessing data
comments?.map(c => ({
  id: c._id,
  author: c.author.name || c.author.email,
  content: c.content,
  resolved: c.resolved,
  target: c.target,
  replyCount: c.replyCount,
}));
```

---

### create

**Purpose:** Create a new comment on a version.

**Type:** `mutation` (public)

**Permission:** Owner or Reviewer

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireCommentPermission } from "./lib/commentPermissions";

export const create = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    content: v.string(),
    target: v.any(),  // Self-describing JSON with _version inside
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    // Verify permission
    await requireCommentPermission(ctx, args.versionId);

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Validate content
    const trimmedContent = args.content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Comment content cannot be empty");
    }
    if (trimmedContent.length > 10000) {
      throw new Error("Comment content exceeds maximum length (10000 characters)");
    }

    const now = Date.now();

    // Create comment
    const commentId = await ctx.db.insert("comments", {
      versionId: args.versionId,
      authorId: userId,
      content: trimmedContent,
      resolved: false,
      // resolvedChangedBy and resolvedChangedAt are undefined on creation
      target: args.target,
      isEdited: false,
      // editedAt is undefined on creation
      isDeleted: false,
      // deletedBy and deletedAt are undefined on creation
      createdAt: now,
    });

    return commentId;
  },
});
```

**Example Usage:**

```typescript
// Frontend
const createComment = useMutation(api.comments.create);

const handleSubmit = async () => {
  const target: TargetMetadataV1 = {
    _version: 1,
    type: "text",
    selectedText: "Contact our support team",
    page: "/faq.html",
    location: {
      containerType: "accordion",
      containerLabel: "FAQ Section 3",
    },
  };

  const commentId = await createComment({
    versionId,
    content: "This should be a clickable email link",
    target,
  });
};
```

---

### updateContent

**Purpose:** Edit a comment's content (author only).

**Type:** `mutation` (public)

**Permission:** Author of the comment (not owner of artifact)

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireCommentPermission, canEditComment } from "./lib/commentPermissions";

export const updateContent = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment has been deleted");

    // Verify user has permission to view this version
    await requireCommentPermission(ctx, comment.versionId);

    // Check if user can edit this comment (must be author)
    if (!canEditComment(comment.authorId, userId)) {
      throw new Error("Only the comment author can edit");
    }

    // Validate content
    const trimmedContent = args.content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Comment content cannot be empty");
    }
    if (trimmedContent.length > 10000) {
      throw new Error("Comment content exceeds maximum length (10000 characters)");
    }

    // Skip update if content is unchanged
    if (trimmedContent === comment.content) {
      return null;
    }

    const now = Date.now();

    // Update comment
    await ctx.db.patch(args.commentId, {
      content: trimmedContent,
      isEdited: true,
      editedAt: now,
    });

    return null;
  },
});
```

**Example Usage:**

```typescript
// Frontend
const updateComment = useMutation(api.comments.updateContent);

const handleEdit = async (commentId: Id<"comments">, newContent: string) => {
  await updateComment({ commentId, content: newContent });
};
```

---

### toggleResolved

**Purpose:** Toggle the resolved status of a comment.

**Type:** `mutation` (public)

**Permission:** Owner or Reviewer

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireCommentPermission } from "./lib/commentPermissions";

export const toggleResolved = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment has been deleted");

    // Verify permission on the version
    await requireCommentPermission(ctx, comment.versionId);

    const now = Date.now();

    // Toggle resolved status and track who/when
    await ctx.db.patch(args.commentId, {
      resolved: !comment.resolved,
      resolvedChangedBy: userId,
      resolvedChangedAt: now,
    });

    return null;
  },
});
```

**Example Usage:**

```typescript
// Frontend
const toggleResolved = useMutation(api.comments.toggleResolved);

const handleResolve = async (commentId: Id<"comments">) => {
  await toggleResolved({ commentId });
};
```

---

### softDelete

**Purpose:** Soft delete a comment and its replies.

**Type:** `mutation` (public)

**Permission:** Author or artifact Owner

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { canDeleteComment } from "./lib/commentPermissions";

export const softDelete = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment already deleted");

    // Check if user can delete (author or artifact owner)
    const canDelete = await canDeleteComment(ctx, comment, userId);
    if (!canDelete) {
      throw new Error("Only the comment author or artifact owner can delete");
    }

    const now = Date.now();

    // Soft delete comment with audit trail
    await ctx.db.patch(args.commentId, {
      isDeleted: true,
      deletedBy: userId,
      deletedAt: now,
    });

    // Cascade soft delete to all replies
    const replies = await ctx.db
      .query("commentReplies")
      .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
      .collect();

    for (const reply of replies) {
      if (!reply.isDeleted) {
        await ctx.db.patch(reply._id, {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: now,
        });
      }
    }

    return null;
  },
});
```

**Index Used:** `by_comment` on `["commentId"]` for cascade delete

**Example Usage:**

```typescript
// Frontend
const deleteComment = useMutation(api.comments.softDelete);

const handleDelete = async (commentId: Id<"comments">) => {
  if (confirm("Delete this comment and all replies?")) {
    await deleteComment({ commentId });
  }
};
```

---

## Reply Operations

### Location: `convex/commentReplies.ts`

---

### getReplies

**Purpose:** Get all active replies for a comment.

**Type:** `query` (public)

**Permission:** Owner or Reviewer (inherits from parent comment's version)

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireCommentPermission } from "./lib/commentPermissions";

export const getReplies = query({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.array(
    v.object({
      _id: v.id("commentReplies"),
      _creationTime: v.number(),
      commentId: v.id("comments"),
      authorId: v.id("users"),
      content: v.string(),
      isEdited: v.boolean(),
      editedAt: v.optional(v.number()),
      isDeleted: v.boolean(),
      deletedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      // Enriched author data
      author: v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
    })
  ),
  handler: async (ctx, args) => {
    // Get parent comment to verify permission
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Comment has been deleted");

    // Verify permission on the version
    await requireCommentPermission(ctx, comment.versionId);

    // Get active replies using index
    const replies = await ctx.db
      .query("commentReplies")
      .withIndex("by_comment_active", (q) =>
        q.eq("commentId", args.commentId).eq("isDeleted", false)
      )
      .order("asc")
      .collect();

    // Enrich with author data
    const enriched = await Promise.all(
      replies.map(async (reply) => {
        const author = await ctx.db.get(reply.authorId);
        return {
          ...reply,
          author: {
            name: author?.name,
            email: author?.email,
          },
        };
      })
    );

    return enriched;
  },
});
```

**Index Used:** `by_comment_active` on `["commentId", "isDeleted"]`

**Example Usage:**

```typescript
// Frontend
const replies = useQuery(api.commentReplies.getReplies, { commentId });

// Render replies in order
replies?.map(r => (
  <Reply key={r._id} author={r.author} content={r.content} isEdited={r.isEdited} />
));
```

---

### createReply

**Purpose:** Add a reply to a comment.

**Type:** `mutation` (public)

**Permission:** Owner or Reviewer

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireCommentPermission } from "./lib/commentPermissions";

export const createReply = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
  },
  returns: v.id("commentReplies"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get parent comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.isDeleted) throw new Error("Cannot reply to deleted comment");

    // Verify permission on the version
    await requireCommentPermission(ctx, comment.versionId);

    // Validate content
    const trimmedContent = args.content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Reply content cannot be empty");
    }
    if (trimmedContent.length > 5000) {
      throw new Error("Reply content exceeds maximum length (5000 characters)");
    }

    const now = Date.now();

    // Create reply
    const replyId = await ctx.db.insert("commentReplies", {
      commentId: args.commentId,
      authorId: userId,
      content: trimmedContent,
      isEdited: false,
      isDeleted: false,
      createdAt: now,
    });

    return replyId;
  },
});
```

**Example Usage:**

```typescript
// Frontend
const createReply = useMutation(api.commentReplies.createReply);

const handleReply = async (commentId: Id<"comments">, content: string) => {
  await createReply({ commentId, content });
};
```

---

### updateReply

**Purpose:** Edit a reply's content (author only).

**Type:** `mutation` (public)

**Permission:** Author of the reply

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireCommentPermission, canEditReply } from "./lib/commentPermissions";

export const updateReply = mutation({
  args: {
    replyId: v.id("commentReplies"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get reply
    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");
    if (reply.isDeleted) throw new Error("Reply has been deleted");

    // Get parent comment to verify permission
    const comment = await ctx.db.get(reply.commentId);
    if (!comment || comment.isDeleted) {
      throw new Error("Parent comment not found or deleted");
    }

    // Verify permission on the version
    await requireCommentPermission(ctx, comment.versionId);

    // Check if user can edit this reply (must be author)
    if (!canEditReply(reply.authorId, userId)) {
      throw new Error("Only the reply author can edit");
    }

    // Validate content
    const trimmedContent = args.content.trim();
    if (trimmedContent.length === 0) {
      throw new Error("Reply content cannot be empty");
    }
    if (trimmedContent.length > 5000) {
      throw new Error("Reply content exceeds maximum length (5000 characters)");
    }

    // Skip update if content is unchanged
    if (trimmedContent === reply.content) {
      return null;
    }

    const now = Date.now();

    // Update reply
    await ctx.db.patch(args.replyId, {
      content: trimmedContent,
      isEdited: true,
      editedAt: now,
    });

    return null;
  },
});
```

**Example Usage:**

```typescript
// Frontend
const updateReply = useMutation(api.commentReplies.updateReply);

const handleEditReply = async (replyId: Id<"commentReplies">, newContent: string) => {
  await updateReply({ replyId, content: newContent });
};
```

---

### softDeleteReply

**Purpose:** Soft delete a reply.

**Type:** `mutation` (public)

**Permission:** Author or artifact Owner

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { canDeleteReply } from "./lib/commentPermissions";

export const softDeleteReply = mutation({
  args: {
    replyId: v.id("commentReplies"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Get reply
    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");
    if (reply.isDeleted) throw new Error("Reply already deleted");

    // Get parent comment
    const comment = await ctx.db.get(reply.commentId);
    if (!comment) throw new Error("Parent comment not found");

    // Check if user can delete (author or artifact owner)
    const canDelete = await canDeleteReply(ctx, comment.versionId, reply.authorId, userId);
    if (!canDelete) {
      throw new Error("Only the reply author or artifact owner can delete");
    }

    const now = Date.now();

    // Soft delete reply with audit trail
    await ctx.db.patch(args.replyId, {
      isDeleted: true,
      deletedBy: userId,
      deletedAt: now,
    });

    return null;
  },
});
```

**Example Usage:**

```typescript
// Frontend
const deleteReply = useMutation(api.commentReplies.softDeleteReply);

const handleDeleteReply = async (replyId: Id<"commentReplies">) => {
  if (confirm("Delete this reply?")) {
    await deleteReply({ replyId });
  }
};
```

---

## Permission Helpers

### Location: `convex/lib/commentPermissions.ts`

All permission helpers are used internally and should not be exported as public functions.

---

### requireCommentPermission

**Purpose:** Verify user has owner or reviewer access to the artifact version. Throws if unauthorized.

**Returns:** `"owner" | "can-comment"`

```typescript
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Require owner or reviewer permission for a version.
 * Throws Error if unauthorized.
 *
 * @param ctx - Query or Mutation context
 * @param versionId - The artifact version to check
 * @returns "owner" or "can-comment"
 * @throws Error if not authenticated or no permission
 */
export async function requireCommentPermission(
  ctx: QueryCtx | MutationCtx,
  versionId: Id<"artifactVersions">
): Promise<"owner" | "can-comment"> {
  // Check authentication
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }

  // Get version (check not deleted)
  const version = await ctx.db.get(versionId);
  if (!version || version.isDeleted) {
    throw new Error("Version not found");
  }

  // Get artifact (check not deleted)
  const artifact = await ctx.db.get(version.artifactId);
  if (!artifact || artifact.isDeleted) {
    throw new Error("Artifact not found");
  }

  // Check if user is owner
  if (artifact.creatorId === userId) {
    return "owner";
  }

  // Check if user is an invited reviewer
  // NOTE: We use withIndex + filter here because there's no index on userId
  // The by_artifact_active index narrows the search first
  const reviewers = await ctx.db
    .query("artifactReviewers")
    .withIndex("by_artifact_active", (q) =>
      q.eq("artifactId", artifact._id).eq("isDeleted", false)
    )
    .collect();

  const isReviewer = reviewers.some((r) => r.userId === userId);
  if (isReviewer) {
    return "can-comment";
  }

  throw new Error("No permission to comment on this artifact");
}
```

**Note on Filter Usage:** The schema design doc noted `filter` usage in the example. However, the `artifactReviewers` table does not have an index including `userId`. Since reviewers per artifact is typically < 100, the in-memory filter after `withIndex` is acceptable. If this becomes a performance issue, add a `by_artifact_user` index to `artifactReviewers`.

---

### canEditComment

**Purpose:** Check if user can edit a comment (author only).

```typescript
import { Id } from "../_generated/dataModel";

/**
 * Check if user can edit a comment.
 * Only the author can edit their own comment.
 *
 * @param authorId - The comment's author
 * @param userId - The user attempting to edit
 * @returns true if user can edit
 */
export function canEditComment(
  authorId: Id<"users">,
  userId: Id<"users">
): boolean {
  return authorId === userId;
}
```

---

### canDeleteComment

**Purpose:** Check if user can delete a comment (author or artifact owner).

```typescript
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

/**
 * Check if user can delete a comment.
 * Author can delete their own comment.
 * Artifact owner can delete any comment (moderation).
 *
 * @param ctx - Query or Mutation context
 * @param comment - The comment document
 * @param userId - The user attempting to delete
 * @returns true if user can delete
 */
export async function canDeleteComment(
  ctx: QueryCtx | MutationCtx,
  comment: Doc<"comments">,
  userId: Id<"users">
): Promise<boolean> {
  // Author can always delete their own
  if (comment.authorId === userId) {
    return true;
  }

  // Check if user is artifact owner
  const version = await ctx.db.get(comment.versionId);
  if (!version) return false;

  const artifact = await ctx.db.get(version.artifactId);
  if (!artifact) return false;

  return artifact.creatorId === userId;
}
```

---

### canEditReply

**Purpose:** Check if user can edit a reply (author only).

```typescript
import { Id } from "../_generated/dataModel";

/**
 * Check if user can edit a reply.
 * Only the author can edit their own reply.
 *
 * @param authorId - The reply's author
 * @param userId - The user attempting to edit
 * @returns true if user can edit
 */
export function canEditReply(
  authorId: Id<"users">,
  userId: Id<"users">
): boolean {
  return authorId === userId;
}
```

---

### canDeleteReply

**Purpose:** Check if user can delete a reply (author or artifact owner).

```typescript
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Check if user can delete a reply.
 * Author can delete their own reply.
 * Artifact owner can delete any reply (moderation).
 *
 * @param ctx - Query or Mutation context
 * @param versionId - The artifact version (for owner lookup)
 * @param authorId - The reply's author
 * @param userId - The user attempting to delete
 * @returns true if user can delete
 */
export async function canDeleteReply(
  ctx: QueryCtx | MutationCtx,
  versionId: Id<"artifactVersions">,
  authorId: Id<"users">,
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

## Index Usage Summary

| Function | Table | Index | Fields |
|----------|-------|-------|--------|
| `getByVersion` | comments | `by_version_active` | `["versionId", "isDeleted"]` |
| `softDelete` (cascade) | commentReplies | `by_comment` | `["commentId"]` |
| `getReplies` | commentReplies | `by_comment_active` | `["commentId", "isDeleted"]` |
| `requireCommentPermission` | artifactReviewers | `by_artifact_active` | `["artifactId", "isDeleted"]` |

**No filter() usage in queries** - All queries use `withIndex` as required by Convex rules.

**Note:** The `requireCommentPermission` helper uses in-memory filtering (`.some()`) after collecting results from an indexed query. This is acceptable because:
1. The number of reviewers per artifact is typically small (< 100)
2. Adding a `by_artifact_user` index would require schema migration
3. The indexed query (`by_artifact_active`) already narrows the result set

---

## Error Handling

All functions throw descriptive errors:

| Error | Meaning |
|-------|---------|
| `"Authentication required"` | User is not logged in |
| `"Version not found"` | Version ID is invalid or deleted |
| `"Artifact not found"` | Artifact is invalid or deleted |
| `"Comment not found"` | Comment ID is invalid |
| `"Comment has been deleted"` | Attempting operation on deleted comment |
| `"Reply not found"` | Reply ID is invalid |
| `"Reply has been deleted"` | Attempting operation on deleted reply |
| `"No permission to comment on this artifact"` | User is not owner or reviewer |
| `"Only the comment author can edit"` | Non-author trying to edit |
| `"Only the comment author or artifact owner can delete"` | Unauthorized delete attempt |
| `"Comment content cannot be empty"` | Empty content after trim |
| `"Comment content exceeds maximum length"` | Content > 10000 chars |
| `"Reply content exceeds maximum length"` | Reply content > 5000 chars |

---

## Content Validation

| Type | Max Length | Validation |
|------|------------|------------|
| Comment content | 10,000 characters | Trimmed, non-empty |
| Reply content | 5,000 characters | Trimmed, non-empty |
| Target metadata | No limit | Stored as-is (v.any()) |

---

## Cascade Delete Behavior

When an artifact version is deleted, comments should be cascade-deleted. This is handled in `artifacts.softDeleteVersion`:

```typescript
// Add to artifacts.softDeleteVersion handler (after version delete):

// Cascade: Soft delete all comments for this version
const comments = await ctx.db
  .query("comments")
  .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
  .collect();

for (const comment of comments) {
  if (!comment.isDeleted) {
    await ctx.db.patch(comment._id, {
      isDeleted: true,
      deletedBy: userId,
      deletedAt: now,
    });

    // Cascade: Soft delete all replies for this comment
    const replies = await ctx.db
      .query("commentReplies")
      .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
      .collect();

    for (const reply of replies) {
      if (!reply.isDeleted) {
        await ctx.db.patch(reply._id, {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: now,
        });
      }
    }
  }
}
```

---

## Frontend Integration Notes

### Optimistic Updates

For responsive UI, consider optimistic updates for:
- `create` - Add comment to list immediately
- `toggleResolved` - Toggle UI immediately
- `softDelete` - Remove from list immediately

### Real-time Updates

Convex queries automatically re-run when data changes. Comments and replies will update in real-time across all connected clients.

### Loading States

Use Convex's loading patterns:
```typescript
const comments = useQuery(api.comments.getByVersion, { versionId });

if (comments === undefined) {
  return <Skeleton />; // Loading
}

if (comments.length === 0) {
  return <EmptyState />; // No comments
}

return <CommentList comments={comments} />;
```

---

## Testing Requirements

See `tasks/00017.../02-implementation/README.md` for TDD workflow.

### Test Cases

**Comment CRUD:**
1. Create comment with valid content and target
2. Create comment with empty content (should fail)
3. Edit own comment (should succeed)
4. Edit other's comment (should fail)
5. Delete own comment (should succeed)
6. Owner delete other's comment (should succeed)
7. Reviewer delete other's comment (should fail)

**Reply CRUD:**
1. Create reply on active comment
2. Create reply on deleted comment (should fail)
3. Edit own reply
4. Edit other's reply (should fail)
5. Delete own reply
6. Cascade delete when parent comment deleted

**Permissions:**
1. Owner can access
2. Reviewer can access
3. Non-reviewer cannot access
4. Unauthenticated cannot access

**Resolution:**
1. Toggle resolved status
2. Track resolvedChangedBy and resolvedChangedAt
3. Multiple toggles update tracking fields

**Soft Delete:**
1. Comment soft delete sets isDeleted, deletedBy, deletedAt
2. Reply cascade delete sets same fields
3. Deleted comments not returned in queries

---

## Handoff to TDD Developer

This API design is complete and ready for implementation using TDD:

1. **Schema is already designed** - See `01-schema-design/schema.md`
2. **API contracts are defined** - This document
3. **Test cases are identified** - See Testing Requirements above

**Implementation order:**
1. Add schema to `convex/schema.ts`
2. Create `convex/lib/commentPermissions.ts`
3. Create `convex/comments.ts` (TDD)
4. Create `convex/commentReplies.ts` (TDD)
5. Add cascade delete to `artifacts.softDeleteVersion`
6. Write E2E integration tests

---

## References

- Schema design: `tasks/00017-implement-commenting/02-phase-2-backend/01-schema-design/schema.md`
- Convex rules: `docs/architecture/convex-rules.md`
- Soft delete ADR: `docs/architecture/decisions/0011-soft-delete-strategy.md`
- Existing patterns: `app/convex/sharing.ts` (permission checking)
- Existing patterns: `app/convex/artifacts.ts` (cascade delete)
