import { v } from "convex/values";
import { query } from "./_generated/server";
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
      isAnonymous: v.optional(v.boolean()),
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
      isAnonymous: user.isAnonymous,
    });

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAnonymous: user.isAnonymous,
    };
  },
});
