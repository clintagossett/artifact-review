import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewerRow } from "../../../../../app/src/components/artifacts/ReviewerRow";
import type { Id } from "../../../../../app/convex/_generated/dataModel";

describe("ReviewerRow", () => {
  const mockReviewer = {
    displayName: "John Doe",
    email: "john@example.com",
    status: "pending" as const,
    accessId: "accessId123" as Id<"artifactAccess">,
    sendCount: 1,
    lastSentAt: Date.now(),
  };

  it("should display reviewer name and email", () => {
    render(
      <ReviewerRow
        reviewer={mockReviewer}
        onResend={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("should display 'Pending' badge for pending status", () => {
    render(
      <ReviewerRow
        reviewer={mockReviewer}
        onResend={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const badge = screen.getByText("Pending");
    expect(badge).toBeInTheDocument();
  });

  it("should display 'Added' badge for accepted status", () => {
    const acceptedReviewer = { ...mockReviewer, status: "accepted" as const };
    render(
      <ReviewerRow
        reviewer={acceptedReviewer}
        onResend={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const badge = screen.getByText("Added");
    expect(badge).toBeInTheDocument();
  });

  it("should show resend option for pending reviewers", async () => {
    const user = userEvent.setup();
    const handleResend = vi.fn();

    render(
      <ReviewerRow
        reviewer={mockReviewer}
        onResend={handleResend}
        onRemove={vi.fn()}
      />
    );

    // Open dropdown
    const actionsButton = screen.getByRole("button", {
      name: /actions for john doe/i,
    });
    await user.click(actionsButton);

    // Should have resend option
    expect(screen.getByText("Resend Invitation")).toBeInTheDocument();
  });

  it("should call onResend when resend is clicked", async () => {
    const user = userEvent.setup();
    const handleResend = vi.fn();

    render(
      <ReviewerRow
        reviewer={mockReviewer}
        onResend={handleResend}
        onRemove={vi.fn()}
      />
    );

    // Open dropdown
    const actionsButton = screen.getByRole("button", {
      name: /actions for john doe/i,
    });
    await user.click(actionsButton);

    // Click resend
    await user.click(screen.getByText("Resend Invitation"));

    expect(handleResend).toHaveBeenCalledWith(mockReviewer.accessId);
  });

  it("should show confirmation dialog before removing", async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn();

    render(
      <ReviewerRow
        reviewer={mockReviewer}
        onResend={vi.fn()}
        onRemove={handleRemove}
      />
    );

    // Open dropdown
    const actionsButton = screen.getByRole("button", {
      name: /actions for john doe/i,
    });
    await user.click(actionsButton);

    // Click remove
    await user.click(screen.getByText("Remove"));

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    // Should not call onRemove yet
    expect(handleRemove).not.toHaveBeenCalled();
  });

  it("should call onRemove after confirmation", async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn();

    render(
      <ReviewerRow
        reviewer={mockReviewer}
        onResend={vi.fn()}
        onRemove={handleRemove}
      />
    );

    // Open dropdown and click remove
    const actionsButton = screen.getByRole("button", {
      name: /actions for john doe/i,
    });
    await user.click(actionsButton);
    await user.click(screen.getByText("Remove"));

    // Confirm removal
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /remove/i });
    await user.click(confirmButton);

    expect(handleRemove).toHaveBeenCalledWith(mockReviewer.accessId);
  });
});
