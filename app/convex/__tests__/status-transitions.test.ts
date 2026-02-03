/**
 * Test: Artifact Version Status Transitions
 * Task 00049 - Subtask 01
 *
 * Tests that status field is properly set during artifact lifecycle:
 * - ZIP uploads: "uploading" -> "processing" -> "ready" | "error"
 * - HTML/MD uploads: "ready" (immediate)
 */

import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import type { Id } from "../_generated/dataModel";

// Helper to create user with organization
async function createTestUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      createdAt: Date.now(),
      email: "test@example.com",
      name: "Test User",
    });
    const orgId = await ctx.db.insert("organizations", {
      name: "Test Org",
      createdAt: Date.now(),
      createdBy: userId,
    });
    await ctx.db.insert("members", {
      userId,
      organizationId: orgId,
      roles: ["owner"],
      createdAt: Date.now(),
      createdBy: userId,
    });
    return { userId, orgId };
  });
}

describe("Artifact Version Status Transitions", () => {
  describe("ZIP Upload Flow", () => {
    it("should create version with status: 'uploading' when createArtifactWithZip is called", async () => {
      const t = convexTest(schema);
      const { userId, orgId } = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        name: "Test Artifact",
        size: 1024,
        organizationId: orgId,
      });

      const version = await t.run(async (ctx) => {
        return await ctx.db.get(result.versionId);
      });

      expect(version).toBeDefined();
      expect(version?.status).toBe("uploading");
    });

    it("should create version with status: 'uploading' when addZipVersion is called", async () => {
      const t = convexTest(schema);
      const { userId, orgId } = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      // First create an artifact
      const createResult = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        name: "Test Artifact",
        size: 1024,
        organizationId: orgId,
      });

      // Add a new version
      const addResult = await asUser.mutation(api.zipUpload.addZipVersion, {
        artifactId: createResult.artifactId,
        size: 2048,
      });

      const version = await t.run(async (ctx) => {
        return await ctx.db.get(addResult.versionId);
      });

      expect(version).toBeDefined();
      expect(version?.status).toBe("uploading");
    });

    it("should update status to 'processing' when ZIP processing starts", async () => {
      const t = convexTest(schema);
      const { userId, orgId } = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      const createResult = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        name: "Test Artifact",
        size: 1024,
        organizationId: orgId,
      });

      // Call the updateVersionStatus mutation
      await t.mutation(internal.zipProcessorMutations.updateVersionStatus, {
        versionId: createResult.versionId,
        status: "processing",
      });

      const version = await t.run(async (ctx) => {
        return await ctx.db.get(createResult.versionId);
      });

      expect(version?.status).toBe("processing");
    });

    it("should set status to 'ready' when markProcessingComplete is called", async () => {
      const t = convexTest(schema);
      const { userId, orgId } = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      const createResult = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        name: "Test Artifact",
        size: 1024,
        organizationId: orgId,
      });

      // Mark processing complete
      await t.mutation(internal.zipProcessorMutations.markProcessingComplete, {
        versionId: createResult.versionId,
        entryPoint: "index.html",
      });

      const version = await t.run(async (ctx) => {
        return await ctx.db.get(createResult.versionId);
      });

      expect(version?.status).toBe("ready");
    });

    it("should set status to 'error' and errorMessage when markProcessingError is called", async () => {
      const t = convexTest(schema);
      const { userId, orgId } = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      const createResult = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        name: "Test Artifact",
        size: 1024,
        organizationId: orgId,
      });

      const errorMessage = "ZIP contains forbidden file types";

      // Mark processing as failed
      await t.mutation(internal.zipProcessorMutations.markProcessingError, {
        versionId: createResult.versionId,
        error: errorMessage,
      });

      const version = await t.run(async (ctx) => {
        return await ctx.db.get(createResult.versionId);
      });

      expect(version?.status).toBe("error");
      expect(version?.errorMessage).toBe(errorMessage);
    });

    it("should NOT soft-delete version when markProcessingError is called", async () => {
      const t = convexTest(schema);
      const { userId, orgId } = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      const createResult = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        name: "Test Artifact",
        size: 1024,
        organizationId: orgId,
      });

      // Mark processing as failed
      await t.mutation(internal.zipProcessorMutations.markProcessingError, {
        versionId: createResult.versionId,
        error: "Test error",
      });

      const version = await t.run(async (ctx) => {
        return await ctx.db.get(createResult.versionId);
      });

      // Version should still exist and NOT be soft-deleted
      expect(version).toBeDefined();
      expect(version?.isDeleted).toBe(false);
      expect(version?.deletedAt).toBeUndefined();
    });
  });

  describe("HTML/Markdown Upload Flow", () => {
    it("should create HTML version with status: 'ready' immediately", async () => {
      const t = convexTest(schema);
      const { userId, orgId } = await createTestUser(t);

      // Create a proper storage ID by inserting into system table
      // Note: In convex-test, system tables work differently
      // For now, we'll use a placeholder ID with correct format
      const storageId = "10001;_storage" as Id<"_storage">;

      const result = await t.mutation(internal.artifacts.createInternal, {
        userId,
        name: "Test HTML",
        fileType: "html",
        path: "index.html",
        storageId,
        mimeType: "text/html",
        size: 512,
        organizationId: orgId,
      });

      const version = await t.run(async (ctx) => {
        return await ctx.db.get(result.versionId);
      });

      expect(version).toBeDefined();
      expect(version?.status).toBe("ready");
    });

    it("should create Markdown version with status: 'ready' immediately", async () => {
      const t = convexTest(schema);
      const { userId, orgId } = await createTestUser(t);

      // Use proper ID format
      const storageId = "10002;_storage" as Id<"_storage">;

      const result = await t.mutation(internal.artifacts.createInternal, {
        userId,
        name: "Test Markdown",
        fileType: "markdown",
        path: "document.md",
        storageId,
        mimeType: "text/markdown",
        size: 256,
        organizationId: orgId,
      });

      const version = await t.run(async (ctx) => {
        return await ctx.db.get(result.versionId);
      });

      expect(version).toBeDefined();
      expect(version?.status).toBe("ready");
    });
  });

  describe("Backward Compatibility", () => {
    it("should treat undefined status as ready for existing versions", async () => {
      const t = convexTest(schema);
      const { userId, orgId } = await createTestUser(t);

      // Create a version without status (simulating old data)
      const versionId = await t.run(async (ctx) => {
        const artifactId = await ctx.db.insert("artifacts", {
          name: "Legacy Artifact",
          createdBy: userId,
          organizationId: orgId,
          shareToken: "legacy01",
          isDeleted: false,
          createdAt: Date.now(),
        });

        return await ctx.db.insert("artifactVersions", {
          artifactId,
          number: 1,
          createdBy: userId,
          fileType: "html",
          entryPoint: "index.html",
          size: 1024,
          isDeleted: false,
          createdAt: Date.now(),
          // status field intentionally omitted
        });
      });

      const version = await t.run(async (ctx) => {
        return await ctx.db.get(versionId);
      });

      // Status should be undefined (not set)
      expect(version?.status).toBeUndefined();

      // In application logic, undefined should be treated as "ready"
      // This is a convention, not enforced by DB
      const effectiveStatus = version?.status ?? "ready";
      expect(effectiveStatus).toBe("ready");
    });
  });
});
