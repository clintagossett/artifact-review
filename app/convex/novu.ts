"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Novu } from "@novu/node";

/**
 * Create or update a Novu subscriber.
 * This is called when a user signs up or updates their profile.
 * Novu's identify() is idempotent - it creates or updates the subscriber.
 */
export const createOrUpdateSubscriber = internalAction({
    args: {
        userId: v.id("users"),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const apiKey = process.env.NOVU_SECRET_KEY;
        if (!apiKey) {
            console.warn("Missing NOVU_SECRET_KEY. Skipping subscriber sync.");
            return null;
        }

        const novuOptions = process.env.NOVU_API_URL
            ? { backendUrl: process.env.NOVU_API_URL }
            : undefined;
        const novu = new Novu(apiKey, novuOptions);

        // identify() is idempotent - creates or updates subscriber
        await novu.subscribers.identify(args.userId, {
            email: args.email,
            firstName: args.name,
            avatar: args.avatarUrl,
        });

        return null;
    },
});

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

        const novuOptions = process.env.NOVU_API_URL
            ? { backendUrl: process.env.NOVU_API_URL }
            : undefined;
        const novu = new Novu(apiKey, novuOptions);

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

        const novuOptions = process.env.NOVU_API_URL
            ? { backendUrl: process.env.NOVU_API_URL }
            : undefined;
        const novu = new Novu(apiKey, novuOptions);

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
