"use client";

import { MessageSquare, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ToolMode, ToolBadge } from './types';

interface CommentToolbarProps {
  activeToolMode: ToolMode;
  commentBadge: ToolBadge;
  onToolChange: (tool: ToolMode) => void;
  onBadgeClick: () => void;
  filter: 'all' | 'unresolved' | 'resolved';
  onFilterChange: (filter: 'all' | 'unresolved' | 'resolved') => void;
  activeCount: number; // Count of active (unresolved) items
  // Version info for banners
  isViewingOldVersion?: boolean;
  currentVersionNumber?: number;
  latestVersionNumber?: number;
  onSwitchToLatest?: () => void;
}

export function CommentToolbar({
  activeToolMode,
  commentBadge,
  onToolChange,
  onBadgeClick,
  filter,
  onFilterChange,
  activeCount,
  isViewingOldVersion = false,
  currentVersionNumber,
  latestVersionNumber,
  onSwitchToLatest,
}: CommentToolbarProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Comment Tool */}
          <div className="relative">
            <Button
              variant={activeToolMode === 'comment' ? 'default' : 'outline'}
              size="sm"
              onClick={onBadgeClick}
              className={activeToolMode === 'comment' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Comment
            </Button>
            {/* Badge - only visible when in one-shot or infinite mode */}
            {commentBadge && (
              <div
                className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-md pointer-events-none"
                title={commentBadge === 'one-shot' ? 'One-shot mode' : 'Infinite mode'}
              >
                {commentBadge === 'one-shot' ? '①' : '∞'}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-gray-300 mx-2" />

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <Select value={filter} onValueChange={(value: any) => onFilterChange(value)}>
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

        {/* Active Items Count */}
        <div className="text-sm text-gray-600">
          <span className="font-medium">{activeCount}</span> active item{activeCount !== 1 ? 's' : ''}
        </div>
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
      ) : (
        <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            💡 Tip
          </Badge>
          <p className="text-purple-900 text-sm">
            <strong>Select text</strong> to comment, or <strong>right-click images, buttons, or headings</strong> to add comments to them
          </p>
        </div>
      )}
    </div>
  );
}
