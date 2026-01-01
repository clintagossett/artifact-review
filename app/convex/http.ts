import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

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
          versionNumber,
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
        filePath: decodedPath,
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
          "Cache-Control": "public, max-age=31536000",
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

export default http;
