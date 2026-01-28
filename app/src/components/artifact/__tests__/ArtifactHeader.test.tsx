import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { ArtifactHeader } from "../ArtifactHeader";
import { Id } from "@/convex/_generated/dataModel";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock usePresence hook
vi.mock("@/hooks/usePresence", () => ({
  usePresence: () => [],
}));

// Mock PresenceAvatars component
vi.mock("../PresenceAvatars", () => ({
  PresenceAvatars: () => <div data-testid="presence-avatars" />,
}));

// Mock ShareModal component
vi.mock("../ShareModal", () => ({
  ShareModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="share-modal" /> : null,
}));

describe("ArtifactHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockArtifact = {
    _id: "artifact123" as Id<"artifacts">,
    name: "My Test Artifact",
    shareToken: "abc123",
  };

  const mockVersion = {
    _id: "version456" as Id<"artifactVersions">,
    number: 2,
    size: 1024000,
    createdAt: new Date("2024-12-26").getTime(),
  };

  const mockVersions = [
    { _id: "v1" as Id<"artifactVersions">, number: 1, createdAt: new Date("2024-12-25").getTime(), isLatest: false },
    { _id: "v2" as Id<"artifactVersions">, number: 2, createdAt: new Date("2024-12-26").getTime(), isLatest: true },
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

  it("should display version number in dropdown trigger", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    // Version number should be displayed in the dropdown button
    expect(screen.getByRole("button", { name: /v2/i })).toBeInTheDocument();
  });

  it("should display Latest badge when viewing latest version", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    expect(screen.getByText("Latest")).toBeInTheDocument();
  });

  it("should display In Review status badge", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    expect(screen.getByText("In Review")).toBeInTheDocument();
  });

  it("should have Back button", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("should have Share button", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("should have Manage button", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: /manage/i })).toBeInTheDocument();
  });

  it("should render presence avatars", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    expect(screen.getByTestId("presence-avatars")).toBeInTheDocument();
  });

  it("should NOT display Latest badge when viewing old version", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={{ ...mockVersion, number: 1, _id: "v1" as Id<"artifactVersions"> }}
        versions={mockVersions}
        isLatestVersion={false}
        onVersionChange={() => {}}
        latestVersionNumber={2}
      />
    );

    // The Latest badge should only appear in the dropdown for the latest version, not in the trigger
    const buttons = screen.getAllByRole("button");
    const versionButton = buttons.find(btn => btn.textContent?.includes("v1"));
    expect(versionButton).toBeInTheDocument();
    // The trigger button for v1 should NOT have "Latest" text
    expect(versionButton?.textContent).not.toContain("Latest");
  });

  it("should have clickable version dropdown button", () => {
    render(
      <ArtifactHeader
        artifact={mockArtifact}
        version={mockVersion}
        versions={mockVersions}
        isLatestVersion={true}
        onVersionChange={() => {}}
      />
    );

    // Version dropdown button should exist and be clickable
    const versionButton = screen.getByRole("button", { name: /v2/i });
    expect(versionButton).toBeInTheDocument();
    expect(versionButton).not.toBeDisabled();
  });
});
