import { Resend } from "@convex-dev/resend";
import { components } from "../_generated/api";
import { ActionCtx } from "../_generated/server";

export const resend = new Resend(components.resend, {
    testMode: process.env.RESEND_TEST_MODE !== "false",
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
    const isLocal = process.env.CONVEX_SELF_HOSTED_URL !== undefined;

    if (isLocal) {
        console.log(`Sending email to ${args.to} via Mailpit. Args:`, JSON.stringify(args));

        // Parse "Name <email@domain.com>" or just "email@domain.com"
        let fromAddress = args.from || "hello@artifactreview-local.xyz";
        let fromName = "";

        const match = fromAddress.match(/^(.*)<(.*)>$/);
        if (match) {
            fromName = match[1].trim();
            fromAddress = match[2].trim();
        }

        // Local: Send to Mailpit via API
        // In the docker network, mailpit is reachable at http://mailpit:8025
        try {
            const response = await fetch("http://mailpit:8025/api/v1/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    From: { Email: fromAddress, Name: fromName },
                    To: [{ Email: args.to }],
                    Subject: args.subject,
                    HTML: args.html,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                console.error("Failed to send to Mailpit:", text);
            } else {
                console.log(`Email to ${args.to} sent to Mailpit`);
            }
        } catch (error) {
            console.error("Error sending to Mailpit:", error);
        }
        return; // Always return in local dev to avoid Resend fall-through
    }

    // Default: Use Resend component
    await resend.sendEmail(ctx, {
        ...args,
        from: args.from || process.env.RESEND_FROM_EMAIL || "hello@artifactreview-early.xyz",
    });
}
