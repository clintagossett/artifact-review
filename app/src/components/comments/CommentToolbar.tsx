"use client";

import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type FilterMode = 'all' | 'unresolved' | 'resolved';

interface CommentToolbarProps {
  filter: FilterMode;
  onFilterChange: (filter: FilterMode) => void;
  totalCount: number; // Total count of comments
  // Sidebar toggle
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  // Version info for banners
  isViewingOldVersion?: boolean;
  currentVersionNumber?: number;
  latestVersionNumber?: number;
  onSwitchToLatest?: () => void;
  // Hide tip for view-only users
  canComment?: boolean;
  /** When true, hides the entire toolbar for anonymous public viewers */
  isPublicViewer?: boolean;
}

export function CommentToolbar({
  filter,
  onFilterChange,
  totalCount,
  isSidebarOpen,
  onToggleSidebar,
  isViewingOldVersion = false,
  currentVersionNumber,
  latestVersionNumber,
  onSwitchToLatest,
  canComment = true,
  isPublicViewer = false,
}: CommentToolbarProps) {
  // Hide entire toolbar for anonymous public viewers
  if (isPublicViewer) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <Select value={filter} onValueChange={(value: FilterMode) => onFilterChange(value)}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comments Sidebar Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="text-gray-600 hover:text-gray-900"
        >
          {isSidebarOpen ? <ChevronRight className="w-4 h-4 mr-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
          Annotations ({totalCount})
        </Button>
      </div>

      {/* Version Banners */}
      {isViewingOldVersion ? (
        <div className="mt-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-amber-200 text-amber-900">
              📜 Historical Version
            </Badge>
            <p className="text-amber-900 text-sm">
              You&apos;re viewing <strong>v{currentVersionNumber}</strong> (read-only).
              Comments are locked on old versions.
            </p>
          </div>
          {onSwitchToLatest && (
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={onSwitchToLatest}
            >
              Switch to Latest (v{latestVersionNumber})
            </Button>
          )}
        </div>
      ) : canComment ? (
        <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            💡 Tip
          </Badge>
          <p className="text-purple-900 text-sm">
            <strong>Select text</strong> to comment, or <strong>right-click images, buttons, or headings</strong> to add comments to them
          </p>
        </div>
      ) : null}
    </div>
  );
}
