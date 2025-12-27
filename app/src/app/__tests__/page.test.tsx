/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuery } from "convex/react";
import Home from "../page";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  Authenticated: vi.fn(() => null),
  Unauthenticated: vi.fn(({ children }) => children),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("Landing Page", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it("should show link to login page for unauthenticated users", () => {
    // Mock currentUser as null (unauthenticated)
    vi.mocked(useQuery).mockReturnValue(null);
    render(<Home />);

    const loginLink = screen.getByRole("link", { name: /sign in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("should show link to register page for unauthenticated users", () => {
    // Mock currentUser as null (unauthenticated)
    vi.mocked(useQuery).mockReturnValue(null);
    render(<Home />);

    // The new landing page uses "Start Free" instead of "Create Account"
    const registerLinks = screen.getAllByRole("link", { name: /start free/i });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks[0]).toHaveAttribute("href", "/register");
  });
});
