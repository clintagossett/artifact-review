/**
 * Shared Internal Functions for Access Management
 *
 * These internalMutation functions contain ALL business logic for granting
 * and revoking artifact access. Both UI mutations and Agent API HTTP handlers
 * call these internals.
 *
 * Design:
 * - Each function takes an explicit `userId` arg (caller authenticates first)
 * - Optional `skipEmail` to suppress invitation emails (e.g., Agent API)
 * - All validation, DB writes, and email scheduling lives here
 */

import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Normalize email to lowercase for consistent matching
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// ACCESS INTERNALS
// ============================================================================

/**
 * Grant access to an artifact for a reviewer (invite).
 *
 * Extracted from access.grant (lines 49-225).
 * Includes email validation, user/invite path logic, un-delete, email scheduling.
 *
 * @param skipEmail - If true, skip sending invitation email (Agent API use case)
 */
export const grantAccessInternal = internalMutation({
  args: {
    artifactId: v.id("artifacts"),
    email: v.string(),
    userId: v.id("users"),
    skipEmail: v.optional(v.boolean()),
  },
  returns: v.id("artifactAccess"),
  handler: async (ctx, args) => {
    // Verify artifact exists and user is owner
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }

    if (artifact.createdBy !== args.userId) {
      throw new Error("Only the artifact owner can grant access");
    }

    // Validate and normalize email
    const normalizedEmail = normalizeEmail(args.email);
    if (!isValidEmail(normalizedEmail)) {
      throw new Error("Invalid email address");
    }

    const now = Date.now();
    const shouldSendEmail = !args.skipEmail && process.env.SKIP_EMAILS !== "true";

    // Check if email belongs to existing user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizedEmail))
      .first();

    let targetUserId: Id<"users"> | undefined = undefined;
    let targetUserInviteId: Id<"userInvites"> | undefined = undefined;

    if (existingUser) {
      // Path A: Existing user - no userInvites needed
      targetUserId = existingUser._id;

      // Check for existing artifactAccess (including deleted)
      const existingAccess = await ctx.db
        .query("artifactAccess")
        .withIndex("by_artifactId_userId", (q) =>
          q.eq("artifactId", args.artifactId).eq("userId", targetUserId)
        )
        .unique();

      if (existingAccess) {
        if (existingAccess.isDeleted) {
          // Un-delete and update send tracking
          await ctx.db.patch(existingAccess._id, {
            isDeleted: false,
            deletedAt: undefined,
            lastSentAt: now,
            sendCount: existingAccess.sendCount + 1,
          });

          // Trigger email
          if (shouldSendEmail) {
            await ctx.scheduler.runAfter(
              0,
              internal.access.sendEmailInternal,
              { accessId: existingAccess._id }
            );
          }

          return existingAccess._id;
        } else {
          throw new Error("This user already has access to this artifact");
        }
      }

      // Create new artifactAccess for existing user
      const accessId = await ctx.db.insert("artifactAccess", {
        artifactId: args.artifactId,
        userId: targetUserId,
        createdBy: args.userId,
        lastSentAt: now,
        sendCount: 1,
        isDeleted: false,
        createdAt: now,
      });

      // Trigger email
      if (shouldSendEmail) {
        await ctx.scheduler.runAfter(0, internal.access.sendEmailInternal, {
          accessId,
        });
      }

      return accessId;
    } else {
      // Path B: New user - create/reuse userInvites
      const existingInvite = await ctx.db
        .query("userInvites")
        .withIndex("by_email_createdBy", (q) =>
          q.eq("email", normalizedEmail).eq("createdBy", args.userId)
        )
        .first();

      if (existingInvite) {
        targetUserInviteId = existingInvite._id;
      } else {
        targetUserInviteId = await ctx.db.insert("userInvites", {
          email: normalizedEmail,
          createdBy: args.userId,
          isDeleted: false,
          createdAt: now,
        });
      }

      // Check for existing artifactAccess with this userInviteId
      const existingAccess = await ctx.db
        .query("artifactAccess")
        .withIndex("by_artifactId_userInviteId", (q) =>
          q.eq("artifactId", args.artifactId).eq("userInviteId", targetUserInviteId)
        )
        .unique();

      if (existingAccess) {
        if (existingAccess.isDeleted) {
          // Un-delete and update send tracking
          await ctx.db.patch(existingAccess._id, {
            isDeleted: false,
            deletedAt: undefined,
            lastSentAt: now,
            sendCount: existingAccess.sendCount + 1,
          });

          // Trigger email
          if (shouldSendEmail) {
            await ctx.scheduler.runAfter(
              0,
              internal.access.sendEmailInternal,
              { accessId: existingAccess._id }
            );
          }

          return existingAccess._id;
        } else {
          throw new Error("This email has already been invited to this artifact");
        }
      }

      // Create new artifactAccess for pending user
      const accessId = await ctx.db.insert("artifactAccess", {
        artifactId: args.artifactId,
        userInviteId: targetUserInviteId,
        createdBy: args.userId,
        lastSentAt: now,
        sendCount: 1,
        isDeleted: false,
        createdAt: now,
      });

      // Trigger email
      if (shouldSendEmail) {
        await ctx.scheduler.runAfter(0, internal.access.sendEmailInternal, {
          accessId,
        });
      }

      return accessId;
    }
  },
});

/**
 * Revoke access (soft delete).
 *
 * Extracted from access.revoke (lines 233-269).
 * Verifies artifact ownership before revoking.
 */
export const revokeAccessInternal = internalMutation({
  args: {
    accessId: v.id("artifactAccess"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get access record
    const access = await ctx.db.get(args.accessId);
    if (!access) {
      throw new Error("Access record not found");
    }

    if (access.isDeleted) {
      throw new Error("Access record already deleted");
    }

    // Verify artifact exists and user is owner
    const artifact = await ctx.db.get(access.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }

    if (artifact.createdBy !== args.userId) {
      throw new Error("Only the artifact owner can revoke access");
    }

    // Soft delete
    await ctx.db.patch(args.accessId, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return null;
  },
});
