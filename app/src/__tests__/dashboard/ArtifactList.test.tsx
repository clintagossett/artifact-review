import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ArtifactList } from "@/components/artifacts/ArtifactList";
import type { Id } from "@/../../convex/_generated/dataModel";

describe("ArtifactList", () => {
  const mockArtifacts = [
    {
      _id: "test-id-1" as Id<"artifacts">,
      name: "Product Landing Pages",
      description: "AI-generated landing page reviews",
      shareToken: "abc12345",
      createdAt: Date.now() - 2 * 60 * 60 * 1000,
      updatedAt: Date.now() - 2 * 60 * 60 * 1000,
    },
    {
      _id: "test-id-2" as Id<"artifacts">,
      name: "Interactive UI Components",
      description: "Testing tabs and accordion interactions",
      shareToken: "xyz67890",
      createdAt: Date.now() - 30 * 60 * 1000,
      updatedAt: Date.now() - 30 * 60 * 1000,
    },
  ];

  const mockVersionsMap = {
    "test-id-1": [
      { number: 1, fileType: "html" as const },
      { number: 2, fileType: "html" as const },
      { number: 3, fileType: "html" as const },
    ],
    "test-id-2": [{ number: 1, fileType: "html" as const }],
  };

  it("should render section header", () => {
    render(
      <ArtifactList
        artifacts={mockArtifacts}
        versionsMap={mockVersionsMap}
        onArtifactClick={vi.fn()}
        onNewArtifact={vi.fn()}
      />
    );

    expect(screen.getByText("Your Artifacts")).toBeInTheDocument();
  });

  it("should render New Artifact button", () => {
    render(
      <ArtifactList
        artifacts={mockArtifacts}
        versionsMap={mockVersionsMap}
        onArtifactClick={vi.fn()}
        onNewArtifact={vi.fn()}
      />
    );

    const button = screen.getByRole("button", { name: /new artifact/i });
    expect(button).toBeInTheDocument();
  });

  it("should call onNewArtifact when button clicked", async () => {
    const user = userEvent.setup();
    const handleNewArtifact = vi.fn();

    render(
      <ArtifactList
        artifacts={mockArtifacts}
        versionsMap={mockVersionsMap}
        onArtifactClick={vi.fn()}
        onNewArtifact={handleNewArtifact}
      />
    );

    const button = screen.getByRole("button", { name: /new artifact/i });
    await user.click(button);

    expect(handleNewArtifact).toHaveBeenCalledTimes(1);
  });

  it("should render all artifact cards", () => {
    render(
      <ArtifactList
        artifacts={mockArtifacts}
        versionsMap={mockVersionsMap}
        onArtifactClick={vi.fn()}
        onNewArtifact={vi.fn()}
      />
    );

    expect(screen.getByText("Product Landing Pages")).toBeInTheDocument();
    expect(screen.getByText("Interactive UI Components")).toBeInTheDocument();
  });

  it("should use responsive grid layout", () => {
    const { container } = render(
      <ArtifactList
        artifacts={mockArtifacts}
        versionsMap={mockVersionsMap}
        onArtifactClick={vi.fn()}
        onNewArtifact={vi.fn()}
      />
    );

    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1");
    expect(grid).toHaveClass("md:grid-cols-2");
    expect(grid).toHaveClass("lg:grid-cols-3");
  });

  it("should have proper gap between items", () => {
    const { container } = render(
      <ArtifactList
        artifacts={mockArtifacts}
        versionsMap={mockVersionsMap}
        onArtifactClick={vi.fn()}
        onNewArtifact={vi.fn()}
      />
    );

    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("gap-6");
  });

  it("should sort artifacts by updatedAt desc", () => {
    render(
      <ArtifactList
        artifacts={mockArtifacts}
        versionsMap={mockVersionsMap}
        onArtifactClick={vi.fn()}
        onNewArtifact={vi.fn()}
      />
    );

    const articles = screen.getAllByRole("article");
    // Interactive UI Components is newer (30 mins ago vs 2 hours)
    expect(articles[0]).toHaveTextContent("Interactive UI Components");
    expect(articles[1]).toHaveTextContent("Product Landing Pages");
  });

  it("should call onArtifactClick with correct ID", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <ArtifactList
        artifacts={mockArtifacts}
        versionsMap={mockVersionsMap}
        onArtifactClick={handleClick}
        onNewArtifact={vi.fn()}
      />
    );

    const card = screen.getByText("Product Landing Pages").closest("article");
    if (card) {
      await user.click(card);
      expect(handleClick).toHaveBeenCalledWith("test-id-1");
    }
  });

  it("should handle empty artifacts array", () => {
    render(
      <ArtifactList
        artifacts={[]}
        versionsMap={{}}
        onArtifactClick={vi.fn()}
        onNewArtifact={vi.fn()}
      />
    );

    // Header should still show
    expect(screen.getByText("Your Artifacts")).toBeInTheDocument();
    // But no cards
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});
