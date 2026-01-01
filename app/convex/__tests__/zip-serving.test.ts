/**
 * Phase 2 Tests: ZIP Artifact Serving
 * Task 00019 - Multi-file ZIP HTML Projects
 *
 * Tests for HTTP serving, MIME types, and file retrieval.
 */

import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

describe("ZIP Serving - File Retrieval", () => {
  test("getFileByPath returns correct file with MIME type", async () => {
    const t = convexTest(schema);

    // Setup: Create version with files
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
        number: 1,
        createdBy: userId,
        fileType: "zip",
        entryPoint: "index.html",
        fileSize: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      })
    );

    // Create file records
    const mockStorageId = "kg2test000001;_storage" as Id<"_storage">;
    await t.run(async (ctx) =>
      ctx.db.insert("artifactFiles", {
        versionId,
        filePath: "index.html",
        storageId: mockStorageId,
        mimeType: "text/html",
        fileSize: 500,
        isDeleted: false,
      })
    );

    // Test getFileByPath
    const file = await t.query(internal.artifacts.getFileByPath, {
      versionId,
      filePath: "index.html",
    });

    expect(file).toBeDefined();
    expect(file?.mimeType).toBe("text/html");
    expect(file?.storageId).toBe(mockStorageId);
  });

  test("getFileByPath returns null for non-existent file", async () => {
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
        number: 1,
        createdBy: userId,
        fileType: "zip",
        entryPoint: "index.html",
        fileSize: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      })
    );

    // No files created - query should return null
    const file = await t.query(internal.artifacts.getFileByPath, {
      versionId,
      filePath: "nonexistent.html",
    });

    expect(file).toBeNull();
  });

  test("getFileByPath returns null for deleted files", async () => {
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
        number: 1,
        createdBy: userId,
        fileType: "zip",
        entryPoint: "index.html",
        fileSize: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      })
    );

    const mockStorageId = "kg2test000001;_storage" as Id<"_storage">;
    await t.run(async (ctx) =>
      ctx.db.insert("artifactFiles", {
        versionId,
        filePath: "deleted.html",
        storageId: mockStorageId,
        mimeType: "text/html",
        fileSize: 500,
        isDeleted: true,
        deletedAt: Date.now(),
      })
    );

    const file = await t.query(internal.artifacts.getFileByPath, {
      versionId,
      filePath: "deleted.html",
    });

    expect(file).toBeNull();
  });

  test("getFileByPath retrieves nested path files", async () => {
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
        number: 1,
        createdBy: userId,
        fileType: "zip",
        entryPoint: "index.html",
        fileSize: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      })
    );

    const mockStorageId = "kg2test000002;_storage" as Id<"_storage">;
    await t.run(async (ctx) =>
      ctx.db.insert("artifactFiles", {
        versionId,
        filePath: "assets/images/logo.png",
        storageId: mockStorageId,
        mimeType: "image/png",
        fileSize: 2000,
        isDeleted: false,
      })
    );

    const file = await t.query(internal.artifacts.getFileByPath, {
      versionId,
      filePath: "assets/images/logo.png",
    });

    expect(file).toBeDefined();
    expect(file?.mimeType).toBe("image/png");
  });
});

describe("ZIP Serving - MIME Type Verification", () => {
  test("getMimeType returns correct types for web assets", async () => {
    const { getMimeType } = await import("../lib/mimeTypes");

    // HTML
    expect(getMimeType("index.html")).toBe("text/html");
    expect(getMimeType("page.htm")).toBe("text/html");

    // CSS
    expect(getMimeType("styles.css")).toBe("text/css");

    // JavaScript
    expect(getMimeType("app.js")).toBe("application/javascript");
    expect(getMimeType("module.mjs")).toBe("application/javascript");
    expect(getMimeType("types.ts")).toBe("application/typescript");

    // JSON
    expect(getMimeType("data.json")).toBe("application/json");
    expect(getMimeType("app.map")).toBe("application/json");

    // Data formats
    expect(getMimeType("data.csv")).toBe("text/csv");
    expect(getMimeType("config.xml")).toBe("application/xml");

    // Images
    expect(getMimeType("logo.png")).toBe("image/png");
    expect(getMimeType("photo.jpg")).toBe("image/jpeg");
    expect(getMimeType("photo.jpeg")).toBe("image/jpeg");
    expect(getMimeType("icon.svg")).toBe("image/svg+xml");
    expect(getMimeType("image.webp")).toBe("image/webp");
    expect(getMimeType("favicon.ico")).toBe("image/x-icon");
    expect(getMimeType("animation.gif")).toBe("image/gif");
    expect(getMimeType("modern.avif")).toBe("image/avif");

    // Fonts
    expect(getMimeType("font.woff")).toBe("font/woff");
    expect(getMimeType("font.woff2")).toBe("font/woff2");
    expect(getMimeType("font.ttf")).toBe("font/ttf");
    expect(getMimeType("font.otf")).toBe("font/otf");

    // Unknown - fallback
    expect(getMimeType("unknown.xyz")).toBe("application/octet-stream");
  });

  test("getMimeType handles uppercase extensions", async () => {
    const { getMimeType } = await import("../lib/mimeTypes");

    expect(getMimeType("INDEX.HTML")).toBe("text/html");
    expect(getMimeType("STYLES.CSS")).toBe("text/css");
    expect(getMimeType("APP.JS")).toBe("application/javascript");
    expect(getMimeType("LOGO.PNG")).toBe("image/png");
  });

  test("getMimeType handles paths with directories", async () => {
    const { getMimeType } = await import("../lib/mimeTypes");

    expect(getMimeType("assets/styles/main.css")).toBe("text/css");
    expect(getMimeType("scripts/vendor/chart.js")).toBe("application/javascript");
    expect(getMimeType("images/icons/logo.png")).toBe("image/png");
  });
});

describe("ZIP Serving - Version and Entry Point", () => {
  test("getVersionByNumberInternal returns version with entryPoint", async () => {
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
        number: 1,
        createdBy: userId,
        fileType: "zip",
        entryPoint: "v1/index.html",
        fileSize: 1000,
        isDeleted: false,
        createdAt: Date.now(),
      })
    );

    const version = await t.query(internal.artifacts.getVersionByNumberInternal, {
      artifactId,
      number: 1,
    });

    expect(version).toBeDefined();
    expect(version?.entryPoint).toBe("v1/index.html");
    expect(version?.fileType).toBe("zip");
  });

  test("getByShareTokenInternal returns artifact for valid token", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Test Artifact",
        creatorId: userId,
        shareToken: "testtkn1",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const artifact = await t.query(internal.artifacts.getByShareTokenInternal, {
      shareToken: "testtkn1",
    });

    expect(artifact).toBeDefined();
    expect(artifact?.title).toBe("Test Artifact");
    expect(artifact?.shareToken).toBe("testtkn1");
  });

  test("getByShareTokenInternal returns null for deleted artifact", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "test@example.com" })
    );

    await t.run(async (ctx) =>
      ctx.db.insert("artifacts", {
        title: "Deleted Artifact",
        creatorId: userId,
        shareToken: "deleted1",
        isDeleted: true,
        deletedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const artifact = await t.query(internal.artifacts.getByShareTokenInternal, {
      shareToken: "deleted1",
    });

    expect(artifact).toBeNull();
  });
});
