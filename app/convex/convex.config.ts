import { defineApp } from "convex/server";
import resend from "@convex-dev/resend/convex.config";
import stripe from "@convex-dev/stripe/convex.config.js";
import migrations from "@convex-dev/migrations/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();
app.use(resend);
app.use(stripe);
app.use(migrations);
app.use(rateLimiter);

export default app;
