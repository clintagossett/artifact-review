import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccessDeniedMessage } from "@/components/artifact/AccessDeniedMessage";

// Mock is already set up in vitest.setup.ts, we just need to access it
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

describe("AccessDeniedMessage", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("should render lock icon", () => {
    const { container } = render(<AccessDeniedMessage />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it("should render 'You don't have access' heading", () => {
    render(<AccessDeniedMessage />);

    expect(screen.getByText("You don't have access")).toBeInTheDocument();
  });

  it("should render artifact title when provided", () => {
    render(<AccessDeniedMessage artifactTitle="My Cool Artifact" />);

    expect(screen.getByText(/My Cool Artifact/i)).toBeInTheDocument();
  });

  it("should not render artifact title when not provided", () => {
    const { container } = render(<AccessDeniedMessage />);

    // Should not have "to" text that would precede artifact title
    const text = container.textContent;
    expect(text).not.toMatch(/to ".*"/);
  });

  it("should render contact message", () => {
    render(<AccessDeniedMessage />);

    expect(screen.getByText(/Contact the artifact owner to request access/i)).toBeInTheDocument();
  });

  it("should render Back to Dashboard button", () => {
    render(<AccessDeniedMessage />);

    expect(screen.getByRole("button", { name: /back to dashboard/i })).toBeInTheDocument();
  });

  it("should navigate to dashboard when button clicked", async () => {
    const user = userEvent.setup();
    render(<AccessDeniedMessage />);

    const button = screen.getByRole("button", { name: /back to dashboard/i });
    await user.click(button);

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it("should have centered card styling", () => {
    const { container } = render(<AccessDeniedMessage />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("max-w-md");
    expect(wrapper).toHaveClass("mx-auto");
  });
});
