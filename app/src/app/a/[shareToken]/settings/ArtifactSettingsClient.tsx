"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ArtifactSettings } from "@/components/ArtifactSettings";

interface Props {
  shareToken: string;
}

type TabType = 'details' | 'versions' | 'access';

export function ArtifactSettingsClient({ shareToken }: Props) {
  const router = useRouter();
  const [initialTab, setInitialTab] = useState<TabType>("versions");

  // Fetch real artifact data
  const artifact = useQuery(api.artifacts.getByShareToken, { shareToken });

  // Read hash fragment and set initial tab
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');

    // Map hash values to tab types
    const hashToTab: Record<string, TabType> = {
      'access-and-activity': 'access',
      'access': 'access',
      'versions': 'versions',
      'details': 'details',
    };

    if (hash && hashToTab[hash]) {
      setInitialTab(hashToTab[hash]);
    }
  }, []);

  const handleBack = () => {
    // Always go back to artifact viewer, not browser history
    router.push(`/a/${shareToken}`);
  };

  // Show loading state
  if (artifact === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading artifact...</p>
      </div>
    );
  }

  // Show error if artifact not found
  if (artifact === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 font-semibold mb-2">Artifact not found</p>
          <p className="text-gray-600 mb-4">This artifact may have been deleted or the link is invalid.</p>
          <button
            onClick={() => router.push("/")}
            className="text-blue-600 hover:underline"
          >
            Go to home
          </button>
        </div>
      </div>
    );
  }

  // TODO: Check if current user is the owner
  // For now, assume they are the owner (will be wired up with auth)
  const isOwner = true;

  return (
    <ArtifactSettings
      onBack={handleBack}
      artifactId={artifact._id}
      artifactName={artifact.title}
      isOwner={isOwner}
      initialTab={initialTab}
    />
  );
}
