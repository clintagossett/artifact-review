import { ArtifactSettingsClient } from "./ArtifactSettingsClient";

interface Props {
  params: Promise<{ shareToken: string }>;
}

export default async function ArtifactSettingsPage({ params }: Props) {
  const { shareToken } = await params;

  return <ArtifactSettingsClient shareToken={shareToken} />;
}
