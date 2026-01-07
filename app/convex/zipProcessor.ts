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
        ([path, entry]) => {
          if (entry.dir) return false;
          // Ignore Mac system files
          if (path.includes('__MACOSX')) return false;
          if (path.endsWith('.DS_Store')) return false;
          return true;
        }
      );

      // DETECT COMMON ROOT PATH
      // Many ZIPs wrap all content in folder(s) (e.g., "project/src/index.html")
      // We need to strip this so relative paths in HTML work correctly
      const detectCommonRootPath = (paths: string[]): string => {
        if (paths.length === 0) return '';

        // Normalize paths first (remove leading ./ or /)
        const normalized = paths.map(p => p.replace(/^\.?\//, ''));

        // Get directory parts for each file (exclude the filename)
        const dirParts = normalized.map(p => {
          const parts = p.split('/');
          return parts.slice(0, -1); // Remove filename, keep directories
        });

        // Find common prefix directories
        if (dirParts.length === 0 || dirParts[0].length === 0) return '';

        const commonParts: string[] = [];
        const firstDirs = dirParts[0];

        for (let i = 0; i < firstDirs.length; i++) {
          const segment = firstDirs[i];
          // Check if all paths have this segment at this position
          if (dirParts.every(parts => parts[i] === segment)) {
            commonParts.push(segment);
          } else {
            break;
          }
        }

        return commonParts.length > 0 ? commonParts.join('/') + '/' : '';
      };

      const filePaths = fileEntries.map(([path]) => path);
      const commonRoot = detectCommonRootPath(filePaths);

      // Helper to strip the common root from a path
      const stripRoot = (path: string): string => {
        let normalized = path.replace(/^\.?\//, '');
        if (commonRoot && normalized.startsWith(commonRoot)) {
          normalized = normalized.slice(commonRoot.length);
        }
        return normalized;
      };

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

        // Normalize path and strip common root folder
        const normalizedPath = stripRoot(relativePath);
        const lowerPath = normalizedPath.toLowerCase();

        if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) {
          htmlFiles.push(normalizedPath);

          // Priority 1: index.html in root
          if (lowerPath === 'index.html') {
            entryPoint = normalizedPath;
          }
          // Priority 2: index.htm in root
          else if (!entryPoint && lowerPath === 'index.htm') {
            entryPoint = normalizedPath;
          }
          // Priority 3: index.html in subdirectory
          else if (!entryPoint && lowerPath.endsWith('/index.html')) {
            entryPoint = normalizedPath;
          }
        }
        // Support Markdown entry points if no HTML found yet
        else if (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown') || lowerPath.endsWith('readme')) {
          if (!entryPoint && (lowerPath === 'readme.md' || lowerPath === 'index.md' || lowerPath === 'readme')) {
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

      // Priority 5: First Markdown file (if no HTML)
      if (!entryPoint) {
        const mdFiles = fileEntries
          .map(([path]) => stripRoot(path))
          .filter(p => {
            const lower = p.toLowerCase();
            return lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('readme');
          })
          .sort();

        if (mdFiles.length > 0) {
          entryPoint = mdFiles[0];
        }
      }

      if (!entryPoint) {
        // Collect a sample of files for the error message
        const fileSample = filePaths.slice(0, 10).join(', ');
        throw new Error(
          `No HTML or Markdown file found in ZIP. At least one .html, .md, .markdown, or README file is required. Found files: ${fileSample}${filePaths.length > 10 ? '...' : ''}`
        );
      }

      // EXTRACTION PASS: Extract and store all files
      for (const [relativePath, zipEntry] of fileEntries) {
        if (zipEntry.dir) continue;

        const normalizedPath = stripRoot(relativePath);
        const content = await zipEntry.async("arraybuffer");

        // Validate individual file size
        if (content.byteLength > MAX_EXTRACTED_FILE_SIZE) {
          throw new Error(
            `File too large: ${normalizedPath} (${(content.byteLength / 1024 / 1024).toFixed(2)}MB). Maximum: 5MB per file.`
          );
        }

        const mimeType = getMimeType(normalizedPath);

        // Store internally in the action context
        const blob = new Blob([content], { type: mimeType });
        const storageId = await ctx.storage.store(blob);

        // Create the DB record using mutation
        await ctx.runMutation(internal.zipProcessorMutations.createArtifactFileRecord, {
          versionId: args.versionId,
          path: normalizedPath,
          storageId: storageId,
          mimeType,
          size: content.byteLength,
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
