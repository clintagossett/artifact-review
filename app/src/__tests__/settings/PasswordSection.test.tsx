import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordSection } from "@/components/settings/PasswordSection";

// Mock hooks and Convex
vi.mock("@/hooks/useGracePeriod", () => ({
  useGracePeriod: vi.fn(),
  formatTimeRemaining: vi.fn((ms: number) => `${Math.floor(ms / 1000)} seconds`),
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

import { useGracePeriod } from "@/hooks/useGracePeriod";

describe("PasswordSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Within grace period (fresh)", () => {
    beforeEach(() => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: true,
        expiresAt: Date.now() + 15 * 60 * 1000,
        timeRemaining: 15 * 60 * 1000,
        isLoading: false,
      });
    });

    it("should not show current password field when fresh", () => {
      render(<PasswordSection />);

      expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();
    });

    it("should show new password field", () => {
      render(<PasswordSection />);

      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    });

    it("should show confirm password field", () => {
      render(<PasswordSection />);

      expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument();
    });

    it("should show password strength indicator when typing", async () => {
      const user = userEvent.setup();
      render(<PasswordSection />);

      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      await user.type(newPasswordInput, "password123");

      expect(screen.getByText(/password strength/i)).toBeInTheDocument();
    });

    it("should show password requirements checklist", async () => {
      const user = userEvent.setup();
      render(<PasswordSection />);

      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      await user.type(newPasswordInput, "pass");

      // Should show requirements
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/contains a number/i)).toBeInTheDocument();
      expect(screen.getByText(/contains a letter/i)).toBeInTheDocument();
    });

    it("should validate password requirements", async () => {
      const user = userEvent.setup();
      render(<PasswordSection />);

      const newPasswordInput = screen.getByLabelText(/^new password$/i);

      // Type weak password
      await user.type(newPasswordInput, "pass");

      // Requirements should show as not met
      const requirements = screen.getAllByRole("listitem");
      expect(requirements.length).toBeGreaterThan(0);
    });

    it("should validate passwords match", async () => {
      const user = userEvent.setup();
      render(<PasswordSection />);

      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(newPasswordInput, "Password123");
      await user.type(confirmPasswordInput, "Different123");

      // Should show mismatch error
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });
  });

  describe("Outside grace period (stale)", () => {
    beforeEach(() => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: false,
        expiresAt: null,
        timeRemaining: 0,
        isLoading: false,
      });
    });

    it("should show current password field when stale", () => {
      render(<PasswordSection />);

      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    });

    it("should require current password when stale", async () => {
      const user = userEvent.setup();
      render(<PasswordSection />);

      const newPasswordInput = screen.getByLabelText(/^new password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);
      const submitButton = screen.getByRole("button", { name: /change password/i });

      // Fill only new passwords
      await user.type(newPasswordInput, "NewPassword123");
      await user.type(confirmPasswordInput, "NewPassword123");

      // Try to submit without current password
      await user.click(submitButton);

      // Should not allow submission (current password is required)
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      expect(currentPasswordInput).toHaveAttribute("required");
    });

    it("should show all three password fields when stale", () => {
      render(<PasswordSection />);

      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument();
    });
  });

  describe("Grace Period Banner integration", () => {
    it("should show grace period banner", () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: true,
        expiresAt: Date.now() + 15 * 60 * 1000,
        timeRemaining: 15 * 60 * 1000,
        isLoading: false,
      });

      render(<PasswordSection />);

      // GracePeriodBanner should be rendered
      expect(screen.getByText(/recently signed in/i)).toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    it("should have submit button", () => {
      vi.mocked(useGracePeriod).mockReturnValue({
        isWithinGracePeriod: true,
        expiresAt: Date.now() + 15 * 60 * 1000,
        timeRemaining: 15 * 60 * 1000,
        isLoading: false,
      });

      render(<PasswordSection />);

      expect(screen.getByRole("button", { name: /change password/i })).toBeInTheDocument();
    });
  });
});
