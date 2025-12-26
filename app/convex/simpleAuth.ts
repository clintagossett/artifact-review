import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const test = query({
  handler: async (ctx) => {
    // Try both methods
    const identity = await ctx.auth.getUserIdentity();
    const userId = await getAuthUserId(ctx);

    console.log("ctx.auth.getUserIdentity():", identity);
    console.log("getAuthUserId(ctx):", userId);

    return {
      identity,
      userId,
      hasIdentity: !!identity,
      hasUserId: !!userId,
    };
  },
});
