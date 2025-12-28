# Subtask 3.2: Replace Mock Data in DocumentViewer

**Parent:** Phase 3 - Connect Frontend to Backend
**Status:** Not Started
**Prerequisites:** Subtask 3.1 (Hooks)

---

## Objective

Replace all mock data in DocumentViewer with real Convex data using the hooks created in Subtask 3.1.

---

## Deliverables

- [ ] DocumentViewer uses `useComments()` instead of `mockComments`
- [ ] DocumentViewer uses `useTextEdits()` instead of `mockTextEdits`
- [ ] All action handlers call real mutations
- [ ] Loading states added for all async operations
- [ ] Error handling for all mutations
- [ ] Optimistic updates for better UX

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

### Replace Mock Text Edits

**Before:**
```typescript
const [textEdits, setTextEdits] = useState(mockTextEdits);
```

**After:**
```typescript
import { useTextEdits } from '@/components/comments/hooks/useTextEdits';

const { textEdits, isLoading: editsLoading } = useTextEdits(versionId);
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
    logger.error(LOG_TOPICS.Comments, 'DocumentViewer', 'Failed to create comment', { error: result.error });
  }
};
```

---

### Wire Up Text Edit Actions

**Before:**
```typescript
const handleAcceptEdit = (editId) => {
  setTextEdits(edits =>
    edits.map(e => e.id === editId ? { ...e, status: 'accepted' } : e)
  );
};
```

**After:**
```typescript
import { useTextEditActions } from '@/components/comments/hooks/useTextEditActions';

const { accept } = useTextEditActions();

const handleAcceptEdit = async (editId) => {
  const result = await accept({ textEditId: editId });
  if (!result.success) {
    // Show error toast
    logger.error(LOG_TOPICS.TextEdits, 'DocumentViewer', 'Failed to accept edit', { error: result.error });
  }
};
```

---

## Loading States

Add loading indicators while data is fetching:

```typescript
if (isLoading || editsLoading) {
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

## Optimistic Updates

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

- Import hooks instead of mock data
- Replace all `useState` for comments/edits with hooks
- Wire up all action handlers to mutations
- Add loading states
- Add error handling

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
7. Create text edit - verify it appears
8. Accept/reject edit (as owner) - verify status changes
9. Delete comment - verify it disappears

---

## References

- **Hooks:** `app/src/components/comments/hooks/`
- **Logging Guide:** `docs/development/logging-guide.md`
- **Convex React:** https://docs.convex.dev/client/react/optimistic-updates
