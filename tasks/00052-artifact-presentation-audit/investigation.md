# Artifact Rendering Architecture Investigation Report

## Executive Summary

This investigation traces the complete rendering pipeline for all artifact types (HTML, Markdown, ZIP/multi-file) and explains why commenting/annotation works on Markdown but not HTML/ZIP artifacts. The root cause is an **iframe sandbox boundary** that prevents DOM access required for text selection and highlighting.

---

## 1. Multi-file Markdown Artifacts (ZIP containing .md files)

### Rendering Path

**Entry Point:** `src/components/artifact/ArtifactViewer.tsx`

#### Component Hierarchy:
1. **ArtifactViewer** (lines 59-597)
   - Detects file type from `version.fileType` (line 40: `fileType: "html" | "zip" | "markdown"`)
   - Determines if current page is Markdown: `const isMarkdown = currentPage.toLowerCase().endsWith('.md')...` (line 441)
   - Renders conditionally based on `isMarkdown` flag (line 535)

2. **MarkdownViewer** (when `isMarkdown === true`)
   - File: `src/components/artifact/MarkdownViewer.tsx`
   - Fetches raw content via HTTP: `const response = await fetch(src)` (line 46)
   - Content URL constructed as: `${convexHttpUrl}/artifact/${shareToken}/v${version.number}/${currentPage}` (line 439 in ArtifactViewer)
   - Parses with ReactMarkdown library (line 120)
   - Renders directly to DOM as React elements (no iframe)
   - Supports GFM tables, syntax highlighting, Mermaid diagrams (lines 4-5, 152-154)

#### File Serving for ZIP:
- HTTP endpoint: `/artifact/{shareToken}/v{number}/{filePath}` (convex/http.ts:96-143)
- Backend query: `internal.artifacts.getFileByPath` retrieves file from `artifactFiles` table by path
- Files stored with `storageId` reference to Convex File Storage (schema.ts:467)
- MIME type determined from file extension (schema.ts:477)

### Why Commenting Works:
✅ **Direct DOM Rendering**
- MarkdownViewer renders content as React components in the same document
- Selection system (`useSelectionLayer`) can access `window.getSelection()` (TextAdapter.ts:50)
- Highlights rendered using `SelectionOverlay` (ArtifactViewer.tsx:559-564)
- Text ranges calculated via `Range.getBoundingClientRect()` (SelectionOverlay.tsx:55-62)

---

## 2. Multi-file HTML/ZIP Artifacts

### Rendering Path

**Entry Point:** Same ArtifactViewer component (lines 59-597)

#### Component Hierarchy:
1. **ArtifactViewer** determines `isMarkdown === false` for HTML files (line 441)
2. Renders **ArtifactFrame** component (line 552)
   - File: `src/components/artifact/ArtifactFrame.tsx`
   - **CRITICAL:** Uses `<iframe>` element (line 23)
   - Sandbox attributes: `"allow-scripts allow-same-origin"` (line 27)
   - Same content URL pattern: `/artifact/{shareToken}/v{version}/{filePath}`

#### File Structure (ZIP artifacts):
- Extracted files stored in `artifactFiles` table (schema.ts:446-531)
- Each file has: `path`, `storageId`, `mimeType`, `size` (lines 461-484)
- File tree built from paths (ArtifactViewer.tsx:393-432)
- Navigation between files via `currentPage` state (line 72-82)
- Deep linking supported via URL: `/a/{token}/v/{version}/{filepath}` (line 81)

### Why Commenting Fails:
❌ **Iframe Isolation Boundary**
- HTML content renders in separate browsing context (iframe)
- Selection API isolated: `window.getSelection()` returns parent frame selection, NOT iframe content selection
- Cross-origin restrictions prevent `iframe.contentDocument` access even with `allow-same-origin`
- Overlay cannot calculate text positions inside iframe (SelectionOverlay requires direct DOM access)
- Comment from ArtifactViewer.tsx:542-550:
  ```typescript
  // For HTML in Iframe, we can't easily overlay DIVs inside it from here unless
  // we inject the layer INTO the iframe.
  // ...
  // If `ArtifactFrame` is an Iframe, `useSelectionLayer` won't work on `window` selection outside.
  ```

---

## 3. Single-file Markdown

### Rendering Path

**Same as multi-file Markdown** - No difference in rendering pipeline.

#### Data Storage:
- Single file stored in `artifactFiles` table with `entryPoint` path (schema.ts:358)
- Default path: `document.md` (from `getDefaultFilePath` in convex/lib/fileTypes.ts, referenced in artifacts.ts:69)
- Served via same HTTP endpoint: `/artifact/{shareToken}/v{version}/{entryPoint}`

### Why Commenting Works:
✅ **Same as multi-file Markdown** - Direct DOM rendering via MarkdownViewer

---

## 4. Single-file HTML

### Rendering Path

**Same as multi-file HTML/ZIP** - Uses iframe regardless of file count.

#### Data Storage:
- Single file in `artifactFiles` table
- Default path: `index.html` (artifacts.ts:69)
- `fileType: "html"` in schema (schema.ts:350)

### Why Commenting Fails:
❌ **Same iframe isolation as multi-file HTML**

---

## 5. Annotation/Selection System Architecture

### Core Components

#### Selection Management:
**File:** `src/lib/annotation/manager.ts`
- `AnnotationManager` class (lines 13-101)
- Singleton instance created globally (useSelectionLayer.ts:9)
- Adapters for different content types:
  - **TextAdapter** (adapters/TextAdapter.ts) - Handles text/markdown
  - **SVGAdapter** (adapters/SVGAdapter.ts) - Handles SVG graphics

#### TextAdapter Selection Flow:
**File:** `src/lib/annotation/adapters/TextAdapter.ts`
1. Binds to container element via `bindContainer(element)` (line 38)
2. Listens to `mouseup` event (line 47)
3. Reads `window.getSelection()` after user selects text (line 50)
4. Validates selection is within container (line 75)
5. Uses Apache Annotator to create W3C TextQuoteSelector (line 81)
   - Format: `{ type: "TextQuoteSelector", exact: "...", prefix: "...", suffix: "..." }` (types.ts:10-15)
6. Emits `selection:create` event with DOMRect position (manager.ts:52)

#### Highlighting System:
**File:** `src/lib/annotation/react/SelectionOverlay.tsx`
1. Receives W3C selectors as props (line 7)
2. Re-anchors selectors to DOM using Apache Annotator's `createTextQuoteSelectorMatcher` (line 55)
3. Calculates client rects for each text range (lines 119-173)
4. Renders absolutely positioned div overlays (lines 227-253)
5. Styles vary by annotation type:
   - Comment: Yellow highlight (`bg-yellow-100`, line 180)
   - Strike: Red background + strikethrough line (lines 183-223)

#### UI Integration:
**File:** `src/components/artifact/ArtifactViewer.tsx`
- Selection hook: `useSelectionLayer` (lines 239-263)
- Selection menu: `SelectionMenu` popup for comment/strike actions (lines 472-480)
- Sidebar: `AnnotationSidebar` for comment thread management (lines 570-592)
- Overlay: `SelectionOverlay` for highlights (lines 559-564)
- **CRITICAL CHECK:** Overlay only rendered when `isMarkdown === true` (line 559)

#### React Hook:
**File:** `src/lib/annotation/react/useSelectionLayer.ts`
- Registers text container with manager (line 19)
- Subscribes to selection events (lines 41-51)
- Callback: `onSelectionCreate(selector, domRect)` triggers menu display (ArtifactViewer.tsx:240)

---

## 6. Why Iframe Commenting Cannot Work (Current Architecture)

### Technical Barriers:

1. **Selection API Isolation:**
   - `window.getSelection()` returns Selection object for current frame only
   - Iframe has separate `window` object with own Selection
   - Parent cannot read `iframe.contentWindow.getSelection()` due to sandbox

2. **DOM Access Prevention:**
   - TextAdapter requires access to text nodes (TextAdapter.ts:74-76)
   - SelectionOverlay needs to traverse DOM to calculate ranges (SelectionOverlay.tsx:131-170)
   - Iframe content is in separate document tree

3. **Coordinate Calculation:**
   - `Range.getBoundingClientRect()` returns viewport-relative coordinates
   - Overlay divs positioned relative to parent document
   - Iframe scroll and offset create coordinate mismatch

4. **Apache Annotator Dependency:**
   - Library operates on a single document context
   - `createTextQuoteSelectorMatcher` expects direct access to root element
   - Cannot traverse across iframe boundary

### Code Evidence:
From ArtifactViewer.tsx (lines 542-558):
```typescript
// For HTML in Iframe, we can't easily overlay DIVs inside it from here unless
// we inject the layer INTO the iframe.
// FOR NOW: Let's support Markdown fully.
// Supporting HTML Iframe annotations requires logic injection which is a larger task.
```

From ArtifactFrame test (src/components/artifact/__tests__/ArtifactFrame.test.tsx:15):
Comment references "iframe issue where we can't access iframe.contentDocument from different origins."

---

## 7. Data Model: Comment Storage

### Schema:
**File:** `convex/schema.ts` (lines 534-678)

```typescript
comments: {
  versionId: Id<"artifactVersions">,
  createdBy: Id<"users">,
  content: string,
  target: any,  // Self-describing JSON (line 609)
  resolved: boolean,
  // ... soft delete, timestamps
}
```

### Target Format (W3C Annotation):
**File:** `src/lib/annotation/types.ts` (lines 24-35)
```typescript
interface AnnotationTarget {
  source: string;           // File path (e.g., "docs/README.md")
  selector: W3CSelector;     // TextQuoteSelector or SVGSelector
  schemaVersion: string;     // "1.0.0"
}
```

### Storage Adapter:
**File:** `src/lib/annotation/adapters/convex-adapter.ts`
- `convexToAnnotation`: Converts DB comment to UI AnnotationDisplay
- `selectionToConvexTarget`: Converts W3C selector to Convex target format (ArtifactViewer.tsx:329)

### Multi-file Support:
- Each comment's `target.source` field stores the file path (types.ts:25)
- Filtering by current page: `annotations.filter(a => a.target?.source === currentPage)` (ArtifactViewer.tsx:200-203)
- Deep linking preserves context: URL includes filepath, annotations load for that file

---

## 8. File References Summary

### Key Files by Function:

| Function | File Path | Key Lines |
|----------|-----------|-----------|
| Main viewer orchestration | `src/components/artifact/ArtifactViewer.tsx` | 59-597 |
| Markdown rendering | `src/components/artifact/MarkdownViewer.tsx` | 1-169 |
| HTML iframe rendering | `src/components/artifact/ArtifactFrame.tsx` | 1-30 |
| File serving (HTTP) | `convex/http.ts` | 96-143 |
| Selection management | `src/lib/annotation/manager.ts` | 13-101 |
| Text selection adapter | `src/lib/annotation/adapters/TextAdapter.ts` | 6-99 |
| Highlight overlay | `src/lib/annotation/react/SelectionOverlay.tsx` | 1-266 |
| Selection hook | `src/lib/annotation/react/useSelectionLayer.ts` | 1-59 |
| Annotation types | `src/lib/annotation/types.ts` | 1-48 |
| Database schema | `convex/schema.ts` | 534-678 |
| Artifact CRUD | `convex/artifacts.ts` | 1-1311 |

---

## 9. Solution Options for HTML Commenting

To enable commenting on HTML/ZIP artifacts, the following approaches are possible:

### Option A: Iframe Injection (PostMessage Bridge)
**Complexity: High | Security: Medium**
1. Inject annotation library script into iframe content at serve time
2. Use PostMessage API for bidirectional parent-iframe communication
3. Iframe reports selection events to parent
4. Parent sends highlight commands to iframe
5. Coordinate transformation between frame contexts

**Requirements:**
- Same-origin serving (already satisfied)
- Script injection in HTTP handler (convex/http.ts)
- New IframeAnnotationAdapter class
- PostMessage protocol definition

### Option B: Render HTML as Shadow DOM
**Complexity: Medium | Security: Low Risk**
1. Fetch HTML content via HTTP (like Markdown)
2. Sanitize HTML (remove scripts, dangerous tags)
3. Inject into Shadow DOM to isolate styles
4. Selection system works on shadow-piercing basis

**Requirements:**
- HTML sanitization library (DOMPurify)
- Shadow DOM rendering component
- CSS scoping to prevent style leakage

### Option C: Screenshot-based Commenting
**Complexity: Low | Security: Low Risk**
1. Capture screenshot regions of iframe
2. Allow comments on image coordinates
3. No text-level precision

**Requirements:**
- html2canvas or similar library
- Image annotation adapter
- Lower precision acceptable

---

## 10. Recommended Path Forward

Given the current architecture, **Option A (PostMessage Bridge)** is the most complete solution but has the highest complexity. The implementation would involve:

1. **Phase 1: Protocol Design**
   - Define PostMessage message types for selection/highlight events
   - Create shared type definitions

2. **Phase 2: Iframe Script Injection**
   - Modify `convex/http.ts` to inject annotation script into served HTML
   - Create `iframe-annotation-client.js` bundle

3. **Phase 3: Parent-Side Adapter**
   - Create `IframeAnnotationAdapter` extending current adapter interface
   - Handle coordinate transformations

4. **Phase 4: Integration**
   - Update `ArtifactViewer.tsx` to use iframe adapter when `isMarkdown === false`
   - Enable SelectionOverlay for iframe content

**Current Status:** System explicitly designed for Markdown-only commenting (ArtifactViewer.tsx:559 conditional render).

---

## 11. DRY Analysis: Do These Files Need Refactoring?

### Files Analyzed

| File | Lines | Responsibility |
|------|-------|----------------|
| `ArtifactViewer.tsx` | 597 | Orchestration, annotation system, file tree, navigation |
| `MarkdownViewer.tsx` | 169 | Markdown fetching & rendering |
| `ArtifactFrame.tsx` | 31 | Iframe wrapper for HTML |

### Duplication Found

**1. Loading Skeleton Pattern - DUPLICATED (~10 lines each)**

Both `MarkdownViewer.tsx:80-91` and `ArtifactFrame.tsx:9-20` have nearly identical skeleton code:

```tsx
// MarkdownViewer.tsx (lines 80-91)
<div className="w-full h-full flex items-center justify-center bg-gray-50">
  <div className="space-y-4 w-full p-6">
    <Skeleton className="h-12 w-3/4" />
    <Skeleton className="h-8 w-1/2" />
    <Skeleton className="h-8 w-2/3" />
    <Skeleton className="h-64 w-full" />
  </div>
</div>

// ArtifactFrame.tsx (lines 9-20) - IDENTICAL
```

**Recommendation:** Could extract to `<ContentSkeleton />` component, but the overhead of creating/maintaining a shared component may not justify the ~10 lines saved. Low priority.

### What's NOT Duplicated (Good Separation)

| Pattern | Location | Notes |
|---------|----------|-------|
| URL construction | `ArtifactViewer.tsx:439` only | Centralized, passed as `src` prop |
| Annotation/selection logic | `ArtifactViewer.tsx` + `/lib/annotation/` | Self-contained system |
| File tree logic | `ArtifactViewer.tsx:393-432` | ZIP-specific, appropriately located |
| Markdown rendering | `MarkdownViewer.tsx` | ReactMarkdown + plugins |
| Iframe rendering | `ArtifactFrame.tsx` | Minimal, single-purpose |

### Missing Patterns (Gaps, Not Duplication)

1. **Error handling in ArtifactFrame** - MarkdownViewer has error state (lines 94-103), ArtifactFrame does not handle iframe load failures
2. **No shared content fetching** - MarkdownViewer fetches via `fetch()`, ArtifactFrame relies on browser's iframe loading

### Verdict: Appropriately DRY ✅

The architecture shows **good separation of concerns**:

- **ArtifactViewer** = Orchestrator (routing, state, annotation integration)
- **MarkdownViewer** = Format-specific renderer (Markdown → DOM)
- **ArtifactFrame** = Format-specific renderer (HTML → iframe)

**No urgent refactoring needed.** The only duplication is the loading skeleton (~20 lines total across both files), which is minor. The components are appropriately separated by responsibility.

### Potential Future Improvements (Low Priority)

1. Extract `<ContentSkeleton />` if more viewers are added
2. Add error boundary to `ArtifactFrame` for failed iframe loads
3. Create `useContentFetch()` hook if more fetch patterns emerge

---

## Conclusion

The annotation system is architecturally sound but **fundamentally incompatible with iframe-rendered content**. Markdown artifacts render directly to the DOM, allowing the selection system to access text nodes and calculate highlight positions. HTML artifacts use iframes for security isolation, creating an insurmountable barrier for the current DOM-based selection approach.

### Key Insight
The decision to use iframes for HTML was made for security/isolation (preventing malicious HTML from affecting the parent page). Any solution must either:
1. Break the iframe boundary (complex, security implications)
2. Inject code into the iframe (PostMessage approach)
3. Fundamentally redesign for cross-frame operation
4. Accept Markdown-only commenting as the permanent limitation
