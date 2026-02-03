"use client";

import React from 'react';
import { X, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AnnotationCard } from './AnnotationCard';
import type { AnnotationDisplay } from './types';
import type { W3CSelector } from '@/lib/annotation/types';

interface AnnotationSidebarProps {
    isOpen: boolean;
    onClose: () => void;

    // Data
    annotations: AnnotationDisplay[];
    currentUser: { id: string; name: string } | null;
    artifactOwnerId?: string;

    // Draft State
    draftSelector: W3CSelector | null;
    draftStyle: "comment" | "strike";
    onCancelDraft: () => void;
    onSaveDraft: (content: string) => Promise<void>;

    // CRUD Ops for Cards
    onReply: (id: string, text: string) => Promise<void>;
    onEdit: (id: string, content: string) => void;
    onSaveEdit: (id: string, newContent: string) => Promise<void>;
    onToggleResolve: (id: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;

    // Editing State (lifted up if needed, or local per card? 
    // CommentCard usually handled its own "is editing" state but here we have a list.
    // Let's rely on the parent to manage "which card is being edited" or simpler: let card handle it?
    // The previous implementation had a "editingCommentId" state in the parent. 
    // I will emulate that pattern for consistency.
    editingId: string | null;
    editText: string;
    setEditText: (t: string) => void;
    onCancelEdit: () => void;
}

export function AnnotationSidebar({
    isOpen,
    onClose,
    annotations,
    currentUser,
    artifactOwnerId,
    draftSelector,
    draftStyle,
    onCancelDraft,
    onSaveDraft,
    onReply,
    onEdit,
    onSaveEdit,
    onToggleResolve,
    onDelete,
    editingId,
    editText,
    setEditText,
    onCancelEdit
}: AnnotationSidebarProps) {
    const [draftContent, setDraftContent] = React.useState("");

    // Reset draft content when selector changes (new draft)
    React.useEffect(() => {
        if (!draftSelector) setDraftContent("");
    }, [draftSelector]);

    const handleSave = async () => {
        if (!draftContent.trim()) return;
        await onSaveDraft(draftContent);
    };

    if (!isOpen) return null;

    return (
        <div className="w-80 bg-white border-l border-gray-200 shadow-xl flex flex-col h-full fixed right-0 top-0 z-40 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Annotations
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                        {annotations.length}
                    </span>
                </h2>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {/* Draft Form */}
                {draftSelector && (
                    <div className={`border rounded-lg p-4 shadow-sm animate-in slide-in-from-top-2 ${draftStyle === 'strike' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                        <div className="flex items-center gap-2 mb-2 text-sm font-semibold opacity-80">
                            {draftStyle === 'strike' ? (
                                <>
                                    <span>❌</span>
                                    <span className="text-red-700">Cross out Selection</span>
                                </>
                            ) : (
                                <>
                                    <span>💬</span>
                                    <span className="text-blue-700">Add Comment</span>
                                </>
                            )}
                        </div>

                        {/* Quote Preview */}
                        {draftSelector.type === 'TextQuoteSelector' && (
                            <blockquote className={`text-xs mb-3 pl-2 border-l-2 italic truncate opacity-70 ${draftStyle === 'strike' ? 'border-red-300' : 'border-blue-300'}`}>
                                &quot;{draftSelector.exact}&quot;
                            </blockquote>
                        )}

                        <Textarea
                            className={`w-full text-sm mb-3 bg-white ${draftStyle === 'strike' ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
                            rows={3}
                            placeholder={draftStyle === 'strike' ? "Reason for removal..." : "Type your comment..."}
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                            autoFocus
                            data-testid="annotation-comment-input"
                        />
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={onCancelDraft} className="text-gray-500 hover:text-gray-700" data-testid="annotation-cancel-button">Cancel</Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                className={draftStyle === 'strike' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                                data-testid="annotation-submit-button"
                            >
                                {draftStyle === 'strike' ? 'Cross out' : 'Comment'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {annotations.length === 0 && !draftSelector && (
                    <div className="text-center py-12 px-4 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg mx-auto">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>No annotations yet.</p>
                        <p className="text-xs opacity-70 mt-1">Select text to add a comment.</p>
                    </div>
                )}

                {/* Cards */}
                <div className="space-y-3">
                    {annotations.map(annotation => (
                        <AnnotationCard
                            key={annotation.id}
                            annotation={annotation}
                            currentUserId={currentUser?.id}
                            artifactOwnerId={artifactOwnerId}
                            onReply={onReply}
                            onEdit={onEdit}
                            onSaveEdit={onSaveEdit}
                            onToggleResolve={onToggleResolve}
                            onDelete={onDelete}
                            isEditing={editingId === annotation.id}
                            editText={editText}
                            setEditText={setEditText}
                            onCancelEdit={onCancelEdit}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
