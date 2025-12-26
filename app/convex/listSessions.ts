import { query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    const sessions = await ctx.db.query("authSessions").collect();
    return sessions;
  },
});
