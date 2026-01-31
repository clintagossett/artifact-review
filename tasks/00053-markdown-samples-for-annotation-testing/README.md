# Task 00053: Markdown Samples for Annotation Testing

**Status:** Pending
**Created:** 2026-01-31
**GitHub Issue:** #52 (folder numbered 00053 due to existing 00052)

## Context

Per ADR-0020, HTML annotation requires iframe injection (future work). For now, all annotation tests should use Markdown files which render directly to DOM and support full annotation functionality.

## Problem

Current samples lack complex markdown examples needed for thorough annotation testing:
- Single-file markdown is too simple (`product-spec/`)
- No multi-file markdown ZIP samples with cross-linking
- No samples with all markdown features (mermaid, tables, code blocks, etc.)
- No samples with table of contents / anchor link navigation

## Deliverables

### 1. Multi-file Markdown ZIP: `samples/01-valid/markdown/technical-docs/`

A documentation project with 2 versions. Files are reorganized between versions to test structural changes.

**Structure:**
```
technical-docs/
├── v1.zip, v2.zip            # Ready for upload
├── v1/                        # Version 1
│   ├── README.md              # Entry point with TOC
│   ├── getting-started.md
│   ├── configuration.md
│   └── api.md                 # Single API file
└── v2/                        # Version 2 - restructured
    ├── README.md              # Updated TOC
    ├── getting-started.md     # Minor edits
    ├── guides/                # NEW: reorganized into folder
    │   └── configuration.md   # Moved here
    └── api/                   # NEW: split into folder
        ├── overview.md        # Split from api.md
        └── endpoints.md       # Split from api.md
```

**Changes between v1 → v2:**
- `configuration.md` moved to `guides/configuration.md`
- `api.md` split into `api/overview.md` + `api/endpoints.md`
- Cross-links updated to reflect new paths
- Content additions in each file

**Features:**
- Table of Contents with anchor links (h1, h2, h3 hierarchy)
- Cross-file links (`[See API docs](./api/overview.md)`)
- Anchor links within files (`[Jump to section](#installation)`)
- Multiple heading levels for TOC testing
- Code blocks with syntax highlighting (JS, Python, SQL, Bash, JSON, YAML, Go, Rust)
- Tables (GFM)
- Mermaid diagrams
- Nested lists

**Future:** Comment spanning across versions is a separate concern (not for now)

### 2. Feature-Rich Single Markdown: `samples/01-valid/markdown/feature-rich/`

Single file with all markdown features for comprehensive annotation testing.

**Features Required:**
- [ ] Table of Contents with anchor links
- [ ] Headings h1 through h6
- [ ] Code blocks with syntax highlighting:
  - [ ] JavaScript / TypeScript
  - [ ] Python
  - [ ] SQL
  - [ ] Bash / Shell
  - [ ] JSON
  - [ ] YAML
  - [ ] Go
  - [ ] Rust
- [ ] Inline code
- [ ] Tables (GFM)
- [ ] Task lists
- [ ] Blockquotes (nested)
- [ ] Mermaid diagrams
- [ ] Ordered and unordered lists (nested)
- [ ] Bold, italic, strikethrough text
- [ ] Links (external and anchor)
- [ ] Images (external CDN)
- [ ] Horizontal rules
- [ ] Long paragraphs (good for text selection testing)

### 3. Update E2E Tests

Switch annotation-related tests from HTML/ZIP to Markdown:
- `smoke-integrations.spec.ts` - Already uses markdown (done in previous session)
- `artifact-workflow.spec.ts` - Check and update if needed
- Any other tests using HTML for annotation flows

## Acceptance Criteria

- [ ] Multi-file markdown ZIP with 2 versions created
- [ ] v2 has structural changes (moved/split files) vs v1
- [ ] Each version has working TOC with anchor links
- [ ] Cross-file navigation works in viewer
- [ ] Feature-rich single markdown file created
- [ ] samples/README.md updated with new samples
- [ ] E2E tests use markdown samples for annotation flows
- [ ] All annotation e2e tests pass

## Related

- ADR-0020: HTML Artifact Annotation Strategy
- Task 00052: Artifact Presentation Audit
- SESSION-RESUME.md: E2E test fixes already switched smoke-integrations to markdown
