# Subtask 01: Create Convex Hooks

**Status:** Not Started
**Parent:** Phase 3 - Frontend Integration

---

## Objective

Create React hooks that wrap Convex queries and mutations for comment operations.

---

## Files to Create

### 1. `app/src/hooks/useComments.ts`

Fetch all comments for a version.

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useComments(versionId: Id<"artifactVersions"> | undefined) {
  return useQuery(
    api.comments.getByVersion,
    versionId ? { versionId } : "skip"
  );
}
```

### 2. `app/src/hooks/useCommentReplies.ts`

Fetch all replies for a comment.

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useCommentReplies(commentId: Id<"comments"> | undefined) {
  return useQuery(
    api.commentReplies.getReplies,
    commentId ? { commentId } : "skip"
  );
}
```

### 3. `app/src/hooks/useCommentActions.ts`

Mutation wrappers for comment operations.

```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useCommentActions() {
  const createCommentMutation = useMutation(api.comments.create);
  const updateCommentMutation = useMutation(api.comments.updateContent);
  const deleteCommentMutation = useMutation(api.comments.softDelete);
  const toggleResolvedMutation = useMutation(api.comments.toggleResolved);

  return {
    createComment: async (args: {
      versionId: Id<"artifactVersions">;
      content: string;
      target: any;
    }) => {
      return await createCommentMutation(args);
    },

    updateComment: async (args: {
      commentId: Id<"comments">;
      content: string;
    }) => {
      return await updateCommentMutation(args);
    },

    deleteComment: async (commentId: Id<"comments">) => {
      return await deleteCommentMutation({ commentId });
    },

    toggleResolved: async (commentId: Id<"comments">) => {
      return await toggleResolvedMutation({ commentId });
    },
  };
}
```

### 4. `app/src/hooks/useReplyActions.ts`

Mutation wrappers for reply operations.

```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useReplyActions() {
  const createReplyMutation = useMutation(api.commentReplies.createReply);
  const updateReplyMutation = useMutation(api.commentReplies.updateReply);
  const deleteReplyMutation = useMutation(api.commentReplies.softDeleteReply);

  return {
    createReply: async (args: {
      commentId: Id<"comments">;
      content: string;
    }) => {
      return await createReplyMutation(args);
    },

    updateReply: async (args: {
      replyId: Id<"commentReplies">;
      content: string;
    }) => {
      return await updateReplyMutation(args);
    },

    deleteReply: async (replyId: Id<"commentReplies">) => {
      return await deleteReplyMutation({ replyId });
    },
  };
}
```

---

## Implementation Notes

1. **Query Hooks:**
   - Use `useQuery` from Convex React
   - Handle `undefined` IDs by using `"skip"` to prevent unnecessary queries
   - Return data directly (Convex handles loading/error states)

2. **Mutation Hooks:**
   - Use `useMutation` from Convex React
   - Wrap mutations in async functions for better TypeScript inference
   - Return the mutation results for optimistic updates if needed

3. **TypeScript:**
   - Import generated types from `@/convex/_generated/api` and `dataModel`
   - Use `Id<"tableName">` for all ID types
   - Match backend API signatures exactly

4. **Error Handling:**
   - Convex hooks automatically handle errors
   - Errors can be caught in components using try/catch
   - Loading states are managed by Convex internally

---

## Testing

### Unit Tests (Optional)

These are thin wrappers, so unit tests are optional. Focus on integration testing in subtask 03.

### Integration Testing

Will be tested in subtask 03 (E2E tests) when wired to DocumentViewer.

---

## Success Criteria

- [ ] All 4 hook files created
- [ ] TypeScript compiles without errors
- [ ] Hooks follow Convex React patterns
- [ ] API signatures match backend functions exactly
- [ ] Ready to use in DocumentViewer component

---

## References

- **Backend API:** `app/convex/comments.ts`, `app/convex/commentReplies.ts`
- **Convex React Hooks:** https://docs.convex.dev/client/react
- **Existing Hooks:** Check `app/src/` for similar patterns
