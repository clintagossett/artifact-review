import { convexTest } from "convex-test";
import { describe, it, expect, vi } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

describe("zipUpload", () => {
  describe("createArtifactWithZip", () => {
    it("should create artifact and version with ZIP type and return upload URL", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          });
      });

      // Create as authenticated user
      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test ZIP Artifact",
        description: "A test artifact with ZIP file",
        fileSize: 12345,
        entryPoint: "index.html",
      });

      // Should return upload URL and IDs
      expect(result.uploadUrl).toBeDefined();
      expect(result.uploadUrl).toContain("https://");
      expect(result.artifactId).toBeDefined();
      expect(result.versionId).toBeDefined();
      expect(result.shareToken).toBeDefined();
      expect(result.shareToken).toHaveLength(8);

      // Verify artifact was created
      const artifact = await t.run(async (ctx) => {
        return await ctx.db.get(result.artifactId);
      });

      expect(artifact).toBeDefined();
      expect(artifact?.title).toBe("Test ZIP Artifact");
      expect(artifact?.description).toBe("A test artifact with ZIP file");
      expect(artifact?.creatorId).toBe(userId);
      expect(artifact?.shareToken).toBe(result.shareToken);
      expect(artifact?.isDeleted).toBe(false);

      // Verify version was created with ZIP type
      const version = await t.run(async (ctx) => {
        return await ctx.db.get(result.versionId);
      });

      expect(version).toBeDefined();
      expect(version?.artifactId).toBe(result.artifactId);
      expect(version?.versionNumber).toBe(1);
      expect(version?.fileType).toBe("zip");
      expect(version?.entryPoint).toBe("index.html");
      expect(version?.fileSize).toBe(12345);
      expect(version?.isDeleted).toBe(false);
    });

    it("should create artifact without optional entryPoint", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          });
      });

      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        title: "ZIP without entry point",
        fileSize: 5000,
      });

      expect(result.uploadUrl).toBeDefined();
      expect(result.artifactId).toBeDefined();
      expect(result.versionId).toBeDefined();

      // Verify version was created without entry point
      const version = await t.run(async (ctx) => {
        return await ctx.db.get(result.versionId);
      });

      expect(version?.entryPoint).toBeUndefined();
    });

    it("should throw error if user is not authenticated", async () => {
      const t = convexTest(schema);

      // Try to create without authentication
      await expect(
        t.mutation(api.zipUpload.createArtifactWithZip, {
          title: "Test ZIP",
          fileSize: 1000,
        })
      ).rejects.toThrow("Not authenticated");
    });

    it("should create unique share tokens for different artifacts", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Create two artifacts
      const result1 = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        title: "ZIP 1",
        fileSize: 1000,
      });

      const result2 = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        title: "ZIP 2",
        fileSize: 2000,
      });

      // Share tokens should be different
      expect(result1.shareToken).not.toBe(result2.shareToken);
    });
  });

  describe("triggerZipProcessing", () => {
    it("should be exported as a public action from zipUpload module", () => {
      // Verify the action exists and is accessible via API
      expect(api.zipUpload.triggerZipProcessing).toBeDefined();
    });

    // Note: Full integration test with actual storage upload is covered by:
    // 1. Manual testing via Convex dashboard (see test-report.md)
    // 2. E2E tests when implemented in Phase 3
    // convex-test has limitations with storage operations that make
    // full action testing impractical in unit tests
  });
});
