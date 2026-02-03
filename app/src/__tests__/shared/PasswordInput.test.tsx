import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PasswordInput } from "@/components/shared/PasswordInput";

describe("PasswordInput", () => {
  it("renders with password type by default", () => {
    const { container } = render(<PasswordInput placeholder="Enter password" />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.type).toBe("password");
  });

  it("renders Lock icon", () => {
    const { container } = render(<PasswordInput placeholder="Enter password" />);
    const svgElements = container.querySelectorAll("svg");
    // Should have 2 SVGs: Lock icon and Eye icon
    expect(svgElements.length).toBeGreaterThanOrEqual(2);
  });

  it("accepts standard input props", () => {
    const { container } = render(
      <PasswordInput
        placeholder="Test placeholder"
        disabled={true}
        value="test123"
        readOnly
      />
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.placeholder).toBe("Test placeholder");
    expect(input.disabled).toBe(true);
    expect(input.value).toBe("test123");
    expect(input.readOnly).toBe(true);
  });

  it("has toggle button with type=button", () => {
    const { container } = render(<PasswordInput placeholder="Enter password" />);
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.type).toBe("button");
  });

  it("has proper styling classes", () => {
    const { container } = render(<PasswordInput placeholder="Enter password" />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.className).toContain("pl-10"); // Left padding for Lock icon
    expect(input.className).toContain("pr-10"); // Right padding for Eye icon
    expect(input.className).toContain("bg-gray-50");
  });

  it("forwards ref correctly", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<PasswordInput ref={ref} placeholder="test" />);
    expect(ref.current).toBeTruthy();
    expect(ref.current?.tagName).toBe("INPUT");
  });
});
