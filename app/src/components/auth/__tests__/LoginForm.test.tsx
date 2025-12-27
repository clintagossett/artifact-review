/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthActions } from "@convex-dev/auth/react";
import { LoginForm } from "../LoginForm";

// Mock Convex auth
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: vi.fn(),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render email and password inputs", () => {
    vi.mocked(useAuthActions).mockReturnValue({ signIn: vi.fn(), signOut: vi.fn() });

    render(<LoginForm onSuccess={vi.fn()} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("should render sign in button", () => {
    vi.mocked(useAuthActions).mockReturnValue({ signIn: vi.fn(), signOut: vi.fn() });

    render(<LoginForm onSuccess={vi.fn()} />);

    const buttons = screen.getAllByRole("button", { name: /sign in/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should call signIn with email and password when form is submitted", async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockResolvedValue(undefined);
    const mockOnSuccess = vi.fn();

    vi.mocked(useAuthActions).mockReturnValue({ signIn: mockSignIn, signOut: vi.fn() });

    render(<LoginForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getAllByRole("button", { name: /sign in/i })[0]);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("password", {
        email: "test@example.com",
        password: "password123",
        flow: "signIn",
      });
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("should show error message when sign in fails", async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockRejectedValue(new Error("Invalid credentials"));

    vi.mocked(useAuthActions).mockReturnValue({ signIn: mockSignIn, signOut: vi.fn() });

    render(<LoginForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getAllByRole("button", { name: /sign in/i })[0]);

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it("should disable button while loading", async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn(() => new Promise((r) => setTimeout(r, 100)));

    vi.mocked(useAuthActions).mockReturnValue({ signIn: mockSignIn, signOut: vi.fn() });

    render(<LoginForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");

    const buttons = screen.getAllByRole("button", { name: /sign in/i });

    // Click and immediately check if disabled (before promise resolves)
    const clickPromise = user.click(buttons[0]);

    // Wait a bit for the loading state to be set
    await waitFor(() => {
      expect(buttons[0]).toBeDisabled();
    });

    await clickPromise;
  });
});
