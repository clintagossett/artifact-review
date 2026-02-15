import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { auth } from "./auth";
import { sendEmail, resend } from "./lib/email";
import Stripe from "stripe";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Sanitize a file path to prevent path traversal.
 * Returns null if the path contains traversal sequences.
 */
function sanitizeFilePath(path: string): string | null {
  const parts = path.split("/").filter((p) => p !== "" && p !== ".");
  for (const part of parts) {
    if (part === "..") {
      return null;
    }
  }
  return parts.join("/") || null;
}

/** Standardized JSON error response */
function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Helper to validate API Key
async function validateApiKey(ctx: any, req: Request) {
  const authHeader = req.headers.get("X-API-Key") || req.headers.get("Authorization");
  if (!authHeader) return null;

  let key = authHeader;
  if (key.startsWith("Bearer ")) {
    key = key.substring(7);
  }

  // Expect format: ar_live_prefix...
  if (!key.startsWith("ar_live_")) return null;

  // Extract prefix (ar_live_ + 4 chars = 12 chars total)
  const storedPrefix = key.substring(0, 12);

  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const identity = await ctx.runQuery(internal.apiKeys.validateInternal, {
    prefix: storedPrefix,
    keyHash: keyHash,
  });

  return identity; // { userId, agentId, scopes }
}

/**
 * Require a valid API key. Returns identity or an error Response.
 * Usage: const auth = await requireAuth(ctx, req);
 *        if ("error" in auth) return auth.error;
 *        const { identity } = auth;
 */
async function requireAuth(
  ctx: any,
  req: Request
): Promise<
  | { identity: { userId: any; agentId?: any; scopes: string[] } }
  | { error: Response }
> {
  const identity = await validateApiKey(ctx, req);
  if (!identity) return { error: errorResponse("Unauthorized", 401) };
  return { identity };
}

/**
 * Require that the authenticated user owns the artifact identified by shareToken.
 * Returns the artifact or an error Response.
 * Usage: const result = await requireArtifactOwner(ctx, shareToken, identity.userId);
 *        if ("error" in result) return result.error;
 *        const { artifact } = result;
 */
async function requireArtifactOwner(
  ctx: any,
  shareToken: string,
  userId: any
): Promise<{ artifact: any } | { error: Response }> {
  const artifact = await ctx.runQuery(
    internal.artifacts.getByShareTokenInternal,
    { shareToken }
  );
  if (!artifact) return { error: errorResponse("Not found", 404) };
  if (artifact.createdBy !== userId)
    return { error: errorResponse("Forbidden", 403) };
  return { artifact };
}

// ============================================================================
// STRIPE WEBHOOK - Custom handler with multi-deployment filtering
// See: docs/architecture/decisions/0022-stripe-webhook-multi-deployment-filtering.md
// ============================================================================

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey) {
      console.error("[Stripe] STRIPE_SECRET_KEY not configured");
      return new Response("Stripe not configured", { status: 500 });
    }

    if (!webhookSecret) {
      console.error("[Stripe] STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("[Stripe] No signature in request");
      return new Response("No signature provided", { status: 400 });
    }

    const body = await req.text();
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia" as any,
    });

    // 1. Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("[Stripe] Signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    // 2. FILTER by siteOrigin - before any processing
    const data = event.data.object as any;
    const eventOrigin = data.metadata?.siteOrigin;
    const ourOrigin = process.env.SITE_URL;

    if (eventOrigin && ourOrigin && eventOrigin !== ourOrigin) {
      console.log(`[Stripe] Filtering event for ${eventOrigin} (we are ${ourOrigin})`);
      return new Response(
        JSON.stringify({ received: true, filtered: true, reason: "siteOrigin mismatch" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Stripe] Processing ${event.type} event`);

    // 3. Process events
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const organizationId = session.metadata?.organizationId;
          if (organizationId) {
            await ctx.runMutation(internal.stripe.internalUpdateCustomerId, {
              organizationId: organizationId as any,
              customerId: session.customer as string,
            });
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          await ctx.runAction(internal.stripe.internalSyncSubscription, {
            stripeSubscriptionId: subscription.id,
          });
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await ctx.runMutation(internal.stripe.internalDeleteSubscription, {
            stripeSubscriptionId: subscription.id,
          });
          break;
        }

        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`[Stripe] Invoice paid: ${invoice.id}`);
          // Could trigger notifications, update usage, etc.
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`[Stripe] Invoice payment failed: ${invoice.id}`);
          // Could trigger notifications, suspend access, etc.
          break;
        }

        default:
          console.log(`[Stripe] Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`[Stripe] Error processing ${event.type}:`, error);
      return new Response("Error processing webhook", { status: 500 });
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

// ============================================================================
// NOVU EMAIL WEBHOOK - Renders React Email templates and sends via Resend
// Novu orchestrates workflow (digest, preferences), we handle email rendering
// ============================================================================

http.route({
  path: "/novu-email-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const webhookSecret = process.env.NOVU_EMAIL_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[Novu Email] NOVU_EMAIL_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Verify HMAC SHA-256 signature from x-novu-signature header
    const signature = req.headers.get("x-novu-signature");
    if (!signature) {
      console.error("[Novu Email] No signature in request");
      return new Response("No signature provided", { status: 400 });
    }

    const body = await req.text();

    // Compute expected signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Compare signatures (timing-safe comparison)
    if (signature !== expectedSignature) {
      console.error("[Novu Email] Signature verification failed");
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse and process payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      console.error("[Novu Email] Invalid JSON payload");
      return new Response("Invalid JSON", { status: 400 });
    }

    console.log(`[Novu Email] Processing webhook for ${payload.subscriber?.email || "unknown"}`);

    try {
      await ctx.runAction(internal.novuEmailWebhook.processEmailWebhook, {
        payload,
      });

      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("[Novu Email] Error processing webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }),
});

http.route({
  path: "/send-auth-email",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("Authorization");
    const expectedSecret = `Bearer ${process.env.INTERNAL_API_KEY}`;
    if (authHeader !== expectedSecret) return errorResponse("Unauthorized", 401);
    const { email, html, subject } = await req.json();
    if (!email || !html || !subject) return errorResponse("Missing required fields", 400);
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
      return errorResponse("Internal Server Error", 500);
    }
  }),
});

http.route({
  pathPrefix: "/artifact/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathAfterPrefix = url.pathname.replace(/^\/artifact\//, "");
    const parts = pathAfterPrefix.split("/");
    const shareToken = parts[0];
    const versionStr = parts[1];
    const filePath = parts.slice(2).join("/") || "index.html";
    try {
      const versionMatch = versionStr?.match(/^v(\d+)$/);
      if (!versionMatch) return errorResponse("Invalid version", 400);
      const versionNumber = parseInt(versionMatch[1]);
      const artifact = await ctx.runQuery(internal.artifacts.getByShareTokenInternal, { shareToken });
      if (!artifact) return errorResponse("Not found", 404);
      const version = await ctx.runQuery(internal.artifacts.getVersionByNumberInternal, {
        artifactId: artifact._id,
        number: versionNumber,
      });
      if (!version) return errorResponse("Version not found", 404);
      let filePathToServe = filePath;
      if (!filePath || filePath === "index.html") {
        if (version.entryPoint) filePathToServe = version.entryPoint;
      }
      const decodedPath = decodeURIComponent(filePathToServe);
      const safePath = sanitizeFilePath(decodedPath);
      if (!safePath) return errorResponse("Invalid path", 400);
      const file = await ctx.runQuery(internal.artifacts.getFileByPath, {
        versionId: version._id,
        path: safePath,
      });
      if (!file) return errorResponse("File not found", 404);
      const fileUrl = await ctx.storage.getUrl(file.storageId);
      if (!fileUrl) return errorResponse("Storage error", 500);
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
      return errorResponse("Internal error", 500);
    }
  }),
});

// ============================================================================
// API V1 - AGENT ENDPOINTS
// ============================================================================

import { OPENAPI_SPEC } from "./lib/openapi";

/**
 * GET /api/v1/openapi.yaml
 * Protected Documentation
 */
http.route({
  path: "/api/v1/openapi.yaml",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const auth = await requireAuth(ctx, req);
    if ("error" in auth) return auth.error;

    return new Response(OPENAPI_SPEC, {
      status: 200,
      headers: {
        "Content-Type": "text/yaml",
        "Cache-Control": "no-cache"
      }
    });
  }),
});

/**
 * POST /api/v1/artifacts
 * Create a new artifact via API Key
 */
http.route({
  path: "/api/v1/artifacts",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const auth = await requireAuth(ctx, req);
    if ("error" in auth) return auth.error;
    const { identity } = auth;

    let body;
    try { body = await req.json(); } catch (e) { return errorResponse("Invalid JSON", 400); }

    const { name, description, fileType, content, organizationId } = body;
    if (!name || !fileType || !content) {
      return errorResponse("Missing required fields", 400);
    }

    let blob: Blob;
    let mimeType: string;
    let entryPoint: string;

    if (fileType === "zip") {
      try {
        const binaryString = atob(content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: "application/zip" });
        mimeType = "application/zip";
        entryPoint = "index.html"; // Will be updated by processor
      } catch (e) {
        return errorResponse("Invalid Base64 content for ZIP", 400);
      }
    } else {
      blob = new Blob([content], { type: "text/plain" });
      mimeType = fileType === "html" ? "text/html" : "text/markdown";
      entryPoint = fileType === "html" ? "index.html" : "README.md";
    }

    const storageId = await ctx.storage.store(blob);

    try {
      const result = await ctx.runMutation(internal.artifacts.createInternal, {
        userId: identity.userId,
        agentId: identity.agentId,
        name,
        description,
        fileType,
        path: entryPoint,
        storageId: storageId,
        mimeType,
        size: blob.size,
        organizationId: organizationId as any,
      });

      if (fileType === "zip") {
        // Trigger extraction
        await ctx.runAction(internal.zipProcessor.processZipFile, {
          versionId: result.versionId,
          storageId: storageId,
        });
      }

      return new Response(JSON.stringify({
        id: result.artifactId,
        shareToken: result.shareToken,
        latestVersionId: result.versionId,
        shareUrl: `https://artifact.review/a/${result.shareToken}`
      }), { status: 201, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return errorResponse(e.message, 500);
    }
  }),
});

/* Comments GET/POST handlers merged into consolidated route handlers below */

/**
 * POST /api/v1/comments/:commentId/replies
 * Create a reply
 */
http.route({
  pathPrefix: "/api/v1/comments/",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    // Expect: /api/v1/comments/:commentId/replies
    const match = path.match(/\/api\/v1\/comments\/([^\/]+)\/replies$/);
    if (!match) return errorResponse("Not found", 404);

    const commentId = match[1] as any; // Cast to Id

    const auth = await requireAuth(ctx, req);
    if ("error" in auth) return auth.error;
    const { identity } = auth;

    let body;
    try { body = await req.json(); } catch (e) { return errorResponse("Invalid JSON", 400); }

    if (!body.content) return errorResponse("Missing content", 400);

    try {
      const replyId = await ctx.runMutation(internal.agentApi.createReply, {
        commentId,
        content: body.content,
        agentId: identity.agentId,
        userId: identity.userId,
      });

      return new Response(JSON.stringify({ id: replyId }), { status: 201, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return errorResponse(e.message, 500); // e.g. Comment not found
    }
  }),
});

/**
 * PATCH /api/v1/comments/:commentId
 * Update comment status
 */
/**
 * PATCH /api/v1/comments/:commentId
 * Update comment status or content
 */
http.route({
  pathPrefix: "/api/v1/comments/",
  method: "PATCH",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const match = cleanPath.match(/\/api\/v1\/comments\/([^\/]+)$/);
    if (!match) return errorResponse("Not found", 404);

    const commentId = match[1] as any;

    const auth = await requireAuth(ctx, req);
    if ("error" in auth) return auth.error;
    const { identity } = auth;

    let body;
    try { body = await req.json(); } catch (e) { return errorResponse("Invalid JSON", 400); }

    if (body.content === undefined && body.resolved === undefined) {
      return errorResponse("No fields to update (content or resolved)", 400);
    }

    try {
      if (body.content !== undefined) {
        await ctx.runMutation(internal.agentApi.editComment, {
          commentId,
          content: body.content,
          userId: identity.userId,
        });
      }

      if (body.resolved !== undefined) {
        if (typeof body.resolved !== "boolean") return errorResponse("Invalid 'resolved' boolean", 400);
        await ctx.runMutation(internal.agentApi.updateCommentStatus, {
          commentId,
          resolved: body.resolved,
          userId: identity.userId,
        });
      }

      return new Response(JSON.stringify({ status: "updated" }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return errorResponse(e.message, 500);
    }
  }),
});

/**
 * DELETE /api/v1/comments/:commentId
 * Soft delete comment
 */
http.route({
  pathPrefix: "/api/v1/comments/",
  method: "DELETE",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const match = cleanPath.match(/\/api\/v1\/comments\/([^\/]+)$/);
    if (!match) return errorResponse("Not found", 404);

    const commentId = match[1] as any;

    const auth = await requireAuth(ctx, req);
    if ("error" in auth) return auth.error;
    const { identity } = auth;

    try {
      await ctx.runMutation(internal.agentApi.deleteComment, {
        commentId,
        userId: identity.userId,
      });
      return new Response(JSON.stringify({ status: "deleted" }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return errorResponse(e.message, 500);
    }
  }),
});

/**
 * PATCH /api/v1/replies/:replyId
 * Update reply content
 */
http.route({
  pathPrefix: "/api/v1/replies/",
  method: "PATCH",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const match = cleanPath.match(/\/api\/v1\/replies\/([^\/]+)$/);
    if (!match) return errorResponse("Not found", 404);

    const replyId = match[1] as any;

    const auth = await requireAuth(ctx, req);
    if ("error" in auth) return auth.error;
    const { identity } = auth;

    let body;
    try { body = await req.json(); } catch (e) { return errorResponse("Invalid JSON", 400); }

    if (!body.content) return errorResponse("Missing content", 400);

    try {
      await ctx.runMutation(internal.agentApi.editReply, {
        replyId,
        content: body.content,
        userId: identity.userId,
      });
      return new Response(JSON.stringify({ status: "updated" }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return errorResponse(e.message, 500);
    }
  }),
});

/**
 * DELETE /api/v1/replies/:replyId
 * Soft delete reply
 */
http.route({
  pathPrefix: "/api/v1/replies/",
  method: "DELETE",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const match = cleanPath.match(/\/api\/v1\/replies\/([^\/]+)$/);
    if (!match) return errorResponse("Not found", 404);

    const replyId = match[1] as any;

    const auth = await requireAuth(ctx, req);
    if ("error" in auth) return auth.error;
    const { identity } = auth;

    try {
      await ctx.runMutation(internal.agentApi.deleteReply, {
        replyId,
        userId: identity.userId,
      });
      return new Response(JSON.stringify({ status: "deleted" }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return errorResponse(e.message, 500);
    }
  }),
});

// ============================================================================
// API V1 - SHARING & ACCESS MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/artifacts
 * List all artifacts for the authenticated user
 */
http.route({
  path: "/api/v1/artifacts",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const auth = await requireAuth(ctx, req);
    if ("error" in auth) return auth.error;
    const { identity } = auth;

    try {
      const artifacts = await ctx.runQuery(internal.agentApi.listArtifacts, {
        userId: identity.userId,
      });

      return new Response(JSON.stringify({ artifacts }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return errorResponse(e.message, 500);
    }
  }),
});

/**
 * GET /api/v1/artifacts/:shareToken/sharelink
 * Get share link settings
 */
http.route({
  pathPrefix: "/api/v1/artifacts/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const parts = url.pathname.split("/");

    // All sub-routes require auth + owner verification
    if (parts.length === 6 && ["sharelink", "access", "stats", "versions"].includes(parts[5])) {
      const shareToken = parts[4];

      const auth = await requireAuth(ctx, req);
      if ("error" in auth) return auth.error;
      const { identity } = auth;

      const ownerCheck = await requireArtifactOwner(ctx, shareToken, identity.userId);
      if ("error" in ownerCheck) return ownerCheck.error;
      const { artifact } = ownerCheck;

      // Route: /api/v1/artifacts/:shareToken/versions
      if (parts[5] === "versions") {
        try {
          const versions = await ctx.runQuery(internal.agentApi.listVersionsInternal, {
            artifactId: artifact._id,
          });

          return new Response(JSON.stringify({ versions }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } catch (e: any) {
          return errorResponse(e.message, 500);
        }
      }

      // Route: /api/v1/artifacts/:shareToken/sharelink
      if (parts[5] === "sharelink") {
        const shareLink = await ctx.runQuery(internal.agentApi.getShareLink, {
          artifactId: artifact._id,
        });

        if (!shareLink) {
          return errorResponse("No share link exists", 404);
        }

        return new Response(JSON.stringify(shareLink), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Route: /api/v1/artifacts/:shareToken/access
      if (parts[5] === "access") {
        const access = await ctx.runQuery(internal.agentApi.listAccess, {
          artifactId: artifact._id,
        });

        return new Response(JSON.stringify({ access }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Route: /api/v1/artifacts/:shareToken/stats
      if (parts[5] === "stats") {
        try {
          const stats = await ctx.runQuery(internal.agentApi.getStats, {
            artifactId: artifact._id,
          });

          return new Response(JSON.stringify(stats), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } catch (e: any) {
          return errorResponse(e.message, 500);
        }
      }
    }

    // Route: /api/v1/artifacts/:shareToken/comments
    if (parts.length >= 6 && parts[5] === "comments") {
      const shareToken = parts[4];
      const versionParam = url.searchParams.get("version");

      const auth = await requireAuth(ctx, req);
      if ("error" in auth) return auth.error;
      const { identity } = auth;

      const ownerCheck = await requireArtifactOwner(ctx, shareToken, identity.userId);
      if ("error" in ownerCheck) return ownerCheck.error;
      const { artifact } = ownerCheck;

      let versionId: any;
      let versionNumber: number;

      if (versionParam) {
        const match = versionParam.match(/^v(\d+)$/);
        if (!match) return errorResponse("Invalid version format (use v1, v2)", 400);
        const number = parseInt(match[1]);
        const version = await ctx.runQuery(internal.artifacts.getVersionByNumberInternal, {
          artifactId: artifact._id,
          number
        });
        if (!version) return errorResponse("Version not found", 404);
        versionId = version._id;
        versionNumber = version.number;
      } else {
        const version = await ctx.runQuery(internal.agentApi.getLatestVersion, { artifactId: artifact._id });
        if (!version) return errorResponse("No version found", 404);
        versionId = version._id;
        versionNumber = version.number;
      }

      const comments = await ctx.runQuery(internal.agentApi.getComments, { versionId });

      return new Response(JSON.stringify({
        version: `v${versionNumber}`,
        comments
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    return errorResponse("Not found", 404);
  }),
});

/**
 * POST /api/v1/artifacts/:shareToken/sharelink
 * Create a share link
 */
http.route({
  pathPrefix: "/api/v1/artifacts/",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const parts = url.pathname.split("/");

    // Route: /api/v1/artifacts/:shareToken/versions/{n}/restore (POST)
    if (parts.length === 8 && parts[5] === "versions" && parts[7] === "restore") {
      const shareToken = parts[4];
      const versionNumber = parseInt(parts[6]);

      if (isNaN(versionNumber) || versionNumber < 1) {
        return errorResponse("Invalid version number", 400);
      }

      const auth = await requireAuth(ctx, req);
      if ("error" in auth) return auth.error;
      const { identity } = auth;

      const ownerCheck = await requireArtifactOwner(ctx, shareToken, identity.userId);
      if ("error" in ownerCheck) return ownerCheck.error;
      const { artifact } = ownerCheck;

      try {
        await ctx.runMutation(internal.agentApi.restoreVersionInternal, {
          artifactId: artifact._id,
          number: versionNumber,
        });

        return new Response(JSON.stringify({ status: "restored" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (e: any) {
        return errorResponse(e.message, 400);
      }
    }

    // Route: /api/v1/artifacts/:shareToken/versions (POST - create new version)
    if (parts.length === 6 && parts[5] === "versions") {
      const shareToken = parts[4];

      const auth = await requireAuth(ctx, req);
      if ("error" in auth) return auth.error;
      const { identity } = auth;

      const ownerCheck = await requireArtifactOwner(ctx, shareToken, identity.userId);
      if ("error" in ownerCheck) return ownerCheck.error;
      const { artifact } = ownerCheck;

      let body;
      try { body = await req.json(); } catch (e) { return errorResponse("Invalid JSON", 400); }

      const { fileType, content, name } = body;
      if (!fileType || !content) {
        return errorResponse("Missing required fields: fileType, content", 400);
      }

      let blob: Blob;
      let mimeType: string;
      let entryPoint: string;

      if (fileType === "zip") {
        try {
          const binaryString = atob(content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: "application/zip" });
          mimeType = "application/zip";
          entryPoint = "index.html";
        } catch (e) {
          return errorResponse("Invalid Base64 content for ZIP", 400);
        }
      } else {
        blob = new Blob([content], { type: "text/plain" });
        mimeType = fileType === "html" ? "text/html" : "text/markdown";
        entryPoint = fileType === "html" ? "index.html" : "README.md";
      }

      const storageId = await ctx.storage.store(blob);

      try {
        const result = await ctx.runMutation(internal.artifacts.addVersionInternal, {
          userId: identity.userId,
          artifactId: artifact._id,
          fileType,
          name,
          filePath: entryPoint,
          storageId,
          mimeType,
          size: blob.size,
          agentId: identity.agentId,
        });

        if (fileType === "zip") {
          await ctx.runAction(internal.zipProcessor.processZipFile, {
            versionId: result.versionId,
            storageId,
          });
        }

        return new Response(JSON.stringify({
          versionId: result.versionId,
          number: result.number,
          status: "created",
        }), { status: 201, headers: { "Content-Type": "application/json" } });
      } catch (e: any) {
        return errorResponse(e.message, 500);
      }
    }

    // Routes requiring auth + ownership (sharelink, access)
    if (parts.length === 6 && ["sharelink", "access"].includes(parts[5])) {
      const shareToken = parts[4];

      const auth = await requireAuth(ctx, req);
      if ("error" in auth) return auth.error;
      const { identity } = auth;

      const ownerCheck = await requireArtifactOwner(ctx, shareToken, identity.userId);
      if ("error" in ownerCheck) return ownerCheck.error;
      const { artifact } = ownerCheck;

      // Route: /api/v1/artifacts/:shareToken/sharelink
      if (parts[5] === "sharelink") {
        let body: any = {};
        try {
          body = await req.json();
        } catch (e) {
          // Empty body is OK for create
        }

        try {
          const result = await ctx.runMutation(internal.agentApi.createShareLink, {
            artifactId: artifact._id,
            userId: identity.userId,
            enabled: body.enabled,
            capabilities: body.capabilities,
          });

          return new Response(JSON.stringify(result), {
            status: 201,
            headers: { "Content-Type": "application/json" }
          });
        } catch (e: any) {
          return errorResponse(e.message, 500);
        }
      }

      // Route: /api/v1/artifacts/:shareToken/access
      if (parts[5] === "access") {
        let body;
        try {
          body = await req.json();
        } catch (e) {
          return errorResponse("Invalid JSON", 400);
        }

        if (!body.email) {
          return errorResponse("Missing required field: email", 400);
        }

        try {
          const accessId = await ctx.runMutation(internal.agentApi.grantAccess, {
            artifactId: artifact._id,
            userId: identity.userId,
            email: body.email,
          });

          return new Response(JSON.stringify({ id: accessId, status: "created" }), {
            status: 201,
            headers: { "Content-Type": "application/json" }
          });
        } catch (e: any) {
          return errorResponse(e.message, 500);
        }
      }
    }

    // Route: /api/v1/artifacts/:shareToken/comments
    if (parts.length >= 6 && parts[5] === "comments") {
      const shareToken = parts[4];
      const versionParam = url.searchParams.get("version");

      const auth = await requireAuth(ctx, req);
      if ("error" in auth) return auth.error;
      const { identity } = auth;

      let body;
      try { body = await req.json(); } catch (e) { return errorResponse("Invalid JSON", 400); }

      const { content, target } = body;
      if (!content || !target || !target.selector) {
        return errorResponse("Missing required fields (content, target.selector)", 400);
      }

      const ownerCheck = await requireArtifactOwner(ctx, shareToken, identity.userId);
      if ("error" in ownerCheck) return ownerCheck.error;
      const { artifact } = ownerCheck;

      let versionId: any;

      if (versionParam) {
        const match = versionParam.match(/^v(\d+)$/);
        if (!match) return errorResponse("Invalid version format (use v1, v2)", 400);
        const number = parseInt(match[1]);
        const version = await ctx.runQuery(internal.artifacts.getVersionByNumberInternal, {
          artifactId: artifact._id,
          number
        });
        if (!version) return errorResponse("Version not found", 404);
        versionId = version._id;
      } else {
        const version = await ctx.runQuery(internal.agentApi.getLatestVersion, { artifactId: artifact._id });
        if (!version) return errorResponse("No version found", 404);
        versionId = version._id;
      }

      const commentId = await ctx.runMutation(internal.agentApi.createComment, {
        versionId,
        content,
        target,
        agentId: identity.agentId,
        userId: identity.userId,
      });

      return new Response(JSON.stringify({ id: commentId, status: "created" }), { status: 201, headers: { "Content-Type": "application/json" } });
    }

    return errorResponse("Not found", 404);
  }),
});

/**
 * PATCH /api/v1/artifacts/:shareToken/sharelink
 * Update share link settings
 */
http.route({
  pathPrefix: "/api/v1/artifacts/",
  method: "PATCH",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const parts = url.pathname.split("/");

    // Route: /api/v1/artifacts/:shareToken/versions/{n}
    if (parts.length === 7 && parts[5] === "versions") {
      const shareToken = parts[4];
      const versionNumber = parseInt(parts[6]);

      if (isNaN(versionNumber) || versionNumber < 1) {
        return errorResponse("Invalid version number", 400);
      }

      const auth = await requireAuth(ctx, req);
      if ("error" in auth) return auth.error;
      const { identity } = auth;

      let body;
      try {
        body = await req.json();
      } catch (e) {
        return errorResponse("Invalid JSON", 400);
      }

      if (body.name === undefined) {
        return errorResponse("Missing required field: name", 400);
      }

      const ownerCheck = await requireArtifactOwner(ctx, shareToken, identity.userId);
      if ("error" in ownerCheck) return ownerCheck.error;
      const { artifact } = ownerCheck;

      try {
        await ctx.runMutation(internal.agentApi.updateVersionNameInternal, {
          artifactId: artifact._id,
          number: versionNumber,
          name: body.name,
        });

        return new Response(JSON.stringify({ status: "updated" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (e: any) {
        return errorResponse(e.message, 400);
      }
    }

    // Route: /api/v1/artifacts/:shareToken/sharelink
    if (parts.length === 6 && parts[5] === "sharelink") {
      const shareToken = parts[4];

      const auth = await requireAuth(ctx, req);
      if ("error" in auth) return auth.error;
      const { identity } = auth;

      let body;
      try {
        body = await req.json();
      } catch (e) {
        return errorResponse("Invalid JSON", 400);
      }

      const ownerCheck = await requireArtifactOwner(ctx, shareToken, identity.userId);
      if ("error" in ownerCheck) return ownerCheck.error;
      const { artifact } = ownerCheck;

      try {
        const result = await ctx.runMutation(internal.agentApi.updateShareLink, {
          artifactId: artifact._id,
          userId: identity.userId,
          enabled: body.enabled,
          capabilities: body.capabilities,
        });

        if (!result) {
          return errorResponse("No share link exists", 404);
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (e: any) {
        return errorResponse(e.message, 500);
      }
    }

    return errorResponse("Not found", 404);
  }),
});

/**
 * DELETE /api/v1/artifacts/:shareToken/sharelink
 * DELETE /api/v1/artifacts/:shareToken/access/:accessId
 */
http.route({
  pathPrefix: "/api/v1/artifacts/",
  method: "DELETE",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const parts = cleanPath.split("/");

    // All sub-routes require auth + owner
    const shareToken = parts[4];

    const auth = await requireAuth(ctx, req);
    if ("error" in auth) return auth.error;
    const { identity } = auth;

    const ownerCheck = await requireArtifactOwner(ctx, shareToken, identity.userId);
    if ("error" in ownerCheck) return ownerCheck.error;
    const { artifact } = ownerCheck;

    // Route: /api/v1/artifacts/:shareToken/versions/{n}
    if (parts.length === 7 && parts[5] === "versions") {
      const versionNumber = parseInt(parts[6]);

      if (isNaN(versionNumber) || versionNumber < 1) {
        return errorResponse("Invalid version number", 400);
      }

      try {
        await ctx.runMutation(internal.agentApi.softDeleteVersionInternal, {
          artifactId: artifact._id,
          number: versionNumber,
          userId: identity.userId,
        });

        return new Response(JSON.stringify({ status: "deleted" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (e: any) {
        return errorResponse(e.message, 400);
      }
    }

    // Route: /api/v1/artifacts/:shareToken/sharelink
    if (parts.length === 6 && parts[5] === "sharelink") {
      try {
        const deleted = await ctx.runMutation(internal.agentApi.deleteShareLink, {
          artifactId: artifact._id,
          userId: identity.userId,
        });

        if (!deleted) {
          return errorResponse("No share link exists", 404);
        }

        return new Response(JSON.stringify({ status: "deleted" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (e: any) {
        return errorResponse(e.message, 500);
      }
    }

    // Route: /api/v1/artifacts/:shareToken/access/:accessId
    if (parts.length === 7 && parts[5] === "access") {
      const accessId = parts[6] as any;

      try {
        const revoked = await ctx.runMutation(internal.agentApi.revokeAccess, {
          accessId,
          userId: identity.userId,
        });

        if (!revoked) {
          return errorResponse("Access record not found", 404);
        }

        return new Response(JSON.stringify({ status: "deleted" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (e: any) {
        return errorResponse(e.message, 500);
      }
    }

    return errorResponse("Not found", 404);
  }),
});

export default http;
