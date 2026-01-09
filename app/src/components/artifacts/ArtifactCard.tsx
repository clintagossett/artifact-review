import { Badge } from "@/components/ui/badge";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { FolderOpen, FileText, Users, Clock } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

export interface ArtifactCardProps {
  artifact: {
    _id: Id<"artifacts">;
    name: string;
    description?: string;
    shareToken: string;
    createdAt: number;
    updatedAt?: number;
  };
  versions: Array<{
    number: number;
    fileType: "html" | "markdown" | "zip";
  }>;
  fileCount?: number; // For ZIP artifacts
  memberCount?: number; // Future: team members
  onClick: () => void;
}

/**
 * Format timestamp as relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  return "just now";
}

/**
 * ArtifactCard - Individual artifact display
 */
export function ArtifactCard({
  artifact,
  versions,
  fileCount,
  memberCount,
  onClick,
}: ArtifactCardProps) {
  // Mock users for avatar display (future: real users from backend)
  const mockUsers = memberCount
    ? Array.from({ length: memberCount }, (_, i) => ({
      name: `User ${i + 1}`,
    }))
    : [];

  return (
    <article
      className="cursor-pointer rounded-xl border bg-card p-6 text-card-foreground shadow-sm transition-shadow hover:shadow-lg"
      onClick={onClick}
    >
      {/* Header with Icon and Title */}
      <div className="mb-3 flex items-start gap-3">
        <FolderOpen className="mt-1 h-5 w-5 flex-shrink-0 text-purple-600" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{artifact.name}</h3>
        </div>
      </div>

      {/* Description */}
      {artifact.description && (
        <p className="mb-4 line-clamp-2 text-sm text-gray-600">
          {artifact.description}
        </p>
      )}

      {/* Version Badges */}
      {versions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {versions.map((version) => (
            <Badge
              key={version.number}
              variant="secondary"
              className="bg-purple-100 text-purple-700 hover:bg-purple-100"
            >
              v{version.number}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
        {/* File Count (for ZIP files) */}
        {fileCount !== undefined && (
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{fileCount}</span>
          </div>
        )}

        {/* Member Count */}
        {memberCount !== undefined && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{memberCount}</span>
          </div>
        )}
      </div>

      {/* Footer with Avatars and Timestamp */}
      <div className="flex items-center justify-between">
        {/* Avatar Group */}
        <div>
          {mockUsers.length > 0 && (
            <AvatarGroup users={mockUsers} max={3} size="sm" />
          )}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{artifact.updatedAt ? formatRelativeTime(artifact.updatedAt) : "-"}</span>
        </div>
      </div>
    </article>
  );
}
