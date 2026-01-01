# Task 00022: Hook Up Artifact Settings Details Tab to Backend

**GitHub Issue:** #22
**Status:** IN PROGRESS - Design Complete
**Created:** 2026-01-01

---

## Resume (Start Here)

**Last Updated:** 2026-01-01 (Session 1)

### Current Status: Design Complete, Ready for Implementation

**Phase:** 1 of 2 (Backend Only)

### What Was Done This Session

1. Created GitHub issue #22
2. Created task folder
3. Ran architect agent to analyze requirements
4. Created detailed design document (`design.md`)

### Design Summary

**Schema Change:**
- Rename `artifacts.title` → `artifacts.name` (per ADR 12 naming conventions)

**New Backend Functions:**
- `updateDetails` mutation - owner-only update of name/description
- `getDetailsForSettings` query - enriched data with creator email, version count, file size

### Subtasks (Phase 1 - Backend)

| # | Subtask | Status |
|---|---------|--------|
| 01 | Schema migration (`title` → `name`) | Pending |
| 02 | Update existing queries/mutations for rename | Pending |
| 03 | Add `updateDetails` mutation | Pending |
| 04 | Add `getDetailsForSettings` query | Pending |

Phase 2 (frontend wiring) will be a separate task.

### Next Steps

1. Create subtask folders if desired
2. Implement subtask 01 (schema migration)
3. Implement subtask 02 (update existing code)
4. Implement subtask 03 (new mutation)
5. Implement subtask 04 (new query)
6. Test all changes

---

## Files

- `design.md` - Detailed implementation design with code snippets
- `README.md` - This file

## Reference

- ADR 12: Field naming conventions
- Related task: 00016-implement-artifacts-settings-panel (created the static UI)
- Convex rules: `docs/architecture/convex-rules.md`
