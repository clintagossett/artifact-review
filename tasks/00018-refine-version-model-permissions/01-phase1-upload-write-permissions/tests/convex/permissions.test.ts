/**
 * ACTUAL INTEGRATION TESTS for Write Permissions Enforcement (Phase 1)
 *
 * Tests that verify permission checks work correctly:
 * 1. updateVersionName - only owner can update version names
 * 2. softDeleteVersion - only owner can delete versions
 * 3. softDelete - only owner can delete artifacts
 *
 * Task: 00018 - Phase 1 - Upload Flow + Write Permissions
 *
 * These tests use convex-test with withIdentity to simulate multi-user scenarios
 * and verify permission checks throw proper errors for unauthorized users.
 *
 * NOTE: Cannot test addVersion action (uses ctx.storage) - that requires E2E tests
 */

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";
import { nanoid } from "nanoid";

// Helper to create test user
async function createTestUser(t: ReturnType<typeof convexTest>, email: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email,
      name: email.split("@")[0],
    });
  });
}

// Helper to create artifact with initial version directly in DB
// (New unified storage API uses actions which can't be tested with convex-test)
async function createTestArtifact(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  title: string
) {
  return await t.run(async (ctx) => {
    const now = Date.now();

    // Create artifact
    const artifactId = await ctx.db.insert("artifacts", {
      title,
      description: undefined,
      creatorId: userId,
      shareToken: nanoid(8),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial version (v1)
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      versionNumber: 1,
      createdBy: userId,
      fileType: "html",
      entryPoint: "index.html",
      fileSize: 100,
      isDeleted: false,
      createdAt: now,
    });

    return { artifactId, versionId };
  });
}

// Helper to add a version directly to DB
// (New unified storage API uses actions which can't be tested with convex-test)
async function addTestVersion(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  artifactId: Id<"artifacts">,
  versionNumber: number
) {
  return await t.run(async (ctx) => {
    const now = Date.now();

    // Create version
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      versionNumber,
      createdBy: userId,
      fileType: "html",
      entryPoint: "index.html",
      fileSize: 100,
      isDeleted: false,
      createdAt: now,
    });

    // Update artifact timestamp
    await ctx.db.patch(artifactId, { updatedAt: now });

    return { versionId };
  });
}

describe("Write Permissions Enforcement - ACTUAL TESTS", () => {

  describe("updateVersionName permissions", () => {
    it("owner can update version name", async () => {
      const t = convexTest(schema);

      // Create user and artifact
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      // Owner updates version name
      const asOwner = t.withIdentity({ subject: ownerId });
      await asOwner.mutation(api.artifacts.updateVersionName, {
        versionId: artifact.versionId,
        versionName: "Updated Name",
      });

      // Verify name was updated
      const version = await t.run(async (ctx) =>
        await ctx.db.get(artifact.versionId)
      );
      expect(version?.versionName).toBe("Updated Name");
    });

    it("owner can clear version name by setting to null", async () => {
      const t = convexTest(schema);

      // Create user and artifact
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      const asOwner = t.withIdentity({ subject: ownerId });

      // Set name first
      await asOwner.mutation(api.artifacts.updateVersionName, {
        versionId: artifact.versionId,
        versionName: "Initial Name",
      });

      // Clear name by setting to null
      await asOwner.mutation(api.artifacts.updateVersionName, {
        versionId: artifact.versionId,
        versionName: null,
      });

      // Verify name was cleared
      const version = await t.run(async (ctx) =>
        await ctx.db.get(artifact.versionId)
      );
      expect(version?.versionName).toBeUndefined();
    });

    it("non-owner CANNOT update version name", async () => {
      const t = convexTest(schema);

      // Create owner and artifact
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      // Create non-owner user
      const nonOwnerId = await createTestUser(t, "nonowner@example.com");

      // Non-owner attempts to update version name
      const asNonOwner = t.withIdentity({ subject: nonOwnerId });

      await expect(async () => {
        await asNonOwner.mutation(api.artifacts.updateVersionName, {
          versionId: artifact.versionId,
          versionName: "Malicious Update",
        });
      }).rejects.toThrow("Not authorized: Only the owner can update version names");
    });

    it("unauthenticated user CANNOT update version name", async () => {
      const t = convexTest(schema);

      // Create owner and artifact
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      // Unauthenticated user (no withIdentity)
      await expect(async () => {
        await t.mutation(api.artifacts.updateVersionName, {
          versionId: artifact.versionId,
          versionName: "Unauthenticated Update",
        });
      }).rejects.toThrow("Not authenticated");
    });

    it("cannot update version name for deleted version", async () => {
      const t = convexTest(schema);

      // Create owner and artifact
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      const asOwner = t.withIdentity({ subject: ownerId });

      // Add second version so we can delete the first
      await addTestVersion(t, ownerId, artifact.artifactId, 2);

      // Soft delete the version
      await asOwner.mutation(api.artifacts.softDeleteVersion, {
        versionId: artifact.versionId,
      });

      // Attempt to update deleted version's name
      await expect(async () => {
        await asOwner.mutation(api.artifacts.updateVersionName, {
          versionId: artifact.versionId,
          versionName: "Cannot Update Deleted",
        });
      }).rejects.toThrow("Version not found");
    });

    it("validates version name length (max 100 chars)", async () => {
      const t = convexTest(schema);

      // Create owner and artifact
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      const asOwner = t.withIdentity({ subject: ownerId });

      // Attempt to set name longer than 100 characters
      const longName = "a".repeat(101);

      await expect(async () => {
        await asOwner.mutation(api.artifacts.updateVersionName, {
          versionId: artifact.versionId,
          versionName: longName,
        });
      }).rejects.toThrow("Version name too long. Maximum: 100 characters");
    });
  });

  describe("softDeleteVersion permissions", () => {
    it("owner can soft delete version", async () => {
      const t = convexTest(schema);

      // Create owner and artifact with 2 versions
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      const asOwner = t.withIdentity({ subject: ownerId });

      // Add second version so we have 2 versions
      const v2 = await addTestVersion(t, ownerId, artifact.artifactId, 2);

      // Owner soft deletes version 1
      await asOwner.mutation(api.artifacts.softDeleteVersion, {
        versionId: artifact.versionId,
      });

      // Verify version 1 is deleted
      const version1 = await t.run(async (ctx) =>
        await ctx.db.get(artifact.versionId)
      );
      expect(version1?.isDeleted).toBe(true);
      expect(version1?.deletedBy).toBe(ownerId);

      // Verify version 2 is still active
      const version2 = await t.run(async (ctx) =>
        await ctx.db.get(v2.versionId)
      );
      expect(version2?.isDeleted).toBe(false);
    });

    it("non-owner CANNOT soft delete version", async () => {
      const t = convexTest(schema);

      // Create owner and artifact
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      // Create non-owner user
      const nonOwnerId = await createTestUser(t, "nonowner@example.com");

      // Non-owner attempts to delete version
      const asNonOwner = t.withIdentity({ subject: nonOwnerId });

      await expect(async () => {
        await asNonOwner.mutation(api.artifacts.softDeleteVersion, {
          versionId: artifact.versionId,
        });
      }).rejects.toThrow("Not authorized");
    });

    it("unauthenticated user CANNOT soft delete version", async () => {
      const t = convexTest(schema);

      // Create owner and artifact
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      // Unauthenticated user (no withIdentity)
      await expect(async () => {
        await t.mutation(api.artifacts.softDeleteVersion, {
          versionId: artifact.versionId,
        });
      }).rejects.toThrow("Not authenticated");
    });

    it("cannot delete last version", async () => {
      const t = convexTest(schema);

      // Create owner and artifact (only has 1 version)
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      const asOwner = t.withIdentity({ subject: ownerId });

      // Attempt to delete the only version
      await expect(async () => {
        await asOwner.mutation(api.artifacts.softDeleteVersion, {
          versionId: artifact.versionId,
        });
      }).rejects.toThrow("Cannot delete the last active version");
    });

    it("soft delete sets deletedBy field", async () => {
      const t = convexTest(schema);

      // Create owner and artifact with 2 versions
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      const asOwner = t.withIdentity({ subject: ownerId });

      // Add second version
      await addTestVersion(t, ownerId, artifact.artifactId, 2);

      // Delete version 1
      await asOwner.mutation(api.artifacts.softDeleteVersion, {
        versionId: artifact.versionId,
      });

      // Verify deletedBy field is set
      const version = await t.run(async (ctx) =>
        await ctx.db.get(artifact.versionId)
      );
      expect(version?.deletedBy).toBe(ownerId);
    });
  });

  describe("softDelete (artifact) permissions", () => {
    it("owner can soft delete artifact", async () => {
      const t = convexTest(schema);

      // Create owner and artifact
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      const asOwner = t.withIdentity({ subject: ownerId });

      // Owner soft deletes artifact
      await asOwner.mutation(api.artifacts.softDelete, {
        id: artifact.artifactId,
      });

      // Verify artifact is deleted
      const deletedArtifact = await t.run(async (ctx) =>
        await ctx.db.get(artifact.artifactId)
      );
      expect(deletedArtifact?.isDeleted).toBe(true);
      expect(deletedArtifact?.deletedBy).toBe(ownerId);
    });

    it("non-owner CANNOT soft delete artifact", async () => {
      const t = convexTest(schema);

      // Create owner and artifact
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      // Create non-owner user
      const nonOwnerId = await createTestUser(t, "nonowner@example.com");

      // Non-owner attempts to delete artifact
      const asNonOwner = t.withIdentity({ subject: nonOwnerId });

      await expect(async () => {
        await asNonOwner.mutation(api.artifacts.softDelete, {
          id: artifact.artifactId,
        });
      }).rejects.toThrow("Not authorized");
    });

    it("unauthenticated user CANNOT soft delete artifact", async () => {
      const t = convexTest(schema);

      // Create owner and artifact
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      // Unauthenticated user (no withIdentity)
      await expect(async () => {
        await t.mutation(api.artifacts.softDelete, {
          id: artifact.artifactId,
        });
      }).rejects.toThrow("Not authenticated");
    });

    it("soft delete cascades to all versions", async () => {
      const t = convexTest(schema);

      // Create owner and artifact with 2 versions
      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      const asOwner = t.withIdentity({ subject: ownerId });

      // Add second version
      const v2 = await addTestVersion(t, ownerId, artifact.artifactId, 2);

      // Delete artifact
      await asOwner.mutation(api.artifacts.softDelete, {
        id: artifact.artifactId,
      });

      // Verify all versions are deleted
      const version1 = await t.run(async (ctx) =>
        await ctx.db.get(artifact.versionId)
      );
      const version2 = await t.run(async (ctx) =>
        await ctx.db.get(v2.versionId)
      );

      expect(version1?.isDeleted).toBe(true);
      expect(version1?.deletedBy).toBe(ownerId);
      expect(version2?.isDeleted).toBe(true);
      expect(version2?.deletedBy).toBe(ownerId);
    });
  });

  describe("Permission error messages", () => {
    it("updateVersionName returns clear error for non-owner", async () => {
      const t = convexTest(schema);

      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      const nonOwnerId = await createTestUser(t, "nonowner@example.com");
      const asNonOwner = t.withIdentity({ subject: nonOwnerId });

      try {
        await asNonOwner.mutation(api.artifacts.updateVersionName, {
          versionId: artifact.versionId,
          versionName: "Test",
        });
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe(
          "Not authorized: Only the owner can update version names"
        );
      }
    });

    it("softDeleteVersion returns clear error for non-owner", async () => {
      const t = convexTest(schema);

      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      const nonOwnerId = await createTestUser(t, "nonowner@example.com");
      const asNonOwner = t.withIdentity({ subject: nonOwnerId });

      try {
        await asNonOwner.mutation(api.artifacts.softDeleteVersion, {
          versionId: artifact.versionId,
        });
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Not authorized");
      }
    });

    it("mutations return clear error for unauthenticated users", async () => {
      const t = convexTest(schema);

      const ownerId = await createTestUser(t, "owner@example.com");
      const artifact = await createTestArtifact(t, ownerId, "Test Artifact");

      // Test updateVersionName
      try {
        await t.mutation(api.artifacts.updateVersionName, {
          versionId: artifact.versionId,
          versionName: "Test",
        });
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Not authenticated");
      }

      // Test softDeleteVersion
      try {
        await t.mutation(api.artifacts.softDeleteVersion, {
          versionId: artifact.versionId,
        });
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Not authenticated");
      }

      // Test softDelete
      try {
        await t.mutation(api.artifacts.softDelete, {
          id: artifact.artifactId,
        });
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Not authenticated");
      }
    });
  });
});
