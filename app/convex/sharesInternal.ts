/**
 * Shared Internal Functions for Share Link Management
 *
 * These internalMutation functions contain ALL business logic for share link
 * operations. Both UI mutations and Agent API HTTP handlers call these internals.
 *
 * Design:
 * - Each function takes an explicit `userId` arg (caller authenticates first)
 * - All validation, DB writes lives here
 * - Default capabilities: { readComments: false, writeComments: false } (UI standard)
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Capabilities validator - reusable across functions
 */
const capabilitiesValidator = v.object({
  readComments: v.boolean(),
  writeComments: v.boolean(),
});

// ============================================================================
// SHARE LINK INTERNALS
// ============================================================================

/**
 * Create a public share link for an artifact.
 *
 * Extracted from shares.create (lines 28-84).
 * Idempotent: returns existing share if one exists.
 * Default capabilities: { readComments: false, writeComments: false }
 */
export const createShareLinkInternal = internalMutation({
  args: {
    artifactId: v.id("artifacts"),
    userId: v.id("users"),
    capabilities: v.optional(capabilitiesValidator),
  },
  returns: v.id("artifactShares"),
  handler: async (ctx, args) => {
    // Verify artifact exists and user is owner
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }

    if (artifact.createdBy !== args.userId) {
      throw new Error("Only the artifact owner can create share links");
    }

    // Check for existing share (one per artifact) - idempotent
    const existingShare = await ctx.db
      .query("artifactShares")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .first();

    if (existingShare) {
      return existingShare._id;
    }

    // Generate UUID token
    const token = crypto.randomUUID();
    const now = Date.now();

    // Default capabilities: view only (no comments)
    const defaultCapabilities = {
      readComments: false,
      writeComments: false,
    };

    // Create new share
    const shareId = await ctx.db.insert("artifactShares", {
      token,
      artifactId: args.artifactId,
      capabilities: args.capabilities ?? defaultCapabilities,
      enabled: true,
      createdBy: args.userId,
      createdAt: now,
    });

    return shareId;
  },
});

/**
 * Update share link settings (enabled state and/or capabilities).
 *
 * Merges shares.toggleEnabled + shares.updateCapabilities.
 * Both fields are optional - update whichever is provided.
 */
export const updateShareLinkInternal = internalMutation({
  args: {
    shareId: v.id("artifactShares"),
    userId: v.id("users"),
    enabled: v.optional(v.boolean()),
    capabilities: v.optional(capabilitiesValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get share record
    const share = await ctx.db.get(args.shareId);
    if (!share) {
      throw new Error("Share link not found");
    }

    // Verify artifact exists and user is owner
    const artifact = await ctx.db.get(share.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }

    if (artifact.createdBy !== args.userId) {
      throw new Error("Only the artifact owner can update share links");
    }

    const updates: Record<string, unknown> = {
      updatedBy: args.userId,
      updatedAt: Date.now(),
    };

    if (args.enabled !== undefined) {
      updates.enabled = args.enabled;
    }
    if (args.capabilities !== undefined) {
      updates.capabilities = args.capabilities;
    }

    await ctx.db.patch(args.shareId, updates);

    return null;
  },
});

/**
 * Delete (disable) a share link.
 *
 * Disables the share link by setting enabled=false.
 */
export const deleteShareLinkInternal = internalMutation({
  args: {
    shareId: v.id("artifactShares"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get share record
    const share = await ctx.db.get(args.shareId);
    if (!share) {
      throw new Error("Share link not found");
    }

    // Verify artifact exists and user is owner
    const artifact = await ctx.db.get(share.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }

    if (artifact.createdBy !== args.userId) {
      throw new Error("Only the artifact owner can delete share links");
    }

    await ctx.db.patch(args.shareId, {
      enabled: false,
      updatedBy: args.userId,
      updatedAt: Date.now(),
    });

    return null;
  },
});
