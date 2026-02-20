"use node";

/**
 * Novu Bridge - Convex Node.js Action
 *
 * Hosts the Novu workflow bridge as a Convex internal action (Node.js runtime).
 * Uses NovuRequestHandler from @novu/framework with a custom Convex adapter.
 *
 * The httpAction in http.ts serializes the incoming HTTP request and delegates
 * to the handleNovuRequest action here, which runs NovuRequestHandler in Node.js
 * (required for @novu/framework).
 *
 * Email delivery path (unchanged):
 *   Novu calls bridge (Convex renders HTML) -> Novu sends rendered HTML to
 *   /novu-email-webhook (Convex sends via Resend)
 *
 * Task: 00144-move-novu-bridge-to-convex
 */

import { NovuRequestHandler, workflow } from "@novu/framework";
import { z } from "zod";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
// Note: @react-email/render doesn't work in Convex's Node.js bundled runtime
// (react-dom/server fails with "Objects are not valid as a React child" due to
// esbuild bundling issues). Email HTML is generated via template literals instead.

// ============================================================================
// WORKFLOW HELPERS
// ============================================================================

/** Payload schema for the comment notification workflow */
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
export type CommentEvent = CommentPayload;

/** Generate in-app notification subject */
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

/** Generate in-app notification body */
export function generateInAppBody(
  payload: CommentPayload,
  isReply: boolean
): string {
  return isReply
    ? `${payload.authorName} replied: "${payload.commentPreview}"`
    : `${payload.authorName} commented: "${payload.commentPreview}"`;
}

/** Generate in-app notification content */
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

/** Generate email subject for digest */
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
    parts.push(`${commentCount} comment${commentCount > 1 ? "s" : ""}`);
  }
  if (replyCount > 0) {
    parts.push(`${replyCount} repl${replyCount > 1 ? "ies" : "y"}`);
  }
  return `${parts.join(" and ")} on ${payload.artifactDisplayTitle}`;
}

/** Generate email HTML for a single event */
export function generateEventHtml(event: CommentEvent): string {
  return `
    <div style="margin-bottom: 16px; padding: 12px; border-left: 3px solid #e5e7eb; background-color: #f9fafb; border-radius: 0 4px 4px 0;">
      <p style="color: #111827; font-size: 14px; margin: 0 0 4px 0;">
        <strong>${event.authorName}</strong>${event.isReply ? " replied" : " commented"}:
      </p>
      <p style="color: #4b5563; font-size: 14px; margin: 4px 0 8px 0; line-height: 1.4;">${event.commentPreview}</p>
      <a href="${event.artifactUrl}" style="color: #6b7280; font-size: 12px;">View</a>
    </div>`;
}

/** Generate email body content */
export function generateEmailBody(
  events: CommentEvent[],
  payload: CommentPayload,
  isReply: boolean
): string {
  const count = events.length;
  const isSingle = count === 1;
  const commentsHtml = events.map(generateEventHtml).join("");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
<head>
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="x-apple-disable-message-reformatting" />
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 0;">
  <div style="background-color: #ffffff; margin: 0 auto; padding: 32px; max-width: 600px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #111827; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">${isSingle ? (isReply ? "New Reply" : "New Comment") : `${count} New Updates`}</h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
      <strong>${payload.artifactDisplayTitle}</strong> has new activity.
    </p>
    ${commentsHtml}
    <div style="margin: 24px 0;">
      <a href="${payload.artifactUrl}" style="display: inline-block; padding: 12px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
        View Artifact
      </a>
    </div>
    <hr style="border-color: #e5e7eb; margin: 24px 0;" />
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Artifact Review - Collaborative artifact review platform
    </p>
  </div>
</body>
</html>`;
}

/**
 * Get digest interval from environment
 *
 * Format: <number><unit> where unit is s (seconds), m (minutes), or h (hours)
 * Examples: "30s", "2m", "1h"
 *
 * Recommended values:
 *   - Local dev: 30s (fast testing)
 *   - Staging: 2m (verify batching works)
 *   - Production: 20m (real user experience)
 *
 * Default: 10m (10 minutes)
 */
export function getDigestInterval(): {
  amount: number;
  unit: "seconds" | "minutes" | "hours";
} {
  const raw = process.env.NOVU_DIGEST_INTERVAL || "10m";

  const match = raw.match(/^(\d+)(s|m|h)$/i);
  if (!match) {
    console.warn(
      `[Novu] Invalid NOVU_DIGEST_INTERVAL "${raw}", using default 10m`
    );
    return { amount: 10, unit: "minutes" };
  }

  const amount = parseInt(match[1], 10);
  const unitMap = { s: "seconds", m: "minutes", h: "hours" } as const;
  const unit = unitMap[match[2].toLowerCase() as "s" | "m" | "h"];

  return { amount, unit };
}

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export const commentWorkflow = workflow(
  "new-comment",
  async ({ step, payload }) => {
    const isReply = payload.isReply === true;

    // Step 1: In-App Notification (Real-time bell)
    await step.inApp("in-app-notification", async () => {
      return generateInAppContent(payload);
    });

    // Step 2: Digest (Batch notifications)
    const digest = await step.digest("digest-comments", async () => {
      return getDigestInterval();
    });

    // Step 3: Email Notification (Sent after digest finishes)
    // Uses template literal HTML generation (React Email rendering doesn't work
    // in Convex's Node.js bundled runtime due to react-dom/server bundling issues)
    await step.email("email-notification", async () => {
      const events: CommentEvent[] =
        digest.events.length > 0
          ? digest.events.map((e) => ({
              authorName: (e.payload as any).authorName || "Someone",
              commentPreview: (e.payload as any).commentPreview || "",
              artifactUrl: (e.payload as any).artifactUrl || "",
              artifactDisplayTitle: (e.payload as any).artifactDisplayTitle || payload.artifactDisplayTitle,
              isReply: (e.payload as any).isReply === true,
            }))
          : [
              {
                authorName: payload.authorName,
                commentPreview: payload.commentPreview,
                artifactUrl: payload.artifactUrl,
                artifactDisplayTitle: payload.artifactDisplayTitle,
                isReply,
              },
            ];

      const subject = generateEmailSubject(events, payload, isReply);
      const body = generateEmailBody(events, payload, isReply);

      return { subject, body };
    });
  },
  {
    payloadSchema: commentPayloadSchema,
  }
);

// ============================================================================
// CONVEX ADAPTER FOR NOVU REQUEST HANDLER
// ============================================================================

const novuHandler = new NovuRequestHandler({
  frameworkName: "convex",
  workflows: [commentWorkflow],
  handler: (
    method: string,
    url: string,
    headerEntries: [string, string][],
    body: string | null
  ) => {
    const headers = new Map(headerEntries);
    return {
      body: () => (body ? JSON.parse(body) : undefined),
      headers: (key: string) => headers.get(key.toLowerCase()) ?? null,
      method: () => method,
      url: () => new URL(url),
      transformResponse: ({
        status,
        headers: resHeaders,
        body: resBody,
      }: {
        status: number;
        headers: Record<string, string>;
        body: string;
      }) => ({ status, headers: resHeaders, body: resBody }),
    };
  },
}).createHandler();

// ============================================================================
// INTERNAL ACTION - Called by httpAction in http.ts
// ============================================================================

/**
 * Process a Novu bridge request in Node.js runtime.
 *
 * The httpAction in http.ts serializes the HTTP request and calls this action.
 * This runs NovuRequestHandler (which needs Node.js for @novu/framework)
 * and returns the serialized response.
 */
export const handleNovuRequest = internalAction({
  args: {
    method: v.string(),
    url: v.string(),
    headers: v.array(v.array(v.string())),
    body: v.union(v.string(), v.null()),
  },
  returns: v.object({
    status: v.number(),
    headers: v.any(),
    body: v.string(),
  }),
  handler: async (_ctx, args) => {
    const headerEntries = args.headers.map(
      ([k, val]) => [k, val] as [string, string]
    );
    const result = await novuHandler(
      args.method,
      args.url,
      headerEntries,
      args.body
    );
    return result;
  },
});
