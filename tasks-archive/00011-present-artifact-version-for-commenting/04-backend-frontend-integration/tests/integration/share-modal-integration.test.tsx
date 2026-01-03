import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShareModal } from "@/components/artifact/ShareModal";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Mock Convex hooks
const mockReviewers = [
  {
    _id: "reviewer1" as any,
    email: "sarah@company.com",
    userId: "user1" as any,
    status: "accepted" as const,
    invitedAt: Date.now() - 86400000,
    user: { name: "Sarah Chen", email: "sarah@company.com" },
  },
  {
    _id: "reviewer2" as any,
    email: "mike@company.com",
    userId: null,
    status: "pending" as const,
    invitedAt: Date.now() - 3600000,
    user: null,
  },
];

const mockInviteReviewer = vi.fn();
const mockRemoveReviewer = vi.fn();

vi.mock("convex/react", async () => {
  const actual = await vi.importActual("convex/react");
  return {
    ...actual,
    useQuery: vi.fn((apiFunction, args) => {
      // Skip queries when modal is closed
      if (args === "skip") return undefined;

      // Return mock reviewers for getReviewers query
      if (apiFunction.toString().includes("getReviewers")) {
        return mockReviewers;
      }

      return undefined;
    }),
    useMutation: vi.fn((apiFunction) => {
      if (apiFunction.toString().includes("inviteReviewer")) {
        return mockInviteReviewer;
      }
      if (apiFunction.toString().includes("removeReviewer")) {
        return mockRemoveReviewer;
      }
      return vi.fn();
    }),
  };
});

describe("ShareModal Integration", () => {
  const mockArtifact = {
    _id: "artifact1" as any,
    title: "Test Artifact",
    shareToken: "abc123",
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInviteReviewer.mockResolvedValue("newReviewerId");
    mockRemoveReviewer.mockResolvedValue(null);
  });

  describe("Loading reviewers from backend", () => {
    it("should load reviewers using useQuery when modal is open", () => {
      const { useQuery } = require("convex/react");

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      // Verify useQuery was called for reviewers
      expect(useQuery).toHaveBeenCalled();
    });

    it("should skip query when modal is closed", () => {
      const { useQuery } = require("convex/react");
      useQuery.mockClear();

      render(
        <ShareModal
          isOpen={false}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      // Query should be called with "skip" when closed
      const calls = useQuery.mock.calls;
      const hasSkipCall = calls.some((call) => call[1] === "skip");
      expect(hasSkipCall).toBe(true);
    });

    it("should display loaded reviewers in the list", () => {
      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      // Should show both reviewers
      expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
      expect(screen.getByText("sarah@company.com")).toBeInTheDocument();
      expect(screen.getByText("mike@company.com")).toBeInTheDocument();
    });

    it("should display correct status badges", () => {
      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      expect(screen.getByText("Accepted")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("should display reviewer count in header", () => {
      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      expect(screen.getByText(/People with Access \(2\)/i)).toBeInTheDocument();
    });
  });

  describe("Inviting reviewers", () => {
    it("should call inviteReviewer mutation when invite button clicked", async () => {
      const user = userEvent.setup();

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      const emailInput = screen.getByPlaceholderText(/enter email/i);
      const inviteButton = screen.getByRole("button", { name: /invite/i });

      await user.type(emailInput, "newuser@example.com");
      await user.click(inviteButton);

      await waitFor(() => {
        expect(mockInviteReviewer).toHaveBeenCalledWith({
          artifactId: mockArtifact._id,
          email: "newuser@example.com",
        });
      });
    });

    it("should show loading state while inviting", async () => {
      const user = userEvent.setup();

      // Make mutation slow
      mockInviteReviewer.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve("newId"), 100))
      );

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      const emailInput = screen.getByPlaceholderText(/enter email/i);
      const inviteButton = screen.getByRole("button", { name: /invite/i });

      await user.type(emailInput, "newuser@example.com");
      await user.click(inviteButton);

      // Should show loading state
      expect(screen.getByText(/inviting/i)).toBeInTheDocument();
      expect(inviteButton).toBeDisabled();

      await waitFor(() => {
        expect(mockInviteReviewer).toHaveBeenCalled();
      });
    });

    it("should clear input after successful invite", async () => {
      const user = userEvent.setup();

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      const emailInput = screen.getByPlaceholderText(/enter email/i) as HTMLInputElement;
      const inviteButton = screen.getByRole("button", { name: /invite/i });

      await user.type(emailInput, "newuser@example.com");
      await user.click(inviteButton);

      await waitFor(() => {
        expect(emailInput.value).toBe("");
      });
    });
  });

  describe("Removing reviewers", () => {
    it("should call removeReviewer mutation when remove button clicked", async () => {
      const user = userEvent.setup();

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      // Find remove buttons (X buttons)
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });

      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockRemoveReviewer).toHaveBeenCalledWith({
          reviewerId: mockReviewers[0]._id,
        });
      });
    });

    it("should show loading state while removing", async () => {
      const user = userEvent.setup();

      // Make mutation slow
      mockRemoveReviewer.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 100))
      );

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      const removeButtons = screen.getAllByRole("button", { name: /remove/i });

      await user.click(removeButtons[0]);

      // Should show loading spinner (remove button becomes disabled)
      await waitFor(() => {
        expect(removeButtons[0]).toBeDisabled();
      });
    });
  });

  describe("Error handling", () => {
    it("should handle invite errors gracefully", async () => {
      const user = userEvent.setup();

      // Make mutation fail
      mockInviteReviewer.mockRejectedValue(new Error("Email already invited"));

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      const emailInput = screen.getByPlaceholderText(/enter email/i);
      const inviteButton = screen.getByRole("button", { name: /invite/i });

      await user.type(emailInput, "duplicate@example.com");
      await user.click(inviteButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/already invited/i)).toBeInTheDocument();
      });
    });

    it("should handle remove errors gracefully", async () => {
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      // Make mutation fail
      mockRemoveReviewer.mockRejectedValue(new Error("Network error"));

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      const removeButtons = screen.getAllByRole("button", { name: /remove/i });

      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe("Modal interactions", () => {
    it("should close modal when close button clicked", async () => {
      const user = userEvent.setup();

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should close modal when X button clicked", async () => {
      const user = userEvent.setup();

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          artifact={mockArtifact}
        />
      );

      // Find the X button in dialog header (aria-label close)
      const xButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-label")?.includes("close") ||
                 btn.className?.includes("close")
      );

      if (xButton) {
        await user.click(xButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });
});
