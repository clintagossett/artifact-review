# Sample Markdown Document

This is a test markdown file for **Artifact Review Platform**.

## Features Demonstrated

### Basic Formatting
- **Bold text**
- *Italic text*
- ~~Strikethrough~~
- `inline code`

### Code Block with Syntax Highlighting

```typescript
export const greet = (name: string): string => {
  return `Hello, ${name}!`;
};

console.log(greet("World"));
```

### Tables (GitHub-Flavored Markdown)

| Feature | Status | Priority |
|---------|--------|----------|
| ZIP Upload | ✅ Complete | High |
| HTML Upload | ✅ Complete | High |
| Markdown | 🚧 In Progress | Medium |

### Task Lists

- [x] Define markdown support
- [x] Create sample file
- [ ] Implement markdown renderer
- [ ] Add syntax highlighting

### External Image (Should work)

![Placeholder](https://via.placeholder.com/400x200?text=External+Image)

### Local Image (Should warn)

![Logo](./images/logo.png)

### Blockquote

> "From AI output to stakeholder feedback in one click"
>
> — Artifact Review Platform

### Links

- [External link](https://github.com) - OK
- [Local file](./other-doc.md) - Should warn

## Expected Behavior

When this file is uploaded:
1. ✅ Stored in `markdownContent` field
2. ✅ Rendered to HTML with GitHub-flavored markdown
3. ⚠️ Warning for local image reference (`./images/logo.png`)
4. ⚠️ Warning for local link (`./other-doc.md`)
5. ✅ External URLs allowed

---

**File size:** ~1.2KB | **Type:** Markdown | **Format:** GitHub-Flavored Markdown
