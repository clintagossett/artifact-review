import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Mail } from "lucide-react";
import { IconInput } from "@/components/shared/IconInput";

describe("IconInput", () => {
  it("should render input field", () => {
    render(<IconInput icon={Mail} placeholder="Enter email" />);
    const input = screen.getByPlaceholderText("Enter email");

    expect(input).toBeTruthy();
  });

  it("should render icon on left side", () => {
    const { container } = render(<IconInput icon={Mail} placeholder="unique-icon-test" />);
    const icon = container.querySelector("svg");

    expect(icon).toBeTruthy();
    const iconClass = icon?.getAttribute("class") || "";
    expect(iconClass).toContain("w-5");
    expect(iconClass).toContain("h-5");
  });

  it("should have gray background", () => {
    render(<IconInput icon={Mail} placeholder="unique-gray-test" />);
    const input = screen.getByPlaceholderText("unique-gray-test");

    expect(input.className).toContain("bg-gray-50");
  });

  it("should have left padding for icon", () => {
    render(<IconInput icon={Mail} placeholder="unique-padding-test" />);
    const input = screen.getByPlaceholderText("unique-padding-test");

    expect(input.className).toContain("pl-10");
  });

  it("should accept custom className", () => {
    render(<IconInput icon={Mail} placeholder="unique-class-test" className="custom-class" />);
    const input = screen.getByPlaceholderText("unique-class-test");

    expect(input.className).toContain("custom-class");
  });

  it("should support different input types", () => {
    render(<IconInput icon={Mail} type="password" placeholder="password" />);
    const input = screen.getByPlaceholderText("password");

    expect(input.getAttribute("type")).toBe("password");
  });

  it("should forward ref", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<IconInput icon={Mail} ref={ref} placeholder="test" />);

    expect(ref.current).toBeTruthy();
  });

  it("should have icon container positioned absolutely", () => {
    const { container } = render(<IconInput icon={Mail} placeholder="unique-absolute-test" />);
    const iconContainer = container.querySelector(".absolute");

    expect(iconContainer).toBeTruthy();
    expect(iconContainer?.className).toContain("absolute");
    expect(iconContainer?.className).toContain("left-3");
  });
});
