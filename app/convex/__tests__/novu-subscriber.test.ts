import { convexTest } from "convex-test";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";

// Track mock calls
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

describe("createOrUpdateSubscriber", () => {
  beforeEach(() => {
    vi.stubEnv("NOVU_SECRET_KEY", "test-novu-secret-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("should successfully create subscriber with full user data", async () => {
    const t = convexTest(schema);

    // Create a test user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.jpg",
        createdAt: Date.now(),
      });
    });

    // Call the createOrUpdateSubscriber action
    await t.action(internal.novu.createOrUpdateSubscriber, {
      userId,
      email: "test@example.com",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    });

    // Verify that Novu identify was called with correct parameters
    const { Novu } = await import("@novu/node");
    const MockNovu = Novu as unknown as {
      lastInstance: { subscribers: { identify: typeof mockIdentify } } | null;
      constructorArgs: unknown[];
    };

    // Verify constructor was called with correct API key
    expect(MockNovu.constructorArgs[0]).toBe("test-novu-secret-key");
    expect(MockNovu.constructorArgs[1]).toBeUndefined();

    // Verify identify was called with correct params
    expect(mockIdentify).toHaveBeenCalledWith(userId, {
      email: "test@example.com",
      firstName: "Test User",
      avatar: "https://example.com/avatar.jpg",
    });
  });

  it("should create subscriber with minimal data (userId only)", async () => {
    const t = convexTest(schema);

    // Create a test user with only required fields
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        createdAt: Date.now(),
      });
    });

    // Call with only userId (no optional fields)
    await t.action(internal.novu.createOrUpdateSubscriber, {
      userId,
    });

    // Verify identify was called with undefined for optional fields
    expect(mockIdentify).toHaveBeenCalledWith(userId, {
      email: undefined,
      firstName: undefined,
      avatar: undefined,
    });
  });

  it("should gracefully skip when NOVU_SECRET_KEY is not set", async () => {
    const t = convexTest(schema);

    // Remove the API key
    vi.unstubAllEnvs();
    vi.stubEnv("NOVU_SECRET_KEY", "");
    delete process.env.NOVU_SECRET_KEY;

    // Spy on console.warn
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Create a test user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        createdAt: Date.now(),
      });
    });

    // Call the action - should not throw
    const result = await t.action(internal.novu.createOrUpdateSubscriber, {
      userId,
      email: "test@example.com",
    });

    // Should return null and NOT call Novu
    expect(result).toBeNull();
    expect(mockIdentify).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Missing NOVU_SECRET_KEY. Skipping subscriber sync."
    );

    warnSpy.mockRestore();
  });

  it("should propagate Novu API errors", async () => {
    const t = convexTest(schema);

    // Make identify throw an error
    const testError = new Error("Novu API error: rate limit exceeded");
    mockIdentify.mockRejectedValueOnce(testError);

    // Create a test user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        createdAt: Date.now(),
      });
    });

    // Action should throw the error (allowing Convex scheduler to retry)
    await expect(
      t.action(internal.novu.createOrUpdateSubscriber, {
        userId,
        email: "test@example.com",
      })
    ).rejects.toThrow("Novu API error: rate limit exceeded");
  });
});
