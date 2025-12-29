# Task 00017: Implement Commenting

**GitHub Issue:** #16

---

## Resume (Start Here)

**Last Updated:** 2025-12-28 (Session 2 - Final)

### Current Status: Architecture Complete - 3-Phase Plan

**Phase:** Ready to begin Phase 1 (Lift Figma Design).

### What We Did This Session (Session 2)

1. **Analyzed Figma designs** - Reviewed DocumentViewer.tsx (2198 lines), CommentToolbar.tsx
2. **Analyzed current implementation** - Reviewed ArtifactViewer (105 lines) and related components
3. **Critical decision: Full Lift vs Incremental** - Decided on FULL LIFT approach
4. **Created 3-phase implementation plan:**
   - Phase 1: Lift Figma Design (Frontend Only)
   - Phase 2: Build Backend (Convex)
   - Phase 3: Connect Frontend to Backend

### Previous Sessions

**Session 1 (2025-12-28):**
1. Created GitHub issue - Issue #16 for tracking
2. Created task folder - Set up task structure

### Next Steps

1. **Phase 1** - Lift entire DocumentViewer from Figma with mock data
2. Confirm visual rendering matches Figma
3. Then proceed to Phase 2 (Backend)

---

## Objective

Implement commenting functionality for shared artifacts based on Figma designs, enabling stakeholders to add comments on text selections and UI elements in AI-generated artifacts during collaborative review.

**SCOPE CLARIFICATION:** This task implements commenting on text/elements only. Text editing suggestions (replace/delete text) are out of scope for this phase.

---

## Implementation Strategy Decision

### The Question

Should we:
- **Option A:** Lift the entire DocumentViewer component from Figma wholesale, then adapt it
- **Option B:** Keep our existing ArtifactViewer and add commenting components piece by piece

### Decision: OPTION A - Full Lift

**Rationale:**

| Aspect | Figma DocumentViewer | Our ArtifactViewer |
|--------|---------------------|-------------------|
| Lines of Code | ~2200 lines | ~105 lines |
| Comments System | Complete | None |
| Tool Modes + Badges | Complete | None |
| Backend Integration | Mock data | Full Convex |

1. **Figma is source of truth** - Treat the design as authoritative
2. **Comment system is complex** - Rebuild from scratch is high risk
3. **Our viewer is simple** - Only 105 lines, mostly layout
4. **Integration points are clear** - We know what to preserve (ArtifactViewerPage, permissions, routing)

---

## 3-Phase Implementation Plan

### Phase 1: Lift Figma Design (Frontend Only)
**Location:** `tasks/00017-implement-commenting/phase-1-lift-figma/`
**Goal:** Get the Figma DocumentViewer rendering in our app with mock data.

**What to do:**
1. Copy `figma-designs/src/app/components/DocumentViewer.tsx` to `app/src/components/artifact/`
2. Copy `figma-designs/src/app/components/CommentToolbar.tsx` to `app/src/components/comments/`
3. Extract types/interfaces to `app/src/components/comments/types.ts`
4. Adapt import paths from `./ui/*` to `@/components/ui/*`
5. Update `ArtifactViewerPage.tsx` to render the lifted DocumentViewer
6. Keep all mock data exactly as-is from Figma
7. Confirm it renders and functions visually

**Deliverables:**
- Lifted DocumentViewer component working in our app
- All commenting UI visible (sidebar, cards, toolbar, tooltips)
- Mock data displaying correctly
- Tool modes and badges functional
- Visual confirmation that it matches Figma

**What NOT to do:**
- No backend integration
- No schema design
- No Convex queries/mutations
- No breaking changes to existing functionality
- No refactoring into smaller components yet

**Success Criteria:**
- Navigate to `/a/[shareToken]` and see the new DocumentViewer
- Comment toolbar visible with both tools
- Sidebar shows mock comments
- Can toggle tool modes, filter, reply (all with mock data)
- Existing version switching and share still work

---

### Phase 2: Build Backend (Convex)
**Location:** `tasks/00017-implement-commenting/phase-2-backend/`
**Goal:** Design and implement Convex schema, queries, and mutations for comments on text and elements.

**SCOPE:** Comments only - no text editing suggestions.

#### Subtask 2.1: Schema Design
**Location:** `phase-2-backend/01-schema-design/`
**Deliverables:**
- ADR for comments schema
- `convex/schema.ts` updates with `comments` table
- Indexes for efficient queries

**Table to design:**
```typescript
// Comments table
comments: defineTable({
  artifactVersionId: v.id("artifactVersions"),
  authorId: v.id("users"),
  content: v.string(),
  resolved: v.boolean(),
  parentCommentId: v.optional(v.id("comments")), // For replies
  // Target info (what the comment is on)
  targetType: v.union(v.literal("text"), v.literal("element")),
  highlightedText: v.optional(v.string()), // For text comments
  elementType: v.optional(v.string()), // For element comments (button, heading, etc.)
  elementId: v.optional(v.string()),
  elementPreview: v.optional(v.string()),
  page: v.optional(v.string()),
})
  .index("by_version", ["artifactVersionId"])
  .index("by_author", ["authorId"])
  .index("by_parent", ["parentCommentId"])
```

#### Subtask 2.2: Comment CRUD Operations
**Location:** `phase-2-backend/02-comment-crud/`
**Deliverables:**
- `convex/comments.ts` with queries and mutations:
  - `getByVersion` - Get all comments for a version
  - `create` - Add a new comment (on text or element)
  - `addReply` - Reply to a comment
  - `toggleResolved` - Mark as resolved/unresolved
  - `delete` - Delete a comment (author or owner)

#### Subtask 2.3: Permissions Logic
**Location:** `phase-2-backend/03-permissions/`
**Deliverables:**
- Permission checks in all mutations:
  - Only `can-comment` or `owner` can create comments
  - Only `can-comment` or `owner` can reply to comments
  - Only author or `owner` can delete comments
  - Anyone with `can-comment` can toggle resolved status
- Update `convex/sharing.ts` if needed

#### Subtask 2.4: Backend Tests
**Location:** `phase-2-backend/04-tests/`
**Deliverables:**
- Unit tests for all queries/mutations
- Permission tests (unauthorized access blocked)
- Edge case tests (deleted versions, etc.)

---

### Phase 3: Connect Frontend to Backend
**Location:** `tasks/00017-implement-commenting/phase-3-integration/`
**Goal:** Replace mock data with real Convex data for commenting.

#### Subtask 3.1: Create React Hooks
**Location:** `phase-3-integration/01-hooks/`
**Deliverables:**
- `useComments(versionId)` hook - Fetches comments from Convex
- `useCommentActions()` hook - Create, reply, resolve, delete

#### Subtask 3.2: Replace Mock Data in DocumentViewer
**Location:** `phase-3-integration/02-wire-data/`
**Deliverables:**
- Replace `mockComments` with `useComments()` hook
- Wire up all comment action handlers to mutations
- Add loading states
- Add error handling
- Remove text edit UI/logic (out of scope)

#### Subtask 3.3: Integration Testing
**Location:** `phase-3-integration/03-testing/`
**Deliverables:**
- End-to-end tests for commenting flow
- Test permission scenarios
- Test real-time updates (optimistic UI)
- Validation video showing complete flow

---

## Component Architecture

### File Structure After Phase 1

```
app/src/components/
├── artifact/
│   ├── ArtifactViewerPage.tsx      # KEEP - Our Convex data layer
│   ├── DocumentViewer.tsx          # NEW - Lifted from Figma
│   ├── ArtifactViewer.tsx          # KEEP (temporarily) - Old viewer
│   ├── ArtifactHeader.tsx          # KEEP
│   ├── ArtifactFrame.tsx           # KEEP
│   ├── ShareModal.tsx              # KEEP
│   └── ...
│
├── comments/                        # NEW - From Figma
│   ├── CommentToolbar.tsx          # Lifted from Figma
│   └── types.ts                    # TypeScript interfaces
```

### File Structure After Phase 3

```
app/src/components/
├── artifact/
│   ├── ArtifactViewerPage.tsx      # Updated to use DocumentViewer
│   ├── DocumentViewer.tsx          # Integrated with Convex
│   └── ...
│
├── comments/
│   ├── CommentToolbar.tsx
│   ├── types.ts
│   └── hooks/
│       ├── useComments.ts          # Convex hook
│       ├── useTextEdits.ts         # Convex hook
│       ├── useCommentActions.ts    # Mutations
│       └── useTextEditActions.ts   # Mutations
│
convex/
├── comments.ts                      # NEW - Comments queries/mutations
├── textEdits.ts                     # NEW - Text edits queries/mutations
└── schema.ts                        # Updated with new tables
```

---

## Data Model

### Frontend Types (Phase 1)

```typescript
// app/src/components/comments/types.ts

export interface Author {
  id: string;
  name: string;
  avatar: string;
}

export interface Reply {
  id: string;
  author: Author;
  content: string;
  timestamp: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  versionId: string;
  author: Author;
  content: string;
  timestamp: string;
  createdAt: number;
  resolved: boolean;
  replies: Reply[];
  targetType: 'text' | 'element';
  highlightedText?: string;
  elementType?: 'text' | 'image' | 'heading' | 'button' | 'section';
  elementId?: string;
  elementPreview?: string;
  page?: string;
  location?: ElementLocation;
}

export interface ElementLocation {
  type: 'tab' | 'accordion' | 'visible';
  label: string;
  isHidden: boolean;
}

export type ToolMode = 'comment' | 'text-edit' | null;
export type ToolBadge = 'one-shot' | 'infinite' | null;
export type FilterMode = 'all' | 'resolved' | 'unresolved';

export interface TextEdit {
  id: string;
  versionId: string;
  author: Author;
  type: 'replace' | 'delete';
  originalText: string;
  newText?: string;
  comment: string;
  timestamp: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'rejected';
  page?: string;
}
```

### Backend Schema (Phase 2)

See Subtask 2.1 above for Convex comments schema design.

**Note:** Text editing suggestions (replace/delete) are out of scope.

---

## What to Preserve From Current Implementation

| Feature | Location | Strategy |
|---------|----------|----------|
| Convex Data Fetching | `ArtifactViewerPage.tsx` | Keep as-is |
| Permission System | `ArtifactViewerPage.tsx` | Keep as-is |
| Share Token Routing | `app/a/[shareToken]/...` | Keep as-is |
| Version URL Routing | `app/a/[shareToken]/v/[version]/...` | Keep as-is |
| Iframe URL Generation | `ArtifactViewer.tsx` | Copy to DocumentViewer |
| ShareModal | `ArtifactHeader.tsx` | Keep, integrate into lifted component |

---

## Out of Scope (Future Tasks)

1. **Text Editing Suggestions** - Replace/delete text with accept/reject workflow
2. **Location Badges** - Tab/accordion hidden content indicators
3. **Active Viewers Presence** - Real-time presence indicators
4. **Element Highlighting in iframe** - Requires iframe communication
5. **Notifications** - Email/in-app notifications
6. **@mentions** - User mentions in comments

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Full Lift Strategy | Figma is source of truth, 2200 lines of polished UI | 2025-12-28 |
| 3-Phase Approach | Clean separation: UI first, backend second, integration third | 2025-12-28 |
| Phase 1 = Single Task | Lift everything at once, avoid partial states | 2025-12-28 |
| Keep ArtifactViewerPage | Preserve Convex integration, permissions, routing | 2025-12-28 |
| Comments Only (No Text Edits) | Text editing suggestions deferred to future task | 2025-12-28 |
| Include Badge Modes | Core part of tool UX per user clarification | 2025-12-28 |

---

## Risk Mitigation

### Risk: Breaking Existing Functionality

**Mitigation:**
- Keep `ArtifactViewer.tsx` until Phase 1 is confirmed working
- Feature flag if needed: `?newViewer=true` query param
- Test version routing, permissions, share modal in Phase 1

### Risk: Backend Schema Mismatch

**Mitigation:**
- Phase 1 uses mock data exactly as Figma has it
- Phase 2 designs schema to match frontend types
- Minimal frontend changes needed in Phase 3

---

## References

### Figma Design Files

- **DocumentViewer.tsx:** `figma-designs/src/app/components/DocumentViewer.tsx` (2198 lines)
- **CommentToolbar.tsx:** `figma-designs/src/app/components/CommentToolbar.tsx` (129 lines)

### Current Implementation Files

- **ArtifactViewerPage:** `app/src/components/artifact/ArtifactViewerPage.tsx` (144 lines)
- **ArtifactViewer:** `app/src/components/artifact/ArtifactViewer.tsx` (105 lines)
- **ArtifactHeader:** `app/src/components/artifact/ArtifactHeader.tsx` (121 lines)

### Documentation

- **Convex Rules:** `docs/architecture/convex-rules.md`
- **ADR Index:** `docs/architecture/decisions/_index.md`
