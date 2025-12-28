# Subtask 2.3: Text Edit CRUD Operations

**Parent:** Phase 2 - Build Backend
**Status:** Not Started
**Prerequisites:** Subtask 2.1 (Schema Design)

---

## Objective

Implement all text edit queries and mutations in `convex/textEdits.ts` following Convex rules.

---

## Deliverables

- [ ] `convex/textEdits.ts` created
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
    // Fetch all text edits for a version
  },
});
```

**Returns:** Array of text edits with author info

---

### Mutations

#### `create`
```typescript
export const create = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    type: v.union(v.literal("replace"), v.literal("delete")),
    originalText: v.string(),
    newText: v.optional(v.string()),
    comment: v.string(),
    page: v.optional(v.string()),
  },
  returns: v.id("textEdits"),
  handler: async (ctx, args) => {
    // Create new text edit suggestion
  },
});
```

**Validates:**
- User is authenticated
- User has `can-comment` or `owner` permission
- If type is "replace", newText must be provided

#### `accept`
```typescript
export const accept = mutation({
  args: {
    textEditId: v.id("textEdits"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Accept text edit (owner only)
  },
});
```

**Validates:**
- User is artifact owner
- Text edit exists and is "pending"

#### `reject`
```typescript
export const reject = mutation({
  args: {
    textEditId: v.id("textEdits"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Reject text edit (owner only)
  },
});
```

**Validates:**
- User is artifact owner
- Text edit exists and is "pending"

#### `delete`
```typescript
export const delete = mutation({
  args: {
    textEditId: v.id("textEdits"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete text edit (author only)
  },
});
```

**Validates:**
- User is author of the text edit

---

## Business Logic

### Accept/Reject Rules

- Only `owner` can accept/reject text edits
- Only `pending` edits can be accepted/rejected
- Once accepted/rejected, status is immutable

### Delete Rules

- Only author can delete their own text edits
- Can delete at any status (pending/accepted/rejected)

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
