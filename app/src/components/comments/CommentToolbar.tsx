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
}

export function CommentToolbar({
  activeToolMode,
  commentBadge,
  onToolChange,
  onBadgeClick,
  filter,
  onFilterChange,
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
              onClick={() => onToolChange(activeToolMode === 'comment' ? null : 'comment')}
              className={activeToolMode === 'comment' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Comment
            </Button>
            {commentBadge && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBadgeClick();
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-md transition-all hover:scale-110"
              >
                {commentBadge === 'one-shot' ? '①' : '∞'}
              </button>
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
      </div>

      {/* Tool Description Hint */}
      {activeToolMode === 'comment' && (
        <div className="mt-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
          <strong>Comment Mode:</strong> Click any element or select text to add a comment
        </div>
      )}
    </div>
  );
}
