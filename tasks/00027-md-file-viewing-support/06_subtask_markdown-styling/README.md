# Subtask 06: Finalize Markdown Styling

**Parent Task:** 00027-md-file-viewing-support
**Status:** PENDING
**Created:** 2026-01-03

---

## Objective

Ensure markdown rendering has polished, consistent styling that matches the platform design system and provides excellent readability.

---

## Background

Subtask 03 creates the basic `MarkdownViewer` component with prose styling. This subtask focuses on:
1. Fine-tuning typography and spacing
2. Ensuring all GFM elements look correct
3. Adding code block syntax highlighting (optional)
4. Testing across various markdown content

---

## Requirements

### Typography

- **Headings**: Gray-900, clear hierarchy with proper font sizes
- **Body text**: Gray-700, 16px base, 1.6 line height
- **Links**: Purple-600, underline on hover
- **Lists**: Proper bullet/number styling, indentation
- **Blockquotes**: Left border, subtle background

### Tables (GFM)

- Bordered cells with gray borders
- Header row with gray-100 background
- Alternating row colors (optional)
- Proper padding and alignment

### Task Lists (GFM)

- Checkbox styling (not native checkbox look)
- Strikethrough for checked items (optional)
- Proper list indentation

### Code Blocks

- **Inline code**: Gray-100 background, monospace font, slight padding
- **Fenced blocks**: Gray-50 background, border, proper padding
- **Language label** (optional): Show language in corner if specified
- **Syntax highlighting** (optional): Use `rehype-highlight` or similar

### Images

- Max-width 100%, responsive
- Border-radius for soft edges
- Optional: lightbox on click (future)

---

## Implementation Options

### Option A: Tailwind Typography Plugin

Install `@tailwindcss/typography` if not present:

```bash
npm install @tailwindcss/typography
```

Update `tailwind.config.js`:
```js
module.exports = {
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

Use prose classes:
```tsx
<div className="prose prose-gray max-w-none prose-purple">
  <ReactMarkdown ... />
</div>
```

### Option B: Custom CSS

Create dedicated styles in component or CSS module:

```css
.markdown-content h1 { ... }
.markdown-content h2 { ... }
.markdown-content table { ... }
.markdown-content code { ... }
```

### Option C: Custom Components

Use react-markdown's component mapping for full control:

```tsx
<ReactMarkdown
  components={{
    h1: ({ children }) => <h1 className="text-3xl font-bold text-gray-900 mb-4">{children}</h1>,
    code: ({ inline, className, children }) =>
      inline
        ? <code className="bg-gray-100 px-1 rounded">{children}</code>
        : <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto"><code>{children}</code></pre>,
    table: ({ children }) => <table className="min-w-full border-collapse border border-gray-200">{children}</table>,
  }}
>
```

---

## Testing Content

Create test markdown file with all features:

```markdown
# Heading 1
## Heading 2
### Heading 3

Regular paragraph with **bold**, *italic*, and ~~strikethrough~~.

- Bullet list item 1
- Bullet list item 2
  - Nested item

1. Numbered list
2. Second item

> Blockquote text

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |

- [ ] Unchecked task
- [x] Checked task

Inline `code` and fenced block:

```javascript
function hello() {
  console.log("Hello, World!");
}
```

[Link to example](https://example.com)

![Image alt text](https://example.com/image.png)
```

---

## Deliverables

- [ ] All heading levels styled correctly
- [ ] Tables render with proper borders and spacing
- [ ] Task lists show styled checkboxes
- [ ] Code blocks have distinct styling
- [ ] Blockquotes have visual indicator (border/background)
- [ ] Links are styled with platform accent color
- [ ] Images are responsive
- [ ] Styling tested with sample markdown content

---

## Dependencies

- Subtask 03 must be complete (component exists)

---

## Notes

- Syntax highlighting is nice-to-have; can be added later with `rehype-highlight`
- Keep styling consistent with platform design system (purple accents)
- Test with real Claude Code output to ensure formatting is preserved
