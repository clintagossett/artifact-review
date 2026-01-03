import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../../../app/convex/_generated/api";
import schema from "../../../../app/convex/schema";

describe("artifacts", () => {
  describe("create", () => {
    it("should create artifact with HTML content and generate v1", async () => {
      const t = convexTest(schema);

      // Create as authenticated user
      const asUser = t.withIdentity({
        name: "Test User",
        email: "test@example.com"
      });

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
  });
});
