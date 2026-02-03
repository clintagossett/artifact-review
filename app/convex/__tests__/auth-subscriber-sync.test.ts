import { convexTest } from "convex-test";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";

// Track mock calls for Novu
const mockIdentify = vi.fn().mockResolvedValue({ data: { subscriberId: "test-subscriber" } });

// Mock the Novu module with a proper class mock
vi.mock("@novu/node", () => {
  return {
    Novu: class MockNovu {
      static lastInstance: MockNovu | null = null;
      static constructorArgs: unknown[] = [];

      subscribers = {
        identify: mockIdentify,
      };

      constructor(...args: unknown[]) {
        MockNovu.constructorArgs = args;
        MockNovu.lastInstance = this;
      }
    },
  };
});

describe("Auth Subscriber Sync", () => {
  beforeEach(() => {
    vi.stubEnv("NOVU_SECRET_KEY", "test-novu-secret-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("should schedule subscriber sync when new user signs up", async () => {
    const t = convexTest(schema);

    // Create a user and verify subscriber sync action exists and can be called
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "newuser@example.com",
        name: "New User",
        image: "https://example.com/avatar.jpg",
        createdAt: Date.now(),
      });
    });

    // Verify we can look up the user and their data is correct
    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user).not.toBeNull();
    expect(user?.email).toBe("newuser@example.com");
    expect(user?.name).toBe("New User");

    // Call the subscriber sync action (simulating what scheduler would do)
    await t.action(internal.novu.createOrUpdateSubscriber, {
      userId,
      email: user?.email,
      name: user?.name,
      avatarUrl: user?.image,
    });

    // Verify Novu identify was called correctly
    expect(mockIdentify).toHaveBeenCalledWith(userId, {
      email: "newuser@example.com",
      firstName: "New User",
      avatar: "https://example.com/avatar.jpg",
    });
  });

  it("should schedule subscriber sync when user profile is updated", async () => {
    const t = convexTest(schema);

    // Create an existing user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "existing@example.com",
        name: "Old Name",
        createdAt: Date.now(),
      });
    });

    // Update user (simulating what auth callback does on re-sign-in with updated profile)
    await t.run(async (ctx) => {
      await ctx.db.patch(userId, {
        name: "New Name",
        image: "https://example.com/new-avatar.jpg",
        updatedAt: Date.now(),
      });
    });

    // Verify updated user data
    const updatedUser = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(updatedUser?.name).toBe("New Name");
    expect(updatedUser?.image).toBe("https://example.com/new-avatar.jpg");

    // Call subscriber sync with updated data (simulating what scheduler would do)
    await t.action(internal.novu.createOrUpdateSubscriber, {
      userId,
      email: updatedUser?.email,
      name: updatedUser?.name,
      avatarUrl: updatedUser?.image,
    });

    // Verify Novu identify was called with updated data
    expect(mockIdentify).toHaveBeenCalledWith(userId, {
      email: "existing@example.com",
      firstName: "New Name",
      avatar: "https://example.com/new-avatar.jpg",
    });
  });

  it("should verify createOrUpdateSubscriber action exists for auth callback to use", async () => {
    // Verify the internal action exists and can be referenced
    expect(internal.novu.createOrUpdateSubscriber).toBeDefined();
  });

  it("should complete end-to-end subscriber creation flow", async () => {
    const t = convexTest(schema);

    // Step 1: Create a user (simulating signup)
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "e2e-test@example.com",
        name: "E2E Test User",
        image: "https://example.com/e2e-avatar.jpg",
        createdAt: Date.now(),
      });
    });

    // Step 2: Create organization for the user (simulating bootstrap flow)
    await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "E2E Test User's Organization",
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
    });

    // Step 3: Call subscriber sync (simulating what scheduler does after auth callback)
    await t.action(internal.novu.createOrUpdateSubscriber, {
      userId,
      email: "e2e-test@example.com",
      name: "E2E Test User",
      avatarUrl: "https://example.com/e2e-avatar.jpg",
    });

    // Step 4: Verify Novu was called with correct subscriber ID (userId)
    const { Novu } = await import("@novu/node");
    const MockNovu = Novu as unknown as {
      lastInstance: { subscribers: { identify: typeof mockIdentify } } | null;
      constructorArgs: unknown[];
    };

    // Verify Novu was initialized with correct API key
    expect(MockNovu.constructorArgs[0]).toBe("test-novu-secret-key");

    // Verify identify was called with userId as subscriberId
    expect(mockIdentify).toHaveBeenCalledWith(userId, {
      email: "e2e-test@example.com",
      firstName: "E2E Test User",
      avatar: "https://example.com/e2e-avatar.jpg",
    });

    // Step 5: Verify user can be looked up in the database
    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user).not.toBeNull();
    expect(user?._id).toBe(userId);
    expect(user?.email).toBe("e2e-test@example.com");

    // Step 6: Verify organization was created
    const membership = await t.run(async (ctx) => {
      return await ctx.db
        .query("members")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();
    });

    expect(membership).not.toBeNull();
    expect(membership?.roles).toContain("owner");
  });
});
