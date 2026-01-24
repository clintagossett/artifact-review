---
title: Annotation Overlay Rendering Strategy
status: Accepted
date: 2026-01-23
deciders: Clint Gossett, Claude
---

# 17. Annotation Overlay Rendering Strategy

## Context

Annotation decorations (highlights and strikethroughs) need to be rendered as overlays on top of document content. This includes text in markdown documents, code blocks with syntax highlighting, and other formatted content.

Initial implementations faced several challenges:
1. **Dark backgrounds**: Code blocks have dark backgrounds where `mix-blend-multiply` made highlights invisible
2. **Strikethrough positioning**: Nested div wrappers caused absolute positioning to fail
3. **Content changes**: Annotations needed to re-anchor when DOM content changed (e.g., on page navigation)

## Decision

### 1. Use React.Fragment for Multi-Element Decorations

When a decoration requires multiple DOM elements (e.g., strikethrough needs both a background and a line), use `React.Fragment` instead of a wrapper div:

```tsx
// WRONG: Non-positioned wrapper breaks absolute positioning
return (
    <div key={i}>
        <div className="absolute" style={{...}} />
        <div className="absolute" style={{...}} />
    </div>
);

// CORRECT: Fragment preserves positioning context
return (
    <React.Fragment key={i}>
        <div className="absolute" style={{...}} />
        <div className="absolute" style={{...}} />
    </React.Fragment>
);
```

**Rationale**: A plain `<div>` wrapper without positioning creates a new stacking context but doesn't establish a positioned ancestor. The absolutely positioned children then position relative to the wrong container, causing them to render in the wrong location.

### 2. Use Semi-Transparent Solid Colors (Not Blend Modes)

For highlight visibility on any background color:

```tsx
// WRONG: Invisible on dark backgrounds
className="opacity-30 mix-blend-multiply bg-yellow-200"

// CORRECT: Works on light AND dark backgrounds
style={{
    backgroundColor: "rgba(253, 224, 71, 0.4)",
    borderBottom: "2px solid rgba(234, 179, 8, 0.8)",
    boxShadow: "0 0 0 1px rgba(234, 179, 8, 0.3)",
}}
```

**Rationale**: `mix-blend-multiply` multiplies colors, which produces black (invisible) results on dark backgrounds. Semi-transparent solid colors maintain visibility regardless of the underlying content.

### 3. Use z-index for Code Block Visibility

Strike decorations need explicit z-index to appear above code block styling:

```tsx
<div
    className="absolute top-0 left-0 pointer-events-none w-full h-full overflow-hidden"
    style={{ zIndex: 50 }}
>
```

### 4. MutationObserver for Content Re-anchoring

Use a MutationObserver to detect when the text container's content changes and trigger re-anchoring of selectors:

```tsx
useEffect(() => {
    if (!textContainer) return;

    const observer = new MutationObserver(() => {
        setContentVersion(v => v + 1);
    });

    observer.observe(textContainer, {
        childList: true,
        subtree: true,
        characterData: true
    });

    return () => observer.disconnect();
}, [textContainer]);
```

**Rationale**: When navigating between pages or when content loads asynchronously, the DOM changes but the selectors remain the same. The MutationObserver triggers re-matching of TextQuoteSelectors against the new content.

## Consequences

### Positive
- Annotations visible on all content types (prose, code blocks, dark themes)
- Strikethrough decorations render correctly with both background and line
- Annotations persist across page navigation and content reloads

### Negative
- MutationObserver adds overhead (mitigated by debouncing if needed)
- Inline styles instead of Tailwind classes for some properties

## References

- `app/src/lib/annotation/react/SelectionOverlay.tsx` - Implementation
- W3C Web Annotation Data Model for selector format
- Apache Annotator library for TextQuoteSelector matching
