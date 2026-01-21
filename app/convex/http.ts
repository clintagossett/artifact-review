import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { auth } from "./auth";
import { sendEmail, resend } from "./lib/email";
import { registerRoutes } from "@convex-dev/stripe";

const http = httpRouter();

auth.addHttpRoutes(http);

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
      await ctx.runAction(internal.stripe.internalSyncSubscription, { stripeSubscriptionId: subscription.id });
    },
    // ... other events 
  },
});

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

http.route({
  path: "/send-auth-email",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("Authorization");
    const expectedSecret = `Bearer ${process.env.INTERNAL_API_KEY}`;
    if (authHeader !== expectedSecret) return new Response("Unauthorized", { status: 401 });
    const { email, html, subject } = await req.json();
    if (!email || !html || !subject) return new Response("Missing required fields", { status: 400 });
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

// ============================================================================
// API V1 - AGENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/artifacts
 * Create a new artifact via API Key
 */
http.route({
  path: "/api/v1/artifacts",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const identity = await validateApiKey(ctx, req);
    if (!identity) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    let body;
    try { body = await req.json(); } catch (e) { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }

    const { name, description, fileType, content, organizationId } = body;
    if (!name || !fileType || !content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    let agentName: string | undefined;
    if (identity.agentId) {
      const agent = await ctx.runQuery(internal.agents.getByIdInternal, { id: identity.agentId });
      agentName = agent?.name;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const storageId = await ctx.storage.store(blob);
    const mimeType = fileType === "html" ? "text/html" : "text/markdown";

    try {
      const result = await ctx.runMutation(internal.artifacts.createInternal, {
        userId: identity.userId,
        agentId: identity.agentId,
        agentName: agentName,
        name,
        description,
        fileType,
        path: fileType === "html" ? "index.html" : "README.md",
        storageId: storageId,
        mimeType,
        size: blob.size,
        organizationId: organizationId as any,
      });

      return new Response(JSON.stringify({
        id: result.artifactId,
        shareToken: result.shareToken,
        latestVersionId: result.versionId,
        shareUrl: `https://artifact.review/a/${result.shareToken}`
      }), { status: 201, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }),
});

/**
 * GET /api/v1/artifacts/:shareToken/comments
 * Get comments for an artifact (Agent workflow)
 */
http.route({
  pathPrefix: "/api/v1/artifacts/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    if (parts.length < 6 || parts[5] !== "comments") {
      return new Response("Not found", { status: 404 });
    }
    const shareToken = parts[4];

    const identity = await validateApiKey(ctx, req);
    if (!identity) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const artifact = await ctx.runQuery(internal.artifacts.getByShareTokenInternal, { shareToken });
    if (!artifact) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

    if (artifact.createdBy !== identity.userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const versionId = await ctx.runQuery(internal.agentApi.getLatestVersionId, { artifactId: artifact._id });
    if (!versionId) return new Response(JSON.stringify({ error: "No version found" }), { status: 404 });

    const comments = await ctx.runQuery(internal.agentApi.getComments, { versionId });

    return new Response(JSON.stringify({ comments }), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

export default http;
