import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UnauthenticatedBanner } from "@/components/artifact/UnauthenticatedBanner";

describe("UnauthenticatedBanner", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = { href: "" } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it("should render lock icon", () => {
    const { container } = render(<UnauthenticatedBanner shareToken="abc123" />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it("should render sign in message", () => {
    render(<UnauthenticatedBanner shareToken="abc123" />);

    expect(screen.getByText("Sign in to view and comment")).toBeInTheDocument();
  });

  it("should render description", () => {
    render(<UnauthenticatedBanner shareToken="abc123" />);

    expect(screen.getByText(/You've been invited to review this artifact/i)).toBeInTheDocument();
  });

  it("should render Sign In to Review button", () => {
    render(<UnauthenticatedBanner shareToken="abc123" />);

    expect(screen.getByRole("button", { name: /sign in to review/i })).toBeInTheDocument();
  });

  it("should redirect to login with returnTo when clicked", async () => {
    const user = userEvent.setup();
    render(<UnauthenticatedBanner shareToken="abc123" />);

    const button = screen.getByRole("button", { name: /sign in to review/i });
    await user.click(button);

    expect(window.location.href).toBe("/login?returnTo=%2Fa%2Fabc123");
  });

  it("should encode shareToken in returnTo URL", async () => {
    const user = userEvent.setup();
    render(<UnauthenticatedBanner shareToken="token-with-special?chars" />);

    const button = screen.getByRole("button", { name: /sign in to review/i });
    await user.click(button);

    // Check that the URL is properly encoded
    expect(window.location.href).toContain("returnTo=");
    expect(decodeURIComponent(window.location.href)).toContain("/a/token-with-special?chars");
  });

  it("should have blue background styling", () => {
    const { container } = render(<UnauthenticatedBanner shareToken="abc123" />);

    const banner = container.firstChild;
    expect(banner).toHaveClass("bg-blue-50");
    expect(banner).toHaveClass("border-blue-200");
  });
});
