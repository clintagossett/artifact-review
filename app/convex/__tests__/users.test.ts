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

      // Create a user
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "user@example.com",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // withIdentity returns a new context - must use it!
      const asUser = t.withIdentity({ subject: userId });

      const user = await asUser.query(api.users.getCurrentUser);

      expect(user).not.toBeNull();
      expect(user?._id).toBe(userId);
      expect(user?.email).toBe("user@example.com");
    });

    it("should include email when user has email", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const user = await asUser.query(api.users.getCurrentUser);

      expect(user).not.toBeNull();
      expect(user?.email).toBe("test@example.com");
      expect(user?.name).toBe("Test User");
    });
  });

  describe("updateName", () => {
    it("should update user name successfully", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Old Name",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(api.users.updateName, {
        name: "New Name",
      });

      const updatedUser = await asUser.query(api.users.getCurrentUser);
      expect(updatedUser?.name).toBe("New Name");
    });

    it("should throw error when not authenticated", async () => {
      const t = convexTest(schema);

      await expect(
        t.mutation(api.users.updateName, { name: "New Name" })
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error when name is empty", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      await expect(
        asUser.mutation(api.users.updateName, { name: "" })
      ).rejects.toThrow("Name cannot be empty");
    });

    it("should throw error when name is whitespace only", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      await expect(
        asUser.mutation(api.users.updateName, { name: "   " })
      ).rejects.toThrow("Name cannot be empty");
    });

    it("should throw error when name exceeds 100 characters", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      const longName = "a".repeat(101);

      await expect(
        asUser.mutation(api.users.updateName, { name: longName })
      ).rejects.toThrow("Name too long (max 100 characters)");
    });

    it("should trim whitespace from name", async () => {
      const t = convexTest(schema);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      await asUser.mutation(api.users.updateName, {
        name: "  Trimmed Name  ",
      });

      const updatedUser = await asUser.query(api.users.getCurrentUser);
      expect(updatedUser?.name).toBe("Trimmed Name");
    });
  });
});
