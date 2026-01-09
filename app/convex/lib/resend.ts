import { components } from "../_generated/api";
import { Resend } from "@convex-dev/resend";

export const resend = new Resend(components.resend, {
    // Safe by default: testMode is enabled unless explicitly set to "false"
    testMode: process.env.RESEND_TEST_MODE !== "false",
});

