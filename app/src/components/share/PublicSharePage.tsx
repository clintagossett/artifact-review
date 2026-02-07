"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ShareLinkUnavailable } from "./ShareLinkUnavailable";
import { PublicArtifactViewer } from "./PublicArtifactViewer";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicSharePageProps {
  token: string;
  filePath?: string;
}

export function PublicSharePage({ token, filePath }: PublicSharePageProps) {
  // Resolve the public share token
  const shareData = useQuery(api.shares.resolveToken, { token });

  // Loading state
  if (shareData === undefined) {
    return (
      <div className="flex flex-col h-screen">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="flex-1 bg-gray-100 p-6">
          <div className="h-full bg-white rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <Skeleton className="h-12 w-12 mx-auto mb-4" />
              <Skeleton className="h-6 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Link unavailable (token not found or disabled)
  if (shareData === null) {
    return <ShareLinkUnavailable />;
  }

  // Render the public artifact viewer
  return (
    <PublicArtifactViewer
      artifactId={shareData.artifactId}
      artifactName={shareData.artifactName}
      shareToken={shareData.shareToken}
      publicShareToken={shareData.publicShareToken}
      capabilities={shareData.capabilities}
      latestVersionId={shareData.latestVersionId}
      latestVersionNumber={shareData.latestVersionNumber}
      filePath={filePath}
    />
  );
}
