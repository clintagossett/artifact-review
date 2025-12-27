import { describe, it, expect } from "vitest";
import { validateReturnTo } from "@/lib/validateReturnTo";

describe("validateReturnTo", () => {
  describe("Valid relative URLs", () => {
    it("should accept simple relative path", () => {
      expect(validateReturnTo("/dashboard")).toBe("/dashboard");
    });

    it("should accept relative path with query params", () => {
      expect(validateReturnTo("/a/abc123?version=2")).toBe("/a/abc123?version=2");
    });

    it("should accept relative path with hash", () => {
      expect(validateReturnTo("/artifacts#latest")).toBe("/artifacts#latest");
    });

    it("should accept deeply nested path", () => {
      expect(validateReturnTo("/a/token/v/123/page")).toBe("/a/token/v/123/page");
    });

    it("should trim whitespace", () => {
      expect(validateReturnTo("  /dashboard  ")).toBe("/dashboard");
    });
  });

  describe("Invalid URLs (security)", () => {
    it("should reject null", () => {
      expect(validateReturnTo(null)).toBe(null);
    });

    it("should reject undefined", () => {
      expect(validateReturnTo(undefined)).toBe(null);
    });

    it("should reject empty string", () => {
      expect(validateReturnTo("")).toBe(null);
    });

    it("should reject whitespace-only string", () => {
      expect(validateReturnTo("   ")).toBe(null);
    });

    it("should reject absolute HTTP URL", () => {
      expect(validateReturnTo("http://evil.com")).toBe(null);
    });

    it("should reject absolute HTTPS URL", () => {
      expect(validateReturnTo("https://evil.com")).toBe(null);
    });

    it("should reject javascript: protocol", () => {
      expect(validateReturnTo("javascript:alert('XSS')")).toBe(null);
    });

    it("should reject data: protocol", () => {
      expect(validateReturnTo("data:text/html,<script>alert('XSS')</script>")).toBe(null);
    });

    it("should reject protocol-relative URL", () => {
      expect(validateReturnTo("//evil.com")).toBe(null);
    });

    it("should reject URL not starting with /", () => {
      expect(validateReturnTo("dashboard")).toBe(null);
    });

    it("should reject URL with embedded protocol", () => {
      expect(validateReturnTo("/redirect?url=http://evil.com")).toBe(null);
    });
  });

  describe("Edge cases", () => {
    it("should accept root path", () => {
      expect(validateReturnTo("/")).toBe("/");
    });

    it("should accept path with encoded characters", () => {
      expect(validateReturnTo("/search?q=%20hello")).toBe("/search?q=%20hello");
    });

    it("should accept path with special characters", () => {
      expect(validateReturnTo("/a/token-123_abc")).toBe("/a/token-123_abc");
    });
  });
});
