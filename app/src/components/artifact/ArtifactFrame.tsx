import { Skeleton } from "@/components/ui/skeleton";

interface ArtifactFrameProps {
  src: string;
  isLoading?: boolean;
}

export function ArtifactFrame({ src, isLoading = false }: ArtifactFrameProps) {
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="space-y-4 w-full p-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={src}
      className="w-full h-full border-0"
      title="Artifact Viewer"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
