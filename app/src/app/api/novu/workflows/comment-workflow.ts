
import { workflow } from "@novu/framework";
import { z } from "zod";

// Define the payload schema (type safety for the trigger)
export const commentWorkflow = workflow(
    "new-comment",
    async ({ step, payload }) => {

        // Determine notification type based on payload
        const isReply = (payload as any).isReply === true;
        const isCommentAuthor = (payload as any).isCommentAuthor === true;

        // Step 1: In-App Notification (Real-time bell)
        await step.inApp("in-app-notification", async () => {
            const subject = isReply
                ? isCommentAuthor
                    ? `${payload.authorName} replied to your comment`
                    : `New reply on ${payload.artifactDisplayTitle}`
                : `New comment on ${payload.artifactDisplayTitle}`;

            const body = isReply
                ? `${payload.authorName} replied: "${payload.commentPreview}"`
                : `${payload.authorName} commented: "${payload.commentPreview}"`;

            return {
                subject,
                body,
                avatar: payload.authorAvatarUrl,
                primaryAction: {
                    label: isReply ? "View Reply" : "View Comment",
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

            // Count replies vs comments
            const replyCount = events.filter((e: any) => e.isReply).length;
            const commentCount = count - replyCount;

            let subject: string;
            if (isSingle) {
                subject = isReply
                    ? `${payload.authorName} replied on ${payload.artifactDisplayTitle}`
                    : `New comment from ${payload.authorName} on ${payload.artifactDisplayTitle}`;
            } else {
                const parts = [];
                if (commentCount > 0) parts.push(`${commentCount} comment${commentCount > 1 ? 's' : ''}`);
                if (replyCount > 0) parts.push(`${replyCount} repl${replyCount > 1 ? 'ies' : 'y'}`);
                subject = `${parts.join(' and ')} on ${payload.artifactDisplayTitle}`;
            }

            // Simple HTML list of comments/replies
            const commentsHtml = events.map((e: any) => `
                <div style="margin-bottom: 16px; padding: 12px; border-left: 3px solid #eee;">
                    <strong>${e.authorName}</strong>${e.isReply ? ' replied' : ' commented'}:
                    <p style="margin: 4px 0 0;">${e.commentPreview}</p>
                    <a href="${e.artifactUrl}" style="font-size: 12px; color: #666;">View</a>
                </div>
            `).join("");

            return {
                subject,
                body: `
                  <h1>${isSingle ? (isReply ? "New Reply" : "New Comment") : `${count} New Updates`}</h1>
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
            isReply: z.boolean().optional(),
            isCommentAuthor: z.boolean().optional(),
        }),
    }
);
