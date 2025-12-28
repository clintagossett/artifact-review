# Subtask 2.2: Comment CRUD Operations

**Parent:** Phase 2 - Build Backend
**Status:** Not Started
**Prerequisites:** Subtask 2.1 (Schema Design)

---

## Objective

Implement all comment queries and mutations in `convex/comments.ts` following Convex rules.

---

## Deliverables

- [ ] `convex/comments.ts` created
- [ ] All queries implemented with validators
- [ ] All mutations implemented with validators
- [ ] Follows Convex function syntax (args, returns, handler)

---

## Functions to Implement

### Queries

#### `getByVersion`
```typescript
export const getByVersion = query({
  args: {
    versionId: v.id("artifactVersions"),
  },
  returns: v.array(v.object({...})),
  handler: async (ctx, args) => {
    // Fetch all comments for a version (including replies)
  },
});
```

**Returns:** Array of comments with author info, replies nested

---

### Mutations

#### `create`
```typescript
export const create = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    content: v.string(),
    targetType: v.union(v.literal("text"), v.literal("element")),
    highlightedText: v.optional(v.string()),
    elementType: v.optional(v.string()),
    elementId: v.optional(v.string()),
    elementPreview: v.optional(v.string()),
    page: v.optional(v.string()),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    // Create new comment
  },
});
```

**Validates:**
- User is authenticated
- User has `can-comment` or `owner` permission

#### `addReply`
```typescript
export const addReply = mutation({
  args: {
    parentCommentId: v.id("comments"),
    content: v.string(),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    // Add reply to existing comment
  },
});
```

#### `toggleResolved`
```typescript
export const toggleResolved = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Toggle resolved status
  },
});
```

#### `delete`
```typescript
export const delete = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete comment (author only)
  },
});
```

---

## Convex Rules Checklist

- [ ] All functions use new syntax: `args`, `returns`, `handler`
- [ ] All args have validators
- [ ] All returns have validators (use `v.null()` for void)
- [ ] No `filter` in queries - use indexes with `withIndex`
- [ ] Permission checks before mutations
- [ ] Error handling for invalid IDs

---

## References

- **Convex Rules:** `docs/architecture/convex-rules.md` (MANDATORY)
- **Schema:** `convex/schema.ts`
- **Example:** `convex/sharing.ts` (existing mutations)
