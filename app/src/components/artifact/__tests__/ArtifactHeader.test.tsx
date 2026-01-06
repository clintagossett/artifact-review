import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ArtifactHeader } from "../ArtifactHeader";

describe("ArtifactHeader", () => {
  afterEach(() => {
    cleanup();
  });

  const mockArtifact = {
    name: "My Test Artifact",
    shareToken: "abc123",
  };

  const mockVersion = {
    number: 2,
    size: 1024000, // 1000 KB
    createdAt: new Date("2024-12-26").getTime(),
  };

  const mockVersions = [
    { number: 1, createdAt: new Date("2024-12-25").getTime(), isLatest: false },
    { number: 2, createdAt: new Date("2024-12-26").getTime(), isLatest: true },
  ];

  it("should display artifact title", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    expect(screen.getByText("My Test Artifact")).toBeInTheDocument();
  });

  it("should display version badge with purple background", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    // Look for badge specifically (there may be multiple v2 texts due to version switcher)
    const badges = screen.getAllByText(/v2/i);
    const badge = badges.find((el) => el.classList.contains("bg-purple-100"));
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-purple-100", "text-purple-800");
  });

  it("should display file size in KB", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    expect(screen.getByText(/1000\.0 KB/i)).toBeInTheDocument();
  });

  it("should display formatted date", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    // Date formatting varies by locale, just check year is present
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("should show read-only banner when viewing old version", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={false}
        onVersionChange={() => {}}
      />
    );

    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });

  it("should NOT show read-only banner when viewing latest version", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    expect(screen.queryByText(/read-only/i)).not.toBeInTheDocument();
  });

  it("should show switch to latest button when viewing old version", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={{ ...mockVersion, number: 1 }}
        versions={mockVersions}
        isLatestVersion={false}
        onVersionChange={() => {}}
        latestVersionNumber={2}
      />
    );

    expect(screen.getByRole("button", { name: /switch to latest/i })).toBeInTheDocument();
  });

  it("should call onVersionChange with latest version number when switch button clicked", () => {
    const handleVersionChange = vi.fn();

    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={{ ...mockVersion, number: 1 }}
        versions={mockVersions}
        isLatestVersion={false}
        onVersionChange={handleVersionChange}
        latestVersionNumber={2}
      />
    );

    const switchButton = screen.getByRole("button", { name: /switch to latest/i });
    fireEvent.click(switchButton);

    expect(handleVersionChange).toHaveBeenCalledWith(2);
  });

  it("should NOT show switch button when viewing latest version", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
        latestVersionNumber={2}
      />
    );

    expect(screen.queryByRole("button", { name: /switch to latest/i })).not.toBeInTheDocument();
  });
});
