import { convexTest } from "convex-test";
import { describe, it, expect, vi } from "vitest";
import { api, internal } from "../../../app/convex/_generated/api";
import schema from "../../../app/convex/schema";

describe("zipUpload", () => {
  describe("createArtifactWithZip", () => {
    it("should create artifact and version with ZIP type and return upload URL", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          isAnonymous: false,
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
          isAnonymous: false,
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
          isAnonymous: false,
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
    it("should call processZipFile internal action", async () => {
      const t = convexTest(schema);

      // Create a user and artifact
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          isAnonymous: false,
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const createResult = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test ZIP",
        fileSize: 1000,
      });

      // Create a mock storage ID (in real scenario, this comes from uploaded file)
      const storageId = await t.run(async (ctx) => {
        // Create a test blob and store it
        const blob = new Blob(["test zip content"], { type: "application/zip" });
        return await ctx.storage.store(blob);
      });

      // Trigger processing - this should call the internal action
      // Note: In convex-test, internal actions may not execute fully,
      // but we can verify the call doesn't throw an error
      await expect(
        asUser.action(api.zipUpload.triggerZipProcessing, {
          versionId: createResult.versionId,
          storageId,
        })
      ).resolves.toBeNull();
    });

    it("should accept valid versionId and storageId", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          isAnonymous: false,
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Create artifact with ZIP
      const createResult = await asUser.mutation(api.zipUpload.createArtifactWithZip, {
        title: "Test ZIP",
        fileSize: 1000,
      });

      // Create storage
      const storageId = await t.run(async (ctx) => {
        const blob = new Blob(["test"], { type: "application/zip" });
        return await ctx.storage.store(blob);
      });

      // Should not throw with valid IDs
      const result = await asUser.action(api.zipUpload.triggerZipProcessing, {
        versionId: createResult.versionId,
        storageId,
      });

      expect(result).toBeNull();
    });
  });
});
