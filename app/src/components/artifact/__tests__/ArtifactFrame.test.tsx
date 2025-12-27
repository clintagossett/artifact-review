import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ArtifactFrame } from "../ArtifactFrame";

describe("ArtifactFrame", () => {
  afterEach(() => {
    cleanup();
  });

  it("should render iframe with correct src", () => {
    const src = "https://test.convex.site/artifact/abc123/v1/index.html";
    render(<ArtifactFrame src={src} />);

    const iframe = screen.getByTitle("Artifact Viewer");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", src);
  });

  it("should render iframe with sandbox attribute for security", () => {
    const src = "https://test.convex.site/artifact/abc123/v1/index.html";
    render(<ArtifactFrame src={src} />);

    const iframe = screen.getByTitle("Artifact Viewer");
    expect(iframe).toHaveAttribute("sandbox", "allow-scripts allow-same-origin");
  });

  it("should show loading skeleton when isLoading is true", () => {
    const src = "https://test.convex.site/artifact/abc123/v1/index.html";
    render(<ArtifactFrame src={src} isLoading={true} />);

    // iframe should not be visible when loading
    expect(screen.queryByTitle("Artifact Viewer")).not.toBeInTheDocument();
  });

  it("should hide loading skeleton when isLoading is false", () => {
    const src = "https://test.convex.site/artifact/abc123/v1/index.html";
    render(<ArtifactFrame src={src} isLoading={false} />);

    // iframe should be visible
    const iframe = screen.getByTitle("Artifact Viewer");
    expect(iframe).toBeInTheDocument();
  });
});
