"use client";

import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
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
  fileSize: number;
  createdAt: number;
  isLatest: boolean;
}
import { useComments } from '@/hooks/useComments';
import { useCommentActions } from '@/hooks/useCommentActions';
import { useReplyActions } from '@/hooks/useReplyActions';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useRouter } from 'next/navigation';

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
  convexUrl
}: DocumentViewerProps) {
  const router = useRouter();

  // Get current user for permission checks
  const currentUser = useQuery(api.users.getCurrentUser);
  const currentUserId = currentUser?._id;

  // Fetch comments from backend
  const backendComments = useComments(versionId);
  const { createComment, updateContent, toggleResolved, softDelete } = useCommentActions();
  const { createReply } = useReplyActions();

  // Check if user can delete a comment (author or owner)
  const canDeleteComment = (authorId: string) => {
    if (!currentUserId) return false;
    return currentUserId === authorId || currentUserId === artifactOwnerId;
  };

  // Check if user can edit a comment (only author)
  const canEditComment = (authorId: string) => {
    if (!currentUserId) return false;
    return currentUserId === authorId;
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);

  // Load backend comments when they arrive
  useEffect(() => {
    if (backendComments) {
      // Transform backend comments to frontend Comment type
      const transformedComments: Comment[] = backendComments.map((bc) => ({
        id: bc._id,
        versionId: bc.versionId,
        authorId: bc.authorId, // Keep authorId for permission checks
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

  // Keep refs in sync with state
  useEffect(() => {
    activeToolModeRef.current = activeToolMode;
  }, [activeToolMode]);

  useEffect(() => {
    commentBadgeRef.current = commentBadge;
  }, [commentBadge]);
  
  // Version management state
  // Use the real versionId prop instead of mock version IDs
  const [currentVersionId, setCurrentVersionId] = useState<string>(versionId);

  // Sync currentVersionId when versionId prop changes (e.g., user navigates to different version via URL)
  useEffect(() => {
    setCurrentVersionId(versionId);
  }, [versionId]);

  // Presence states
  const [recentActivity, setRecentActivity] = useState<{
    message: string;
    timestamp: number;
  } | null>(null);
  
  // Multi-page navigation state
  const [currentPage, setCurrentPage] = useState('/index.html');
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['/index.html']);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Filter comments by current version and page
  const currentVersionComments = comments.filter(
    comment => comment.versionId === currentVersionId &&
      (!comment.page || comment.page === currentPage) // Filter by page if specified
  );
  
  const currentVersion = versions.find(v => v._id === currentVersionId);
  const isViewingOldVersion = !currentVersion?.isLatest;

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

  // Global click handler to block ALL clicks when comment mode is active
  const handleGlobalClick = (e: Event) => {
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

    // If element has an ID, trigger comment creation
    if (target.id) {
      handleElementClick(e);
    }
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const setupIframeListeners = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Add global click handler with capture phase (runs before element handlers)
      doc.addEventListener('click', handleGlobalClick, true);

      // Add selection listener for text
      doc.addEventListener('mouseup', handleTextSelection);

        // Add click listeners for images and other elements (for comment creation)
        const images = doc.querySelectorAll('img[id]');
        images.forEach((img) => {
          img.addEventListener('click', handleElementClick);
          img.addEventListener('contextmenu', handleElementClick);
          // Add hover effect styling
          (img as HTMLElement).style.cursor = 'pointer';
        });

        // Add click listeners for buttons
        const buttons = doc.querySelectorAll('a.cta-button[id], button[id]');
        buttons.forEach((btn) => {
          btn.addEventListener('click', handleElementClick);
          btn.addEventListener('contextmenu', handleElementClick);
          (btn as HTMLElement).style.cursor = 'pointer';
        });

        // Add click listeners for headings
        const headings = doc.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
        headings.forEach((heading) => {
          heading.addEventListener('click', handleElementClick);
          heading.addEventListener('contextmenu', handleElementClick);
          (heading as HTMLElement).style.cursor = 'pointer';
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
              const newHistory = navigationHistory.slice(0, historyIndex + 1);
              newHistory.push(newPage);
              setNavigationHistory(newHistory);
              setHistoryIndex(newHistory.length - 1);
            }
          });
        });
        
        // Detect location context for all comments with elementIds
        const locations: Record<string, Comment['location']> = {};
        currentVersionComments.forEach(comment => {
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
        iframe.contentDocument.removeEventListener('click', handleGlobalClick, true);
        iframe.contentDocument.removeEventListener('mouseup', handleTextSelection);
      }
    };
  }, [currentVersionId, artifactUrl, currentPage]);

  // Reset to index page when version changes
  useEffect(() => {
    setCurrentPage('/index.html');
    setNavigationHistory(['/index.html']);
    setHistoryIndex(0);
  }, [currentVersionId]);

  const handleTextSelection = (e: MouseEvent) => {
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
  };

  const handleElementClick = (e: Event) => {
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

    const target = e.target as HTMLElement;
    const elementId = target.id;

    if (!elementId) return;

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
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;

    try {
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
  }, [hoveredComment, commentLocations]);

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

  const filteredComments = currentVersionComments.filter(comment => {
    if (filter === 'all') return true;
    if (filter === 'resolved') return comment.resolved;
    if (filter === 'unresolved') return !comment.resolved;
    return true;
  });

  return (
    <>
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
            opacity: 0.7;
            transform: scale(0.9);
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
                        onClick={onNavigateToVersions}
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
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {onNavigateToShare && (
                <Button variant="outline" size="sm" onClick={onNavigateToShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              )}
              {onNavigateToSettings && (
                <Button variant="outline" size="sm" onClick={onNavigateToSettings}>
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
        {/* Document Display */}
        <div className="flex-1 overflow-auto bg-gray-50 p-8">
          <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
            <iframe
              ref={iframeRef}
              src={artifactUrl}
              className="w-full h-[1000px] border-0"
              title="HTML Document Preview"
            />
          </div>
        </div>

        {/* Comments Sidebar */}
        {sidebarOpen && (
          <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
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
                <img
                  src={selectedElement.preview}
                  alt="Selected element"
                  className="w-full h-40 object-cover rounded border-2 border-purple-200 mb-2"
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
                  "{selectedElement.text.substring(0, 50)}{selectedElement.text.length > 50 ? '...' : ''}"
                </div>
              </>
            ) : selectedText ? (
              <div className="text-purple-600 bg-purple-50 px-2 py-1 rounded mb-2 font-mono">
                "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"
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
    </>
  );
}