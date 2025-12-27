import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InviteSection } from "@/components/artifact/share/InviteSection";

describe("InviteSection", () => {
  const mockOnInvite = vi.fn();

  beforeEach(() => {
    mockOnInvite.mockClear();
  });

  it("should render email input with placeholder", () => {
    render(<InviteSection onInvite={mockOnInvite} />);

    const input = screen.getByPlaceholderText("Enter email address");
    expect(input).toBeInTheDocument();
  });

  it("should render Invite button", () => {
    render(<InviteSection onInvite={mockOnInvite} />);

    expect(screen.getByRole("button", { name: /invite/i })).toBeInTheDocument();
  });

  it("should call onInvite with email when button clicked", async () => {
    const user = userEvent.setup();
    mockOnInvite.mockResolvedValue(undefined);

    render(<InviteSection onInvite={mockOnInvite} />);

    await user.type(screen.getByPlaceholderText("Enter email address"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /invite/i }));

    await waitFor(() => {
      expect(mockOnInvite).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("should call onInvite when Enter pressed in input", async () => {
    const user = userEvent.setup();
    mockOnInvite.mockResolvedValue(undefined);

    render(<InviteSection onInvite={mockOnInvite} />);

    const input = screen.getByPlaceholderText("Enter email address");
    await user.type(input, "test@example.com");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockOnInvite).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("should show loading state while inviting", async () => {
    const user = userEvent.setup();
    // Simulate slow async operation
    mockOnInvite.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<InviteSection onInvite={mockOnInvite} isLoading={true} />);

    const button = screen.getByRole("button", { name: /inviting/i });
    expect(button).toBeDisabled();
  });

  it("should disable input and button while loading", () => {
    render(<InviteSection onInvite={mockOnInvite} isLoading={true} />);

    expect(screen.getByPlaceholderText("Enter email address")).toBeDisabled();
    expect(screen.getByRole("button", { name: /inviting/i })).toBeDisabled();
  });

  it("should show error message for invalid email", async () => {
    const user = userEvent.setup();

    render(<InviteSection onInvite={mockOnInvite} />);

    const input = screen.getByPlaceholderText("Enter email address");
    await user.type(input, "invalid-email");
    await user.click(screen.getByRole("button", { name: /invite/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it("should clear input after successful invite", async () => {
    const user = userEvent.setup();
    mockOnInvite.mockResolvedValue(undefined);

    render(<InviteSection onInvite={mockOnInvite} />);

    const input = screen.getByPlaceholderText("Enter email address") as HTMLInputElement;
    await user.type(input, "test@example.com");
    await user.click(screen.getByRole("button", { name: /invite/i }));

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("should validate email format", async () => {
    const user = userEvent.setup();

    render(<InviteSection onInvite={mockOnInvite} />);

    const input = screen.getByPlaceholderText("Enter email address");

    // Invalid email
    await user.type(input, "notanemail");
    await user.click(screen.getByRole("button", { name: /invite/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
    expect(mockOnInvite).not.toHaveBeenCalled();
  });

  it("should display error prop when provided", () => {
    render(<InviteSection onInvite={mockOnInvite} error="User already invited" />);

    expect(screen.getByText("User already invited")).toBeInTheDocument();
  });

  it("should render Mail icon in input", () => {
    const { container } = render(<InviteSection onInvite={mockOnInvite} />);

    // Check for SVG icon
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
