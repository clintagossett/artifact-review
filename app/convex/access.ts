import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { sendEmail } from "./lib/email";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Grant access to an artifact for a reviewer (invite)
 *
 * ## Behavior
 * - Normalizes email to lowercase
 * - Checks if email belongs to existing user
 *   - If YES: Creates artifactAccess with userId, no userInvites
 *   - If NO: Creates/reuses userInvites, creates artifactAccess with userInviteId
 * - Reuses existing userInvites for same (email, createdBy) pair
 * - Un-deletes existing artifactAccess if re-inviting after revocation
 * - Triggers email send via sendEmailInternal action
 */
export const grant = mutation({
  args: {
    artifactId: v.id("artifacts"),
    email: v.string(),
  },
  returns: v.id("artifactAccess"),
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
      throw new Error("Only the artifact owner can grant access");
    }

    // Validate and normalize email
    const normalizedEmail = normalizeEmail(args.email);
    if (!isValidEmail(normalizedEmail)) {
      throw new Error("Invalid email address");
    }

    const now = Date.now();

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
          if (process.env.SKIP_EMAILS !== "true") {
            await ctx.scheduler.runAfter(
              0,
              internal.access.sendEmailInternal,
              {
                accessId: existingAccess._id,
              }
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
        createdBy: userId,
        lastSentAt: now,
        sendCount: 1,
        isDeleted: false,
        createdAt: now,
      });

      // Trigger email
      if (process.env.SKIP_EMAILS !== "true") {
        await ctx.scheduler.runAfter(0, internal.access.sendEmailInternal, {
          accessId,
        });
      }

      return accessId;
    } else {
      // Path B: New user - create/reuse userInvites
      // Check for existing userInvites (one per email + createdBy)
      const existingInvite = await ctx.db
        .query("userInvites")
        .withIndex("by_email_createdBy", (q) =>
          q.eq("email", normalizedEmail).eq("createdBy", userId)
        )
        .first();

      if (existingInvite) {
        targetUserInviteId = existingInvite._id;
      } else {
        // Create new userInvites
        targetUserInviteId = await ctx.db.insert("userInvites", {
          email: normalizedEmail,
          createdBy: userId,
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
          if (process.env.SKIP_EMAILS !== "true") {
            await ctx.scheduler.runAfter(
              0,
              internal.access.sendEmailInternal,
              {
                accessId: existingAccess._id,
              }
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
        createdBy: userId,
        lastSentAt: now,
        sendCount: 1,
        isDeleted: false,
        createdAt: now,
      });

      // Trigger email
      if (process.env.SKIP_EMAILS !== "true") {
        await ctx.scheduler.runAfter(0, internal.access.sendEmailInternal, {
          accessId,
        });
      }

      return accessId;
    }
  },
});

/**
 * Revoke access (soft delete)
 * - Owner only
 * - Sets isDeleted flag and deletedAt timestamp
 * - Does NOT delete userInvites record
 */
export const revoke = mutation({
  args: {
    accessId: v.id("artifactAccess"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Get access record
    const access = await ctx.db.get(args.accessId);
    if (!access) {
      throw new Error("Access record not found");
    }

    // Verify artifact exists and user is owner
    const artifact = await ctx.db.get(access.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }

    if (artifact.createdBy !== userId) {
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

/**
 * Resend invitation email
 * - Increments sendCount
 * - Updates lastSentAt
 * - Triggers email send
 */
export const resend = mutation({
  args: {
    accessId: v.id("artifactAccess"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Get access record
    const access = await ctx.db.get(args.accessId);
    if (!access) {
      throw new Error("Access record not found");
    }

    // Verify artifact exists and user is owner
    const artifact = await ctx.db.get(access.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }

    if (artifact.createdBy !== userId) {
      throw new Error("Only the artifact owner can resend invitations");
    }

    // Update send tracking
    await ctx.db.patch(args.accessId, {
      lastSentAt: Date.now(),
      sendCount: access.sendCount + 1,
    });

    // Trigger email
    if (process.env.SKIP_EMAILS !== "true") {
      await ctx.scheduler.runAfter(0, internal.access.sendEmailInternal, {
        accessId: args.accessId,
      });
    }

    return null;
  },
});

/**
 * Record artifact view by reviewer
 * - Sets firstViewedAt on first view (never updated after)
 * - Updates lastViewedAt on each view
 */
export const recordView = mutation({
  args: {
    accessId: v.id("artifactAccess"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Get access record
    const access = await ctx.db.get(args.accessId);
    if (!access) {
      throw new Error("Access record not found");
    }

    // Verify user has this access record
    if (access.userId !== userId) {
      throw new Error("Access record does not belong to current user");
    }

    const now = Date.now();

    // Update view timestamps
    await ctx.db.patch(args.accessId, {
      firstViewedAt: access.firstViewedAt ?? now,
      lastViewedAt: now,
    });

    return null;
  },
});

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * List reviewers for an artifact (owner only)
 * - Returns active reviewers only (not soft-deleted)
 * - Enriches with user data when available
 */
export const listReviewers = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.array(
    v.object({
      accessId: v.id("artifactAccess"),
      email: v.string(),
      displayName: v.string(),
      status: v.union(v.literal("pending"), v.literal("added"), v.literal("viewed")),
      sendCount: v.number(),
      lastSentAt: v.number(),
      userId: v.optional(v.id("users")),
      userInviteId: v.optional(v.id("userInvites")),
    })
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
      throw new Error("Only the artifact owner can view reviewers");
    }

    // Get active access records
    const accessRecords = await ctx.db
      .query("artifactAccess")
      .withIndex("by_artifactId_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .collect();

    // Enrich with user/invite data
    const reviewers = await Promise.all(
      accessRecords.map(async (access) => {
        let email: string;
        let displayName: string;
        let status: "pending" | "added" | "viewed";

        if (access.userId) {
          // Existing user (added or viewed)
          const user = await ctx.db.get(access.userId);
          email = user?.email || "";
          displayName = user?.name || email;
          status = access.firstViewedAt ? "viewed" : "added";
        } else if (access.userInviteId) {
          // Pending user (invited but not signed up)
          const invite = await ctx.db.get(access.userInviteId);
          email = invite?.email || "";
          displayName = invite?.name || email;
          status = "pending";
        } else {
          // Should not happen - corrupt data
          throw new Error("Access record has neither userId nor userInviteId");
        }

        return {
          accessId: access._id,
          email,
          displayName,
          status,
          sendCount: access.sendCount,
          lastSentAt: access.lastSentAt,
          userId: access.userId,
          userInviteId: access.userInviteId,
        };
      })
    );

    return reviewers;
  },
});

/**
 * Get current user's permission level for an artifact
 * - Returns "owner" for artifact creator
 * - Returns "can-comment" for invited reviewers
 * - Returns null for no access
 */
export const getPermission = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.union(v.literal("owner"), v.literal("can-comment"), v.null()),
  handler: async (ctx, args) => {
    // Check authentication (allow unauthenticated - return null)
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Get artifact
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      return null;
    }

    // Check if user is owner
    if (artifact.createdBy === userId) {
      return "owner";
    }

    // Check if user has active access record
    const access = await ctx.db
      .query("artifactAccess")
      .withIndex("by_artifactId_userId", (q) =>
        q.eq("artifactId", args.artifactId).eq("userId", userId)
      )
      .unique();

    if (access && !access.isDeleted) {
      return "can-comment";
    }

    return null;
  },
});

/**
 * List artifacts shared with current user
 * - Returns active access records only
 * - Enriches with artifact data
 */
export const listShared = query({
  args: {},
  returns: v.array(
    v.object({
      artifact: v.object({
        _id: v.id("artifacts"),
        name: v.string(),
        description: v.optional(v.string()),
        shareToken: v.string(),
        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
      }),
      accessRecord: v.object({
        _id: v.id("artifactAccess"),
        firstViewedAt: v.optional(v.number()),
        lastViewedAt: v.optional(v.number()),
      }),
    })
  ),
  handler: async (ctx, args) => {
    // Verify authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get active access records for user
    const accessRecords = await ctx.db
      .query("artifactAccess")
      .withIndex("by_userId_active", (q) =>
        q.eq("userId", userId).eq("isDeleted", false)
      )
      .collect();

    // Enrich with artifact data
    const sharedWithNulls = await Promise.all(
      accessRecords.map(async (access) => {
        const artifact = await ctx.db.get(access.artifactId);
        if (!artifact) {
          // Artifact might have been deleted but access record remains
          // In a real app we might want to clean this up, but for query safety
          // we just skip it
          return null;
        }

        return {
          artifact: {
            _id: artifact._id,
            name: artifact.name,
            description: artifact.description,
            shareToken: artifact.shareToken,
            createdAt: artifact.createdAt,
            updatedAt: artifact.updatedAt,
          },
          accessRecord: {
            _id: access._id,
            firstViewedAt: access.firstViewedAt,
            lastViewedAt: access.lastViewedAt,
          },
        };
      })
    );

    const shared = sharedWithNulls.filter((item) => item !== null);

    return shared;
  },
});

/**
 * Get activity stats for an artifact (owner only)
 * - Total views count
 * - Unique viewers count
 * - Total comments count
 * - Last viewed info
 */
export const getActivityStats = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.object({
    totalViews: v.number(),
    uniqueViewers: v.number(),
    totalComments: v.number(),
    lastViewed: v.optional(
      v.object({
        timestamp: v.number(),
        userName: v.string(),
        userEmail: v.string(),
      })
    ),
  }),
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
      throw new Error("Only the artifact owner can view activity stats");
    }

    // Get all active access records for this artifact
    const accessRecords = await ctx.db
      .query("artifactAccess")
      .withIndex("by_artifactId_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .collect();

    // Calculate view stats
    const viewedRecords = accessRecords.filter(
      (access) => access.firstViewedAt !== undefined
    );
    const totalViews = viewedRecords.length;
    const uniqueViewers = viewedRecords.length; // One access record per user

    // Find last viewed
    let lastViewed:
      | { timestamp: number; userName: string; userEmail: string }
      | undefined = undefined;

    if (viewedRecords.length > 0) {
      // Sort by lastViewedAt descending
      const sortedViews = [...viewedRecords].sort((a, b) => {
        const aTime = a.lastViewedAt ?? 0;
        const bTime = b.lastViewedAt ?? 0;
        return bTime - aTime;
      });

      const mostRecent = sortedViews[0];
      if (mostRecent.lastViewedAt && mostRecent.userId) {
        const user = await ctx.db.get(mostRecent.userId);
        if (user) {
          lastViewed = {
            timestamp: mostRecent.lastViewedAt,
            userName: user.name || user.email || "Unknown",
            userEmail: user.email || "",
          };
        }
      }
    }

    // Get all versions for this artifact
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifactId_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .collect();

    // Count comments across all versions
    let totalComments = 0;
    for (const version of versions) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_versionId_active", (q) =>
          q.eq("versionId", version._id).eq("isDeleted", false)
        )
        .collect();
      totalComments += comments.length;
    }

    return {
      totalViews,
      uniqueViewers,
      totalComments,
      lastViewed,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Link pending invitations to a new user account (internal mutation)
 * - Called from auth callback when user signs up
 * - Links all pending invitations for the user's email
 * - Updates userInvites.convertedToUserId
 * - Updates all artifactAccess records: userId = newUserId, userInviteId = undefined
 */
export const linkInvitesToUserInternal = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);
    console.log("linkInvitesToUserInternal called:", { userId: args.userId, email: normalizedEmail });

    // Find all userInvites for this email
    const invites = await ctx.db
      .query("userInvites")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    console.log("Found invites:", invites.length);

    // For each invite, update convertedToUserId and migrate access records
    for (const invite of invites) {
      // Update userInvites record
      await ctx.db.patch(invite._id, {
        convertedToUserId: args.userId,
      });

      // Find all artifactAccess records for this invite
      const accessRecords = await ctx.db
        .query("artifactAccess")
        .withIndex("by_userInviteId", (q) => q.eq("userInviteId", invite._id))
        .collect();

      // Update each access record
      for (const access of accessRecords) {
        await ctx.db.patch(access._id, {
          userId: args.userId,
          userInviteId: undefined,
        });
      }
    }

    return null;
  },
});

// ============================================================================
// INTERNAL QUERIES (for actions)
// ============================================================================

/**
 * Get access record by ID (internal query)
 * Used by sendEmailInternal action
 */
export const getAccessById = internalQuery({
  args: { accessId: v.id("artifactAccess") },
  returns: v.union(
    v.object({
      _id: v.id("artifactAccess"),
      artifactId: v.id("artifacts"),
      userId: v.optional(v.id("users")),
      userInviteId: v.optional(v.id("userInvites")),
      createdBy: v.id("users"),
      lastSentAt: v.number(),
      sendCount: v.number(),
      firstViewedAt: v.optional(v.number()),
      lastViewedAt: v.optional(v.number()),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const access = await ctx.db.get(args.accessId);
    if (!access) return null;

    return {
      _id: access._id,
      artifactId: access.artifactId,
      userId: access.userId,
      userInviteId: access.userInviteId,
      createdBy: access.createdBy,
      lastSentAt: access.lastSentAt,
      sendCount: access.sendCount,
      firstViewedAt: access.firstViewedAt,
      lastViewedAt: access.lastViewedAt,
      isDeleted: access.isDeleted,
      deletedAt: access.deletedAt,
    };
  },
});

/**
 * Get artifact by ID (internal query)
 */
export const getArtifactById = internalQuery({
  args: { artifactId: v.id("artifacts") },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      name: v.string(),
      shareToken: v.string(),
      createdBy: v.id("users"),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) return null;

    return {
      _id: artifact._id,
      name: artifact.name,
      shareToken: artifact.shareToken,
      createdBy: artifact.createdBy,
    };
  },
});

/**
 * Get user by ID (internal query)
 */
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
    };
  },
});

/**
 * Get userInvite by ID (internal query)
 */
export const getUserInviteById = internalQuery({
  args: { inviteId: v.id("userInvites") },
  returns: v.union(
    v.object({
      _id: v.id("userInvites"),
      email: v.string(),
      name: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) return null;

    return {
      _id: invite._id,
      email: invite.email,
      name: invite.name,
    };
  },
});

// ============================================================================
// INTERNAL ACTIONS
// ============================================================================

/**
 * Render HTML email template for invitation
 */
function renderInvitationEmail(params: {
  artifactTitle: string;
  inviterName: string;
  shareToken: string;
  recipientEmail: string;
}): string {
  const appUrl =
    process.env.SITE_URL || "https://app.artifactreview-early.xyz";
  const artifactUrl = `${appUrl}/a/${params.shareToken}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>You've been invited to review "${params.artifactTitle}"</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px 0;">
            You've been invited to review an artifact
          </h1>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
            <strong>${params.inviterName}</strong> invited you to review and comment on their artifact.
          </p>

          <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin: 0 0 24px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
              Artifact
            </p>
            <p style="color: #111827; font-size: 18px; margin: 0; font-weight: 500;">
              ${params.artifactTitle}
            </p>
          </div>

          <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin: 0 0 24px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
              Your Permission
            </p>
            <p style="color: #111827; font-size: 16px; margin: 0;">
              <strong>Can Comment</strong> - You can view and add comments to this artifact
            </p>
          </div>

          <a href="${artifactUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500; margin: 0 0 24px 0;">
            View Artifact
          </a>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin: 0;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>

          <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">
            If the button doesn't work, copy and paste this URL into your browser:
            <br>
            <a href="${artifactUrl}" style="color: #6b7280; word-break: break-all;">${artifactUrl}</a>
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <p style="color: #9ca3af; font-size: 12px;">
            Artifact Review - Collaborative artifact review platform
          </p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send invitation email via Resend (internal action)
 * - Called by scheduler after grant/resend mutations
 * - Sends HTML email with artifact link
 */
export const sendEmailInternal = internalAction({
  args: {
    accessId: v.id("artifactAccess"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Skip if explicitly disabled
    if (process.env.SKIP_EMAILS === "true") {
      console.log("Skipping email send (SKIP_EMAILS=true)");
      return null;
    }

    // Get access record
    const access = await ctx.runQuery(internal.access.getAccessById, {
      accessId: args.accessId,
    });

    if (!access) {
      console.error("Access record not found:", args.accessId);
      return null;
    }

    // Get artifact
    const artifact = await ctx.runQuery(internal.access.getArtifactById, {
      artifactId: access.artifactId,
    });

    if (!artifact) {
      console.error("Artifact not found:", access.artifactId);
      return null;
    }

    // Get inviter
    const inviter = await ctx.runQuery(internal.access.getUserById, {
      userId: access.createdBy,
    });

    if (!inviter) {
      console.error("Inviter not found:", access.createdBy);
      return null;
    }

    // Get recipient email
    let recipientEmail: string;
    if (access.userId) {
      const user = await ctx.runQuery(internal.access.getUserById, {
        userId: access.userId,
      });
      recipientEmail = user?.email || "";
    } else if (access.userInviteId) {
      const invite = await ctx.runQuery(internal.access.getUserInviteById, {
        inviteId: access.userInviteId,
      });
      recipientEmail = invite?.email || "";
    } else {
      console.error("Access record has neither userId nor userInviteId");
      return null;
    }

    if (!recipientEmail) {
      console.error("Could not determine recipient email");
      return null;
    }

    // Send email
    try {
      const fromEmail =
        process.env.EMAIL_FROM_NOTIFICATIONS ||
        "notifications@artifactreview-early.xyz";

      await sendEmail(ctx, {
        from: fromEmail,
        to: recipientEmail,
        subject: `You've been invited to review "${artifact.name}"`,
        html: renderInvitationEmail({
          artifactTitle: artifact.name,
          inviterName: inviter.name || inviter.email || "Someone",
          shareToken: artifact.shareToken,
          recipientEmail,
        }),
      });

      console.log("Invitation email sent:", {
        to: recipientEmail,
        artifact: artifact.name,
      });
    } catch (error) {
      console.error("Failed to send invitation email:", error);
      // Don't throw - invitation already created
    }

    return null;
  },
});

// TEMPORARY DEBUG QUERY - REMOVE AFTER DEBUGGING
export const debugAccessData = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { error: "Not authenticated" };

    const user = await ctx.db.get(userId);

    // Get all userInvites
    const allInvites = await ctx.db.query("userInvites").collect();

    // Get all artifactAccess for this user
    const accessByUserId = await ctx.db
      .query("artifactAccess")
      .withIndex("by_userId_active", (q) => q.eq("userId", userId))
      .collect();

    return {
      currentUser: { id: userId, email: user?.email },
      allInvites: allInvites.map(i => ({ id: i._id, email: i.email, convertedToUserId: i.convertedToUserId })),
      accessByUserId,
    };
  },
});

// TEMPORARY FIX MUTATION - Manually link invites for a user
// Call from Convex dashboard: api.access.manualLinkInvites({ email: "clintagossett+20260103@gmail.com" })
export const manualLinkInvites = mutation({
  args: { email: v.string() },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    linkedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { success: false, message: "Not authenticated", linkedCount: 0 };
    }

    const normalizedEmail = normalizeEmail(args.email);
    console.log("manualLinkInvites called:", { userId, email: normalizedEmail });

    // Find all userInvites for this email
    const invites = await ctx.db
      .query("userInvites")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    console.log("Found invites:", invites.length);

    let linkedCount = 0;
    for (const invite of invites) {
      // Update userInvites record
      await ctx.db.patch(invite._id, {
        convertedToUserId: userId,
      });

      // Find all artifactAccess records for this invite
      const accessRecords = await ctx.db
        .query("artifactAccess")
        .withIndex("by_userInviteId", (q) => q.eq("userInviteId", invite._id))
        .collect();

      for (const access of accessRecords) {
        await ctx.db.patch(access._id, {
          userId: userId,
          userInviteId: undefined,
        });
        linkedCount++;
      }
    }

    return { success: true, message: `Linked ${linkedCount} access records`, linkedCount };
  },
});
