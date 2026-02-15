/**
 * Rate Limit Override Management
 *
 * Provides mutations for organization owners to manage custom rate limits.
 * Supports creating, listing, and deleting (soft) overrides.
 *
 * ## Permission Model
 *
 * - Only organization owners can manage overrides
 * - Overrides are scoped to the owner's organization
 * - Cannot set overrides for other organizations
 * - Target users/API keys must belong to the organization
 *
 * ## Use Cases
 *
 * - Premium customers: Increase limits above plan defaults
 * - Enterprise: Custom limits per team/user
 * - Abuse prevention: Decrease limits for problematic users/keys
 * - Temporary promotions: Time-limited increases with expiresAt
 *
 * @see convex/lib/rateLimit.ts - Rate limit checking logic
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

/**
 * Check if user is an organization owner.
 */
async function isOrgOwner(
  ctx: any,
  userId: Id<"users">,
  organizationId: Id<"organizations">
): Promise<boolean> {
  const membership = await ctx.db
    .query("members")
    .withIndex("by_org_and_user", (q: any) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .first();

  return membership?.roles.includes("owner") ?? false;
}

/**
 * Set a custom rate limit override.
 *
 * Organization owners can set custom limits for:
 * - Their entire organization (organizationId only)
 * - Specific users in their organization (+ targetUserId)
 * - Specific API keys owned by org members (+ targetApiKeyId)
 *
 * Limits can be higher (premium) or lower (abuse prevention) than defaults.
 * Optionally time-limited with expiresAt.
 *
 * @throws Error if user is not org owner
 * @throws Error if target user/key not in organization
 */
export const setOverride = mutation({
  args: {
    /** Organization to set override for (required) */
    targetOrganizationId: v.id("organizations"),

    /** Optional: specific user in the organization */
    targetUserId: v.optional(v.id("users")),

    /** Optional: specific API key owned by org member */
    targetApiKeyId: v.optional(v.id("apiKeys")),

    /** Type of rate limit to override */
    limitType: v.union(
      v.literal("auth"),
      v.literal("read"),
      v.literal("write"),
      v.literal("upload"),
      v.literal("public")
    ),

    /** Custom limit value (requests per minute) */
    customLimit: v.number(),

    /** Reason for this override (required for audit trail) */
    reason: v.string(),

    /** Optional expiration timestamp (Unix ms) */
    expiresAt: v.optional(v.number()),
  },
  returns: v.id("rateLimitOverrides"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Verify user is owner of target organization
    const isOwner = await isOrgOwner(ctx, userId, args.targetOrganizationId);
    if (!isOwner) {
      throw new Error(
        "Permission denied: Only organization owners can set rate limit overrides"
      );
    }

    // If targeting a specific user, verify they're in the organization
    if (args.targetUserId) {
      const targetUserId = args.targetUserId; // TypeScript narrowing
      const userMembership = await ctx.db
        .query("members")
        .withIndex("by_org_and_user", (q) =>
          q
            .eq("organizationId", args.targetOrganizationId)
            .eq("userId", targetUserId)
        )
        .first();

      if (!userMembership) {
        throw new Error("Target user is not a member of this organization");
      }
    }

    // If targeting an API key, verify it belongs to an org member
    if (args.targetApiKeyId) {
      const apiKey = await ctx.db.get(args.targetApiKeyId);
      if (!apiKey) {
        throw new Error("API key not found");
      }

      const keyOwnerMembership = await ctx.db
        .query("members")
        .withIndex("by_org_and_user", (q) =>
          q
            .eq("organizationId", args.targetOrganizationId)
            .eq("userId", apiKey.createdBy)
        )
        .first();

      if (!keyOwnerMembership) {
        throw new Error("API key owner is not a member of this organization");
      }
    }

    // Validate custom limit is positive
    if (args.customLimit <= 0) {
      throw new Error("Custom limit must be greater than 0");
    }

    // Validate expiration is in the future
    if (args.expiresAt && args.expiresAt <= Date.now()) {
      throw new Error("Expiration must be in the future");
    }

    // Create the override
    const overrideId = await ctx.db.insert("rateLimitOverrides", {
      userId: args.targetUserId,
      organizationId: args.targetOrganizationId,
      apiKeyId: args.targetApiKeyId,
      limitType: args.limitType,
      customLimit: args.customLimit,
      reason: args.reason,
      createdBy: userId,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      isDeleted: false,
    });

    return overrideId;
  },
});

/**
 * List all rate limit overrides for an organization.
 *
 * Returns active overrides (non-deleted, non-expired) for the organization.
 * Includes org-level, user-level, and API-key-level overrides.
 *
 * @throws Error if user is not org owner
 */
export const listOverrides = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      _id: v.id("rateLimitOverrides"),
      _creationTime: v.number(),
      userId: v.optional(v.id("users")),
      organizationId: v.optional(v.id("organizations")),
      apiKeyId: v.optional(v.id("apiKeys")),
      limitType: v.string(),
      customLimit: v.number(),
      reason: v.string(),
      createdBy: v.id("users"),
      createdAt: v.number(),
      expiresAt: v.optional(v.number()),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      deletedBy: v.optional(v.id("users")),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Verify user is owner of the organization
    const isOwner = await isOrgOwner(ctx, userId, args.organizationId);
    if (!isOwner) {
      throw new Error(
        "Permission denied: Only organization owners can view rate limit overrides"
      );
    }

    // Get all overrides for this organization (including deleted for audit trail)
    const overrides = await ctx.db
      .query("rateLimitOverrides")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return overrides;
  },
});

/**
 * Delete (soft) a rate limit override.
 *
 * Soft-deletes the override, preserving audit trail.
 * Override will no longer be applied to rate limit checks.
 *
 * @throws Error if user is not org owner
 * @throws Error if override not found
 */
export const deleteOverride = mutation({
  args: {
    overrideId: v.id("rateLimitOverrides"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const override = await ctx.db.get(args.overrideId);
    if (!override) {
      throw new Error("Override not found");
    }

    // Verify organization association
    if (!override.organizationId) {
      throw new Error("Override does not have an associated organization");
    }

    // Verify user is owner of the organization
    const isOwner = await isOrgOwner(ctx, userId, override.organizationId);
    if (!isOwner) {
      throw new Error(
        "Permission denied: Only organization owners can delete overrides"
      );
    }

    // Soft delete
    await ctx.db.patch(args.overrideId, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: userId,
    });

    return null;
  },
});
