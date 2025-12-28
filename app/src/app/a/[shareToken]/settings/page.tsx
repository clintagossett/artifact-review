"use client";

import { useRouter } from "next/navigation";
import { ArtifactSettings } from "@/components/ArtifactSettings";

interface Props {
  params: Promise<{ shareToken: string }>;
}

export default function ArtifactSettingsPage({ params }: Props) {
  const router = useRouter();

  // For now, using mock data - will be wired up later
  const mockArtifactId = "mock-artifact-id";
  const mockArtifactName = "Product Specs V3.html";
  const isOwner = true; // Mock - will check real ownership later

  const handleBack = () => {
    router.back();
  };

  return (
    <ArtifactSettings
      onBack={handleBack}
      artifactId={mockArtifactId}
      artifactName={mockArtifactName}
      isOwner={isOwner}
      initialTab="versions"
    />
  );
}
