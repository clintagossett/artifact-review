import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnauthenticatedBanner } from "@/components/artifact/UnauthenticatedBanner";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

describe("UnauthenticatedBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render lock icon", () => {
    const { container } = render(<UnauthenticatedBanner shareToken="abc123" />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it("should render Private Artifact heading", () => {
    render(<UnauthenticatedBanner shareToken="abc123" />);

    expect(screen.getByText("Private Artifact")).toBeInTheDocument();
  });

  it("should render description", () => {
    render(<UnauthenticatedBanner shareToken="abc123" />);

    expect(screen.getByText(/You've been invited to review this artifact/i)).toBeInTheDocument();
  });

  it("should render Sign In to Review button", () => {
    render(<UnauthenticatedBanner shareToken="abc123" />);

    expect(screen.getByRole("button", { name: /sign in to review/i })).toBeInTheDocument();
  });

  it("should render Create Free Account button", () => {
    render(<UnauthenticatedBanner shareToken="abc123" />);

    expect(screen.getByRole("button", { name: /create free account/i })).toBeInTheDocument();
  });

  it("should redirect to login with returnTo when Sign In clicked", async () => {
    const user = userEvent.setup();
    render(<UnauthenticatedBanner shareToken="abc123" />);

    const button = screen.getByRole("button", { name: /sign in to review/i });
    await user.click(button);

    expect(mockPush).toHaveBeenCalledWith("/login?returnTo=%2Fa%2Fabc123");
  });

  it("should redirect to register with returnTo when Create Account clicked", async () => {
    const user = userEvent.setup();
    render(<UnauthenticatedBanner shareToken="abc123" />);

    const button = screen.getByRole("button", { name: /create free account/i });
    await user.click(button);

    expect(mockPush).toHaveBeenCalledWith("/register?returnTo=%2Fa%2Fabc123");
  });

  it("should encode shareToken in returnTo URL", async () => {
    const user = userEvent.setup();
    render(<UnauthenticatedBanner shareToken="token-with-special?chars" />);

    const button = screen.getByRole("button", { name: /sign in to review/i });
    await user.click(button);

    // Check that the URL is properly encoded
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("returnTo="));
    const callArg = mockPush.mock.calls[0][0];
    expect(decodeURIComponent(callArg)).toContain("/a/token-with-special?chars");
  });

  it("should have gradient header styling", () => {
    const { container } = render(<UnauthenticatedBanner shareToken="abc123" />);

    // Check for the gradient header
    const gradientDiv = container.querySelector('.bg-gradient-to-r');
    expect(gradientDiv).toBeInTheDocument();
  });
});
