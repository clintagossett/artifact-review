
import { workflow } from "@novu/framework";
import { z } from "zod";

// Define the payload schema (type safety for the trigger)
export const commentWorkflow = workflow(
    "new-comment",
    async ({ step, payload }) => {

        // Step 1: In-App Notification (Real-time bell)
        await step.inApp("in-app-notification", async () => {
            return {
                subject: `New comment on ${payload.artifactDisplayTitle}`,
                body: `${payload.authorName} commented: "${payload.commentPreview}"`,
                avatar: payload.authorAvatarUrl,
                primaryAction: {
                    label: "View Comment",
                    url: payload.artifactUrl,
                },
            };
        });

        // Step 2: Digest (Batch updates for 10 minutes)
        const digest = await step.digest("digest-comments", async () => {
            // Allow overriding digest interval for testing (default: 10 minutes)
            const intervalFn = process.env.NOVU_DIGEST_INTERVAL
                ? parseInt(process.env.NOVU_DIGEST_INTERVAL)
                : 10;

            return {
                amount: intervalFn,
                unit: "minutes",
            };
        });

        // Step 3: Email Notification (Sent after digest finishes)
        await step.email("email-notification", async () => {
            // "digest.events" contains all the triggers that happened during the wait
            const events = digest.events.length > 0 ? digest.events : [payload];
            const count = events.length;
            const isSingle = count === 1;

            const subject = isSingle
                ? `New comment from ${payload.authorName} on ${payload.artifactDisplayTitle}`
                : `${count} new comments on ${payload.artifactDisplayTitle}`;

            // Simple HTML list of comments
            const commentsHtml = events.map((e: any) => `
                <div style="margin-bottom: 16px; padding: 12px; border-left: 3px solid #eee;">
                    <strong>${e.authorName}</strong>:
                    <p style="margin: 4px 0 0;">${e.commentPreview}</p>
                    <a href="${e.artifactUrl}" style="font-size: 12px; color: #666;">View</a>
                </div>
            `).join("");

            return {
                subject,
                body: `
                  <h1>${isSingle ? "New Comment" : `${count} New Comments`}</h1>
                  <p>
                    <strong>${payload.artifactDisplayTitle}</strong> has new activity.
                  </p>
                  
                  ${commentsHtml}
                  
                  <hr />
                  <a href="${payload.artifactUrl}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 4px;">
                    View Artifact
                  </a>
                `,
            };
        });
    },
    {
        payloadSchema: z.object({
            artifactDisplayTitle: z.string(),
            authorName: z.string(),
            authorAvatarUrl: z.string().optional(),
            commentPreview: z.string(),
            artifactUrl: z.string(),
        }),
    }
);
