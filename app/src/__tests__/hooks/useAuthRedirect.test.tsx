/**
 * Tests for useAuthRedirect hook
 *
 * Test Coverage:
 * - Returns loading state while auth is undefined
 * - Returns authenticated state when user is logged in
 * - Returns unauthenticated state when user is null
 * - Redirects authenticated users when ifAuthenticated is configured
 * - Redirects unauthenticated users when ifUnauthenticated is configured
 * - Does not redirect when auth is loading
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useConvexAuth: vi.fn(),
}));

// Import mocked modules for type safety
import { useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";

describe("useAuthRedirect", () => {
  const mockReplace = vi.fn();
  const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;
  const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;
  const mockUseConvexAuth = useConvexAuth as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: vi.fn(),
      replace: mockReplace,
      refresh: vi.fn(),
    });
    // Default mock for useConvexAuth - tests will override as needed
    mockUseConvexAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });
  });

  describe("Auth State Detection", () => {
    it("should return isLoading=true when currentUser is undefined", () => {
      // When auth is still loading
      mockUseConvexAuth.mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
      });
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useAuthRedirect({ ifAuthenticated: "/dashboard" })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeUndefined();
    });

    it("should return isAuthenticated=true when currentUser exists", () => {
      const mockUser = { _id: "user123", email: "test@example.com" };
      mockUseConvexAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      });
      mockUseQuery.mockReturnValue(mockUser);

      const { result } = renderHook(() =>
        useAuthRedirect({ ifAuthenticated: "/dashboard" })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it("should return isAuthenticated=false when currentUser is null", () => {
      mockUseConvexAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
      });
      mockUseQuery.mockReturnValue(null);

      const { result } = renderHook(() =>
        useAuthRedirect({ ifUnauthenticated: "/" })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });
  });

  describe("Redirect Behavior - Authenticated", () => {
    it("should redirect authenticated user to configured path", async () => {
      const mockUser = { _id: "user123", email: "test@example.com" };
      mockUseConvexAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      });
      mockUseQuery.mockReturnValue(mockUser);

      renderHook(() => useAuthRedirect({ ifAuthenticated: "/dashboard" }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("should not redirect authenticated user if no ifAuthenticated path", () => {
      const mockUser = { _id: "user123", email: "test@example.com" };
      mockUseConvexAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      });
      mockUseQuery.mockReturnValue(mockUser);

      renderHook(() => useAuthRedirect({ ifUnauthenticated: "/" }));

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should not redirect while auth is loading", () => {
      mockUseConvexAuth.mockReturnValue({
        isLoading: true,
        isAuthenticated: false,
      });
      mockUseQuery.mockReturnValue(undefined);

      renderHook(() => useAuthRedirect({ ifAuthenticated: "/dashboard" }));

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("Redirect Behavior - Unauthenticated", () => {
    it("should redirect unauthenticated user to configured path", async () => {
      mockUseConvexAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
      });
      mockUseQuery.mockReturnValue(null);

      renderHook(() => useAuthRedirect({ ifUnauthenticated: "/" }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/");
      });
    });

    it("should not redirect unauthenticated user if no ifUnauthenticated path", () => {
      mockUseConvexAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
      });
      mockUseQuery.mockReturnValue(null);

      renderHook(() => useAuthRedirect({ ifAuthenticated: "/dashboard" }));

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty config object", () => {
      const mockUser = { _id: "user123", email: "test@example.com" };
      mockUseConvexAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      });
      mockUseQuery.mockReturnValue(mockUser);

      const { result } = renderHook(() => useAuthRedirect({}));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
