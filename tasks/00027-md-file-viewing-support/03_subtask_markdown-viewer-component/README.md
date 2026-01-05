# Subtask 03: Create MarkdownViewer Component

**Parent Task:** 00027-md-file-viewing-support
**Status:** COMPLETE
**Created:** 2026-01-03
**Completed:** 2026-01-03

---

## Objective

Create a `MarkdownViewer` component that renders markdown content using `react-markdown` with GFM support. This component will be used alongside the existing iframe-based `ArtifactFrame` for HTML artifacts.

---

## Background

Currently, `DocumentViewer.tsx` renders all artifacts via an iframe. For markdown files:
- The HTTP endpoint serves raw markdown text with `Content-Type: text/markdown`
- The iframe shows the raw markdown text (not rendered)

We need a new component that:
1. Fetches markdown content from the existing HTTP endpoint
2. Renders it as styled HTML using `react-markdown`
3. Provides consistent styling matching the platform design

---

## Requirements

### Component API

```typescript
interface MarkdownViewerProps {
  /** URL to fetch markdown content from */
  src: string;
  /** Loading state passed from parent */
  isLoading?: boolean;
  /** Optional CSS class for container */
  className?: string;
}
```

### Functionality

1. **Fetch Content**
   - Fetch markdown from `src` URL (reuses existing proxy endpoint)
   - Handle loading and error states
   - Support for re-fetch when `src` changes

2. **Render with react-markdown**
   - Use `react-markdown` with `remark-gfm` plugin
   - Render all GFM features: tables, task lists, strikethrough, autolinks

3. **Styling**
   - Apply prose styling (Tailwind typography or custom)
   - Match platform design system (purple accents, gray text)
   - Responsive layout
   - Proper spacing for headings, paragraphs, lists, tables
   - Code block styling (inline and fenced)

4. **Error Handling**
   - Show error state if fetch fails
   - Show fallback for empty content

---

## Component Location

```
app/src/components/artifact/MarkdownViewer.tsx
```

---

## Styling Approach

Use Tailwind CSS prose classes with customizations:

```tsx
<div className="prose prose-gray max-w-none
  prose-headings:text-gray-900
  prose-a:text-purple-600
  prose-code:bg-gray-100
  prose-pre:bg-gray-50">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {content}
  </ReactMarkdown>
</div>
```

If `@tailwindcss/typography` is not installed, add it or use custom styles.

---

## Deliverables

- [x] `MarkdownViewer.tsx` component created
- [x] Fetches and renders markdown content
- [x] GFM features work: tables, task lists, strikethrough, autolinks
- [x] Code blocks have styled background
- [x] Loading skeleton matches `ArtifactFrame` loading state
- [x] Error state displays user-friendly message
- [x] Unit tests for component (14 tests, all passing)

---

## Test Cases

1. **Render basic markdown** - headings, paragraphs, lists
2. **Render GFM features** - tables, task lists `[ ]` and `[x]`, ~~strikethrough~~
3. **Render code blocks** - inline `code` and fenced blocks
4. **Handle loading state** - show skeleton while fetching
5. **Handle fetch error** - show error message

---

## Dependencies

- Subtask 02 must be complete (packages installed)

---

## Notes

- Mermaid diagrams are out of scope (Phase 2)
- Comment targeting on markdown content is handled in Subtask 05
- This component is standalone; integration with DocumentViewer is Subtask 04

## Implementation Summary

**Component Location:** `app/src/components/artifact/MarkdownViewer.tsx`

**Features Implemented:**
- Fetches markdown from `src` URL using native fetch API
- Renders using `react-markdown` with `remark-gfm` plugin
- Loading state with skeleton matching `ArtifactFrame` design
- Error handling with user-friendly messages
- Tailwind typography with custom styling:
  - Purple links matching platform brand
  - Gray headings and body text
  - Styled code blocks (inline and fenced)
  - Proper table borders and spacing

**Test Coverage:** 14 unit tests covering:
- Basic markdown rendering (headings, paragraphs, lists)
- GFM features (tables, task lists, strikethrough)
- Code blocks (inline and fenced)
- Loading states
- Error handling
- Content fetching and re-fetching
- Custom styling

**Additional Dependencies Installed:**
- `@tailwindcss/typography@^0.5.15` - For prose classes
- Updated `tailwind.config.ts` to include typography plugin

**TDD Workflow Followed:**
1. RED: Wrote 14 failing tests first
2. GREEN: Implemented component to pass all tests
3. Tests now pass: 14/14 passing
