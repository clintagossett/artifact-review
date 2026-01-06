import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteReviewerForm } from "../../../../../app/src/components/artifacts/InviteReviewerForm";
import type { Id } from "../../../../../app/convex/_generated/dataModel";

// Mock Convex
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

// Mock toast
vi.mock("../../../../../app/src/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

// Mock logger
vi.mock("../../../../../app/src/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  LOG_TOPICS: {
    Artifact: "ARTIFACT",
  },
}));

describe("InviteReviewerForm", () => {
  const mockArtifactId = "artifactId123" as Id<"artifacts">;

  it("should render email input and invite button", () => {
    render(<InviteReviewerForm artifactId={mockArtifactId} />);

    expect(screen.getByLabelText(/invite by email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /invite/i })).toBeInTheDocument();
  });

  it("should validate empty email", async () => {
    const user = userEvent.setup();
    const { toast } = await import("../../../../../app/src/hooks/use-toast");

    render(<InviteReviewerForm artifactId={mockArtifactId} />);

    // Click invite without entering email
    await user.click(screen.getByRole("button", { name: /invite/i }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Email required",
        })
      );
    });
  });

  it("should validate invalid email format", async () => {
    const user = userEvent.setup();
    const { toast } = await import("../../../../../app/src/hooks/use-toast");

    render(<InviteReviewerForm artifactId={mockArtifactId} />);

    // Enter invalid email
    await user.type(
      screen.getByLabelText(/invite by email/i),
      "invalid-email"
    );
    await user.click(screen.getByRole("button", { name: /invite/i }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Invalid email",
        })
      );
    });
  });

  it("should clear input after successful invite", async () => {
    const user = userEvent.setup();
    const { useMutation } = await import("convex/react");
    const mockGrant = vi.fn().mockResolvedValue("accessId123");
    vi.mocked(useMutation).mockReturnValue(mockGrant);

    render(<InviteReviewerForm artifactId={mockArtifactId} />);

    const emailInput = screen.getByLabelText(/invite by email/i);

    // Enter valid email
    await user.type(emailInput, "test@example.com");
    expect(emailInput).toHaveValue("test@example.com");

    // Submit
    await user.click(screen.getByRole("button", { name: /invite/i }));

    // Should clear after submit
    await waitFor(() => {
      expect(emailInput).toHaveValue("");
    });
  });

  it("should disable button while submitting", async () => {
    const user = userEvent.setup();
    const { useMutation } = await import("convex/react");
    const mockGrant = vi
      .fn()
      .mockImplementation(() => new Promise((r) => setTimeout(r, 100)));
    vi.mocked(useMutation).mockReturnValue(mockGrant);

    render(<InviteReviewerForm artifactId={mockArtifactId} />);

    // Enter valid email
    await user.type(screen.getByLabelText(/invite by email/i), "test@example.com");

    // Submit
    const submitButton = screen.getByRole("button", { name: /invite/i });
    await user.click(submitButton);

    // Button should be disabled
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("Sending...");
  });
});
