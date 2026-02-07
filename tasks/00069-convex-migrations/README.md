# Task 00069: Integrate Convex Migrations Module

**Issue:** #69
**Status:** Complete

## Summary

Integrated the official `@convex-dev/migrations` module for safe, versioned schema evolution.

## Changes

### New Files
- `convex/migrations.ts` - Migration definitions and runner
- `docs/development/migrations.md` - Full migration workflow documentation

### Modified Files
- `convex/convex.config.ts` - Added migrations component
- `CLAUDE.md` - Added migration workflow section
- `docs/development/_index.md` - Added migrations guide to index

## What Was Done

1. **Installed package**: `@convex-dev/migrations`
2. **Configured component** in `convex.config.ts`
3. **Created migrations.ts** with:
   - Type-safe initialization with DataModel
   - Runner function for CLI execution
   - Example migration (setDefaultCreatedAt)
   - Documentation comments
4. **Wrote documentation** explaining:
   - When migrations are required vs not needed
   - Step-by-step workflow
   - CLI commands
   - Best practices (idempotent, descriptive names)
   - PR checklist for schema changes
5. **Updated CLAUDE.md** with migration workflow for agents

## Usage

```bash
# Run a migration locally
npx convex run migrations:run '{"fn": "migrations:migrationName"}'

# Check status
npx convex run --component migrations lib:getStatus --watch

# Run in production
npx convex run migrations:run '{"fn": "migrations:migrationName"}' --prod
```

## When to Use Migrations

| Scenario | Migration Needed? |
|----------|-------------------|
| Adding required field | YES |
| Renaming field | YES |
| Changing field type | YES |
| Backfilling data | YES |
| Adding optional field | NO |
| Adding new table | NO |
| Adding index | NO |
| Removing field | NO |
