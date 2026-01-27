
import { workflow } from "@novu/framework";
import { z } from "zod";

// Payload schema type
export const commentPayloadSchema = z.object({
    artifactDisplayTitle: z.string(),
    authorName: z.string(),
    authorAvatarUrl: z.string().optional(),
    commentPreview: z.string(),
    artifactUrl: z.string(),
    isReply: z.boolean().optional(),
    isCommentAuthor: z.boolean().optional(),
});

export type CommentPayload = z.infer<typeof commentPayloadSchema>;

// Event type for digested events (same shape as payload)
export type CommentEvent = CommentPayload;

/**
 * Generate in-app notification subject
 */
export function generateInAppSubject(
    payload: CommentPayload,
    isReply: boolean,
    isCommentAuthor: boolean
): string {
    return isReply
        ? isCommentAuthor
            ? `${payload.authorName} replied to your comment`
            : `New reply on ${payload.artifactDisplayTitle}`
        : `New comment on ${payload.artifactDisplayTitle}`;
}

/**
 * Generate in-app notification body
 */
export function generateInAppBody(
    payload: CommentPayload,
    isReply: boolean
): string {
    return isReply
        ? `${payload.authorName} replied: "${payload.commentPreview}"`
        : `${payload.authorName} commented: "${payload.commentPreview}"`;
}

/**
 * Generate in-app notification content
 */
export function generateInAppContent(payload: CommentPayload): {
    subject: string;
    body: string;
    avatar: string | undefined;
    primaryAction: { label: string; url: string };
} {
    const isReply = payload.isReply === true;
    const isCommentAuthor = payload.isCommentAuthor === true;

    return {
        subject: generateInAppSubject(payload, isReply, isCommentAuthor),
        body: generateInAppBody(payload, isReply),
        avatar: payload.authorAvatarUrl,
        primaryAction: {
            label: isReply ? "View Reply" : "View Comment",
            url: payload.artifactUrl,
        },
    };
}

/**
 * Generate email digest subject based on events
 */
export function generateEmailSubject(
    events: CommentEvent[],
    payload: CommentPayload,
    isReply: boolean
): string {
    const count = events.length;
    const isSingle = count === 1;
    const replyCount = events.filter((e) => e.isReply).length;
    const commentCount = count - replyCount;

    if (isSingle) {
        return isReply
            ? `${payload.authorName} replied on ${payload.artifactDisplayTitle}`
            : `New comment from ${payload.authorName} on ${payload.artifactDisplayTitle}`;
    }

    const parts: string[] = [];
    if (commentCount > 0) {
        parts.push(`${commentCount} comment${commentCount > 1 ? 's' : ''}`);
    }
    if (replyCount > 0) {
        parts.push(`${replyCount} repl${replyCount > 1 ? 'ies' : 'y'}`);
    }
    return `${parts.join(' and ')} on ${payload.artifactDisplayTitle}`;
}

/**
 * Generate email HTML for a single event
 */
export function generateEventHtml(event: CommentEvent): string {
    return `
        <div style="margin-bottom: 16px; padding: 12px; border-left: 3px solid #eee;">
            <strong>${event.authorName}</strong>${event.isReply ? ' replied' : ' commented'}:
            <p style="margin: 4px 0 0;">${event.commentPreview}</p>
            <a href="${event.artifactUrl}" style="font-size: 12px; color: #666;">View</a>
        </div>
    `;
}

/**
 * Generate email body content
 */
export function generateEmailBody(
    events: CommentEvent[],
    payload: CommentPayload,
    isReply: boolean
): string {
    const count = events.length;
    const isSingle = count === 1;
    const commentsHtml = events.map(generateEventHtml).join("");

    return `
        <h1>${isSingle ? (isReply ? "New Reply" : "New Comment") : `${count} New Updates`}</h1>
        <p>
            <strong>${payload.artifactDisplayTitle}</strong> has new activity.
        </p>

        ${commentsHtml}

        <hr />
        <a href="${payload.artifactUrl}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 4px;">
            View Artifact
        </a>
    `;
}

/**
 * Get digest interval from environment or default
 */
export function getDigestInterval(): { amount: number; unit: "minutes" } {
    const intervalFromEnv = process.env.NOVU_DIGEST_INTERVAL
        ? parseInt(process.env.NOVU_DIGEST_INTERVAL)
        : 10;

    return {
        amount: intervalFromEnv,
        unit: "minutes",
    };
}

// Novu workflow definition (uses the helper functions above)
export const commentWorkflow = workflow(
    "new-comment",
    async ({ step, payload }) => {
        // Determine notification type based on payload
        const isReply = payload.isReply === true;

        // Step 1: In-App Notification (Real-time bell)
        await step.inApp("in-app-notification", async () => {
            return generateInAppContent(payload);
        });

        // Step 2: Digest (Batch updates for 10 minutes)
        const digest = await step.digest("digest-comments", async () => {
            return getDigestInterval();
        });

        // Step 3: Email Notification (Sent after digest finishes)
        await step.email("email-notification", async () => {
            // "digest.events" contains all the triggers that happened during the wait
            const events = digest.events.length > 0 ? digest.events : [payload];

            return {
                subject: generateEmailSubject(events, payload, isReply),
                body: generateEmailBody(events, payload, isReply),
            };
        });
    },
    {
        payloadSchema: commentPayloadSchema,
    }
);
