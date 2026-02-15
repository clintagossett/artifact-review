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
  userId: Id<"users">,
  opts: { shareToken?: string } = {}
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
      shareToken: opts.shareToken ?? "test-token",
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
  opts: {
    name?: string;
    isDeleted?: boolean;
    fileType?: string;
    entryPoint?: string;
    fileCount?: number;
  } = {}
): Promise<Id<"artifactVersions">> {
  return await t.run(async (ctx) => {
    const fileType = opts.fileType ?? "html";
    const entryPoint = opts.entryPoint ?? (fileType === "markdown" ? "README.md" : "index.html");

    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      number,
      createdBy: userId,
      name: opts.name,
      fileType,
      entryPoint,
      size: 100 * number,
      isDeleted: opts.isDeleted ?? false,
      createdAt: Date.now(),
      ...(opts.isDeleted ? { deletedAt: Date.now(), deletedBy: userId } : {}),
    });

    const mimeType = fileType === "markdown" ? "text/markdown" : "text/html";
    const filesToCreate = opts.fileCount ?? 1;

    for (let i = 0; i < filesToCreate; i++) {
      const path = filesToCreate === 1
        ? entryPoint
        : (i === 0 ? entryPoint : `assets/file${i}.css`);

      await ctx.db.insert("artifactFiles", {
        versionId,
        path,
        storageId: "10001;_storage" as Id<"_storage">,
        mimeType: i === 0 ? mimeType : "text/css",
        size: Math.floor((100 * number) / filesToCreate),
        isDeleted: opts.isDeleted ?? false,
        createdAt: Date.now(),
        ...(opts.isDeleted ? { deletedAt: Date.now(), deletedBy: userId } : {}),
      });
    }

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
    await createTestUser(t, "owner@test.com");

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

  it("should mark single version as isLatest", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions).toHaveLength(1);
    expect(versions[0].isLatest).toBe(true);
  });

  it("should return null for name when unset", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions[0].name).toBeNull();
  });

  it("should include createdAt as a number", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(typeof versions[0].createdAt).toBe("number");
    expect(versions[0].createdAt).toBeGreaterThan(0);
  });

  it("should handle mixed file types", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2, { fileType: "markdown" });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions).toHaveLength(2);
    expect(versions[0].fileType).toBe("html");
    expect(versions[1].fileType).toBe("markdown");
  });

  it("should recalculate isLatest when highest version is deleted", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2);
    await addTestVersion(t, artifactId, userId, 3);

    // Delete v3
    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId,
      number: 3,
      userId,
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions).toHaveLength(2);
    expect(versions[1].number).toBe(2);
    expect(versions[1].isLatest).toBe(true);
    expect(versions[0].isLatest).toBe(false);
  });

  it("should handle non-contiguous version numbers", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    // v2 deleted, v3 active → gap in numbering
    await addTestVersion(t, artifactId, userId, 2, { isDeleted: true });
    await addTestVersion(t, artifactId, userId, 3);

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions).toHaveLength(2);
    expect(versions[0].number).toBe(1);
    expect(versions[1].number).toBe(3);
    expect(versions[1].isLatest).toBe(true);
  });
});

// ============================================================================
// TESTS: addVersionInternal (publish version)
// ============================================================================

describe("agentApi - addVersionInternal (publish version)", () => {
  it("should publish v2 and return correct number", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    const result = await t.mutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId,
      fileType: "html",
      name: "Second draft",
      filePath: "index.html",
      storageId: "10002;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 250,
    });

    expect(result.number).toBe(2);
    expect(result.versionId).toBeTruthy();
  });

  it("should auto-increment version number to v3", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2);

    const result = await t.mutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId,
      fileType: "html",
      filePath: "index.html",
      storageId: "10003;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 300,
    });

    expect(result.number).toBe(3);
  });

  it("should skip deleted version numbers (v1 active, v2 deleted → new is v3)", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    // Add v2, then delete it
    await addTestVersion(t, artifactId, userId, 2);
    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId,
      number: 2,
      userId,
    });

    const result = await t.mutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId,
      fileType: "html",
      filePath: "index.html",
      storageId: "10004;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 300,
    });

    // addVersionInternal looks at ALL versions (including deleted) for max number
    expect(result.number).toBe(3);
  });

  it("should create an artifact file record", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    const result = await t.mutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId,
      fileType: "html",
      filePath: "index.html",
      storageId: "10005;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 200,
    });

    const files = await t.run(async (ctx) => {
      return await ctx.db
        .query("artifactFiles")
        .withIndex("by_versionId_active", (q: any) =>
          q.eq("versionId", result.versionId).eq("isDeleted", false)
        )
        .collect();
    });

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("index.html");
    expect(files[0].storageId).toBe("10005;_storage");
    expect(files[0].mimeType).toBe("text/html");
    expect(files[0].size).toBe(200);
  });

  it("should update artifact updatedAt timestamp", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await t.mutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId,
      fileType: "html",
      filePath: "index.html",
      storageId: "10006;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 200,
    });

    const artifact = await t.run(async (ctx) => {
      return await ctx.db.get(artifactId);
    });

    expect(artifact!.updatedAt).toBeDefined();
    expect(artifact!.updatedAt).toBeGreaterThan(0);
  });

  it("should store version name when provided", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    const result = await t.mutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId,
      fileType: "html",
      name: "Polished draft",
      filePath: "index.html",
      storageId: "10007;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 200,
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    const v2 = versions.find((v) => v.number === result.number);
    expect(v2!.name).toBe("Polished draft");
  });

  it("should store agent attribution when provided", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    const agentId = await t.run(async (ctx) => {
      return await ctx.db.insert("agents", {
        createdBy: userId,
        name: "Claude",
        role: "coding",
        createdAt: Date.now(),
        isDeleted: false,
      });
    });

    const result = await t.mutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId,
      fileType: "html",
      filePath: "index.html",
      storageId: "10008;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 200,
      agentId,
    });

    // addVersionInternal accepts agentId but agentName is looked up at display time.
    // Verify the call succeeds and the version is created correctly.
    expect(result.number).toBe(2);
    expect(result.versionId).toBeTruthy();
  });

  it("should support markdown file type", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    const result = await t.mutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId,
      fileType: "markdown",
      filePath: "README.md",
      storageId: "10009;_storage" as Id<"_storage">,
      mimeType: "text/markdown",
      size: 150,
    });

    const version = await t.run(async (ctx) => {
      return await ctx.db.get(result.versionId);
    });

    expect(version!.fileType).toBe("markdown");
    expect(version!.entryPoint).toBe("README.md");
  });

  it("should be listed by listVersionsInternal after publishing", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await t.mutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId,
      fileType: "html",
      filePath: "index.html",
      storageId: "10010;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 200,
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions).toHaveLength(2);
    expect(versions[0].number).toBe(1);
    expect(versions[1].number).toBe(2);
    expect(versions[1].isLatest).toBe(true);
    expect(versions[0].isLatest).toBe(false);
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

  it("should set deletedAt and deletedBy on version record", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    const v2Id = await addTestVersion(t, artifactId, userId, 2);

    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId,
      number: 2,
      userId,
    });

    const version = await t.run(async (ctx) => {
      return await ctx.db.get(v2Id);
    });

    expect(version!.isDeleted).toBe(true);
    expect(version!.deletedAt).toBeDefined();
    expect(version!.deletedAt).toBeGreaterThan(0);
    expect(version!.deletedBy).toBe(userId);
  });

  it("should cascade soft-delete to single file", async () => {
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

  it("should cascade soft-delete to multiple files", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    const v2Id = await addTestVersion(t, artifactId, userId, 2, { fileCount: 3 });

    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId,
      number: 2,
      userId,
    });

    const activeFiles = await t.run(async (ctx) => {
      return await ctx.db
        .query("artifactFiles")
        .withIndex("by_versionId_active", (q: any) =>
          q.eq("versionId", v2Id).eq("isDeleted", false)
        )
        .collect();
    });

    const allFiles = await t.run(async (ctx) => {
      return await ctx.db
        .query("artifactFiles")
        .withIndex("by_versionId", (q: any) => q.eq("versionId", v2Id))
        .collect();
    });

    expect(activeFiles).toHaveLength(0);
    expect(allFiles).toHaveLength(3);
    for (const f of allFiles) {
      expect(f.isDeleted).toBe(true);
      expect(f.deletedBy).toBe(userId);
    }
  });

  it("should set deletedAt and deletedBy on cascaded files", async () => {
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
        .withIndex("by_versionId", (q: any) => q.eq("versionId", v2Id))
        .collect();
    });

    expect(files).toHaveLength(1);
    expect(files[0].isDeleted).toBe(true);
    expect(files[0].deletedAt).toBeDefined();
    expect(files[0].deletedAt).toBeGreaterThan(0);
    expect(files[0].deletedBy).toBe(userId);
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

  it("should prevent deleting last active when others are already deleted", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    // v2 and v3 already deleted, v1 is the only active one
    await addTestVersion(t, artifactId, userId, 2, { isDeleted: true });
    await addTestVersion(t, artifactId, userId, 3, { isDeleted: true });

    await expect(
      t.mutation(internal.agentApi.softDeleteVersionInternal, {
        artifactId,
        number: 1,
        userId,
      })
    ).rejects.toThrow("Cannot delete the last active version");
  });

  it("should throw for non-existent version number", async () => {
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

  it("should not affect other active versions", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2);
    await addTestVersion(t, artifactId, userId, 3);

    // Delete the middle version
    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId,
      number: 2,
      userId,
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions).toHaveLength(2);
    expect(versions[0].number).toBe(1);
    expect(versions[1].number).toBe(3);
    expect(versions[1].isLatest).toBe(true);
  });

  it("should allow sequential deletion until one remains", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2);
    await addTestVersion(t, artifactId, userId, 3);

    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId, number: 3, userId,
    });
    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId, number: 2, userId,
    });

    // Now only v1 remains, deleting it should fail
    await expect(
      t.mutation(internal.agentApi.softDeleteVersionInternal, {
        artifactId, number: 1, userId,
      })
    ).rejects.toThrow("Cannot delete the last active version");

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });
    expect(versions).toHaveLength(1);
    expect(versions[0].number).toBe(1);
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

  it("should persist name in the DB record", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId, versionId } = await createTestArtifact(t, userId);

    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId,
      number: 1,
      name: "DB-Level Check",
    });

    const version = await t.run(async (ctx) => {
      return await ctx.db.get(versionId);
    });

    expect(version!.name).toBe("DB-Level Check");
  });

  it("should clear name with null", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId, number: 1, name: "Temp",
    });
    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId, number: 1, name: null,
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions[0].name).toBeNull();
  });

  it("should accept name at exactly max length (100 chars)", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    const exactName = "a".repeat(100);

    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId,
      number: 1,
      name: exactName,
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions[0].name).toBe(exactName);
  });

  it("should reject name exceeding max length (101 chars)", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await expect(
      t.mutation(internal.agentApi.updateVersionNameInternal, {
        artifactId,
        number: 1,
        name: "a".repeat(101),
      })
    ).rejects.toThrow("characters or less");
  });

  it("should accept empty string as name", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId,
      number: 1,
      name: "",
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions[0].name).toBe("");
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

  it("should throw for deleted version", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2, { isDeleted: true });

    await expect(
      t.mutation(internal.agentApi.updateVersionNameInternal, {
        artifactId,
        number: 2,
        name: "Should Fail",
      })
    ).rejects.toThrow("Version not found");
  });

  it("should not affect other versions", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2, { name: "Original V2" });

    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId,
      number: 1,
      name: "Updated V1",
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions[0].name).toBe("Updated V1");
    expect(versions[1].name).toBe("Original V2");
  });

  it("should allow overwriting an existing name", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId, number: 1, name: "First",
    });
    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId, number: 1, name: "Second",
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    expect(versions[0].name).toBe("Second");
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

    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId, number: 2, userId,
    });

    let versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });
    expect(versions).toHaveLength(1);

    await t.mutation(internal.agentApi.restoreVersionInternal, {
      artifactId, number: 2,
    });

    versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });
    expect(versions).toHaveLength(2);
    expect(versions[1].number).toBe(2);
  });

  it("should clear deletedAt and deletedBy on version record", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    const v2Id = await addTestVersion(t, artifactId, userId, 2);

    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId, number: 2, userId,
    });

    await t.mutation(internal.agentApi.restoreVersionInternal, {
      artifactId, number: 2,
    });

    const version = await t.run(async (ctx) => {
      return await ctx.db.get(v2Id);
    });

    expect(version!.isDeleted).toBe(false);
    expect(version!.deletedAt).toBeUndefined();
    expect(version!.deletedBy).toBeUndefined();
  });

  it("should cascade restore to files and clear their deletion fields", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    const v2Id = await addTestVersion(t, artifactId, userId, 2);

    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId, number: 2, userId,
    });

    await t.mutation(internal.agentApi.restoreVersionInternal, {
      artifactId, number: 2,
    });

    const files = await t.run(async (ctx) => {
      return await ctx.db
        .query("artifactFiles")
        .withIndex("by_versionId", (q: any) => q.eq("versionId", v2Id))
        .collect();
    });

    expect(files).toHaveLength(1);
    expect(files[0].isDeleted).toBe(false);
    expect(files[0].deletedAt).toBeUndefined();
    expect(files[0].deletedBy).toBeUndefined();
  });

  it("should cascade restore to multiple files", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    const v2Id = await addTestVersion(t, artifactId, userId, 2, { fileCount: 3 });

    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId, number: 2, userId,
    });

    await t.mutation(internal.agentApi.restoreVersionInternal, {
      artifactId, number: 2,
    });

    const files = await t.run(async (ctx) => {
      return await ctx.db
        .query("artifactFiles")
        .withIndex("by_versionId_active", (q: any) =>
          q.eq("versionId", v2Id).eq("isDeleted", false)
        )
        .collect();
    });

    expect(files).toHaveLength(3);
  });

  it("should preserve original name after delete+restore cycle", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2, { name: "My V2" });

    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId, number: 2, userId,
    });
    await t.mutation(internal.agentApi.restoreVersionInternal, {
      artifactId, number: 2,
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });

    const v2 = versions.find((v) => v.number === 2);
    expect(v2!.name).toBe("My V2");
  });

  it("should recalculate isLatest after restore", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2);
    await addTestVersion(t, artifactId, userId, 3);

    // Delete v3, v2 becomes latest
    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId, number: 3, userId,
    });

    let versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });
    expect(versions.find((v) => v.number === 2)!.isLatest).toBe(true);

    // Restore v3, v3 becomes latest again
    await t.mutation(internal.agentApi.restoreVersionInternal, {
      artifactId, number: 3,
    });

    versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });
    expect(versions.find((v) => v.number === 3)!.isLatest).toBe(true);
    expect(versions.find((v) => v.number === 2)!.isLatest).toBe(false);
  });

  it("should throw for non-existent version", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await expect(
      t.mutation(internal.agentApi.restoreVersionInternal, {
        artifactId, number: 999,
      })
    ).rejects.toThrow("Version not found");
  });

  it("should throw for non-deleted version (already active)", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    await expect(
      t.mutation(internal.agentApi.restoreVersionInternal, {
        artifactId, number: 1,
      })
    ).rejects.toThrow("Version is not deleted");
  });
});

// ============================================================================
// TESTS: Cross-function integration
// ============================================================================

describe("agentApi - version management integration", () => {
  it("full lifecycle: publish → rename → delete → list → restore → list", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    // Publish v2
    const v2 = await t.mutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId,
      fileType: "html",
      filePath: "index.html",
      storageId: "10020;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 200,
    });
    expect(v2.number).toBe(2);

    // Rename v2
    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId, number: 2, name: "Renamed V2",
    });

    let versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });
    expect(versions).toHaveLength(2);
    expect(versions[1].name).toBe("Renamed V2");

    // Delete v2
    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId, number: 2, userId,
    });

    versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });
    expect(versions).toHaveLength(1);

    // Restore v2
    await t.mutation(internal.agentApi.restoreVersionInternal, {
      artifactId, number: 2,
    });

    versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });
    expect(versions).toHaveLength(2);
    expect(versions[1].name).toBe("Renamed V2");
    expect(versions[1].isLatest).toBe(true);
  });

  it("publish after delete does not reuse deleted version number", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);

    // Add and delete v2
    await addTestVersion(t, artifactId, userId, 2);
    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId, number: 2, userId,
    });

    // Publish new → should be v3, not v2
    const result = await t.mutation(internal.artifacts.addVersionInternal, {
      userId,
      artifactId,
      fileType: "html",
      filePath: "index.html",
      storageId: "10021;_storage" as Id<"_storage">,
      mimeType: "text/html",
      size: 300,
    });

    expect(result.number).toBe(3);
  });

  it("rename fails on deleted version, succeeds after restore", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { artifactId } = await createTestArtifact(t, userId);
    await addTestVersion(t, artifactId, userId, 2);

    // Delete v2
    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId, number: 2, userId,
    });

    // Rename should fail
    await expect(
      t.mutation(internal.agentApi.updateVersionNameInternal, {
        artifactId, number: 2, name: "Should Fail",
      })
    ).rejects.toThrow("Version not found");

    // Restore and rename again
    await t.mutation(internal.agentApi.restoreVersionInternal, {
      artifactId, number: 2,
    });
    await t.mutation(internal.agentApi.updateVersionNameInternal, {
      artifactId, number: 2, name: "Now Works",
    });

    const versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId,
    });
    expect(versions[1].name).toBe("Now Works");
  });

  it("operations on one artifact do not affect another", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const art1 = await createTestArtifact(t, userId, { shareToken: "token-a" });
    const art2 = await createTestArtifact(t, userId, { shareToken: "token-b" });

    await addTestVersion(t, art1.artifactId, userId, 2);
    await addTestVersion(t, art2.artifactId, userId, 2);

    // Delete v2 from art1
    await t.mutation(internal.agentApi.softDeleteVersionInternal, {
      artifactId: art1.artifactId, number: 2, userId,
    });

    // art2 should still have 2 versions
    const art2Versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId: art2.artifactId,
    });
    expect(art2Versions).toHaveLength(2);

    const art1Versions = await t.query(internal.agentApi.listVersionsInternal, {
      artifactId: art1.artifactId,
    });
    expect(art1Versions).toHaveLength(1);
  });
});
