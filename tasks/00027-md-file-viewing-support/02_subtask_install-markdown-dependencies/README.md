# Subtask 02: Install Markdown Dependencies

**Parent Task:** 00027-md-file-viewing-support
**Status:** PENDING
**Created:** 2026-01-03

---

## Objective

Install and configure the markdown rendering libraries selected in Subtask 01 (library research).

---

## Scope

Install the following packages:

```bash
npm install react-markdown remark-gfm
```

**Phase 1 only (Phase 2 adds Mermaid):**
- `react-markdown` - Core markdown renderer
- `remark-gfm` - GitHub Flavored Markdown (tables, task lists, strikethrough)

---

## Requirements

1. Install packages in `app/` directory
2. Verify packages are added to `package.json`
3. Verify TypeScript types are available (or install `@types/*` if needed)
4. Test that imports work without errors

---

## Deliverables

- [ ] Packages installed in `app/package.json`
- [ ] Basic import test passes (no runtime errors)
- [ ] Document any peer dependency warnings

---

## Out of Scope

- Mermaid diagram support (Phase 2)
- Math/LaTeX support (future)
- Syntax highlighting (future enhancement)

---

## Notes

From library research (Subtask 01):
- `react-markdown` is the recommended library for security (no `dangerouslySetInnerHTML`)
- `remark-gfm` provides tables, task lists, strikethrough, and autolinks
- Base bundle size: ~60KB (react-markdown + remark-gfm)
