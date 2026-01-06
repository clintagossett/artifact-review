import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShareModal } from "@/components/artifacts/ShareModal";
import type { Id } from "@/../../convex/_generated/dataModel";

// Mock clipboard API with spy
const writeTextMock = vi.fn(() => Promise.resolve());
Object.assign(navigator, {
  clipboard: {
    writeText: writeTextMock,
  },
});

describe("ShareModal", () => {
  const mockArtifact = {
    _id: "test-id" as Id<"artifacts">,
    name: "Product Landing Pages",
    shareToken: "abc12345",
  };

  beforeEach(() => {
    writeTextMock.mockClear();
  });

  it("should render modal title with artifact name", () => {
    render(
      <ShareModal
        open={true}
        onOpenChange={vi.fn()}
        artifact={mockArtifact}
      />
    );

    expect(
      screen.getByText(/Share "Product Landing Pages"/i)
    ).toBeInTheDocument();
  });

  it("should display share link", () => {
    render(
      <ShareModal
        open={true}
        onOpenChange={vi.fn()}
        artifact={mockArtifact}
      />
    );

    const input = screen.getByDisplayValue(/\/a\/abc12345/);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("readonly");
  });

  it("should have copy button", () => {
    render(
      <ShareModal
        open={true}
        onOpenChange={vi.fn()}
        artifact={mockArtifact}
      />
    );

    const button = screen.getByRole("button", { name: /copy/i });
    expect(button).toBeInTheDocument();
  });

  it("should have proper share URL format in input", () => {
    render(
      <ShareModal
        open={true}
        onOpenChange={vi.fn()}
        artifact={mockArtifact}
      />
    );

    const input = screen.getByDisplayValue(/\/a\/abc12345/);
    const value = (input as HTMLInputElement).value;
    expect(value).toContain("/a/abc12345");
  });

  it("should show copied state after copying", async () => {
    const user = userEvent.setup();

    render(
      <ShareModal
        open={true}
        onOpenChange={vi.fn()}
        artifact={mockArtifact}
      />
    );

    const copyButton = screen.getByRole("button", { name: /copy/i });
    await user.click(copyButton);

    // Should show "Copied" text
    await waitFor(() => {
      expect(screen.getByText(/copied/i)).toBeInTheDocument();
    });
  });

  it("should have copy button text", () => {
    render(
      <ShareModal
        open={true}
        onOpenChange={vi.fn()}
        artifact={mockArtifact}
      />
    );

    // Initial state should show "Copy"
    const button = screen.getByRole("button", { name: /copy/i });
    expect(button).toHaveTextContent("Copy");
  });

  it("should display info message about link access", () => {
    render(
      <ShareModal
        open={true}
        onOpenChange={vi.fn()}
        artifact={mockArtifact}
      />
    );

    expect(
      screen.getByText(/Anyone with this link can view this artifact/i)
    ).toBeInTheDocument();
  });

  it("should not render when open is false", () => {
    const { container } = render(
      <ShareModal
        open={false}
        onOpenChange={vi.fn()}
        artifact={mockArtifact}
      />
    );

    // Modal should not be visible
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it("should have close button in footer", () => {
    render(
      <ShareModal
        open={true}
        onOpenChange={vi.fn()}
        artifact={mockArtifact}
      />
    );

    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    expect(closeButtons.length).toBeGreaterThan(0);
  });
});
