"use client";

import { useState } from "react";
import { ArtifactHeader } from "./ArtifactHeader";
import { ArtifactFrame } from "./ArtifactFrame";
import { MultiPageNavigation } from "./MultiPageNavigation";
import { Id } from "../../../convex/_generated/dataModel";

interface ArtifactViewerProps {
  artifact: {
    _id: Id<"artifacts">;
    title: string;
    shareToken: string;
  };
  version: {
    _id: Id<"artifactVersions">;
    versionNumber: number;
    fileType: "html" | "zip" | "markdown";
    entryPoint?: string;
    fileSize: number;
    createdAt: number;
  };
  versions: Array<{
    versionNumber: number;
    createdAt: number;
  }>;
  isLatestVersion: boolean;
  onVersionChange: (versionNumber: number) => void;
}

export function ArtifactViewer({
  artifact,
  version,
  versions,
  isLatestVersion,
  onVersionChange,
}: ArtifactViewerProps) {
  // Multi-page navigation state (for ZIP artifacts)
  const [currentPage, setCurrentPage] = useState<string>(
    version.entryPoint || "index.html"
  );
  const [history, setHistory] = useState<string[]>([]);
  const [forwardHistory, setForwardHistory] = useState<string[]>([]);

  // Build iframe URL
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
    ".cloud",
    ".site"
  );
  const iframeSrc = `${convexUrl}/artifact/${artifact.shareToken}/v${version.versionNumber}/${currentPage}`;

  const handleBack = () => {
    if (history.length === 0) return;

    const previousPage = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setForwardHistory([currentPage, ...forwardHistory]);
    setCurrentPage(previousPage);
  };

  const handleForward = () => {
    if (forwardHistory.length === 0) return;

    const nextPage = forwardHistory[0];
    setHistory([...history, currentPage]);
    setForwardHistory(forwardHistory.slice(1));
    setCurrentPage(nextPage);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <ArtifactHeader
        artifact={artifact}
        version={version}
        versions={versions}
        isLatestVersion={isLatestVersion}
        onVersionChange={onVersionChange}
      />

      {/* Multi-page navigation (only for ZIP artifacts) */}
      {version.fileType === "zip" && (
        <MultiPageNavigation
          currentPage={currentPage}
          canGoBack={history.length > 0}
          canGoForward={forwardHistory.length > 0}
          onBack={handleBack}
          onForward={handleForward}
        />
      )}

      {/* Artifact Frame */}
      <div className="flex-1 bg-gray-100 p-6">
        <ArtifactFrame src={iframeSrc} />
      </div>
    </div>
  );
}
