import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LogIn } from "lucide-react";
import { GradientLogo } from "@/components/shared/GradientLogo";

describe("GradientLogo", () => {
  it("should render with gradient background", () => {
    const { container } = render(<GradientLogo icon={LogIn} />);
    const logoDiv = container.querySelector("div");

    expect(logoDiv).toBeTruthy();
    expect(logoDiv?.className).toContain("bg-gradient-to-br");
    expect(logoDiv?.className).toContain("from-blue-600");
    expect(logoDiv?.className).toContain("to-purple-600");
  });

  it("should render provided icon", () => {
    const { container } = render(<GradientLogo icon={LogIn} />);
    const icon = container.querySelector("svg");

    expect(icon).toBeTruthy();
    expect(icon?.className).toContain("text-white");
  });

  it("should have large circular size (80px)", () => {
    const { container } = render(<GradientLogo icon={LogIn} />);
    const logoDiv = container.querySelector("div");

    expect(logoDiv?.className).toContain("w-20");
    expect(logoDiv?.className).toContain("h-20");
    expect(logoDiv?.className).toContain("rounded-full");
  });

  it("should have large icon size", () => {
    const { container } = render(<GradientLogo icon={LogIn} />);
    const icon = container.querySelector("svg");

    expect(icon?.className).toContain("w-10");
    expect(icon?.className).toContain("h-10");
  });

  it("should accept custom className", () => {
    const { container } = render(<GradientLogo icon={LogIn} className="custom-class" />);
    const logoDiv = container.querySelector("div");

    expect(logoDiv?.className).toContain("custom-class");
  });

  it("should center icon", () => {
    const { container } = render(<GradientLogo icon={LogIn} />);
    const logoDiv = container.querySelector("div");

    expect(logoDiv?.className).toContain("flex");
    expect(logoDiv?.className).toContain("items-center");
    expect(logoDiv?.className).toContain("justify-center");
  });
});
