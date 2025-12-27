import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { AuthMethodToggle } from "@/components/auth/AuthMethodToggle";

describe("AuthMethodToggle", () => {
  it("should render Password and Magic Link options", () => {
    render(<AuthMethodToggle value="password" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /magic link/i })).toBeInTheDocument();
  });

  it("should show Password as selected when value is password", () => {
    render(<AuthMethodToggle value="password" onChange={vi.fn()} />);

    const passwordButton = screen.getByRole("button", { name: /password/i });
    const magicLinkButton = screen.getByRole("button", { name: /magic link/i });

    // Password button should have active styling (white background)
    expect(passwordButton).toHaveClass("bg-white");
    expect(magicLinkButton).not.toHaveClass("bg-white");
  });

  it("should show Magic Link as selected when value is magic-link", () => {
    render(<AuthMethodToggle value="magic-link" onChange={vi.fn()} />);

    const passwordButton = screen.getByRole("button", { name: /password/i });
    const magicLinkButton = screen.getByRole("button", { name: /magic link/i });

    // Magic Link button should have active styling (white background)
    expect(magicLinkButton).toHaveClass("bg-white");
    expect(passwordButton).not.toHaveClass("bg-white");
  });

  it("should call onChange with password when Password is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<AuthMethodToggle value="magic-link" onChange={handleChange} />);

    await user.click(screen.getByRole("button", { name: /password/i }));

    expect(handleChange).toHaveBeenCalledWith("password");
  });

  it("should call onChange with magic-link when Magic Link is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<AuthMethodToggle value="password" onChange={handleChange} />);

    await user.click(screen.getByRole("button", { name: /magic link/i }));

    expect(handleChange).toHaveBeenCalledWith("magic-link");
  });

  it("should display Lock icon for Password option", () => {
    render(<AuthMethodToggle value="password" onChange={vi.fn()} />);

    // Check that Lock icon is present (Lucide icons have data-lucide attribute)
    const passwordButton = screen.getByRole("button", { name: /password/i });
    const lockIcon = passwordButton.querySelector('svg');
    expect(lockIcon).toBeInTheDocument();
  });

  it("should display Sparkles icon for Magic Link option", () => {
    render(<AuthMethodToggle value="password" onChange={vi.fn()} />);

    // Check that Sparkles icon is present
    const magicLinkButton = screen.getByRole("button", { name: /magic link/i });
    const sparklesIcon = magicLinkButton.querySelector('svg');
    expect(sparklesIcon).toBeInTheDocument();
  });

  it("should have pill/rounded styling on container", () => {
    const { container } = render(<AuthMethodToggle value="password" onChange={vi.fn()} />);

    // Container should have rounded-full class (pill style)
    const toggleContainer = container.firstChild as HTMLElement;
    expect(toggleContainer).toHaveClass("rounded-full");
  });

  it("should be keyboard accessible", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<AuthMethodToggle value="password" onChange={handleChange} />);

    // Tab to first button
    await user.tab();
    expect(screen.getByRole("button", { name: /password/i })).toHaveFocus();

    // Tab to second button
    await user.tab();
    expect(screen.getByRole("button", { name: /magic link/i })).toHaveFocus();

    // Press Enter to select
    await user.keyboard("{Enter}");
    expect(handleChange).toHaveBeenCalledWith("magic-link");
  });
});
