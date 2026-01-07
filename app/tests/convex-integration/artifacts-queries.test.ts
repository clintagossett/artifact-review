// @vitest-environment node
/**
 * Tests for artifact viewing queries (Task 00011 Subtask 02)
 *
 * Tests the public and internal queries needed for presenting
 * artifact versions to users via share tokens.
 */

import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { Id } from "../_generated/dataModel";
import schema from "../../convex/schema";

// Helper to create a test user
async function createTestUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", { createdAt: Date.now(),
      email: "test@example.com",
      name: "Test User",
    });
  });
}

describe("Artifact Viewing Queries", () => {
  describe("getByShareToken", () => {
    it("should return artifact when found by share token", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", { createdAt: Date.now(),
          email: "test@example.com",
          name: "Test User",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Create artifact
      const result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        description: "Test description",
        fileType: "html",
        content: "<h1>Hello</h1>",
      });

      // Get by share token
      const artifact = await t.query(api.artifacts.getByShareToken, {
        shareToken: result.shareToken,
      });

      expect(artifact).toBeDefined();
      expect(artifact?.name).toBe("Test Artifact");
      expect(artifact?.shareToken).toBe(result.shareToken);
    });

    it("should return null for invalid share token", async () => {
      const t = convexTest(schema);

      const artifact = await t.query(api.artifacts.getByShareToken, {
        shareToken: "invalid-token",
      });

      expect(artifact).toBeNull();
    });

    it("should return null for deleted artifacts", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      // Create and delete artifact
      const result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html",
        content: "<h1>Hello</h1>",
      });

      await asUser.mutation(api.artifacts.softDelete, {
        id: result.artifactId,
      });

      // Should return null for deleted artifact
      const artifact = await t.query(api.artifacts.getByShareToken, {
        shareToken: result.shareToken,
      });

      expect(artifact).toBeNull();
    });
  });

  describe("getVersions", () => {
    it("should return all versions for an artifact", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      // Create artifact with version 1
      const result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html",
        content: "<h1>V1</h1>",
      });

      // Add version 2
      await asUser.action(api.artifacts.addVersion, {
        artifactId: result.artifactId,
        fileType: "html",
        content: "<h1>V2</h1>",
      });

      // Add version 3
      await asUser.action(api.artifacts.addVersion, {
        artifactId: result.artifactId,
        fileType: "html",
        content: "<h1>V3</h1>",
      });

      // Get all versions
      const versions = await t.query(api.artifacts.getVersions, {
        artifactId: result.artifactId,
      });

      expect(versions).toHaveLength(3);
      expect(versions[0].number).toBe(3); // Descending order
      expect(versions[1].number).toBe(2);
      expect(versions[2].number).toBe(1);
    });

    it("should not return deleted versions", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      // Create artifact with 2 versions
      const result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html",
        content: "<h1>V1</h1>",
      });

      const v2 = await asUser.action(api.artifacts.addVersion, {
        artifactId: result.artifactId,
        fileType: "html",
        content: "<h1>V2</h1>",
      });

      // Delete version 2
      await asUser.mutation(api.artifacts.softDeleteVersion, {
        versionId: v2.versionId,
      });

      // Should only return version 1
      const versions = await t.query(api.artifacts.getVersions, {
        artifactId: result.artifactId,
      });

      expect(versions).toHaveLength(1);
      expect(versions[0].number).toBe(1);
    });
  });

  describe("getVersionByNumber", () => {
    it("should return specific version by artifact and version number", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      // Create artifact with multiple versions
      const result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html",
        content: "<h1>V1</h1>",
      });

      await asUser.action(api.artifacts.addVersion, {
        artifactId: result.artifactId,
        fileType: "html",
        content: "<h1>V2</h1>",
      });

      // Get version 2 specifically
      const version = await t.query(api.artifacts.getVersionByNumber, {
        artifactId: result.artifactId,
        number: 2,
      });

      expect(version).toBeDefined();
      expect(version?.number).toBe(2);
      // TODO: Phase 2 - Content is now in blob storage, not inline
      // expect(version?.htmlContent).toBe("<h1>V2</h1>");
    });

    it("should return null for non-existent version number", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html",
        content: "<h1>V1</h1>",
      });

      const version = await t.query(api.artifacts.getVersionByNumber, {
        artifactId: result.artifactId,
        number: 99,
      });

      expect(version).toBeNull();
    });

    it("should return null for deleted version", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      // Create 2 versions
      const result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html",
        content: "<h1>V1</h1>",
      });

      const v2 = await asUser.action(api.artifacts.addVersion, {
        artifactId: result.artifactId,
        fileType: "html",
        content: "<h1>V2</h1>",
      });

      // Delete version 2
      await asUser.mutation(api.artifacts.softDeleteVersion, {
        versionId: v2.versionId,
      });

      // Should return null
      const version = await t.query(api.artifacts.getVersionByNumber, {
        artifactId: result.artifactId,
        number: 2,
      });

      expect(version).toBeNull();
    });
  });

  describe("getLatestVersion", () => {
    it("should return the highest version number", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html",
        content: "<h1>V1</h1>",
      });

      await asUser.action(api.artifacts.addVersion, {
        artifactId: result.artifactId,
        fileType: "html",
        content: "<h1>V2</h1>",
      });

      await asUser.action(api.artifacts.addVersion, {
        artifactId: result.artifactId,
        fileType: "html",
        content: "<h1>V3</h1>",
      });

      const latest = await t.query(api.artifacts.getLatestVersion, {
        artifactId: result.artifactId,
      });

      expect(latest).toBeDefined();
      expect(latest?.number).toBe(3);
      // TODO: Phase 2 - Content is now in blob storage, not inline
      // expect(latest?.htmlContent).toBe("<h1>V3</h1>");
    });

    it("should skip deleted versions when finding latest", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      const result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html",
        content: "<h1>V1</h1>",
      });

      await asUser.action(api.artifacts.addVersion, {
        artifactId: result.artifactId,
        fileType: "html",
        content: "<h1>V2</h1>",
      });

      const v3 = await asUser.action(api.artifacts.addVersion, {
        artifactId: result.artifactId,
        fileType: "html",
        content: "<h1>V3</h1>",
      });

      // Delete version 3
      await asUser.mutation(api.artifacts.softDeleteVersion, {
        versionId: v3.versionId,
      });

      // Should return version 2 as latest
      const latest = await t.query(api.artifacts.getLatestVersion, {
        artifactId: result.artifactId,
      });

      expect(latest?.number).toBe(2);
    });
  });

  describe("listHtmlFiles", () => {
    it.skip("should return all HTML files for a zip version", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      // Create html artifact (ZIP not supported by create action)
      const result = await asUser.action(api.artifacts.create, {
        name: "Test Zip",
        fileType: "html",
        content: "<html><body>Test</body></html>",
      });

      // We'll need to add files to artifactFiles table
      // This will be tested after we implement file storage in upload
      // For now, test that it returns empty array for zip with no files
      const htmlFiles = await t.query(api.artifacts.listHtmlFiles, {
        versionId: result.versionId,
      });

      expect(htmlFiles).toEqual([]);
    });
  });

  describe("getFileByPath (internal)", () => {
    it.skip("should return null for non-existent file", async () => {
      const t = convexTest(schema);
      const userId = await createTestUser(t);
      const asUser = t.withIdentity({ subject: userId });

      // Create artifact to get valid versionId
      const result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html",
        content: "<html><body>Test</body></html>",
      });

      // Query for non-existent file path
      const file = await t.query(internal.artifacts.getFileByPath, {
        versionId: result.versionId,
        path: "assets/logo.png",
      });

      expect(file).toBeNull();
    });
  });
});
