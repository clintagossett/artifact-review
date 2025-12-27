import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("artifacts", () => {
  describe("create", () => {
    it("should create artifact with HTML content and generate v1", async () => {
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

      const htmlContent = "<html><body><h1>Test Artifact</h1></body></html>";

      const result = await asUser.mutation(api.artifacts.create, {
        title: "Test HTML Artifact",
        description: "A test artifact with HTML content",
        fileType: "html" as const,
        htmlContent,
        fileSize: htmlContent.length,
      });

      // Should return artifact ID and version info
      expect(result.artifactId).toBeDefined();
      expect(result.versionId).toBeDefined();
      expect(result.versionNumber).toBe(1);
      expect(result.shareToken).toBeDefined();
      expect(result.shareToken).toHaveLength(8);

      // Verify artifact was created
      const artifact = await asUser.query(api.artifacts.get, {
        id: result.artifactId
      });

      expect(artifact).toBeDefined();
      expect(artifact?.title).toBe("Test HTML Artifact");
      expect(artifact?.description).toBe("A test artifact with HTML content");
      expect(artifact?.shareToken).toBe(result.shareToken);
      expect(artifact?.isDeleted).toBe(false);

      // Verify version was created
      const version = await asUser.query(api.artifacts.getVersion, {
        versionId: result.versionId,
      });

      expect(version).toBeDefined();
      expect(version?.versionNumber).toBe(1);
      expect(version?.fileType).toBe("html");
      expect(version?.htmlContent).toBe(htmlContent);
      expect(version?.fileSize).toBe(htmlContent.length);
      expect(version?.isDeleted).toBe(false);
    });

    it("should create artifact with Markdown content and generate v1", async () => {
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

      const markdownContent = "# Test Artifact\n\nThis is a **test** markdown document.";

      const result = await asUser.mutation(api.artifacts.create, {
        title: "Test Markdown Artifact",
        description: "A test artifact with Markdown content",
        fileType: "markdown" as const,
        markdownContent,
        fileSize: markdownContent.length,
      });

      // Should return artifact ID and version info
      expect(result.artifactId).toBeDefined();
      expect(result.versionId).toBeDefined();
      expect(result.versionNumber).toBe(1);
      expect(result.shareToken).toBeDefined();
      expect(result.shareToken).toHaveLength(8);

      // Verify version was created with markdown content
      const version = await asUser.query(api.artifacts.getVersion, {
        versionId: result.versionId,
      });

      expect(version).toBeDefined();
      expect(version?.versionNumber).toBe(1);
      expect(version?.fileType).toBe("markdown");
      expect(version?.markdownContent).toBe(markdownContent);
      expect(version?.fileSize).toBe(markdownContent.length);
      expect(version?.isDeleted).toBe(false);
    });
  });

  describe("list", () => {
    it("should list only user's own artifacts", async () => {
      const t = convexTest(schema);

      // Create two users
      const user1Id = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "user1@example.com",
          name: "User 1",
          isAnonymous: false,
        });
      });

      const user2Id = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "user2@example.com",
          name: "User 2",
          isAnonymous: false,
        });
      });

      const asUser1 = t.withIdentity({ subject: user1Id });
      const asUser2 = t.withIdentity({ subject: user2Id });

      // User 1 creates 2 artifacts
      await asUser1.mutation(api.artifacts.create, {
        title: "User 1 Artifact 1",
        fileType: "html" as const,
        htmlContent: "<html>1</html>",
        fileSize: 100,
      });

      await asUser1.mutation(api.artifacts.create, {
        title: "User 1 Artifact 2",
        fileType: "html" as const,
        htmlContent: "<html>2</html>",
        fileSize: 100,
      });

      // User 2 creates 1 artifact
      await asUser2.mutation(api.artifacts.create, {
        title: "User 2 Artifact 1",
        fileType: "html" as const,
        htmlContent: "<html>3</html>",
        fileSize: 100,
      });

      // User 1 should see only their 2 artifacts
      const user1Artifacts = await asUser1.query(api.artifacts.list);
      expect(user1Artifacts).toHaveLength(2);
      expect(user1Artifacts[0].title).toBe("User 1 Artifact 1");
      expect(user1Artifacts[1].title).toBe("User 1 Artifact 2");

      // User 2 should see only their 1 artifact
      const user2Artifacts = await asUser2.query(api.artifacts.list);
      expect(user2Artifacts).toHaveLength(1);
      expect(user2Artifacts[0].title).toBe("User 2 Artifact 1");
    });
  });

  describe("addVersion", () => {
    it("should add version 2 to existing artifact", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          isAnonymous: false,
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Create v1
      const v1Result = await asUser.mutation(api.artifacts.create, {
        title: "Test Artifact",
        fileType: "html" as const,
        htmlContent: "<html>v1</html>",
        fileSize: 100,
      });

      // Add v2
      const v2Result = await asUser.mutation(api.artifacts.addVersion, {
        artifactId: v1Result.artifactId,
        fileType: "html" as const,
        htmlContent: "<html>v2</html>",
        fileSize: 100,
      });

      expect(v2Result.versionNumber).toBe(2);

      // Verify v2 exists
      const v2 = await asUser.query(api.artifacts.getVersion, {
        versionId: v2Result.versionId,
      });

      expect(v2?.versionNumber).toBe(2);
      expect(v2?.htmlContent).toBe("<html>v2</html>");
    });
  });
});
