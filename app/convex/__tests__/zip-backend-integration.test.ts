/**
 * Backend Integration Tests: Real ZIP File Processing
 * Task 00019 - Phase 1
 *
 * These tests use REAL ZIP files from /samples/ to validate the full
 * ZIP processing pipeline (extraction, validation, file storage).
 *
 * Unlike unit tests that mock storage, these tests verify:
 * - JSZip extraction of actual ZIP bytes
 * - File count, size, and type validation
 * - Entry point detection with real directory structures
 * - Correct creation of artifactFiles records
 *
 * Note: convex-test doesn't support ctx.storage.store(), so we test
 * the extraction/validation logic and DB record creation separately.
 * Full storage I/O is validated via E2E tests.
 */

import { convexTest } from "convex-test";
import { expect, test, describe, beforeAll } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import path from "path";
import fs from "fs/promises";
import JSZip from "jszip";
import {
  MAX_ZIP_FILE_COUNT,
  MAX_EXTRACTED_FILE_SIZE,
  isForbiddenExtension,
} from "../lib/fileTypes";
import { getMimeType } from "../lib/mimeTypes";

// Sample ZIP file paths
const SAMPLES_DIR = path.join(__dirname, "../../../samples");
const VALID_ZIP = {
  charting: {
    v1: path.join(SAMPLES_DIR, "01-valid/zip/charting/v1.zip"),
    v2: path.join(SAMPLES_DIR, "01-valid/zip/charting/v2.zip"),
    v3: path.join(SAMPLES_DIR, "01-valid/zip/charting/v3.zip"),
  },
};
const EDGE_CASE_ZIP = {
  multiPageSite: path.join(SAMPLES_DIR, "03-edge-cases/zip/multi-page-site.zip"),
};

/**
 * Helper: Extract ZIP and return file info (simulates processZipFile extraction)
 */
async function extractZipInfo(zipPath: string): Promise<{
  files: Array<{
    path: string;
    content: ArrayBuffer;
    mimeType: string;
    size: number;
  }>;
  entryPoint: string | null;
  validationErrors: string[];
}> {
  const zipBuffer = await fs.readFile(zipPath);
  const zip = new JSZip();
  const zipContents = await zip.loadAsync(zipBuffer);

  const validationErrors: string[] = [];
  const files: Array<{
    path: string;
    content: ArrayBuffer;
    mimeType: string;
    size: number;
  }> = [];
  const htmlFiles: string[] = [];
  let entryPoint: string | null = null;

  const fileEntries = Object.entries(zipContents.files).filter(
    ([_, entry]) => !entry.dir
  );

  // Validation: file count
  if (fileEntries.length > MAX_ZIP_FILE_COUNT) {
    validationErrors.push(
      `Too many files: ${fileEntries.length} (max: ${MAX_ZIP_FILE_COUNT})`
    );
  }

  // Validation: forbidden extensions
  const forbiddenFiles: string[] = [];
  for (const [filePath] of fileEntries) {
    if (isForbiddenExtension(filePath)) {
      forbiddenFiles.push(filePath);
    }
  }
  if (forbiddenFiles.length > 0) {
    validationErrors.push(
      `Forbidden file types: ${forbiddenFiles.join(", ")}`
    );
  }

  // Extract files and detect entry point
  for (const [relativePath, zipEntry] of fileEntries) {
    if (zipEntry.dir) continue;

    const normalizedPath = relativePath.replace(/^\.?\//, "");
    const content = await zipEntry.async("arraybuffer");
    const mimeType = getMimeType(normalizedPath);

    // Validation: individual file size
    if (content.byteLength > MAX_EXTRACTED_FILE_SIZE) {
      validationErrors.push(
        `File too large: ${normalizedPath} (${(content.byteLength / 1024 / 1024).toFixed(2)}MB)`
      );
    }

    files.push({
      path: normalizedPath,
      content,
      mimeType,
      size: content.byteLength,
    });

    // Entry point detection
    if (
      normalizedPath.toLowerCase().endsWith(".html") ||
      normalizedPath.toLowerCase().endsWith(".htm")
    ) {
      htmlFiles.push(normalizedPath);

      if (normalizedPath.toLowerCase() === "index.html") {
        entryPoint = normalizedPath;
      } else if (!entryPoint && normalizedPath.toLowerCase() === "index.htm") {
        entryPoint = normalizedPath;
      } else if (
        !entryPoint &&
        normalizedPath.toLowerCase().endsWith("/index.html")
      ) {
        entryPoint = normalizedPath;
      }
    }
  }

  // Fallback: first HTML file
  if (!entryPoint && htmlFiles.length > 0) {
    htmlFiles.sort();
    entryPoint = htmlFiles[0];
  }

  return { files, entryPoint, validationErrors };
}

describe("Backend Integration: Real ZIP Extraction", () => {
  test("should extract charting/v1.zip and create all file records", async () => {
    const t = convexTest(schema);

    // Create user and artifact
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const { artifactId, versionId } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        name: "Charting Dashboard v1",
        fileSize: 5000,
      });

    // Extract real ZIP file
    const { files, entryPoint, validationErrors } = await extractZipInfo(
      VALID_ZIP.charting.v1
    );

    // Should have no validation errors
    expect(validationErrors).toHaveLength(0);

    // Should have detected entry point
    expect(entryPoint).toBeTruthy();
    expect(entryPoint).toContain("index.html");

    // Create file records for each extracted file (simulating what processZipFile does)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Use mock storage ID (storage.store() not available in convex-test)
      const mockStorageId = `kg2${i.toString().padStart(10, "0")};_storage` as Id<"_storage">;

      await t.mutation(internal.zipProcessorMutations.createArtifactFileRecord, {
        versionId,
        filePath: file.path,
        storageId: mockStorageId,
        mimeType: file.mimeType,
        fileSize: file.size,
      });
    }

    // Mark processing complete
    await t.mutation(internal.zipProcessorMutations.markProcessingComplete, {
      versionId,
      entryPoint: entryPoint!,
    });

    // Verify all files were stored
    const storedFiles = await t.run(async (ctx) =>
      ctx.db
        .query("artifactFiles")
        .withIndex("by_version_active", (q) =>
          q.eq("versionId", versionId).eq("isDeleted", false)
        )
        .collect()
    );

    expect(storedFiles).toHaveLength(files.length);

    // Verify file paths match
    const storedPaths = storedFiles.map((f) => f.filePath).sort();
    const extractedPaths = files.map((f) => f.path).sort();
    expect(storedPaths).toEqual(extractedPaths);

    // Verify MIME types
    for (const file of files) {
      const storedFile = storedFiles.find((f) => f.filePath === file.path);
      expect(storedFile).toBeDefined();
      expect(storedFile?.mimeType).toBe(file.mimeType);
    }

    // Verify entry point was set on version
    const version = await t.run(async (ctx) => ctx.db.get(versionId));
    expect(version?.entryPoint).toBe(entryPoint);
  });

  test("should extract charting/v2.zip with updated files", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    // Create v1 first
    const { artifactId, versionId: v1Id } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        name: "Charting Dashboard",
        fileSize: 5000,
      });

    // Add v2 as new version
    const { versionId: v2Id, number: versionNumber } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.addZipVersion, {
        artifactId,
        fileSize: 6000,
        name: "Updated charts",
      });

    expect(versionNumber).toBe(2);

    // Extract v2 ZIP
    const { files, entryPoint, validationErrors } = await extractZipInfo(
      VALID_ZIP.charting.v2
    );

    expect(validationErrors).toHaveLength(0);
    expect(entryPoint).toBeTruthy();

    // Store v2 files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mockStorageId = `kg2v2${i.toString().padStart(8, "0")};_storage` as Id<"_storage">;

      await t.mutation(internal.zipProcessorMutations.createArtifactFileRecord, {
        versionId: v2Id,
        filePath: file.path,
        storageId: mockStorageId,
        mimeType: file.mimeType,
        fileSize: file.size,
      });
    }

    await t.mutation(internal.zipProcessorMutations.markProcessingComplete, {
      versionId: v2Id,
      entryPoint: entryPoint!,
    });

    // Verify v2 files are stored separately from v1
    const v2Files = await t.run(async (ctx) =>
      ctx.db
        .query("artifactFiles")
        .withIndex("by_version_active", (q) =>
          q.eq("versionId", v2Id).eq("isDeleted", false)
        )
        .collect()
    );

    expect(v2Files).toHaveLength(files.length);

    // Verify version 2 has its own entry point
    const version = await t.run(async (ctx) => ctx.db.get(v2Id));
    expect(version?.number).toBe(2);
    expect(version?.entryPoint).toBe(entryPoint);
  });

  test("should handle multi-page site with entry point detection", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const { versionId } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        name: "Multi-page Website",
        fileSize: 8000,
      });

    // Extract multi-page-site.zip
    const { files, entryPoint, validationErrors } = await extractZipInfo(
      EDGE_CASE_ZIP.multiPageSite
    );

    expect(validationErrors).toHaveLength(0);

    // Should detect an HTML entry point
    expect(entryPoint).toBeTruthy();
    expect(
      entryPoint!.endsWith(".html") || entryPoint!.endsWith(".htm")
    ).toBe(true);

    // Store files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mockStorageId = `kg2mp${i.toString().padStart(8, "0")};_storage` as Id<"_storage">;

      await t.mutation(internal.zipProcessorMutations.createArtifactFileRecord, {
        versionId,
        filePath: file.path,
        storageId: mockStorageId,
        mimeType: file.mimeType,
        fileSize: file.size,
      });
    }

    await t.mutation(internal.zipProcessorMutations.markProcessingComplete, {
      versionId,
      entryPoint: entryPoint!,
    });

    // Verify all HTML files are stored
    const storedFiles = await t.run(async (ctx) =>
      ctx.db
        .query("artifactFiles")
        .withIndex("by_version_active", (q) =>
          q.eq("versionId", versionId).eq("isDeleted", false)
        )
        .collect()
    );

    const htmlFiles = storedFiles.filter(
      (f) => f.mimeType === "text/html"
    );
    expect(htmlFiles.length).toBeGreaterThan(0);
  });
});

describe("Backend Integration: ZIP Validation with Real Files", () => {
  test("should validate charting/v3.zip file contents", async () => {
    const { files, entryPoint, validationErrors } = await extractZipInfo(
      VALID_ZIP.charting.v3
    );

    // v3 should be valid
    expect(validationErrors).toHaveLength(0);
    expect(entryPoint).toBeTruthy();

    // Verify expected file types
    const hasHtml = files.some((f) => f.mimeType === "text/html");
    const hasJs = files.some(
      (f) =>
        f.mimeType === "application/javascript" ||
        f.mimeType === "text/javascript"
    );
    const hasCss = files.some((f) => f.mimeType === "text/css");

    expect(hasHtml).toBe(true);
    // JS and CSS may or may not be present depending on v3 contents
  });

  test("should detect MIME types correctly from real files", async () => {
    const { files } = await extractZipInfo(VALID_ZIP.charting.v1);

    for (const file of files) {
      // Verify MIME types are detected
      expect(file.mimeType).toBeTruthy();

      // Verify MIME type matches extension
      if (file.path.endsWith(".html")) {
        expect(file.mimeType).toBe("text/html");
      } else if (file.path.endsWith(".js")) {
        expect(
          file.mimeType === "application/javascript" ||
            file.mimeType === "text/javascript"
        ).toBe(true);
      } else if (file.path.endsWith(".css")) {
        expect(file.mimeType).toBe("text/css");
      } else if (file.path.endsWith(".json")) {
        expect(file.mimeType).toBe("application/json");
      } else if (file.path.endsWith(".png")) {
        expect(file.mimeType).toBe("image/png");
      }
    }
  });

  test("should calculate correct file sizes from real files", async () => {
    const { files } = await extractZipInfo(VALID_ZIP.charting.v1);

    for (const file of files) {
      // All files should have positive size
      expect(file.size).toBeGreaterThan(0);

      // Size should match content length
      expect(file.size).toBe(file.content.byteLength);

      // All sample files should be under MAX_EXTRACTED_FILE_SIZE
      expect(file.size).toBeLessThan(MAX_EXTRACTED_FILE_SIZE);
    }
  });
});

describe("Backend Integration: Multi-Version Workflow", () => {
  test("should support uploading 3 versions with real ZIP files", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    // Version 1
    const { artifactId, versionId: v1Id } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        name: "Charting Dashboard",
        fileSize: 5000,
      });

    const v1Info = await extractZipInfo(VALID_ZIP.charting.v1);
    for (let i = 0; i < v1Info.files.length; i++) {
      const mockStorageId = `kg2v1${i.toString().padStart(8, "0")};_storage` as Id<"_storage">;
      await t.mutation(internal.zipProcessorMutations.createArtifactFileRecord, {
        versionId: v1Id,
        filePath: v1Info.files[i].path,
        storageId: mockStorageId,
        mimeType: v1Info.files[i].mimeType,
        fileSize: v1Info.files[i].size,
      });
    }
    await t.mutation(internal.zipProcessorMutations.markProcessingComplete, {
      versionId: v1Id,
      entryPoint: v1Info.entryPoint!,
    });

    // Version 2
    const { versionId: v2Id, number: v2Num } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.addZipVersion, {
        artifactId,
        fileSize: 6000,
        name: "Version 2",
      });

    expect(v2Num).toBe(2);

    const v2Info = await extractZipInfo(VALID_ZIP.charting.v2);
    for (let i = 0; i < v2Info.files.length; i++) {
      const mockStorageId = `kg2v2${i.toString().padStart(8, "0")};_storage` as Id<"_storage">;
      await t.mutation(internal.zipProcessorMutations.createArtifactFileRecord, {
        versionId: v2Id,
        filePath: v2Info.files[i].path,
        storageId: mockStorageId,
        mimeType: v2Info.files[i].mimeType,
        fileSize: v2Info.files[i].size,
      });
    }
    await t.mutation(internal.zipProcessorMutations.markProcessingComplete, {
      versionId: v2Id,
      entryPoint: v2Info.entryPoint!,
    });

    // Version 3
    const { versionId: v3Id, number: v3Num } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.addZipVersion, {
        artifactId,
        fileSize: 7000,
        name: "Version 3",
      });

    expect(v3Num).toBe(3);

    const v3Info = await extractZipInfo(VALID_ZIP.charting.v3);
    for (let i = 0; i < v3Info.files.length; i++) {
      const mockStorageId = `kg2v3${i.toString().padStart(8, "0")};_storage` as Id<"_storage">;
      await t.mutation(internal.zipProcessorMutations.createArtifactFileRecord, {
        versionId: v3Id,
        filePath: v3Info.files[i].path,
        storageId: mockStorageId,
        mimeType: v3Info.files[i].mimeType,
        fileSize: v3Info.files[i].size,
      });
    }
    await t.mutation(internal.zipProcessorMutations.markProcessingComplete, {
      versionId: v3Id,
      entryPoint: v3Info.entryPoint!,
    });

    // Verify all versions exist
    const versions = await t.run(async (ctx) =>
      ctx.db
        .query("artifactVersions")
        .withIndex("by_artifact", (q) => q.eq("artifactId", artifactId))
        .collect()
    );

    expect(versions).toHaveLength(3);
    expect(versions.map((v) => v.number).sort()).toEqual([1, 2, 3]);

    // Verify each version has its own files
    for (const version of versions) {
      const versionFiles = await t.run(async (ctx) =>
        ctx.db
          .query("artifactFiles")
          .withIndex("by_version_active", (q) =>
            q.eq("versionId", version._id).eq("isDeleted", false)
          )
          .collect()
      );

      expect(versionFiles.length).toBeGreaterThan(0);
      expect(version.entryPoint).toBeTruthy();
    }
  });
});
