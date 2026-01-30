import { components } from "../_generated/api";
import { Resend } from "@convex-dev/resend";

export const resend = new Resend(components.resend, {
    // Local dev: resend-proxy routes to Mailpit
    // Production: real Resend API
    testMode: false,
});

