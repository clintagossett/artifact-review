import { ArtifactViewerPage } from "@/components/artifact/ArtifactViewerPage";

interface Props {
  params: Promise<{ shareToken: string; version: string }>;
}

export default async function Page({ params }: Props) {
  const { shareToken, version } = await params;
  const versionNumber = parseInt(version);

  return (
    <ArtifactViewerPage shareToken={shareToken} versionNumber={versionNumber} />
  );
}
