import { Badge } from "@/components/ui/badge";
import { VersionSwitcher } from "./VersionSwitcher";

interface ArtifactHeaderProps {
  artifact: {
    title: string;
    shareToken: string;
  };
  version: {
    versionNumber: number;
    fileSize: number;
    createdAt: number;
  };
  versions: Array<{
    versionNumber: number;
    createdAt: number;
  }>;
  isLatestVersion: boolean;
  onVersionChange: (versionNumber: number) => void;
}

export function ArtifactHeader({
  artifact,
  version,
  versions,
  isLatestVersion,
  onVersionChange,
}: ArtifactHeaderProps) {
  const formatFileSize = (bytes: number): string => {
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Read-only banner for old versions */}
      {!isLatestVersion && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <p className="text-sm text-yellow-800">
            This is an old version (v{version.versionNumber}). This version is
            read-only. View the latest version to add comments.
          </p>
        </div>
      )}

      {/* Header content */}
      <div className="px-6 py-4">
        <div className="flex items-start justify-between">
          {/* Title and metadata */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-gray-900">{artifact.title}</h1>
              <Badge className="px-2 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded">
                v{version.versionNumber}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{formatFileSize(version.fileSize)}</span>
              <span>{formatDate(version.createdAt)}</span>
            </div>
          </div>

          {/* Version switcher */}
          <VersionSwitcher
            currentVersion={version.versionNumber}
            versions={versions}
            onVersionChange={onVersionChange}
          />
        </div>
      </div>
    </div>
  );
}
