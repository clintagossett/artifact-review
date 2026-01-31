"use client";

import { useState, useEffect } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { ArtifactViewer } from "./ArtifactViewer";
import { ShareModal } from "./ShareModal";
import { useViewTracker } from "@/hooks/useViewTracker";
import { UnauthenticatedBanner } from "./UnauthenticatedBanner";
import { AccessDeniedMessage } from "./AccessDeniedMessage";
import { Skeleton } from "@/components/ui/skeleton";

interface ArtifactViewerPageProps {
  shareToken: string;
  versionNumber?: number;
  filePath?: string;
}

export function ArtifactViewerPage({
  shareToken,
  versionNumber,
  filePath,
}: ArtifactViewerPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Fetch artifact by share token
  const artifact = useQuery(api.artifacts.getByShareToken, { shareToken });

  // Check user authentication and permission
  const { isAuthenticated: isAuthReady, isLoading: isAuthLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, !isAuthReady ? "skip" : undefined);

  // Save returnTo path for unauthenticated users
  useEffect(() => {
    if (currentUser === null) {
      localStorage.setItem("returnTo", pathname);
    }
  }, [currentUser, pathname]);
  const userPermission = useQuery(
    api.access.getPermission,
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

  // Track views - must be called before any conditional returns (hooks rules)
  // Only tracks when user has permission and data is loaded
  const hasPermissionEarly = userPermission === "owner" || userPermission === "can-comment";
  useViewTracker(
    artifact?._id ?? ("skip" as any), // Safe to pass invalid ID when skipped via isLoaded
    targetVersion?._id ?? ("skip" as any),
    Boolean(artifact && targetVersion && isAuthReady && hasPermissionEarly)
  );



  // Handle loading states
  if (isAuthLoading || artifact === undefined || versions === undefined || targetVersion === undefined || userPermission === undefined) {
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
  const isAuthenticated = isAuthReady;
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

  // Show DocumentViewer for users with permission
  // REFACTOR: Now using the new ArtifactViewer directly instead of DocumentViewer
  return (
    <>
      <ArtifactViewer
        artifact={artifact}
        version={{
          ...targetVersion,
          fileType: targetVersion.fileType as "zip" | "html" | "markdown"
        }}
        versions={versions}
        isLatestVersion={isLatestVersion}
        onVersionChange={handleVersionChange}
        currentUser={currentUser}
        userPermission={userPermission}
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
