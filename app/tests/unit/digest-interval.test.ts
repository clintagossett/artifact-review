/**
 * Unit Tests: Digest Interval Parsing
 *
 * Tests the getDigestInterval() function which parses environment variable
 * NOVU_DIGEST_INTERVAL into { amount, unit } format for Novu.
 *
 * Format: <number><unit> where unit is s/m/h (seconds/minutes/hours)
 * Examples: "30s", "2m", "1h"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to test the function in isolation, so we'll import it dynamically
// after setting up the environment variable mock

describe("getDigestInterval", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function getDigestIntervalWithEnv(value?: string) {
    if (value !== undefined) {
      process.env.NOVU_DIGEST_INTERVAL = value;
    } else {
      delete process.env.NOVU_DIGEST_INTERVAL;
    }

    // Dynamic import to pick up new env value
    const module = await import(
      "../../src/app/api/novu/workflows/comment-workflow"
    );
    return module.getDigestInterval();
  }

  describe("seconds parsing", () => {
    it("parses '30s' as 30 seconds", async () => {
      const result = await getDigestIntervalWithEnv("30s");
      expect(result).toEqual({ amount: 30, unit: "seconds" });
    });

    it("parses '1s' as 1 second", async () => {
      const result = await getDigestIntervalWithEnv("1s");
      expect(result).toEqual({ amount: 1, unit: "seconds" });
    });

    it("parses '120s' as 120 seconds", async () => {
      const result = await getDigestIntervalWithEnv("120s");
      expect(result).toEqual({ amount: 120, unit: "seconds" });
    });

    it("parses uppercase 'S' as seconds", async () => {
      const result = await getDigestIntervalWithEnv("45S");
      expect(result).toEqual({ amount: 45, unit: "seconds" });
    });
  });

  describe("minutes parsing", () => {
    it("parses '2m' as 2 minutes", async () => {
      const result = await getDigestIntervalWithEnv("2m");
      expect(result).toEqual({ amount: 2, unit: "minutes" });
    });

    it("parses '20m' as 20 minutes", async () => {
      const result = await getDigestIntervalWithEnv("20m");
      expect(result).toEqual({ amount: 20, unit: "minutes" });
    });

    it("parses uppercase 'M' as minutes", async () => {
      const result = await getDigestIntervalWithEnv("5M");
      expect(result).toEqual({ amount: 5, unit: "minutes" });
    });
  });

  describe("hours parsing", () => {
    it("parses '1h' as 1 hour", async () => {
      const result = await getDigestIntervalWithEnv("1h");
      expect(result).toEqual({ amount: 1, unit: "hours" });
    });

    it("parses '24h' as 24 hours", async () => {
      const result = await getDigestIntervalWithEnv("24h");
      expect(result).toEqual({ amount: 24, unit: "hours" });
    });

    it("parses uppercase 'H' as hours", async () => {
      const result = await getDigestIntervalWithEnv("2H");
      expect(result).toEqual({ amount: 2, unit: "hours" });
    });
  });

  describe("default value", () => {
    it("returns 10 minutes when env var is not set", async () => {
      const result = await getDigestIntervalWithEnv(undefined);
      expect(result).toEqual({ amount: 10, unit: "minutes" });
    });

    it("returns 10 minutes when env var is empty string", async () => {
      const result = await getDigestIntervalWithEnv("");
      expect(result).toEqual({ amount: 10, unit: "minutes" });
    });
  });

  describe("invalid values", () => {
    it("returns default for invalid format 'abc'", async () => {
      const result = await getDigestIntervalWithEnv("abc");
      expect(result).toEqual({ amount: 10, unit: "minutes" });
    });

    it("returns default for missing unit '30'", async () => {
      const result = await getDigestIntervalWithEnv("30");
      expect(result).toEqual({ amount: 10, unit: "minutes" });
    });

    it("returns default for invalid unit '30x'", async () => {
      const result = await getDigestIntervalWithEnv("30x");
      expect(result).toEqual({ amount: 10, unit: "minutes" });
    });

    it("returns default for negative number '-5s'", async () => {
      const result = await getDigestIntervalWithEnv("-5s");
      expect(result).toEqual({ amount: 10, unit: "minutes" });
    });
  });
});
