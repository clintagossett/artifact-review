import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

describe("zipProcessor", () => {
  // Note: Full ZIP processing with file storage is tested in E2E tests
  // convex-test has limitations with storage.store in mutations

  describe("markProcessingComplete", () => {
    it.skip("should update version with entry point", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Create artifact and version - Note: create action rejects ZIP, use zipUpload instead
      const result = await asUser.action(api.artifacts.create, {
        name: "Test ZIP Artifact",
        description: "A test artifact with ZIP content",
        fileType: "html" as const, // Changed from zip since create rejects ZIP
        content: "<html><body>Test</body></html>",
      });

      // Mark processing complete with entry point
      await t.mutation(internal.zipProcessorMutations.markProcessingComplete, {
        versionId: result.versionId,
        entryPoint: "index.html",
      });

      // Verify version was updated
      const version = await asUser.query(api.artifacts.getVersion, {
        versionId: result.versionId,
      });

      expect(version?.entryPoint).toBe("index.html");
    });
  });
});
