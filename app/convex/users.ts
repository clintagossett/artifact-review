import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";

// Get current user information
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      isAnonymous: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);

    if (userId === null) {
      return null;
    }

    const user = await ctx.db.get(userId);

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAnonymous: user.isAnonymous,
    };
  },
});
