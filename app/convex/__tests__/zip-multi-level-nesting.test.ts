/**
 * Backend Integration Tests: Multi-Level ZIP Directory Nesting
 * Task 00019 - Multi-level ZIP root path stripping
 *
 * These tests validate the detectCommonRootPath() logic that strips
 * parent directories from ZIP files. Many AI tools and build processes
 * wrap content in one or more parent folders (e.g., "project/dist/index.html").
 *
 * Test samples: /samples/01-valid/zip/charting-with-parents/
 * - v1.zip: 1 level deep (project/)
 * - v2.zip: 2 levels deep (project/dist/)
 * - v3.zip: 3 levels deep (my-app/src/build/)
 * - v4.zip: 4 levels deep (company/projects/dashboard/release/)
 * - v5.zip: 5 levels deep (a/b/c/d/e/)
 *
 * All versions contain the same charting content with the same file structure,
 * just wrapped in different levels of parent directories.
 */

import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import path from "path";
import fs from "fs/promises";
import JSZip from "jszip";
import { getMimeType } from "../lib/mimeTypes";

// Sample ZIP file paths - charting-with-parents variants
const SAMPLES_DIR = path.join(__dirname, "../../../samples");
const CHARTING_WITH_PARENTS = {
  v1: path.join(SAMPLES_DIR, "01-valid/zip/charting-with-parents/v1.zip"), // 1 level: project/
  v2: path.join(SAMPLES_DIR, "01-valid/zip/charting-with-parents/v2.zip"), // 2 levels: project/dist/
  v3: path.join(SAMPLES_DIR, "01-valid/zip/charting-with-parents/v3.zip"), // 3 levels: my-app/src/build/
  v4: path.join(SAMPLES_DIR, "01-valid/zip/charting-with-parents/v4.zip"), // 4 levels: company/projects/dashboard/release/
  v5: path.join(SAMPLES_DIR, "01-valid/zip/charting-with-parents/v5.zip"), // 5 levels: a/b/c/d/e/
};

/**
 * Helper: Detect common root path (mirrors logic in zipProcessor.ts)
 */
function detectCommonRootPath(paths: string[]): string {
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
}

/**
 * Helper: Extract ZIP and apply root path stripping
 */
async function extractZipWithRootStripping(zipPath: string): Promise<{
  files: Array<{
    originalPath: string;
    normalizedPath: string;
    content: ArrayBuffer;
    mimeType: string;
    size: number;
  }>;
  commonRoot: string;
  entryPoint: string | null;
}> {
  const zipBuffer = await fs.readFile(zipPath);
  const zip = new JSZip();
  const zipContents = await zip.loadAsync(zipBuffer);

  const fileEntries = Object.entries(zipContents.files).filter(
    ([_, entry]) => !entry.dir
  );

  // Detect common root path
  const paths = fileEntries.map(([path]) => path);
  const commonRoot = detectCommonRootPath(paths);

  // Helper to strip the common root from a path
  const stripRoot = (path: string): string => {
    let normalized = path.replace(/^\.?\//, '');
    if (commonRoot && normalized.startsWith(commonRoot)) {
      normalized = normalized.slice(commonRoot.length);
    }
    return normalized;
  };

  const files: Array<{
    originalPath: string;
    normalizedPath: string;
    content: ArrayBuffer;
    mimeType: string;
    size: number;
  }> = [];
  const htmlFiles: string[] = [];
  let entryPoint: string | null = null;

  // Extract files and detect entry point
  for (const [originalPath, zipEntry] of fileEntries) {
    if (zipEntry.dir) continue;

    const normalizedPath = stripRoot(originalPath);
    const content = await zipEntry.async("arraybuffer");
    const mimeType = getMimeType(normalizedPath);

    files.push({
      originalPath,
      normalizedPath,
      content,
      mimeType,
      size: content.byteLength,
    });

    // Entry point detection (same logic as zipProcessor.ts)
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
    htmlFiles.sort();
    entryPoint = htmlFiles[0];
  }

  return { files, commonRoot, entryPoint };
}

describe("Backend Integration: Multi-Level ZIP Root Path Stripping", () => {
  test("should strip 1-level parent directory (project/)", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const { artifactId, versionId } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        name: "Charting with 1-level nesting",
        size: 5000,
      });

    // Extract v1 (wrapped in "project/" folder)
    const { files, commonRoot, entryPoint } = await extractZipWithRootStripping(
      CHARTING_WITH_PARENTS.v1
    );

    // Verify common root was detected
    expect(commonRoot).toBe("project/");

    // Verify entry point is stripped
    expect(entryPoint).toBe("index.html");

    // Verify all paths are stripped
    const normalizedPaths = files.map(f => f.normalizedPath);
    expect(normalizedPaths).toContain("index.html");
    expect(normalizedPaths).toContain("app.js");
    expect(normalizedPaths.some(p => p.startsWith("assets/"))).toBe(true);

    // Verify NO paths contain the parent folder
    expect(normalizedPaths.every(p => !p.includes("project/"))).toBe(true);

    // Store files and verify
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mockStorageId = `kg2v1${i.toString().padStart(8, "0")};_storage` as Id<"_storage">;

      await t.mutation(internal.zipProcessorMutations.createArtifactFileRecord, {
        versionId,
        path: file.normalizedPath,
        storageId: mockStorageId,
        mimeType: file.mimeType,
        size: file.size,
      });
    }

    await t.mutation(internal.zipProcessorMutations.markProcessingComplete, {
      versionId,
      entryPoint: entryPoint!,
    });

    const storedFiles = await t.run(async (ctx) =>
      ctx.db
        .query("artifactFiles")
        .withIndex("by_versionId_active", (q) =>
          q.eq("versionId", versionId).eq("isDeleted", false)
        )
        .collect()
    );

    expect(storedFiles.length).toBe(files.length);
    expect(storedFiles.some(f => f.path === "index.html")).toBe(true);
  });

  test("should strip 2-level parent directories (project/dist/)", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const { versionId } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        name: "Charting with 2-level nesting",
        size: 5000,
      });

    const { files, commonRoot, entryPoint } = await extractZipWithRootStripping(
      CHARTING_WITH_PARENTS.v2
    );

    // Verify 2-level root was detected
    expect(commonRoot).toBe("project/dist/");

    // Verify entry point is stripped
    expect(entryPoint).toBe("index.html");

    // Verify all paths are stripped
    const normalizedPaths = files.map(f => f.normalizedPath);
    expect(normalizedPaths.every(p => !p.includes("project/"))).toBe(true);
    expect(normalizedPaths.every(p => !p.includes("dist/"))).toBe(true);

    // Store and verify
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mockStorageId = `kg2v2${i.toString().padStart(8, "0")};_storage` as Id<"_storage">;

      await t.mutation(internal.zipProcessorMutations.createArtifactFileRecord, {
        versionId,
        path: file.normalizedPath,
        storageId: mockStorageId,
        mimeType: file.mimeType,
        size: file.size,
      });
    }

    await t.mutation(internal.zipProcessorMutations.markProcessingComplete, {
      versionId,
      entryPoint: entryPoint!,
    });

    const version = await t.run(async (ctx) => ctx.db.get(versionId));
    expect(version?.entryPoint).toBe("index.html");
  });

  test("should strip 3-level parent directories (my-app/src/build/)", async () => {
    const { files, commonRoot, entryPoint } = await extractZipWithRootStripping(
      CHARTING_WITH_PARENTS.v3
    );

    expect(commonRoot).toBe("my-app/src/build/");
    expect(entryPoint).toBe("index.html");

    const normalizedPaths = files.map(f => f.normalizedPath);
    expect(normalizedPaths.every(p => !p.includes("my-app/"))).toBe(true);
    expect(normalizedPaths.every(p => !p.includes("src/"))).toBe(true);
    expect(normalizedPaths.every(p => !p.includes("build/"))).toBe(true);
  });

  test("should strip 4-level parent directories (company/projects/dashboard/release/)", async () => {
    const { files, commonRoot, entryPoint } = await extractZipWithRootStripping(
      CHARTING_WITH_PARENTS.v4
    );

    expect(commonRoot).toBe("company/projects/dashboard/release/");
    expect(entryPoint).toBe("index.html");

    const normalizedPaths = files.map(f => f.normalizedPath);
    expect(normalizedPaths.every(p => !p.includes("company/"))).toBe(true);
    expect(normalizedPaths.every(p => !p.includes("projects/"))).toBe(true);
    expect(normalizedPaths.every(p => !p.includes("dashboard/"))).toBe(true);
    expect(normalizedPaths.every(p => !p.includes("release/"))).toBe(true);
  });

  test("should strip 5-level parent directories (a/b/c/d/e/)", async () => {
    const { files, commonRoot, entryPoint } = await extractZipWithRootStripping(
      CHARTING_WITH_PARENTS.v5
    );

    expect(commonRoot).toBe("a/b/c/d/e/");
    expect(entryPoint).toBe("index.html");

    const normalizedPaths = files.map(f => f.normalizedPath);
    expect(normalizedPaths.every(p => !p.match(/^[a-e]\//i))).toBe(true);
  });

  test("all nested versions should result in identical normalized file structure", async () => {
    // Extract all 5 versions
    const results = await Promise.all([
      extractZipWithRootStripping(CHARTING_WITH_PARENTS.v1),
      extractZipWithRootStripping(CHARTING_WITH_PARENTS.v2),
      extractZipWithRootStripping(CHARTING_WITH_PARENTS.v3),
      extractZipWithRootStripping(CHARTING_WITH_PARENTS.v4),
      extractZipWithRootStripping(CHARTING_WITH_PARENTS.v5),
    ]);

    // All should have the same entry point
    const entryPoints = results.map(r => r.entryPoint);
    expect(entryPoints.every(ep => ep === "index.html")).toBe(true);

    // All should have the same number of files
    const fileCounts = results.map(r => r.files.length);
    expect(fileCounts.every(count => count === fileCounts[0])).toBe(true);

    // All should have the same normalized file paths
    const normalizedPathSets = results.map(r =>
      r.files.map(f => f.normalizedPath).sort()
    );

    for (let i = 1; i < normalizedPathSets.length; i++) {
      expect(normalizedPathSets[i]).toEqual(normalizedPathSets[0]);
    }
  });

  test("should handle nested assets correctly after root stripping", async () => {
    const { files, entryPoint } = await extractZipWithRootStripping(
      CHARTING_WITH_PARENTS.v1
    );

    // Verify we have the expected file structure
    const normalizedPaths = files.map(f => f.normalizedPath);

    expect(entryPoint).toBe("index.html");
    expect(normalizedPaths).toContain("index.html");
    expect(normalizedPaths).toContain("app.js");

    // Verify assets are in assets/ subdirectory (not lost during stripping)
    const assetFiles = normalizedPaths.filter(p => p.startsWith("assets/"));
    expect(assetFiles.length).toBeGreaterThan(0);
    expect(assetFiles).toContain("assets/chart-data.json");
    expect(assetFiles.some(p => p.includes("logo"))).toBe(true);
  });

  test("should correctly identify HTML files after root stripping", async () => {
    const { files, entryPoint } = await extractZipWithRootStripping(
      CHARTING_WITH_PARENTS.v4 // 4-level deep
    );

    const htmlFiles = files.filter(f =>
      f.mimeType === "text/html" ||
      f.normalizedPath.endsWith('.html')
    );

    expect(htmlFiles.length).toBeGreaterThan(0);
    expect(entryPoint).toBeTruthy();
    expect(htmlFiles.some(f => f.normalizedPath === entryPoint)).toBe(true);
  });
});

describe("Backend Integration: Root Path Stripping Edge Cases", () => {
  test("should handle files with same basename in different original paths", async () => {
    const { files } = await extractZipWithRootStripping(
      CHARTING_WITH_PARENTS.v3
    );

    // After stripping, verify no duplicate normalized paths
    const normalizedPaths = files.map(f => f.normalizedPath);
    const uniquePaths = new Set(normalizedPaths);
    expect(uniquePaths.size).toBe(normalizedPaths.length);
  });

  test("should preserve file structure after root stripping", async () => {
    const { files: v1Files } = await extractZipWithRootStripping(
      CHARTING_WITH_PARENTS.v1
    );
    const { files: v5Files } = await extractZipWithRootStripping(
      CHARTING_WITH_PARENTS.v5
    );

    // Find index.html in both
    const v1Index = v1Files.find(f => f.normalizedPath === "index.html");
    const v5Index = v5Files.find(f => f.normalizedPath === "index.html");

    expect(v1Index).toBeDefined();
    expect(v5Index).toBeDefined();

    // File sizes should be similar (content is the same structure, just different version numbers)
    const sizeDiff = Math.abs(v1Index!.size - v5Index!.size);
    expect(sizeDiff).toBeLessThan(100); // Small diff for version number change

    // Both should have the same MIME type
    expect(v1Index!.mimeType).toBe("text/html");
    expect(v5Index!.mimeType).toBe("text/html");

    // Both should contain expected content structure
    const v1Content = new TextDecoder().decode(v1Index!.content);
    const v5Content = new TextDecoder().decode(v5Index!.content);

    // Both should have the same HTML structure
    expect(v1Content).toContain("Monthly Sales Dashboard");
    expect(v5Content).toContain("Monthly Sales Dashboard");
    expect(v1Content).toContain("assets/logo.png");
    expect(v5Content).toContain("assets/logo.png");
    expect(v1Content).toContain("canvas");
    expect(v5Content).toContain("canvas");
  });
});
