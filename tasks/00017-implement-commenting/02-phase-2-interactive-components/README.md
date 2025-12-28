# Phase 2: Lift Interactive UI Components

**Status:** Planning
**Created:** 2025-12-28
**Parent Task:** [00017 - Implement Commenting](../README.md)

## Overview

Lift and shift the "Interactive UI Components" version from Figma designs, adding full commenting interaction capabilities to the DocumentViewer.

## What Phase 1 Delivered

Phase 1 lifted the "Static Content" version:
- ✅ Basic DocumentViewer layout with sidebar
- ✅ Static CommentToolbar (non-functional)
- ✅ Version dropdown
- ✅ Mock comments display in sidebar
- ✅ Integration with ArtifactViewerPage

## What Phase 2 Will Add

Based on the Figma "Interactive UI Components" design, Phase 2 adds:

### 1. Interactive Comment Toolbar
- **Tool Mode Selection:**
  - Comment tool (purple) - click to add comments on elements/text
  - Text Edit tool (green) - select text to suggest edits (NOT IN SCOPE for Task 17)
  - Tool toggle behavior (click to activate/deactivate)

- **Mode Badges:**
  - One-shot mode (①) - tool deactivates after one use
  - Infinite mode (∞) - tool stays active for multiple uses
  - Badge click cycles: null → one-shot → infinite → null

- **Filter Controls:**
  - All comments
  - Unresolved only
  - Resolved only
  - Active count display updates based on filter

- **Tool Hints:**
  - Context-sensitive hint bar appears when tool is active
  - "Comment Mode: Click any element or select text to add a comment"

### 2. Comment Interactions

- **Create Comments:**
  - Click element when Comment tool active
  - Select text when Comment tool active
  - Show comment creation form
  - Capture element metadata (type, id, text)

- **Comment Thread Display:**
  - Show all replies in thread
  - Reply to comments
  - Resolve/unresolve toggle
  - Edit own comments
  - Delete own comments (soft delete)

- **Comment Navigation:**
  - Click comment in sidebar to highlight element in viewer
  - Auto-scroll to element
  - Handle hidden content (tabs/accordions) - expand automatically
  - Visual highlight effect on referenced element

### 3. Hidden Content Handling

From the Figma demo, comments can be on:
- **Hidden tabs** - Elements in inactive tab panels
- **Collapsed accordions** - Elements in collapsed accordion sections
- **Multi-page artifacts** - Elements on different HTML pages (index.html, documentation.html)

**Smart Navigation:**
- When user hovers/clicks comment in sidebar
- If element is in hidden tab → switch to that tab
- If element is in collapsed accordion → expand that accordion
- If element is on different page → navigate to that page
- Then highlight and scroll to element

### 4. Mock HTML Content

The Figma design includes demo HTML with:
- Tabs component (Overview, Features, Pricing, Support)
- Accordion component (FAQs)
- Multi-page structure (index.html, documentation.html)
- All elements have IDs for targeting

**Phase 2 scope:** Use the embedded HTML from Figma as test content, NOT real artifact content yet.

### 5. Text Edits Feature

**OUT OF SCOPE:** The CommentToolbar includes a "Text Edit" tool for suggesting inline text changes (replace/delete). This is explicitly OUT OF SCOPE per Task 17's README which states "comments only, no text editing". We will:
- Include the Text Edit button in the UI (from Figma)
- Make it non-functional with a disabled state
- Add tooltip: "Text editing coming in future release"

## Implementation Plan

### Step 1: Update CommentToolbar Component
- Add state management for tool mode, badges, filter
- Implement tool toggle behavior
- Implement badge cycling logic
- Wire up filter dropdown
- Add active count calculation
- Add tool hint display
- Disable Text Edit tool (not in scope)

### Step 2: Add Comment Creation Flow
- Detect element clicks when Comment tool active
- Detect text selection when Comment tool active
- Show comment creation dialog
- Capture element metadata (type, id, preview text)
- Create comment with element reference
- Reset tool mode based on badge (one-shot vs infinite)

### Step 3: Implement Comment Thread Interactions
- Reply to comments
- Resolve/unresolve toggle with visual feedback
- Edit comment (own comments only)
- Delete comment (soft delete, own comments only)
- Timestamp display

### Step 4: Smart Element Navigation
- Click comment → highlight referenced element
- Handle hidden tabs (switch tab first)
- Handle collapsed accordions (expand first)
- Handle multi-page (navigate first)
- Auto-scroll to element
- Visual highlight effect

### Step 5: Use Mock HTML Content
- Extract `interactiveComponentsHTML` from Figma DocumentViewer
- Inject into iframe/content pane in DocumentViewer
- Wire up tab/accordion JavaScript
- Ensure IDs match between HTML and comment references

### Step 6: Testing
- Create unit tests for toolbar state management
- Create unit tests for comment CRUD operations
- Create e2e tests for comment creation flow
- Create e2e tests for smart navigation (tabs/accordions)
- Record validation videos

## Out of Scope

- ✗ Text Edit tool functionality (future task)
- ✗ Real-time collaboration cursors
- ✗ Real artifact content (using mock HTML instead)
- ✗ Backend integration (Convex queries/mutations)
- ✗ Authentication/permissions

## Acceptance Criteria

- [ ] Comment tool can be activated/deactivated
- [ ] Badge cycling works (null → ① → ∞ → null)
- [ ] One-shot mode deactivates after creating comment
- [ ] Infinite mode stays active after creating comment
- [ ] Filter dropdown filters comments correctly
- [ ] Active count updates based on filter
- [ ] Clicking element creates comment when tool active
- [ ] Selecting text creates comment when tool active
- [ ] Comments display in sidebar with metadata
- [ ] Clicking comment highlights element in content
- [ ] Hidden tab elements auto-expand when navigating
- [ ] Collapsed accordion elements auto-expand when navigating
- [ ] Can reply to comments
- [ ] Can resolve/unresolve comments
- [ ] Can edit own comments
- [ ] Can delete own comments
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Validation videos recorded

## Files to Modify

- `app/src/components/comments/CommentToolbar.tsx` - Make interactive
- `app/src/components/artifact/DocumentViewer.tsx` - Add comment interactions
- `app/src/components/comments/types.ts` - Add types for comments, threads
- New: `app/src/components/comments/CommentCreationDialog.tsx`
- New: `app/src/components/comments/CommentThread.tsx`
- New: `app/src/hooks/useCommentToolbar.ts` - State management hook
- New: `app/src/hooks/useElementHighlight.ts` - Element navigation hook

## References

- Figma: `figma-designs/src/app/components/DocumentViewer.tsx`
- Figma: `figma-designs/src/app/components/CommentToolbar.tsx`
- Task 17 README: `tasks/00017-implement-commenting/README.md`
- Phase 1 README: `tasks/00017-implement-commenting/01-phase-1-lift-figma/README.md`
