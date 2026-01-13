import { Resend } from "@convex-dev/resend";
import { components } from "../_generated/api";
import { ActionCtx } from "../_generated/server";

const resend = new Resend(components.resend, {
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
        // Local: Send to Mailpit via API
        // In the docker network, mailpit is reachable at http://mailpit:8025
        try {
            const response = await fetch("http://mailpit:8025/api/v1/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    From: { Address: args.from || "hello@artifactreview-local.xyz" },
                    To: [{ Address: args.to }],
                    Subject: args.subject,
                    HTML: args.html,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                console.error("Failed to send to Mailpit:", text);
                // Fallback to Resend component if Mailpit fails? 
                // No, let's keep it clean.
            } else {
                console.log(`Email to ${args.to} sent to Mailpit`);
                return;
            }
        } catch (error) {
            console.error("Error sending to Mailpit:", error);
        }
    }

    // Default: Use Resend component
    await resend.sendEmail(ctx, args);
}
