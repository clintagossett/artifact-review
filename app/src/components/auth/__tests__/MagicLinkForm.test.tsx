/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { useAuthActions } from "@convex-dev/auth/react";
import { MagicLinkForm } from "../MagicLinkForm";

// Mock Convex auth
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: vi.fn(),
}));

describe("MagicLinkForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render email input", () => {
    vi.mocked(useAuthActions).mockReturnValue({ signIn: vi.fn(), signOut: vi.fn() });

    render(<MagicLinkForm onSuccess={vi.fn()} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("should render send link button", () => {
    vi.mocked(useAuthActions).mockReturnValue({ signIn: vi.fn(), signOut: vi.fn() });

    render(<MagicLinkForm onSuccess={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /send.*link/i })
    ).toBeInTheDocument();
  });

  it("should not render password field", () => {
    vi.mocked(useAuthActions).mockReturnValue({ signIn: vi.fn(), signOut: vi.fn() });

    render(<MagicLinkForm onSuccess={vi.fn()} />);
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it("should show success message after sending email", async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuthActions).mockReturnValue({ signIn: mockSignIn, signOut: vi.fn() });

    render(<MagicLinkForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /send.*link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it("should call signIn with resend provider and email", async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuthActions).mockReturnValue({ signIn: mockSignIn, signOut: vi.fn() });

    render(<MagicLinkForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /send.*link/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("resend", { email: "test@example.com" });
    });
  });

  it("should show error message on failure", async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.mocked(useAuthActions).mockReturnValue({ signIn: mockSignIn, signOut: vi.fn() });

    render(<MagicLinkForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /send.*link/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to send magic link/i)).toBeInTheDocument();
    });
  });

  it("should disable button while sending", async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn(() => new Promise((r) => setTimeout(r, 100)));
    vi.mocked(useAuthActions).mockReturnValue({ signIn: mockSignIn, signOut: vi.fn() });

    render(<MagicLinkForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    const button = screen.getByRole("button", { name: /send.*link/i });

    const clickPromise = user.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    await clickPromise;
  });

  it("should call onSuccess after sending email", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const mockSignIn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuthActions).mockReturnValue({ signIn: mockSignIn, signOut: vi.fn() });

    render(<MagicLinkForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /send.*link/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
