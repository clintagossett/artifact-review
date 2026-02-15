import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

// ============================================================================
// TEST HELPERS
// ============================================================================

async function createTestUser(
  t: ReturnType<typeof convexTest>,
  email: string
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email,
      name: email.split("@")[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
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

    return userId;
  });
}

async function createTestArtifact(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">
): Promise<{ artifactId: Id<"artifacts">; versionId: Id<"artifactVersions"> }> {
  return await t.run(async (ctx) => {
    const membership = await (ctx.db
      .query("members") as any)
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    const artifactId = await ctx.db.insert("artifacts", {
      name: "Test Artifact",
      createdBy: userId,
      organizationId: membership!.organizationId,
      shareToken: "test-token",
      isDeleted: false,
      createdAt: Date.now(),
    });

    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      number: 1,
      createdBy: userId,
      fileType: "html",
      entryPoint: "index.html",
      size: 100,
      isDeleted: false,
      createdAt: Date.now(),
    });

    await ctx.db.insert("artifactFiles", {
      versionId,
      path: "index.html",
      storageId: "10001;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 100,
      isDeleted: false,
      createdAt: Date.now(),
    });

    return { artifactId, versionId };
  });
}

async function addTestVersion(
  t: ReturnType<typeof convexTest>,
  artifactId: Id<"artifacts">,
  userId: Id<"users">,
  number: number,
  opts: { name?: string; isDeleted?: boolean } = {}
): Promise<Id<"artifactVersions">> {
  return await t.run(async (ctx) => {
    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      number,
      createdBy: userId,
      name: opts.name,
      fileType: "html",
      entryPoint: "index.html",
      size: 100 * number,
      isDeleted: opts.isDeleted ?? false,
      createdAt: Date.now(),
      ...(opts.isDeleted ? { deletedAt: Date.now(), deletedBy: userId } : {}),
    });

    await ctx.db.insert("artifactFiles", {
      versionId,
      path: "index.html",
      storageId: "10001;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 100 * number,
      isDeleted: opts.isDeleted ?? false,
      createdAt: Date.now(),
      ...(opts.isDeleted ? { deletedAt: Date.now(), deletedBy: userId } : {}),
    });

    return versionId;
  });
}

// ============================================================================
// TESTS: listVersionsInternal
// ============================================================================

describe("agentApi - listVersionsInternal", () => {
  it("should list active versions sorted by number", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2, { name: "v2 draft" });
    await addTestVersion(t, artifactId, userId, 3);

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions).toHaveLength(3);
    expect(versions[0].number).toBe(1);
    expect(versions[1].number).toBe(2);
    expect(versions[1].name).toBe("v2 draft");
    expect(versions[2].number).toBe(3);
    expect(versions[2].isLatest).toBe(true);
    expect(versions[0].isLatest).toBe(false);
  });

  it("should exclude deleted versions", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2, { isDeleted: true });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions).toHaveLength(1);
    expect(versions[0].number).toBe(1);
    expect(versions[0].isLatest).toBe(true);
  });

  it("should return empty array for nonexistent artifact", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    // Use a fabricated ID
    const fakeId = "99999;artifacts" as Id<"artifacts">;
    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId: fakeId,
    });

    expect(versions).toHaveLength(0);
  });

  it("should return correct fileType and size", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions[0].fileType).toBe("html");
    expect(versions[0].size).toBe(100);
  });
});

// ============================================================================
// TESTS: softDeleteVersionInternal
// ============================================================================

describe("agentApi - softDeleteVersionInternal", () => {
  it("should soft-delete a version", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2);

    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId,
      number: 2,
      userId,
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions).toHaveLength(1);
    expect(versions[0].number).toBe(1);
  });

  it("should cascade soft-delete to files", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    const v2Id = await addTestVersion(t, artifactId, userId, 2);

    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId,
      number: 2,
      userId,
    });

    const files = await t.run(async (ctx) => {
      return await ctx.db
        .query("artifactFiles")
        .withIndex("by_versionId_active", (q: any) =>
          q.eq("versionId", v2Id).eq("isDeleted", false)
        )
        .collect();
    });

    expect(files).toHaveLength(0);
  });

  it("should prevent deleting last active version", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await expect(
      t.mutation(internal.agentApi.softDeleteVersionInternal, {
        artifactId,
        number: 1,
        userId,
      })
    ).rejects.toThrow("Cannot delete the last active version");
  });

  it("should throw for non-existent version", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await expect(
      t.mutation(internal.agentApi.softDeleteVersionInternal, {
        artifactId,
        number: 999,
        userId,
      })
    ).rejects.toThrow("Version not found");
  });

  it("should throw for already-deleted version", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2, { isDeleted: true });

    await expect(
      t.mutation(internal.agentApi.softDeleteVersionInternal, {
        artifactId,
        number: 2,
        userId,
      })
    ).rejects.toThrow("Version not found");
  });
});

// ============================================================================
// TESTS: updateVersionNameInternal
// ============================================================================

describe("agentApi - updateVersionNameInternal", () => {
  it("should update version name", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId,
      number: 1,
      name: "Final Draft",
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions[0].name).toBe("Final Draft");
  });

  it("should clear name with null", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    // Set then clear
    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId,
      number: 1,
      name: "Some Name",
    });
    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId,
      number: 1,
      name: null,
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions[0].name).toBeNull();
  });

  it("should reject name exceeding max length", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    const longName = "a".repeat(101);

    await expect(
      t.mutation(internal.agentApi.updateVersionNameInternal, {
        artifactId,
        number: 1,
        name: longName,
      })
    ).rejects.toThrow("characters or less");
  });

  it("should throw for non-existent version", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await expect(
      t.mutation(internal.agentApi.updateVersionNameInternal, {
        artifactId,
        number: 999,
        name: "New Name",
      })
    ).rejects.toThrow("Version not found");
  });
});

// ============================================================================
// TESTS: restoreVersionInternal
// ============================================================================

describe("agentApi - restoreVersionInternal", () => {
  it("should restore a soft-deleted version", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2);

    // Delete v2, then restore it
    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId,
      number: 2,
      userId,
    });

    let versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });
    expect(versions).toHaveLength(1);

    await t.mutation(internal.agentApi.restoreVersionInternal, {
      artifactId,
      number: 2,
    });

    versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });
    expect(versions).toHaveLength(2);
    expect(versions[1].number).toBe(2);
  });

  it("should cascade restore to files", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    const v2Id = await addTestVersion(t, artifactId, userId, 2);

    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId,
      number: 2,
      userId,
    });

    await t.mutation(internal.agentApi.restoreVersionInternal, {
      artifactId,
      number: 2,
    });

    const files = await t.run(async (ctx) => {
      return await ctx.db
        .query("artifactFiles")
        .withIndex("by_versionId_active", (q: any) =>
          q.eq("versionId", v2Id).eq("isDeleted", false)
        )
        .collect();
    });

    expect(files).toHaveLength(1);
  });

  it("should throw for non-existent version", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await expect(
      t.mutation(internal.agentApi.restoreVersionInternal, {
        artifactId,
        number: 999,
      })
    ).rejects.toThrow("Version not found");
  });

  it("should throw for non-deleted version", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await expect(
      t.mutation(internal.agentApi.restoreVersionInternal, {
        artifactId,
        number: 1,
      })
    ).rejects.toThrow("Version is not deleted");
  });
});
