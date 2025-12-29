"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArtifactSettings } from "@/components/ArtifactSettings";

interface Props {
  shareToken: string;
}

type TabType = 'details' | 'versions' | 'access';

export function ArtifactSettingsClient({ shareToken }: Props) {
  const router = useRouter();
  const [initialTab, setInitialTab] = useState<TabType>("versions");

  // For now, using mock data - will be wired up later
  const mockArtifactId = "mock-artifact-id";
  const mockArtifactName = "Product Specs V3.html";
  const isOwner = true; // Mock - will check real ownership later

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

  return (
    <ArtifactSettings
      onBack={handleBack}
      artifactId={mockArtifactId}
      artifactName={mockArtifactName}
      isOwner={isOwner}
      initialTab={initialTab}
    />
  );
}
