# Convex Migrations Guide

This guide covers when and how to use database migrations in Artifact Review.

## Overview

Convex migrations provide safe, versioned schema evolution with:
- Progress tracking and status monitoring
- Automatic batching for large datasets
- Rollback and restart capabilities
- Type-safe migration definitions

## When Migrations Are Required

### REQUIRED - Use Migrations

| Scenario | Why | Example |
|----------|-----|---------|
| **Adding required field** | Existing docs need default value | Adding `preferences: v.object({...})` to users |
| **Renaming field** | Data must be copied to new field | `title` → `name` |
| **Changing field type** | Data must be converted | `status: v.string()` → `status: v.union(...)` |
| **Backfilling data** | Computed values need population | Adding `artifactCount` to organizations |
| **Data normalization** | Consistency fixes | Lowercasing all emails |

### NOT REQUIRED - Schema Change Only

| Scenario | Why | What to Do |
|----------|-----|------------|
| **Adding optional field** | `undefined` is valid | Just add `v.optional(v.string())` to schema |
| **Adding new table** | No existing data | Just add table to schema |
| **Adding new index** | Convex rebuilds automatically | Just add index to schema |
| **Removing field** | Old data ignored by queries | Just remove from schema |

## Migration Workflow

### 1. Define the Migration

Add your migration to `convex/migrations.ts`:

```typescript
/**
 * Add default theme preference to all users
 *
 * Required because preferences field is now mandatory.
 * Run BEFORE deploying schema change to production.
 */
export const addUserPreferences = migrations.define({
  table: "users",
  migrateOne: async (ctx, user) => {
    // Always check if migration is needed (idempotent)
    if (user.preferences !== undefined) {
      return;
    }

    await ctx.db.patch(user._id, {
      preferences: { theme: "system", notifications: true },
    });
  },
});
```

### 2. Test Locally

```bash
# Run the migration locally
npx convex run migrations:run '{"fn": "migrations:addUserPreferences"}'

# Watch migration progress
npx convex run --component migrations lib:getStatus --watch
```

### 3. Verify Data

Query your data to confirm the migration worked:

```bash
npx convex run users:list  # Or appropriate query
```

### 4. Run in Production

```bash
# Deploy the migration code first
npx convex deploy

# Then run the migration
npx convex run migrations:run '{"fn": "migrations:addUserPreferences"}' --prod

# Monitor progress
npx convex run --component migrations lib:getStatus --watch --prod
```

### 5. Update Schema

After migration completes, update schema if needed (e.g., make field required).

## Writing Good Migrations

### Be Idempotent

Migrations may run multiple times (restarts, retries). Always check before modifying:

```typescript
// GOOD - Idempotent
migrateOne: async (ctx, doc) => {
  if (doc.newField !== undefined) return;
  await ctx.db.patch(doc._id, { newField: "default" });
}

// BAD - Not idempotent
migrateOne: async (ctx, doc) => {
  await ctx.db.patch(doc._id, { count: doc.count + 1 }); // Keeps incrementing!
}
```

### Handle Edge Cases

Account for null, undefined, and unexpected values:

```typescript
migrateOne: async (ctx, doc) => {
  // Handle missing or malformed data
  const email = doc.email?.toLowerCase?.() ?? "";
  if (email !== doc.email) {
    await ctx.db.patch(doc._id, { email });
  }
}
```

### Use Descriptive Names

Name migrations after the operation, not the date:

```typescript
// GOOD
export const normalizeUserEmails = migrations.define({ ... });
export const addOrganizationBillingDefaults = migrations.define({ ... });

// BAD
export const migration20250207 = migrations.define({ ... });
export const fixStuff = migrations.define({ ... });
```

## CLI Reference

```bash
# Run a specific migration
npx convex run migrations:run '{"fn": "migrations:migrationName"}'

# Run with options
npx convex run migrations:run '{"fn": "migrations:migrationName", "dryRun": true}'
npx convex run migrations:run '{"fn": "migrations:migrationName", "batchSize": 100}'

# Check migration status
npx convex run --component migrations lib:getStatus
npx convex run --component migrations lib:getStatus --watch

# Run in production
npx convex run migrations:run '{"fn": "migrations:migrationName"}' --prod

# Restart a failed migration
npx convex run migrations:run '{"fn": "migrations:migrationName", "cursor": null}'
```

## PR Checklist for Schema Changes

When submitting a PR with schema changes, verify:

- [ ] **Migration needed?** Check if existing data requires transformation
- [ ] **Migration defined?** Add to `convex/migrations.ts` with JSDoc
- [ ] **Migration tested?** Run locally and verify data
- [ ] **Deployment order documented?** Note if migration must run before/after deploy
- [ ] **Rollback plan?** Document how to undo if needed

## Troubleshooting

### Migration Stuck

```bash
# Check status for errors
npx convex run --component migrations lib:getStatus --watch

# Restart from beginning
npx convex run migrations:run '{"fn": "migrations:migrationName", "cursor": null}'
```

### Migration Too Slow

```bash
# Increase batch size (default is 100)
npx convex run migrations:run '{"fn": "migrations:migrationName", "batchSize": 500}'
```

### Need to Undo

1. Create a reverse migration
2. Run it
3. Or restore from backup if available

## Related Documentation

- [Convex Schema Evolution](https://docs.convex.dev/database/schemas)
- [Convex Migrations Component](https://www.convex.dev/components/migrations)
- [ADR 0012 - Schema Field Standards](../architecture/decisions/0012-schema-field-standards.md)
