import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

// Helper to sleep for testing grace period expiry
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("settings.calculateGracePeriodForSession", () => {
  it("should return false when session does not exist", async () => {
    const t = convexTest(schema);

    // Create a user and session, then delete it to create a non-existent session ID
    const sessionId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "test@example.com",
        name: "Test User",
      });

      const sessionId = await ctx.db.insert("authSessions", {
        userId,
        expirationTime: Date.now() + 24 * 60 * 60 * 1000,
      });

      // Delete the session to make it non-existent
      await ctx.db.delete(sessionId);

      return sessionId;
    });

    const status = await t.query(
      internal.settings.calculateGracePeriodForSession,
      { sessionId }
    );

    expect(status.isWithinGracePeriod).toBe(false);
    expect(status.expiresAt).toBeNull();
    expect(status.sessionCreatedAt).toBeNull();
  });

  it("should return true when session is within grace period", async () => {
    const t = convexTest(schema);

    // Create a user and session
    const sessionId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "test@example.com",
        name: "Test User",
      });

      const sessionId = await ctx.db.insert("authSessions", {
        userId,
        expirationTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      });

      return sessionId;
    });

    const status = await t.query(
      internal.settings.calculateGracePeriodForSession,
      { sessionId }
    );

    expect(status.isWithinGracePeriod).toBe(true);
    expect(status.expiresAt).toBeGreaterThan(Date.now());
    expect(status.sessionCreatedAt).toBeDefined();
    expect(status.sessionCreatedAt).toBeGreaterThan(0);
  });

  it("should return false when session is outside grace period (5s in test mode)", async () => {
    const t = convexTest(schema);

    // Set NODE_ENV to test mode for 5-second grace period
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    try {
      // Create a user and session
      const sessionId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          });

        const sessionId = await ctx.db.insert("authSessions", {
          userId,
          expirationTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        });

        return sessionId;
      });

      // Check immediately - should be within grace period
      const statusBefore = await t.query(
        internal.settings.calculateGracePeriodForSession,
        { sessionId }
      );
      expect(statusBefore.isWithinGracePeriod).toBe(true);

      // Wait 6 seconds (exceeds 5-second test grace period)
      await sleep(6000);

      // Check again - should be expired
      const statusAfter = await t.query(
        internal.settings.calculateGracePeriodForSession,
        { sessionId }
      );
      expect(statusAfter.isWithinGracePeriod).toBe(false);
      expect(statusAfter.expiresAt).toBeNull();
    } finally {
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    }
  }, 10000); // 10 second timeout for this test

  it("should include correct expiry timestamp when fresh", async () => {
    const t = convexTest(schema);

    // Ensure we're not in test mode for this test
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const sessionId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          });

        const sessionId = await ctx.db.insert("authSessions", {
          userId,
          expirationTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        });

        return sessionId;
      });

      const status = await t.query(
        internal.settings.calculateGracePeriodForSession,
        { sessionId }
      );

      // In production mode (15 minutes)
      const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

      expect(status.isWithinGracePeriod).toBe(true);
      expect(status.expiresAt).not.toBeNull();
      expect(status.sessionCreatedAt).not.toBeNull();

      if (status.expiresAt && status.sessionCreatedAt) {
        const gracePeriodDuration = status.expiresAt - status.sessionCreatedAt;

        // Allow for small timing differences
        expect(gracePeriodDuration).toBeGreaterThanOrEqual(
          FIFTEEN_MINUTES_MS - 1000
        );
        expect(gracePeriodDuration).toBeLessThanOrEqual(
          FIFTEEN_MINUTES_MS + 1000
        );
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("should return null for expiresAt when expired", async () => {
    const t = convexTest(schema);

    // Set NODE_ENV to test mode for 5-second grace period
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    try {
      const sessionId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          });

        const sessionId = await ctx.db.insert("authSessions", {
          userId,
          expirationTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        });

        return sessionId;
      });

      // Wait for expiry
      await sleep(6000);

      const status = await t.query(
        internal.settings.calculateGracePeriodForSession,
        { sessionId }
      );

      expect(status.expiresAt).toBeNull();
      expect(status.sessionCreatedAt).toBeGreaterThan(0);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  }, 10000);
});

describe("settings.getGracePeriodStatus", () => {
  it("should return false when not authenticated", async () => {
    const t = convexTest(schema);

    const status = await t.query(api.settings.getGracePeriodStatus);

    expect(status.isWithinGracePeriod).toBe(false);
    expect(status.expiresAt).toBeNull();
    expect(status.sessionCreatedAt).toBeNull();
  });

  it("should return false when authenticated but no session exists", async () => {
    const t = convexTest(schema);

    // Create a user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        name: "Test User",
      });
    });

    const asUser = t.withIdentity({ subject: userId });

    const status = await asUser.query(api.settings.getGracePeriodStatus);

    // Should return false because getAuthSessionId() won't return a session ID
    // in the test environment without proper Convex Auth setup
    expect(status.isWithinGracePeriod).toBe(false);
    expect(status.expiresAt).toBeNull();
    expect(status.sessionCreatedAt).toBeNull();
  });
});

describe("settings.changePassword", () => {
  it("should return error when not authenticated", async () => {
    const t = convexTest(schema);

    const result = await t.mutation(api.settings.changePassword, {
      newPassword: "newPassword123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("should reject password less than 8 characters", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        name: "Test User",
      });
    });

    const asUser = t.withIdentity({ subject: userId });

    const result = await asUser.mutation(api.settings.changePassword, {
      newPassword: "short1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Password must be at least 8 characters");
  });

  it("should reject password without a number", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        name: "Test User",
      });
    });

    const asUser = t.withIdentity({ subject: userId });

    const result = await asUser.mutation(api.settings.changePassword, {
      newPassword: "noNumberPassword",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Password must contain a number");
  });

  it("should reject password without a letter", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        name: "Test User",
      });
    });

    const asUser = t.withIdentity({ subject: userId });

    const result = await asUser.mutation(api.settings.changePassword, {
      newPassword: "12345678",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Password must contain a letter");
  });

  it("should require current password outside grace period", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        name: "Test User",
      });
    });

    const asUser = t.withIdentity({ subject: userId });

    // Without a session (outside grace period), current password is required
    const result = await asUser.mutation(api.settings.changePassword, {
      newPassword: "newPassword123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Current password required");
  });

  // Note: Full password change tests would require integration with Convex Auth
  // password verification and update mechanisms, which is beyond the scope of
  // unit tests. These should be tested in E2E tests with actual auth setup.
});

describe("settings.sendReauthMagicLink", () => {
  it("should throw error when not authenticated", async () => {
    const t = convexTest(schema);

    await expect(
      t.action(api.settings.sendReauthMagicLink, {})
    ).rejects.toThrow("User email not found");
  });

  // Note: Full magic link sending tests require Resend integration
  // which should be mocked or tested in E2E tests with actual email setup.
  // The function structure and basic validation is tested above.
});
