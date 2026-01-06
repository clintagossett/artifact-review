import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createLogger, Topics } from "./lib/logger";

const log = createLogger("users");

// Get current user information
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    log.debug(Topics.Auth, "getCurrentUser called");

    const userId = await getAuthUserId(ctx);

    if (userId === null) {
      log.debug(Topics.Auth, "No authenticated user");
      return null;
    }

    log.debug(Topics.Auth, "User ID retrieved", { userId: userId.toString() });

    const user = await ctx.db.get(userId);

    if (!user) {
      log.warn(Topics.Auth, "User ID exists but user record not found", {
        userId: userId.toString(),
        recovery: "Check if user was deleted or auth is out of sync",
      });
      return null;
    }

    log.info(Topics.Auth, "User retrieved successfully", {
      userId: user._id.toString(),
    });

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
    };
  },
});

// Get user by email (for password authentication)
export const getByEmail = query({
  args: {
    email: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    log.debug(Topics.User, "getByEmail called", { email: args.email });

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      log.debug(Topics.User, "Email not found", { email: args.email });
      return null;
    }

    log.info(Topics.User, "User found by email", {
      userId: user._id.toString(),
      email: args.email,
    });

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
    };
  },
});

/**
 * Update the current user's display name.
 */
export const updateName = mutation({
  args: {
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    log.debug(Topics.User, "updateName called", { name: args.name });

    // Require authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      log.warn(Topics.Auth, "Attempted to update name without authentication");
      throw new Error("Not authenticated");
    }

    // Validate name
    const trimmedName = args.name.trim();

    if (!trimmedName) {
      log.warn(Topics.User, "Attempted to set empty name", { userId: userId.toString() });
      throw new Error("Name cannot be empty");
    }

    if (trimmedName.length > 100) {
      log.warn(Topics.User, "Attempted to set name too long", {
        userId: userId.toString(),
        length: trimmedName.length,
      });
      throw new Error("Name too long (max 100 characters)");
    }

    // Update user
    await ctx.db.patch(userId, { name: trimmedName });

    log.info(Topics.User, "User name updated", {
      userId: userId.toString(),
      newName: trimmedName,
    });

    return null;
  },
});
