import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

describe("Password Authentication Schema", () => {
  it("should query user by email using index", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: "bob@local.app",
      });
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", "bob@local.app"))
        .unique();
    });

    expect(user).not.toBeNull();
    expect(user?.email).toBe("bob@local.app");
  });
});

describe("Password Authentication Provider", () => {
  it("should have Password provider configured", async () => {
    const t = convexTest(schema);

    // Verify auth system is exported correctly
    expect(api.auth.signIn).toBeDefined();
    expect(api.auth.signOut).toBeDefined();
  });

  // Note: Full password registration and sign-in flows are tested in E2E tests
  // because they require JWT_PRIVATE_KEY environment variable and full auth setup.
  // The convex-test library doesn't fully support Convex Auth actions in isolation.
});
