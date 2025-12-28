# Phase 1: Lift Figma Design (Frontend Only)

**Parent Task:** 00017 - Implement Commenting
**Status:** Not Started

---

## Objective

Get the Figma DocumentViewer rendering in our app with mock data. This is a wholesale lift of the complete commenting UI from the Figma design exports.

---

## Scope

### What to Do

1. Copy `figma-designs/src/app/components/DocumentViewer.tsx` to `app/src/components/artifact/`
2. Copy `figma-designs/src/app/components/CommentToolbar.tsx` to `app/src/components/comments/`
3. Extract types/interfaces to `app/src/components/comments/types.ts`
4. Adapt import paths from `./ui/*` to `@/components/ui/*`
5. Update `ArtifactViewerPage.tsx` to render the lifted DocumentViewer
6. Keep all mock data exactly as-is from Figma
7. Confirm it renders and functions visually

### What NOT to Do

- ❌ No backend integration
- ❌ No schema design
- ❌ No Convex queries/mutations
- ❌ No breaking changes to existing functionality
- ❌ No refactoring into smaller components yet

---

## Deliverables

- [ ] Lifted DocumentViewer component working in our app
- [ ] All commenting UI visible (sidebar, cards, toolbar, tooltips)
- [ ] Mock data displaying correctly
- [ ] Tool modes and badges functional
- [ ] Visual confirmation that it matches Figma

---

## Success Criteria

- Navigate to `/a/[shareToken]` and see the new DocumentViewer
- Comment toolbar visible with both tools (comment + text edit)
- Sidebar shows mock comments
- Can toggle tool modes, filter, reply (all with mock data)
- Existing version switching and share still work

---

## Testing

**Location:** `tests/e2e/`

### Test Cases

1. **Render Test** - DocumentViewer renders without errors
2. **UI Elements** - Toolbar, sidebar, comment cards all visible
3. **Tool Modes** - Can switch between comment/text-edit modes
4. **Badge Modes** - Can toggle one-shot/infinite badges
5. **Filter** - Can filter comments (all/resolved/unresolved)
6. **Mock Data** - Comments display with avatars, timestamps, content
7. **Existing Features** - Version switching, share modal still work

### Validation Video

**Required:** Record video showing complete UI walkthrough with mock data

---

## Key Files

### Source (Figma)

- `figma-designs/src/app/components/DocumentViewer.tsx` (2198 lines)
- `figma-designs/src/app/components/CommentToolbar.tsx` (129 lines)

### Target (Our App)

- `app/src/components/artifact/DocumentViewer.tsx` (NEW)
- `app/src/components/comments/CommentToolbar.tsx` (NEW)
- `app/src/components/comments/types.ts` (NEW)
- `app/src/components/artifact/ArtifactViewerPage.tsx` (UPDATE)

### Files to Preserve

- `app/src/components/artifact/ArtifactViewerPage.tsx` - Keep Convex data layer
- `app/src/components/artifact/ArtifactViewer.tsx` - Keep temporarily
- `app/src/components/artifact/ArtifactHeader.tsx` - Keep as-is
- `app/src/components/artifact/ShareModal.tsx` - Keep as-is

---

## Notes

- Treat Figma as source of truth
- This is a "big bang" lift, not incremental
- Keep old ArtifactViewer.tsx until confirmed working
- Could use feature flag `?newViewer=true` if needed
