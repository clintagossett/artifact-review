import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { resend } from "./lib/resend";
import { stripeClient } from "./stripe";
import type Stripe from "stripe";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

auth.addHttpRoutes(http);

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
      await resend.sendEmail(ctx, {
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
 *
 * URL Structure: /artifact/{shareToken}/v{version}/{filePath}
 * Examples:
 * - /artifact/abc123/v1/index.html - Serve HTML content directly
 * - /artifact/abc123/v2/assets/logo.png - Serve file from ZIP storage
 *
 * Note: We use a catch-all pattern because Convex HTTP routes don't support:
 * 1. Mixed literal+parameter segments (e.g., "v{version}")
 * 2. Path parameters that span multiple segments (e.g., {filePath} with slashes)
 */
http.route({
  pathPrefix: "/artifact/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);

    // Parse URL: /artifact/{shareToken}/v{version}/{filePath}
    // Remove "/artifact/" prefix and split remainder
    const pathAfterPrefix = url.pathname.replace(/^\/artifact\//, "");
    const pathSegments = pathAfterPrefix.split("/");

    if (pathSegments.length < 2) {
      return new Response("Invalid artifact URL. Expected: /artifact/{shareToken}/v{version}/{filePath}", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const shareToken = pathSegments[0];
    const versionStr = pathSegments[1]; // e.g., "v1", "v2"
    const filePath = pathSegments.slice(2).join("/") || "index.html";

    try {
      // 1. Validate version format
      const versionMatch = versionStr.match(/^v(\d+)$/);
      if (!versionMatch) {
        return new Response("Invalid version format. Expected v1, v2, etc.", {
          status: 400,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }
      const versionNumber = parseInt(versionMatch[1]);

      // 2. Look up artifact by share token
      const artifact = await ctx.runQuery(
        internal.artifacts.getByShareTokenInternal,
        { shareToken }
      );

      if (!artifact) {
        return new Response("Artifact not found", {
          status: 404,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }

      // 3. Look up specific version
      const version = await ctx.runQuery(
        internal.artifacts.getVersionByNumberInternal,
        {
          artifactId: artifact._id,
          number: versionNumber,
        }
      );

      if (!version) {
        return new Response(
          `Version ${versionNumber} not found for this artifact`,
          {
            status: 404,
            headers: {
              "Content-Type": "text/plain",
            },
          }
        );
      }

      // 4. Unified pattern: Look up file in artifactFiles by path
      // Determine which file to serve
      let filePathToServe = filePath;

      // For single-file artifacts (HTML, Markdown), use entry point if no path specified
      if (!filePath || filePath === "index.html") {
        if (version.entryPoint) {
          filePathToServe = version.entryPoint;
        }
      }

      const decodedPath = decodeURIComponent(filePathToServe);
      const file = await ctx.runQuery(internal.artifacts.getFileByPath, {
        versionId: version._id,
        path: decodedPath,
      });

      if (!file) {
        return new Response(`File not found: ${decodedPath}`, {
          status: 404,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }

      // Fetch file from Convex storage
      const fileUrl = await ctx.storage.getUrl(file.storageId);
      if (!fileUrl) {
        return new Response("File not accessible in storage", {
          status: 500,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }

      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        return new Response("Failed to fetch file from storage", {
          status: 500,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }

      const fileBuffer = await fileResponse.arrayBuffer();

      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": file.mimeType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      console.error("Error serving artifact file:", error);
      return new Response("Internal server error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }
  }),
});


/**
 * Stripe Webhook Handler
 */
http.route({
  path: "/stripe", // Standard endpoint
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("Stripe-Signature");
    if (!signature) {
      return new Response("Missing Signature", { status: 400 });
    }

    const payload = await request.text();
    let event: Stripe.Event;

    try {
      event = await stripeClient.webhooks.constructEventAsync(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error(err);
      return new Response("Webhook Signature Verification Failed", { status: 400 });
    }

    switch (event.type) {
      // 1. Checkout Completed -> Link Org to Customer
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organizationId as Id<"organizations">;
        const customerId = session.customer as string;

        if (organizationId && customerId) {
          await ctx.runMutation(internal.stripe.internalUpdateCustomerId, {
            organizationId,
            customerId
          });
        }
        break;
      }

      // 2. Subscription Updated -> Sync DB
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Find Org by Customer ID
        const org: any = await ctx.runQuery(internal.stripe.internalGetOrganizationByCustomerId, {
          customerId
        });

        if (org) {
          await ctx.runMutation(internal.stripe.internalCreateSubscription, {
            organizationId: org._id,
            priceStripeId: sub.items.data[0].price.id,
            stripeSubscriptionId: sub.id,
            status: sub.status,
            currentPeriodStart: (sub as any).current_period_start * 1000, // Stripe is seconds, we want ms
            currentPeriodEnd: (sub as any).current_period_end * 1000,
            cancelAtPeriodEnd: (sub as any).cancel_at_period_end,
            currency: sub.currency,
            interval: (sub.items.data[0].plan as any).interval,
          });
        }
        break;
      }

      // 3. Subscription Deleted -> Remove from DB
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await ctx.runMutation(internal.stripe.internalDeleteSubscription, {
          stripeSubscriptionId: sub.id
        });
        break;
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
