import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Normalize email to lowercase
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Type for enriched reviewer data
type ReviewerWithUser = Doc<"artifactReviewers"> & {
  user?: {
    name?: string;
    email?: string;
  };
};

/**
 * Invite a reviewer to an artifact by email
 * - Normalizes email to lowercase
 * - Checks for existing invitation
 * - Links to existing user if email matches
 * - Triggers email send via scheduler
 */
export const inviteReviewer = mutation({
  args: {
    artifactId: v.id("artifacts"),
    email: v.string(),
  },
  returns: v.id("artifactReviewers"),
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

    if (artifact.creatorId !== userId) {
      throw new Error("Only the artifact owner can invite reviewers");
    }

    // Validate email format
    const normalizedEmail = normalizeEmail(args.email);
    if (!isValidEmail(normalizedEmail)) {
      throw new Error("Invalid email address");
    }

    // Check for existing invitation
    const existingInvitation = await ctx.db
      .query("artifactReviewers")
      .withIndex("by_artifact_email", (q) =>
        q.eq("artifactId", args.artifactId).eq("email", normalizedEmail)
      )
      .first();

    if (existingInvitation && !existingInvitation.isDeleted) {
      throw new Error("This email has already been invited");
    }

    // Check if user with this email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizedEmail))
      .first();

    const now = Date.now();

    // Create reviewer record
    const reviewerId = await ctx.db.insert("artifactReviewers", {
      artifactId: args.artifactId,
      email: normalizedEmail,
      userId: existingUser?._id ?? null,
      invitedBy: userId,
      invitedAt: now,
      status: existingUser ? "accepted" : "pending",
      isDeleted: false,
    });

    // Schedule email send (async, non-blocking)
    await ctx.scheduler.runAfter(0, internal.sharing.sendInvitationEmail, {
      reviewerId,
    });

    return reviewerId;
  },
});

/**
 * Get all reviewers for an artifact (owner only)
 * - Returns active reviewers only (not soft-deleted)
 * - Enriches with user data when available
 */
export const getReviewers = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.array(
    v.object({
      _id: v.id("artifactReviewers"),
      _creationTime: v.number(),
      artifactId: v.id("artifacts"),
      email: v.string(),
      userId: v.union(v.id("users"), v.null()),
      invitedBy: v.id("users"),
      invitedAt: v.number(),
      status: v.union(v.literal("pending"), v.literal("accepted")),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      user: v.optional(
        v.object({
          name: v.optional(v.string()),
          email: v.optional(v.string()),
        })
      ),
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

    if (artifact.creatorId !== userId) {
      throw new Error("Only the artifact owner can view reviewers");
    }

    // Get active reviewers only
    const reviewers = await ctx.db
      .query("artifactReviewers")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .collect();

    // Enrich with user data
    const enrichedReviewers: ReviewerWithUser[] = await Promise.all(
      reviewers.map(async (reviewer) => {
        if (reviewer.userId) {
          const user = await ctx.db.get(reviewer.userId);
          return {
            ...reviewer,
            user: user
              ? {
                  name: user.name,
                  email: user.email,
                }
              : undefined,
          };
        }
        return reviewer;
      })
    );

    return enrichedReviewers;
  },
});

/**
 * Remove a reviewer (soft delete)
 * - Owner only
 * - Sets isDeleted flag and deletedAt timestamp
 */
export const removeReviewer = mutation({
  args: {
    reviewerId: v.id("artifactReviewers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Get reviewer record
    const reviewer = await ctx.db.get(args.reviewerId);
    if (!reviewer) {
      throw new Error("Reviewer not found");
    }

    // Verify artifact exists and user is owner
    const artifact = await ctx.db.get(reviewer.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }

    if (artifact.creatorId !== userId) {
      throw new Error("Only the artifact owner can remove reviewers");
    }

    // Soft delete
    await ctx.db.patch(args.reviewerId, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get user's permission level for an artifact
 * - Returns "owner" for artifact creator
 * - Returns "can-comment" for invited reviewers
 * - Returns null for no access or unauthenticated users
 */
export const getUserPermission = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.union(
    v.literal("owner"),
    v.literal("can-comment"),
    v.null()
  ),
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
    if (artifact.creatorId === userId) {
      return "owner";
    }

    // Check if user is an invited reviewer
    const reviewer = await ctx.db
      .query("artifactReviewers")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (reviewer) {
      return "can-comment";
    }

    return null;
  },
});

/**
 * Link pending invitations to a new user account (internal mutation)
 * - Called from auth callback when user signs up
 * - Links all pending invitations for the user's email
 * - Updates status from "pending" to "accepted"
 */
export const linkPendingInvitations = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);

    // Find all pending invitations for this email
    const pendingInvitations = await ctx.db
      .query("artifactReviewers")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .filter((q) => q.eq(q.field("userId"), null))
      .collect();

    // Link each invitation to the new user account
    for (const invitation of pendingInvitations) {
      await ctx.db.patch(invitation._id, {
        userId: args.userId,
        status: "accepted",
      });
    }

    return null;
  },
});

/**
 * Get reviewer by ID (internal query)
 * Used by sendInvitationEmail action
 */
export const getReviewerById = internalQuery({
  args: {
    reviewerId: v.id("artifactReviewers"),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifactReviewers"),
      _creationTime: v.number(),
      artifactId: v.id("artifacts"),
      email: v.string(),
      userId: v.union(v.id("users"), v.null()),
      invitedBy: v.id("users"),
      invitedAt: v.number(),
      status: v.union(v.literal("pending"), v.literal("accepted")),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.reviewerId);
  },
});

/**
 * Get artifact by ID (internal query)
 * Used by sendInvitationEmail action
 */
export const getArtifactById = internalQuery({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      creatorId: v.id("users"),
      shareToken: v.string(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.artifactId);
  },
});

/**
 * Get user by ID (internal query)
 * Used by sendInvitationEmail action
 */
export const getUserById = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      phone: v.optional(v.string()),
      phoneVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      image: v.optional(v.string()),
      username: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Render HTML email template for invitation
 */
function renderInvitationEmail(params: {
  artifactTitle: string;
  inviterName: string;
  shareToken: string;
  recipientEmail: string;
}): string {
  const artifactUrl = `https://artifactreview.app/a/${params.shareToken}`;

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
 * - Called by scheduler after inviteReviewer mutation
 * - Sends HTML email with artifact link
 */
export const sendInvitationEmail = internalAction({
  args: {
    reviewerId: v.id("artifactReviewers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get reviewer details
    const reviewer = await ctx.runQuery(internal.sharing.getReviewerById, {
      reviewerId: args.reviewerId,
    });

    if (!reviewer) {
      console.error("Reviewer not found:", args.reviewerId);
      return null;
    }

    // Get artifact details
    const artifact = await ctx.runQuery(internal.sharing.getArtifactById, {
      artifactId: reviewer.artifactId,
    });

    if (!artifact) {
      console.error("Artifact not found:", reviewer.artifactId);
      return null;
    }

    // Get inviter details
    const inviter = await ctx.runQuery(internal.sharing.getUserById, {
      userId: reviewer.invitedBy,
    });

    if (!inviter) {
      console.error("Inviter not found:", reviewer.invitedBy);
      return null;
    }

    const inviterName = inviter.name || inviter.email || "Someone";

    // Send email via Resend
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.AUTH_RESEND_KEY);

      const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || "notifications@artifactreview-early.xyz";

      await resend.emails.send({
        from: fromEmail,
        to: reviewer.email,
        subject: `You've been invited to review "${artifact.title}"`,
        html: renderInvitationEmail({
          artifactTitle: artifact.title,
          inviterName,
          shareToken: artifact.shareToken,
          recipientEmail: reviewer.email,
        }),
      });

      console.log("Invitation email sent:", {
        to: reviewer.email,
        artifact: artifact.title,
        inviter: inviterName,
      });
    } catch (error) {
      console.error("Failed to send invitation email:", error);
      // Don't throw - we don't want to fail the invitation if email fails
      // The invitation record is already created
    }

    return null;
  },
});
