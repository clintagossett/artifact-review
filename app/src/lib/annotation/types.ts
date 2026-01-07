export type SelectorType = "TextQuoteSelector" | "SVGSelector";

export interface ProcessorDescription {
    type: string;
    exact: string;
    prefix: string;
    suffix: string;
}

export interface TextQuoteSelector {
    type: "TextQuoteSelector";
    exact: string;
    prefix: string;
    suffix: string;
}

export interface SVGSelector {
    type: "SVGSelector";
    value: string; // The SVG fragment (e.g. <svg><polygon points="..." /></svg>)
}

export type W3CSelector = TextQuoteSelector | SVGSelector;

export interface AnnotationTarget {
    source: string; // URI of the artifact
    selector: W3CSelector;
    schemaVersion: string; // e.g. "1.0.0"
}

export interface Annotation {
    "@context": "http://www.w3.org/ns/anno.jsonld";
    type: "Annotation";
    bodyValue: string;
    target: AnnotationTarget;
}

// Internal Library Types

export type SelectionMode = "text" | "svg" | null;

export interface SelectionEvent {
    type: "selection:create" | "selection:cancel";
    payload?: W3CSelector;
    domRect?: DOMRect; // Screen coordinates for positioning UI
}

export type SelectionHandler = (event: SelectionEvent) => void;
