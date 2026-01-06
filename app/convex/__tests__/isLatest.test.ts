/**
 * Unit tests for isLatest computation in artifacts.getVersions
 * Task 00021 - Subtask 01: Version Management
 *
 * Tests that the isLatest flag is correctly computed and updated when versions are added/deleted.
 */

import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

describe("isLatest computation", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;
  let artifactId: Id<"artifacts">;

  beforeEach(async () => {
    t = convexTest(schema);

    // Create a test user
    userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        emailVerifiedAt: Date.now(),
      });
    });
  });

  it("should mark the only version as latest", async () => {
    // Create artifact with one version
    const result = await t.run(async (ctx) => {
      const shareToken = "test123";
      const now = Date.now();

      const artifactId = await ctx.db.insert("artifacts", {
        name: "Test Artifact",
        createdBy: userId,
        shareToken,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });

      const versionId = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 1000,
        isDeleted: false,
        createdAt: now,
      });

      return { artifactId, versionId };
    });

    // Get versions and check isLatest
    const versions = await t.query(api.artifacts.getVersions, {
      artifactId: result.artifactId,
    });

    expect(versions).toHaveLength(1);
    expect(versions[0].isLatest).toBe(true);
    expect(versions[0]._id).toEqual(result.versionId);
  });

  it("should mark only the highest version number as latest", async () => {
    // Create artifact with three versions
    const result = await t.run(async (ctx) => {
      const shareToken = "test456";
      const now = Date.now();

      const artifactId = await ctx.db.insert("artifacts", {
        name: "Test Artifact",
        createdBy: userId,
        shareToken,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });

      const version1Id = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 1000,
        isDeleted: false,
        createdAt: now,
      });

      const version2Id = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 2,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 2000,
        isDeleted: false,
        createdAt: now + 1000,
      });

      const version3Id = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 3,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 3000,
        isDeleted: false,
        createdAt: now + 2000,
      });

      return { artifactId, version1Id, version2Id, version3Id };
    });

    // Get versions and check isLatest
    const versions = await t.query(api.artifacts.getVersions, {
      artifactId: result.artifactId,
    });

    expect(versions).toHaveLength(3);

    // Versions are returned in descending order (latest first)
    expect(versions[0].number).toBe(3);
    expect(versions[0].isLatest).toBe(true);
    expect(versions[0]._id).toEqual(result.version3Id);

    expect(versions[1].number).toBe(2);
    expect(versions[1].isLatest).toBe(false);
    expect(versions[1]._id).toEqual(result.version2Id);

    expect(versions[2].number).toBe(1);
    expect(versions[2].isLatest).toBe(false);
    expect(versions[2]._id).toEqual(result.version1Id);
  });

  it("should update isLatest when the latest version is deleted", async () => {
    // Create artifact with three versions
    const result = await t.run(async (ctx) => {
      const shareToken = "test789";
      const now = Date.now();

      const artifactId = await ctx.db.insert("artifacts", {
        name: "Test Artifact",
        createdBy: userId,
        shareToken,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });

      const version1Id = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 1000,
        isDeleted: false,
        createdAt: now,
      });

      const version2Id = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 2,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 2000,
        isDeleted: false,
        createdAt: now + 1000,
      });

      const version3Id = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 3,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 3000,
        isDeleted: false,
        createdAt: now + 2000,
      });

      return { artifactId, version1Id, version2Id, version3Id };
    });

    // Delete version 3 (the latest)
    await t.run(async (ctx) => {
      await ctx.db.patch(result.version3Id, {
        isDeleted: true,
        deletedAt: Date.now(),
        deletedBy: userId,
      });
    });

    // Get versions and check isLatest - version 2 should now be latest
    const versions = await t.query(api.artifacts.getVersions, {
      artifactId: result.artifactId,
    });

    expect(versions).toHaveLength(2); // Only non-deleted versions

    expect(versions[0].number).toBe(2);
    expect(versions[0].isLatest).toBe(true);
    expect(versions[0]._id).toEqual(result.version2Id);

    expect(versions[1].number).toBe(1);
    expect(versions[1].isLatest).toBe(false);
    expect(versions[1]._id).toEqual(result.version1Id);
  });

  it("should return empty array when all versions are deleted", async () => {
    // Create artifact with one version
    const result = await t.run(async (ctx) => {
      const shareToken = "test000";
      const now = Date.now();

      const artifactId = await ctx.db.insert("artifacts", {
        name: "Test Artifact",
        createdBy: userId,
        shareToken,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });

      const versionId = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 1000,
        isDeleted: false,
        createdAt: now,
      });

      // Immediately delete it
      await ctx.db.patch(versionId, {
        isDeleted: true,
        deletedAt: now,
        deletedBy: userId,
      });

      return { artifactId };
    });

    // Get versions - should be empty
    const versions = await t.query(api.artifacts.getVersions, {
      artifactId: result.artifactId,
    });

    expect(versions).toHaveLength(0);
  });

  it("should handle gaps in version numbers correctly", async () => {
    // Create versions 1, 3, 5 (simulate deletions of 2 and 4)
    const result = await t.run(async (ctx) => {
      const shareToken = "testgaps";
      const now = Date.now();

      const artifactId = await ctx.db.insert("artifacts", {
        name: "Test Artifact",
        createdBy: userId,
        shareToken,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });

      const version1Id = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 1000,
        isDeleted: false,
        createdAt: now,
      });

      const version3Id = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 3,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 3000,
        isDeleted: false,
        createdAt: now + 2000,
      });

      const version5Id = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 5,
        createdBy: userId,
        fileType: "html",
        entryPoint: "index.html",
        size: 5000,
        isDeleted: false,
        createdAt: now + 4000,
      });

      return { artifactId, version1Id, version3Id, version5Id };
    });

    // Get versions and check isLatest - version 5 should be latest
    const versions = await t.query(api.artifacts.getVersions, {
      artifactId: result.artifactId,
    });

    expect(versions).toHaveLength(3);

    expect(versions[0].number).toBe(5);
    expect(versions[0].isLatest).toBe(true);

    expect(versions[1].number).toBe(3);
    expect(versions[1].isLatest).toBe(false);

    expect(versions[2].number).toBe(1);
    expect(versions[2].isLatest).toBe(false);
  });
});
