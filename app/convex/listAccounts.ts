import { query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    const accounts = await ctx.db.query("authAccounts").collect();
    return accounts;
  },
});
