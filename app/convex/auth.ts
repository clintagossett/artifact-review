import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import { query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Configure Email provider with Resend for magic links
const MagicLinkEmail = Email({
  id: "resend",
  // Magic link behavior: only token is needed, no email verification required on callback
  authorize: undefined,
  async sendVerificationRequest({ identifier, url }) {
    // Use internal bridge to send via Resend component (preserving context/tracking)
    try {
      const response = await fetch(`${process.env.CONVEX_SITE_URL}/send-auth-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: identifier,
          subject: "Sign in to Artifact Review",
          html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Sign in to Artifact Review</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; font-size: 24px;">Sign in to Artifact Review</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Click the button below to sign in to your account. This link will expire in 10 minutes.
            </p>
            <a href="${url}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; margin: 20px 0;">
              Sign in to Artifact Review
            </a>
            <p style="color: #999; font-size: 14px;">
              If you didn't request this email, you can safely ignore it.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              This link expires in 10 minutes. If the button doesn't work, copy and paste this URL into your browser:
              <br>
              <a href="${url}" style="color: #666;">${url}</a>
            </p>
          </body>
        </html>
      `,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send auth email via bridge: ${await response.text()}`);
      }
    } catch (error) {
      console.error("Failed to send auth email:", error);
      throw error;
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, MagicLinkEmail],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // Check if user already exists (for account linking)
      let existingUser;
      if (args.existingUserId) {
        existingUser = await ctx.db.get(args.existingUserId);
      } else {
        existingUser = await (ctx.db.query("users") as any)
          .withIndex("email", (q: any) => q.eq("email", args.profile.email))
          .first();
      }

      // Create or update user
      let userId: Id<"users">;
      const now = Date.now();

      if (existingUser) {
        userId = existingUser._id;
        await ctx.db.patch(userId, {
          name: args.profile.name ?? existingUser.name,
          image: args.profile.image ?? existingUser.image,
          updatedAt: now,
        });
      } else {
        userId = await ctx.db.insert("users", {
          email: args.profile.email,
          name: args.profile.name,
          image: args.profile.image,
          emailVerifiedAt: args.profile.emailVerified ? now : undefined,
          createdAt: now,
        });
      }

      // Link pending reviewer invitations for new users OR existing users adding email
      if (args.profile.email) {
        await ctx.scheduler.runAfter(0, internal.access.linkInvitesToUserInternal, {
          userId,
          email: args.profile.email,
        });
      }

      return userId;
    },
  },
});

export const getCurrentUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
