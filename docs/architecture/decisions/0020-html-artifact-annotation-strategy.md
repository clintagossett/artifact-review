---
title: HTML Artifact Annotation Strategy
status: Accepted
date: 2026-01-31
deciders: Clint Gossett, Claude
---

# 20. HTML Artifact Annotation Strategy

## Context

Artifact Review allows users to annotate uploaded artifacts. Currently:
- **Markdown artifacts**: Annotations work fully (selection, highlighting, comments)
- **HTML/ZIP artifacts**: Annotations do not work

The root cause is the **iframe sandbox boundary**. HTML artifacts render in iframes for security isolation, which prevents:
- `window.getSelection()` from accessing iframe content
- DOM traversal for text node access
- Coordinate calculation for highlight overlays
- Apache Annotator from operating cross-frame

See `tasks/00052-artifact-presentation-audit/investigation.md` for the complete technical audit.

## Options Considered

### Option 1: Direct DOM Rendering (DOMPurify)

Sanitize HTML with DOMPurify, render directly to DOM without iframe.

| Pros | Cons |
|------|------|
| Simple implementation (~50 lines) | **JavaScript stripped** - breaks D3, Chart.js, Plotly, etc. |
| Reuses existing SelectionOverlay | CSS may conflict with app styles |
| Same code path as Markdown | Security requires aggressive sanitization |

**Rejected**: AI-generated artifacts frequently include JavaScript for data visualization (D3.js, Chart.js, Plotly, Three.js). Stripping scripts renders these artifacts useless.

### Option 2: Shadow DOM Rendering

Sanitize HTML, render in Shadow DOM for style isolation.

| Pros | Cons |
|------|------|
| CSS isolation | **JavaScript still stripped** |
| Can access shadowRoot for annotations | Artifacts expecting global styles may break |

**Rejected**: Same JavaScript problem as Option 1.

### Option 3: Screenshot-Based Commenting

Capture screenshots of iframe regions, allow annotations on coordinates.

| Pros | Cons |
|------|------|
| No cross-frame issues | No text-level precision |
| Works with any content | Comments don't survive content changes |
| Low complexity | Poor UX compared to text selection |

**Rejected**: Loses the precision and semantic meaning of text-based annotations.

### Option 4: Iframe Injection (PostMessage Bridge)

Keep iframe rendering, inject annotation script into served HTML.

| Pros | Cons |
|------|------|
| **JavaScript works** - full artifact fidelity | Higher implementation complexity |
| Security isolation preserved | Requires bundled injection script |
| Annotations work via PostMessage | Server-side modification (http.ts) |
| Same W3C selector format | Two-way sync for decorations |

## Decision

**Use Iframe Injection (Option 4)**.

This is the only approach that satisfies both requirements:
1. JavaScript must execute (data visualizations, interactive artifacts)
2. Annotations must work (selection, highlighting, comments)

### Implementation Architecture

```
convex/http.ts serves HTML artifact
        │
        ▼
    Inject annotation-client.js before </body>
        │
        ▼
┌─────────────────────────────────────────────┐
│  Iframe                                     │
│  ┌─────────────────────────────────────┐    │
│  │ User's HTML + JS runs normally      │    │
│  │ (D3, charts, visualizations)        │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ annotation-client.js                │    │
│  │ - Selection listener                │    │
│  │ - Overlay renderer                  │    │
│  │ - PostMessage bridge                │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
        │
        │ postMessage
        ▼
┌─────────────────────────────────────────────┐
│  Parent (ArtifactViewer)                    │
│  - IframeAnnotationAdapter                  │
│  - Annotation state management              │
│  - Save/load from Convex                    │
└─────────────────────────────────────────────┘
```

### Components to Build

1. **`annotation-client.js`** (~200 lines, bundled)
   - Selection listener → postMessage to parent
   - Message listener → render overlays inside iframe
   - Uses same W3C TextQuoteSelector format

2. **Modify `convex/http.ts`**
   - Inject `<script src="/annotation-client.js"></script>` before `</body>` when serving HTML

3. **`IframeAnnotationAdapter`** (new adapter class)
   - Receives selection events from iframe
   - Sends decoration commands to iframe
   - Handles coordinate transformation if needed

## Risk Acknowledged

Most AI-generated artifacts (Claude, Cursor, ChatGPT) produce basic HTML without JavaScript. We are choosing the more complex solution to **cater to advanced users** who create artifacts with:
- Data visualizations (D3.js, Chart.js, Plotly)
- Interactive components
- Custom JavaScript logic

This is a deliberate tradeoff: higher implementation complexity for broader artifact support.

## Consequences

### Positive
- Full JavaScript support in artifacts
- Annotations work on all artifact types
- Security isolation preserved (iframe sandbox)
- Same annotation UX across Markdown and HTML
- Same W3C selector storage format

### Negative
- ~300 lines of new code vs ~50 for direct DOM
- Bundled script must be maintained
- PostMessage adds async complexity
- Server-side injection logic

### Neutral
- Markdown path unchanged (still uses SelectionOverlay directly)

## References

- `tasks/00052-artifact-presentation-audit/investigation.md` - Technical audit
- `src/components/artifact/ArtifactFrame.tsx` - Current iframe implementation
- `src/lib/annotation/` - Existing annotation system
- `convex/http.ts:96-143` - HTML serving endpoint
- ADR-0017: Annotation Overlay Rendering Strategy
