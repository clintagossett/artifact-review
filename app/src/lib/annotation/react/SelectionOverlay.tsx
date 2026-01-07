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
                        console.log("[SelectionOverlay] Matched range:", match);
                    }
                } catch (e) {
                    console.error("Failed to re-anchor text selector:", selector, e);
                }
            }
            console.log("[SelectionOverlay] Setting ranges:", results.length);
            setTextRanges(results);
        };

        findRanges();
    }, [textSelectors, textContainer]);

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
    // Convert Range to client rects for rendering
    const rects = Array.from(range.getClientRects());
    const containerRect = container.getBoundingClientRect();

    let bgClass = "bg-yellow-200"; // Fallback

    // User Requirements:
    // 1) Comment: Generic light highlight
    // 2) Highlight: Yellow (default)
    // 3) Strike: Red Strike through

    if (style === "comment") {
        bgClass = "bg-yellow-100"; // Light highlight
    } else if (style === "highlight") {
        bgClass = "bg-yellow-300"; // Stronger yellow
    } else if (style === "strike") {
        // Strikethrough rendering
        return (
            <div className="absolute top-0 left-0 pointer-events-none w-full h-full">
                {rects.map((rect, i) => (
                    <div
                        key={i}
                        className="absolute border-b-2 border-red-500 opacity-80"
                        style={{
                            top: rect.top - containerRect.top + (rect.height / 2),
                            left: rect.left - containerRect.left,
                            width: rect.width,
                            height: 2,
                        }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="absolute top-0 left-0 pointer-events-none w-full h-full">
            {rects.map((rect, i) => (
                <div
                    key={i}
                    className={`absolute opacity-30 mix-blend-multiply ${bgClass}`}
                    style={{
                        top: rect.top - containerRect.top,
                        left: rect.left - containerRect.left,
                        width: rect.width,
                        height: rect.height,
                    }}
                />
            ))}
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
