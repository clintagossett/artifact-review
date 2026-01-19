"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Novu } from "@novu/node";

export const triggerCommentNotification = internalAction({
    args: {
        subscriberId: v.string(),
        artifactDisplayTitle: v.string(),
        artifactUrl: v.string(),
        authorName: v.string(),
        authorAvatarUrl: v.optional(v.string()),
        commentPreview: v.string(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.NOVU_SECRET_KEY;
        if (!apiKey) {
            console.error("Missing NOVU_SECRET_KEY. Skipping notification.");
            return;
        }

        const novu = new Novu(apiKey);

        // We do NOT try/catch here. If this fails (e.g. rate limit, network),
        // we want the Convex Action to fail so the scheduler retries it automatically.
        await novu.trigger("new-comment", {
            to: {
                subscriberId: args.subscriberId,
            },
            payload: {
                artifactDisplayTitle: args.artifactDisplayTitle,
                artifactUrl: args.artifactUrl,
                authorName: args.authorName,
                authorAvatarUrl: args.authorAvatarUrl,
                commentPreview: args.commentPreview,
            },
        });
    },
});

/**
 * Trigger a reply notification via Novu.
 * Notifies the comment author or thread participants when someone replies.
 */
export const triggerReplyNotification = internalAction({
    args: {
        subscriberId: v.string(),
        artifactDisplayTitle: v.string(),
        artifactUrl: v.string(),
        authorName: v.string(),
        authorAvatarUrl: v.optional(v.string()),
        commentPreview: v.string(),
        isCommentAuthor: v.boolean(), // true if recipient is the original comment author
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.NOVU_SECRET_KEY;
        if (!apiKey) {
            console.error("Missing NOVU_SECRET_KEY. Skipping reply notification.");
            return;
        }

        const novu = new Novu(apiKey);

        // Use the same workflow but with a different event context
        // The workflow can use payload.isReply to differentiate messaging
        await novu.trigger("new-comment", {
            to: {
                subscriberId: args.subscriberId,
            },
            payload: {
                artifactDisplayTitle: args.artifactDisplayTitle,
                artifactUrl: args.artifactUrl,
                authorName: args.authorName,
                authorAvatarUrl: args.authorAvatarUrl,
                commentPreview: args.commentPreview,
                isReply: true,
                isCommentAuthor: args.isCommentAuthor,
            },
        });
    },
});
