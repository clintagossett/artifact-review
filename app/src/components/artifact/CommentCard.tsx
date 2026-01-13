"use client";

import { useState } from 'react';
import {
  Check,
  X,
  Send,
  Edit3,
  Trash2,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import type { Comment } from '@/components/comments/types';
import { Id } from '@/convex/_generated/dataModel';
import { useCommentReplies } from '@/hooks/useCommentReplies';
import { useReplyActions } from '@/hooks/useReplyActions';
import Image from 'next/image';

interface CommentCardProps {
  comment: Comment;
  currentUserId?: Id<"users">;
  artifactOwnerId: Id<"users">;
  hoveredComment: string | null;
  commentLocation?: {
    type: 'tab' | 'accordion' | 'visible';
    label: string;
    isHidden: boolean;
  };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onReply: (commentId: string, replyText: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => void;
  onSaveEdit: (commentId: string, newContent: string) => Promise<void>;
  onCancelEdit: () => void;
  onToggleResolve: (commentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  editingCommentId: string | null;
  editText: string;
  setEditText: (text: string) => void;
}

export function CommentCard({
  comment,
  currentUserId,
  artifactOwnerId,
  hoveredComment,
  commentLocation,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onReply,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleResolve,
  onDelete,
  editingCommentId,
  editText,
  setEditText,
}: CommentCardProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');

  // Fetch replies for this comment
  const backendReplies = useCommentReplies(comment.id as Id<"comments">);

  // Reply mutation actions
  const { updateReply, softDeleteReply } = useReplyActions();

  // Transform backend replies to frontend format
  const replies = backendReplies?.map((br) => ({
    id: br._id,
    createdBy: br.createdBy,
    author: {
      name: br.author.name || 'Anonymous',
      avatar: (br.author.name || 'A').substring(0, 2).toUpperCase(),
    },
    content: br.content,
    timestamp: new Date(br.createdAt).toLocaleString(),
  })) || [];

  const canEditComment = (createdBy: string) => {
    if (!currentUserId) return false;
    return currentUserId === createdBy;
  };

  const canDeleteComment = (createdBy: string) => {
    if (!currentUserId) return false;
    return currentUserId === createdBy || currentUserId === artifactOwnerId;
  };

  const canEditReply = (createdBy: Id<"users">) => {
    if (!currentUserId) return false;
    return currentUserId === createdBy;
  };

  const canDeleteReply = (createdBy: Id<"users">) => {
    if (!currentUserId) return false;
    return currentUserId === createdBy || currentUserId === artifactOwnerId;
  };

  const handleAddReply = async () => {
    if (!replyText.trim()) return;
    await onReply(comment.id, replyText);
    setReplyText('');
    setReplyingTo(null);
  };

  const handleEditReply = (replyId: string, currentContent: string) => {
    setEditingReplyId(replyId);
    setEditReplyText(currentContent);
  };

  const handleSaveReplyEdit = async (replyId: string) => {
    if (!editReplyText.trim()) return;

    try {
      await updateReply(replyId as Id<"commentReplies">, editReplyText);
      setEditingReplyId(null);
      setEditReplyText('');
    } catch (error) {
      console.error('Failed to update reply:', error);
      // TODO: Show error toast
    }
  };

  const handleCancelReplyEdit = () => {
    setEditingReplyId(null);
    setEditReplyText('');
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      await softDeleteReply(replyId as Id<"commentReplies">);
    } catch (error) {
      console.error('Failed to delete reply:', error);
      // TODO: Show error toast
    }
  };

  const isHidden = commentLocation?.isHidden;

  return (
    <div
      className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-lg ${comment.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
        } ${hoveredComment === comment.id ? (isHidden ? 'ring-2 ring-amber-400 shadow-md' : 'ring-2 ring-purple-400 shadow-md') : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white text-xs">
            {comment.author.avatar}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-gray-900">{comment.author.name}</span>
            <span className="text-gray-500">{comment.timestamp}</span>
            {comment.elementType && (
              <Badge variant="secondary" className="text-xs capitalize">
                {comment.elementType}
              </Badge>
            )}
            {/* Location Badge for Hidden Content */}
            {commentLocation?.isHidden && (
              <Badge
                variant="secondary"
                className="text-xs bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                {commentLocation?.type === 'tab' ? 'Tab' : 'Accordion'}: {commentLocation?.label.substring(0, 25)}{commentLocation?.label && commentLocation!.label.length > 25 ? '...' : ''}
              </Badge>
            )}
          </div>

          {/* Image Preview for Image Comments */}
          {comment.elementType === 'image' && comment.elementPreview && (
            <div className="mb-2 relative group">
              <Image
                src={comment.elementPreview}
                alt="Referenced element"
                width={400}
                height={128}
                className="w-full h-32 object-cover rounded border-2 border-purple-200"
                unoptimized
              />
              <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs opacity-90">
                📍 Linked Image
              </div>
            </div>
          )}

          {comment.highlightedText && !comment.elementPreview && (
            <div className="text-purple-600 bg-purple-50 px-2 py-1 rounded mb-2 font-mono inline-block">
              {`"${comment.highlightedText}"`}
            </div>
          )}

          {/* Edit mode: Show textarea */}
          {editingCommentId === comment.id ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="mb-2"
                autoFocus
              />
              <div className="flex gap-2 mb-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveEdit(comment.id, editText);
                  }}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelEdit();
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700">{comment.content}</p>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-11 space-y-3 mt-3 pt-3 border-t border-gray-200">
          {replies.map((reply) => (
            <div key={reply.id} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-gradient-to-br from-green-400 to-teal-500 text-white text-xs">
                    {reply.author.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{reply.author.name}</span>
                    <span className="text-gray-500 text-sm">{reply.timestamp}</span>
                  </div>

                  {/* Edit mode for reply */}
                  {editingReplyId === reply.id ? (
                    <div>
                      <Textarea
                        value={editReplyText}
                        onChange={(e) => setEditReplyText(e.target.value)}
                        className="mb-2"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveReplyEdit(reply.id)}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelReplyEdit}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-700 mb-2">{reply.content}</p>
                      <div className="flex gap-2">
                        {/* Edit button - only for reply author */}
                        {canEditReply(reply.createdBy) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleEditReply(reply.id, reply.content)}
                            title="Edit reply"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        )}
                        {/* Delete button - for author or artifact owner */}
                        {canDeleteReply(reply.createdBy) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this reply?")) {
                                handleDeleteReply(reply.id);
                              }
                            }}
                            title="Delete reply"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Input */}
      {replyingTo === comment.id ? (
        <div className="ml-11 mt-3 pt-3 border-t border-gray-200">
          <Textarea
            placeholder="Write a reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="mb-2"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAddReply(); }}>
              <Send className="w-3 h-3 mr-1" />
              Reply
            </Button>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setReplyingTo(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="ml-11 mt-3 pt-3 border-t border-gray-200 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setReplyingTo(comment.id); }}
          >
            Reply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onToggleResolve(comment.id); }}
          >
            {comment.resolved ? (
              <>Unresolve</>
            ) : (
              <>
                <Check className="w-3 h-3 mr-1" />
                Resolve
              </>
            )}
          </Button>
          {/* Show edit button if user is the author */}
          {comment.createdBy && canEditComment(comment.createdBy) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(comment.id, comment.content);
              }}
              title="Edit comment"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
          {/* Show delete button if user can delete */}
          {comment.createdBy && canDeleteComment(comment.createdBy) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this comment?")) {
                  onDelete(comment.id);
                }
              }}
              title="Delete comment"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
