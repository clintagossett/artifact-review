// @vitest-environment node
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

console.log("DEBUG: Blob type:", typeof Blob);
if (typeof Blob !== 'undefined') {
  console.log("DEBUG: Blob prototype arrayBuffer:", typeof Blob.prototype.arrayBuffer);
}

describe("artifacts", () => {
  describe("create", () => {
    it("should create artifact with HTML content and generate v1", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          createdAt: Date.now(),
          email: "test@example.com",
          name: "Test User",
        });
      });

      // Create as authenticated user
      const asUser = t.withIdentity({ subject: userId });

      const htmlContent = "<html><body><h1>Test Artifact</h1></body></html>";

      const result = await asUser.action(api.artifacts.create, {
        name: "Test HTML Artifact",
        description: "A test artifact with HTML content",
        fileType: "html" as const,
        content: htmlContent,
      });

      // Should return artifact ID and version info
      expect(result.artifactId).toBeDefined();
      expect(result.versionId).toBeDefined();
      expect(result.number).toBe(1);
      expect(result.shareToken).toBeDefined();
      expect(result.shareToken).toHaveLength(8);

      // Verify artifact was created
      const artifact = await asUser.query(api.artifacts.get, {
        id: result.artifactId
      });

      expect(artifact).toBeDefined();
      expect(artifact?.name).toBe("Test HTML Artifact");
      expect(artifact?.description).toBe("A test artifact with HTML content");
      expect(artifact?.shareToken).toBe(result.shareToken);
      expect(artifact?.isDeleted).toBe(false);

      // Verify version was created
      const version = await asUser.query(api.artifacts.getVersion, {
        versionId: result.versionId,
      });

      expect(version).toBeDefined();
      expect(version?.number).toBe(1);
      expect(version?.fileType).toBe("html");
      // Content now stored in blob storage, not inline
      // expect(version?.htmlContent).toBe(htmlContent);
      expect(version?.size).toBe(htmlContent.length);
      expect(version?.isDeleted).toBe(false);
    });

    it("should create artifact with Markdown content and generate v1", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          createdAt: Date.now(),
          email: "test@example.com",
          name: "Test User",
        });
      });

      // Create as authenticated user
      const asUser = t.withIdentity({ subject: userId });

      const markdownContent = "# Test Artifact\n\nThis is a **test** markdown document.";

      const result = await asUser.action(api.artifacts.create, {
        name: "Test Markdown Artifact",
        description: "A test artifact with Markdown content",
        fileType: "markdown" as const,
        content: markdownContent,
      });

      // Should return artifact ID and version info
      expect(result.artifactId).toBeDefined();
      expect(result.versionId).toBeDefined();
      expect(result.number).toBe(1);
      expect(result.shareToken).toBeDefined();
      expect(result.shareToken).toHaveLength(8);

      // Verify version was created with markdown content
      const version = await asUser.query(api.artifacts.getVersion, {
        versionId: result.versionId,
      });

      expect(version).toBeDefined();
      expect(version?.number).toBe(1);
      expect(version?.fileType).toBe("markdown");
      // Content now stored in blob storage, not inline
      // expect(version?.markdownContent).toBe(markdownContent);
      expect(version?.size).toBe(markdownContent.length);
      expect(version?.isDeleted).toBe(false);
    });
  });

  describe("list", () => {
    it("should list only user's own artifacts", async () => {
      const t = convexTest(schema);

      // Create two users
      const user1Id = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          createdAt: Date.now(),
          email: "user1@example.com",
          name: "User 1",
        });
      });

      const user2Id = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          createdAt: Date.now(),
          email: "user2@example.com",
          name: "User 2",
        });
      });

      const asUser1 = t.withIdentity({ subject: user1Id });
      const asUser2 = t.withIdentity({ subject: user2Id });

      // User 1 creates 2 artifacts
      await asUser1.action(api.artifacts.create, {
        name: "User 1 Artifact 1",
        fileType: "html" as const,
        content: "<html>1</html>",
      });

      await asUser1.action(api.artifacts.create, {
        name: "User 1 Artifact 2",
        fileType: "html" as const,
        content: "<html>2</html>",
      });

      // User 2 creates 1 artifact
      await asUser2.action(api.artifacts.create, {
        name: "User 2 Artifact 1",
        fileType: "html" as const,
        content: "<html>3</html>",
      });

      // User 1 should see only their 2 artifacts
      const user1Artifacts = await asUser1.query(api.artifacts.list);
      expect(user1Artifacts).toHaveLength(2);
      expect(user1Artifacts[0].name).toBe("User 1 Artifact 1");
      expect(user1Artifacts[1].name).toBe("User 1 Artifact 2");

      // User 2 should see only their 1 artifact
      const user2Artifacts = await asUser2.query(api.artifacts.list);
      expect(user2Artifacts).toHaveLength(1);
      expect(user2Artifacts[0].name).toBe("User 2 Artifact 1");
    });
  });

  describe("addVersion", () => {
    it("should add version 2 to existing artifact", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          createdAt: Date.now(),
          email: "test@example.com",
          name: "Test User",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Create v1
      const v1Result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html" as const,
        content: "<html>v1</html>",
      });

      // Add v2
      const v2Result = await asUser.action(api.artifacts.addVersion, {
        artifactId: v1Result.artifactId,
        fileType: "html" as const,
        content: "<html>v2</html>",
      });

      expect(v2Result.number).toBe(2);

      // Verify v2 exists
      const v2 = await asUser.query(api.artifacts.getVersion, {
        versionId: v2Result.versionId,
      });

      expect(v2?.number).toBe(2);
      // Content now stored in blob storage, not inline
      // expect(v2?.htmlContent).toBe("<html>v2</html>");
    });
  });
});
