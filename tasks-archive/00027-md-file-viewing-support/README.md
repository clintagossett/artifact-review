# Task 00027: Markdown File Viewing Support

**GitHub Issue:** [#27](https://github.com/clintagossett/artifact-review/issues/27)

---

## Resume (Start Here)

**Last Updated:** 2026-01-06

### Current Status: COMPLETED

**Phase:** Phase 1 (Basic MD) and Phase 2 (Mermaid) are COMPLETE and VERIFIED. 

---

## 🛑 DESCOPED / FUTURE WORK
The following items were originally in scope but have been descoped from this task to be handled in future iterations:
- **Markdown Comments**: Precise text selection and commenting on rendered markdown elements.
- **Advanced Styling**: Further polish of typography and custom themes beyond the standard tailwind-typography defaults.

---

### Implementation Summary
1. **Core Rendering**: Implemented `MarkdownViewer` using `react-markdown` and `remark-gfm`.
2. **Mermaid Support**: Integrated lazy-loaded `mermaid.js` (~2.5MB) via `next/dynamic`. Components only load if a `mermaid` block is detected.
3. **Integration**: Wired into `DocumentViewer` for automatic detection of `.md` files.
4. **Test Data**: Created 5 versions of complex markdown samples with varied charts.

---

## Objective

Add support for viewing markdown (.md) files as rendered HTML in the artifact review platform. (Note: Commenting and advanced styling descoped).

---

## Subtasks

### Phase 1: Basic Markdown Rendering

| # | Name | Status | Description |
|---|------|--------|-------------|
| 01 | [MD Rendering Library Research](./01_subtask_md-rendering-library-research/) | COMPLETE | Evaluate libraries, select react-markdown |
| 02 | [Install Markdown Dependencies](./02_subtask_install-markdown-dependencies/) | COMPLETE | Install react-markdown + remark-gfm |
| 03 | [Create MarkdownViewer Component](./03_subtask_markdown-viewer-component/) | COMPLETE | Build component to fetch and render markdown |
| 04 | [Integrate with DocumentViewer](./04_subtask_integrate-markdown-viewer/) | COMPLETE | Detect fileType and switch renderer |
| 05 | Enable Markdown Comments | **DESCOPED** | Text selection and commenting on markdown |
| 06 | Finalize Markdown Styling | **DESCOPED** | Polish typography, tables, code blocks |
| 07 | [Phase 1 Testing](./07_subtask_phase1-testing/) | COMPLETE | Unit, E2E, and manual testing |

### Phase 2: Mermaid Diagram Support

| # | Name | Status | Description |
|---|------|--------|-------------|
| 08 | [Mermaid Lazy Loading](./08_subtask_mermaid-lazy-loading/) | COMPLETE | Implement lazy-loaded Mermaid rendering |
| 09 | [Complex MD Test Samples](./09_subtask_complex-md-samples/) | COMPLETE | Create test files with Mermaid, complex GFM |
| 10 | [Phase 2 Testing](./10_subtask_phase2-testing/) | COMPLETE | Test Mermaid diagrams and bundle size |

---

## Current State

- **Backend**: Markdown upload and storage fully supported.
- **Frontend**: `DocumentViewer` renders markdown as clean HTML with support for GFM and Mermaid diagrams.
- **Gap**: Commenting on markdown is not yet implemented (Descoped).

---

## Acceptance Criteria

- [x] Users can upload .md files
- [x] Markdown files are rendered as HTML for viewing
- [x] Styling is consistent with platform design (Tailwind Typography)
- [ ] Comments/annotations work on rendered markdown content (Descoped)
