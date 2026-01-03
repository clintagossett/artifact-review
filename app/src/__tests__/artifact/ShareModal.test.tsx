import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShareModal } from "@/components/artifact/ShareModal";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined), // Return undefined when using initialReviewers
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("ShareModal", () => {
  const mockArtifact = {
    _id: "art1" as any,
    name: "Test Artifact",
    shareToken: "abc123",
  };

  const mockReviewers = [
    {
      _id: "rev1",
      email: "sarah@company.com",
      status: "accepted" as const,
      invitedAt: Date.now(),
      user: { name: "Sarah Chen" },
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    artifact: mockArtifact,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render modal with correct title", () => {
    render(<ShareModal {...defaultProps} />);

    expect(screen.getByText("Share Artifact for Review")).toBeInTheDocument();
  });

  it("should render subtitle text", () => {
    render(<ShareModal {...defaultProps} />);

    expect(screen.getByText(/Invite teammates to view and comment/i)).toBeInTheDocument();
  });

  it("should close when X button clicked", async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    render(<ShareModal {...defaultProps} onClose={mockOnClose} />);

    // The X button in DialogContent has aria-label "Close"
    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    // First button is the X in the corner
    const xButton = closeButtons[0];
    await user.click(xButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should close when Close button clicked", async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    render(<ShareModal {...defaultProps} onClose={mockOnClose} />);

    // Find the footer close button (not the X button)
    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    const footerCloseButton = closeButtons[closeButtons.length - 1];
    await user.click(footerCloseButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should show InviteSection", () => {
    render(<ShareModal {...defaultProps} />);

    expect(screen.getByPlaceholderText("Enter email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /invite/i })).toBeInTheDocument();
  });

  it("should show ReviewersSection", () => {
    render(<ShareModal {...defaultProps} initialReviewers={mockReviewers} />);

    expect(screen.getByText("People with Access (1)")).toBeInTheDocument();
  });

  it("should show PermissionsInfoBox", () => {
    render(<ShareModal {...defaultProps} />);

    expect(screen.getByText("Reviewer Access")).toBeInTheDocument();
  });

  it("should show empty state when no reviewers", () => {
    render(<ShareModal {...defaultProps} initialReviewers={[]} />);

    expect(screen.getByText(/No reviewers yet/i)).toBeInTheDocument();
  });

  it("should show reviewer count in header", () => {
    render(<ShareModal {...defaultProps} initialReviewers={mockReviewers} />);

    expect(screen.getByText("People with Access (1)")).toBeInTheDocument();
  });

  it("should not render when isOpen is false", () => {
    render(<ShareModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("Share Artifact for Review")).not.toBeInTheDocument();
  });
});
