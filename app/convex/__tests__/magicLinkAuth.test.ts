import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";

describe("Magic Link Authentication Schema", () => {
  it("should have email field in users table", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "magiclink@example.com",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user?.email).toBe("magiclink@example.com");
  });

  it("should query user by email for magic link verification", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: "verify@example.com",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "verify@example.com"))
        .unique();
    });

    expect(user).not.toBeNull();
    expect(user?.email).toBe("verify@example.com");
  });
});
