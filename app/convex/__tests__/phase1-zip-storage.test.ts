/**
 * Phase 1 Tests: ZIP Storage and Write Permissions
 * Task 00019 - Multi-file ZIP HTML Projects
 *
 * Tests for ZIP upload, validation, extraction, and write permissions.
 */

import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import path from "path";
import fs from "fs/promises";

describe("ZIP Validation Constants", () => {
  test("validateZipSize should reject files larger than 50MB", async () => {
    const { validateZipSize } = await import("../lib/fileTypes");

    // Test valid size
    expect(() => validateZipSize(10 * 1024 * 1024)).not.toThrow(); // 10MB

    // Test boundary
    expect(() => validateZipSize(50 * 1024 * 1024)).not.toThrow(); // 50MB exactly

    // Test oversized
    expect(() => validateZipSize(51 * 1024 * 1024)).toThrow(/too large/i);
    expect(() => validateZipSize(60 * 1024 * 1024)).toThrow(/60.*MB/); // Should show actual size
  });

  test("isForbiddenExtension should detect forbidden file types", async () => {
    const { isForbiddenExtension } = await import("../lib/fileTypes");

    // Executables
    expect(isForbiddenExtension("malware.exe")).toBe(true);
    expect(isForbiddenExtension("script.bat")).toBe(true);
    expect(isForbiddenExtension("run.sh")).toBe(true);
    expect(isForbiddenExtension("command.ps1")).toBe(true);

    // Videos
    expect(isForbiddenExtension("video.mp4")).toBe(true);
    expect(isForbiddenExtension("clip.mov")).toBe(true);
    expect(isForbiddenExtension("movie.avi")).toBe(true);

    // Office docs
    expect(isForbiddenExtension("document.doc")).toBe(true);
    expect(isForbiddenExtension("spreadsheet.xlsx")).toBe(true);

    // Allowed files
    expect(isForbiddenExtension("index.html")).toBe(false);
    expect(isForbiddenExtension("styles.css")).toBe(false);
    expect(isForbiddenExtension("app.js")).toBe(false);
    expect(isForbiddenExtension("logo.png")).toBe(false);

    // Case insensitive
    expect(isForbiddenExtension("MALWARE.EXE")).toBe(true);
    expect(isForbiddenExtension("VIDEO.MP4")).toBe(true);
  });

  test("isForbiddenExtension should handle paths with directories", async () => {
    const { isForbiddenExtension } = await import("../lib/fileTypes");

    expect(isForbiddenExtension("assets/video.mp4")).toBe(true);
    expect(isForbiddenExtension("scripts/run.sh")).toBe(true);
    expect(isForbiddenExtension("assets/images/logo.png")).toBe(false);
  });
});

describe("ZIP Upload - Create Artifact Flow", () => {
  test("createArtifactWithZip should validate ZIP size before creating records", async () => {
    const t = convexTest(schema);

    // Create user
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    // Attempt to create artifact with oversized ZIP
    const oversizedBytes = 60 * 1024 * 1024; // 60MB

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test ZIP",
        fileSize: oversizedBytes,
      })
    ).rejects.toThrow(/too large/i);
  });

  test("createArtifactWithZip should create artifact and version for valid ZIP size", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const result = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        title: "My Dashboard",
        description: "Interactive sales dashboard",
        fileSize: 10000, // 10KB - valid
      });

    expect(result.artifactId).toBeDefined();
    expect(result.versionId).toBeDefined();
    expect(result.uploadUrl).toContain("http");
    expect(result.shareToken).toHaveLength(8);

    // Verify artifact was created
    const artifact = await t.run(async (ctx) => ctx.db.get(result.artifactId));
    expect(artifact).toBeDefined();
    expect(artifact?.title).toBe("My Dashboard");
    expect(artifact?.description).toBe("Interactive sales dashboard");
    expect(artifact?.creatorId).toBe(userId);

    // Verify version was created with fileType=zip
    const version = await t.run(async (ctx) => ctx.db.get(result.versionId));
    expect(version).toBeDefined();
    expect(version?.fileType).toBe("zip");
    expect(version?.versionNumber).toBe(1);
    expect(version?.fileSize).toBe(10000);
  });

  test("createArtifactWithZip should require authentication", async () => {
    const t = convexTest(schema);

    await expect(
      t.mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test",
        fileSize: 1000,
      })
    ).rejects.toThrow(/not authenticated/i);
  });
});

describe("ZIP Upload - Add Version Flow", () => {
  test("addZipVersion should add new version to existing artifact", async () => {
    const t = convexTest(schema);

    // Create owner and artifact
    const ownerId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "owner@example.com" })
    );

    const { artifactId } = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test",
        fileSize: 1000,
      });

    // Add version 2
    const result = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.zipUpload.addZipVersion, {
        artifactId,
        fileSize: 2000,
        versionName: "Second iteration",
      });

    expect(result.versionId).toBeDefined();
    expect(result.versionNumber).toBe(2);
    expect(result.uploadUrl).toContain("http");

    // Verify version was created
    const version = await t.run(async (ctx) => ctx.db.get(result.versionId));
    expect(version).toBeDefined();
    expect(version?.fileType).toBe("zip");
    expect(version?.versionNumber).toBe(2);
    expect(version?.versionName).toBe("Second iteration");
    expect(version?.fileSize).toBe(2000);

    // Verify artifact timestamp was updated
    const artifact = await t.run(async (ctx) => ctx.db.get(artifactId));
    expect(artifact?.updatedAt).toBeGreaterThan(artifact?.createdAt || 0);
  });

  test("addZipVersion should validate ZIP size", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const { artifactId } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test",
        fileSize: 1000,
      });

    // Attempt to add oversized version
    await expect(
      t.withIdentity({ subject: userId }).mutation(api.zipUpload.addZipVersion, {
        artifactId,
        fileSize: 60 * 1024 * 1024, // 60MB
      })
    ).rejects.toThrow(/too large/i);
  });

  test("addZipVersion should enforce owner-only access", async () => {
    const t = convexTest(schema);

    // Create owner and artifact
    const ownerId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "owner@example.com" })
    );

    const { artifactId } = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test",
        fileSize: 1000,
      });

    // Different user tries to add version
    const otherId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "other@example.com" })
    );

    await expect(
      t.withIdentity({ subject: otherId }).mutation(api.zipUpload.addZipVersion, {
        artifactId,
        fileSize: 1000,
      })
    ).rejects.toThrow(/not authorized.*owner/i);
  });

  test("addZipVersion should require authentication", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const { artifactId } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test",
        fileSize: 1000,
      });

    await expect(
      t.mutation(api.zipUpload.addZipVersion, {
        artifactId,
        fileSize: 1000,
      })
    ).rejects.toThrow(/not authenticated/i);
  });

  test("addZipVersion should reject if artifact is deleted", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const { artifactId } = await t
      .withIdentity({ subject: userId })
      .mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test",
        fileSize: 1000,
      });

    // Soft delete the artifact
    await t.run(async (ctx) => {
      await ctx.db.patch(artifactId, { isDeleted: true, deletedAt: Date.now() });
    });

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.zipUpload.addZipVersion, {
        artifactId,
        fileSize: 1000,
      })
    ).rejects.toThrow(/artifact not found/i);
  });
});

describe("canWriteArtifact Permission Helper", () => {
  test("should return true for artifact owner", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "owner@example.com" })
    );

    const artifactId = await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test",
        creatorId: userId,
        shareToken: "abc12345",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const { canWriteArtifact } = await import("../lib/permissions");
    // Must set identity context for auth check to work
    const result = await t.withIdentity({ subject: userId }).run(async (ctx) =>
      canWriteArtifact(ctx, artifactId)
    );

    expect(result).toBe(true);
  });

  test("should return false for non-owner", async () => {
    const t = convexTest(schema);

    const ownerId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "owner@example.com" })
    );

    const otherId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "other@example.com" })
    );

    const artifactId = await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test",
        creatorId: ownerId,
        shareToken: "abc12345",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const { canWriteArtifact } = await import("../lib/permissions");

    // Test with other user context
    const result = await t.withIdentity({ subject: otherId }).run(async (ctx) =>
      canWriteArtifact(ctx, artifactId)
    );

    expect(result).toBe(false);
  });

  test("should return false for deleted artifact", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "owner@example.com" })
    );

    const artifactId = await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test",
        creatorId: userId,
        shareToken: "abc12345",
        isDeleted: true,  // Deleted
        deletedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const { canWriteArtifact } = await import("../lib/permissions");
    const result = await t.withIdentity({ subject: userId }).run(async (ctx) =>
      canWriteArtifact(ctx, artifactId)
    );

    expect(result).toBe(false);
  });

  test("should return false when not authenticated", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "owner@example.com" })
    );

    const artifactId = await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test",
        creatorId: userId,
        shareToken: "abc12345",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const { canWriteArtifact } = await import("../lib/permissions");
    const result = await t.run(async (ctx) =>
      canWriteArtifact(ctx, artifactId)
    );

    expect(result).toBe(false);
  });
});

describe("ZIP Processing Error Handling", () => {
  test("markProcessingError should soft-delete version on failure", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    const artifactId = await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test",
        creatorId: userId,
        shareToken: "abc12345",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const versionId = await t.run(async (ctx) =>
      ctx.db.insert("artifactVersions", {
        artifactId,
        versionNumber: 1,
        createdBy: userId,
        fileType: "zip",
        entryPoint: "index.html",
        fileSize: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      })
    );

    // Simulate processing error
    await t.mutation(internal.zipProcessorMutations.markProcessingError, {
      versionId,
      error: "ZIP contains forbidden file type: .exe",
    });

    // Verify version was soft-deleted
    const version = await t.run(async (ctx) => ctx.db.get(versionId));
    expect(version?.isDeleted).toBe(true);
    expect(version?.deletedAt).toBeDefined();
  });
});

// Note: The following tests require actual ZIP files from /samples/
// These will be integration tests that verify full extraction flow
describe("ZIP Processing Integration Tests (requires sample files)", () => {
  test.skip("should process valid ZIP and extract all files", async () => {
    // This test will be implemented after basic validation is working
    // It will use samples/01-valid/zip/charting/v1.zip
  });

  test.skip("should reject ZIP with too many files", async () => {
    // This test requires generating a ZIP with >500 files
    // Will be implemented after basic validation is working
  });

  test.skip("should reject ZIP with forbidden file types", async () => {
    // This test will use samples/04-invalid/wrong-type/presentation-with-video.zip
    // Will be implemented after file type validation is working
  });

  test.skip("should reject ZIP with oversized individual files", async () => {
    // This test requires generating a ZIP with a file >5MB
    // Will be implemented after file size validation is working
  });

  test.skip("should detect entry point correctly", async () => {
    // This test will verify entry point detection priority:
    // 1. index.html in root
    // 2. index.htm in root
    // 3. index.html in subdirectory
    // 4. First HTML file alphabetically
  });
});
