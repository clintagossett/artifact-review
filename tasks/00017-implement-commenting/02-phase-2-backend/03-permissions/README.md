# Subtask 2.3: Permissions Logic

**Parent:** Phase 2 - Build Backend
**Status:** Not Started
**Prerequisites:** Subtask 2.2 (Comment CRUD)

---

## Objective

Add comprehensive permission checks to all comment mutations, ensuring proper access control.

---

## Deliverables

- [ ] All mutations have permission checks
- [ ] Error messages for unauthorized access
- [ ] `convex/sharing.ts` updated if needed (helper functions)
- [ ] Permission logic documented

---

## Permission Rules

### Comments

| Action | Who Can Do It |
|--------|---------------|
| Create comment (text or element) | `can-comment` OR `owner` |
| Add reply | `can-comment` OR `owner` |
| Toggle resolved | `can-comment` OR `owner` |
| Delete comment | Author OR `owner` |

---

## Implementation Strategy

### Reuse Existing Permission System

Check `convex/sharing.ts` for existing permission helpers:
- `getSharePermission(ctx, shareToken)` - Get user's permission level
- May need to add helpers for comment ownership checks

### Add Permission Helpers

```typescript
// In convex/comments.ts or convex/lib/permissions.ts

async function canComment(ctx, versionId) {
  // Check if user has can-comment or owner permission
}

async function isCommentAuthor(ctx, commentId) {
  // Check if user is the comment author
}

async function isArtifactOwner(ctx, versionId) {
  // Check if user owns the artifact
}
```

---

## Error Handling

Use clear error messages:

```typescript
if (!canComment) {
  throw new Error("You don't have permission to comment on this artifact");
}

if (!isAuthor && !isOwner) {
  throw new Error("Only the comment author or artifact owner can delete this comment");
}
```

---

## Files to Update

### `convex/comments.ts`
- Add permission checks to all mutations
- Use helper functions for readability

### `convex/sharing.ts` (if needed)
- Add helper functions for comment permission checks
- Keep DRY - don't repeat permission logic

---

## Testing Requirements

Must verify:
1. Unauthorized users cannot create comments
2. `view-only` users cannot create comments
3. `can-comment` users can create comments
4. Users can only delete their own comments (unless owner)
5. Owners can delete any comment
6. Permission errors return clear messages

---

## References

- **Existing Permissions:** `convex/sharing.ts`
- **Schema:** `convex/schema.ts`
- **Convex Rules:** `docs/architecture/convex-rules.md`
