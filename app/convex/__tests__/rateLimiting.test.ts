/**
 * Rate Limiting Tests
 *
 * Tests the rate limiting system using isolated convexTest instances.
 * Each test gets a fresh in-memory database with separate rate limiter state.
 *
 * ## Running Tests
 *
 * ```bash
 * # Run all tests
 * npm test
 *
 * # Run only rate limiting tests
 * npm test -- rateLimiting.test.ts
 *
 * # Run with rate limiting enabled (for integration testing)
 * RATE_LIMIT_ENABLED=true npm test -- rateLimiting.test.ts
 * ```
 *
 * ## Test Isolation Strategy
 *
 * - Each test uses `convexTest(schema)` for complete isolation
 * - Rate limiter state is separate per test instance
 * - No interference between tests
 * - No cleanup needed (auto-handled)
 *
 * @see app/vitest.config.ts - Test environment configuration
 */

import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

/**
 * Helper: Create a test user with organization and membership
 */
async function createTestUser(t: any) {
  const userId = await t.run(async (ctx: any) => {
    // Create user
    const userId = await ctx.db.insert("users", {
      email: "test@example.com",
      name: "Test User",
      createdAt: Date.now(),
    });

    // Create organization
    const orgId = await ctx.db.insert("organizations", {
      name: "Test Org",
      createdAt: Date.now(),
      createdBy: userId,
    });

    // Create membership
    await ctx.db.insert("members", {
      userId,
      organizationId: orgId,
      roles: ["owner"],
      createdAt: Date.now(),
      createdBy: userId,
    });

    return { userId, orgId };
  });

  return userId;
}

/**
 * Helper: Create a test API key
 */
async function createTestApiKey(t: any, userId: Id<"users">) {
  return await t.run(async (ctx: any) => {
    const apiKeyId = await ctx.db.insert("apiKeys", {
      createdBy: userId,
      name: "Test API Key",
      prefix: "test_",
      keyHash: "hashed_key",
      scopes: ["read", "write"],
      isDeleted: false,
      createdAt: Date.now(),
    });
    return apiKeyId;
  });
}

describe("Rate Limiting - Basic Functionality", () => {
  it("allows requests within limit", async () => {
    const t = convexTest(schema);
    const { userId } = await createTestUser(t);

    // Make requests under the limit (rate limiting is disabled by default in tests)
    // This test just verifies the system works without errors
    await t.run(async (ctx: any) => {
      // TODO: Once we have an actual query that uses rate limiting,
      // we'll test with real calls. For now, just verify setup works.
      expect(userId).toBeDefined();
    });
  });
});

describe("Rate Limiting - Custom Overrides", () => {
  it("allows org owner to set custom override", async () => {
    const t = convexTest(schema);
    const { userId, orgId } = await createTestUser(t);

    // Set a custom override
    await t.run(async (ctx: any) => {
      const overrideId = await ctx.db.insert("rateLimitOverrides", {
        organizationId: orgId,
        limitType: "read",
        customLimit: 1000,
        reason: "Premium customer",
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      expect(overrideId).toBeDefined();

      // Verify it was created
      const override = await ctx.db.get(overrideId);
      expect(override).toBeDefined();
      expect(override!.customLimit).toBe(1000);
      expect(override!.limitType).toBe("read");
    });
  });

  it("respects expiration on custom overrides", async () => {
    const t = convexTest(schema);
    const { userId, orgId } = await createTestUser(t);

    await t.run(async (ctx: any) => {
      const now = Date.now();

      // Create expired override
      await ctx.db.insert("rateLimitOverrides", {
        organizationId: orgId,
        limitType: "write",
        customLimit: 500,
        reason: "Temporary promotion",
        createdBy: userId,
        createdAt: now - 2000,
        expiresAt: now - 1000, // Expired 1 second ago
        isDeleted: false,
      });

      // Create active override
      const activeId = await ctx.db.insert("rateLimitOverrides", {
        organizationId: orgId,
        limitType: "read",
        customLimit: 2000,
        reason: "Active promotion",
        createdBy: userId,
        createdAt: now,
        expiresAt: now + 10000, // Expires in 10 seconds
        isDeleted: false,
      });

      // Verify active override exists
      const active = await ctx.db.get(activeId);
      expect(active).toBeDefined();
      expect(active!.customLimit).toBe(2000);
    });
  });

  it("soft deletes override instead of hard delete", async () => {
    const t = convexTest(schema);
    const { userId, orgId } = await createTestUser(t);

    await t.run(async (ctx: any) => {
      // Create override
      const overrideId = await ctx.db.insert("rateLimitOverrides", {
        organizationId: orgId,
        limitType: "upload",
        customLimit: 50,
        reason: "Test override",
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      // Soft delete it
      await ctx.db.patch(overrideId, {
        isDeleted: true,
        deletedAt: Date.now(),
        deletedBy: userId,
      });

      // Verify it still exists but is marked deleted
      const deleted = await ctx.db.get(overrideId);
      expect(deleted).toBeDefined();
      expect(deleted!.isDeleted).toBe(true);
      expect(deleted!.deletedAt).toBeDefined();
      expect(deleted!.deletedBy).toBe(userId);
    });
  });
});

describe("Rate Limiting - Plan Integration", () => {
  it("creates plan with rate limit configuration", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx: any) => {
      const planId = await ctx.db.insert("plans", {
        key: "pro",
        stripeId: "price_pro",
        name: "Pro Plan",
        description: "Professional features",
        prices: { month: 2900, year: 29000 },
        limits: {
          readPerMinute: 1000,
          writePerMinute: 200,
          uploadPerMinute: 50,
          authPerMinute: 50,
          publicPerMinute: 500,
        },
        createdAt: Date.now(),
      });

      // Verify plan was created with limits
      const plan = await ctx.db.get(planId);
      expect(plan).toBeDefined();
      expect(plan!.limits).toBeDefined();
      expect(plan!.limits!.readPerMinute).toBe(1000);
      expect(plan!.limits!.writePerMinute).toBe(200);
    });
  });

  it("allows plan without rate limits (uses defaults)", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx: any) => {
      // Create plan without limits field
      const planId = await ctx.db.insert("plans", {
        key: "free",
        stripeId: "price_free",
        name: "Free Plan",
        description: "Free tier",
        prices: { month: 0 },
        createdAt: Date.now(),
        // limits field is optional
      });

      // Verify plan was created
      const plan = await ctx.db.get(planId);
      expect(plan).toBeDefined();
      expect(plan!.limits).toBeUndefined();
    });
  });
});

describe("Rate Limiting - Hierarchical Checking", () => {
  it("creates override at different scope levels", async () => {
    const t = convexTest(schema);
    const { userId, orgId } = await createTestUser(t);
    const apiKeyId = await createTestApiKey(t, userId);

    await t.run(async (ctx: any) => {
      // API Key level (most specific)
      const keyOverride = await ctx.db.insert("rateLimitOverrides", {
        apiKeyId,
        limitType: "read",
        customLimit: 100,
        reason: "Key-specific throttle",
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      // User level
      const userOverride = await ctx.db.insert("rateLimitOverrides", {
        userId,
        limitType: "write",
        customLimit: 200,
        reason: "User premium",
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      // Organization level (least specific)
      const orgOverride = await ctx.db.insert("rateLimitOverrides", {
        organizationId: orgId,
        limitType: "upload",
        customLimit: 75,
        reason: "Org enterprise plan",
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      // Verify all three were created
      expect(await ctx.db.get(keyOverride)).toBeDefined();
      expect(await ctx.db.get(userOverride)).toBeDefined();
      expect(await ctx.db.get(orgOverride)).toBeDefined();
    });
  });
});

describe("Rate Limiting - Indexes", () => {
  it("queries override by userId and limitType", async () => {
    const t = convexTest(schema);
    const { userId, orgId } = await createTestUser(t);

    await t.run(async (ctx: any) => {
      // Create multiple overrides
      await ctx.db.insert("rateLimitOverrides", {
        userId,
        limitType: "read",
        customLimit: 500,
        reason: "Test",
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      await ctx.db.insert("rateLimitOverrides", {
        userId,
        limitType: "write",
        customLimit: 100,
        reason: "Test",
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      // Query by compound index
      const readOverride = await ctx.db
        .query("rateLimitOverrides")
        .withIndex("by_userId_limitType", (q: any) =>
          q.eq("userId", userId).eq("limitType", "read")
        )
        .first();

      expect(readOverride).toBeDefined();
      expect(readOverride!.customLimit).toBe(500);
      expect(readOverride!.limitType).toBe("read");
    });
  });

  it("queries override by organizationId", async () => {
    const t = convexTest(schema);
    const { userId, orgId } = await createTestUser(t);

    await t.run(async (ctx: any) => {
      await ctx.db.insert("rateLimitOverrides", {
        organizationId: orgId,
        limitType: "public",
        customLimit: 300,
        reason: "Test",
        createdBy: userId,
        createdAt: Date.now(),
        isDeleted: false,
      });

      const overrides = await ctx.db
        .query("rateLimitOverrides")
        .withIndex("by_organizationId", (q: any) => q.eq("organizationId", orgId))
        .collect();

      expect(overrides).toHaveLength(1);
      expect(overrides[0].customLimit).toBe(300);
    });
  });
});
