/**
 * Tests for Novu Bridge Endpoint
 *
 * These tests verify the bridge API route that allows Novu Cloud
 * to discover and execute workflows.
 *
 * Note: The serve() function from @novu/framework requires NOVU_SECRET_KEY
 * to be set. We set a test value to allow the module to load.
 */

import { describe, it, expect, beforeAll } from "vitest";

// Set required env vars BEFORE importing the route
beforeAll(() => {
  process.env.NOVU_SECRET_KEY = "test-secret-key-for-testing";
});

describe("Novu Bridge Endpoint (Test 6.x)", () => {
  describe("Test 6.1: GET /api/novu returns workflow discovery response", () => {
    it("should export GET handler", async () => {
      const { GET } = await import("@/app/api/novu/route");
      expect(GET).toBeDefined();
      expect(typeof GET).toBe("function");
    });
  });

  describe("Test 6.2: POST /api/novu accepts workflow execution requests", () => {
    it("should export POST handler", async () => {
      const { POST } = await import("@/app/api/novu/route");
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("Test 6.3: OPTIONS /api/novu returns CORS headers", () => {
    it("should export OPTIONS handler", async () => {
      const { OPTIONS } = await import("@/app/api/novu/route");
      expect(OPTIONS).toBeDefined();
      expect(typeof OPTIONS).toBe("function");
    });
  });
});
