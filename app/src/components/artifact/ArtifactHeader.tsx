"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  Share2,
  Settings,
  History,
  Upload,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ShareModal } from "./ShareModal";
import { PresenceAvatars } from "./PresenceAvatars";
import { usePresence } from "@/hooks/usePresence";
import { Id } from "@/convex/_generated/dataModel";
import { NotificationCenter } from "@/components/NotificationCenter";

interface ArtifactHeaderProps {
  artifact: {
    _id: Id<"artifacts">;
    name: string;
    shareToken: string;
  };
  version: {
    _id: Id<"artifactVersions">;
    number: number;
    size: number;
    createdAt: number;
  };
  versions: Array<{
    _id?: Id<"artifactVersions">;
    number: number;
    createdAt: number;
    name?: string;
    isLatest: boolean;
  }>;
  isLatestVersion: boolean;
  onVersionChange: (versionNumber: number) => void;
  latestVersionNumber?: number;
  currentUser?: any;
  userPermission?: "owner" | "can-comment" | null;
}

export function ArtifactHeader({
  artifact,
  version,
  versions,
  isLatestVersion,
  onVersionChange,
  latestVersionNumber,
  currentUser,
  userPermission,
}: ArtifactHeaderProps) {
  const router = useRouter();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const isOwner = userPermission === "owner";

  // Presence - show who's viewing
  const activeUsers = usePresence(artifact._id, version._id);

  // Status (hardcoded for now - not in schema yet)
  const status = "in-review";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-review":
        return "bg-purple-100 text-purple-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "changes-requested":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleBack = () => {
    router.push("/dashboard");
  };

  const handleNavigateToSettings = () => {
    router.push(`/a/${artifact.shareToken}/settings`);
  };

  const handleNavigateToVersions = () => {
    router.push(`/a/${artifact.shareToken}/settings?tab=versions`);
  };

  const showPermissionModal = (action: "upload" | "share" | "manage") => {
    const messages = {
      upload: "Only the artifact owner can upload a new version.",
      share: "Only the artifact owner can share this artifact.",
      manage: "Only the artifact owner can manage this artifact.",
    };
    window.alert(messages[action]);
  };

  // Find current version object
  const currentVersion = versions.find((v) => v.number === version.number);

  return (
    <header className="border-b border-gray-200 bg-white relative z-50">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side: Back, Title, Version, Status, Presence */}
        <div className="flex items-center gap-4">
          {/* Back button */}
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <div className="h-6 w-px bg-gray-300" />

          {/* Title and Version Selector */}
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-gray-900">{artifact.name}</h1>

            {/* Rich Version Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <History className="w-4 h-4" />
                  {currentVersion?.name &&
                  currentVersion.name !== `v${currentVersion.number}`
                    ? `v${version.number} - ${currentVersion.name}`
                    : `v${version.number}`}
                  {isLatestVersion && (
                    <Badge className="bg-green-100 text-green-800 text-xs ml-1">
                      Latest
                    </Badge>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                <div className="px-2 py-1.5 text-sm font-semibold text-gray-900">
                  Version History
                </div>
                <DropdownMenuSeparator />
                {[...versions]
                  .sort((a, b) => b.number - a.number)
                  .map((v) => (
                    <DropdownMenuItem
                      key={v.number}
                      onClick={() => onVersionChange(v.number)}
                      className={`${v.number === version.number ? "bg-purple-50" : ""}`}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {v.name && v.name !== `v${v.number}`
                                ? `v${v.number} - ${v.name}`
                                : `v${v.number}`}
                            </span>
                            {v.isLatest && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                Latest
                              </Badge>
                            )}
                            {v.number === version.number && (
                              <Check className="w-4 h-4 text-purple-600" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(v.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-purple-600"
                  onClick={() => {
                    if (!isOwner) {
                      showPermissionModal("upload");
                      return;
                    }
                    handleNavigateToVersions();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Version
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status Badge */}
          <Badge className={getStatusColor(status)}>
            {status === "in-review" ? "In Review" : "Draft"}
          </Badge>

          {/* Live Presence Avatars */}
          <PresenceAvatars
            activeUsers={activeUsers}
            currentVersionId={version._id}
          />
        </div>

        {/* Right side: Notifications, Share and Manage buttons */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          {currentUser?._id && (
            <div className="mr-1">
              <NotificationCenter subscriberId={currentUser._id} />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isOwner) {
                showPermissionModal("share");
                return;
              }
              setIsShareModalOpen(true);
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isOwner) {
                showPermissionModal("manage");
                return;
              }
              handleNavigateToSettings();
            }}
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage
          </Button>
        </div>
      </div>

      {/* ShareModal */}
      {artifact._id && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          artifact={{
            _id: artifact._id,
            name: artifact.name,
            shareToken: artifact.shareToken,
          }}
        />
      )}
    </header>
  );
}
