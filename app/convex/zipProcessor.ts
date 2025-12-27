"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import JSZip from "jszip";
import { internal } from "./_generated/api";
import { getMimeType } from "./lib/mimeTypes";

/**
 * Process a ZIP file: extract files, detect entry point, and store in database
 */
export const processZipFile = internalAction({
  args: {
    versionId: v.id("artifactVersions"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Get the ZIP file from storage
      const zipUrl = await ctx.storage.getUrl(args.storageId);
      if (!zipUrl) {
        throw new Error("ZIP file not found in storage");
      }

      // Download and process the ZIP file
      const response = await fetch(zipUrl);
      const zipBuffer = await response.arrayBuffer();

      const zip = new JSZip();
      const zipContents = await zip.loadAsync(zipBuffer);

      let entryPoint: string | null = null;
      const htmlFiles: string[] = [];

      // First pass: find HTML files and detect entry point
      for (const [relativePath, zipEntry] of Object.entries(zipContents.files)) {
        if (zipEntry.dir) continue; // Skip directories

        // Check for HTML files
        if (relativePath.toLowerCase().endsWith('.html') || relativePath.toLowerCase().endsWith('.htm')) {
          htmlFiles.push(relativePath);

          // Auto-detect entry point: index.html (case-insensitive, any depth)
          if (relativePath.toLowerCase() === 'index.html' || relativePath.toLowerCase().endsWith('/index.html')) {
            entryPoint = relativePath;
          }
          // Else check for main.html
          else if (!entryPoint && (relativePath.toLowerCase() === 'main.html' || relativePath.toLowerCase().endsWith('/main.html'))) {
            entryPoint = relativePath;
          }
        }
      }

      // If no index.html or main.html found, use the first HTML file
      if (!entryPoint && htmlFiles.length > 0) {
        entryPoint = htmlFiles[0];
      }

      // Second pass: extract and store all files
      for (const [relativePath, zipEntry] of Object.entries(zipContents.files)) {
        if (zipEntry.dir) continue; // Skip directories

        const content = await zipEntry.async("arraybuffer");
        const mimeType = getMimeType(relativePath);

        // Store file using internal action (storage.store is only available in actions)
        await ctx.runAction(internal.zipProcessorMutations.storeExtractedFile, {
          versionId: args.versionId,
          filePath: relativePath,
          content: Array.from(new Uint8Array(content)),
          mimeType,
        });
      }

      // Mark processing as complete with entry point
      if (entryPoint) {
        await ctx.runMutation(internal.zipProcessorMutations.markProcessingComplete, {
          versionId: args.versionId,
          entryPoint,
        });
      }

    } catch (error) {
      console.error("Error processing ZIP file:", error);
      // Mark processing as failed
      await ctx.runMutation(internal.zipProcessorMutations.markProcessingError, {
        versionId: args.versionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return null;
  },
});
