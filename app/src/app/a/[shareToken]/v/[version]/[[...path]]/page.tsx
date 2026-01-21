import { ArtifactViewerPage } from "@/components/artifact/ArtifactViewerPage";

interface Props {
    params: Promise<{ shareToken: string; version: string; path?: string[] }>;
}

export default async function Page({ params }: Props) {
    const { shareToken, version, path } = await params;
    const versionNumber = parseInt(version);
    const filePath = path ? path.join("/") : undefined;

    return (
        <ArtifactViewerPage
            shareToken={shareToken}
            versionNumber={versionNumber}
            filePath={filePath}
        />
    );
}
