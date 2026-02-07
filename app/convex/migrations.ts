/**
 * Convex Migrations
 *
 * This module provides versioned, trackable database migrations for safe schema evolution.
 *
 * ## When to Use Migrations
 *
 * Migrations are REQUIRED when:
 * - Adding a new REQUIRED field to existing documents
 * - Renaming fields (migrate data to new field name)
 * - Changing field types (convert existing data)
 * - Backfilling computed or derived fields
 * - Data cleanup or normalization
 *
 * Migrations are NOT NEEDED when:
 * - Adding a new OPTIONAL field (v.optional())
 * - Adding a new table
 * - Adding a new index
 * - Removing a field (just remove from schema, old data ignored)
 *
 * ## Usage
 *
 * 1. Define a migration in this file
 * 2. Run locally: `npx convex run migrations:run '{"fn": "migrations:migrationName"}'`
 * 3. Check status: `npx convex run --component migrations lib:getStatus --watch`
 * 4. Run in production: Add `--prod` flag
 *
 * @see docs/development/migrations.md - Full migration workflow documentation
 * @see https://www.convex.dev/components/migrations - Official docs
 */

import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";

// Initialize migrations with type-safe DataModel
export const migrations = new Migrations<DataModel>(components.migrations);

// Runner function for CLI execution
export const run = migrations.runner();

// =============================================================================
// MIGRATION DEFINITIONS
// =============================================================================
// Add new migrations below. Each migration should:
// 1. Have a descriptive name matching the operation
// 2. Include a JSDoc comment explaining what it does
// 3. Be idempotent (safe to run multiple times)
// 4. Handle undefined/null values gracefully

/**
 * Example Migration: Set default createdAt for legacy records
 *
 * This is a template migration showing the pattern. It targets users
 * that might have been created before createdAt was required.
 *
 * Usage:
 *   npx convex run migrations:run '{"fn": "migrations:setDefaultCreatedAt"}'
 *
 * @deprecated Example only - remove after confirming migrations work
 */
export const setDefaultCreatedAt = migrations.define({
  table: "users",
  migrateOne: async (ctx, user) => {
    // Skip if already has createdAt
    if (user.createdAt !== undefined) {
      return;
    }

    // Set createdAt to a default timestamp (Jan 1, 2025)
    // In real migrations, you might use _creationTime or another heuristic
    await ctx.db.patch(user._id, {
      createdAt: new Date("2025-01-01").getTime(),
    });
  },
});

// =============================================================================
// FUTURE MIGRATIONS
// =============================================================================
// Add new migrations here as schema evolves. Examples:
//
// export const addUserPreferences = migrations.define({
//   table: "users",
//   migrateOne: async (ctx, user) => {
//     if (user.preferences === undefined) {
//       await ctx.db.patch(user._id, { preferences: { theme: "light" } });
//     }
//   },
// });
//
// export const normalizeEmails = migrations.define({
//   table: "users",
//   migrateOne: async (ctx, user) => {
//     if (user.email && user.email !== user.email.toLowerCase()) {
//       await ctx.db.patch(user._id, { email: user.email.toLowerCase() });
//     }
//   },
// });
