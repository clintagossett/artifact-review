export default {
  providers: [
    {
      domain: process.env.NEXT_PUBLIC_CONVEX_URL?.replace("https://", ""),
      applicationID: "convex",
    },
  ],
};
