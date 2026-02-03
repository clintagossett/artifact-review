import { useEffect, useRef, useState, useCallback } from "react";
import { AnnotationManager } from "../manager";
import { TextAdapter } from "../adapters/TextAdapter";
import { SVGAdapter } from "../adapters/SVGAdapter";
import { W3CSelector, SelectionEvent } from "../types";

// Singleton manager instance for now 
// (In a real app, this might be provided via Context)
const globalManager = new AnnotationManager();

export function useSelectionLayer(options?: {
    onSelectionCreate?: (selector: W3CSelector, domRect?: DOMRect) => void;
    onSelectionCancel?: () => void;
}) {
    // Use a ref to keep track of the manager (singleton or instantiated)
    const managerStr = useRef(globalManager);

    // Handlers
    const registerTextContainer = useCallback((element: HTMLElement | null) => {
        if (element) {
            // Check if adapter already exists
            // For simplicity, we create a new one for this specific container
            // Ideally we should track IDs better
            const id = "text-" + Math.random().toString(36).substr(2, 9);
            const adapter = new TextAdapter(managerStr.current, id);
            managerStr.current.registerAdapter(adapter);
            adapter.bindContainer(element);
        }
    }, []);

    const registerSVGContainer = useCallback((element: SVGElement | null) => {
        if (element) {
            const id = "svg-" + Math.random().toString(36).substr(2, 9);
            const adapter = new SVGAdapter(managerStr.current, id);
            managerStr.current.registerAdapter(adapter);
            adapter.bindContainer(element);
        }
    }, []);

    // Listen for events from the manager
    useEffect(() => {
        const unsub = managerStr.current.subscribe((event: SelectionEvent) => {
            if (event.type === "selection:create" && event.payload && options?.onSelectionCreate) {
                options.onSelectionCreate(event.payload, event.domRect);
            } else if (event.type === "selection:cancel" && options?.onSelectionCancel) {
                options.onSelectionCancel();
            }
        });

        return () => { unsub(); };
    }, [options]);

    return {
        registerTextContainer,
        registerSVGContainer,
        manager: managerStr.current
    };
}
