import { action } from "./_generated/server";

export const check = action({
  handler: async () => {
    return {
      CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
      SITE_URL: process.env.SITE_URL,
    };
  },
});
