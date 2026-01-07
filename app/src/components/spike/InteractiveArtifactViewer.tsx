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
    style: "comment" | "highlight" | "strike";
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
    const [draftSelector, setDraftSelector] = useState<W3CSelector | null>(null);
    const [draftContent, setDraftContent] = useState("");
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

    // Refs
    const textContainerRef = useRef<HTMLDivElement | null>(null);
    const svgContainerRef = useRef<SVGSVGElement | null>(null);

    const { registerTextContainer, registerSVGContainer } = useSelectionLayer({
        onSelectionCreate: (selector, domRect) => {
            console.log("Selection Created:", selector);
            setDraftSelector(selector);

            if (domRect) {
                // Calculate position relative to viewport
                setMenuPosition({
                    x: domRect.left + domRect.width / 2,
                    y: domRect.top + window.scrollY
                });
            }
        }
    });

    // Actions
    const handleAction = (style: "comment" | "highlight" | "strike") => {
        if (!draftSelector) return;

        if (style === "comment") {
            setMenuPosition(null);
            setIsSidePanelOpen(true);
        } else {
            // Immediate save
            saveComment("", style);
        }
    };

    const handleSaveComment = () => {
        if (!draftSelector || !draftContent.trim()) return;
        saveComment(draftContent, "comment");
    };

    const saveComment = (content: string, style: "comment" | "highlight" | "strike") => {
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

    const handleCloseMenu = () => {
        setMenuPosition(null);
        setDraftSelector(null);
    };

    const handleCancelComment = () => {
        setDraftSelector(null);
        setDraftContent("");
    };

    // Derived selectors list for overlay
    const selectorsToRender = [
        ...comments.map(c => Object.assign({}, c.target.selector, { style: c.style })),
        ...(draftSelector ? [draftSelector] : [])
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
                    onHighlight={() => handleAction("highlight")}
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
                            <div className="bg-blue-50 border border-blue-200 rounded p-4">
                                <textarea
                                    className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    rows={3}
                                    placeholder="Type your comment..."
                                    value={draftContent}
                                    onChange={(e) => setDraftContent(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2 mt-3">
                                    <button onClick={handleCancelComment} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                                    <button
                                        onClick={handleSaveComment}
                                        disabled={!draftContent.trim()}
                                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                    >
                                        Save
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
                                        {comment.style === 'highlight' && <span title="Highlight">✨</span>}
                                        {comment.style === 'strike' && <span title="Strike">❌</span>}
                                        <span className="text-xs font-medium text-gray-500 capitalize">
                                            {/* Show Line Number if we tracked it? For now just Selector Type */}
                                            {comment.target.source}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {new Date(comment.createdAt).toLocaleTimeString()}
                                    </span>
                                </div>
                                {comment.target.selector.type === "TextQuoteSelector" && (
                                    <blockquote className={`text-xs text-gray-400 mb-2 pl-2 border-l-2 ${comment.style === 'strike' ? 'border-red-400 line-through' : 'border-gray-200'} italic truncate`}>
                                        "{(comment.target.selector as any).exact}"
                                    </blockquote>
                                )}
                                {comment.content && <p className="text-sm text-gray-800">{comment.content}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
