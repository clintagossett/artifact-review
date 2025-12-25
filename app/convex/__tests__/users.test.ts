import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("users", () => {
  describe("getCurrentUser", () => {
    it("should return null when no user is authenticated", async () => {
      const t = convexTest(schema);

      const user = await t.query(api.users.getCurrentUser);

      expect(user).toBeNull();
    });

    it("should return user data when authenticated", async () => {
      const t = convexTest(schema);

      // Create an anonymous user
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          isAnonymous: true,
        });
      });

      // Mock auth to return this user ID
      t.withIdentity({ subject: userId });

      const user = await t.query(api.users.getCurrentUser);

      expect(user).not.toBeNull();
      expect(user?.isAnonymous).toBe(true);
      expect(user?._id).toBe(userId);
    });

    it("should include email when user has email", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          isAnonymous: false,
          email: "test@example.com",
          name: "Test User",
        });
      });

      t.withIdentity({ subject: userId });

      const user = await t.query(api.users.getCurrentUser);

      expect(user).not.toBeNull();
      expect(user?.email).toBe("test@example.com");
      expect(user?.name).toBe("Test User");
      expect(user?.isAnonymous).toBe(false);
    });
  });
});
