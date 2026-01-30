import { Resend } from "@convex-dev/resend";
import { components } from "../_generated/api";
import { ActionCtx } from "../_generated/server";

/**
 * Resend client for email sending.
 *
 * In production: Emails go to Resend API → delivered
 * In local dev: Docker intercepts api.resend.com → resend-proxy → Mailpit
 *
 * One code path for all environments.
 */
export const resend = new Resend(components.resend, {
    // Local dev: resend-proxy routes to Mailpit
    // Production: real Resend API
    testMode: false,
});

export async function sendEmail(
    ctx: ActionCtx,
    args: {
        to: string;
        subject: string;
        html: string;
        from?: string;
    }
) {
    await resend.sendEmail(ctx, {
        ...args,
        from: args.from || process.env.RESEND_FROM_EMAIL || "hello@artifactreview-early.xyz",
    });
}
