import { Button } from "@/components/ui/button";
import { ArtifactCard } from "./ArtifactCard";
import { Plus } from "lucide-react";
import type { Id } from "@/../../convex/_generated/dataModel";

export interface ArtifactListProps {
  title?: string;
  showNewButton?: boolean;
  artifacts: Array<{
    _id: Id<"artifacts">;
    name: string;
    description?: string;
    shareToken: string;
    createdAt: number;
    updatedAt: number;
  }>;
  versionsMap: Record<
    string,
    Array<{
      number: number;
      fileType: "html" | "markdown" | "zip";
    }>
  >;
  onArtifactClick: (id: Id<"artifacts">) => void;
  onNewArtifact?: () => void;
}

/**
 * ArtifactList - Grid layout of artifact cards with section header
 */
export function ArtifactList({
  title = "Your Artifacts",
  showNewButton = true,
  artifacts,
  versionsMap,
  onArtifactClick,
  onNewArtifact,
}: ArtifactListProps) {
  // Sort by updatedAt, newest first
  const sortedArtifacts = [...artifacts].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  return (
    <div>
      {/* Section Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {showNewButton && onNewArtifact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewArtifact}
            className="text-purple-600 hover:text-purple-700"
          >
            <Plus className="mr-1 h-4 w-4" />
            New Artifact
          </Button>
        )}
      </div>

      {/* Artifact Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedArtifacts.map((artifact) => (
          <ArtifactCard
            key={artifact._id}
            artifact={artifact}
            versions={versionsMap[artifact._id] || []}
            onClick={() => onArtifactClick(artifact._id)}
          />
        ))}
      </div>
    </div>
  );
}
