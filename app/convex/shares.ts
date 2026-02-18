import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Capabilities validator - reusable across mutations/queries
 */
const capabilitiesValidator = v.object({
  readComments: v.boolean(),
  writeComments: v.boolean(),
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Create a public share link for an artifact.
 *
 * Thin wrapper: auth → delegate to shared internal.
 */
export const create = mutation({
  args: {
    artifactId: v.id("artifacts"),
    capabilities: v.optional(capabilitiesValidator),
  },
  returns: v.id("artifactShares"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Delegate to shared internal (ownership check, idempotent create)
    const shareId: string = await ctx.runMutation(
      internal.sharesInternal.createShareLinkInternal,
      {
        artifactId: args.artifactId,
        userId,
        capabilities: args.capabilities,
      }
    );

    return shareId as any;
  },
});

/**
 * Toggle the enabled state of a share link.
 *
 * Thin wrapper: auth → read current state → delegate to shared internal.
 */
export const toggleEnabled = mutation({
  args: {
    shareId: v.id("artifactShares"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Read current state to determine toggle target
    const share = await ctx.db.get(args.shareId);
    if (!share) {
      throw new Error("Share link not found");
    }

    const newEnabled = !share.enabled;

    // Delegate to shared internal (ownership check, update)
    await ctx.runMutation(internal.sharesInternal.updateShareLinkInternal, {
      shareId: args.shareId,
      userId,
      enabled: newEnabled,
    });

    return newEnabled;
  },
});

/**
 * Update the capabilities of a share link.
 *
 * Thin wrapper: auth → delegate to shared internal.
 */
export const updateCapabilities = mutation({
  args: {
    shareId: v.id("artifactShares"),
    capabilities: capabilitiesValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Delegate to shared internal (ownership check, update)
    await ctx.runMutation(internal.sharesInternal.updateShareLinkInternal, {
      shareId: args.shareId,
      userId,
      capabilities: args.capabilities,
    });

    return null;
  },
});

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get the share link for an artifact (owner only, for settings UI).
 *
 * @returns The share link or null if none exists
 */
export const getForArtifact = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifactShares"),
      token: v.string(),
      capabilities: capabilitiesValidator,
      enabled: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Verify authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Verify artifact exists and user is owner
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }

    if (artifact.createdBy !== userId) {
      throw new Error("Only the artifact owner can view share link settings");
    }

    // Get share link
    const share = await ctx.db
      .query("artifactShares")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .first();

    if (!share) {
      return null;
    }

    return {
      _id: share._id,
      token: share.token,
      capabilities: share.capabilities,
      enabled: share.enabled,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
    };
  },
});

/**
 * Resolve a public share token to artifact info.
 *
 * ## Behavior
 * - Public query (no auth required)
 * - Returns null if token not found or share is disabled
 * - Returns artifact info and capabilities if valid
 *
 * @returns Artifact info for rendering or null if unavailable
 */
export const resolveToken = query({
  args: {
    token: v.string(),
  },
  returns: v.union(
    v.object({
      artifactId: v.id("artifacts"),
      artifactName: v.string(),
      shareToken: v.string(),
      publicShareToken: v.string(),
      capabilities: capabilitiesValidator,
      latestVersionId: v.optional(v.id("artifactVersions")),
      latestVersionNumber: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Look up share by token
    const share = await ctx.db
      .query("artifactShares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    // Return null if not found or disabled
    if (!share || !share.enabled) {
      return null;
    }

    // Get artifact
    const artifact = await ctx.db.get(share.artifactId);
    if (!artifact || artifact.isDeleted) {
      return null;
    }

    // Get latest active version
    const latestVersion = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifactId_active", (q) =>
        q.eq("artifactId", share.artifactId).eq("isDeleted", false)
      )
      .order("desc")
      .first();

    return {
      artifactId: artifact._id,
      artifactName: artifact.name,
      shareToken: artifact.shareToken,
      publicShareToken: share.token,
      capabilities: share.capabilities,
      latestVersionId: latestVersion?._id,
      latestVersionNumber: latestVersion?.number,
    };
  },
});
