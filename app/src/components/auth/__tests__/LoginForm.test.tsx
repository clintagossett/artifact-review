/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthActions } from "@convex-dev/auth/react";
import { LoginForm } from "../LoginForm";

// Track auth state for testing
let mockIsAuthenticated = false;

// Mock Convex auth
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: vi.fn(),
}));

// Mock convex/react for useConvexAuth
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isLoading: false,
    isAuthenticated: mockIsAuthenticated,
  }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
  });

  it("should render email and password inputs", () => {
    vi.mocked(useAuthActions).mockReturnValue({ signIn: vi.fn(), signOut: vi.fn() });

    render(<LoginForm onSuccess={vi.fn()} />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("should render sign in button", () => {
    vi.mocked(useAuthActions).mockReturnValue({ signIn: vi.fn(), signOut: vi.fn() });

    render(<LoginForm onSuccess={vi.fn()} />);

    const submitButton = screen.getByRole("button", { name: /^sign in$/i });
    expect(submitButton).toBeInTheDocument();
  });

  it("should call signIn with email and password when form is submitted", async () => {
    const user = userEvent.setup();
    const mockOnSuccess = vi.fn();
    const mockSignIn = vi.fn().mockImplementation(async () => {
      mockIsAuthenticated = true;
    });

    vi.mocked(useAuthActions).mockReturnValue({ signIn: mockSignIn, signOut: vi.fn() });

    render(<LoginForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText(/email address/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("password", {
        email: "test@example.com",
        password: "password123",
        flow: "signIn",
      });
    });
  });

  it("should show error message when sign in fails", async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn().mockRejectedValue(new Error("Invalid credentials"));

    vi.mocked(useAuthActions).mockReturnValue({ signIn: mockSignIn, signOut: vi.fn() });

    render(<LoginForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/email address/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it("should disable button while loading", async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn(() => new Promise((r) => setTimeout(r, 100)));

    vi.mocked(useAuthActions).mockReturnValue({ signIn: mockSignIn, signOut: vi.fn() });

    render(<LoginForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/email address/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");

    const button = screen.getByRole("button", { name: /^sign in$/i });

    // Click and immediately check if disabled (before promise resolves)
    const clickPromise = user.click(button);

    // Wait a bit for the loading state to be set
    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    await clickPromise;
  });
});
