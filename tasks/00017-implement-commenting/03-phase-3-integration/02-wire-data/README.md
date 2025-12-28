# Subtask 3.2: Replace Mock Data in DocumentViewer

**Parent:** Phase 3 - Connect Frontend to Backend
**Status:** Not Started
**Prerequisites:** Subtask 3.1 (Hooks)

---

## Objective

Replace all mock comment data in DocumentViewer with real Convex data using the hooks created in Subtask 3.1.

**SCOPE:** Wire up comments only - remove text edit UI/logic from lifted DocumentViewer.

---

## Deliverables

- [ ] DocumentViewer uses `useComments()` instead of `mockComments`
- [ ] All comment action handlers call real mutations
- [ ] Loading states added for all async operations
- [ ] Error handling for all mutations
- [ ] Remove text edit UI/logic (out of scope)
- [ ] Optimistic updates for better UX (optional)

---

## Changes to DocumentViewer

### Replace Mock Comments

**Before:**
```typescript
const [comments, setComments] = useState(mockComments);
```

**After:**
```typescript
import { useComments } from '@/components/comments/hooks/useComments';

const { comments, isLoading } = useComments(versionId);
```

---

### Wire Up Comment Actions

**Before:**
```typescript
const handleCreateComment = (commentData) => {
  const newComment = { id: uuid(), ...commentData };
  setComments([...comments, newComment]);
};
```

**After:**
```typescript
import { useCommentActions } from '@/components/comments/hooks/useCommentActions';

const { create } = useCommentActions();

const handleCreateComment = async (commentData) => {
  const result = await create(commentData);
  if (!result.success) {
    // Show error toast
    toast.error('Failed to create comment: ' + result.error);
    logger.error(LOG_TOPICS.Comments, 'DocumentViewer', 'Failed to create comment', { error: result.error });
  }
};
```

---

### Wire Up Reply Action

**Before:**
```typescript
const handleReply = (parentId, content) => {
  const reply = { id: uuid(), content, ...};
  // Add to comments array
};
```

**After:**
```typescript
const { addReply } = useCommentActions();

const handleReply = async (parentId, content) => {
  const result = await addReply({ parentCommentId: parentId, content });
  if (!result.success) {
    toast.error('Failed to add reply');
  }
};
```

---

### Wire Up Toggle Resolved

**Before:**
```typescript
const handleToggleResolved = (commentId) => {
  setComments(comments.map(c =>
    c.id === commentId ? { ...c, resolved: !c.resolved } : c
  ));
};
```

**After:**
```typescript
const { toggleResolved } = useCommentActions();

const handleToggleResolved = async (commentId) => {
  const result = await toggleResolved(commentId);
  if (!result.success) {
    toast.error('Failed to toggle resolved status');
  }
};
```

---

### Wire Up Delete Comment

**Before:**
```typescript
const handleDelete = (commentId) => {
  setComments(comments.filter(c => c.id !== commentId));
};
```

**After:**
```typescript
const { delete: deleteComment } = useCommentActions();

const handleDelete = async (commentId) => {
  const result = await deleteComment(commentId);
  if (!result.success) {
    toast.error('Failed to delete comment');
  }
};
```

---

## Remove Text Edit Functionality

Since text editing is out of scope, remove:
- Text edit tool from toolbar
- Text edit state and handlers
- Text edit UI components
- Any mock text edit data

Keep only comment tool in the toolbar.

---

## Loading States

Add loading indicators while data is fetching:

```typescript
if (isLoading) {
  return <LoadingSpinner />;
}
```

Or use skeleton UI for better UX.

---

## Error Handling

### Display Errors to User

Use toast notifications for mutation errors:

```typescript
import { toast } from 'sonner';

const result = await create(data);
if (!result.success) {
  toast.error('Failed to create comment: ' + result.error);
}
```

### Log Errors

Use structured logging:

```typescript
import { logger, LOG_TOPICS } from '@/lib/logger';

logger.error(LOG_TOPICS.Comments, 'DocumentViewer', 'Failed to create comment', {
  error: result.error,
  versionId,
});
```

---

## Optimistic Updates (Optional)

For better UX, implement optimistic updates:

```typescript
const { create } = useCommentActions();

const handleCreateComment = async (commentData) => {
  // Optimistically add comment to UI
  const tempId = `temp-${Date.now()}`;
  const optimisticComment = { id: tempId, ...commentData };

  // Call mutation
  const result = await create(commentData);

  if (!result.success) {
    // Revert optimistic update
    toast.error('Failed to create comment');
  }
};
```

**Note:** Convex may handle optimistic updates automatically - check docs.

---

## Files to Modify

### `app/src/components/artifact/DocumentViewer.tsx`

- Import hooks instead of using mock data
- Replace all comment `useState` with `useComments()` hook
- Wire up all comment action handlers to mutations
- Add loading states
- Add error handling
- **Remove text edit tool and all text edit logic**

### `app/src/components/artifact/ArtifactViewerPage.tsx`

- Ensure `versionId` is passed to DocumentViewer
- May need to pass permission level for UI controls

---

## Testing During Development

1. Start dev servers: `./scripts/start-dev-servers.sh`
2. Navigate to `/a/[shareToken]`
3. Verify comments load from Convex
4. Create a new comment - verify it appears
5. Reply to comment - verify reply appears
6. Toggle resolved - verify status changes
7. Delete comment - verify it disappears
8. Verify text edit UI is removed

---

## References

- **Hooks:** `app/src/components/comments/hooks/`
- **Logging Guide:** `docs/development/logging-guide.md`
- **Convex React:** https://docs.convex.dev/client/react/optimistic-updates
