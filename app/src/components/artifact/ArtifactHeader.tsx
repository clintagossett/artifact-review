"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VersionSwitcher } from "./VersionSwitcher";
import { ShareModal } from "./ShareModal";
import { Id } from "../../../convex/_generated/dataModel";

interface ArtifactHeaderProps {
  artifact: {
    _id?: Id<"artifacts">;
    title: string;
    shareToken: string;
  };
  version: {
    number: number;
    fileSize: number;
    createdAt: number;
  };
  versions: Array<{
    number: number;
    createdAt: number;
  }>;
  isLatestVersion: boolean;
  onVersionChange: (versionNumber: number) => void;
  currentUser?: any;
  userPermission?: "owner" | "can-comment" | null;
}

export function ArtifactHeader({
  artifact,
  version,
  versions,
  isLatestVersion,
  onVersionChange,
  currentUser,
  userPermission,
}: ArtifactHeaderProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const isOwner = userPermission === "owner";
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
            This is an old version (v{version.number}). This version is
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
                v{version.number}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{formatFileSize(version.fileSize)}</span>
              <span>{formatDate(version.createdAt)}</span>
            </div>
          </div>

          {/* Right side: Share button and Version switcher */}
          <div className="flex items-center gap-3">
            {/* Share button (owner only) */}
            {isOwner && artifact._id && (
              <Button
                variant="outline"
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}

            {/* Version switcher */}
            <VersionSwitcher
              currentVersion={version.number}
              versions={versions}
              onVersionChange={onVersionChange}
            />
          </div>
        </div>
      </div>

      {/* ShareModal */}
      {isOwner && artifact._id && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          artifact={{
            _id: artifact._id,
            title: artifact.title,
            shareToken: artifact.shareToken,
          }}
        />
      )}
    </div>
  );
}
