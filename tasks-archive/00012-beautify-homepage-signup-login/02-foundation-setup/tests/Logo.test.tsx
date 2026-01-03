import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Logo } from "@/components/shared/Logo";

describe("Logo", () => {
  it("should render with gradient background", () => {
    const { container } = render(<Logo />);
    const logoDiv = container.querySelector("div");

    expect(logoDiv).toBeTruthy();
    expect(logoDiv?.className).toContain("bg-gradient-to-br");
    expect(logoDiv?.className).toContain("from-blue-600");
    expect(logoDiv?.className).toContain("to-purple-600");
  });

  it("should render MessageSquare icon", () => {
    const { container } = render(<Logo />);
    const icon = container.querySelector("svg");

    expect(icon).toBeTruthy();
    expect(icon?.className).toContain("text-white");
  });

  it("should have correct size", () => {
    const { container } = render(<Logo />);
    const logoDiv = container.querySelector("div");

    expect(logoDiv?.className).toContain("w-10");
    expect(logoDiv?.className).toContain("h-10");
    expect(logoDiv?.className).toContain("rounded-lg");
  });

  it("should accept custom className", () => {
    const { container } = render(<Logo className="custom-class" />);
    const logoDiv = container.querySelector("div");

    expect(logoDiv?.className).toContain("custom-class");
  });

  it("should center content", () => {
    const { container } = render(<Logo />);
    const logoDiv = container.querySelector("div");

    expect(logoDiv?.className).toContain("flex");
    expect(logoDiv?.className).toContain("items-center");
    expect(logoDiv?.className).toContain("justify-center");
  });
});
