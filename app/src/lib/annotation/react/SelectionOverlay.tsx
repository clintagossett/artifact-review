import { useEffect, useMemo, useState } from "react";
import { W3CSelector, TextQuoteSelector, SVGSelector } from "../types";
// @ts-ignore
import { createTextQuoteSelectorMatcher } from "@apache-annotator/dom";

interface SelectionOverlayProps {
    selectors: W3CSelector[];
    textContainer?: HTMLElement | null;
    svgContainer?: SVGElement | null;
}

export function SelectionOverlay({ selectors, textContainer, svgContainer }: SelectionOverlayProps) {
    // State now holds { range, style }
    const [textRanges, setTextRanges] = useState<{ range: Range, style: string }[]>([]);

    // Filter selectors by type
    const textSelectors = useMemo(() =>
        selectors.filter(s => s.type === "TextQuoteSelector") as (TextQuoteSelector & { style?: string })[],
        [selectors]);

    const svgSelectors = useMemo(() =>
        selectors.filter(s => s.type === "SVGSelector") as (SVGSelector & { style?: string })[],
        [selectors]);

    // Effect: Match Text Selectors to DOM Ranges
    useEffect(() => {
        if (!textContainer || textSelectors.length === 0) return;

        const findRanges = async () => {
            console.log("[SelectionOverlay] Finding ranges for", textSelectors.length, "selectors");
            const results: { range: Range, style: string }[] = [];

            for (const selector of textSelectors) {
                try {
                    const matcher = createTextQuoteSelectorMatcher(selector);
                    // @ts-ignore - matcher returns an async generator
                    for await (const match of matcher(textContainer)) {
                        results.push({
                            range: match,
                            style: selector.style || "comment"
                        });
                    }
                } catch (e) {
                    console.error("Failed to re-anchor text selector:", selector, e);
                }
            }
            setTextRanges(results);
        };

        findRanges();
    }, [textSelectors, textContainer]);

    // Handle Window Resize/Scroll to update highlight positions
    const [_, setTick] = useState(0);
    useEffect(() => {
        const handleLayoutChange = () => {
            setTick(t => t + 1);
        };
        window.addEventListener("resize", handleLayoutChange);
        window.addEventListener("scroll", handleLayoutChange, { capture: true }); // Capture needed for scrolling elements

        return () => {
            window.removeEventListener("resize", handleLayoutChange);
            window.removeEventListener("scroll", handleLayoutChange, { capture: true });
        };
    }, []);

    return (
        <>
            {/* IMPLEMENTATION: Text Highlights Layer */}
            {textRanges.map((item, i) => (
                <TextHighlight key={i} range={item.range} style={item.style} container={textContainer!} />
            ))}

            {/* SVG Highlights Layer */}
            {svgContainer && svgSelectors.length > 0 && (
                <div
                    className="absolute inset-0 pointer-events-none"
                // Removed manual width/height style to rely on absolute positioning matching the container
                >
                    <svg
                        width="100%"
                        height="100%"
                        viewBox={svgContainer.getAttribute("viewBox") || undefined}
                        style={{ overflow: "visible" }}
                    >
                        {svgSelectors.map((s, i) => (
                            <SVGFragment key={i} selector={s} />
                        ))}
                    </svg>
                </div>
            )}
        </>
    );
}

function TextHighlight({ range, style, container }: { range: Range, style: string, container: HTMLElement }) {
    // Robustly get rects for ONLY visible text nodes, ignoring container blocks and empty whitespace
    const rects = useMemo(() => {
        const results: DOMRect[] = [];
        const commonAncestor = range.commonAncestorContainer;

        // Optimization: Single text node
        if (commonAncestor.nodeType === Node.TEXT_NODE) {
            const text = commonAncestor.textContent?.substring(range.startOffset, range.endOffset) || "";
            if (text.trim().length === 0) return [];
            return Array.from(range.getClientRects());
        }

        const walker = document.createTreeWalker(
            commonAncestor,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Only accept nodes that are physically inside the range
                    if (range.intersectsNode(node)) return NodeFilter.FILTER_ACCEPT;
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let currentNode = walker.nextNode();
        // If commonAncestor is an element, start checking its children.
        // If walker returns nothing initially, check if we need to start at commonAncestor (if it was a text node, handled above)
        // TreeWalker doesn't return the root if it's what we asked for, but here root is usually an Element (div/ul).

        // Fallback for TreeWalker behavior on edge cases:
        // If range is "Item A" -> "Item B", intersection handles it.

        while (currentNode) {
            const node = currentNode as Text;

            // Determine intersection offsets
            const start = (node === range.startContainer) ? range.startOffset : 0;
            const end = (node === range.endContainer) ? range.endOffset : node.length;

            if (end > start) {
                const text = node.textContent?.substring(start, end) || "";
                // Only render if there is visible text (non-whitespace)
                if (text.trim().length > 0) {
                    const spanRange = document.createRange();
                    spanRange.setStart(node, start);
                    spanRange.setEnd(node, end);
                    results.push(...Array.from(spanRange.getClientRects()));
                }
            }

            currentNode = walker.nextNode();
        }

        return results;
    }, [range]);

    const containerRect = container.getBoundingClientRect();

    let bgClass = "bg-yellow-200"; // Fallback

    if (style === "comment") {
        bgClass = "bg-yellow-100"; // Light highlight
    } else if (style === "highlight") {
        bgClass = "bg-yellow-300"; // Stronger yellow
    } else if (style === "strike") {
        // Strikethrough rendering
        return (
            <div className="absolute top-0 left-0 pointer-events-none w-full h-full overflow-hidden">
                {rects.map((rect, i) => {
                    // Clip to container bounds to avoid drawing outside the "paper"
                    const left = Math.max(rect.left, containerRect.left);
                    const right = Math.min(rect.right, containerRect.right);
                    const width = right - left;

                    if (width <= 0) return null;

                    return (
                        <div
                            key={i}
                            className="absolute border-b-2 border-red-500 opacity-80"
                            style={{
                                top: rect.top - containerRect.top + (rect.height / 2),
                                left: left - containerRect.left,
                                width: width,
                                height: 2,
                            }}
                        />
                    );
                })}
            </div>
        );
    }

    return (
        <div className="absolute top-0 left-0 pointer-events-none w-full h-full overflow-hidden">
            {rects.map((rect, i) => {
                const left = Math.max(rect.left, containerRect.left);
                const right = Math.min(rect.right, containerRect.right);
                const width = right - left;

                if (width <= 0) return null;

                return (
                    <div
                        key={i}
                        className={`absolute opacity-30 mix-blend-multiply ${bgClass}`}
                        style={{
                            top: rect.top - containerRect.top,
                            left: left - containerRect.left,
                            width: width,
                            height: rect.height,
                        }}
                    />
                );
            })}
        </div>
    );
}

function SVGFragment({ selector }: { selector: SVGSelector }) {
    // selector.value is "<svg><rect ... /></svg>"
    // We need to extract the inner content or just parse it.
    // A naive regex to extract the inner tags:
    const content = selector.value.replace(/^<svg[^>]*>|<\/svg>$/g, "");

    return (
        <g dangerouslySetInnerHTML={{ __html: content }} fill="rgba(255, 255, 0, 0.3)" stroke="orange" strokeWidth="2" />
    );
}
