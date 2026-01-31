/**
 * Unit tests for getVersionStatus query
 * Task 00049 - Subtask 02: Frontend Status Tracking
 */

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import type { Id } from "../_generated/dataModel";

// Helper to create a test user and organization
async function createTestUserAndOrg(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "test@example.com",
      name: "Test User",
      createdAt: Date.now(),
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

describe("getVersionStatus", () => {
  it("returns null when version does not exist", async () => {
    const t = convexTest(schema);

    // Create a dummy ID - query will return null because version doesn't exist
    const { userId, orgId } = await createTestUserAndOrg(t);
    const dummyVersionId = await t.run(async (ctx) => {
      const artifactId = await ctx.db.insert("artifacts", {
        name: "Dummy",
        shareToken: "dummy",
        createdBy: userId,
        organizationId: orgId,
        createdAt: Date.now(),
        isDeleted: false,
      });
      const versionId = await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        fileType: "html",
        entryPoint: "index.html",
        size: 100,
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
      });
      // Delete it so it doesn't exist
      await ctx.db.delete(versionId);
      return versionId;
    });

    const result = await t.query(api.artifacts.getVersionStatus, {
      versionId: dummyVersionId,
    });

    expect(result).toBeNull();
  });

  it("returns status: ready for HTML version with status undefined", async () => {
    const t = convexTest(schema);

    // Create user and org
    const { userId, orgId } = await createTestUserAndOrg(t);

    // Create artifact with HTML version (no status field)
    const versionId = await t.run(async (ctx) => {
      const artifactId = await ctx.db.insert("artifacts", {
        name: "Test Artifact",
        shareToken: "test-token",
        createdBy: userId,
        organizationId: orgId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      return await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        fileType: "html",
        entryPoint: "index.html",
        size: 100,
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
        // No status field - should default to "ready"
      });
    });

    const result = await t.query(api.artifacts.getVersionStatus, {
      versionId,
    });

    expect(result).toEqual({
      status: "ready",
      errorMessage: undefined,
    });
  });

  it("returns status: uploading when version is being uploaded", async () => {
    const t = convexTest(schema);

    const { userId, orgId } = await createTestUserAndOrg(t);

    const versionId = await t.run(async (ctx) => {
      const artifactId = await ctx.db.insert("artifacts", {
        name: "Test Artifact",
        shareToken: "test-token",
        createdBy: userId,
        organizationId: orgId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      return await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        fileType: "zip",
        entryPoint: "index.html",
        size: 1024,
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
        status: "uploading",
      });
    });

    const result = await t.query(api.artifacts.getVersionStatus, {
      versionId,
    });

    expect(result).toEqual({
      status: "uploading",
      errorMessage: undefined,
    });
  });

  it("returns status: processing when version is being processed", async () => {
    const t = convexTest(schema);

    const { userId, orgId } = await createTestUserAndOrg(t);

    const versionId = await t.run(async (ctx) => {
      const artifactId = await ctx.db.insert("artifacts", {
        name: "Test Artifact",
        shareToken: "test-token",
        createdBy: userId,
        organizationId: orgId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      return await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        fileType: "zip",
        entryPoint: "index.html",
        size: 1024,
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
        status: "processing",
      });
    });

    const result = await t.query(api.artifacts.getVersionStatus, {
      versionId,
    });

    expect(result).toEqual({
      status: "processing",
      errorMessage: undefined,
    });
  });

  it("returns status: ready when version is ready", async () => {
    const t = convexTest(schema);

    const { userId, orgId } = await createTestUserAndOrg(t);

    const versionId = await t.run(async (ctx) => {
      const artifactId = await ctx.db.insert("artifacts", {
        name: "Test Artifact",
        shareToken: "test-token",
        createdBy: userId,
        organizationId: orgId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      return await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        fileType: "zip",
        entryPoint: "index.html",
        size: 1024,
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
        status: "ready",
      });
    });

    const result = await t.query(api.artifacts.getVersionStatus, {
      versionId,
    });

    expect(result).toEqual({
      status: "ready",
      errorMessage: undefined,
    });
  });

  it("returns status: error with errorMessage when processing failed", async () => {
    const t = convexTest(schema);

    const { userId, orgId } = await createTestUserAndOrg(t);

    const versionId = await t.run(async (ctx) => {
      const artifactId = await ctx.db.insert("artifacts", {
        name: "Test Artifact",
        shareToken: "test-token",
        createdBy: userId,
        organizationId: orgId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      return await ctx.db.insert("artifactVersions", {
        artifactId,
        number: 1,
        fileType: "zip",
        entryPoint: "index.html",
        size: 1024,
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
        status: "error",
        errorMessage: "ZIP contains forbidden file types: .mp4",
      });
    });

    const result = await t.query(api.artifacts.getVersionStatus, {
      versionId,
    });

    expect(result).toEqual({
      status: "error",
      errorMessage: "ZIP contains forbidden file types: .mp4",
    });
  });
});
