"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "@/hooks/use-toast";
import { logger, LOG_TOPICS } from "@/lib/logger";
import { usePermission } from "@/hooks/usePermission";

// Components
import { ArtifactHeader } from "./ArtifactHeader";
import { ArtifactFrame } from "./ArtifactFrame";
import { MultiPageNavigation } from "./MultiPageNavigation";
import { FileTree, FileNode } from "@/components/file-tree";
import { MarkdownViewer } from "./MarkdownViewer";

// Annotation System
import { useComments, usePublicComments } from "@/hooks/useComments";
import { useSelectionLayer } from "@/lib/annotation/react/useSelectionLayer";
import { SelectionOverlay } from "@/lib/annotation/react/SelectionOverlay";
import { W3CSelector, AnnotationTarget } from "@/lib/annotation/types";
import { convexToAnnotation, selectionToConvexTarget } from "@/lib/annotation/adapters/convex-adapter";
import { AnnotationSidebar } from "@/components/annotations/AnnotationSidebar";
import { SelectionMenu } from "@/components/annotations/SelectionMenu";
import { AnnotationDisplay } from "@/components/annotations/types";
import { CommentToolbar, FilterMode } from "@/components/comments/CommentToolbar";

interface ArtifactViewerProps {
  artifact: {
    _id: Id<"artifacts">;
    name: string;
    shareToken: string;
    createdBy: Id<"users">;
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
  currentUser?: { _id: Id<"users">; name?: string } | null;
  userPermission?: "owner" | "can-comment" | null;
  /** Initial file path from URL for deep linking */
  filePath?: string;
  /** Task 00049: Version processing status for E2E testing */
  versionStatus?: "uploading" | "processing" | "ready" | "error";
  /** Skip fetching comments (for public share pages where permission check would fail) */
  skipCommentsQuery?: boolean;
  /** When true, hides controls for anonymous public viewers (Back, Share, Manage, etc.) */
  isPublicViewer?: boolean;
  /** Public share token for fetching comments via public query */
  publicShareToken?: string;
  /** Public share capabilities (used to determine reply disabled reason) */
  publicCapabilities?: { readComments: boolean; writeComments: boolean };
}

export function ArtifactViewer({
  artifact,
  version,
  versions,
  isLatestVersion,
  onVersionChange,
  currentUser,
  userPermission,
  filePath,
  versionStatus = "ready",
  skipCommentsQuery = false,
  isPublicViewer = false,
  publicShareToken,
  publicCapabilities,
}: ArtifactViewerProps) {
  const router = useRouter();

  // Navigation State - use filePath from URL if provided, otherwise entryPoint or default
  const [currentPage, setCurrentPageState] = useState<string>(
    filePath || version.entryPoint || "index.html"
  );

  // Update URL when page changes (deep linking support)
  const setCurrentPage = (page: string) => {
    setCurrentPageState(page);
    // Update URL to reflect current page
    const cleanPage = page.startsWith("/") ? page.slice(1) : page;
    // Use different URL format for public share routes vs authenticated routes
    if (publicShareToken) {
      router.push(`/share/${publicShareToken}/${cleanPage}`, { scroll: false });
    } else {
      router.push(`/a/${artifact.shareToken}/v/${version.number}/${cleanPage}`, { scroll: false });
    }
  };
  const [history, setHistory] = useState<string[]>([]);
  const [forwardHistory, setForwardHistory] = useState<string[]>([]);

  // 1. Data Fetching (files & comments)
  // Fetch files for ZIP artifacts
  const files = useQuery(api.artifacts.getFilesByVersion,
    version.fileType === "zip" ? { versionId: version._id } : "skip"
  );

  // Fetch raw comments from Convex
  // Use public query when publicShareToken is provided
  // Otherwise use authenticated query
  const rawAuthenticatedComments = useComments(
    version._id,
    userPermission === null || skipCommentsQuery || !!publicShareToken
  );
  const rawPublicComments = usePublicComments(
    version._id,
    publicShareToken,
    !publicShareToken || skipCommentsQuery // skip if no public token or skipCommentsQuery
  );
  // Use public comments if available, otherwise authenticated comments
  const rawComments = publicShareToken ? rawPublicComments : rawAuthenticatedComments;
  const convexComments = rawComments || [];

  // Mutations
  const createComment = useMutation(api.comments.create);
  const createCommentViaPublicShare = useMutation(api.comments.createViaPublicShare);
  const updateContent = useMutation(api.comments.updateContent);
  const toggleResolved = useMutation(api.comments.toggleResolved);
  const softDelete = useMutation(api.comments.softDelete);
  const createReply = useMutation(api.commentReplies.createReply);

  // 3. Selection Logic (Spike Integration) - State moved up
  const [pendingSelector, setPendingSelector] = useState<W3CSelector | null>(null); // Menu visible
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [draftSelector, setDraftSelector] = useState<W3CSelector | null>(null);
  const [draftStyle, setDraftStyle] = useState<"comment" | "strike">("comment");

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Filter State
  const [filter, setFilter] = useState<FilterMode>('all');

  // File Tree State (persisted to sessionStorage)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isTreeStateLoaded, setIsTreeStateLoaded] = useState(false);

  // Load tree state from sessionStorage
  useEffect(() => {
    if (!version._id) return;
    try {
      const key = `artifact_tree_${version._id}`;
      const stored = sessionStorage.getItem(key);
      if (stored) {
        setExpandedIds(new Set(JSON.parse(stored)));
      }
      setIsTreeStateLoaded(true);
    } catch (e) {
      console.error("Failed to load tree state", e);
      setIsTreeStateLoaded(true);
    }
  }, [version._id]);

  // Save tree state helper
  const updateExpandedIds = useCallback((newIds: Set<string>) => {
    setExpandedIds(newIds);
    if (!version._id) return;
    try {
      const key = `artifact_tree_${version._id}`;
      sessionStorage.setItem(key, JSON.stringify(Array.from(newIds)));
    } catch (e) {
      console.error("Failed to save tree state", e);
    }
  }, [version._id]);

  // Toggle folder expand/collapse
  const handleToggleExpand = useCallback((id: string) => {
    const newIds = new Set(expandedIds);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }
    updateExpandedIds(newIds);
  }, [expandedIds, updateExpandedIds]);

  // Auto-expand path to current file
  useEffect(() => {
    if (!isTreeStateLoaded || !currentPage || currentPage === 'index.html' || currentPage === '/') return;

    const cleanPath = currentPage.startsWith('/') ? currentPage.substring(1) : currentPage;
    const parts = cleanPath.split('/').filter(p => p !== '');

    // Remove filename to get directories
    parts.pop();

    if (parts.length === 0) return;

    const newIds = new Set(expandedIds);
    let currentPath = '';
    let changed = false;

    parts.forEach(part => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const folderId = `folder-${currentPath}`;
      if (!newIds.has(folderId)) {
        newIds.add(folderId);
        changed = true;
      }
    });

    if (changed) {
      updateExpandedIds(newIds);
    }
  }, [currentPage, isTreeStateLoaded, expandedIds, updateExpandedIds]);

  const textContainerRef = useRef<HTMLDivElement | null>(null);

  // 2. Annotation State & Adapters
  // Convert Convex comments to UI Annotations
  const allAnnotations = useMemo(() => {
    return convexComments.map(c => convexToAnnotation(c));
  }, [convexComments]);

  // Filter annotations by current page (for multi-file artifacts)
  const annotations = useMemo(() => {
    return allAnnotations.filter(a => a.target?.source === currentPage);
  }, [allAnnotations, currentPage]);

  // Filter annotations based on filter state (resolved/unresolved)
  const filteredAnnotations = useMemo(() => {
    if (filter === 'all') return annotations;
    if (filter === 'resolved') return annotations.filter(a => a.resolved);
    return annotations.filter(a => !a.resolved);
  }, [annotations, filter]);

  // Extract selectors for the overlay
  // Filter out resolved ones if we want to hide them, currently showing all with visual distinction
  // Also include the current draft selector if it exists
  const selectorsToRender = useMemo(() => {
    const list = annotations
      .filter(a => !a.resolved) // Optional: Hide resolved highlights? Let's show them but maybe different style in future
      .map(a => ({
        ...a.target.selector,
        style: a.style // pass 'comment' or 'strike' to overlay
      }));

    if (draftSelector) {
      list.push({
        ...draftSelector,
        style: draftStyle
      });
    }

    return list;
  }, [annotations, draftSelector, draftStyle]);


  // 3. Selection Logic (Spike Integration)

  // State definitions moved to top of component
  // ...

  const { registerTextContainer } = useSelectionLayer({
    onSelectionCreate: (selector, domRect) => {
      // Only allow interaction if user has permission
      if (!userPermission) return;

      setPendingSelector(selector);
      if (domRect) {
        // Adjust for scrolling of the main content area?
        // The domRect is viewport relative.
        // SelectionMenu uses fixed positioning.
        setMenuPosition({
          x: domRect.left + domRect.width / 2,
          y: domRect.top + window.scrollY // If page scrolls entirely, or container?
        });
      }
    },
    onSelectionCancel: () => {
      setPendingSelector(null);
      setMenuPosition(null);
      // We do NOT clear draftSelector here, as user might be typing in sidebar while clicking elsewhere?
      // Actually standard behavior is clicking away cancels selection. 
      // But if sidebar is open with draft, maybe we keep it?
      // For now, let's keep draft unless explicitly cancelled in sidebar.
    }
  });


  // 4. Handlers
  const handleMenuAction = (style: "comment" | "strike") => {
    if (!pendingSelector) return;
    setDraftSelector(pendingSelector);
    setDraftStyle(style);
    setPendingSelector(null);
    setMenuPosition(null);
    setIsSidebarOpen(true);
  };

  // Handle relative link clicks in markdown
  const handleMarkdownLinkClick = useCallback((href: string) => {
    // Handle anchor links
    if (href.startsWith('#')) {
      const element = document.getElementById(href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Resolve relative path
    const currentDir = currentPage.includes('/')
      ? currentPage.substring(0, currentPage.lastIndexOf('/'))
      : '';

    let targetPath: string;
    if (href.startsWith('/')) {
      // Absolute path within artifact
      targetPath = href.substring(1);
    } else if (href.startsWith('./')) {
      // Explicit relative
      targetPath = currentDir ? `${currentDir}/${href.substring(2)}` : href.substring(2);
    } else {
      // Implicit relative
      targetPath = currentDir ? `${currentDir}/${href}` : href;
    }

    // Normalize path (remove ./ and resolve ..)
    const parts = targetPath.split('/').filter(p => p && p !== '.');
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }

    const finalPath = resolved.join('/');

    // Navigate to the resolved path
    setHistory([...history, currentPage]);
    setForwardHistory([]);
    setCurrentPage(finalPath);
  }, [currentPage, history, setCurrentPage]);

  const handleCreateAnnotation = async (content: string) => {
    if (!draftSelector || !currentUser) return;

    // Naive line detection (optional optimization from spike)
    // For now we just trust the selector

    const target = selectionToConvexTarget(currentPage, draftSelector, draftStyle);

    try {
      // Use public share mutation when accessing via public link
      if (publicShareToken) {
        await createCommentViaPublicShare({
          versionId: version._id,
          publicShareToken,
          content,
          target
        });
      } else {
        await createComment({
          versionId: version._id,
          content,
          target
        });
      }

      // Cleanup
      setDraftSelector(null);
      toast({ title: "Annotation added" });
    } catch (e: any) {
      toast({ title: "Failed to add annotation", description: e.message, variant: "destructive" });
    }
  };

  const handleReply = async (commentId: string, content: string) => {
    try {
      await createReply({
        commentId: commentId as Id<"comments">,
        content
      });
    } catch (e: any) {
      toast({ title: "Failed to reply", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditText(content);
  };

  const handleSaveEdit = async (id: string, content: string) => {
    try {
      await updateContent({
        commentId: id as Id<"comments">,
        content
      });
      setEditingId(null);
    } catch (e: any) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleResolve = async (id: string) => {
    try {
      await toggleResolved({ commentId: id as Id<"comments"> });
    } catch (e: any) {
      toast({ title: "Failed to update status", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await softDelete({ commentId: id as Id<"comments"> });
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    }
  };


  // 5. File Tree Logic (Existing)
  const fileTreeData = useMemo(() => {
    if (!files || version.fileType !== "zip") return [];
    const root: FileNode[] = [];
    const map = new Map<string, FileNode>();
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    sortedFiles.forEach(file => {
      const parts = file.path.split('/');
      const fileName = parts.pop()!;
      const dirPath = parts.join('/');
      const node: FileNode = {
        id: file._id,
        name: fileName,
        type: "file",
        content: "",
      };
      if (dirPath === "") {
        root.push(node);
      } else {
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


  // 6. Navigation Helpers (Existing)
  // Fix: Use NEXT_PUBLIC_CONVEX_HTTP_URL for correct port in local dev (3211 vs 3210)
  const convexHttpUrl = process.env.NEXT_PUBLIC_CONVEX_HTTP_URL ||
    process.env.NEXT_PUBLIC_CONVEX_URL?.replace(".cloud", ".site");
  const contentUrl = `${convexHttpUrl}/artifact/${artifact.shareToken}/v${version.number}/${currentPage}`;

  const isMarkdown = currentPage.toLowerCase().endsWith('.md') || currentPage.toLowerCase().endsWith('.markdown') || currentPage.toLowerCase().endsWith('readme');


  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      data-version-status={versionStatus}
    >
      <ArtifactHeader
        artifact={{ ...artifact, _id: artifact._id }}
        version={version}
        versions={versions}
        isLatestVersion={isLatestVersion}
        onVersionChange={onVersionChange}
        latestVersionNumber={Math.max(...versions.map(v => v.number))}
        currentUser={currentUser}
        userPermission={userPermission}
        isPublicViewer={isPublicViewer}
      />

      <CommentToolbar
        filter={filter}
        onFilterChange={setFilter}
        totalCount={annotations.length}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isViewingOldVersion={!isLatestVersion}
        currentVersionNumber={version.number}
        latestVersionNumber={Math.max(...versions.map(v => v.number))}
        onSwitchToLatest={() => onVersionChange(Math.max(...versions.map(v => v.number)))}
        canComment={userPermission !== null}
        isPublicViewer={isPublicViewer}
      />

      <div className="flex flex-1 overflow-hidden relative">

        {/* Menu */}
        {menuPosition && (
          <SelectionMenu
            x={menuPosition.x}
            y={menuPosition.y}
            onComment={() => handleMenuAction('comment')}
            onStrike={() => handleMenuAction('strike')}
            onClose={() => setPendingSelector(null)}
          />
        )}

        {/* Left Sidebar (Files) */}
        {version.fileType === "zip" && fileTreeData.length > 0 && (
          <div className="w-64 border-r bg-muted/10 overflow-y-auto flex-shrink-0">
            <FileTree
              data={fileTreeData}
              onSelectFile={(node) => {
                const file = files?.find(f => f._id === node.id);
                if (file) setCurrentPage(file.path);
              }}
              selectedFileId={files?.find(f => f.path === currentPage)?._id}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-100 relative">
          {(history.length > 0 || forwardHistory.length > 0) && (
            <div className="border-b bg-background p-2">
              <MultiPageNavigation
                currentPage={currentPage}
                canGoBack={history.length > 0}
                canGoForward={forwardHistory.length > 0}
                onBack={() => {
                  if (history.length === 0) return;
                  const prev = history[history.length - 1];
                  setHistory(history.slice(0, -1));
                  setForwardHistory([currentPage, ...forwardHistory]);
                  setCurrentPage(prev);
                }}
                onForward={() => {
                  if (forwardHistory.length === 0) return;
                  const next = forwardHistory[0];
                  setHistory([...history, currentPage]);
                  setForwardHistory(forwardHistory.slice(1));
                  setCurrentPage(next);
                }}
              />
            </div>
          )}

          <div className="flex-1 overflow-auto p-8 relative" onClick={() => {
            // Clicking content area might want to clear menu if not selecting?
            // Handled by manager mostly.
          }}>
            {/* Content Wrapper for Annotation Layer */}
            <div className="relative bg-white shadow-sm min-h-full max-w-4xl mx-auto rounded-lg">
              {/* Render Content */}
              <div ref={(el) => {
                textContainerRef.current = el;
                registerTextContainer(el);
              }} className="relative z-10 min-h-[500px]">
                {isMarkdown ? (
                  <MarkdownViewer
                    src={contentUrl}
                    className="min-h-[500px]"
                    onLinkClick={handleMarkdownLinkClick}
                  />
                ) : (
                  // For HTML in Iframe, we can't easily overlay DIVs inside it from here unless 
                  // we inject the layer INTO the iframe. 
                  // For this iteration, let's assume Markdown/Text artifacts first 
                  // OR we need to overlay on top of iframe which is tricky.
                  // Ideally, `ArtifactFrame` should handle its own internal selection logic if it's an Iframe.
                  // If `ArtifactFrame` is an Iframe, `useSelectionLayer` won't work on `window` selection outside.
                  // FOR NOW: Let's support Markdown fully. 
                  // Supporting HTML Iframe annotations requires logic injection which is a larger task.
                  // The spike used simple text rendering, not iframe.
                  <div className="p-4 text-center text-gray-400">
                    <ArtifactFrame src={contentUrl} />
                    {/* Overlay won't work here yet for Iframe content */}
                  </div>
                )}
              </div>

              {/* Render Overlay only if not iframe (Markdown is rendered as Divs) */}
              {isMarkdown && (
                <SelectionOverlay
                  selectors={selectorsToRender}
                  textContainer={textContainerRef.current}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar (Annotations) - hidden for public viewers */}
        {!isPublicViewer && (
          <AnnotationSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            annotations={filteredAnnotations}
            currentUser={currentUser ? { id: currentUser._id, name: currentUser.name || "Me" } : null}
            artifactOwnerId={artifact.createdBy}

            draftSelector={draftSelector}
            draftStyle={draftStyle}
            onCancelDraft={() => setDraftSelector(null)}
            onSaveDraft={handleCreateAnnotation}

            onReply={handleReply}
            onEdit={handleEdit}
            onSaveEdit={handleSaveEdit}
            onToggleResolve={handleToggleResolve}
            onDelete={handleDelete}

            editingId={editingId}
            editText={editText}
            setEditText={setEditText}
            onCancelEdit={() => setEditingId(null)}
            skipReplies={!!publicShareToken}
            canReply={userPermission !== null}
            replyDisabledReason={
              publicShareToken && userPermission === null
                ? (publicCapabilities?.readComments && !publicCapabilities?.writeComments ? "access_mode" : "not_authenticated")
                : undefined
            }
          />
        )}

      </div>
    </div>
  );
}
