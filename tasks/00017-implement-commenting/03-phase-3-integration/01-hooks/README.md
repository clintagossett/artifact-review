# Subtask 3.1: Create React Hooks

**Parent:** Phase 3 - Connect Frontend to Backend
**Status:** Not Started
**Prerequisites:** Phase 2 Complete

---

## Objective

Create React hooks that wrap Convex queries and mutations for comments and text edits, providing a clean API for the DocumentViewer component.

---

## Deliverables

- [ ] `useComments(versionId)` hook created
- [ ] `useTextEdits(versionId)` hook created
- [ ] `useCommentActions()` hook created
- [ ] `useTextEditActions()` hook created
- [ ] All hooks have proper TypeScript types
- [ ] Error handling in all hooks

---

## Hooks to Implement

### `useComments(versionId)`

**Location:** `app/src/components/comments/hooks/useComments.ts`

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useComments(versionId: string) {
  const comments = useQuery(
    api.comments.getByVersion,
    versionId ? { versionId } : "skip"
  );

  return {
    comments: comments ?? [],
    isLoading: comments === undefined,
  };
}
```

**Returns:**
- `comments` - Array of Comment objects
- `isLoading` - Boolean loading state

---

### `useTextEdits(versionId)`

**Location:** `app/src/components/comments/hooks/useTextEdits.ts`

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useTextEdits(versionId: string) {
  const textEdits = useQuery(
    api.textEdits.getByVersion,
    versionId ? { versionId } : "skip"
  );

  return {
    textEdits: textEdits ?? [],
    isLoading: textEdits === undefined,
  };
}
```

**Returns:**
- `textEdits` - Array of TextEdit objects
- `isLoading` - Boolean loading state

---

### `useCommentActions()`

**Location:** `app/src/components/comments/hooks/useCommentActions.ts`

```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCallback } from "react";

export function useCommentActions() {
  const createMutation = useMutation(api.comments.create);
  const addReplyMutation = useMutation(api.comments.addReply);
  const toggleResolvedMutation = useMutation(api.comments.toggleResolved);
  const deleteMutation = useMutation(api.comments.delete);

  const create = useCallback(async (args) => {
    try {
      const commentId = await createMutation(args);
      return { success: true, commentId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [createMutation]);

  // Similar for addReply, toggleResolved, delete...

  return {
    create,
    addReply,
    toggleResolved,
    delete: deleteComment,
  };
}
```

**Returns:**
- `create(args)` - Create new comment
- `addReply(args)` - Add reply to comment
- `toggleResolved(commentId)` - Toggle resolved status
- `delete(commentId)` - Delete comment

---

### `useTextEditActions()`

**Location:** `app/src/components/comments/hooks/useTextEditActions.ts`

```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCallback } from "react";

export function useTextEditActions() {
  const createMutation = useMutation(api.textEdits.create);
  const acceptMutation = useMutation(api.textEdits.accept);
  const rejectMutation = useMutation(api.textEdits.reject);
  const deleteMutation = useMutation(api.textEdits.delete);

  const create = useCallback(async (args) => {
    try {
      const editId = await createMutation(args);
      return { success: true, editId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [createMutation]);

  // Similar for accept, reject, delete...

  return {
    create,
    accept,
    reject,
    delete: deleteEdit,
  };
}
```

**Returns:**
- `create(args)` - Create text edit suggestion
- `accept(editId)` - Accept text edit (owner only)
- `reject(editId)` - Reject text edit (owner only)
- `delete(editId)` - Delete text edit (author only)

---

## Error Handling Strategy

All action hooks should:
1. Wrap mutations in try/catch
2. Return `{ success: boolean, error?: string }` format
3. Log errors using structured logging (not `console.log`)

```typescript
import { logger, LOG_TOPICS } from '@/lib/logger';

try {
  const result = await mutation(args);
  return { success: true, data: result };
} catch (error) {
  logger.error(LOG_TOPICS.Comments, 'useCommentActions', 'Failed to create comment', { error });
  return { success: false, error: error.message };
}
```

---

## Type Safety

Import types from comments/types.ts:

```typescript
import type { Comment, TextEdit } from '../types';
```

Ensure all hooks have proper TypeScript return types.

---

## Testing

Create unit tests in `tests/unit/`:
- [ ] Hooks render without errors
- [ ] Hooks return expected data shape
- [ ] Error handling works correctly

---

## References

- **Convex React:** https://docs.convex.dev/client/react
- **Logging Guide:** `docs/development/logging-guide.md`
- **Comment Types:** `app/src/components/comments/types.ts`
