# Task 00027: Markdown File Viewing Support

**GitHub Issue:** #27

---

## Resume (Start Here)

**Last Updated:** 2026-01-03 (Session 2)

### Current Status: OPEN

**Phase:** Subtasks designed, ready for implementation.

### What We Did This Session (Session 2)

1. **Analyzed existing codebase** - Discovered markdown upload already works in backend
2. **Designed implementation subtasks** - 9 subtasks covering Phase 1 and Phase 2
3. **Created subtask READMEs** - Detailed requirements for each subtask

### What Was Done (Session 1)

1. **Created GitHub issue** - #27 for markdown viewing support
2. **Created task folder** - Set up task structure
3. **Completed library research** - Evaluated react-markdown, marked, markdown-it, MDX, @uiw/react-markdown-preview
4. **Decision locked:** react-markdown + remark-gfm + mermaid (lazy-loaded)
5. **Defined phasing** - Phase 1: basic markdown, Phase 2: Mermaid support

### Next Steps

1. **Start Subtask 02** - Install markdown dependencies
2. **Continue through subtasks** - Follow the ordered implementation plan

### Key Discovery

The backend and upload flow already support markdown files:
- `UploadDropzone` accepts `.md` files
- `useArtifactUpload` handles `fileType: "markdown"`
- `artifacts.create` stores markdown in `artifactFiles`
- HTTP endpoint serves markdown with `text/markdown` MIME type

**The gap is rendering** - `DocumentViewer` uses an iframe that shows raw markdown text instead of rendered HTML.

---

## Objective

Add support for viewing markdown (.md) files as rendered HTML in the artifact review platform. Users should be able to upload markdown files and view them rendered with proper styling, with full commenting/annotation support.

---

## Subtasks

### Phase 1: Basic Markdown Rendering

| # | Name | Status | Description |
|---|------|--------|-------------|
| 01 | [MD Rendering Library Research](./01_subtask_md-rendering-library-research/) | COMPLETE | Evaluate libraries, select react-markdown |
| 02 | [Install Markdown Dependencies](./02_subtask_install-markdown-dependencies/) | PENDING | Install react-markdown + remark-gfm |
| 03 | [Create MarkdownViewer Component](./03_subtask_markdown-viewer-component/) | PENDING | Build component to fetch and render markdown |
| 04 | [Integrate with DocumentViewer](./04_subtask_integrate-markdown-viewer/) | PENDING | Detect fileType and switch renderer |
| 05 | [Enable Markdown Comments](./05_subtask_markdown-comment-targeting/) | PENDING | Text selection and commenting on markdown |
| 06 | [Finalize Markdown Styling](./06_subtask_markdown-styling/) | PENDING | Polish typography, tables, code blocks |
| 07 | [Phase 1 Testing](./07_subtask_phase1-testing/) | PENDING | Unit, E2E, and manual testing |

### Phase 2: Mermaid Diagram Support

| # | Name | Status | Description |
|---|------|--------|-------------|
| 08 | [Mermaid Lazy Loading](./08_subtask_mermaid-lazy-loading/) | PENDING | Implement lazy-loaded Mermaid rendering |
| 09 | [Phase 2 Testing](./09_subtask_phase2-testing/) | PENDING | Test Mermaid diagrams and bundle size |

---

## Current State

- **Backend**: Markdown upload and storage already working
- **Frontend**: `DocumentViewer` uses iframe, shows raw markdown text
- **Gap**: Need `MarkdownViewer` component to render markdown as HTML

---

## Acceptance Criteria

- [ ] Users can upload .md files
- [ ] Markdown files are rendered as HTML for viewing
- [ ] Styling is consistent with platform design
- [ ] Comments/annotations work on rendered markdown content

---

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| react-markdown + unified ecosystem | Secure (no innerHTML), best plugin ecosystem, Next.js compatible | Requires assembling plugins |
| @uiw/react-markdown-preview | Zero config, built-in Mermaid | Larger bundle, less control |
| marked / markdown-it | Fast, lightweight | Requires sanitization, weaker React integration |

## Decision

**Library:** `react-markdown` + `remark-gfm` + `mermaid` (lazy-loaded)

**Rationale:**
- Secure by default (no `dangerouslySetInnerHTML`)
- Unified ecosystem has plugins for future needs (math, admonitions, etc.)
- Excellent Next.js/SSR support
- Full control over rendering via custom components

**Mermaid Strategy (MVP):**
- Client-side Mermaid.js (~2.7MB), lazy-loaded only when diagrams are present
- Graceful degradation: syntax errors show code block with error message
- No toggle between code/rendered in MVP

**Future Optimization:**
- Server-side Mermaid rendering at upload time
- Store rendered SVGs for instant load and stable comment anchors
- Reduce client bundle to ~43KB

**Phasing:**
1. **Phase 1:** Basic markdown rendering (tables, code blocks, GFM features)
2. **Phase 2:** Mermaid diagram support (lazy-loaded)
3. **Future:** Server-side rendering, code/diagram toggle UI

---

## Changes Made

_(To be updated during implementation)_

---

## Testing

_(To be defined during implementation)_
