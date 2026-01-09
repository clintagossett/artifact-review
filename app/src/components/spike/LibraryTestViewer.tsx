import { useState, useRef, useEffect } from "react";
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

export function LibraryTestViewer() {
    const [comments, setComments] = useState<Comment[]>([]);

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
                // We want the menu centered above the selection top-center
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
            // Open side panel
            setMenuPosition(null); // Hide menu
            setIsSidePanelOpen(true);
            // Draft selector remains set
        } else {
            // Verify immediate save for highlight/strike
            const newComment: Comment = {
                id: Math.random().toString(36).substr(2, 9),
                target: {
                    source: "http://example.com/artifact/1",
                    selector: draftSelector,
                    schemaVersion: "1.0.0"
                },
                content: "", // No content for highlight/strike
                style: style,
                createdAt: Date.now()
            };

            setComments(prev => [...prev, newComment]);
            setDraftSelector(null);
            setMenuPosition(null);
        }
    };

    const handleSaveComment = () => {
        if (!draftSelector || !draftContent.trim()) return;

        const newComment: Comment = {
            id: Math.random().toString(36).substr(2, 9),
            target: {
                source: "http://example.com/artifact/1",
                selector: draftSelector,
                schemaVersion: "1.0.0"
            },
            content: draftContent,
            style: "comment",
            createdAt: Date.now()
        };

        setComments(prev => [...prev, newComment]);
        setDraftSelector(null);
        setDraftContent("");
        // Keep side panel open
    };

    const handleCloseMenu = () => {
        setMenuPosition(null);
        setDraftSelector(null);
    };

    const handleCancelComment = () => {
        // Keep side panel open
        setDraftSelector(null);
        setDraftContent("");
    };

    // Derived selectors list for overlay
    // Includes ALL saved comments + the current draft (if any)
    const selectorsToRender = [
        ...comments.map(c => Object.assign({}, c.target.selector, { style: c.style })), // Start polluting the selector with style for the overlay to pick up?
        // Or update SelectionOverlay to take "Comments" not just selectors?
        // For now, let's keep SelectionOverlay generic and maybe update it to accept an enriched object or map
        ...(draftSelector ? [draftSelector] : [])
    ];

    // HACK: To pass style to SelectionOverlay without refactoring everything,
    // we can attach metadata to the selector or pass a parallel map.
    // Let's modify SelectionOverlay props to accept { selector, style } objects? 
    // Or just monkey-patch the style onto the selector for display purposes.
    // The previous code passed `c.target.selector`.
    // Let's pass `comments` to SelectionOverlay? No, keep it generic.
    // We'll Monkey-patch for the prototype.
    const enrichedSelectors = selectorsToRender as any[];

    return (
        <div className="flex min-h-screen bg-gray-50">

            {/* Context Menu Layer */}
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

            {/* LEFT: Artifact Content Area */}
            <div className="flex-1 p-8 overflow-y-auto" onClick={(e) => {
                // Dimiss menu if clicking outside (naive implementation)
                // if (!e.defaultPrevented) handleCloseMenu();
            }}>
                <h1 className="text-2xl font-bold mb-8">Artifact Review Prototype</h1>

                <section className="space-y-4 relative max-w-2xl bg-white p-8 rounded shadow mb-8">
                    <h2 className="text-xl font-semibold mb-4">Contract Agreement (Text Mode)</h2>
                    <div className="relative">
                        <div
                            ref={(el) => {
                                textContainerRef.current = el;
                                registerTextContainer(el);
                            }}
                            className="prose prose-lg relative z-10"
                        >
                            <p>
                                {`This Services Agreement ("Agreement") is entered into by and between`}
                                <strong> Acme Corp </strong> and <strong> John Doe </strong>.
                                The Provider agrees to deliver the deliverables outlined in Exhibit A
                                within the timeline specified in Exhibit B.
                            </p>
                            <p>
                                In consideration for the Services, the Client shall pay the Provider
                                the fees specified in Exhibit C. All payments shall be made within
                                30 days of receipt of invoice.
                            </p>
                            <p>
                                Either party may terminate this Agreement upon written notice if the other
                                party materially breaches any provision of this Agreement and fails to cure
                                such breach within thirty (30) days.
                            </p>
                        </div>

                        {/* Overlay */}
                        <SelectionOverlay
                            selectors={enrichedSelectors}
                            textContainer={textContainerRef.current}
                        />
                    </div>
                </section>

                <section className="space-y-4 relative max-w-2xl bg-white p-8 rounded shadow">
                    <h2 className="text-xl font-semibold mb-4">Architecture Diagram (SVG Mode)</h2>
                    <div className="relative inline-block border border-gray-200 rounded bg-gray-50">
                        <svg
                            ref={(el) => {
                                svgContainerRef.current = el;
                                registerSVGContainer(el);
                            }}
                            width="500"
                            height="350"
                            viewBox="0 0 500 350"
                            className="relative z-10"
                        >
                            {/* Diagram Elements */}
                            <g transform="translate(50, 50)">
                                <rect x="0" y="0" width="120" height="80" rx="4" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
                                <text x="60" y="45" textAnchor="middle" fill="#1e40af" fontSize="14">Client App</text>
                            </g>

                            <g transform="translate(330, 50)">
                                <rect x="0" y="0" width="120" height="80" rx="4" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" />
                                <text x="60" y="45" textAnchor="middle" fill="#166534" fontSize="14">API Server</text>
                            </g>

                            <g transform="translate(190, 200)">
                                <ellipse cx="60" cy="40" rx="60" ry="40" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
                                <text x="60" y="45" textAnchor="middle" fill="#92400e" fontSize="14">Database</text>
                            </g>

                            {/* Connectors */}
                            <path d="M 170 90 L 330 90" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow)" />
                            <path d="M 390 130 L 250 200" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow)" />

                            <defs>
                                <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                                    <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
                                </marker>
                            </defs>
                        </svg>

                        <div className="absolute inset-0 pointer-events-none z-20">
                            <SelectionOverlay
                                selectors={enrichedSelectors}
                                svgContainer={svgContainerRef.current}
                            />
                        </div>
                    </div>
                </section>
            </div>

            {/* RIGHT: Annotation Side Panel */}
            {isSidePanelOpen && (
                <div className="w-80 bg-white border-l border-gray-200 shadow-xl flex flex-col h-screen fixed right-0 top-0 z-40">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-700">Annotations</h2>
                        <button onClick={() => setIsSidePanelOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">

                        {/* Draft Area - Only show if drafting */}
                        {draftSelector && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-4 animate-in fade-in slide-in-from-right-4 duration-200">
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
                                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Annotation List */}
                        {comments.length === 0 && !draftSelector && (
                            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded">
                                No annotations yet. Select text to start.
                            </div>
                        )}

                        {comments.map(comment => (
                            <div key={comment.id} className="bg-white border border-gray-100 rounded p-3 shadow-sm hover:border-gray-300 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        {/* Icon based on style */}
                                        {comment.style === 'comment' && <span title="Comment">💬</span>}
                                        {comment.style === 'highlight' && <span title="Highlight">✨</span>}
                                        {comment.style === 'strike' && <span title="Strike">❌</span>}

                                        <span className="text-xs font-medium text-gray-500 capitalize">
                                            {comment.target.selector.type === "TextQuoteSelector" ? "Text" : "Area"}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {new Date(comment.createdAt).toLocaleTimeString()}
                                    </span>
                                </div>

                                {/* Quote / Context */}
                                {comment.target.selector.type === "TextQuoteSelector" && (
                                    <blockquote className={`text-xs text-gray-400 mb-2 pl-2 border-l-2 ${comment.style === 'strike' ? 'border-red-400 line-through' : 'border-gray-200'} italic truncate`}>
                                        {`"${(comment.target.selector as any).exact}"`}
                                    </blockquote>
                                )}

                                {/* Content (if any) */}
                                {comment.content && <p className="text-sm text-gray-800">{comment.content}</p>}

                                {/* Empty state label for highlights/strikes without comments */}
                                {!comment.content && comment.style !== 'comment' && (
                                    <p className="text-xs text-gray-400 italic">
                                        {comment.style === 'highlight' ? 'Highlighted' : 'Struck out'}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
