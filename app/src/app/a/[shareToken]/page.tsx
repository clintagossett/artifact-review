import { ArtifactViewerPage } from "@/components/artifact/ArtifactViewerPage";

interface Props {
  params: Promise<{ shareToken: string }>;
}

export default async function Page({ params }: Props) {
  const { shareToken } = await params;
  return <ArtifactViewerPage shareToken={shareToken} />;
}
