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
// ACTIVE MIGRATIONS
// =============================================================================

/**
 * Migration: Remove agentName denormalization from comment replies
 *
 * Background:
 * Previously, agentName was stored alongside agentId for performance (avoid lookup).
 * This caused stale data when agents were renamed. We now look up agent name at
 * display time from agentId, making the stored agentName obsolete.
 *
 * What this does:
 * - Removes agentName field from all commentReplies that have it
 * - The field will be set to undefined, effectively removing it from the document
 *
 * Safe to run:
 * - Display logic already ignores stored agentName and looks up from agentId
 * - This is a cleanup migration, not required for correctness
 *
 * Usage:
 *   npx convex run migrations:run '{"fn": "migrations:removeReplyAgentName"}'
 *
 * @see Issue #114 - API reply bug fix and denormalization removal
 */
export const removeReplyAgentName = migrations.define({
  table: "commentReplies",
  migrateOne: async (ctx, reply) => {
    // Cast to access the deprecated agentName field
    const anyReply = reply as any;

    // Skip if agentName is already undefined (nothing to remove)
    if (anyReply.agentName === undefined) {
      return;
    }

    // Remove the deprecated agentName field
    await ctx.db.patch(reply._id, {
      agentName: undefined,
    } as any);
  },
});

/**
 * Migration: Remove agentName denormalization from comments
 *
 * Same as removeReplyAgentName but for the comments table.
 *
 * Usage:
 *   npx convex run migrations:run '{"fn": "migrations:removeCommentAgentName"}'
 */
export const removeCommentAgentName = migrations.define({
  table: "comments",
  migrateOne: async (ctx, comment) => {
    const anyComment = comment as any;

    if (anyComment.agentName === undefined) {
      return;
    }

    await ctx.db.patch(comment._id, {
      agentName: undefined,
    } as any);
  },
});

/**
 * Migration: Remove agentName denormalization from artifact versions
 *
 * Same cleanup for artifactVersions table.
 *
 * Usage:
 *   npx convex run migrations:run '{"fn": "migrations:removeVersionAgentName"}'
 */
export const removeVersionAgentName = migrations.define({
  table: "artifactVersions",
  migrateOne: async (ctx, version) => {
    const anyVersion = version as any;

    if (anyVersion.agentName === undefined) {
      return;
    }

    await ctx.db.patch(version._id, {
      agentName: undefined,
    } as any);
  },
});
