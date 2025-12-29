# Phase 3: Connect Frontend to Backend

**Status:** Planning
**Created:** 2025-12-28
**Parent Task:** [00017 - Implement Commenting](../README.md)

---

## Overview

Wire the existing DocumentViewer UI (Phase 1) to the backend API (Phase 2). Replace mock data with real Convex hooks and test the complete flow end-to-end.

## What We Already Have

### ✅ Phase 1 Complete - Frontend UI
- DocumentViewer component (2197 lines)
- CommentToolbar component
- Full commenting UI with mock data
- All interactions working visually

### ✅ Phase 2 Complete - Backend API
- 9 Convex functions (comments + replies)
- 87/87 tests passing
- Schema with comments and commentReplies tables
- Permission enforcement (owner + reviewer)

## What Phase 3 Will Do

**Simple:** Replace mock data → real Convex data

1. Create React hooks for Convex queries/mutations
2. Replace mock data in DocumentViewer with real hooks
3. Wire up all actions to backend mutations
4. Add loading/error states
5. E2E testing with real backend

---

## Subtasks

### 01-create-hooks

Create Convex React hooks for comment operations.

**Files to create:**
- `app/src/hooks/useComments.ts` - Fetch comments for a version
- `app/src/hooks/useCommentReplies.ts` - Fetch replies for a comment
- `app/src/hooks/useCommentActions.ts` - Mutation wrappers (create, update, delete, resolve)
- `app/src/hooks/useReplyActions.ts` - Reply mutation wrappers (create, update, delete)

**Hook signatures:**
```typescript
// Queries
const comments = useComments(versionId);
const replies = useCommentReplies(commentId);

// Mutations
const { createComment, updateComment, deleteComment, toggleResolved } = useCommentActions();
const { createReply, updateReply, deleteReply } = useReplyActions();
```

### 02-wire-data

Replace all mock data in DocumentViewer with real Convex hooks.

**Files to modify:**
- `app/src/components/artifact/DocumentViewer.tsx` - Replace mock data
- `app/src/components/comments/CommentToolbar.tsx` - Wire to real mutations (if needed)

**Changes:**
- Remove all mock comment arrays
- Use `useComments(versionId)` to fetch real comments
- Use `useCommentReplies(commentId)` for each comment thread
- Wire up all button clicks to mutation hooks
- Add loading states for async operations
- Add error handling for failed mutations
- Add optimistic updates for better UX

### 03-testing

E2E testing of complete commenting flow with real backend.

**Test scenarios:**
1. **Create comment** - Click element, add comment, see it appear
2. **Reply to comment** - Add reply, see it in thread
3. **Edit comment** - Edit own comment, see update
4. **Delete comment** - Delete own comment, see removal (soft delete)
5. **Resolve comment** - Toggle resolved status
6. **Permissions** - Verify owner vs reviewer permissions
7. **Real-time updates** - Multiple users (if supported)

**Deliverables:**
- E2E tests in `tests/e2e/`
- Validation video showing complete flow
- Test report in `tests/test-report.md`

---

## Backend API Reference

### Comment Operations (convex/comments.ts)

| Function | Type | Purpose |
|----------|------|---------|
| `getByVersion` | query | Get all comments for a version |
| `create` | mutation | Create new comment |
| `updateContent` | mutation | Edit comment content |
| `toggleResolved` | mutation | Mark resolved/unresolved |
| `softDelete` | mutation | Soft delete comment |

### Reply Operations (convex/commentReplies.ts)

| Function | Type | Purpose |
|----------|------|---------|
| `getReplies` | query | Get all replies for a comment |
| `createReply` | mutation | Add reply |
| `updateReply` | mutation | Edit reply |
| `softDeleteReply` | mutation | Soft delete reply |

---

## Target Data Structure

### Comment (from backend)
```typescript
{
  _id: Id<"comments">,
  versionId: Id<"artifactVersions">,
  authorId: Id<"users">,
  content: string,
  resolved: boolean,
  resolvedChangedBy?: Id<"users">,
  resolvedChangedAt?: number,
  target: any, // Versioned JSON blob
  isEdited: boolean,
  editedAt?: number,
  isDeleted: boolean,
  deletedBy?: Id<"users">,
  deletedAt?: number,
  createdAt: number
}
```

### Comment Reply (from backend)
```typescript
{
  _id: Id<"commentReplies">,
  commentId: Id<"comments">,
  authorId: Id<"users">,
  content: string,
  isEdited: boolean,
  editedAt?: number,
  isDeleted: boolean,
  deletedBy?: Id<"users">,
  deletedAt?: number,
  createdAt: number
}
```

### Target Metadata (versioned JSON)
```typescript
{
  _version: 1,
  type: "element" | "text",
  selectedText?: string,
  page?: string,
  elementId?: string,
  elementType?: string,
  location?: {
    containerType?: string,
    containerLabel?: string,
    isHidden?: boolean
  }
}
```

---

## Success Criteria

- [ ] Navigate to `/a/[shareToken]` and see real comments from Convex
- [ ] Can create new comments and see them appear immediately
- [ ] Can reply to comments
- [ ] Can edit own comments
- [ ] Can delete own comments (soft delete)
- [ ] Can toggle resolved status
- [ ] Owner can delete any comment (moderation)
- [ ] Reviewer cannot delete others' comments
- [ ] Loading states show during async operations
- [ ] Error messages display on failures
- [ ] E2E tests pass
- [ ] Validation video recorded

---

## Out of Scope

- ✗ Text Edit tool functionality (future task)
- ✗ Real-time collaboration cursors
- ✗ Multi-page artifact navigation (if not in current viewer)
- ✗ New UI components (all exist from Phase 1)
- ✗ New backend functions (all exist from Phase 2)

---

## References

- **Phase 1:** `tasks/00017-implement-commenting/01-phase-1-lift-figma/`
- **Phase 2:** `tasks/00017-implement-commenting/02-phase-2-backend/`
- **Backend API:** `app/convex/comments.ts`, `app/convex/commentReplies.ts`
- **Testing Guide:** `docs/development/testing-guide.md`
- **Convex Hooks:** https://docs.convex.dev/client/react
