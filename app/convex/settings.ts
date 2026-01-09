import { v } from "convex/values";
import { query, mutation, action, internalQuery } from "./_generated/server";
import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import { createLogger, Topics } from "./lib/logger";
import { Id } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";

const log = createLogger("settings");

/**
 * Type for grace period status return value
 */
type GracePeriodStatus = {
  isWithinGracePeriod: boolean;
  expiresAt: number | null;
  sessionCreatedAt: number | null;
};

/**
 * Get the grace period duration in milliseconds.
 * 5 seconds in tests, 15 minutes in production.
 * Dynamic function to allow tests to modify NODE_ENV at runtime.
 */
function getGracePeriodMs(): number {
  return process.env.NODE_ENV === "test" ? 5 * 1000 : 15 * 60 * 1000;
}

/**
 * Internal helper to calculate grace period status for a given session.
 * This is testable without requiring full auth context.
 */
export const calculateGracePeriodForSession = internalQuery({
  args: {
    sessionId: v.id("authSessions"),
  },
  returns: v.object({
    isWithinGracePeriod: v.boolean(),
    expiresAt: v.union(v.number(), v.null()),
    sessionCreatedAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    // Get session record
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      log.warn(Topics.Auth, "Session not found", {
        sessionId: args.sessionId.toString(),
      });
      return {
        isWithinGracePeriod: false,
        expiresAt: null,
        sessionCreatedAt: null,
      };
    }

    // Calculate grace period status - call function to get dynamic value
    const GRACE_PERIOD_MS = getGracePeriodMs();
    const sessionCreatedAt = session._creationTime;
    const expiresAt = sessionCreatedAt + GRACE_PERIOD_MS;
    const isWithinGracePeriod = Date.now() < expiresAt;

    log.info(Topics.Auth, "Grace period status calculated", {
      sessionCreatedAt,
      expiresAt,
      isWithinGracePeriod,
      gracePeriodMs: GRACE_PERIOD_MS,
    });

    return {
      isWithinGracePeriod,
      expiresAt,
      sessionCreatedAt,
    };
  },
});

/**
 * Get the current grace period status for the authenticated user.
 * Returns whether the user is within the 15-minute (or 5-second in tests) grace period
 * after authentication, during which they can change their password without entering
 * their current password.
 */
export const getGracePeriodStatus = query({
  args: {},
  returns: v.object({
    isWithinGracePeriod: v.boolean(),
    expiresAt: v.union(v.number(), v.null()),
    sessionCreatedAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx) => {
    log.debug(Topics.Auth, "getGracePeriodStatus called");

    // Check if user is authenticated
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      log.debug(Topics.Auth, "No authenticated user");
      return {
        isWithinGracePeriod: false,
        expiresAt: null,
        sessionCreatedAt: null,
      };
    }

    // Get current session
    const sessionId = await getAuthSessionId(ctx);
    if (!sessionId) {
      log.debug(Topics.Auth, "No active session");
      return {
        isWithinGracePeriod: false,
        expiresAt: null,
        sessionCreatedAt: null,
      };
    }

    // Use internal query to calculate grace period
    const result: GracePeriodStatus =
      await ctx.runQuery(internal.settings.calculateGracePeriodForSession, {
        sessionId,
      });

    return result;
  },
});

/**
 * Change the user's password.
 * Within grace period: no current password needed.
 * Outside grace period: current password required.
 */
export const changePassword = mutation({
  args: {
    currentPassword: v.optional(v.string()),
    newPassword: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    log.debug(Topics.Auth, "changePassword called");

    // Require authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      log.warn(Topics.Auth, "Attempted to change password without authentication");
      return { success: false, error: "Not authenticated" };
    }

    // Validate new password
    if (args.newPassword.length < 8) {
      log.warn(Topics.Auth, "Password too short", { userId: userId.toString() });
      return { success: false, error: "Password must be at least 8 characters" };
    }

    if (!/\d/.test(args.newPassword)) {
      log.warn(Topics.Auth, "Password missing number", {
        userId: userId.toString(),
      });
      return { success: false, error: "Password must contain a number" };
    }

    if (!/[a-zA-Z]/.test(args.newPassword)) {
      log.warn(Topics.Auth, "Password missing letter", {
        userId: userId.toString(),
      });
      return { success: false, error: "Password must contain a letter" };
    }

    // Check grace period
    const sessionId = await getAuthSessionId(ctx);
    let isWithinGracePeriod = false;

    if (sessionId) {
      const gracePeriodStatus: GracePeriodStatus =
        await ctx.runQuery(internal.settings.calculateGracePeriodForSession, {
          sessionId,
        });
      isWithinGracePeriod = gracePeriodStatus.isWithinGracePeriod;
    }

    // If outside grace period, require current password
    if (!isWithinGracePeriod && !args.currentPassword) {
      log.warn(Topics.Auth, "Current password required outside grace period", {
        userId: userId.toString(),
      });
      return {
        success: false,
        error: "Current password required",
      };
    }

    // TODO: Implement password verification and update
    // This requires integration with Convex Auth password provider
    // For now, we've validated all the business logic
    // The actual password update should use modifyAccountCredentials from Convex Auth

    log.info(Topics.Auth, "Password change validated (implementation pending)", {
      userId: userId.toString(),
      withinGracePeriod: isWithinGracePeriod,
      currentPasswordProvided: !!args.currentPassword,
    });

    // Placeholder return - actual implementation will update the password
    return { success: true };
  },
});

/**
 * Send a re-authentication magic link to the user's email.
 * This allows the user to re-authenticate and get a fresh grace period
 * for password changes.
 */
export const sendReauthMagicLink = action({
  args: {
    redirectTo: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    log.debug(Topics.Auth, "sendReauthMagicLink called");

    // Get current user's email
    const user = await ctx.runQuery(api.users.getCurrentUser);

    if (!user?.email) {
      log.warn(Topics.Auth, "Attempted to send re-auth magic link without user email");
      throw new Error("User email not found");
    }

    // TODO: Implement magic link sending using Convex Auth signIn action
    // The magic link should redirect to the provided redirectTo URL (default: /settings)
    // This requires integration with the existing auth flow
    // For now, we've validated the user has an email

    const redirect = args.redirectTo || "/settings";

    log.info(Topics.Auth, "Re-auth magic link request validated (implementation pending)", {
      email: user.email,
      redirectTo: redirect,
    });

    // Placeholder - actual implementation will call signIn action
    // await ctx.runAction(api.auth.signIn, {
    //   provider: "resend",
    //   email: user.email,
    //   redirectTo: redirect,
    // });

    return null;
  },
});
