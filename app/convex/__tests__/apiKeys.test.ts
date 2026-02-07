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

async function createTestAgent(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  name: string
): Promise<Id<"agents">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("agents", {
      createdBy: userId,
      name,
      role: "coding",
      createdAt: Date.now(),
      isDeleted: false,
    });
  });
}

/** Hash a key the same way the production code does */
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function createApiKeyDirect(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  opts: {
    name?: string;
    agentId?: Id<"agents">;
    scopes?: string[];
    expiresAt?: number;
  } = {}
): Promise<{ rawKey: string; prefix: string; keyHash: string }> {
  const rawKey = "ar_live_test1234abcd5678efgh";
  const prefix = rawKey.substring(0, 12); // "ar_live_test"
  const keyHash = await hashKey(rawKey);

  await t.run(async (ctx) => {
    await ctx.db.insert("apiKeys", {
      createdBy: userId,
      agentId: opts.agentId,
      name: opts.name ?? "Test Key",
      prefix,
      keyHash,
      scopes: opts.scopes ?? ["editor"],
      expiresAt: opts.expiresAt,
      createdAt: Date.now(),
      isDeleted: false,
    });
  });

  return { rawKey, prefix, keyHash };
}

// ============================================================================
// TESTS: createInternal
// ============================================================================

describe("apiKeys - createInternal", () => {
  it("should store a key record with correct fields", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");

    await t.mutation(internal.apiKeys.createInternal, {
      createdBy: userId,
      name: "My Key",
      prefix: "ar_live_abcd",
      keyHash: "abc123hash",
      scopes: ["editor"],
      expiresAt: undefined,
    });

    const keys = await t.run(async (ctx) => {
      return await ctx.db
        .query("apiKeys")
        .withIndex("by_createdBy_active", (q: any) =>
          q.eq("createdBy", userId).eq("isDeleted", false)
        )
        .collect();
    });

    expect(keys).toHaveLength(1);
    expect(keys[0].name).toBe("My Key");
    expect(keys[0].prefix).toBe("ar_live_abcd");
    expect(keys[0].keyHash).toBe("abc123hash");
    expect(keys[0].scopes).toEqual(["editor"]);
    expect(keys[0].isDeleted).toBe(false);
    expect(keys[0].createdAt).toBeDefined();
  });

  it("should store key with agent association", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const agentId = await createTestAgent(t, userId, "Claude");

    await t.mutation(internal.apiKeys.createInternal, {
      createdBy: userId,
      agentId,
      name: "Agent Key",
      prefix: "ar_live_test",
      keyHash: "hash456",
      scopes: ["editor"],
    });

    const keys = await t.run(async (ctx) => {
      return await ctx.db
        .query("apiKeys")
        .withIndex("by_createdBy_active", (q: any) =>
          q.eq("createdBy", userId).eq("isDeleted", false)
        )
        .collect();
    });

    expect(keys).toHaveLength(1);
    expect(keys[0].agentId).toBe(agentId);
  });

  it("should store key with expiration", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    await t.mutation(internal.apiKeys.createInternal, {
      createdBy: userId,
      name: "Expiring Key",
      prefix: "ar_live_exp1",
      keyHash: "hashExpire",
      scopes: ["editor"],
      expiresAt,
    });

    const keys = await t.run(async (ctx) => {
      return await ctx.db
        .query("apiKeys")
        .withIndex("by_createdBy_active", (q: any) =>
          q.eq("createdBy", userId).eq("isDeleted", false)
        )
        .collect();
    });

    expect(keys[0].expiresAt).toBe(expiresAt);
  });
});

// ============================================================================
// TESTS: validateInternal
// ============================================================================

describe("apiKeys - validateInternal", () => {
  it("should validate a valid API key", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { prefix, keyHash } = await createApiKeyDirect(t, userId);

    const result = await t.query(internal.apiKeys.validateInternal, {
      prefix,
      keyHash,
    });

    expect(result).not.toBeNull();
    expect(result!.userId).toBe(userId);
    expect(result!.scopes).toEqual(["editor"]);
  });

  it("should return null for wrong hash", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { prefix } = await createApiKeyDirect(t, userId);

    const result = await t.query(internal.apiKeys.validateInternal, {
      prefix,
      keyHash: "wronghashvalue",
    });

    expect(result).toBeNull();
  });

  it("should return null for non-existent prefix", async () => {
    const t = convexTest(schema);

    const result = await t.query(internal.apiKeys.validateInternal, {
      prefix: "ar_live_xxxx",
      keyHash: "somehash",
    });

    expect(result).toBeNull();
  });

  it("should reject expired keys", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const expiredTime = Date.now() - 1000; // Expired 1 second ago
    const { prefix, keyHash } = await createApiKeyDirect(t, userId, {
      expiresAt: expiredTime,
    });

    const result = await t.query(internal.apiKeys.validateInternal, {
      prefix,
      keyHash,
    });

    expect(result).toBeNull();
  });

  it("should accept non-expired keys", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const futureTime = Date.now() + 86400000; // 1 day from now
    const { prefix, keyHash } = await createApiKeyDirect(t, userId, {
      expiresAt: futureTime,
    });

    const result = await t.query(internal.apiKeys.validateInternal, {
      prefix,
      keyHash,
    });

    expect(result).not.toBeNull();
    expect(result!.userId).toBe(userId);
  });

  it("should reject deleted/revoked keys", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { prefix, keyHash } = await createApiKeyDirect(t, userId);

    // Soft-delete the key
    await t.run(async (ctx) => {
      const key = await ctx.db
        .query("apiKeys")
        .withIndex("by_prefix", (q: any) => q.eq("prefix", prefix))
        .first();
      if (key) {
        await ctx.db.patch(key._id, {
          isDeleted: true,
          deletedAt: Date.now(),
          deletedBy: userId,
        });
      }
    });

    const result = await t.query(internal.apiKeys.validateInternal, {
      prefix,
      keyHash,
    });

    expect(result).toBeNull();
  });

  it("should return agent info when key has agentId", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const agentId = await createTestAgent(t, userId, "TestBot");
    const { prefix, keyHash } = await createApiKeyDirect(t, userId, {
      agentId,
    });

    const result = await t.query(internal.apiKeys.validateInternal, {
      prefix,
      keyHash,
    });

    expect(result).not.toBeNull();
    expect(result!.agentId).toBe(agentId);
  });

  it("should return undefined agentId when key has no agent", async () => {
    const t = convexTest(schema);
    const userId = await createTestUser(t, "owner@test.com");
    const { prefix, keyHash } = await createApiKeyDirect(t, userId);

    const result = await t.query(internal.apiKeys.validateInternal, {
      prefix,
      keyHash,
    });

    expect(result).not.toBeNull();
    expect(result!.agentId).toBeUndefined();
  });
});

// ============================================================================
// TESTS: Cross-user access prevention
// ============================================================================

describe("apiKeys - cross-user isolation", () => {
  it("should not allow user A's key to authenticate as user B", async () => {
    const t = convexTest(schema);
    const userA = await createTestUser(t, "userA@test.com");
    const userB = await createTestUser(t, "userB@test.com");

    // Create key for user A
    const { prefix, keyHash } = await createApiKeyDirect(t, userA);

    // Validate returns user A's identity
    const result = await t.query(internal.apiKeys.validateInternal, {
      prefix,
      keyHash,
    });

    expect(result).not.toBeNull();
    expect(result!.userId).toBe(userA);
    expect(result!.userId).not.toBe(userB);
  });

  it("should handle multiple keys with same prefix but different users", async () => {
    const t = convexTest(schema);
    const userA = await createTestUser(t, "userA@test.com");
    const userB = await createTestUser(t, "userB@test.com");

    // Create key for user A with known values
    const keyA = "ar_live_sameABCD1234_unique_A";
    const prefixA = keyA.substring(0, 12);
    const hashA = await hashKey(keyA);

    await t.run(async (ctx) => {
      await ctx.db.insert("apiKeys", {
        createdBy: userA,
        name: "Key A",
        prefix: prefixA,
        keyHash: hashA,
        scopes: ["editor"],
        createdAt: Date.now(),
        isDeleted: false,
      });
    });

    // Create key for user B with same prefix but different full key
    const keyB = "ar_live_sameABCD1234_unique_B";
    const prefixB = keyB.substring(0, 12);
    const hashB = await hashKey(keyB);

    await t.run(async (ctx) => {
      await ctx.db.insert("apiKeys", {
        createdBy: userB,
        name: "Key B",
        prefix: prefixB,
        keyHash: hashB,
        scopes: ["editor"],
        createdAt: Date.now(),
        isDeleted: false,
      });
    });

    // Validate key A returns user A
    const resultA = await t.query(internal.apiKeys.validateInternal, {
      prefix: prefixA,
      keyHash: hashA,
    });
    expect(resultA!.userId).toBe(userA);

    // Validate key B returns user B
    const resultB = await t.query(internal.apiKeys.validateInternal, {
      prefix: prefixB,
      keyHash: hashB,
    });
    expect(resultB!.userId).toBe(userB);
  });
});

// ============================================================================
// TESTS: Key format validation
// ============================================================================

describe("apiKeys - key format", () => {
  it("should hash deterministically (same input = same hash)", async () => {
    const key = "ar_live_test1234abcd5678efgh";
    const hash1 = await hashKey(key);
    const hash2 = await hashKey(key);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex output
  });

  it("should produce different hashes for different keys", async () => {
    const hash1 = await hashKey("ar_live_key1_AAAA");
    const hash2 = await hashKey("ar_live_key2_BBBB");

    expect(hash1).not.toBe(hash2);
  });
});
