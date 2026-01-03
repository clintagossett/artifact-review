# Subtask 05: Enable Comments on Markdown Content

**Parent Task:** 00027-md-file-viewing-support
**Status:** PENDING
**Created:** 2026-01-03

---

## Objective

Enable users to select text and create comments on rendered markdown content, matching the existing commenting functionality for HTML artifacts.

---

## Background

The current comment system works by:
1. User activates comment mode (toolbar button)
2. User selects text in the iframe or clicks an element with an ID
3. `handleTextSelection` and `handleElementClick` capture the selection
4. Comment is created with target metadata:
   ```typescript
   target = {
     _version: 1,
     type: 'text' | 'element',
     selectedText: string,
     elementId?: string,
     page: string,
   }
   ```

For markdown, we need similar functionality but within the React-rendered content instead of an iframe.

---

## Challenges

1. **No iframe** - Can't use `iframe.contentDocument` or `iframe.contentWindow.getSelection()`
2. **No element IDs** - Rendered markdown doesn't have IDs like authored HTML
3. **Dynamic content** - Content is rendered by React, not static HTML

---

## Proposed Approach

### Text Selection

Use the browser's native `window.getSelection()` on the `MarkdownViewer` container:

```tsx
const containerRef = useRef<HTMLDivElement>(null);

const handleMouseUp = () => {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  if (selectedText && containerRef.current?.contains(selection?.anchorNode)) {
    // User selected text within the markdown viewer
    onTextSelect(selectedText);
  }
};
```

### Heading Anchors (Optional Enhancement)

Use `rehype-slug` to add IDs to headings, enabling element-based comments:

```bash
npm install rehype-slug
```

```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeSlug]}
>
  {content}
</ReactMarkdown>
```

This generates IDs like `<h2 id="introduction">Introduction</h2>`.

---

## Requirements

### MarkdownViewer Updates

1. **Accept callback props for selection**
   ```typescript
   interface MarkdownViewerProps {
     src: string;
     isLoading?: boolean;
     className?: string;
     // New props for comment integration
     isCommentModeActive?: boolean;
     onTextSelect?: (selectedText: string) => void;
     onHeadingClick?: (headingId: string, headingText: string) => void;
   }
   ```

2. **Handle text selection**
   - Listen for `mouseup` events on the container
   - Only capture selection when `isCommentModeActive` is true
   - Extract selected text and call `onTextSelect`

3. **Handle heading clicks (stretch goal)**
   - With `rehype-slug`, headings get IDs
   - When in comment mode, clicking a heading could target that section
   - Call `onHeadingClick` with heading ID and text

### DocumentViewer Updates

1. **Pass comment mode state to MarkdownViewer**
   - `isCommentModeActive={activeToolMode === 'comment' || commentBadge !== null}`

2. **Handle callbacks**
   - `onTextSelect` should trigger comment tooltip
   - Set `selectedText` state and show tooltip at selection position

3. **Target Metadata**
   - For markdown, target should include:
   ```typescript
   target = {
     _version: 1,
     type: 'text',
     selectedText: string,
     page: '/README.md', // or entry point path
   }
   ```

---

## Implementation Steps

1. Update `MarkdownViewer` to accept comment-related props
2. Add `mouseup` listener for text selection
3. (Optional) Add `rehype-slug` for heading IDs
4. Update `DocumentViewer` to pass props and handle callbacks
5. Ensure tooltip positioning works for React-rendered content

---

## Files to Modify

```
app/src/components/artifact/MarkdownViewer.tsx
app/src/components/artifact/DocumentViewer.tsx
```

---

## Testing

1. **Select text in markdown** - Tooltip appears
2. **Create comment on selection** - Comment saved with correct target
3. **Comment mode toggle** - Selection only captured when mode active
4. **Click heading (if implemented)** - Tooltip appears for heading

---

## Deliverables

- [ ] Text selection works on markdown content
- [ ] Comments can be created with selected text
- [ ] Comment tooltip positions correctly
- [ ] (Stretch) Heading click targeting works

---

## Dependencies

- Subtask 04 must be complete (integration done)

---

## Notes

- Element highlighting on hover (for existing comments) may not work for markdown since we're matching by `selectedText` not `elementId`
- Future enhancement: use text position anchoring (e.g., start/end offsets)
