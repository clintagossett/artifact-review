"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DashboardHeader } from "@/components/artifacts/DashboardHeader";
import { ArtifactList } from "@/components/artifacts/ArtifactList";
import { EmptyState } from "@/components/artifacts/EmptyState";
import { NewArtifactDialog } from "@/components/artifacts/NewArtifactDialog";
import { useArtifactUpload } from "@/hooks/useArtifactUpload";
import { useVersionStatus } from "@/hooks/useVersionStatus";
import { UploadStatusIndicator } from "@/components/artifacts/UploadStatusIndicator";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Dashboard Page - Main dashboard view
 */
export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  const currentUser = useQuery(api.users.getCurrentUser, !isAuthenticated ? "skip" : undefined);
  const artifacts = useQuery(api.artifacts.list, !isAuthenticated ? "skip" : {});
  const sharedWithMe = useQuery(api.access.listShared, !isAuthenticated ? "skip" : {});
  const [isNewArtifactOpen, setIsNewArtifactOpen] = useState(false);
  const { uploadFile } = useArtifactUpload();

  // Task 00049 - Track pending upload status
  const [pendingUpload, setPendingUpload] = useState<{
    versionId: Id<"artifactVersions">;
    shareToken: string;
  } | null>(null);

  const { status, isReady, isError, errorMessage } = useVersionStatus(
    pendingUpload?.versionId ?? null
  );

  const handleUploadClick = () => {
    setIsNewArtifactOpen(true);
  };

  const handleNewArtifact = () => {
    setIsNewArtifactOpen(true);
  };

  const [isNavigating, setIsNavigating] = useState(false);

  // Task 00049 - Navigate when upload is ready
  useEffect(() => {
    if (pendingUpload && isReady) {
      setIsNavigating(true);
      router.push(`/a/${pendingUpload.shareToken}`);
      setPendingUpload(null);
    }
  }, [pendingUpload, isReady, router]);

  // Task 00049 - Stop navigation spinner on error, but keep pendingUpload to show error state
  useEffect(() => {
    if (pendingUpload && isError) {
      setIsNavigating(false);
    }
  }, [pendingUpload, isError]);

  const handleCreateArtifact = async (data: {
    file: File;
    name: string;
    description?: string;
  }) => {
    try {
      await uploadFile({
        ...data,
        // Start status subscription immediately when version is created
        // This allows observing uploading → processing → ready transitions
        onVersionCreated: (versionId, shareToken) => {
          setPendingUpload({ versionId, shareToken });
        },
      });
    } catch (error) {
      // Error is already logged by the upload hook and dialog
      // Re-throw so dialog can handle it
      throw error;
    }
  };

  const handleArtifactClick = (id: Id<"artifacts">) => {
    // Navigate to artifact viewer
    // Find in either artifacts or sharedWithMe
    const artifact = artifacts?.find((a) => a._id === id) ||
      sharedWithMe?.find((s) => s.artifact._id === id)?.artifact;

    if (artifact) {
      setIsNavigating(true);
      router.push(`/a/${artifact.shareToken}`);
    }
  };

  const isLoading = currentUser === undefined || artifacts === undefined || sharedWithMe === undefined;

  return (
    <ProtectedPage>
      {/* Loading state while data is fetching */}
      {isLoading && (
        <div className="flex h-screen items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      )}

      {/* Dashboard content */}
      {!isLoading && currentUser && (
        <div className="min-h-screen bg-gray-50">
          <DashboardHeader
            onUploadClick={handleUploadClick}
            userEmail={currentUser.email}
            userName={currentUser.name}
            userId={currentUser._id}
          />

          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
            {/* Owned Artifacts */}
            {artifacts.length === 0 && (!sharedWithMe || sharedWithMe.length === 0) ? (
              <EmptyState onCreateFirst={handleNewArtifact} />
            ) : (
              <>
                {artifacts.length > 0 && (
                  <ArtifactList
                    artifacts={artifacts}
                    versionsMap={{}}
                    onArtifactClick={handleArtifactClick}
                    onNewArtifact={handleNewArtifact}
                    isLoading={isNavigating}
                  />
                )}

                {sharedWithMe && sharedWithMe.length > 0 && (
                  <ArtifactList
                    title="Shared with me"
                    showNewButton={false}
                    artifacts={sharedWithMe.map(s => s.artifact)}
                    versionsMap={{}}
                    onArtifactClick={handleArtifactClick}
                    isLoading={isNavigating}
                  />
                )}
              </>
            )}
          </main>

          <NewArtifactDialog
            open={isNewArtifactOpen}
            onOpenChange={setIsNewArtifactOpen}
            onCreateArtifact={handleCreateArtifact}
          />

          {/* Task 00049 - Show upload status indicator */}
          {pendingUpload && status && status !== "ready" && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
              <UploadStatusIndicator
                status={status}
                errorMessage={errorMessage}
                onRetry={() => {
                  setPendingUpload(null);
                  setIsNewArtifactOpen(true);
                }}
              />
            </div>
          )}
        </div>
      )}
    </ProtectedPage>
  );
}
