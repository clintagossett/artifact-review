# Subtask 07: Phase 1 Testing and Validation

**Parent Task:** 00027-md-file-viewing-support
**Status:** PENDING
**Created:** 2026-01-03

---

## Objective

Comprehensive testing of Phase 1 markdown rendering functionality to ensure all acceptance criteria are met before moving to Phase 2 (Mermaid support).

---

## Scope

Test all Phase 1 functionality:
1. Upload markdown files
2. View rendered markdown
3. Create comments on markdown content
4. GFM features render correctly

---

## Test Plan

### Unit Tests

Location: `tasks/00027-md-file-viewing-support/07_subtask_phase1-testing/tests/unit/`

1. **MarkdownViewer.test.tsx**
   - Renders loading state
   - Fetches content from URL
   - Renders markdown as HTML
   - Handles fetch errors
   - GFM features render correctly

2. **Integration with DocumentViewer**
   - Detects markdown fileType
   - Renders MarkdownViewer for markdown
   - Renders iframe for HTML

### E2E Tests

Location: `tasks/00027-md-file-viewing-support/07_subtask_phase1-testing/tests/e2e/`

1. **markdown-upload.spec.ts**
   - Upload .md file via dashboard
   - Artifact created successfully
   - Redirect to viewer page

2. **markdown-viewing.spec.ts**
   - Markdown renders as formatted HTML
   - Headings, lists, tables visible
   - Code blocks styled correctly

3. **markdown-comments.spec.ts**
   - Enable comment mode
   - Select text in markdown
   - Create comment
   - Comment appears in sidebar

### Manual Testing Checklist

- [ ] Upload a markdown file from Claude Code output
- [ ] Verify all GFM features render
- [ ] Create multiple comments
- [ ] Switch between versions (if markdown has multiple versions)
- [ ] Test on mobile viewport
- [ ] Test with very long markdown documents
- [ ] Test with empty/minimal markdown

---

## Sample Test Files

Use files from `/samples/` directory:

| File | Purpose |
|------|---------|
| `sample-v1.md` | Basic markdown with headings, lists |
| `sample-v2.md` | GFM features: tables, task lists |
| `sample-v3.md` | Code blocks and blockquotes |

If not present, create sample files with comprehensive markdown content.

---

## Acceptance Criteria Verification

From main task README:

- [ ] Users can upload .md files
- [ ] Markdown files are rendered as HTML for viewing
- [ ] Styling is consistent with platform design
- [ ] Comments/annotations work on rendered markdown content

---

## Deliverables

- [ ] Unit tests passing
- [ ] E2E tests passing with video recordings
- [ ] Manual testing checklist complete
- [ ] Test report documenting coverage
- [ ] Any bugs found are logged as issues

---

## Test Report Template

Create `test-report.md` with:

```markdown
# Phase 1 Test Report

**Date:** YYYY-MM-DD
**Tester:** [Name]

## Summary

- Unit Tests: X/Y passing
- E2E Tests: X/Y passing
- Manual Tests: X/Y complete

## Coverage

| Feature | Unit | E2E | Manual |
|---------|------|-----|--------|
| Upload markdown | - | [x] | [x] |
| Render markdown | [x] | [x] | [x] |
| GFM tables | [x] | [x] | [x] |
| ...

## Issues Found

| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 1 | ... | High | Fixed |

## Validation Videos

- `e2e-upload.webm` - Upload flow
- `e2e-viewing.webm` - Viewing markdown
- `e2e-comments.webm` - Commenting flow
```

---

## Dependencies

- Subtasks 02-06 must be complete

---

## Notes

- All E2E tests MUST produce video recordings
- Videos are gitignored, not committed
- Tests should use central `/samples/` test data where applicable
