import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import type { Id } from "@/convex/_generated/dataModel";

describe("ArtifactCard", () => {
  const mockArtifact = {
    _id: "test-id" as Id<"artifacts">,
    name: "Product Landing Pages",
    description: "AI-generated landing page reviews for Q4 2024",
    shareToken: "abc12345",
    createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    updatedAt: Date.now() - 2 * 60 * 60 * 1000,
  };

  const mockVersions = [
    { number: 1, fileType: "html" as const },
    { number: 2, fileType: "html" as const },
    { number: 3, fileType: "html" as const },
  ];

  it("should render artifact name", () => {
    render(
      <ArtifactCard
        artifact={mockArtifact}
        versions={mockVersions}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText("Product Landing Pages")).toBeInTheDocument();
  });

  it("should render artifact description", () => {
    render(
      <ArtifactCard
        artifact={mockArtifact}
        versions={mockVersions}
        onClick={vi.fn()}
      />
    );

    expect(
      screen.getByText("AI-generated landing page reviews for Q4 2024")
    ).toBeInTheDocument();
  });

  it("should render version badges", () => {
    render(
      <ArtifactCard
        artifact={mockArtifact}
        versions={mockVersions}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("v3")).toBeInTheDocument();
  });

  it("should render folder icon", () => {
    const { container } = render(
      <ArtifactCard
        artifact={mockArtifact}
        versions={mockVersions}
        onClick={vi.fn()}
      />
    );

    // Check for FolderOpen icon
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render relative timestamp", () => {
    render(
      <ArtifactCard
        artifact={mockArtifact}
        versions={mockVersions}
        onClick={vi.fn()}
      />
    );

    // Should show relative time
    expect(screen.getByText(/ago/i)).toBeInTheDocument();
  });

  it("should call onClick when card is clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <ArtifactCard
        artifact={mockArtifact}
        versions={mockVersions}
        onClick={handleClick}
      />
    );

    const card = screen.getByText("Product Landing Pages").closest("article");
    if (card) {
      await user.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    }
  });

  it("should handle missing description", () => {
    const artifactWithoutDesc = {
      ...mockArtifact,
      description: undefined,
    };

    render(
      <ArtifactCard
        artifact={artifactWithoutDesc}
        versions={mockVersions}
        onClick={vi.fn()}
      />
    );

    // Name should still render
    expect(screen.getByText("Product Landing Pages")).toBeInTheDocument();
  });

  it("should show file count for ZIP artifacts", () => {
    render(
      <ArtifactCard
        artifact={mockArtifact}
        versions={mockVersions}
        fileCount={5}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should show member count", () => {
    render(
      <ArtifactCard
        artifact={mockArtifact}
        versions={mockVersions}
        memberCount={3}
        onClick={vi.fn()}
      />
    );

    // Member count should be displayed
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should have hover cursor pointer", () => {
    const { container } = render(
      <ArtifactCard
        artifact={mockArtifact}
        versions={mockVersions}
        onClick={vi.fn()}
      />
    );

    const card = container.querySelector("article");
    expect(card).toHaveClass("cursor-pointer");
  });

  it("should have card styling with padding and shadow", () => {
    const { container } = render(
      <ArtifactCard
        artifact={mockArtifact}
        versions={mockVersions}
        onClick={vi.fn()}
      />
    );

    const card = container.querySelector("article");
    expect(card).toHaveClass("p-6");
    expect(card).toHaveClass("shadow-sm");
  });

  it("should truncate long descriptions", () => {
    const longDescription = "A".repeat(200);
    const artifactWithLongDesc = {
      ...mockArtifact,
      description: longDescription,
    };

    const { container } = render(
      <ArtifactCard
        artifact={artifactWithLongDesc}
        versions={mockVersions}
        onClick={vi.fn()}
      />
    );

    const description = container.querySelector(".line-clamp-2");
    expect(description).toBeInTheDocument();
  });
});
