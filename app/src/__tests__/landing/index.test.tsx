import { describe, it, expect } from "vitest";
import {
  TestimonialsSection,
  PricingSection,
} from "@/components/landing";

describe("Landing Components Index", () => {
  it("should export TestimonialsSection", () => {
    expect(TestimonialsSection).toBeDefined();
  });

  it("should export PricingSection", () => {
    expect(PricingSection).toBeDefined();
  });
});
