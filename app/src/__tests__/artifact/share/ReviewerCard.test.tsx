import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ReviewerCard } from "@/components/artifact/share/ReviewerCard";

describe("ReviewerCard", () => {
  const mockReviewer = {
    _id: "reviewer-1",
    email: "sarah@company.com",
    status: "accepted" as const,
    user: {
      name: "Sarah Chen",
    },
  };

  it("should render avatar with initials", () => {
    render(<ReviewerCard reviewer={mockReviewer} onRemove={vi.fn()} />);

    // Should show initials (S from Sarah)
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("should render user name when available", () => {
    render(<ReviewerCard reviewer={mockReviewer} onRemove={vi.fn()} />);

    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
  });

  it("should render email address", () => {
    render(<ReviewerCard reviewer={mockReviewer} onRemove={vi.fn()} />);

    expect(screen.getByText("sarah@company.com")).toBeInTheDocument();
  });

  it("should render 'Pending' badge for pending status", () => {
    const pendingReviewer = {
      ...mockReviewer,
      status: "pending" as const,
    };

    render(<ReviewerCard reviewer={pendingReviewer} onRemove={vi.fn()} />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("should render 'Accepted' badge for accepted status", () => {
    render(<ReviewerCard reviewer={mockReviewer} onRemove={vi.fn()} />);

    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("should call onRemove when X button clicked", async () => {
    const user = userEvent.setup();
    const mockOnRemove = vi.fn();

    render(<ReviewerCard reviewer={mockReviewer} onRemove={mockOnRemove} />);

    const removeButton = screen.getByRole("button", { name: /remove/i });
    await user.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledWith("reviewer-1");
  });

  it("should show loading state while removing", () => {
    render(<ReviewerCard reviewer={mockReviewer} onRemove={vi.fn()} isRemoving={true} />);

    // Should show spinner instead of X icon
    const removeButton = screen.getByRole("button", { name: /remove/i });
    expect(removeButton).toBeDisabled();
  });

  it("should render email as initials when user has no name", () => {
    const noNameReviewer = {
      ...mockReviewer,
      user: null,
    };

    render(<ReviewerCard reviewer={noNameReviewer} onRemove={vi.fn()} />);

    // Should show first letter of email (s from sarah@company.com)
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("should have hover effect styling", () => {
    const { container } = render(<ReviewerCard reviewer={mockReviewer} onRemove={vi.fn()} />);

    // Find the card element - should have hover classes
    const card = container.querySelector('.hover\\:bg-gray-100');
    expect(card).toBeInTheDocument();
  });
});
