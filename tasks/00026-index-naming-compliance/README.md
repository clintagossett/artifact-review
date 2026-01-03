# Task 00026: Index Naming Compliance with ADR-0012

**GitHub Issue:** #26
**Status:** Not Started
**Created:** 2026-01-03

## Objective

Update all database indexes in `schema.ts` and corresponding query references to follow the updated ADR-0012 index naming convention.

## Convention

```
Pattern: by_[camelCaseField]_[camelCaseField]
               └─ underscore separator ─┘
```

### Rules

1. **Preserve camelCase** - Don't convert field names to snake_case
2. **Underscore separator** - Use `_` between fields, not `_and_`
3. **`_active` shorthand** - Use for soft-delete filtering (`isDeleted` field)

### Examples

| Type | Correct | Incorrect |
|------|---------|-----------|
| Single | `by_createdBy` | `by_created_by` |
| Compound | `by_createdBy_artifactId` | `by_created_by_and_artifact_id` |
| Soft-delete | `by_createdBy_active` | `by_created_by_active` |

## Scope

### Files to Update

1. **`app/convex/schema.ts`** - All index definitions
2. **`app/convex/*.ts`** - All `withIndex()` calls

### Current Non-Compliant Indexes (to audit)

Likely patterns to fix:
- `by_created_by` → `by_createdBy`
- `by_artifact_version` → `by_artifactId_versionId` (verify field names)
- Any `_and_` patterns → underscore only

## Research

See: `tasks/00025-migrate-comment-schema-to-createdby/research/convex-index-naming-research.md`

Key findings from 13 GitHub repos:
- Zero use `_and_` separator
- All preserve camelCase field names
- Underscore only as separator

## Acceptance Criteria

- [ ] All indexes in schema.ts follow `by_camelCaseField` pattern
- [ ] All `withIndex()` calls updated to match new names
- [ ] No `_and_` separators remain
- [ ] No snake_case conversions of field names
- [ ] Convex dev server starts without errors
- [ ] All existing tests pass

## Subtasks

1. **01-audit-current-indexes** - List all current indexes and identify non-compliant ones
2. **02-update-schema** - Rename indexes in schema.ts
3. **03-update-queries** - Update all withIndex() references
4. **04-verify** - Run dev server and tests

## Notes

- This is a breaking change for the database - indexes will be renamed
- Convex handles index renames automatically on deploy
- No data migration needed, just code changes
