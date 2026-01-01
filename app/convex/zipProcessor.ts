"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import JSZip from "jszip";
import { internal } from "./_generated/api";
import { getMimeType } from "./lib/mimeTypes";
import {
  MAX_ZIP_FILE_COUNT,
  MAX_EXTRACTED_FILE_SIZE,
  isForbiddenExtension,
} from "./lib/fileTypes";

/**
 * Process a ZIP file: validate, extract files, detect entry point, and store in database
 * Task 00019 - Phase 1: Added validation for file count, size, and forbidden types
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

      // VALIDATION PASS: Check constraints before extraction
      const fileEntries = Object.entries(zipContents.files).filter(
        ([_, entry]) => !entry.dir
      );

      // Check file count
      if (fileEntries.length > MAX_ZIP_FILE_COUNT) {
        throw new Error(
          `ZIP contains too many files. Maximum: ${MAX_ZIP_FILE_COUNT}, found: ${fileEntries.length}`
        );
      }

      // Check for forbidden file types
      const forbiddenFiles: string[] = [];
      for (const [path, _] of fileEntries) {
        if (isForbiddenExtension(path)) {
          forbiddenFiles.push(path);
        }
      }
      if (forbiddenFiles.length > 0) {
        const extensions = [...new Set(
          forbiddenFiles.map((f) => '.' + f.split('.').pop()!.toLowerCase())
        )].join(', ');
        throw new Error(
          `ZIP contains unsupported file types: ${extensions}`
        );
      }

      let entryPoint: string | null = null;
      const htmlFiles: string[] = [];

      // ENTRY POINT DETECTION PASS
      for (const [relativePath, zipEntry] of fileEntries) {
        if (zipEntry.dir) continue;

        // Normalize path (remove leading ./ or /)
        const normalizedPath = relativePath.replace(/^\.?\//, '');

        if (
          normalizedPath.toLowerCase().endsWith('.html') ||
          normalizedPath.toLowerCase().endsWith('.htm')
        ) {
          htmlFiles.push(normalizedPath);

          // Priority 1: index.html in root
          if (normalizedPath.toLowerCase() === 'index.html') {
            entryPoint = normalizedPath;
          }
          // Priority 2: index.htm in root
          else if (!entryPoint && normalizedPath.toLowerCase() === 'index.htm') {
            entryPoint = normalizedPath;
          }
          // Priority 3: index.html in subdirectory
          else if (!entryPoint && normalizedPath.toLowerCase().endsWith('/index.html')) {
            entryPoint = normalizedPath;
          }
        }
      }

      // Priority 4: First HTML file found
      if (!entryPoint && htmlFiles.length > 0) {
        // Sort to get consistent ordering
        htmlFiles.sort();
        entryPoint = htmlFiles[0];
      }

      if (!entryPoint) {
        throw new Error("No HTML file found in ZIP. At least one .html file is required.");
      }

      // EXTRACTION PASS: Extract and store all files
      for (const [relativePath, zipEntry] of fileEntries) {
        if (zipEntry.dir) continue;

        const normalizedPath = relativePath.replace(/^\.?\//, '');
        const content = await zipEntry.async("arraybuffer");

        // Validate individual file size
        if (content.byteLength > MAX_EXTRACTED_FILE_SIZE) {
          throw new Error(
            `File too large: ${normalizedPath} (${(content.byteLength / 1024 / 1024).toFixed(2)}MB). Maximum: 5MB per file.`
          );
        }

        const mimeType = getMimeType(normalizedPath);

        // Store file using internal action
        await ctx.runAction(internal.zipProcessorMutations.storeExtractedFile, {
          versionId: args.versionId,
          filePath: normalizedPath,
          content: Array.from(new Uint8Array(content)),
          mimeType,
        });
      }

      // Mark processing complete with detected entry point
      await ctx.runMutation(internal.zipProcessorMutations.markProcessingComplete, {
        versionId: args.versionId,
        entryPoint,
      });

      // Delete the original ZIP from storage (files are extracted)
      await ctx.storage.delete(args.storageId);

    } catch (error) {
      console.error("Error processing ZIP file:", error);

      // Mark processing as failed with specific error
      await ctx.runMutation(internal.zipProcessorMutations.markProcessingError, {
        versionId: args.versionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Re-throw to propagate error to caller
      throw error;
    }

    return null;
  },
});
