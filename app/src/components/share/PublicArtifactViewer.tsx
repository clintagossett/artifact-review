"use client";

import { useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArtifactViewer } from "@/components/artifact/ArtifactViewer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare, LogIn } from "lucide-react";

interface Capabilities {
  readComments: boolean;
  writeComments: boolean;
}

interface PublicArtifactViewerProps {
  artifactId: Id<"artifacts">;
  artifactName: string;
  shareToken: string;
  publicShareToken: string;
  capabilities: Capabilities;
  latestVersionId?: Id<"artifactVersions">;
  latestVersionNumber?: number;
  filePath?: string;
}

export function PublicArtifactViewer({
  artifactId,
  artifactName,
  shareToken,
  publicShareToken,
  capabilities,
  latestVersionId,
  latestVersionNumber,
  filePath,
}: PublicArtifactViewerProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, !isAuthenticated ? "skip" : undefined);

  // Fetch the full artifact and version data
  const artifact = useQuery(api.artifacts.getByShareToken, { shareToken });
  const versions = useQuery(
    api.artifacts.getVersions,
    artifact ? { artifactId: artifact._id } : "skip"
  );
  const targetVersion = useQuery(
    api.artifacts.getLatestVersion,
    artifact ? { artifactId: artifact._id } : "skip"
  );

  // Handle not found BEFORE checking loading to avoid infinite skeleton
  // when artifact is null (queries are skipped)
  if (artifact === null) {
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

  // Show loading state
  if (isAuthLoading || artifact === undefined || versions === undefined || targetVersion === undefined) {
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

  // Handle not found (targetVersion)
  if (!targetVersion) {
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

  // Determine permission based on capabilities and authentication
  // - writeComments capability + authenticated = can-comment
  // - Otherwise null (view only or read-only)
  let userPermission: "owner" | "can-comment" | null = null;
  if (capabilities.writeComments && isAuthenticated && currentUser) {
    userPermission = "can-comment";
  }

  // Determine if this is the latest version
  const latestVersionNum = Math.max(...versions.map((v) => v.number));
  const isLatestVersion = targetVersion.number === latestVersionNum;

  // Handle version change - stay within public share route
  const handleVersionChange = (newVersionNumber: number) => {
    // For now, public share only shows latest version
    // We could extend this to support /share/{token}/v/{version} if needed
    router.refresh();
  };

  // Show auth prompt banner when writeComments is enabled but user not authenticated
  const showAuthPrompt = capabilities.writeComments && !isAuthenticated;

  // Skip comments query if readComments is not enabled
  const skipCommentsQuery = !capabilities.readComments;

  // Determine if this is truly a "public viewer" who should see minimal UI
  // No readComments = minimal viewer (can't see annotations at all)
  const isMinimalViewer = !capabilities.readComments;

  return (
    <div className="flex flex-col h-screen">
      {/* Auth prompt banner for write comments capability */}
      {showAuthPrompt && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 relative z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm font-medium">
                Sign in to leave comments on this artifact
              </span>
            </div>
            <Button
              onClick={() => router.push(`/login?returnTo=${encodeURIComponent(`/share/${publicShareToken}`)}`)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </div>
        </div>
      )}

      {/* Artifact viewer */}
      <div className="flex-1 overflow-hidden">
        <ArtifactViewer
          artifact={{
            _id: artifact._id,
            name: artifact.name,
            shareToken: artifact.shareToken,
            createdBy: artifact.createdBy,
          }}
          version={{
            _id: targetVersion._id,
            number: targetVersion.number,
            fileType: targetVersion.fileType as "zip" | "html" | "markdown",
            entryPoint: targetVersion.entryPoint,
            size: targetVersion.size,
            createdAt: targetVersion.createdAt,
          }}
          versions={versions}
          isLatestVersion={isLatestVersion}
          onVersionChange={handleVersionChange}
          currentUser={currentUser}
          userPermission={userPermission}
          skipCommentsQuery={skipCommentsQuery}
          isPublicViewer={isMinimalViewer}
          publicShareToken={publicShareToken}
          publicCapabilities={capabilities}
          filePath={filePath}
        />
      </div>
    </div>
  );
}
