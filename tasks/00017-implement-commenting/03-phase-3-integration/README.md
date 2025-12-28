# Phase 3: Connect Frontend to Backend

**Parent Task:** 00017 - Implement Commenting
**Status:** Not Started
**Prerequisites:** Phase 1 and Phase 2 Complete

---

## Objective

Replace mock data in the lifted DocumentViewer with real Convex data, connecting the frontend UI to the backend data layer.

---

## Scope

### What to Do

1. Create React hooks for Convex queries and mutations
2. Replace all mock data in DocumentViewer with real hooks
3. Wire up all action handlers to Convex mutations
4. Add loading states and error handling
5. Test complete flow end-to-end

### What NOT to Do

- ❌ No UI changes (already done in Phase 1)
- ❌ No schema changes (already done in Phase 2)
- ❌ No new backend functions (already done in Phase 2)

---

## Subtasks

### 01-hooks

Create React hooks for Convex integration.

**Deliverables:**
- `useComments(versionId)` - Fetch comments
- `useTextEdits(versionId)` - Fetch text edits
- `useCommentActions()` - Comment mutations
- `useTextEditActions()` - Text edit mutations

### 02-wire-data

Replace mock data in DocumentViewer with real hooks.

**Deliverables:**
- DocumentViewer uses `useComments()` hook
- DocumentViewer uses `useTextEdits()` hook
- All action handlers call mutations
- Loading states for all async operations
- Error handling for all mutations

### 03-testing

End-to-end testing of complete commenting flow.

**Deliverables:**
- E2E tests for full commenting flow
- Permission scenario tests
- Real-time update tests
- Validation video showing complete feature

---

## Success Criteria

- Navigate to `/a/[shareToken]` and see real comments from Convex
- Can create new comments and see them appear
- Can create text edit suggestions
- Owner can accept/reject text edits
- Can reply to comments
- Can toggle resolved status
- Can delete own comments
- Permission checks work correctly
- All existing features still work (version switching, share)

---

## Key Files

### New Files

- `app/src/components/comments/hooks/useComments.ts`
- `app/src/components/comments/hooks/useTextEdits.ts`
- `app/src/components/comments/hooks/useCommentActions.ts`
- `app/src/components/comments/hooks/useTextEditActions.ts`

### Modified Files

- `app/src/components/artifact/DocumentViewer.tsx` (replace mock data)
- `app/src/components/artifact/ArtifactViewerPage.tsx` (if needed)

---

## References

- **Testing Guide:** `docs/development/testing-guide.md`
- **Convex Client Hooks:** Convex React docs
- **Existing Hooks:** Check other components for Convex hook patterns
