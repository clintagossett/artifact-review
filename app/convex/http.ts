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

import { OPENAPI_SPEC } from "./lib/openapi";

/**
 * GET /api/v1/openapi.yaml
 * Protected Documentation
 */
http.route({
  path: "/api/v1/openapi.yaml",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const identity = await validateApiKey(ctx, req);
    if (!identity) return new Response("Unauthorized", { status: 401 });

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
        return new Response(JSON.stringify({ error: "Invalid Base64 content for ZIP" }), { status: 400 });
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
        agentName: agentName,
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
    // Expect: /api/v1/artifacts/:shareToken/comments
    if (parts.length < 6 || parts[5] !== "comments") {
      return new Response("Not found", { status: 404 });
    }
    const shareToken = parts[4];
    const versionParam = url.searchParams.get("version");

    const identity = await validateApiKey(ctx, req);
    if (!identity) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const artifact = await ctx.runQuery(internal.artifacts.getByShareTokenInternal, { shareToken });
    if (!artifact) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

    if (artifact.createdBy !== identity.userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    let versionId: any;
    let versionNumber: number;

    if (versionParam) {
      const match = versionParam.match(/^v(\d+)$/);
      if (!match) return new Response(JSON.stringify({ error: "Invalid version format (use v1, v2)" }), { status: 400 });
      const number = parseInt(match[1]);
      const version = await ctx.runQuery(internal.artifacts.getVersionByNumberInternal, {
        artifactId: artifact._id,
        number
      });
      if (!version) return new Response(JSON.stringify({ error: "Version not found" }), { status: 404 });
      versionId = version._id;
      versionNumber = version.number;
    } else {
      const version = await ctx.runQuery(internal.agentApi.getLatestVersion, { artifactId: artifact._id });
      if (!version) return new Response(JSON.stringify({ error: "No version found" }), { status: 404 });
      versionId = version._id;
      versionNumber = version.number;
    }

    const comments = await ctx.runQuery(internal.agentApi.getComments, { versionId });

    return new Response(JSON.stringify({
      version: `v${versionNumber}`,
      comments
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

/**
 * POST /api/v1/artifacts/:shareToken/comments
 * Create a comment on an artifact
 */
http.route({
  pathPrefix: "/api/v1/artifacts/",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    // Expect: /api/v1/artifacts/:shareToken/comments
    if (parts.length < 6 || parts[5] !== "comments") {
      return new Response("Not found", { status: 404 });
    }
    const shareToken = parts[4];
    const versionParam = url.searchParams.get("version");

    const identity = await validateApiKey(ctx, req);
    if (!identity) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    let body;
    try { body = await req.json(); } catch (e) { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }

    const { content, target } = body;
    if (!content || !target || !target.selector) {
      return new Response(JSON.stringify({ error: "Missing required fields (content, target.selector)" }), { status: 400 });
    }

    const artifact = await ctx.runQuery(internal.artifacts.getByShareTokenInternal, { shareToken });
    if (!artifact) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

    if (artifact.createdBy !== identity.userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    let versionId: any;

    if (versionParam) {
      const match = versionParam.match(/^v(\d+)$/);
      if (!match) return new Response(JSON.stringify({ error: "Invalid version format (use v1, v2)" }), { status: 400 });
      const number = parseInt(match[1]);
      const version = await ctx.runQuery(internal.artifacts.getVersionByNumberInternal, {
        artifactId: artifact._id,
        number
      });
      if (!version) return new Response(JSON.stringify({ error: "Version not found" }), { status: 404 });
      versionId = version._id;
    } else {
      const version = await ctx.runQuery(internal.agentApi.getLatestVersion, { artifactId: artifact._id });
      if (!version) return new Response(JSON.stringify({ error: "No version found" }), { status: 404 });
      versionId = version._id;
    }

    let agentName: string | undefined;
    if (identity.agentId) {
      const agent = await ctx.runQuery(internal.agents.getByIdInternal, { id: identity.agentId });
      agentName = agent?.name;
    }

    const commentId = await ctx.runMutation(internal.agentApi.createComment, {
      versionId,
      content,
      target,
      agentId: identity.agentId,
      agentName,
      userId: identity.userId,
    });

    return new Response(JSON.stringify({ id: commentId, status: "created" }), { status: 201, headers: { "Content-Type": "application/json" } });
  }),
});

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
    if (!match) return new Response("Not found", { status: 404 });

    const commentId = match[1] as any; // Cast to Id

    const identity = await validateApiKey(ctx, req);
    if (!identity) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    let body;
    try { body = await req.json(); } catch (e) { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }

    if (!body.content) return new Response(JSON.stringify({ error: "Missing content" }), { status: 400 });

    let agentName: string | undefined;
    if (identity.agentId) {
      const agent = await ctx.runQuery(internal.agents.getByIdInternal, { id: identity.agentId });
      agentName = agent?.name;
    }

    try {
      const replyId = await ctx.runMutation(internal.agentApi.createReply, {
        commentId,
        content: body.content,
        agentId: identity.agentId,
        agentName,
        userId: identity.userId,
      });

      return new Response(JSON.stringify({ id: replyId }), { status: 201, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 }); // e.g. Comment not found
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
    if (!match) return new Response("Not found", { status: 404 });

    const commentId = match[1] as any;

    const identity = await validateApiKey(ctx, req);
    if (!identity) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    let body;
    try { body = await req.json(); } catch (e) { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }

    if (body.content === undefined && body.resolved === undefined) {
      return new Response(JSON.stringify({ error: "No fields to update (content or resolved)" }), { status: 400 });
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
        if (typeof body.resolved !== "boolean") return new Response(JSON.stringify({ error: "Invalid 'resolved' boolean" }), { status: 400 });
        await ctx.runMutation(internal.agentApi.updateCommentStatus, {
          commentId,
          resolved: body.resolved,
          userId: identity.userId,
        });
      }

      return new Response(JSON.stringify({ status: "updated" }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
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
    if (!match) return new Response("Not found", { status: 404 });

    const commentId = match[1] as any;

    const identity = await validateApiKey(ctx, req);
    if (!identity) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    try {
      await ctx.runMutation(internal.agentApi.deleteComment, {
        commentId,
        userId: identity.userId,
      });
      return new Response(JSON.stringify({ status: "deleted" }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
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
    if (!match) return new Response("Not found", { status: 404 });

    const replyId = match[1] as any;

    const identity = await validateApiKey(ctx, req);
    if (!identity) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    let body;
    try { body = await req.json(); } catch (e) { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }

    if (!body.content) return new Response(JSON.stringify({ error: "Missing content" }), { status: 400 });

    try {
      await ctx.runMutation(internal.agentApi.editReply, {
        replyId,
        content: body.content,
        userId: identity.userId,
      });
      return new Response(JSON.stringify({ status: "updated" }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
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
    if (!match) return new Response("Not found", { status: 404 });

    const replyId = match[1] as any;

    const identity = await validateApiKey(ctx, req);
    if (!identity) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    try {
      await ctx.runMutation(internal.agentApi.deleteReply, {
        replyId,
        userId: identity.userId,
      });
      return new Response(JSON.stringify({ status: "deleted" }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }),
});

// ============================================================================
// DIAGNOSTIC ENDPOINTS - Test networking from V8 and Node actions
// ============================================================================

/**
 * GET /debug/network-test
 * Tests network paths from V8 runtime (HTTP action)
 */
http.route({
  path: "/debug/network-test",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      runtime: "v8",
      tests: {},
    };

    // Test 1: Can V8 reach localhost:3211?
    try {
      const start = Date.now();
      const resp = await fetch("http://localhost:3211/version");
      results.tests["v8_localhost_3211"] = {
        success: resp.ok,
        status: resp.status,
        body: await resp.text(),
        ms: Date.now() - start,
      };
    } catch (e: any) {
      results.tests["v8_localhost_3211"] = { success: false, error: e.message };
    }

    // Test 2: Can V8 reach the .loc domain?
    try {
      const start = Date.now();
      const resp = await fetch("http://mark.convex.site.loc/version");
      results.tests["v8_loc_domain"] = {
        success: resp.ok,
        status: resp.status,
        body: await resp.text(),
        ms: Date.now() - start,
      };
    } catch (e: any) {
      results.tests["v8_loc_domain"] = { success: false, error: e.message };
    }

    // Environment variables
    results.env = {
      CONVEX_CLOUD_URL: process.env.CONVEX_CLOUD_URL || "(not set)",
      CONVEX_SITE_URL: process.env.CONVEX_SITE_URL || "(not set)",
    };

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * GET /debug/node-network-test
 * Tests network paths from Node runtime (calls internal Node action)
 * This is the key test - Node actions have different networking!
 */
http.route({
  path: "/debug/node-network-test",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.searchParams.get("storageId") as any;

    try {
      const results = await ctx.runAction(internal.debugNetworking.testNetworking, {
        storageId: storageId || undefined,
      });
      return new Response(JSON.stringify(results, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({
        error: e.message,
        stack: e.stack,
      }, null, 2), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================================================
// INTERNAL STORAGE ENDPOINT
// Workaround for Node action storage.get() failing (Issue #45)
// Node actions fetch from localhost:3211 → V8 HTTP action → syscall to storage
// ============================================================================

/**
 * GET /internal/storage-blob?storageId=xxx
 * V8 HTTP action that retrieves a blob from storage.
 *
 * WHY THIS EXISTS:
 * - Node actions' storage.get() internally tries to HTTP fetch from 127.0.0.1:80
 * - Port 80 is not listening inside the container → ECONNREFUSED
 * - This endpoint runs in V8 which uses syscalls (not HTTP) for storage access
 * - Node actions can fetch from localhost:3211 which works
 *
 * See: tasks/00045-node-action-storage-fix/README.md
 */
http.route({
  path: "/internal/storage-blob",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.searchParams.get("storageId");

    if (!storageId) {
      return new Response("Missing storageId param", { status: 400 });
    }

    try {
      const blob = await ctx.storage.get(storageId as any);
      if (!blob) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": blob.type || "application/octet-stream",
          "Content-Length": blob.size.toString(),
        },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================================================
// DEBUG ENDPOINTS (can be removed after Issue #45 is fully resolved)
// ============================================================================

/**
 * POST /debug/storage-blob - Create a test blob
 */
http.route({
  path: "/debug/storage-blob",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const blob = new Blob(["test content for storage debugging"], {
      type: "text/plain",
    });
    const storageId = await ctx.storage.store(blob);
    return new Response(JSON.stringify({ storageId, size: blob.size }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * GET /debug/storage-blob?storageId=xxx - Alias to /internal/storage-blob for testing
 */
http.route({
  path: "/debug/storage-blob",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.searchParams.get("storageId");

    if (!storageId) {
      return new Response("Missing storageId param", { status: 400 });
    }

    try {
      const blob = await ctx.storage.get(storageId as any);
      if (!blob) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": blob.type || "application/octet-stream",
          "Content-Length": blob.size.toString(),
        },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
