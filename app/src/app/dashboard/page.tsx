"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DashboardHeader } from "@/components/artifacts/DashboardHeader";
import { ArtifactList } from "@/components/artifacts/ArtifactList";
import { EmptyState } from "@/components/artifacts/EmptyState";
import { NewArtifactDialog } from "@/components/artifacts/NewArtifactDialog";
import { useArtifactUpload } from "@/hooks/useArtifactUpload";
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

  const handleUploadClick = () => {
    setIsNewArtifactOpen(true);
  };

  const handleNewArtifact = () => {
    setIsNewArtifactOpen(true);
  };

  const handleArtifactClick = (id: Id<"artifacts">) => {
    // Navigate to artifact viewer
    // Find in either artifacts or sharedWithMe
    const artifact = artifacts?.find((a) => a._id === id) ||
      sharedWithMe?.find((s) => s.artifact._id === id)?.artifact;

    if (artifact) {
      router.push(`/a/${artifact.shareToken}`);
    }
  };

  const handleCreateArtifact = async (data: {
    file: File;
    name: string;
    description?: string;
  }) => {
    const result = await uploadFile(data);
    // Navigate to the newly created artifact
    router.push(`/a/${result.shareToken}`);
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
                  />
                )}

                {sharedWithMe && sharedWithMe.length > 0 && (
                  <ArtifactList
                    title="Shared with me"
                    showNewButton={false}
                    artifacts={sharedWithMe.map(s => s.artifact)}
                    versionsMap={{}}
                    onArtifactClick={handleArtifactClick}
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
        </div>
      )}
    </ProtectedPage>
  );
}
