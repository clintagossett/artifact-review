"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { useSelectionLayer } from "../../lib/annotation/react/useSelectionLayer";
import { W3CSelector, AnnotationTarget } from "../../lib/annotation/types";
import { SelectionOverlay } from "../../lib/annotation/react/SelectionOverlay";
import { SelectionMenu } from "./SelectionMenu";

export interface Comment {
    id: string;
    target: AnnotationTarget;
    content: string;
    style: "comment" | "strike";
    createdAt: number;
}

interface InteractiveArtifactViewerProps {
    title: string;
    fileName?: string;
    textContent?: ReactNode;
    svgContent?: ReactNode;
    initialComments?: Comment[];
}

export function InteractiveArtifactViewer({
    title,
    fileName = "unknown.txt",
    textContent,
    svgContent,
    initialComments = []
}: InteractiveArtifactViewerProps) {
    const [comments, setComments] = useState<Comment[]>(initialComments);

    // Interaction State
    const [pendingSelector, setPendingSelector] = useState<W3CSelector | null>(null); // Menu visible, waiting for user action
    const [draftSelector, setDraftSelector] = useState<W3CSelector | null>(null);     // Composing comment
    const [draftContent, setDraftContent] = useState("");
    const [draftStyle, setDraftStyle] = useState<"comment" | "strike">("comment");
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

    // Refs
    const textContainerRef = useRef<HTMLDivElement | null>(null);
    const svgContainerRef = useRef<SVGSVGElement | null>(null);

    const { registerTextContainer, registerSVGContainer } = useSelectionLayer({
        onSelectionCreate: (selector, domRect) => {
            console.log("Selection Created (Pending):", selector);
            setPendingSelector(selector); // Just store it, don't start draft yet

            if (domRect) {
                // Calculate position relative to viewport
                setMenuPosition({
                    x: domRect.left + domRect.width / 2,
                    y: domRect.top + window.scrollY
                });
            }
        },
        onSelectionCancel: () => {
            console.log("Selection Cancelled");
            setPendingSelector(null);
            setDraftSelector(null);
            setMenuPosition(null);
        }
    });

    // Actions
    const handleAction = (style: "comment" | "strike") => {
        if (!pendingSelector) return;

        setDraftSelector(pendingSelector); // Promote pending to draft
        setPendingSelector(null);          // Consumed
        setDraftStyle(style);
        setMenuPosition(null);
        setIsSidePanelOpen(true);
    };

    const handleSaveComment = () => {
        if (!draftSelector) return;
        saveComment(draftContent, draftStyle);
    };

    const saveComment = (content: string, style: "comment" | "strike") => {
        if (!draftSelector) return;

        // Attempt to find line number (naive implementation)
        let lineNumber = 1;
        if (draftSelector.type === "TextQuoteSelector" && textContainerRef.current) {
            const exact = draftSelector.exact;
            const fullText = textContainerRef.current.innerText;
            const index = fullText.indexOf(exact);
            if (index !== -1) {
                const textBefore = fullText.substring(0, index);
                lineNumber = textBefore.split("\n").length;
            }
        }

        const newComment: Comment = {
            id: Math.random().toString(36).substr(2, 9),
            target: {
                source: fileName, // Use passed filename
                selector: draftSelector,
                schemaVersion: "1.0.0"
            },
            content: content,
            style: style,
            createdAt: Date.now()
        };

        // Attach naive metadata if possible (not part of W3C standard directly but useful for UI)
        // For now we just log it or store it in the target 'source' relative URI if we wanted.
        console.log(`Saved annotation for ${fileName} at approx line ${lineNumber}`);

        setComments(prev => [...prev, newComment]);
        setDraftSelector(null);
        setDraftContent("");
        setMenuPosition(null);
    };

    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    const handleEditStart = (comment: Comment) => {
        setEditingCommentId(comment.id);
        setEditContent(comment.content);
    };

    const handleEditSave = () => {
        if (!editingCommentId) return;
        setComments(prev => prev.map(c =>
            c.id === editingCommentId ? { ...c, content: editContent } : c
        ));
        setEditingCommentId(null);
        setEditContent("");
    };

    const handleEditCancel = () => {
        setEditingCommentId(null);
        setEditContent("");
    };

    const handleCloseMenu = () => {
        setMenuPosition(null);
        setPendingSelector(null);
    };

    const handleCancelComment = () => {
        setDraftSelector(null);
        setDraftContent("");
    };

    // Derived selectors list for overlay
    const selectorsToRender = [
        ...comments.map(c => Object.assign({}, c.target.selector, { style: c.style })),
        ...(draftSelector ? [Object.assign({}, draftSelector, { style: draftStyle })] : [])
    ];
    const enrichedSelectors = selectorsToRender as any[];

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Context Menu */}
            {menuPosition && (
                <SelectionMenu
                    x={menuPosition.x}
                    y={menuPosition.y}
                    onComment={() => handleAction("comment")}
                    onStrike={() => handleAction("strike")}
                    onClose={handleCloseMenu}
                />
            )}

            {/* Content Area */}
            <div className="flex-1 p-8 overflow-y-auto" onClick={() => { }}>
                <h1 className="text-2xl font-bold mb-8">{title}</h1>

                {textContent && (
                    <section className="space-y-4 relative max-w-4xl bg-white p-8 rounded shadow mb-8">
                        <h2 className="text-xl font-semibold mb-4 text-gray-400 uppercase tracking-wider text-sm">
                            {fileName} (Text Mode)
                        </h2>
                        <div className="relative">
                            <div
                                ref={(el) => {
                                    textContainerRef.current = el;
                                    registerTextContainer(el);
                                }}
                                className="prose prose-lg relative z-10 max-w-none"
                            >
                                {textContent}
                            </div>
                            <SelectionOverlay
                                selectors={enrichedSelectors}
                                textContainer={textContainerRef.current}
                            />
                        </div>
                    </section>
                )}

                {svgContent && (
                    <section className="space-y-4 relative max-w-4xl bg-white p-8 rounded shadow">
                        <h2 className="text-xl font-semibold mb-4 text-gray-400 uppercase tracking-wider text-sm">
                            Diagram Mode
                        </h2>
                        <div className="relative inline-block border border-gray-200 rounded bg-gray-50">
                            {/* We need to clone the SVG to attach ref? 
                                Or simply wrap it? Wrapping is safer but SVG needs to be direct child for some libs.
                                Our registerSVGContainer just needs the SVG element.
                                We can pass a render prop or just cloneElement.
                            */}
                            {/* For simplicity in this viewer, we assume svgContent IS the svg tag, 
                                but attaching refs to passed ReactNodes is hard.
                                Let's wrap in a div and find the first SVG child? 
                                Or simpler: Just render it and use a ref on the wrapper to find the svg?
                            */}
                            <div ref={el => {
                                if (el) {
                                    const svg = el.querySelector('svg');
                                    if (svg) {
                                        svgContainerRef.current = svg;
                                        registerSVGContainer(svg);
                                    }
                                }
                            }}>
                                {svgContent}
                            </div>

                            <div className="absolute inset-0 pointer-events-none z-20">
                                <SelectionOverlay
                                    selectors={enrichedSelectors}
                                    svgContainer={svgContainerRef.current}
                                />
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {/* Side Panel */}
            {isSidePanelOpen && (
                <div className="w-80 bg-white border-l border-gray-200 shadow-xl flex flex-col h-screen fixed right-0 top-0 z-40">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-700">Annotations</h2>
                        <button onClick={() => setIsSidePanelOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {draftSelector && (
                            <div className={`border rounded p-4 ${draftStyle === 'strike' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex items-center gap-2 mb-2 text-sm font-semibold opacity-70">
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
                                <textarea
                                    className={`w-full p-2 border rounded text-sm focus:ring-2 focus:outline-none ${draftStyle === 'strike' ? 'border-red-200 focus:ring-red-500' : 'border-blue-200 focus:ring-blue-500'}`}
                                    rows={3}
                                    placeholder={draftStyle === 'strike' ? "Reason for removal..." : "Type your comment..."}
                                    value={draftContent}
                                    onChange={(e) => setDraftContent(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2 mt-3">
                                    <button onClick={handleCancelComment} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                                    <button
                                        onClick={handleSaveComment}
                                        className={`text-white px-3 py-1 rounded text-sm transition-colors ${draftStyle === 'strike' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                        {draftStyle === 'strike' ? 'Cross out' : 'Comment'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {comments.length === 0 && !draftSelector && (
                            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded">
                                No annotations yet.
                            </div>
                        )}

                        {comments.map(comment => (
                            <div key={comment.id} className="bg-white border border-gray-100 rounded p-3 shadow-sm hover:border-gray-300 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        {comment.style === 'comment' && <span title="Comment">💬</span>}
                                        {comment.style === 'strike' && <span title="Cross out">❌</span>}
                                        <span className="text-xs font-medium text-gray-500 capitalize">
                                            {/* Show Line Number if we tracked it? For now just Selector Type */}
                                            {comment.target.source}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {new Date(comment.createdAt).toLocaleTimeString()}
                                    </span>
                                    <div className="flex gap-1 ml-2">
                                        <button
                                            onClick={() => handleEditStart(comment)}
                                            className="text-gray-400 hover:text-blue-500"
                                            title="Edit annotation"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => setComments(prev => prev.filter(c => c.id !== comment.id))}
                                            className="text-gray-400 hover:text-red-500"
                                            title="Delete annotation"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                {comment.target.selector.type === "TextQuoteSelector" && (
                                    <blockquote className={`text-xs text-gray-400 mb-2 pl-2 border-l-2 ${comment.style === 'strike' ? 'border-red-400 line-through' : 'border-gray-200'} italic truncate`}>
                                        {`"${(comment.target.selector as any).exact}"`}
                                    </blockquote>
                                )}

                                {editingCommentId === comment.id ? (
                                    <div className="mt-2">
                                        <textarea
                                            className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2"
                                            rows={2}
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={handleEditCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                                            <button onClick={handleEditSave} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Save</button>
                                        </div>
                                    </div>
                                ) : (
                                    comment.content && <p className="text-sm text-gray-800 break-words">{comment.content}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
