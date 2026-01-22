"use client";

import { useState } from 'react';
import {
    Check,
    X,
    Send,
    Edit3,
    Trash2,
    MessageSquare,
    Strikethrough
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Id } from '@/convex/_generated/dataModel';
import { useCommentReplies } from '@/hooks/useCommentReplies';
import { useReplyActions } from '@/hooks/useReplyActions';
import type { AnnotationDisplay } from './types';
import { cn } from '@/lib/utils'; // Assuming this exists, typical in shadcn/ui apps

interface AnnotationCardProps {
    annotation: AnnotationDisplay;
    currentUserId?: string;
    artifactOwnerId?: string;
    // Actions - handled by parent or passed through
    onReply: (annotationId: string, replyText: string) => Promise<void>;
    onEdit: (annotationId: string, content: string) => void;
    onSaveEdit: (annotationId: string, newContent: string) => Promise<void>;
    onToggleResolve: (annotationId: string) => Promise<void>;
    onDelete: (annotationId: string) => Promise<void>;

    // External State control for editing
    isEditing: boolean;
    editText: string;
    setEditText: (text: string) => void;
    onCancelEdit: () => void;
}

export function AnnotationCard({
    annotation,
    currentUserId,
    artifactOwnerId,
    onReply,
    onEdit,
    onSaveEdit,
    onToggleResolve,
    onDelete,
    isEditing,
    editText,
    setEditText,
    onCancelEdit,
}: AnnotationCardProps) {
    const [replyingTo, setReplyingTo] = useState<boolean>(false);
    const [replyText, setReplyText] = useState('');
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [editReplyText, setEditReplyText] = useState('');

    // Fetch replies for this annotation (using existing hook)
    const backendReplies = useCommentReplies(annotation.id as Id<"comments">);
    const { updateReply, softDeleteReply } = useReplyActions();

    // Helper to get initials
    const getInitials = (name: string) => (name || 'A').substring(0, 2).toUpperCase();

    // Permissions
    const canEdit = (creatorId: string) => currentUserId === creatorId;
    const canDelete = (creatorId: string) => currentUserId === creatorId || currentUserId === artifactOwnerId;

    // Derived helpers
    const isStrike = annotation.style === 'strike';
    const quote = annotation.target.selector.type === 'TextQuoteSelector'
        ? annotation.target.selector.exact
        : null;

    // Handlers
    const handleAddReply = async () => {
        if (!replyText.trim()) return;
        await onReply(annotation.id, replyText);
        setReplyText('');
        setReplyingTo(false);
    };

    const handleSaveReplyEdit = async (replyId: string) => {
        if (!editReplyText.trim()) return;
        try {
            await updateReply(replyId as Id<"commentReplies">, editReplyText);
            setEditingReplyId(null);
            setEditReplyText('');
        } catch (error) {
            console.error('Failed to update reply:', error);
        }
    };

    const handleDeleteReply = async (replyId: string) => {
        if (confirm("Delete this reply?")) {
            await softDeleteReply(replyId as Id<"commentReplies">);
        }
    };

    return (
        <div className={cn(
            "border rounded-lg p-3 transition-colors bg-white shadow-sm hover:shadow-md",
            annotation.resolved ? "bg-gray-50 border-gray-200" : (isStrike ? "border-red-100" : "border-blue-100"),
            isStrike && !annotation.resolved && "bg-red-50/30"
        )}>
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-[10px] bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600">
                            {getInitials(annotation.author.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col leading-none">
                        <span className="text-sm font-medium text-gray-900">{annotation.author.name}</span>
                        <span className="text-[10px] text-gray-400">{new Date(annotation.createdAt).toLocaleTimeString()}</span>
                    </div>
                </div>

                <div className="flex gap-1">
                    {annotation.resolved ? (
                        <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Resolved
                        </span>
                    ) : (
                        isStrike && <span className="text-xs text-red-500 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full"><Strikethrough className="w-3 h-3" /> Strike</span>
                    )}
                </div>
            </div>

            {/* Context/Quote */}
            {quote && (
                <div className={cn(
                    "text-xs mb-2 pl-2 border-l-2 py-1 font-mono text-gray-500 truncate",
                    isStrike ? "border-red-300 line-through bg-red-50/50" : "border-blue-300 bg-blue-50/50"
                )}>
                    &quot;{quote}&quot;
                </div>
            )}

            {/* Content Body */}
            {isEditing ? (
                <div className="mb-2">
                    <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="text-sm min-h-[60px] mb-2"
                    />
                    <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelEdit}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => onSaveEdit(annotation.id, editText)}>Save</Button>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-gray-800 break-words mb-3">{annotation.content}</p>
            )}

            {/* Actions Bar */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-gray-500 hover:text-gray-900"
                    onClick={() => setReplyingTo(!replyingTo)}
                >
                    <MessageSquare className="w-3 h-3 mr-1" /> Reply
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-6 px-2 text-xs", annotation.resolved ? "text-gray-500" : "text-green-600 hover:text-green-700")}
                    onClick={() => onToggleResolve(annotation.id)}
                >
                    <Check className="w-3 h-3 mr-1" /> {annotation.resolved ? "Unresolve" : "Resolve"}
                </Button>

                <div className="flex-1" />

                {canEdit(annotation.createdBy) && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600" onClick={() => onEdit(annotation.id, annotation.content)}>
                        <Edit3 className="w-3 h-3" />
                    </Button>
                )}
                {canDelete(annotation.createdBy) && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-red-600" onClick={() => onDelete(annotation.id)}>
                        <Trash2 className="w-3 h-3" />
                    </Button>
                )}
            </div>

            {/* Reply Input */}
            {replyingTo && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                    <Textarea
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="text-sm min-h-[60px] mb-2"
                        autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReplyingTo(false)}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs" onClick={handleAddReply}>Reply</Button>
                    </div>
                </div>
            )}

            {/* Replies List */}
            {backendReplies && backendReplies.length > 0 && (
                <div className="mt-3 space-y-3 pl-3 border-l border-gray-100">
                    {backendReplies.map(reply => (
                        <div key={reply._id} className="group relative">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2 mb-1">
                                    <Avatar className="w-5 h-5">
                                        <AvatarFallback className="text-[8px]">{getInitials(reply.author.name || 'A')}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium text-gray-700">{reply.author.name || 'Anonymous'}</span>
                                    <span className="text-[10px] text-gray-400">{new Date(reply.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <div className="hidden group-hover:flex gap-1">
                                    {canEdit(reply.createdBy) && (
                                        <button onClick={() => { setEditingReplyId(reply._id); setEditReplyText(reply.content); }} className="text-gray-400 hover:text-blue-500"><Edit3 className="w-3 h-3" /></button>
                                    )}
                                    {canDelete(reply.createdBy) && (
                                        <button onClick={() => handleDeleteReply(reply._id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                    )}
                                </div>
                            </div>

                            {editingReplyId === reply._id ? (
                                <div>
                                    <Textarea value={editReplyText} onChange={e => setEditReplyText(e.target.value)} className="text-xs min-h-[40px] mb-2" />
                                    <div className="flex gap-2 justify-end">
                                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingReplyId(null)}>Cancel</Button>
                                        <Button size="sm" className="h-6 text-[10px]" onClick={() => handleSaveReplyEdit(reply._id)}>Save</Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-600 ml-7">{reply.content}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
