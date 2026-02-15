/**
 * Rate Limit Helper Functions
 *
 * Provides rate limiting middleware for Convex queries, mutations, and HTTP actions.
 * Implements hierarchical rate limit checking: API Key → User → Organization.
 *
 * ## Usage
 *
 * ```typescript
 * // In a mutation
 * export const createArtifact = mutation({
 *   handler: async (ctx, args) => {
 *     await checkRateLimit(ctx, {
 *       limitName: "uploadEndpoint",
 *       key: userId,
 *       userId,
 *       organizationId,
 *     });
 *     // ... rest of handler
 *   },
 * });
 * ```
 *
 * ## Hierarchy
 *
 * Rate limits are checked in order from most specific to least specific.
 * Fails on first limit exceeded (does not continue checking).
 *
 * 1. API Key limit (if apiKeyId provided)
 * 2. User limit (if userId provided)
 * 3. Organization limit (if organizationId provided)
 *
 * ## Override Resolution
 *
 * For each level, effective limit is determined by:
 * 1. Custom override (from rateLimitOverrides table)
 * 2. Plan limit (from subscription → plan.limits)
 * 3. Global default (from RATE_LIMITS config)
 *
 * @see convex/lib/rateLimits.ts - Rate limit configurations
 * @see convex/rateLimitOverrides.ts - Override management
 */

import { components } from "../_generated/api";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { RATE_LIMITS, isRateLimitingEnabled } from "./rateLimits";
import { Id } from "../_generated/dataModel";
import { RateLimiter } from "@convex-dev/rate-limiter";

// Initialize rate limiter with our configurations
const rateLimiter = new RateLimiter(components.rateLimiter, RATE_LIMITS);

// Rate limiting only works in queries and mutations (not actions)
// Actions don't have access to ctx.db for override lookups
export type RateLimitContext = MutationCtx | QueryCtx;

export interface RateLimitOptions {
  /** Name of the rate limit config to use */
  limitName: keyof typeof RATE_LIMITS;

  /** Primary key for the rate limit (required) */
  key: string;

  /** User ID (for hierarchical checking) */
  userId?: Id<"users">;

  /** Organization ID (for hierarchical checking) */
  organizationId?: Id<"organizations">;

  /** API Key ID (for hierarchical checking) */
  apiKeyId?: Id<"apiKeys">;
}

/**
 * Check rate limit with hierarchical scope checking.
 *
 * Checks limits in order: API Key → User → Organization.
 * Throws RateLimitError if any limit is exceeded.
 *
 * @throws {RateLimitError} When rate limit is exceeded
 */
export async function checkRateLimit(
  ctx: RateLimitContext,
  options: RateLimitOptions
): Promise<void> {
  // Skip if disabled (test environment)
  if (!isRateLimitingEnabled()) {
    return;
  }

  // Level 1: API Key Limit (most specific)
  if (options.apiKeyId) {
    await checkSingleLimit(ctx, {
      ...options,
      key: `key:${options.apiKeyId}`,
      scope: "apiKey",
      scopeId: options.apiKeyId,
    });
  }

  // Level 2: User Limit
  if (options.userId) {
    await checkSingleLimit(ctx, {
      ...options,
      key: `user:${options.userId}`,
      scope: "user",
      scopeId: options.userId,
    });
  }

  // Level 3: Organization Limit (least specific)
  if (options.organizationId) {
    await checkSingleLimit(ctx, {
      ...options,
      key: `org:${options.organizationId}`,
      scope: "organization",
      scopeId: options.organizationId,
    });
  }
}

interface SingleLimitOptions extends RateLimitOptions {
  scope: "apiKey" | "user" | "organization";
  scopeId: Id<"apiKeys"> | Id<"users"> | Id<"organizations">;
}

/**
 * Check a single rate limit at a specific scope level.
 */
async function checkSingleLimit(
  ctx: RateLimitContext,
  options: SingleLimitOptions
): Promise<void> {
  const config = RATE_LIMITS[options.limitName];

  // Get effective limit (override > plan > default)
  const effectiveLimit = await getEffectiveLimit(ctx, options);
  const effectiveConfig = {
    ...config,
    rate: effectiveLimit,
    capacity: effectiveLimit * 1.5, // Allow 50% burst capacity
  };

  // Determine if this is a mutation or query context
  // Mutations have runMutation, queries don't
  const isMutation = "runMutation" in ctx;

  // Call rate limiter component (limit for mutations, check for queries)
  const result = isMutation
    ? await rateLimiter.limit(ctx as any, options.limitName, {
        ...effectiveConfig,
        key: options.key,
        throws: false, // We'll throw our own error with more context
      })
    : await rateLimiter.check(ctx as any, options.limitName, {
        ...effectiveConfig,
        key: options.key,
        throws: false,
      });

  if (!result.ok) {
    throw new RateLimitError(
      result.retryAfter,
      effectiveConfig.rate,
      effectiveConfig.period,
      options.scope
    );
  }
}

/**
 * Determine effective rate limit for a given scope.
 *
 * Resolution order:
 * 1. Custom override (rateLimitOverrides table)
 * 2. Plan limit (subscription → plan.limits)
 * 3. Global default (RATE_LIMITS config)
 */
async function getEffectiveLimit(
  ctx: RateLimitContext,
  options: SingleLimitOptions
): Promise<number> {
  const baseConfig = RATE_LIMITS[options.limitName];
  const limitType = mapLimitNameToType(options.limitName);

  // Priority 1: Check custom override
  const override = await getOverride(ctx, options.scope, options.scopeId, limitType);
  if (override) {
    return override.customLimit;
  }

  // Priority 2: Check billing plan limits (user-level only)
  if (options.userId && options.scope === "user") {
    const planLimit = await getPlanLimit(ctx, options.userId, limitType);
    if (planLimit !== null) {
      return planLimit;
    }
  }

  // Priority 3: Fall back to global default
  return baseConfig.rate;
}

/**
 * Get custom override for a specific scope and limit type.
 *
 * Returns the first active (non-deleted, non-expired) override found.
 */
async function getOverride(
  ctx: RateLimitContext,
  scope: "apiKey" | "user" | "organization",
  scopeId: Id<"apiKeys"> | Id<"users"> | Id<"organizations">,
  limitType: "auth" | "read" | "write" | "upload" | "public"
): Promise<{ customLimit: number } | null> {
  const now = Date.now();

  let query;
  if (scope === "apiKey") {
    query = ctx.db
      .query("rateLimitOverrides")
      .withIndex("by_apiKeyId_limitType", (q) =>
        q.eq("apiKeyId", scopeId as Id<"apiKeys">).eq("limitType", limitType)
      );
  } else if (scope === "user") {
    query = ctx.db
      .query("rateLimitOverrides")
      .withIndex("by_userId_limitType", (q) =>
        q.eq("userId", scopeId as Id<"users">).eq("limitType", limitType)
      );
  } else {
    // organization
    query = ctx.db
      .query("rateLimitOverrides")
      .withIndex("by_organizationId_limitType", (q) =>
        q.eq("organizationId", scopeId as Id<"organizations">).eq("limitType", limitType)
      );
  }

  const override = await query
    .filter((q) => q.eq(q.field("isDeleted"), false))
    .first();

  // Check if override is expired
  if (override && override.expiresAt && override.expiresAt < now) {
    return null;
  }

  return override ? { customLimit: override.customLimit } : null;
}

/**
 * Get rate limit from user's billing plan.
 *
 * Looks up user's organization → subscription → plan → limits.
 */
async function getPlanLimit(
  ctx: RateLimitContext,
  userId: Id<"users">,
  limitType: "auth" | "read" | "write" | "upload" | "public"
): Promise<number | null> {
  // Get user's organization
  const membership = await ctx.db
    .query("members")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (!membership) return null;

  // Get active subscription
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", membership.organizationId)
    )
    .filter((q) => q.eq(q.field("status"), "active"))
    .first();

  if (!subscription || !subscription.planId) return null;

  // Get plan limits
  const plan = await ctx.db.get(subscription.planId);
  if (!plan?.limits) return null;

  // Map limitType to plan field
  const limitMap: Record<string, keyof typeof plan.limits> = {
    auth: "authPerMinute",
    read: "readPerMinute",
    write: "writePerMinute",
    upload: "uploadPerMinute",
    public: "publicPerMinute",
  };

  const planField = limitMap[limitType];
  if (!planField) return null;

  const limitValue = plan.limits[planField];
  return typeof limitValue === "number" ? limitValue : null;
}

/**
 * Map limitName to limitType for override lookups.
 */
function mapLimitNameToType(
  limitName: keyof typeof RATE_LIMITS
): "auth" | "read" | "write" | "upload" | "public" {
  const mapping: Record<
    keyof typeof RATE_LIMITS,
    "auth" | "read" | "write" | "upload" | "public"
  > = {
    authAttempt: "auth",
    readEndpoint: "read",
    writeEndpoint: "write",
    uploadEndpoint: "upload",
    publicEndpoint: "public",
  };
  return mapping[limitName];
}

/**
 * Custom error for rate limit exceeded.
 *
 * Thrown by checkRateLimit when a rate limit is exceeded.
 * Contains metadata for generating proper HTTP 429 responses.
 */
export class RateLimitError extends Error {
  constructor(
    /** Time in milliseconds until limit resets */
    public retryAfter: number,
    /** Maximum requests per period */
    public limit: number,
    /** Period duration in milliseconds */
    public period: number,
    /** Scope at which the limit was exceeded */
    public scope: "apiKey" | "user" | "organization"
  ) {
    super(
      `Rate limit exceeded at ${scope} level. Retry after ${Math.ceil(retryAfter / 1000)}s`
    );
    this.name = "RateLimitError";
  }

  /**
   * Convert to HTTP 429 response.
   */
  toResponse(): {
    status: 429;
    body: { error: string; retryAfter: number };
    headers: Record<string, string>;
  } {
    return {
      status: 429,
      body: {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil(this.retryAfter / 1000),
      },
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": this.limit.toString(),
        "Retry-After": Math.ceil(this.retryAfter / 1000).toString(),
      },
    };
  }
}
