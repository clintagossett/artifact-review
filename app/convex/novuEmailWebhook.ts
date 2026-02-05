"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { sendEmail } from "./lib/email";

/**
 * Novu Email Webhook Payload
 *
 * When Novu's Email Webhook provider is configured, it POSTs the email
 * content that our bridge returned from step.email(). The payload includes:
 * - to: recipient email(s)
 * - from: sender email
 * - subject: email subject line
 * - html: rendered HTML body (from our bridge)
 * - text: optional plain text body
 */
interface EmailWebhookPayload {
  to: string | string[];
  from?: string;
  subject?: string;
  html?: string;
  text?: string;
  // Novu includes subscriber info if available
  subscriber?: {
    email?: string;
    firstName?: string;
    subscriberId?: string;
  };
}

/**
 * Process Novu Email Webhook
 *
 * Called from HTTP handler after signature verification.
 * The Email Webhook provider sends pre-rendered subject/body from our bridge,
 * so we send directly via Resend without re-rendering.
 */
export const processEmailWebhook = internalAction({
  args: {
    payload: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload = args.payload as EmailWebhookPayload;

    console.log("[Novu Webhook] Received payload keys:", Object.keys(payload));

    // Extract recipient email (Novu sends as string or array)
    let recipientEmail: string;
    if (Array.isArray(payload.to)) {
      recipientEmail = payload.to[0];
    } else if (typeof payload.to === "string") {
      recipientEmail = payload.to;
    } else if (payload.subscriber?.email) {
      recipientEmail = payload.subscriber.email;
    } else {
      console.error("[Novu Webhook] No recipient email in payload");
      return null;
    }

    // The Email Webhook provider passes through the subject and html/text
    // that we returned from step.email() in the workflow
    const subject = payload.subject || "Notification from Artifact Review";
    const html = payload.html || payload.text || "";

    if (!html) {
      console.error("[Novu Webhook] No email body in payload");
      return null;
    }

    console.log(`[Novu Webhook] Sending email to ${recipientEmail}: "${subject}"`);

    try {
      await sendEmail(ctx, {
        to: recipientEmail,
        subject,
        html,
        from:
          payload.from ||
          process.env.EMAIL_FROM_NOTIFICATIONS ||
          "Artifact Review <notifications@artifactreview-early.xyz>",
      });

      console.log(
        `[Novu Webhook] Email sent successfully to ${recipientEmail}`
      );
    } catch (error) {
      console.error("[Novu Webhook] Failed to send email:", error);
      throw error;
    }

    return null;
  },
});
