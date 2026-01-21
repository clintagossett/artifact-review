"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Share2,
  Users,
  MessageSquare,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Reply,
  X,
  Send,
  CheckCircle2,
  XCircle,
  Edit3,
  Upload,
  History,
  MapPin,
  Settings,
  Trash2,
  FolderTree, // Added icon if needed
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CommentToolbar } from '@/components/comments/CommentToolbar';
import { CommentCard } from '@/components/artifact/CommentCard';
import { MarkdownViewer } from '@/components/artifact/MarkdownViewer';
import { FileTree, FileNode } from '@/components/file-tree';
import type {
  Comment,
  ToolMode,
  ToolBadge,
} from '@/components/comments/types';
import { Id } from '@/convex/_generated/dataModel';

// Real version data from backend (from api.artifacts.getVersions)
interface BackendVersion {
  _id: Id<"artifactVersions">;
  _creationTime: number;
  artifactId: Id<"artifacts">;
  number: number;
  name?: string;
  createdBy: Id<"users">;
  fileType: string;
  size: number;
  createdAt: number;
  isLatest: boolean;
}
import { useComments } from '@/hooks/useComments';
import { useCommentActions } from '@/hooks/useCommentActions';
import { useReplyActions } from '@/hooks/useReplyActions';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { usePresence } from '@/hooks/usePresence';
import { useViewTracker } from '@/hooks/useViewTracker';
import { PresenceAvatars } from './PresenceAvatars';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { logger, LOG_TOPICS } from '@/lib/logger';

interface DocumentViewerProps {
  documentId: string;
  onBack: () => void;
  // Real artifact data (replacing mock project)
  artifactTitle: string;
  versions: BackendVersion[];
  onNavigateToSettings?: () => void;
  onNavigateToShare?: () => void;
  onNavigateToVersions?: () => void;
  shareToken: string;
  versionNumber: number;
  versionId: Id<"artifactVersions">;
  artifactOwnerId: Id<"users">; // For delete permissions
  convexUrl: string;
  userPermission?: "owner" | "can-comment" | null;
  filePath?: string;
}


export function DocumentViewer({
  documentId,
  onBack,
  artifactTitle,
  versions,
  onNavigateToSettings,
  onNavigateToShare,
  onNavigateToVersions,
  shareToken,
  versionNumber,
  versionId,
  artifactOwnerId,
  convexUrl,
  userPermission,
  filePath
}: DocumentViewerProps) {
  const router = useRouter();

  // Get current user for permission checks
  const currentUser = useQuery(api.users.getCurrentUser);
  const currentUserId = currentUser?._id;

  // Determine if current user is owner
  const isOwner = userPermission === "owner";

  /**
   * Show browser alert for permission-restricted actions
   */
  const showPermissionModal = (action: 'upload' | 'share' | 'manage') => {
    const messages = {
      upload: 'Only the artifact owner can upload a new version.',
      share: 'Only the artifact owner can share this artifact.',
      manage: 'Only the artifact owner can manage this artifact.',
    };
    window.alert(messages[action]);
  };

  // Fetch comments from backend
  const backendComments = useComments(versionId);
  const { createComment, updateContent, toggleResolved, softDelete } = useCommentActions();
  const { createReply } = useReplyActions();

  // Check if user can delete a comment (creator or owner)
  const canDeleteComment = (createdBy: string) => {
    if (!currentUserId) return false;
    return currentUserId === createdBy || currentUserId === artifactOwnerId;
  };

  // Check if user can edit a comment (only creator)
  const canEditComment = (createdBy: string) => {
    if (!currentUserId) return false;
    return currentUserId === createdBy;
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);

  // Load sidebar preference
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!documentId) return;

    // Only load from local storage on initial mount or when documentId changes
    const saved = localStorage.getItem(`artifact_comments_sidebar_open_${documentId}`);
    if (saved !== null) {
      setSidebarOpen(saved === 'true');
    }

    isInitialLoad.current = false;
  }, [documentId]);

  // Save sidebar preference
  useEffect(() => {
    if (!documentId) return;
    localStorage.setItem(`artifact_comments_sidebar_open_${documentId}`, String(sidebarOpen));
  }, [sidebarOpen, documentId]);

  // Load backend comments when they arrive
  useEffect(() => {
    if (backendComments) {
      // Transform backend comments to frontend Comment type
      const transformedComments: Comment[] = backendComments.map((bc) => ({
        id: bc._id,
        versionId: bc.versionId,
        createdBy: bc.createdBy, // Creator ID for permission checks
        author: {
          name: bc.author.name || 'Anonymous',
          avatar: (bc.author.name || 'A').substring(0, 2).toUpperCase(),
        },
        content: bc.content,
        timestamp: new Date(bc.createdAt).toLocaleString(),
        resolved: bc.resolved,
        // We'll fetch replies separately for now (or set empty array)
        replies: [],
        // Map target metadata to frontend fields
        elementType: bc.target?.type === 'element' ? (bc.target.elementId ? 'section' : 'text') : 'text',
        elementId: bc.target?.elementId,
        highlightedText: bc.target?.selectedText,
        page: bc.target?.page,
      }));

      // Use only backend comments (no mock data)
      setComments(transformedComments);
    }
  }, [backendComments]);
  const [selectedText, setSelectedText] = useState('');
  const [showCommentTooltip, setShowCommentTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [newCommentText, setNewCommentText] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<{
    type: 'text' | 'image' | 'heading' | 'button' | 'section';
    id?: string;
    preview?: string;
    text?: string;
  } | null>(null);

  // Tool states
  const [activeToolMode, setActiveToolMode] = useState<ToolMode>(null);
  const [commentBadge, setCommentBadge] = useState<ToolBadge>(null);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  // Refs to track current tool state for event listeners (fixes closure issue)
  const activeToolModeRef = useRef<ToolMode>(null);
  const commentBadgeRef = useRef<ToolBadge>(null);

  // Refs for iframe listeners to avoid dependency loops
  // Refs for iframe listeners to avoid dependency loops moved below definitions to avoid TDZ errors

  // Refs for iframe listeners sync moved below definition to avoid TDZ errors

  // Version management state
  // Use the real versionId prop instead of mock version IDs
  const [currentVersionId, setCurrentVersionId] = useState<string>(versionId);

  // Sync currentVersionId when versionId prop changes (e.g., user navigates to different version via URL)
  useEffect(() => {
    setCurrentVersionId(versionId);
  }, [versionId]);

  // LIVE PRESENCE AND VIEW TRACKING
  const activeUsers = usePresence(documentId as Id<"artifacts">, versionId);

  // Presence states
  const [recentActivity, setRecentActivity] = useState<{
    message: string;
    timestamp: number;
  } | null>(null);

  // Multi-page navigation state
  const pathname = usePathname();
  // filePath comes from prop (via Next.js dynamic route)
  // Ensure it starts with / if not present
  const currentPage = filePath ? (filePath.startsWith('/') ? filePath : `/${filePath}`) : '/index.html';

  const setCurrentPage = useCallback((page: string) => {
    // Navigate to new URL structure: /a/[token]/v/[version]/[...path]
    // Clean path (remove leading slash)
    const cleanPage = page.startsWith('/') ? page.substring(1) : page;

    // Construct new URL
    // We need to know the base URL. We can construct it from props.
    if (versionNumber) {
      router.push(`/a/${shareToken}/v/${versionNumber}/${cleanPage}`, { scroll: false });
    } else {
      // Fallback for latest version if not using v/[num] route
      // For now, if no version number in URL, we can't easily append path unless we change root route.
      // But we can fallback to query param or just log warning?
      // Or maybe force redirect to explicit version?
      console.warn("Navigation on implicit latest version route not deeply supported yet");
    }
  }, [shareToken, versionNumber, router]);
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['/index.html']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // --- FILE TREE STATE ---
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isTreeStateLoaded, setIsTreeStateLoaded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);

  // Handle sidebar resize
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        // Limit width between 160px and 600px
        const newWidth = Math.max(160, Math.min(600, e.clientX));
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  // --- COMMENTS SIDEBAR STATE ---
  const [commentsSidebarWidth, setCommentsSidebarWidth] = useState(384);
  const [isResizingComments, setIsResizingComments] = useState(false);

  const startResizingComments = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingComments(true);
  }, []);

  const stopResizingComments = useCallback(() => {
    setIsResizingComments(false);
  }, []);

  const resizeComments = useCallback(
    (e: MouseEvent) => {
      if (isResizingComments) {
        // Limit width between 250px and 800px
        // Calculate width from right edge: windowWidth - mouseX
        const newWidth = Math.max(250, Math.min(800, window.innerWidth - e.clientX));
        setCommentsSidebarWidth(newWidth);
      }
    },
    [isResizingComments]
  );

  // Load comments sidebar width preference
  useEffect(() => {
    if (!documentId) return;
    const savedWidth = localStorage.getItem(`artifact_comments_sidebar_width_${documentId}`);
    if (savedWidth !== null) {
      const width = parseInt(savedWidth, 10);
      if (!isNaN(width)) {
        setCommentsSidebarWidth(width);
      }
    }
  }, [documentId]);

  // Save comments sidebar width preference
  useEffect(() => {
    if (!isResizingComments && documentId) {
      localStorage.setItem(`artifact_comments_sidebar_width_${documentId}`, String(commentsSidebarWidth));
    }
  }, [isResizingComments, commentsSidebarWidth, documentId]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      // Prevent selection during resize
      document.body.style.userSelect = "none";
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      // Don't reset if other resize is active
      if (!isResizingComments) {
        document.body.style.userSelect = "";
      }
    }

    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing, isResizingComments]);

  // Separate effect for comments resize to handle both independently if needed
  useEffect(() => {
    if (isResizingComments) {
      window.addEventListener("mousemove", resizeComments);
      window.addEventListener("mouseup", stopResizingComments);
      document.body.style.userSelect = "none";
    } else {
      window.removeEventListener("mousemove", resizeComments);
      window.removeEventListener("mouseup", stopResizingComments);
      // Don't reset if other resize is active
      if (!isResizing) {
        document.body.style.userSelect = "";
      }
    }

    return () => {
      window.removeEventListener("mousemove", resizeComments);
      window.removeEventListener("mouseup", stopResizingComments);
    };
  }, [isResizingComments, resizeComments, stopResizingComments, isResizing]);

  // Load state from session storage
  useEffect(() => {
    if (!currentVersionId) return;
    try {
      const key = `artifact_tree_${currentVersionId}`;
      const stored = sessionStorage.getItem(key);
      if (stored) {
        setExpandedIds(new Set(JSON.parse(stored)));
      }
      setIsTreeStateLoaded(true);
    } catch (e) {
      console.error("Failed to load tree state", e);
      setIsTreeStateLoaded(true);
    }
  }, [currentVersionId]);

  // Save state helper
  const updateExpandedIds = useCallback((newIds: Set<string>) => {
    setExpandedIds(newIds);
    if (!currentVersionId) return;
    try {
      const key = `artifact_tree_${currentVersionId}`;
      sessionStorage.setItem(key, JSON.stringify(Array.from(newIds)));
    } catch (e) {
      console.error("Failed to save tree state", e);
    }
  }, [currentVersionId]);

  const handleToggleExpand = useCallback((id: string) => {
    const newIds = new Set(expandedIds);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }
    updateExpandedIds(newIds);
  }, [expandedIds, updateExpandedIds]);

  // Auto-expand current page path
  useEffect(() => {
    if (!isTreeStateLoaded || !currentPage || currentPage === '/index.html' || currentPage === '/') return;

    // Clean path
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

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Filter comments by current version and page
  const currentVersionComments = useMemo(() => {
    return comments.filter(
      comment => comment.versionId === currentVersionId &&
        (!comment.page || comment.page === currentPage) // Filter by page if specified
    );
  }, [comments, currentVersionId, currentPage]);

  // Refs for iframe listeners (moved from above to avoid TDZ errors)
  const currentPageRef = useRef(currentPage);
  const currentVersionCommentsRef = useRef(currentVersionComments);
  const historyIndexRef = useRef(historyIndex);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    currentVersionCommentsRef.current = currentVersionComments;
  }, [currentVersionComments]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    activeToolModeRef.current = activeToolMode;
  }, [activeToolMode]);

  useEffect(() => {
    commentBadgeRef.current = commentBadge;
  }, [commentBadge]);



  const currentVersion = useMemo(() => versions.find(v => v._id === currentVersionId), [versions, currentVersionId]);
  const isViewingOldVersion = useMemo(() => !currentVersion?.isLatest, [currentVersion]);

  // Track the view once the version object is confirmed to exist
  useViewTracker(documentId as Id<"artifacts">, versionId, !!currentVersion);

  // --- ZIP FILE SUPPORT START ---

  // Fetch files if this version is a ZIP
  const zipFiles = useQuery(api.artifacts.getFilesByVersion,
    currentVersion?.fileType === "zip" ? { versionId: currentVersionId as Id<"artifactVersions"> } : "skip"
  );

  // Convert flat files to tree structure
  const fileTreeData = useMemo(() => {
    if (!zipFiles || currentVersion?.fileType !== "zip") return [];

    const root: FileNode[] = [];

    // Sort files by path (folder first logic would be ideal, but simple alphabetical for now)
    const sortedFiles = [...zipFiles].sort((a, b) => a.path.localeCompare(b.path));

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
        // Find or create parent folders
        let currentLevel = root;
        let currentPath = "";

        parts.forEach((part) => {
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
  }, [zipFiles, currentVersion?.fileType]);

  const handleFileSelect = (node: FileNode) => {
    const file = zipFiles?.find(f => f._id === node.id);
    if (file) {
      // Navigate to the file
      // For DocumentViewer, navigation is handled by currentPage state and URL logic
      setCurrentPage(file.path);

      // Update browser history (optional but good for consistency)
      // router.push(getArtifactUrl(file.path)); 
      // Actually DocumentViewer uses internal state `currentPage` and `artifactUrl` computed derived from it.
    }
  };

  // --- ZIP FILE SUPPORT END ---

  // Calculate latest version number for navigation
  const latestVersionNumber = Math.max(...versions.map((v) => v.number));

  // Handle version change via URL navigation (ensures content + comments refresh)
  const handleVersionChange = (newVersionNumber: number) => {
    if (newVersionNumber === latestVersionNumber) {
      router.push(`/a/${shareToken}`);
    } else {
      router.push(`/a/${shareToken}/v/${newVersionNumber}`);
    }
  };

  // Build URL to artifact HTML via Next.js proxy (same-origin to avoid CORS issues)
  // Format: /api/artifact/{shareToken}/v{versionNumber}/{page}
  // This proxies to Convex HTTP endpoint, allowing iframe.contentDocument access
  const getArtifactUrl = (page: string = 'index.html') => {
    // Remove leading slash from page if present
    const cleanPage = page.startsWith('/') ? page.substring(1) : page;
    return `/api/artifact/${shareToken}/v${versionNumber}/${cleanPage}`;
  };

  const artifactUrl = getArtifactUrl(currentPage);

  // Handle internal markdown links
  const handleLinkClick = (href: string) => {
    // Handle anchor tags
    if (href.startsWith('#')) {
      const id = href.substring(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', href);
      }
      return;
    }

    // Check for external links
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }

    // Only handle relative links
    if (!zipFiles || !currentVersion || currentVersion.fileType !== 'zip') return;

    try {
      // Basic path resolution
      // Get directory of current page
      const currentDir = currentPage.includes('/') ? currentPage.substring(0, currentPage.lastIndexOf('/')) : '';

      let targetPath = '';

      if (href.startsWith('/')) {
        targetPath = href.substring(1); // Absolute path within zip
      } else {
        // Resolve relative path
        const parts = (currentDir ? currentDir.split('/') : []);
        const segments = href.split('/');

        for (const segment of segments) {
          if (segment === '.') continue;
          if (segment === '..') {
            parts.pop();
          } else {
            parts.push(segment);
          }
        }
        targetPath = parts.join('/');
      }

      // Check if file exists in our zip file list
      // Try exact match, or case-insensitive match
      // Also try appending .md or .html if missing extension
      const possiblePaths = [
        targetPath,
        targetPath + '.md',
        targetPath + '.markdown',
        targetPath + '.html',
        targetPath + '/index.html',
        targetPath + '/README.md'
      ];

      const fileExists = zipFiles.find(f =>
        possiblePaths.some(p => p.toLowerCase() === f.path.toLowerCase() || p.toLowerCase() === `/${f.path.toLowerCase()}`)
      );

      if (fileExists) {
        // Use clean path (no leading slash for setCurrentPage logic, but let's be consistent)
        // fileExists.path doesn't have leading slash usually
        setCurrentPage('/' + fileExists.path);
      } else {
        console.warn(`File not found in ZIP: ${targetPath}`);
        // Optionally show a toast or alert
      }
    } catch (e) {
      console.error("Error resolving link:", e);
    }
  };

  // Store location context for each comment
  const [commentLocations, setCommentLocations] = useState<Record<string, Comment['location']>>({});

  // Helper: Detect element location (tab/accordion/visible)
  const detectElementLocation = (elementId: string, doc: Document): Comment['location'] | undefined => {
    const element = doc.getElementById(elementId);
    if (!element) return undefined;

    // Check if element is in a tab
    let parent = element.parentElement;
    while (parent) {
      if (parent.classList.contains('tab-content')) {
        const tabId = parent.id;
        const isActive = parent.classList.contains('active');
        const tabButton = doc.querySelector(`[onclick*="${tabId}"]`) as HTMLElement;
        const label = tabButton?.textContent?.trim() || tabId;
        return {
          type: 'tab',
          label: label,
          isHidden: !isActive,
        };
      }

      // Check if element is in an accordion
      if (parent.classList.contains('accordion-content')) {
        const isActive = parent.classList.contains('active');
        const accordionHeader = parent.previousElementSibling as HTMLElement;
        const label = accordionHeader?.querySelector('span')?.textContent?.trim() || 'Accordion section';
        return {
          type: 'accordion',
          label: label,
          isHidden: !isActive,
        };
      }

      parent = parent.parentElement;
    }

    return {
      type: 'visible',
      label: '',
      isHidden: false,
    };
  };

  // Helper: Navigate to and reveal hidden element
  const navigateToElement = (elementId: string, location?: Comment['location']) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const element = doc.getElementById(elementId);
    if (!element) return;

    if (location?.type === 'tab' && location.isHidden) {
      // Find and click the tab button
      let parent = element.parentElement;
      while (parent && !parent.classList.contains('tab-content')) {
        parent = parent.parentElement;
      }
      if (parent) {
        const tabId = parent.id;
        const tabButton = doc.querySelector(`[onclick*="${tabId}"]`) as HTMLButtonElement;
        if (tabButton) {
          tabButton.click();
        }
      }
    }

    if (location?.type === 'accordion' && location.isHidden) {
      // Find and click the accordion header
      let parent = element.parentElement;
      while (parent && !parent.classList.contains('accordion-content')) {
        parent = parent.parentElement;
      }
      if (parent) {
        const accordionHeader = parent.previousElementSibling as HTMLButtonElement;
        if (accordionHeader) {
          accordionHeader.click();
        }
      }
    }

    // Wait for animation, then scroll and highlight
    setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-element');
      setTimeout(() => {
        element.classList.remove('highlight-element');
      }, 3000);
    }, 350);
  };

  const handleTextSelection = useCallback((e: MouseEvent) => {
    // Block commenting on old versions
    if (isViewingOldVersion) {
      return;
    }

    // Only show comment tooltip if comment tool is active (via button or badge)
    // Use refs to get current values (fixes closure issue)
    if (activeToolModeRef.current !== 'comment' && commentBadgeRef.current === null) {
      return;
    }

    const selection = iframeRef.current?.contentWindow?.getSelection();
    const selectedTextValue = selection?.toString().trim() || '';

    if (selection && selectedTextValue.length > 0) {
      setSelectedText(selection.toString());
      setSelectedElement(null);
      setShowCommentTooltip(true);

      // Position tooltip relative to iframe position
      const iframeRect = iframeRef.current?.getBoundingClientRect();
      if (iframeRect) {
        setTooltipPosition({
          x: iframeRect.left + e.clientX,
          y: iframeRect.top + e.clientY
        });
      } else {
        setTooltipPosition({ x: e.clientX, y: e.clientY });
      }
    } else {
      setShowCommentTooltip(false);
    }
  }, [isViewingOldVersion]);

  const handleElementClick = useCallback((e: Event) => {
    // Block commenting on old versions
    if (isViewingOldVersion) {
      return;
    }

    // Only allow commenting when comment tool is active
    // Use refs to get current values (fixes closure issue)
    if (activeToolModeRef.current !== 'comment' && commentBadgeRef.current === null) {
      return;
    }

    // When comment mode is active, prevent normal element behavior
    e.preventDefault();
    e.stopPropagation();

    const target = (e.target as HTMLElement).closest('[id]') as HTMLElement;
    if (!target) return;
    const elementId = target.id;

    let elementType: 'image' | 'heading' | 'button' | 'section' = 'section';
    let elementPreview: string | undefined;
    let elementText: string | undefined;

    // Determine element type
    if (target.tagName === 'IMG') {
      elementType = 'image';
      elementPreview = (target as HTMLImageElement).src;
    } else if (target.tagName.match(/^H[1-6]$/)) {
      elementType = 'heading';
      elementText = target.textContent || undefined;
    } else if (target.tagName === 'A' || target.tagName === 'BUTTON') {
      elementType = 'button';
      elementText = target.textContent || undefined;
    }

    setSelectedElement({
      type: elementType,
      id: elementId,
      preview: elementPreview,
      text: elementText,
    });

    setSelectedText('');
    setShowCommentTooltip(true);

    // Get position relative to the viewport
    const rect = target.getBoundingClientRect();
    const iframeRect = iframeRef.current?.getBoundingClientRect();

    if (iframeRect) {
      setTooltipPosition({
        x: iframeRect.left + rect.right + 10,
        y: iframeRect.top + rect.top,
      });
    }
  }, [isViewingOldVersion]);

  // Global click handler to block ALL clicks when comment mode is active
  const handleGlobalClick = useCallback((e: Event) => {
    // Only intercept when comment mode is active
    if (activeToolModeRef.current !== 'comment' && commentBadgeRef.current === null) {
      return; // Let clicks work normally
    }

    const target = e.target as HTMLElement;

    // Allow clicks on comment tooltip (don't block our own UI)
    if (target.closest('.comment-tooltip')) {
      return;
    }

    // Block ALL clicks when comment mode is active
    e.preventDefault();
    e.stopPropagation();

    // If element or its parent has an ID, trigger comment creation
    if (target.closest('[id]')) {
      handleElementClick(e);
    }
  }, [handleElementClick]);

  // Stable refs for handlers to avoid iframe listener churn
  const handleGlobalClickRef = useRef(handleGlobalClick);
  const handleTextSelectionRef = useRef(handleTextSelection);
  const handleElementClickRef = useRef(handleElementClick);

  useEffect(() => { handleGlobalClickRef.current = handleGlobalClick; }, [handleGlobalClick]);
  useEffect(() => { handleTextSelectionRef.current = handleTextSelection; }, [handleTextSelection]);
  useEffect(() => { handleElementClickRef.current = handleElementClick; }, [handleElementClick]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const setupIframeListeners = () => {
      const doc = iframe.contentDocument;
      if (!doc || (doc as any).__listenersAttached) return;
      (doc as any).__listenersAttached = true;

      logger.debug(LOG_TOPICS.Artifact, 'DocumentViewer', 'Attaching iframe listeners', { url: artifactUrl });

      // Add global click and contextmenu handlers with capture phase
      doc.addEventListener('click', (e) => handleGlobalClickRef.current(e), true);
      doc.addEventListener('contextmenu', (e) => handleGlobalClickRef.current(e), true);

      // Add selection listener for text
      doc.addEventListener('mouseup', (e) => handleTextSelectionRef.current(e));

      // Add hover effect styling for interactive elements with IDs
      const interactiveWithIds = doc.querySelectorAll('img[id], a.cta-button[id], button[id], h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
      interactiveWithIds.forEach((el) => {
        (el as HTMLElement).style.cursor = 'pointer';
      });

      // Add navigation handling for links
      const links = doc.querySelectorAll('a[href]');
      links.forEach((link) => {
        link.addEventListener('click', (e) => {
          const href = link.getAttribute('href');
          if (href && (href.endsWith('.html') || href.startsWith('/'))) {
            e.preventDefault();
            // Navigate to the new page
            const newPage = href.startsWith('/') ? href : '/' + href;
            setCurrentPage(newPage);

            // Update navigation history
            setNavigationHistory(prev => {
              const newHistory = prev.slice(0, historyIndexRef.current + 1);
              newHistory.push(newPage);
              return newHistory;
            });
            setHistoryIndex(prev => prev + 1);
          }
        });
      });

      // Detect location context for all comments with elementIds
      const locations: Record<string, Comment['location']> = {};
      currentVersionCommentsRef.current.forEach(comment => {
        if (comment.elementId) {
          const location = detectElementLocation(comment.elementId, doc);
          if (location) {
            locations[comment.id] = location;
          }
        }
      });
      setCommentLocations(locations);

      // Add presence indicators styles
      const presenceStyle = doc.createElement('style');
      presenceStyle.textContent = `
          .presence-indicator {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            animation: presencePulse 2s ease-in-out infinite;
          }
          
          @keyframes presencePulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
          }
          
          .presence-label {
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 9999;
            margin-top: -20px;
            margin-left: 10px;
          }
        `;
      doc.head.appendChild(presenceStyle);
    };

    // Wait for iframe to load before setting up listeners
    iframe.addEventListener('load', setupIframeListeners);

    // If already loaded, setup immediately
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      setupIframeListeners();
    }

    return () => {
      iframe.removeEventListener('load', setupIframeListeners);
      if (iframe.contentDocument) {
        // Cleanup is less critical here as the document itself is replaced on navigation,
        // but we'll remove the specific capture phase listeners we added if possible
        const doc = iframe.contentDocument;
        doc.removeEventListener('click', (e) => handleGlobalClickRef.current(e), true);
        doc.removeEventListener('contextmenu', (e) => handleGlobalClickRef.current(e), true);
      }
    };
  }, [artifactUrl]);

  // Reset history when version changes
  useEffect(() => {
    // currentPage is handled by URL
    setNavigationHistory(['/index.html']);
    setHistoryIndex(0);
  }, [currentVersionId]);


  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;

    try {
      logger.debug(LOG_TOPICS.Artifact, 'DocumentViewer', 'Creating comment', {
        selectedElement,
        selectedText,
        page: currentPage
      });

      // Build target metadata object for backend
      let target: any;

      if (selectedElement) {
        // Comment on an element (image, button, heading, etc.)
        target = {
          _version: 1,
          type: 'element',
          elementId: selectedElement.id,
          selectedText: selectedElement.text,
          page: currentPage,
        };
      } else if (selectedText) {
        // Comment on selected text
        target = {
          _version: 1,
          type: 'text',
          selectedText: selectedText,
          page: currentPage,
        };
      } else {
        return;
      }

      // Save to backend (Convex will broadcast update via useComments hook)
      logger.debug(LOG_TOPICS.Artifact, 'DocumentViewer', 'Final target metadata', { target });
      await createComment(versionId, newCommentText, target);

      // Clear form
      setNewCommentText('');
      setSelectedText('');
      setSelectedElement(null);
      setShowCommentTooltip(false);

      // Handle one-shot vs infinite mode
      if (commentBadge === 'one-shot') {
        // One-shot mode: deactivate tool after creating comment
        setActiveToolMode(null);
        setCommentBadge(null);
      } else if (commentBadge === 'infinite') {
        // Infinite mode: keep tool active
        // Tool stays active for next comment
      }
      // If activeToolMode is set without badge, keep it active (manual toggle mode)
    } catch (error) {
      console.error('Failed to create comment:', error);
      // TODO: Show error toast to user
    }
  };

  const handleAddReply = async (commentId: string, replyText: string) => {
    if (!replyText.trim()) return;

    try {
      // Save reply to backend
      await createReply(commentId as Id<"comments">, replyText);

      // Note: Replies will now appear automatically via useCommentReplies hook in CommentCard
    } catch (error) {
      console.error('Failed to create reply:', error);
      // TODO: Show error toast to user
    }
  };

  const toggleResolve = async (commentId: string) => {
    try {
      // Toggle resolved status in backend
      await toggleResolved(commentId as Id<"comments">);

      // Optimistic update - update local state immediately for better UX
      setComments(
        comments.map((comment) =>
          comment.id === commentId ? { ...comment, resolved: !comment.resolved } : comment
        )
      );
    } catch (error) {
      console.error('Failed to toggle resolve:', error);
      // TODO: Show error toast to user
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      // Soft delete in backend
      await softDelete(commentId as Id<"comments">);

      // Optimistic update - remove from local state immediately
      setComments(comments.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      // TODO: Show error toast to user
    }
  };

  const handleEditComment = (commentId: string, currentContent: string) => {
    setEditingComment(commentId);
    setEditText(currentContent);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      // Update content in backend
      await updateContent(commentId as Id<"comments">, editText);

      // Optimistic update - update local state immediately
      setComments(
        comments.map((comment) =>
          comment.id === commentId ? { ...comment, content: editText } : comment
        )
      );

      // Clear edit state
      setEditingComment(null);
      setEditText('');
    } catch (error) {
      console.error('Failed to update comment:', error);
      // TODO: Show error toast to user
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditText('');
  };

  const highlightElement = (elementId: string | undefined) => {
    if (!elementId || !iframeRef.current?.contentDocument) return;

    const doc = iframeRef.current.contentDocument;
    const element = doc.getElementById(elementId);

    if (element) {
      element.classList.add('highlight-element');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const removeHighlight = (elementId: string | undefined) => {
    if (!elementId || !iframeRef.current?.contentDocument) return;

    const doc = iframeRef.current.contentDocument;
    const element = doc.getElementById(elementId);

    if (element) {
      element.classList.remove('highlight-element');
    }
  };

  useEffect(() => {
    if (hoveredComment) {
      const comment = comments.find((c) => c.id === hoveredComment);
      if (comment?.elementId) {
        // Only highlight if element is currently visible
        const location = commentLocations[comment.id];
        if (!location?.isHidden) {
          highlightElement(comment.elementId);
        }
        // If hidden, clicking the comment card will navigate to it
      }
    } else {
      // Remove all highlights
      comments.forEach((comment) => {
        if (comment.elementId) {
          removeHighlight(comment.elementId);
        }
      });
    }
  }, [hoveredComment, commentLocations, comments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'in-review':
        return 'bg-blue-100 text-blue-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Track last click to prevent double-firing
  const lastClickRef = useRef<number>(0);

  // Tool handlers
  const handleToolChange = (tool: ToolMode) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickRef.current;

    // Prevent double-clicks within 300ms
    if (timeSinceLastClick < 300) {
      return;
    }

    lastClickRef.current = now;
    setActiveToolMode(tool);
  };

  const handleBadgeClick = () => {
    if (commentBadge === null) {
      setCommentBadge('one-shot');
      setActiveToolMode('comment');
    } else if (commentBadge === 'one-shot') {
      setCommentBadge('infinite');
    } else {
      setCommentBadge(null);
      setActiveToolMode(null);
    }
  };

  const filteredComments = useMemo(() => {
    return currentVersionComments.filter(comment => {
      if (filter === 'all') return true;
      if (filter === 'resolved') return comment.resolved;
      if (filter === 'unresolved') return !comment.resolved;
      return true;
    });
  }, [currentVersionComments, filter]);

  // Artifact status (defaulting to in-review as it is currently not stored in the schema)
  const status = 'in-review' as string;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden relative">
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.05);
            }
          }
        
        @keyframes presenceBlink {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
          }
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeOut {
          to {
            opacity: 0;
            transform: translateX(20px);
          }
        }
      `}</style>

        {/* Activity Notification */}
        {recentActivity && (
          <div
            className="fixed top-20 right-6 z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[200px]"
            style={{
              animation: 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s forwards',
            }}
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-900 font-medium">{recentActivity.message}</span>
          </div>
        )}

        <div className="h-screen flex flex-col bg-white">
          {/* Top Bar */}
          <header className="border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <div className="h-6 w-px bg-gray-300" />

                {/* Version Selector */}
                {versions.length > 0 && (
                  <>
                    <div className="flex items-center gap-3">
                      <h1 className="font-semibold text-gray-900">{artifactTitle}</h1>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <History className="w-4 h-4" />
                            {currentVersion?.name && currentVersion.name !== `v${currentVersion.number}`
                              ? `v${currentVersion?.number || 1} - ${currentVersion.name}`
                              : `v${currentVersion?.number || 1}`}
                            {currentVersion?.isLatest && (
                              <Badge className="bg-green-100 text-green-800 text-xs ml-1">
                                Latest
                              </Badge>
                            )}
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-80">
                          <div className="px-2 py-1.5 text-sm font-semibold text-gray-900">Version History</div>
                          <DropdownMenuSeparator />
                          {[...versions].sort((a, b) => b.number - a.number).map((version) => (
                            <DropdownMenuItem
                              key={version._id}
                              onClick={() => handleVersionChange(version.number)}
                              className={`${currentVersionId === version._id ? 'bg-purple-50' : ''}`}
                            >
                              <div className="flex items-start justify-between w-full gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {version.name && version.name !== `v${version.number}`
                                        ? `v${version.number} - ${version.name}`
                                        : `v${version.number}`}
                                    </span>
                                    {version.isLatest && (
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        Latest
                                      </Badge>
                                    )}
                                    {currentVersionId === version._id && (
                                      <Check className="w-4 h-4 text-purple-600" />
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {new Date(version.createdAt).toLocaleDateString()}
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
                                showPermissionModal('upload');
                                return;
                              }
                              onNavigateToVersions?.();
                            }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload New Version
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}

                {versions.length === 0 && <h1 className="font-semibold text-gray-900">{artifactTitle}</h1>}

                <Badge className={getStatusColor(status)}>
                  {status === 'in-review' ? 'In Review' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>

                {/* Live Presence Face Pile */}
                <PresenceAvatars activeUsers={activeUsers} currentVersionId={versionId} />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {onNavigateToShare && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!isOwner) {
                          showPermissionModal('share');
                          return;
                        }
                        onNavigateToShare();
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  )}
                  {onNavigateToSettings && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!isOwner) {
                          showPermissionModal('manage');
                          return;
                        }
                        onNavigateToSettings();
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Comment Toolbar */}
          <CommentToolbar
            activeToolMode={activeToolMode}
            commentBadge={commentBadge}
            onToolChange={handleToolChange}
            onBadgeClick={handleBadgeClick}
            filter={filter}
            onFilterChange={setFilter}
            activeCount={filteredComments.filter(c => !c.resolved).length}
            isViewingOldVersion={isViewingOldVersion}
            currentVersionNumber={currentVersion?.number}
            latestVersionNumber={versions.find(v => v.isLatest)?.number}
            onSwitchToLatest={() => handleVersionChange(latestVersionNumber)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* ZIP File Tree Sidebar (Left Side) */}
            {currentVersion?.fileType === "zip" && fileTreeData.length > 0 && (
              <div
                className={`border-r border-gray-200 bg-gray-50 flex flex-col relative transition-all duration-300 ease-in-out`}
                style={{
                  width: isFileTreeOpen ? sidebarWidth : 48,
                  // Disable transition during resize to avoid lag/jank
                  transition: isResizing ? 'none' : 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div className={`p-3 border-b border-gray-200 flex items-center ${isFileTreeOpen ? 'justify-between' : 'justify-center'} h-12`}>
                  {isFileTreeOpen ? (
                    <>
                      <div className="flex items-center gap-2 font-medium text-xs text-gray-500 uppercase tracking-wider">
                        <FolderTree className="w-4 h-4" />
                        Files
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 text-gray-500 hover:text-gray-900" onClick={() => setIsFileTreeOpen(false)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900" onClick={() => setIsFileTreeOpen(true)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {isFileTreeOpen ? (
                  <div className="flex-1 overflow-y-auto p-2">
                    <FileTree
                      data={fileTreeData}
                      onSelectFile={handleFileSelect}
                      selectedFileId={zipFiles?.find(f => f.path === currentPage || f.path === currentPage.replace(/^\//, ''))?._id}
                      expandedIds={expandedIds}
                      onToggleExpand={handleToggleExpand}
                    />
                  </div>
                ) : (
                  <div className="py-4 flex flex-col items-center gap-4">
                    <Tooltip>
                      <TooltipTrigger>
                        <FolderTree className="w-5 h-5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Files</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {/* Resize Handle */}
                {isFileTreeOpen && (
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 z-10"
                    onMouseDown={startResizing}
                  />
                )}
              </div>
            )}

            {/* Document Display */}
            <div className="flex-1 overflow-auto bg-gray-50 p-8">
              <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
                {/* Conditional rendering based on file type */}
                {currentVersion?.fileType === 'markdown' ||
                  (currentVersion?.fileType === 'zip' && (currentPage.toLowerCase().endsWith('.md') || currentPage.toLowerCase().endsWith('.markdown'))) ? (
                  <MarkdownViewer
                    src={artifactUrl}
                    className="min-h-[1000px]"
                    onLinkClick={handleLinkClick}
                  />
                ) : (
                  <iframe
                    ref={iframeRef}
                    src={artifactUrl}
                    className="w-full h-[1000px] border-0"
                    title="HTML Document Preview"
                  />
                )}
              </div>
            </div>

            {/* Comments Sidebar */}
            {sidebarOpen && (
              <div
                className="border-l border-gray-200 bg-white flex flex-col relative"
                style={{
                  width: commentsSidebarWidth,
                  transition: isResizingComments ? 'none' : 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {/* Resize Handle */}
                <div
                  className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-400 z-10"
                  onMouseDown={startResizingComments}
                />

                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-700" />
                    <h2 className="font-semibold text-gray-900">
                      Comments ({filteredComments.length})
                    </h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {/* Comments List */}
                  {filteredComments.map((comment) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUserId}
                      artifactOwnerId={artifactOwnerId}
                      hoveredComment={hoveredComment}
                      commentLocation={commentLocations[comment.id]}
                      onMouseEnter={() => setHoveredComment(comment.id)}
                      onMouseLeave={() => setHoveredComment(null)}
                      onClick={() => {
                        if (comment.elementId) {
                          const location = commentLocations[comment.id];
                          navigateToElement(comment.elementId, location);
                        }
                      }}
                      onReply={handleAddReply}
                      onEdit={handleEditComment}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={handleCancelEdit}
                      onToggleResolve={toggleResolve}
                      onDelete={handleDeleteComment}
                      editingCommentId={editingComment}
                      editText={editText}
                      setEditText={setEditText}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Collapsed Sidebar Toggle */}
            {!sidebarOpen && (
              <Button
                variant="outline"
                size="sm"
                className="absolute right-4 top-20"
                onClick={() => setSidebarOpen(true)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Comments ({filteredComments.length})
              </Button>
            )}
          </div>

          {/* Comment Tooltip */}
          {showCommentTooltip && (
            <div
              className="fixed bg-white shadow-lg rounded-lg p-4 z-50 w-80 border border-gray-200"
              style={{
                left: Math.min(tooltipPosition.x, window.innerWidth - 340),
                top: tooltipPosition.y + 10,
              }}
            >
              <div className="mb-3">
                {selectedElement?.type === 'image' && selectedElement.preview ? (
                  <>
                    <div className="text-gray-600 mb-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {selectedElement.type}
                      </Badge>
                      <span className="text-xs">Click to comment on this image</span>
                    </div>
                    <Image
                      src={selectedElement.preview}
                      alt="Selected element"
                      width={320}
                      height={160}
                      className="w-full h-40 object-cover rounded border-2 border-purple-200 mb-2"
                      unoptimized
                    />
                  </>
                ) : selectedElement?.text ? (
                  <>
                    <div className="text-gray-600 mb-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {selectedElement.type}
                      </Badge>
                      <span className="text-xs">Commenting on this element</span>
                    </div>
                    <div className="text-purple-600 bg-purple-50 px-2 py-1 rounded mb-2 font-mono">
                      {`"${selectedElement.text.substring(0, 50)}${selectedElement.text.length > 50 ? '...' : ''}"`}
                    </div>
                  </>
                ) : selectedText ? (
                  <div className="text-purple-600 bg-purple-50 px-2 py-1 rounded mb-2 font-mono">
                    {`"${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"`}
                  </div>
                ) : null}
              </div>
              <Textarea
                placeholder="Add a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddComment}>
                  <Send className="w-3 h-3 mr-1" />
                  Comment
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCommentTooltip(false);
                    setNewCommentText('');
                    setSelectedText('');
                    setSelectedElement(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </TooltipProvider>
  );
}