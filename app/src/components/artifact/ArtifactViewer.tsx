"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArtifactHeader } from "./ArtifactHeader";
import { ArtifactFrame } from "./ArtifactFrame";
import { MultiPageNavigation } from "./MultiPageNavigation";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "@/hooks/use-toast";
import { logger, LOG_TOPICS } from "@/lib/logger";
import { Id } from "../../../convex/_generated/dataModel";

interface ArtifactViewerProps {
  artifact: {
    _id: Id<"artifacts">;
    title: string;
    shareToken: string;
  };
  version: {
    _id: Id<"artifactVersions">;
    number: number;
    fileType: "html" | "zip" | "markdown";
    entryPoint?: string;
    fileSize: number;
    createdAt: number;
  };
  versions: Array<{
    number: number;
    createdAt: number;
    name?: string;
    isLatest: boolean;
  }>;
  isLatestVersion: boolean;
  onVersionChange: (versionNumber: number) => void;
  currentUser?: any;
  userPermission?: "owner" | "can-comment" | null;
}

export function ArtifactViewer({
  artifact,
  version,
  versions,
  isLatestVersion,
  onVersionChange,
  currentUser,
  userPermission,
}: ArtifactViewerProps) {
  const router = useRouter();

  // Multi-page navigation state (for ZIP artifacts)
  const [currentPage, setCurrentPage] = useState<string>(
    version.entryPoint || "index.html"
  );
  const [history, setHistory] = useState<string[]>([]);
  const [forwardHistory, setForwardHistory] = useState<string[]>([]);

  // Real-time permission subscription
  const permission = usePermission(artifact._id);
  const previousPermission = useRef(permission);

  // Handle permission revocation (kick-out)
  useEffect(() => {
    // Only trigger on transition from truthy to null
    // This prevents false positives on initial load
    if (previousPermission.current && permission === null) {
      logger.warn(
        LOG_TOPICS.Artifact,
        "ArtifactViewer",
        "Access revoked - redirecting to dashboard",
        { artifactId: artifact._id }
      );

      // Show toast
      toast({
        title: "Access revoked",
        description: "Your access to this artifact has been revoked.",
        variant: "destructive",
      });

      // Redirect with slight delay for toast visibility
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    }

    previousPermission.current = permission;
  }, [permission, artifact._id, router]);

  // Build iframe URL
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
    ".cloud",
    ".site"
  );
  const iframeSrc = `${convexUrl}/artifact/${artifact.shareToken}/v${version.number}/${currentPage}`;

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

  // Calculate latest version number
  const latestVersionNumber = versions.find(v => v.isLatest)?.number
    ?? Math.max(...versions.map(v => v.number));

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <ArtifactHeader
        artifact={artifact}
        version={version}
        versions={versions}
        isLatestVersion={isLatestVersion}
        onVersionChange={onVersionChange}
        latestVersionNumber={latestVersionNumber}
        currentUser={currentUser}
        userPermission={userPermission}
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
