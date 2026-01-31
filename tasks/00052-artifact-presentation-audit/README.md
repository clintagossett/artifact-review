# Task 00052: Artifact Presentation Audit

**Status:** Complete
**Created:** 2026-01-31

## Objective

Audit how artifacts are rendered to understand why commenting works on Markdown but not HTML/ZIP artifacts.

## Deliverables

- [investigation.md](./investigation.md) - Complete architectural analysis with code references and DRY assessment

## Key Findings

### Rendering Paths

| Artifact Type | Renderer | DOM Access | Commenting |
|---------------|----------|------------|------------|
| Markdown (single/multi) | MarkdownViewer | Direct DOM | ✅ Works |
| HTML (single/multi) | ArtifactFrame (iframe) | Isolated | ❌ Blocked |
| ZIP with .md files | MarkdownViewer | Direct DOM | ✅ Works |
| ZIP with .html files | ArtifactFrame (iframe) | Isolated | ❌ Blocked |

### Root Cause

**Iframe sandbox boundary** prevents:
- `window.getSelection()` from accessing iframe content
- DOM traversal for text node access
- Coordinate calculation for highlight overlays
- Apache Annotator from operating cross-frame

### DRY Assessment

The rendering files are **appropriately DRY**. Only minor duplication exists (loading skeleton ~10 lines in 2 files). No urgent refactoring needed - components have clear separation of concerns.

### Solution Options

1. **PostMessage Bridge** (High complexity) - Inject script into iframe, communicate via PostMessage
2. **Shadow DOM Rendering** (Medium complexity) - Sanitize HTML, render in Shadow DOM
3. **Screenshot Commenting** (Low complexity) - Image-based annotations, no text precision

## Related Files

- `src/components/artifact/ArtifactViewer.tsx` - Main orchestration
- `src/components/artifact/MarkdownViewer.tsx` - Direct DOM rendering
- `src/components/artifact/ArtifactFrame.tsx` - Iframe rendering
- `src/lib/annotation/` - Selection/annotation system
