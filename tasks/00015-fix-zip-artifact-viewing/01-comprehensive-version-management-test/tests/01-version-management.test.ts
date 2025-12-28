/**
 * Test #1: Version Management Test
 *
 * Tests the complete version lifecycle:
 * - Upload v1, v2, v3 → validate all versions created
 * - Soft delete v2 → validate v2.isDeleted=true, v1 and v3 still active
 * - Soft delete v3 → validate only v1 active
 * - Try to delete v1 (last active) → validate ERROR
 * - Upload v4 → validate version number is 4 (NOT 2, even though v2 is deleted)
 * - Final state: v1 active, v2 deleted, v3 deleted, v4 active
 */

import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../../../app/convex/_generated/api";
import type { Id } from "../../../app/convex/_generated/dataModel";
import {
  createTestContext,
  createTestUser,
  uploadZipArtifact,
  uploadZipVersion,
  validateVersion,
  validateFileCount,
  getVersions,
  SAMPLE_PATHS,
} from "./helpers";

describe("Version Management", () => {
  let t: any;
  let userId: Id<"users">;

  beforeEach(async () => {
    t = createTestContext();
    userId = await createTestUser(t);
  });

  it("should upload charting v1 and validate version 1 created", async () => {
    // Upload v1
    const result = await uploadZipArtifact(
      t,
      userId,
      SAMPLE_PATHS.charting.v1,
      "Monthly Sales Dashboard"
    );

    // Validate version 1 was created
    expect(result.versionNumber).toBe(1);

    // Validate version exists and is not deleted
    await validateVersion(t, result.versionId, {
      versionNumber: 1,
      isDeleted: false,
      fileType: "zip",
    });

    // Validate files were extracted (charting v1 has 4 files)
    await validateFileCount(t, result.versionId, 4);
  });

  it("should upload v2 and validate both v1 and v2 exist", async () => {
    // Upload v1
    const v1 = await uploadZipArtifact(
      t,
      userId,
      SAMPLE_PATHS.charting.v1,
      "Monthly Sales Dashboard"
    );

    // Upload v2
    const v2 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v2);

    // Validate v2 is version 2
    expect(v2.versionNumber).toBe(2);

    // Validate both versions exist
    await validateVersion(t, v1.versionId, {
      versionNumber: 1,
      isDeleted: false,
    });

    await validateVersion(t, v2.versionId, {
      versionNumber: 2,
      isDeleted: false,
    });

    // Validate both have files
    await validateFileCount(t, v1.versionId, 4);
    await validateFileCount(t, v2.versionId, 4);

    // Validate getVersions returns both (descending order)
    const versions = await getVersions(t, v1.artifactId);
    expect(versions).toHaveLength(2);
    expect(versions[0].versionNumber).toBe(2); // v2 first (descending)
    expect(versions[1].versionNumber).toBe(1); // v1 second
  });

  it("should upload v3 and validate all three versions exist", async () => {
    // Upload v1, v2, v3
    const v1 = await uploadZipArtifact(
      t,
      userId,
      SAMPLE_PATHS.charting.v1,
      "Monthly Sales Dashboard"
    );
    const v2 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v2);
    const v3 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v3);

    // Validate v3 is version 3
    expect(v3.versionNumber).toBe(3);

    // Validate all versions exist
    const versions = await getVersions(t, v1.artifactId);
    expect(versions).toHaveLength(3);
    expect(versions.map((v) => v.versionNumber).sort()).toEqual([1, 2, 3]);
  });

  it("should soft delete v2 and validate v2.isDeleted=true, v1 and v3 still active", async () => {
    // Upload v1, v2, v3
    const v1 = await uploadZipArtifact(
      t,
      userId,
      SAMPLE_PATHS.charting.v1,
      "Monthly Sales Dashboard"
    );
    const v2 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v2);
    const v3 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v3);

    // Soft delete v2
    await t.mutation(
      api.artifacts.softDeleteVersion,
      { versionId: v2.versionId },
      { asUser: userId }
    );

    // Validate v2 is deleted
    await validateVersion(t, v2.versionId, {
      versionNumber: 2,
      isDeleted: true,
    });

    // Validate v1 and v3 are still active
    await validateVersion(t, v1.versionId, {
      versionNumber: 1,
      isDeleted: false,
    });

    await validateVersion(t, v3.versionId, {
      versionNumber: 3,
      isDeleted: false,
    });

    // Validate getVersions returns only active versions (v1 and v3)
    const versions = await getVersions(t, v1.artifactId);
    expect(versions).toHaveLength(2);
    expect(versions.map((v) => v.versionNumber).sort()).toEqual([1, 3]);

    // Validate v2 files are also deleted
    const v2Files = await t.query(api.artifacts.getFilesByVersion, {
      versionId: v2.versionId,
    });
    expect(v2Files).toHaveLength(0); // Soft deleted files should not be returned

    // Validate v1 and v3 files are still active
    await validateFileCount(t, v1.versionId, 4);
    await validateFileCount(t, v3.versionId, 4);
  });

  it("should soft delete v3 and validate only v1 remains active", async () => {
    // Upload v1, v2, v3
    const v1 = await uploadZipArtifact(
      t,
      userId,
      SAMPLE_PATHS.charting.v1,
      "Monthly Sales Dashboard"
    );
    const v2 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v2);
    const v3 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v3);

    // Soft delete v2 and v3
    await t.mutation(
      api.artifacts.softDeleteVersion,
      { versionId: v2.versionId },
      { asUser: userId }
    );
    await t.mutation(
      api.artifacts.softDeleteVersion,
      { versionId: v3.versionId },
      { asUser: userId }
    );

    // Validate only v1 is active
    const versions = await getVersions(t, v1.artifactId);
    expect(versions).toHaveLength(1);
    expect(versions[0].versionNumber).toBe(1);

    // Validate v2 and v3 are deleted
    await validateVersion(t, v2.versionId, { isDeleted: true });
    await validateVersion(t, v3.versionId, { isDeleted: true });

    // Validate v1 is still active
    await validateVersion(t, v1.versionId, { isDeleted: false });
  });

  it("should error when trying to delete the last active version", async () => {
    // Upload v1
    const v1 = await uploadZipArtifact(
      t,
      userId,
      SAMPLE_PATHS.charting.v1,
      "Monthly Sales Dashboard"
    );

    // Try to delete v1 (the only active version)
    await expect(
      t.mutation(
        api.artifacts.softDeleteVersion,
        { versionId: v1.versionId },
        { asUser: userId }
      )
    ).rejects.toThrow("Cannot delete the last active version");

    // Validate v1 is still active
    await validateVersion(t, v1.versionId, { isDeleted: false });
  });

  it("should upload v4 and validate version number is 4 (NOT 2, even though v2 is deleted)", async () => {
    // Upload v1, v2, v3
    const v1 = await uploadZipArtifact(
      t,
      userId,
      SAMPLE_PATHS.charting.v1,
      "Monthly Sales Dashboard"
    );
    const v2 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v2);
    const v3 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v3);

    // Soft delete v2 and v3
    await t.mutation(
      api.artifacts.softDeleteVersion,
      { versionId: v2.versionId },
      { asUser: userId }
    );
    await t.mutation(
      api.artifacts.softDeleteVersion,
      { versionId: v3.versionId },
      { asUser: userId }
    );

    // Upload v4
    const v4 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v4);

    // Validate v4 is version 4 (NOT 2, even though v2 is deleted)
    expect(v4.versionNumber).toBe(4);

    // Validate version 4 exists
    await validateVersion(t, v4.versionId, {
      versionNumber: 4,
      isDeleted: false,
    });
  });

  it("should have final state: v1 active, v2 deleted, v3 deleted, v4 active", async () => {
    // Upload v1, v2, v3
    const v1 = await uploadZipArtifact(
      t,
      userId,
      SAMPLE_PATHS.charting.v1,
      "Monthly Sales Dashboard"
    );
    const v2 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v2);
    const v3 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v3);

    // Soft delete v2 and v3
    await t.mutation(
      api.artifacts.softDeleteVersion,
      { versionId: v2.versionId },
      { asUser: userId }
    );
    await t.mutation(
      api.artifacts.softDeleteVersion,
      { versionId: v3.versionId },
      { asUser: userId }
    );

    // Upload v4
    const v4 = await uploadZipVersion(t, userId, v1.artifactId, SAMPLE_PATHS.charting.v4);

    // Validate final state
    await validateVersion(t, v1.versionId, {
      versionNumber: 1,
      isDeleted: false,
    });
    await validateVersion(t, v2.versionId, {
      versionNumber: 2,
      isDeleted: true,
    });
    await validateVersion(t, v3.versionId, {
      versionNumber: 3,
      isDeleted: true,
    });
    await validateVersion(t, v4.versionId, {
      versionNumber: 4,
      isDeleted: false,
    });

    // Validate getVersions returns only active versions (v1 and v4, descending)
    const versions = await getVersions(t, v1.artifactId);
    expect(versions).toHaveLength(2);
    expect(versions[0].versionNumber).toBe(4); // v4 first (descending)
    expect(versions[1].versionNumber).toBe(1); // v1 second

    // Validate all versions have files extracted
    await validateFileCount(t, v1.versionId, 4);
    await validateFileCount(t, v4.versionId, 4);
  });
});
