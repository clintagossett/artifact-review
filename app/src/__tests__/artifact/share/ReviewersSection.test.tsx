import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ReviewersSection } from "@/components/artifact/share/ReviewersSection";

describe("ReviewersSection", () => {
  const mockReviewers = [
    {
      _id: "1",
      email: "sarah@company.com",
      status: "accepted" as const,
      invitedAt: Date.now(),
      user: { name: "Sarah Chen" },
    },
    {
      _id: "2",
      email: "mike@company.com",
      status: "pending" as const,
      invitedAt: Date.now(),
      user: null,
    },
  ];

  it("should render header with reviewer count", () => {
    render(<ReviewersSection reviewers={mockReviewers} onRemove={vi.fn()} />);

    expect(screen.getByText("People with Access (2)")).toBeInTheDocument();
  });

  it("should render list of reviewer cards", () => {
    render(<ReviewersSection reviewers={mockReviewers} onRemove={vi.fn()} />);

    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    // Email appears twice for users without names (as both name and email)
    const mikeEmails = screen.getAllByText("mike@company.com");
    expect(mikeEmails.length).toBeGreaterThan(0);
  });

  it("should show empty state when no reviewers", () => {
    render(<ReviewersSection reviewers={[]} onRemove={vi.fn()} />);

    expect(screen.getByText(/no reviewers yet/i)).toBeInTheDocument();
  });

  it("should be scrollable when many reviewers", () => {
    const manyReviewers = Array.from({ length: 10 }, (_, i) => ({
      _id: `reviewer-${i}`,
      email: `user${i}@example.com`,
      status: "accepted" as const,
      invitedAt: Date.now(),
      user: { name: `User ${i}` },
    }));

    const { container } = render(
      <ReviewersSection reviewers={manyReviewers} onRemove={vi.fn()} />
    );

    // Should have scrollable container with max height
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeInTheDocument();
  });

  it("should pass onRemove to reviewer cards", async () => {
    const mockOnRemove = vi.fn();
    render(<ReviewersSection reviewers={mockReviewers} onRemove={mockOnRemove} />);

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    expect(removeButtons).toHaveLength(2);
  });
});
