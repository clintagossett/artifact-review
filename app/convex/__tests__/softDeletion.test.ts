import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("soft deletion", () => {
  describe("softDelete artifact", () => {
    it("should soft delete artifact and cascade to versions and files", async () => {
      const t = convexTest(schema);

      // Create a user
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Create artifact with v1
      const result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html" as const,
        content: "<html>v1</html>",
      });

      // Add v2
      await asUser.action(api.artifacts.addVersion, {
        artifactId: result.artifactId,
        fileType: "html" as const,
        content: "<html>v2</html>",
      });

      // Soft delete the artifact
      await asUser.mutation(api.artifacts.softDelete, {
        id: result.artifactId,
      });

      // Verify artifact is soft deleted
      const artifact = await asUser.query(api.artifacts.get, {
        id: result.artifactId,
      });

      expect(artifact?.isDeleted).toBe(true);
      expect(artifact?.deletedAt).toBeDefined();

      // Verify artifact no longer appears in list
      const artifacts = await asUser.query(api.artifacts.list);
      expect(artifacts).toHaveLength(0);

      // Verify all versions are soft deleted (cascade)
      const versions = await t.run(async (ctx) => {
        return await ctx.db
          .query("artifactVersions")
          .withIndex("by_artifactId", (q) => q.eq("artifactId", result.artifactId))
          .collect();
      });

      expect(versions).toHaveLength(2);
      expect(versions[0].isDeleted).toBe(true);
      expect(versions[1].isDeleted).toBe(true);
    });
  });

  describe("softDeleteVersion", () => {
    it("should soft delete specific version only", async () => {
      const t = convexTest(schema);

      // Create a user
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Create artifact with v1
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

      // Soft delete v2 only
      await asUser.mutation(api.artifacts.softDeleteVersion, {
        versionId: v2Result.versionId,
      });

      // Verify v2 is deleted
      const v2 = await asUser.query(api.artifacts.getVersion, {
        versionId: v2Result.versionId,
      });
      expect(v2?.isDeleted).toBe(true);

      // Verify v1 is still active
      const v1 = await asUser.query(api.artifacts.getVersion, {
        versionId: v1Result.versionId,
      });
      expect(v1?.isDeleted).toBe(false);

      // Verify artifact is still active
      const artifact = await asUser.query(api.artifacts.get, {
        id: v1Result.artifactId,
      });
      expect(artifact?.isDeleted).toBe(false);
    });

    it("should prevent deleting the last active version", async () => {
      const t = convexTest(schema);

      // Create a user
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Create artifact with v1 only
      const v1Result = await asUser.action(api.artifacts.create, {
        name: "Test Artifact",
        fileType: "html" as const,
        content: "<html>v1</html>",
      });

      // Try to delete the only version - should fail
      await expect(
        asUser.mutation(api.artifacts.softDeleteVersion, {
          versionId: v1Result.versionId,
        })
      ).rejects.toThrow("Cannot delete the last active version");
    });
  });
});
