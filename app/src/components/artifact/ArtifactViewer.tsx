"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArtifactHeader } from "./ArtifactHeader";
import { ArtifactFrame } from "./ArtifactFrame";
import { MultiPageNavigation } from "./MultiPageNavigation";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "@/hooks/use-toast";
import { logger, LOG_TOPICS } from "@/lib/logger";
import { Id } from "@/convex/_generated/dataModel";

interface ArtifactViewerProps {
  artifact: {
    _id: Id<"artifacts">;
    name: string;
    shareToken: string;
  };
  version: {
    _id: Id<"artifactVersions">;
    number: number;
    fileType: "html" | "zip" | "markdown";
    entryPoint?: string;
    size: number;
    createdAt: number;
  };
  versions: Array<{
    number: number;
    createdAt: number;
    name?: string;
    isLatest: boolean;
  }>;
  isLatestVersion: boolean;
  onVersionChange: (versionNumber: number) => void;
  currentUser?: any;
  userPermission?: "owner" | "can-comment" | null;
}

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FileTree, FileNode } from "@/components/file-tree";
import { MarkdownViewer } from "./MarkdownViewer";

export function ArtifactViewer({
  artifact,
  version,
  versions,
  isLatestVersion,
  onVersionChange,
  currentUser,
  userPermission,
}: ArtifactViewerProps) {
  const router = useRouter();

  // Multi-page navigation state
  const [currentPage, setCurrentPage] = useState<string>(
    version.entryPoint || "index.html"
  );
  const [history, setHistory] = useState<string[]>([]);
  const [forwardHistory, setForwardHistory] = useState<string[]>([]);

  // Fetch files for ZIP artifacts to build the tree
  const files = useQuery(api.artifacts.getFilesByVersion,
    version.fileType === "zip" ? { versionId: version._id } : "skip"
  );

  // Convert flat files to tree
  const fileTreeData = useMemo(() => {
    if (!files || version.fileType !== "zip") return [];

    const root: FileNode[] = [];
    const map = new Map<string, FileNode>();

    // Sort files by path depth and name
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    sortedFiles.forEach(file => {
      const parts = file.path.split('/');
      const fileName = parts.pop()!;
      const dirPath = parts.join('/');

      const node: FileNode = {
        id: file._id,
        name: fileName,
        type: "file",
        content: "", // Content loaded on demand
      };

      if (dirPath === "") {
        root.push(node);
      } else {
        // Find parent folder, creating if needed (simplified for flat list)
        // Note: For a robust implementation, we'd need to handle folder creation properly.
        // Given current flat storage, we might just show flat list or assume folders exist?
        // Let's implement a quick folder builder.

        let currentLevel = root;
        let currentPath = "";

        parts.forEach((part, index) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          let folder = currentLevel.find(n => n.name === part && n.type === "folder");

          if (!folder) {
            folder = {
              id: `folder-${currentPath}`,
              name: part,
              type: "folder",
              children: []
            };
            currentLevel.push(folder);
          }

          currentLevel = folder.children!;
        });

        currentLevel.push(node);
      }
    });

    return root;
  }, [files, version.fileType]);


  // Real-time permission subscription
  const permission = usePermission(artifact._id);
  const previousPermission = useRef(permission);

  // Handle permission revocation (kick-out)
  useEffect(() => {
    // Only trigger on transition from truthy to null
    // This prevents false positives on initial load
    if (previousPermission.current && permission === null) {
      logger.warn(
        LOG_TOPICS.Artifact,
        "ArtifactViewer",
        "Access revoked - redirecting to dashboard",
        { artifactId: artifact._id }
      );

      // Show toast
      toast({
        title: "Access revoked",
        description: "Your access to this artifact has been revoked.",
        variant: "destructive",
      });

      // Redirect with slight delay for toast visibility
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    }

    previousPermission.current = permission;
  }, [permission, artifact._id, router]);

  // Build content URL
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
    ".cloud",
    ".site"
  );

  // URL to fetch content
  const contentUrl = `${convexUrl}/artifact/${artifact.shareToken}/v${version.number}/${currentPage}`;

  const handleBack = () => {
    if (history.length === 0) return;

    const previousPage = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setForwardHistory([currentPage, ...forwardHistory]);
    setCurrentPage(previousPage);
  };

  const handleForward = () => {
    if (forwardHistory.length === 0) return;

    const nextPage = forwardHistory[0];
    setHistory([...history, currentPage]);
    setForwardHistory(forwardHistory.slice(1));
    setCurrentPage(nextPage);
  };

  // Calculate latest version number
  const latestVersionNumber = versions.find(v => v.isLatest)?.number
    ?? Math.max(...versions.map(v => v.number));

  // Determine view mode
  const isMarkdown = currentPage.toLowerCase().endsWith('.md') ||
    currentPage.toLowerCase().endsWith('.markdown') ||
    currentPage.toLowerCase().endsWith('readme');



  const handleFileSelect = (node: FileNode) => {
    // Reconstruct full path? 
    // The node doesn't easily have full path unless we store it.
    // Let's modify the tree builder to store full path in id or a new prop?
    // Actually, we can just find the file in the `files` array by ID if passed correctly.
    // But our tree builder made up folder IDs.

    const file = files?.find(f => f._id === node.id);
    if (file) {
      // Update history
      setHistory([...history, currentPage]);
      setForwardHistory([]);
      setCurrentPage(file.path);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <ArtifactHeader
        artifact={artifact}
        version={version}
        versions={versions}
        isLatestVersion={isLatestVersion}
        onVersionChange={onVersionChange}
        latestVersionNumber={latestVersionNumber}
        currentUser={currentUser}
        userPermission={userPermission}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for ZIPs */}
        {version.fileType === "zip" && fileTreeData.length > 0 && (
          <div className="w-64 border-r bg-muted/10 overflow-y-auto flex-shrink-0">
            <div className="p-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">
              Files
            </div>
            <FileTree
              data={fileTreeData}
              onSelectFile={handleFileSelect}
              selectedFileId={files?.find(f => f.path === currentPage)?._id}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Multi-page navigation (only for valid navigation history) */}
          {(history.length > 0 || forwardHistory.length > 0) && (
            <div className="border-b bg-background p-2">
              <MultiPageNavigation
                currentPage={currentPage}
                canGoBack={history.length > 0}
                canGoForward={forwardHistory.length > 0}
                onBack={handleBack}
                onForward={handleForward}
              />
            </div>
          )}

          {/* Artifact Content */}
          <div className="flex-1 bg-gray-100 overflow-auto relative">
            {isMarkdown ? (
              <div className="max-w-4xl mx-auto p-8 bg-white shadow-sm min-h-full">
                <MarkdownViewer src={contentUrl} />
              </div>
            ) : (
              <ArtifactFrame src={contentUrl} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
