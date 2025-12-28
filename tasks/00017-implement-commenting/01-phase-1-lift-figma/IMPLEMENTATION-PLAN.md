# Phase 1 Implementation Plan: Lift Figma Design (Frontend Only)

**Author:** Software Architect Agent
**Created:** 2025-12-28
**Status:** Ready for Implementation

---

## Executive Summary

This plan details how to lift the complete DocumentViewer and CommentToolbar components from the Figma design exports into our application. This is a **wholesale lift** with minimal modifications - the goal is to get the Figma components rendering with their mock data before any backend integration.

**Key Principle:** Copy first, adapt minimally, verify it works.

---

## Component Architecture Overview

### Current State

```
app/src/components/artifact/
├── ArtifactViewerPage.tsx   # Convex data layer (KEEP)
├── ArtifactViewer.tsx       # Simple viewer (REPLACE)
├── ArtifactHeader.tsx       # Header with version switch (KEEP - may integrate later)
├── ArtifactFrame.tsx        # iframe wrapper (KEEP - reuse pattern)
├── VersionSwitcher.tsx      # Version dropdown (KEEP)
├── ShareModal.tsx           # Share dialog (KEEP)
└── MultiPageNavigation.tsx  # ZIP navigation (KEEP)
```

### Target State After Phase 1

```
app/src/components/
├── artifact/
│   ├── ArtifactViewerPage.tsx   # KEEP - passes data to DocumentViewer
│   ├── DocumentViewer.tsx       # NEW - Lifted from Figma (2198 lines)
│   ├── ArtifactViewer.tsx       # KEEP temporarily for fallback
│   ├── ArtifactHeader.tsx       # KEEP - may be unused in Phase 1
│   ├── ArtifactFrame.tsx        # KEEP - may be unused in Phase 1
│   ├── VersionSwitcher.tsx      # KEEP
│   ├── ShareModal.tsx           # KEEP
│   └── MultiPageNavigation.tsx  # KEEP
│
├── comments/                     # NEW directory
│   ├── CommentToolbar.tsx       # NEW - Lifted from Figma (129 lines)
│   └── types.ts                 # NEW - Extracted types
```

---

## Step-by-Step Implementation Instructions

### Step 1: Create Comments Directory and Types

**Files to create:**
- `app/src/components/comments/types.ts`

**Action:** Extract types from Figma DocumentViewer into a reusable types file.

```typescript
// app/src/components/comments/types.ts

export interface Author {
  name: string;
  avatar: string;
}

export interface Reply {
  id: string;
  author: Author;
  content: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  versionId: string;
  author: Author;
  content: string;
  timestamp: string;
  resolved: boolean;
  replies: Reply[];
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

export interface TextEdit {
  id: string;
  author: Author;
  type: 'delete' | 'replace';
  originalText: string;
  newText?: string;
  comment: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ActiveViewer {
  name: string;
  avatar: string;
  color: string;
  lastActive: number;
  viewingElement?: string;
}

export interface Version {
  id: string;
  number: number;
  fileName: string;
  entryPoint?: string;
  uploadedAt: string;
  uploadedBy: string;
  label?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  versions: Version[];
  members: { name: string; avatar: string }[];
  lastActivity: string;
  status: 'active' | 'archived';
}

export type ToolMode = 'comment' | 'text-edit' | null;
export type ToolBadge = 'one-shot' | 'infinite' | null;
export type FilterMode = 'all' | 'resolved' | 'unresolved';
```

---

### Step 2: Copy CommentToolbar Component

**Source:** `figma-designs/src/app/components/CommentToolbar.tsx`
**Target:** `app/src/components/comments/CommentToolbar.tsx`

**Modifications Required:**

1. **Import paths:** Change `./ui/*` to `@/components/ui/*`

```diff
- import { Button } from './ui/button';
- import { Badge } from './ui/badge';
- import {
-   Select,
-   SelectContent,
-   SelectItem,
-   SelectTrigger,
-   SelectValue,
- } from './ui/select';
+ import { Button } from '@/components/ui/button';
+ import { Badge } from '@/components/ui/badge';
+ import {
+   Select,
+   SelectContent,
+   SelectItem,
+   SelectTrigger,
+   SelectValue,
+ } from '@/components/ui/select';
```

2. **Move type exports:** Remove `ToolMode` and `ToolBadge` exports (they are now in `types.ts`)

```diff
- export type ToolMode = 'comment' | 'text-edit' | null;
- export type ToolBadge = 'one-shot' | 'infinite' | null;
+ import { ToolMode, ToolBadge } from './types';
```

3. **Add "use client" directive:** Add at top of file.

```typescript
"use client";
```

---

### Step 3: Copy DocumentViewer Component

**Source:** `figma-designs/src/app/components/DocumentViewer.tsx`
**Target:** `app/src/components/artifact/DocumentViewer.tsx`

**This is the largest lift (~2198 lines).** Apply these modifications:

#### 3.1 Add "use client" Directive

```typescript
"use client";
```

#### 3.2 Update Import Paths

```diff
- import { Button } from './ui/button';
- import { Badge } from './ui/badge';
- import { Avatar, AvatarFallback } from './ui/avatar';
- import { Card } from './ui/card';
- import { Textarea } from './ui/textarea';
- import {
-   Select,
-   SelectContent,
-   SelectItem,
-   SelectTrigger,
-   SelectValue,
- } from './ui/select';
- import {
-   DropdownMenu,
-   DropdownMenuContent,
-   DropdownMenuItem,
-   DropdownMenuTrigger,
-   DropdownMenuSeparator,
- } from './ui/dropdown-menu';
- import { CommentToolbar, ToolMode, ToolBadge } from './CommentToolbar';
- import type { TextEdit } from '../types';

+ import { Button } from '@/components/ui/button';
+ import { Badge } from '@/components/ui/badge';
+ import { Avatar, AvatarFallback } from '@/components/ui/avatar';
+ import { Card } from '@/components/ui/card';
+ import { Textarea } from '@/components/ui/textarea';
+ import {
+   Select,
+   SelectContent,
+   SelectItem,
+   SelectTrigger,
+   SelectValue,
+ } from '@/components/ui/select';
+ import {
+   DropdownMenu,
+   DropdownMenuContent,
+   DropdownMenuItem,
+   DropdownMenuTrigger,
+   DropdownMenuSeparator,
+ } from '@/components/ui/dropdown-menu';
+ import { CommentToolbar } from '@/components/comments/CommentToolbar';
+ import type {
+   Comment,
+   TextEdit,
+   ToolMode,
+   ToolBadge,
+   ActiveViewer,
+   Version,
+   Project
+ } from '@/components/comments/types';
```

#### 3.3 Remove Inline Interface Definitions

The DocumentViewer has these interfaces defined inline that should be removed (they are now in `types.ts`):
- `interface Version` (lines 47-55)
- `interface Project` (lines 57-65)
- `interface Comment` (lines 67-90)
- `interface ActiveViewer` (lines 106-112)

**Remove these inline definitions and use imports from types.ts.**

#### 3.4 Handle DocumentViewerProps Interface

The props interface needs to be preserved but may need adjustment for our integration:

```typescript
interface DocumentViewerProps {
  documentId: string;
  onBack: () => void;
  project?: Project;
  onNavigateToSettings?: () => void;
  onNavigateToShare?: () => void;
}
```

**Note:** In Phase 1, we will pass mock project data. Phase 3 will wire real data.

---

### Step 4: Verify ShadCN UI Components Exist

**Required ShadCN Components (already installed):**
- `button` - YES
- `badge` - YES
- `avatar` - YES
- `card` - YES (may not be actively used in DocumentViewer)
- `textarea` - YES
- `select` - YES
- `dropdown-menu` - YES

**Check if these exist:**
```bash
ls app/src/components/ui/
```

Based on glob results, all required components exist:
- `button.tsx`
- `badge.tsx`
- `avatar.tsx`
- `card.tsx`
- `textarea.tsx`
- `select.tsx`
- `dropdown-menu.tsx`

**No additional ShadCN components need to be installed.**

---

### Step 5: Update ArtifactViewerPage.tsx Integration

**Current implementation (app/src/components/artifact/ArtifactViewerPage.tsx):**
- Fetches artifact by shareToken
- Checks permissions
- Loads versions
- Renders `<ArtifactViewer />`

**Required changes for Phase 1:**

1. Import the new DocumentViewer
2. Create mock project data to pass to DocumentViewer
3. Replace `<ArtifactViewer />` with `<DocumentViewer />`

```typescript
// Add import
import { DocumentViewer } from "./DocumentViewer";

// Before the return statement, create mock project:
const mockProject = {
  id: artifact._id.toString(),
  name: artifact.title,
  description: "",
  versions: versions.map((v, idx) => ({
    id: `v${v.versionNumber}`,
    number: v.versionNumber,
    fileName: artifact.title,
    uploadedAt: new Date(v.createdAt).toLocaleDateString(),
    uploadedBy: currentUser?.name || "Unknown",
  })),
  members: [],
  lastActivity: new Date().toISOString(),
  status: "active" as const,
};

// Replace ArtifactViewer with DocumentViewer
return (
  <DocumentViewer
    documentId={artifact._id.toString()}
    onBack={() => router.push("/dashboard")} // or wherever
    project={mockProject}
    // onNavigateToSettings and onNavigateToShare can be undefined for now
  />
);
```

**IMPORTANT:** Keep the existing ArtifactViewer.tsx file - do not delete it yet. This allows for quick rollback if something breaks.

---

### Step 6: Handle the Embedded HTML Content

The Figma DocumentViewer contains embedded HTML strings for demo purposes:
- `sampleHTML` - Basic product landing page
- `interactiveComponentsHTML` - Interactive UI with tabs/accordions
- `interactiveComponentsSubPageHTML` - Documentation subpage

**For Phase 1:** Keep these mock HTML strings exactly as-is. They provide a working demo.

**For Phase 3:** These will be replaced with real artifact content loaded from Convex/R2.

---

### Step 7: Handle the iframe Content Loading

The Figma DocumentViewer loads HTML content into an iframe using `document.write()`:

```typescript
useEffect(() => {
  if (iframeRef.current) {
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      // ... event listeners
    }
  }
}, [currentVersionId, htmlContent, currentPage]);
```

**For Phase 1:** This pattern works for mock data.

**For Phase 3:** We will replace `htmlContent` with content fetched from the real artifact URL. The current ArtifactViewer uses an iframe `src` attribute pointing to `${convexUrl}/artifact/${shareToken}/v${versionNumber}/${page}`. We will adapt DocumentViewer to support this pattern.

---

## Import Path Mapping Reference

| Figma Import | Our App Import |
|--------------|----------------|
| `'./ui/button'` | `'@/components/ui/button'` |
| `'./ui/badge'` | `'@/components/ui/badge'` |
| `'./ui/avatar'` | `'@/components/ui/avatar'` |
| `'./ui/card'` | `'@/components/ui/card'` |
| `'./ui/textarea'` | `'@/components/ui/textarea'` |
| `'./ui/select'` | `'@/components/ui/select'` |
| `'./ui/dropdown-menu'` | `'@/components/ui/dropdown-menu'` |
| `'./CommentToolbar'` | `'@/components/comments/CommentToolbar'` |
| `'../types'` | `'@/components/comments/types'` |

---

## Type Extraction Strategy

### Types to Extract from DocumentViewer.tsx

1. **Version** (lines 47-55) - Move to `types.ts`
2. **Project** (lines 57-65) - Move to `types.ts`
3. **Comment** (lines 67-90) - Move to `types.ts`
4. **ActiveViewer** (lines 106-112) - Move to `types.ts`

### Types Already in Figma types.ts

The file `figma-designs/src/app/types.ts` contains:
- `User`
- `Comment` (simpler version without versionId)
- `Reply`
- `TextEdit`
- `Document`
- `Workspace`
- `Permission`
- `Invitation`

**Strategy:** Create our own `types.ts` that merges the DocumentViewer inline types with a subset of the Figma types.ts. This gives us flexibility.

---

## Integration Points with ArtifactViewerPage

### Data Flow

```
ArtifactViewerPage (Convex data layer)
    |
    |-- useQuery(api.artifacts.getByShareToken)
    |-- useQuery(api.artifacts.getVersions)
    |-- useQuery(api.sharing.getUserPermission)
    |
    v
DocumentViewer (UI layer - Phase 1 uses mock data)
    |
    |-- Mock comments (hardcoded)
    |-- Mock text edits (hardcoded)
    |-- Mock HTML content (hardcoded)
    |-- Mock active viewers (hardcoded)
```

### Props Mapping

| ArtifactViewerPage Data | DocumentViewer Prop | Phase 1 Value |
|-------------------------|---------------------|---------------|
| `artifact` | `project.name` | Map from artifact.title |
| `versions` | `project.versions` | Map from versions array |
| `targetVersion` | `project.versions[current]` | Derived from versions |
| `currentUser` | Not used in Phase 1 | Mock "You" user |
| `userPermission` | Not used in Phase 1 | Assume can comment |

---

## Risk Areas and Mitigations

### Risk 1: Missing UI Components

**Symptom:** TypeScript errors about missing imports
**Mitigation:** All required ShadCN components are already installed (verified via glob). If any are missing, install with `npx shadcn@latest add [component]`.

### Risk 2: CSS/Styling Conflicts

**Symptom:** Layout breaks, styling looks wrong
**Mitigation:** The DocumentViewer uses Tailwind classes exclusively. Our app uses the same Tailwind setup. The only potential issue is the inline `<style>` tag with CSS animations - this should work fine.

### Risk 3: Event Listener Memory Leaks

**Symptom:** Console warnings, performance degradation
**Mitigation:** The DocumentViewer already has cleanup in `useEffect` returns. Verify these work correctly.

### Risk 4: iframe Security Issues

**Symptom:** Cross-origin errors in console
**Mitigation:** The mock HTML is written directly to the iframe via `document.write()`, which avoids cross-origin issues. This pattern works in development.

### Risk 5: Breaking Existing Routing

**Symptom:** Navigation stops working
**Mitigation:** Keep the existing route structure. ArtifactViewerPage handles routing - DocumentViewer is just a rendering component.

### Risk 6: Version Switching Breaks

**Symptom:** Switching versions does nothing or errors
**Mitigation:** The Figma DocumentViewer has its own version management UI. For Phase 1, this is disconnected from our real version routing. The mock data switches work internally. Phase 3 will connect to real routing.

---

## Testing Strategy

### Manual Testing Checklist

1. **Basic Rendering**
   - [ ] Navigate to `/a/[shareToken]`
   - [ ] DocumentViewer renders without errors
   - [ ] No console errors

2. **Comment Toolbar**
   - [ ] Toolbar visible with Comment and Text Edit buttons
   - [ ] Clicking Comment button activates comment mode (purple highlight)
   - [ ] Clicking Text Edit button activates text edit mode (green highlight)
   - [ ] Badge click cycles through: none -> one-shot -> infinite -> none
   - [ ] Filter dropdown works (All/Unresolved/Resolved)
   - [ ] Active items count displays

3. **Comments Sidebar**
   - [ ] Sidebar visible with mock comments
   - [ ] Comments show author avatar, name, timestamp
   - [ ] Comments show highlighted text or element type
   - [ ] Image comments show preview thumbnail
   - [ ] Replies are visible under parent comments
   - [ ] Clicking comment scrolls/highlights element in iframe
   - [ ] Reply button opens reply input
   - [ ] Resolve/Unresolve toggle works

4. **Text Edits Section**
   - [ ] Text edits section visible in sidebar
   - [ ] Track changes display (strikethrough + new text)
   - [ ] Accept/Reject buttons visible for pending edits
   - [ ] Status badges show correctly

5. **Version Switching (Mock)**
   - [ ] Version dropdown in header works
   - [ ] Switching versions changes displayed comments
   - [ ] "Default" badge shows on default version
   - [ ] Historical version banner appears for old versions

6. **Active Viewers**
   - [ ] Viewer avatars visible in header
   - [ ] "X viewing" count shown
   - [ ] Popover opens on click showing viewer details
   - [ ] Presence indicators animate in iframe (mock)

7. **Existing Functionality**
   - [ ] Browser back button works
   - [ ] URL is correct for the route
   - [ ] Page refresh maintains state

### E2E Test Cases (for tests/e2e/)

```typescript
// tests/e2e/document-viewer.spec.ts

describe('DocumentViewer Phase 1', () => {
  beforeEach(() => {
    // Navigate to a test artifact
    cy.visit('/a/test-share-token');
  });

  it('renders the DocumentViewer component', () => {
    cy.get('[data-testid="document-viewer"]').should('exist');
  });

  it('displays the comment toolbar', () => {
    cy.contains('Comment').should('be.visible');
    cy.contains('Text Edit').should('be.visible');
  });

  it('shows mock comments in sidebar', () => {
    cy.contains('Sarah Chen').should('be.visible');
    cy.contains('The hero section looks great').should('be.visible');
  });

  it('toggles comment tool mode', () => {
    cy.contains('Comment').click();
    cy.contains('Comment').should('have.class', 'bg-purple-600');
  });

  it('filters comments by resolved status', () => {
    cy.get('select').select('Resolved');
    cy.contains('Font size looks perfect').should('be.visible');
  });
});
```

### Validation Video Requirements

Record a video demonstrating:
1. Page load and initial render
2. Comment toolbar interactions (mode switching, badge clicks, filtering)
3. Sidebar interactions (scrolling, clicking comments, replies)
4. Version switching in header
5. Active viewers popover
6. iframe content and element highlighting

---

## Success Criteria Checklist

- [ ] DocumentViewer component compiles without TypeScript errors
- [ ] CommentToolbar component compiles without TypeScript errors
- [ ] types.ts contains all required type definitions
- [ ] Navigate to `/a/[shareToken]` renders new DocumentViewer
- [ ] Comment toolbar visible with both tools
- [ ] Sidebar shows mock comments
- [ ] Can toggle tool modes (comment/text-edit)
- [ ] Can toggle badge modes (one-shot/infinite)
- [ ] Can filter comments (all/resolved/unresolved)
- [ ] Can reply to comments (mock - in-memory only)
- [ ] Can resolve/unresolve comments (mock - in-memory only)
- [ ] Clicking comment highlights element in iframe
- [ ] Version dropdown shows mock versions
- [ ] Active viewers popover works
- [ ] No console errors during normal operation
- [ ] Existing routes continue to work
- [ ] Validation video recorded

---

## Files to Create

| File | Source | Notes |
|------|--------|-------|
| `app/src/components/comments/types.ts` | New file | Extract types from DocumentViewer |
| `app/src/components/comments/CommentToolbar.tsx` | Copy from Figma | Update imports |
| `app/src/components/artifact/DocumentViewer.tsx` | Copy from Figma | Update imports, remove inline types |

## Files to Modify

| File | Change |
|------|--------|
| `app/src/components/artifact/ArtifactViewerPage.tsx` | Import and render DocumentViewer |

## Files to Keep (No Changes)

| File | Reason |
|------|--------|
| `app/src/components/artifact/ArtifactViewer.tsx` | Fallback/rollback option |
| `app/src/components/artifact/ArtifactHeader.tsx` | May reuse later |
| `app/src/components/artifact/ArtifactFrame.tsx` | May reuse later |
| `app/src/components/artifact/VersionSwitcher.tsx` | May reuse later |
| `app/src/components/artifact/ShareModal.tsx` | Keep for share functionality |

---

## Implementation Order

1. **Create `app/src/components/comments/` directory**
2. **Create `app/src/components/comments/types.ts`** with all type definitions
3. **Create `app/src/components/comments/CommentToolbar.tsx`** from Figma source
4. **Create `app/src/components/artifact/DocumentViewer.tsx`** from Figma source
5. **Update `app/src/components/artifact/ArtifactViewerPage.tsx`** to use DocumentViewer
6. **Start dev servers and verify rendering**
7. **Run through manual testing checklist**
8. **Create E2E tests in `tasks/00017-implement-commenting/01-phase-1-lift-figma/tests/e2e/`**
9. **Record validation video**

---

## Rollback Plan

If something goes wrong:

1. Revert changes to `ArtifactViewerPage.tsx` to use the original `ArtifactViewer`
2. The new files (`DocumentViewer.tsx`, `CommentToolbar.tsx`, `types.ts`) can remain but won't be used
3. No database or backend changes in Phase 1, so no data migrations needed

---

## Handoff Notes for TDD Developer

1. **Start by reading this plan completely**
2. **Create the files in order listed above**
3. **Copy code blocks exactly from Figma source, then apply the documented modifications**
4. **Do not refactor or optimize - this is a wholesale lift**
5. **Keep all mock data intact - do not remove or modify mock comments/edits**
6. **Test incrementally - verify each component compiles before moving to the next**
7. **Use `npm run dev` and check browser console for errors**
8. **Document any deviations from this plan in the task README**

---

## Appendix: Full Import Statement for DocumentViewer

```typescript
"use client";

import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  Users,
  MessageSquare,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Check,
  Reply,
  X,
  Eye,
  ChevronDown,
  Send,
  CheckCircle2,
  XCircle,
  Edit3,
  Upload,
  History,
  Star,
  MapPin,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CommentToolbar } from '@/components/comments/CommentToolbar';
import type {
  Comment,
  TextEdit,
  ToolMode,
  ToolBadge,
  ActiveViewer,
  Version,
  Project
} from '@/components/comments/types';
```

---

## Appendix: Full Import Statement for CommentToolbar

```typescript
"use client";

import { MessageSquare, Edit3, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ToolMode, ToolBadge } from './types';
```
