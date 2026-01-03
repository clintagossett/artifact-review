"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { ArtifactViewer } from "./ArtifactViewer";
import { DocumentViewer } from "./DocumentViewer";
import { ShareModal } from "./ShareModal";
import { UnauthenticatedBanner } from "./UnauthenticatedBanner";
import { AccessDeniedMessage } from "./AccessDeniedMessage";
import { Skeleton } from "@/components/ui/skeleton";

interface ArtifactViewerPageProps {
  shareToken: string;
  versionNumber?: number;
}

export function ArtifactViewerPage({
  shareToken,
  versionNumber,
}: ArtifactViewerPageProps) {
  const router = useRouter();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Fetch artifact by share token
  const artifact = useQuery(api.artifacts.getByShareToken, { shareToken });

  // Check user authentication and permission
  const currentUser = useQuery(api.users.getCurrentUser);
  const userPermission = useQuery(
    api.sharing.getUserPermission,
    artifact ? { artifactId: artifact._id } : "skip"
  );

  // Fetch all versions
  const versions = useQuery(
    api.artifacts.getVersions,
    artifact ? { artifactId: artifact._id } : "skip"
  );

  // Fetch both version types unconditionally to avoid conditional hooks
  const specificVersion = useQuery(
    api.artifacts.getVersionByNumber,
    artifact && versionNumber
      ? { artifactId: artifact._id, number: versionNumber }
      : "skip"
  );

  const latestVersion = useQuery(
    api.artifacts.getLatestVersion,
    artifact && !versionNumber ? { artifactId: artifact._id } : "skip"
  );

  // Determine which version to show based on whether versionNumber was provided
  const targetVersion = versionNumber ? specificVersion : latestVersion;

  // Handle loading states
  if (artifact === undefined || versions === undefined || targetVersion === undefined || userPermission === undefined) {
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

  // Handle not found
  if (!artifact || !targetVersion) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-gray-900 mb-4">Artifact Not Found</h1>
          <p className="text-gray-600">
            The artifact you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  // Permission checks
  const isAuthenticated = currentUser !== null && currentUser !== undefined;
  const hasPermission = userPermission === "owner" || userPermission === "can-comment";

  // Show UnauthenticatedBanner for logged-out users
  if (!isAuthenticated && !hasPermission) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 bg-gray-100 p-6 flex items-center justify-center">
          <div className="max-w-2xl w-full">
            <UnauthenticatedBanner shareToken={shareToken} />
          </div>
        </div>
      </div>
    );
  }

  // Show AccessDeniedMessage for logged-in users without permission
  if (isAuthenticated && !hasPermission) {
    return <AccessDeniedMessage artifactTitle={artifact.name} />;
  }

  // Determine if this is the latest version
  const latestVersionNumber = Math.max(...versions.map((v) => v.number));
  const isLatestVersion = targetVersion.number === latestVersionNumber;

  // Handle version change
  const handleVersionChange = (newVersionNumber: number) => {
    if (newVersionNumber === latestVersionNumber) {
      // Navigate to latest version URL (no version number)
      router.push(`/a/${shareToken}`);
    } else {
      // Navigate to specific version URL
      router.push(`/a/${shareToken}/v/${newVersionNumber}`);
    }
  };

  // Get Convex HTTP URL from environment (for serving artifact files)
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_HTTP_URL || "";

  // Show DocumentViewer for users with permission
  return (
    <>
      <DocumentViewer
        documentId={artifact._id}
        onBack={() => router.push("/dashboard")}
        artifactTitle={artifact.name}
        versions={versions}
        onNavigateToShare={() => router.push(`/a/${shareToken}/settings#access-and-activity`)}
        onNavigateToSettings={() => router.push(`/a/${shareToken}/settings`)}
        onNavigateToVersions={() => router.push(`/a/${shareToken}/settings#versions`)}
        shareToken={shareToken}
        versionNumber={targetVersion.number}
        versionId={targetVersion._id}
        artifactOwnerId={artifact.createdBy}
        convexUrl={convexUrl}
      />

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        artifact={{
          _id: artifact._id,
          name: artifact.name,
          shareToken: artifact.shareToken,
        }}
      />
    </>
  );
}
