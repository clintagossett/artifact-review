import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { auth } from "./auth";
import { sendEmail, resend } from "./lib/email";
import { registerRoutes } from "@convex-dev/stripe";

const http = httpRouter();

auth.addHttpRoutes(http);

// Register Stripe Webhook routes via the component
// This replaces the manual handler and maps to /stripe/webhook
registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    "checkout.session.completed": async (ctx, event) => {
      const session = event.data.object as any;
      const organizationId = session.metadata?.organizationId;
      if (organizationId) {
        await ctx.runMutation(internal.stripe.internalUpdateCustomerId, {
          organizationId: organizationId as any,
          customerId: session.customer as string,
        });
      }
    },
    "customer.subscription.created": async (ctx, event) => {
      const subscription = event.data.object as any;
      await ctx.runAction(internal.stripe.internalSyncSubscription, {
        stripeSubscriptionId: subscription.id,
      });
    },
    "customer.subscription.updated": async (ctx, event) => {
      const subscription = event.data.object as any;
      await ctx.runAction(internal.stripe.internalSyncSubscription, {
        stripeSubscriptionId: subscription.id,
      });
    },
    "customer.subscription.deleted": async (ctx, event) => {
      const subscription = event.data.object as any;
      await ctx.runMutation(internal.stripe.internalDeleteSubscription, {
        stripeSubscriptionId: subscription.id,
      });
    },
  },
});

/**
 * Resend Webhook to receive email status events
 * Route: POST /resend-webhook
 */
http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

/**
 * Internal bridge to send auth emails via the Resend component
 * Required because Auth.js callbacks lack the 'ctx' needed for the component
 * Route: POST /send-auth-email
 */
http.route({
  path: "/send-auth-email",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("Authorization");
    const expectedSecret = `Bearer ${process.env.INTERNAL_API_KEY}`;

    if (authHeader !== expectedSecret) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { email, html, subject } = await req.json();

    if (!email || !html || !subject) {
      return new Response("Missing required fields", { status: 400 });
    }

    try {
      await sendEmail(ctx, {
        to: email,
        subject: subject,
        html: html,
        from: process.env.EMAIL_FROM_AUTH || "Artifact Review <hello@artifactreview-early.xyz>",
      });

      return new Response("Email sent", { status: 200 });
    } catch (error) {
      console.error("Failed to send auth email:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }),
});

/**
 * Serve artifact files via HTTP
 * Pattern: /artifact/*
 */
http.route({
  pathPrefix: "/artifact/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathAfterPrefix = url.pathname.replace(/^\/artifact\//, "");
    const pathSegments = pathAfterPrefix.split("/");

    if (pathSegments.length < 2) {
      return new Response("Invalid artifact URL", { status: 400 });
    }

    const shareToken = pathSegments[0];
    const versionStr = pathSegments[1];
    const filePath = pathSegments.slice(2).join("/") || "index.html";

    try {
      const versionMatch = versionStr.match(/^v(\d+)$/);
      if (!versionMatch) return new Response("Invalid version", { status: 400 });
      const versionNumber = parseInt(versionMatch[1]);

      const artifact = await ctx.runQuery(internal.artifacts.getByShareTokenInternal, { shareToken });
      if (!artifact) return new Response("Not found", { status: 404 });

      const version = await ctx.runQuery(internal.artifacts.getVersionByNumberInternal, {
        artifactId: artifact._id,
        number: versionNumber,
      });
      if (!version) return new Response("Version not found", { status: 404 });

      let filePathToServe = filePath;
      if (!filePath || filePath === "index.html") {
        if (version.entryPoint) filePathToServe = version.entryPoint;
      }

      const decodedPath = decodeURIComponent(filePathToServe);
      const file = await ctx.runQuery(internal.artifacts.getFileByPath, {
        versionId: version._id,
        path: decodedPath,
      });

      if (!file) return new Response("File not found", { status: 404 });

      const fileUrl = await ctx.storage.getUrl(file.storageId);
      if (!fileUrl) return new Response("Storage error", { status: 500 });

      const fileResponse = await fetch(fileUrl);
      const fileBuffer = await fileResponse.arrayBuffer();

      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": file.mimeType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      console.error("Error serving artifact:", error);
      return new Response("Internal error", { status: 500 });
    }
  }),
});

export default http;
