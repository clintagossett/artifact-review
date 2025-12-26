import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const testMutation = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    console.log("MUTATION - userId:", userId);
    return { userId, type: "mutation" };
  },
});

export const testQuery = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    console.log("QUERY - userId:", userId);
    return { userId, type: "query" };
  },
});
