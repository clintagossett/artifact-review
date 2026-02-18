// @vitest-environment node
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Public Share Links Test Suite (Issue #61)
 *
 * Tests the shares backend functionality:
 * - Create share link (idempotent, owner only)
 * - Toggle enabled state
 * - Update capabilities (readComments, writeComments)
 * - Resolve token (public query)
 */

// ============================================================================
// TEST DATA SETUP
// ============================================================================

interface TestData {
  t: ReturnType<typeof convexTest>;
  asOwner: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>;
  asOther: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>;
  ownerId: Id<"users">;
  otherId: Id<"users">;
  artifactId: Id<"artifacts">;
  versionId: Id<"artifactVersions">;
  orgId: Id<"organizations">;
}

async function setupTestData(): Promise<TestData> {
  const t = convexTest(schema);

  // Create owner user and organization
  const ownerId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      createdAt: Date.now(),
      name: "Alice Owner",
      email: "alice@example.com",
    });
    return userId;
  });

  const orgId = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organizations", {
      name: "Alice's Org",
      createdAt: Date.now(),
      createdBy: ownerId,
    });
    await ctx.db.insert("members", {
      userId: ownerId,
      organizationId: orgId,
      roles: ["owner"],
      createdAt: Date.now(),
      createdBy: ownerId,
    });
    return orgId;
  });

  // Create another user (non-owner)
  const otherId = await t.run(async (ctx) =>
    await ctx.db.insert("users", {
      createdAt: Date.now(),
      name: "Bob Other",
      email: "bob@example.com",
    })
  );

  // Create identities
  const asOwner = t.withIdentity({ subject: ownerId });
  const asOther = t.withIdentity({ subject: otherId });

  // Create artifact and version
  const { artifactId, versionId } = await t.run(async (ctx) => {
    const artifactId = await ctx.db.insert("artifacts", {
      name: "Test Artifact",
      createdBy: ownerId,
      organizationId: orgId,
      shareToken: "abc123xy",
      isDeleted: false,
      createdAt: Date.now(),
    });

    // Store file content
    const blob = new Blob(["<html><body>Test</body></html>"]);
    const storageId = await ctx.storage.store(blob);

    const versionId = await ctx.db.insert("artifactVersions", {
      artifactId,
      number: 1,
      createdBy: ownerId,
      fileType: "html",
      entryPoint: "index.html",
      size: 100,
      isDeleted: false,
      createdAt: Date.now(),
    });

    // Create artifact file
    await ctx.db.insert("artifactFiles", {
      versionId,
      path: "index.html",
      storageId,
      mimeType: "text/html",
      size: 100,
      isDeleted: false,
      createdAt: Date.now(),
    });

    return { artifactId, versionId };
  });

  return { t, asOwner, asOther, ownerId, otherId, artifactId, versionId, orgId };
}

// ============================================================================
// TESTS
// ============================================================================

describe("shares.create", () => {
  it("should create a new share link for artifact owner", async () => {
    const { t, asOwner, artifactId, ownerId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, { artifactId });

    expect(shareId).toBeDefined();

    // Verify the share was created correctly
    const share = await t.run(async (ctx) => {
      return await ctx.db.get(shareId);
    });

    expect(share).toBeDefined();
    expect(share?.artifactId).toBe(artifactId);
    expect(share?.capabilities).toEqual({ readComments: false, writeComments: false }); // Default
    expect(share?.enabled).toBe(true); // Default
    expect(share?.token).toBeDefined();
    expect(share?.token.length).toBe(36); // UUID format
    expect(share?.createdBy).toBe(ownerId);
  });

  it("should return existing share if one already exists (idempotent)", async () => {
    const { asOwner, artifactId } = await setupTestData();

    // Create first share
    const shareId1 = await asOwner.mutation(api.shares.create, { artifactId });

    // Try to create another share
    const shareId2 = await asOwner.mutation(api.shares.create, { artifactId });

    // Should return the same share
    expect(shareId1).toBe(shareId2);
  });

  it("should allow specifying capabilities on creation", async () => {
    const { t, asOwner, artifactId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, {
      artifactId,
      capabilities: { readComments: true, writeComments: true },
    });

    const share = await t.run(async (ctx) => {
      return await ctx.db.get(shareId);
    });

    expect(share?.capabilities).toEqual({ readComments: true, writeComments: true });
  });

  it("should reject non-owner trying to create share", async () => {
    const { asOther, artifactId } = await setupTestData();

    await expect(
      asOther.mutation(api.shares.create, { artifactId })
    ).rejects.toThrow("Only the artifact owner can create share links");
  });

  it("should reject unauthenticated user", async () => {
    const { t, artifactId } = await setupTestData();

    await expect(
      t.mutation(api.shares.create, { artifactId })
    ).rejects.toThrow("Authentication required");
  });
});

describe("shares.toggleEnabled", () => {
  it("should toggle enabled from true to false", async () => {
    const { t, asOwner, artifactId, ownerId } = await setupTestData();

    // Create share (enabled by default)
    const shareId = await asOwner.mutation(api.shares.create, { artifactId });

    // Toggle to disabled
    const newEnabled = await asOwner.mutation(api.shares.toggleEnabled, { shareId });

    expect(newEnabled).toBe(false);

    // Verify in database
    const share = await t.run(async (ctx) => {
      return await ctx.db.get(shareId);
    });
    expect(share?.enabled).toBe(false);
    expect(share?.updatedAt).toBeDefined();
    expect(share?.updatedBy).toBe(ownerId);
  });

  it("should toggle enabled from false to true", async () => {
    const { asOwner, artifactId } = await setupTestData();

    // Create share and toggle off
    const shareId = await asOwner.mutation(api.shares.create, { artifactId });
    await asOwner.mutation(api.shares.toggleEnabled, { shareId });

    // Toggle back on
    const newEnabled = await asOwner.mutation(api.shares.toggleEnabled, { shareId });

    expect(newEnabled).toBe(true);
  });

  it("should reject non-owner trying to toggle", async () => {
    const { asOwner, asOther, artifactId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, { artifactId });

    await expect(
      asOther.mutation(api.shares.toggleEnabled, { shareId })
    ).rejects.toThrow("Only the artifact owner can update share links");
  });
});

describe("shares.updateCapabilities", () => {
  it("should enable readComments capability", async () => {
    const { t, asOwner, artifactId, ownerId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, {
      artifactId,
    });

    await asOwner.mutation(api.shares.updateCapabilities, {
      shareId,
      capabilities: { readComments: true, writeComments: false },
    });

    const share = await t.run(async (ctx) => {
      return await ctx.db.get(shareId);
    });
    expect(share?.capabilities).toEqual({ readComments: true, writeComments: false });
    expect(share?.updatedAt).toBeDefined();
    expect(share?.updatedBy).toBe(ownerId);
  });

  it("should enable both readComments and writeComments", async () => {
    const { t, asOwner, artifactId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, {
      artifactId,
    });

    await asOwner.mutation(api.shares.updateCapabilities, {
      shareId,
      capabilities: { readComments: true, writeComments: true },
    });

    const share = await t.run(async (ctx) => {
      return await ctx.db.get(shareId);
    });
    expect(share?.capabilities).toEqual({ readComments: true, writeComments: true });
  });

  it("should disable all capabilities", async () => {
    const { t, asOwner, artifactId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, {
      artifactId,
      capabilities: { readComments: true, writeComments: true },
    });

    await asOwner.mutation(api.shares.updateCapabilities, {
      shareId,
      capabilities: { readComments: false, writeComments: false },
    });

    const share = await t.run(async (ctx) => {
      return await ctx.db.get(shareId);
    });
    expect(share?.capabilities).toEqual({ readComments: false, writeComments: false });
  });

  it("should reject non-owner trying to update", async () => {
    const { asOwner, asOther, artifactId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, { artifactId });

    await expect(
      asOther.mutation(api.shares.updateCapabilities, {
        shareId,
        capabilities: { readComments: true, writeComments: false },
      })
    ).rejects.toThrow("Only the artifact owner can update share links");
  });
});

describe("shares.getForArtifact", () => {
  it("should return share for artifact owner", async () => {
    const { asOwner, artifactId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, { artifactId });

    const share = await asOwner.query(api.shares.getForArtifact, { artifactId });

    expect(share).toBeDefined();
    expect(share?._id).toBe(shareId);
    expect(share?.token).toBeDefined();
    expect(share?.capabilities).toEqual({ readComments: false, writeComments: false });
    expect(share?.enabled).toBe(true);
  });

  it("should return null if no share exists", async () => {
    const { asOwner, artifactId } = await setupTestData();

    const share = await asOwner.query(api.shares.getForArtifact, { artifactId });

    expect(share).toBeNull();
  });

  it("should reject non-owner trying to get share", async () => {
    const { asOwner, asOther, artifactId } = await setupTestData();

    await asOwner.mutation(api.shares.create, { artifactId });

    await expect(
      asOther.query(api.shares.getForArtifact, { artifactId })
    ).rejects.toThrow("Only the artifact owner can view share link settings");
  });
});

describe("shares.resolveToken", () => {
  it("should return artifact info for valid enabled token", async () => {
    const { t, asOwner, artifactId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, { artifactId });

    const share = await t.run(async (ctx) => {
      return await ctx.db.get(shareId);
    });

    // Resolve token (no auth required - use t directly)
    const result = await t.query(api.shares.resolveToken, {
      token: share!.token,
    });

    expect(result).toBeDefined();
    expect(result?.artifactId).toBe(artifactId);
    expect(result?.artifactName).toBe("Test Artifact");
    expect(result?.capabilities).toEqual({ readComments: false, writeComments: false });
    expect(result?.latestVersionNumber).toBe(1);
  });

  it("should return null for disabled token", async () => {
    const { t, asOwner, artifactId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, { artifactId });

    // Disable the share
    await asOwner.mutation(api.shares.toggleEnabled, { shareId });

    const share = await t.run(async (ctx) => {
      return await ctx.db.get(shareId);
    });

    // Resolve token should return null (no auth required)
    const result = await t.query(api.shares.resolveToken, {
      token: share!.token,
    });

    expect(result).toBeNull();
  });

  it("should return null for non-existent token", async () => {
    const { t } = await setupTestData();

    const result = await t.query(api.shares.resolveToken, {
      token: "non-existent-token",
    });

    expect(result).toBeNull();
  });

  it("should return null for deleted artifact", async () => {
    const { t, asOwner, artifactId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, { artifactId });

    const share = await t.run(async (ctx) => {
      return await ctx.db.get(shareId);
    });

    // Soft-delete the artifact
    await t.run(async (ctx) => {
      await ctx.db.patch(artifactId, {
        isDeleted: true,
        deletedAt: Date.now(),
      });
    });

    // Resolve token should return null
    const result = await t.query(api.shares.resolveToken, {
      token: share!.token,
    });

    expect(result).toBeNull();
  });

  it("should work without authentication (public query)", async () => {
    const { t, asOwner, artifactId } = await setupTestData();

    const shareId = await asOwner.mutation(api.shares.create, { artifactId });

    const share = await t.run(async (ctx) => {
      return await ctx.db.get(shareId);
    });

    // Resolve token without auth (use t, not asOwner)
    const result = await t.query(api.shares.resolveToken, {
      token: share!.token,
    });

    expect(result).toBeDefined();
    expect(result?.artifactName).toBe("Test Artifact");
  });
});
