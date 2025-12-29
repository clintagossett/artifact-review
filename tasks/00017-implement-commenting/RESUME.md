# Task 17 Session Resume

**Last Updated:** 2025-12-28
**Session:** Phase 2 Backend COMPLETE, Artifact Viewing FIXED, Ready for Phase 3 Integration

---

## Current Status

### ✅ Completed

#### Phase 1: Figma Lift (COMPLETE)
- DocumentViewer component with full commenting UI (2,197 lines)
- CommentToolbar with all interactions
- Mock data working visually
- Location: `tasks/00017-implement-commenting/01-phase-1-lift-figma/`

#### Phase 2: Backend API (COMPLETE) ✅
- **87/87 tests passing** - Full backend implementation
- 9 Convex functions (5 comment ops, 4 reply ops)
- 5 internal permission helpers
- 2,988 lines of production code and tests
- Files:
  - `app/convex/comments.ts` (268 lines)
  - `app/convex/commentReplies.ts` (238 lines)
  - `app/convex/lib/commentPermissions.ts` (167 lines)
  - `app/convex/__tests__/comments.test.ts` (2,060 lines)
  - `app/convex/schema.ts` (+254 lines for comments tables)
- Code review: APPROVED ✅
- Location: `tasks/00017-implement-commenting/02-phase-2-backend/`
- Commit: d325166

#### Artifact Viewing Infrastructure (COMPLETE) ✅
**Problem:** Before we could integrate commenting, needed real artifact HTML rendering to work.

**Fixed Today:**
1. **Created sample artifact** - `samples/interactive-ui-components-demo.html`
   - Self-contained HTML with tabs, accordions, hidden content
   - Element IDs matching mock comments for seamless testing
   - 5.5KB, fully interactive

2. **Fixed DocumentViewer rendering:**
   - Changed from mock HTML (`doc.write(mockHTML)`) to real artifact URL
   - Updated props to accept `shareToken`, `versionNumber`, `convexUrl`
   - Changed iframe from `srcDoc` to `src={artifactUrl}`
   - Updated ArtifactViewerPage to pass real artifact data
   - Files modified:
     - `app/src/components/artifact/DocumentViewer.tsx`
     - `app/src/components/artifact/ArtifactViewerPage.tsx`

3. **Fixed Convex URL configuration:**
   - **Problem:** Convex requires TWO separate URLs
     - `.convex.cloud` - For SDK (queries/mutations)
     - `.convex.site` - For HTTP actions (serving artifacts)
   - **Solution:** Added dual env vars in `.env.local`:
     - `NEXT_PUBLIC_CONVEX_URL=https://mild-ptarmigan-109.convex.cloud`
     - `NEXT_PUBLIC_CONVEX_HTTP_URL=https://mild-ptarmigan-109.convex.site`
   - ArtifactViewerPage uses `NEXT_PUBLIC_CONVEX_HTTP_URL` for iframe

4. **Fixed schema compatibility:**
   - Added `isAnonymous: v.optional(v.boolean())` to users table
   - Allows legacy anonymous user data (hundreds of old test users)
   - File: `app/convex/schema.ts`

**Result:**
- Real artifact HTML now renders at `http://localhost:3000/a/{shareToken}` ✅
- HTTP router serving correctly: `https://mild-ptarmigan-109.convex.site/artifact/{shareToken}/v{versionNumber}/index.html` ✅
- Ready for commenting integration ✅

#### Phase 3 Planning (COMPLETE)
- Restructured to combine UI + backend integration into single phase
- Removed redundant "build with mock data then wire" approach
- Plan: Create hooks → Wire to DocumentViewer → Test
- Location: `tasks/00017-implement-commenting/03-phase-3-frontend-integration/README.md`

### ⏳ Next Up

**Phase 3: Wire Backend to Frontend** (Not Started)

Since we already have:
- ✅ Frontend UI (DocumentViewer with mock comments)
- ✅ Backend API (87/87 tests passing)
- ✅ Artifact viewing working

The remaining work is straightforward integration:

**Subtask 01: Create Hooks** (~30 min)
- `app/src/hooks/useComments.ts` - Fetch comments for version
- `app/src/hooks/useCommentReplies.ts` - Fetch replies for comment
- `app/src/hooks/useCommentActions.ts` - Comment mutations (create, update, delete, resolve)
- `app/src/hooks/useReplyActions.ts` - Reply mutations (create, update, delete)

**Subtask 02: Wire Data** (~1 hour)
- Replace mock comments in DocumentViewer with `useComments(versionId)`
- Replace mock replies with `useCommentReplies(commentId)`
- Wire all buttons to mutation hooks
- Add loading/error states
- Add optimistic updates

**Subtask 03: Testing** (~1 hour)
- E2E tests for complete commenting flow
- Test scenarios:
  - Create comment
  - Reply to comment
  - Edit own comment
  - Delete own comment
  - Toggle resolved
  - Owner vs reviewer permissions
- Validation video
- Test report

---

## Architecture Summary

### Data Flow (Phase 3)

```
DocumentViewer (React)
  ↓
useComments(versionId) → Convex query → comments.getByVersion
  ↓
Comments display in sidebar
  ↓
User clicks "Add Comment" → useCommentActions().createComment() → Convex mutation
  ↓
Real-time update → useComments refreshes → UI updates
```

### Backend API (Phase 2 - Complete)

#### Comment Operations
| Function | Type | Purpose |
|----------|------|---------|
| `getByVersion` | query | Get all comments for a version |
| `create` | mutation | Create new comment |
| `updateContent` | mutation | Edit comment content |
| `toggleResolved` | mutation | Mark resolved/unresolved |
| `softDelete` | mutation | Soft delete comment |

#### Reply Operations
| Function | Type | Purpose |
|----------|------|---------|
| `getReplies` | query | Get all replies for a comment |
| `createReply` | mutation | Add reply |
| `updateReply` | mutation | Edit reply |
| `softDeleteReply` | mutation | Soft delete reply |

### Frontend Components (Phase 1 - Complete)

- **DocumentViewer** - Main artifact viewer with iframe and comment sidebar
- **CommentToolbar** - Floating toolbar with comment/text-edit tools
- **Comment display** - Thread UI with replies, resolution, edit/delete controls
- All currently using mock data (to be replaced in Phase 3)

---

## Key Technical Details

### Convex URL Configuration

**CRITICAL:** Convex requires two separate URLs:

```bash
# .env.local
NEXT_PUBLIC_CONVEX_URL=https://mild-ptarmigan-109.convex.cloud        # SDK
NEXT_PUBLIC_CONVEX_HTTP_URL=https://mild-ptarmigan-109.convex.site    # HTTP
```

- **`.convex.cloud`** - Used by Convex React SDK for queries/mutations
- **`.convex.site`** - Used for HTTP actions (artifact file serving)

**Why separate?**
- Convex client validates deployment URL and rejects `.site` URLs
- HTTP router only responds on `.site` domain
- Different domains, same backend deployment

### Artifact HTML Serving

**URL Pattern:**
```
{CONVEX_HTTP_URL}/artifact/{shareToken}/v{versionNumber}/{filePath}
```

**Example:**
```
https://mild-ptarmigan-109.convex.site/artifact/dP0HV6OP/v1/index.html
```

**How it works:**
1. ArtifactViewerPage fetches version data from Convex
2. Passes `shareToken`, `versionNumber`, `convexUrl` to DocumentViewer
3. DocumentViewer builds iframe URL using HTTP endpoint
4. HTTP router (`app/convex/http.ts`) serves HTML directly from `version.htmlContent`

**For single-file HTML:**
- Content stored inline in `artifactVersions.htmlContent`
- Served directly by HTTP router with `text/html` MIME type
- No external files needed

### Schema: Comments + Replies

**Comments table (13 fields):**
```typescript
{
  versionId: Id<"artifactVersions">,  // Which version
  authorId: Id<"users">,               // Who created
  content: string,                     // Comment text
  resolved: boolean,                   // Resolution state
  target: any,                         // Versioned JSON metadata
  isEdited: boolean,                   // Edit tracking
  isDeleted: boolean,                  // Soft delete
  deletedBy?: Id<"users">,             // Audit trail
  // ... timestamps
}
```

**Target metadata (versioned JSON):**
```typescript
{
  _version: 1,
  type: "element" | "text",
  selectedText?: string,
  page?: string,
  elementId?: string,
  location?: {
    containerType?: string,
    containerLabel?: string,
    isHidden?: boolean
  }
}
```

---

## Files Modified This Session

### New Files Created
- `samples/interactive-ui-components-demo.html` - Test artifact with interactive UI

### Modified Files
- `app/src/components/artifact/DocumentViewer.tsx` - Real HTML rendering
- `app/src/components/artifact/ArtifactViewerPage.tsx` - Pass artifact data
- `app/convex/schema.ts` - Added `isAnonymous` field
- `app/.env.local` - Added `NEXT_PUBLIC_CONVEX_HTTP_URL`
- `samples/README.md` - Documented new test artifact
- `tasks/00017-implement-commenting/03-phase-3-frontend-integration/README.md` - Updated plan

### Commits (Today)
- 6b4cf30 - Task 17: Update RESUME.md with backend completion status
- (Ready to commit DocumentViewer changes)

---

## Testing Status

### Backend Tests (Phase 2) ✅
- **87/87 tests passing** (100% coverage)
- `app/convex/__tests__/comments.test.ts`
- All CRUD operations tested
- Permission boundaries enforced
- Soft delete + audit trails verified
- Cascade delete (comment → replies) working

### Frontend Tests (Phase 3) ⏳
- **Not yet created** (will be in Phase 3 Subtask 03)
- E2E tests using Playwright
- Test real commenting flow with backend integration
- Location: `tasks/00017-implement-commenting/03-phase-3-frontend-integration/03-testing/`

---

## Important Context

### Design Decisions

**1. Versioned JSON for Target Metadata**
- Backend stores opaque `v.any()` blob
- Frontend owns the schema entirely
- Self-describing with `_version` field
- Backend-agnostic (works for HTML, Markdown, PDF, etc.)

**2. Separate Tables for Replies**
- Independent CRUD operations
- Per-reply edit tracking
- Independent soft delete
- Avoids array mutation complexity

**3. Permission Model**
- **Owner:** Full control, can delete any comment (moderation)
- **Reviewer (can-comment):** Can create/edit own, cannot delete others
- **Outsiders:** Blocked from all operations

**4. Dual Convex URLs**
- SDK requires `.cloud` URL
- HTTP actions require `.site` URL
- Same backend, different entry points
- Configuration in `.env.local`

### Known Issues

**Version Upload Not Working** (Out of Scope)
- "Upload New Version" dialog exists but doesn't actually upload
- Mock implementation only
- Deferred to separate task
- For now: Test with single-version artifacts only

**ZIP Artifacts Not Supported** (Task 15 - Postponed)
- ZIP upload incomplete
- ZIP processing not triggered
- Single-file HTML works perfectly
- Multi-file artifacts deferred

---

## Success Criteria (Phase 3)

### Must Have
- [ ] Hooks created for all 9 backend functions
- [ ] Mock comments replaced with real Convex data
- [ ] Can create new comments via UI
- [ ] Can reply to comments
- [ ] Can edit own comments
- [ ] Can delete own comments (soft delete)
- [ ] Can toggle resolved status
- [ ] Owner can delete any comment
- [ ] Reviewer cannot delete others' comments
- [ ] Loading states display correctly
- [ ] Error messages show on failures
- [ ] E2E tests passing
- [ ] Validation video recorded

### Nice to Have
- [ ] Optimistic updates for better UX
- [ ] Real-time updates (Convex subscriptions)
- [ ] Toast notifications for actions
- [ ] Keyboard shortcuts

---

## Next Actions

### Immediate: Phase 3 Subtask 01 - Create Hooks

**Goal:** Create 4 React hooks that wrap Convex queries/mutations

**Files to create:**
1. `app/src/hooks/useComments.ts`
2. `app/src/hooks/useCommentReplies.ts`
3. `app/src/hooks/useCommentActions.ts`
4. `app/src/hooks/useReplyActions.ts`

**Pattern to follow:**
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useComments(versionId: Id<"artifactVersions"> | undefined) {
  return useQuery(
    api.comments.getByVersion,
    versionId ? { versionId } : "skip"
  );
}
```

**Estimated time:** 30 minutes

---

## References

- **Backend implementation:** `tasks/00017-implement-commenting/02-phase-2-backend/`
- **Frontend UI:** `tasks/00017-implement-commenting/01-phase-1-lift-figma/`
- **Phase 3 plan:** `tasks/00017-implement-commenting/03-phase-3-frontend-integration/README.md`
- **Convex hooks docs:** https://docs.convex.dev/client/react
- **HTTP router:** `app/convex/http.ts`
- **Sample artifact:** `samples/interactive-ui-components-demo.html`

---

**Status:** Backend complete, artifact viewing working, ready to wire commenting UI to backend ✅
