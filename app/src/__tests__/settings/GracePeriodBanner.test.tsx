import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GracePeriodBanner } from "@/components/settings/GracePeriodBanner";

// Mock the hook
vi.mock("@/hooks/useGracePeriod", () => ({
  useGracePeriod: vi.fn(),
  formatTimeRemaining: vi.fn((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
    }
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }),
}));

// Mock Convex
vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

import { useGracePeriod } from "@/hooks/useGracePeriod";

describe("GracePeriodBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Fresh state (within grace period)", () => {
    it("should show green banner when fresh", () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: true,
        expiresAt: Date.now() + 15 * 60 * 1000,
        timeRemaining: 15 * 60 * 1000,
        isLoading: false,
      });

      render(<GracePeriodBanner />);

      expect(screen.getByText(/recently signed in/i)).toBeInTheDocument();
      expect(screen.getByText(/15 minutes 0 seconds/i)).toBeInTheDocument();
    });

    it("should show countdown timer", () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: true,
        expiresAt: Date.now() + 5 * 60 * 1000 + 30 * 1000,
        timeRemaining: 5 * 60 * 1000 + 30 * 1000,
        isLoading: false,
      });

      render(<GracePeriodBanner />);

      expect(screen.getByText(/5 minutes 30 seconds/i)).toBeInTheDocument();
    });

    it("should have green styling", () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: true,
        expiresAt: Date.now() + 15 * 60 * 1000,
        timeRemaining: 15 * 60 * 1000,
        isLoading: false,
      });

      const { container } = render(<GracePeriodBanner />);

      const banner = container.querySelector('.bg-green-50');
      expect(banner).toBeInTheDocument();
    });

    it("should not show magic link button when fresh", () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: true,
        expiresAt: Date.now() + 15 * 60 * 1000,
        timeRemaining: 15 * 60 * 1000,
        isLoading: false,
      });

      render(<GracePeriodBanner />);

      expect(screen.queryByRole("button", { name: /send magic link/i })).not.toBeInTheDocument();
    });
  });

  describe("Stale state (outside grace period)", () => {
    it("should show orange banner when stale", () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: false,
        expiresAt: null,
        timeRemaining: 0,
        isLoading: false,
      });

      render(<GracePeriodBanner />);

      expect(screen.getByText(/re-authentication required/i)).toBeInTheDocument();
    });

    it("should show magic link button when stale", () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: false,
        expiresAt: null,
        timeRemaining: 0,
        isLoading: false,
      });

      render(<GracePeriodBanner />);

      expect(screen.getByRole("button", { name: /send magic link/i })).toBeInTheDocument();
    });

    it("should have orange styling", () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: false,
        expiresAt: null,
        timeRemaining: 0,
        isLoading: false,
      });

      const { container } = render(<GracePeriodBanner />);

      const banner = container.querySelector('.bg-orange-50');
      expect(banner).toBeInTheDocument();
    });

    it("should show instruction text", () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: false,
        expiresAt: null,
        timeRemaining: 0,
        isLoading: false,
      });

      render(<GracePeriodBanner />);

      expect(screen.getByText(/or enter your current password below/i)).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("should show loading state", () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: false,
        expiresAt: null,
        timeRemaining: 0,
        isLoading: true,
      });

      render(<GracePeriodBanner />);

      // Should show some loading indicator or default state
      // For now, just verify it doesn't crash
      expect(screen.queryByText(/recently signed in/i)).not.toBeInTheDocument();
    });
  });

  describe("Magic link button", () => {
    it("should be clickable when stale", async () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: false,
        expiresAt: null,
        timeRemaining: 0,
        isLoading: false,
      });

      render(<GracePeriodBanner />);

      const button = screen.getByRole("button", { name: /send magic link/i });

      // Just verify button is clickable
      expect(button).toBeEnabled();

      // Click it (actual mutation is tested in E2E)
      fireEvent.click(button);
    });
  });
});
