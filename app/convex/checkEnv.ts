import { action } from "./_generated/server";

export const check = action({
  handler: async () => {
    return {
      CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
      CONVEX_SITE_ORIGIN: process.env.CONVEX_SITE_ORIGIN,
      CONVEX_SELF_HOSTED_URL: process.env.CONVEX_SELF_HOSTED_URL,
      SITE_URL: process.env.SITE_URL,
    };
  },
});
