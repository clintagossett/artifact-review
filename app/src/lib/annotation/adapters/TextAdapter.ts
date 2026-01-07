import { SelectionAdapter, AnnotationManager } from "../manager";
import { W3CSelector, TextQuoteSelector } from "../types";
// @ts-ignore - Assuming standard installation
import { describeTextQuote } from "@apache-annotator/dom";

export class TextAdapter implements SelectionAdapter {
    id: string;
    type = "text" as const;
    private manager: AnnotationManager;
    private container: HTMLElement | null = null;
    private isActive = false;

    constructor(manager: AnnotationManager, id: string = "text-default") {
        this.manager = manager;
        this.id = id;
    }

    canHandle(element: HTMLElement): boolean {
        return this.container ? this.container.contains(element) : false;
    }

    activate(): void {
        if (this.isActive || !this.container) return;
        this.isActive = true;
        this.container.classList.add("cursor-text");
        document.addEventListener("selectionchange", this.onSelectionChange);
        this.container.addEventListener("mouseup", this.onMouseUp);
    }

    deactivate(): void {
        if (!this.isActive || !this.container) return;
        this.isActive = false;
        this.container.classList.remove("cursor-text");
        document.removeEventListener("selectionchange", this.onSelectionChange);
        this.container.removeEventListener("mouseup", this.onMouseUp);
    }

    bindContainer(element: HTMLElement) {
        this.container = element;
        this.manager.bindContainer(this.id, element);
    }

    private onSelectionChange = () => {
        // Optional: emit selection change events
    };

    private onMouseUp = async () => {
        // Wait for selection to settle
        setTimeout(async () => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                const selector = await this.createSelector();
                if (selector) {
                    // console.debug("[TextAdapter] Created selector:", selector);
                    if (selection && selection.rangeCount > 0) {
                        const rect = selection.getRangeAt(0).getBoundingClientRect();
                        this.manager.emit({ type: "selection:create", payload: selector, domRect: rect });
                    }
                }
            }
        }, 10);
    };

    async createSelector(): Promise<W3CSelector | null> {
        const selection = window.getSelection();
        if (!selection || rangeCount(selection) === 0) return null;

        const range = selection.getRangeAt(0);

        if (this.container && !this.container.contains(range.commonAncestorContainer)) {
            return null;
        }

        try {
            // Use Apache Annotator to describe the range
            const selector = await describeTextQuote(range, this.container!);

            return {
                type: "TextQuoteSelector",
                exact: selector.exact,
                prefix: selector.prefix || "",
                suffix: selector.suffix || ""
            };
        } catch (e) {
            console.error("Failed to create selector:", e);
            return null;
        }
    }
}

function rangeCount(selection: Selection | null): number {
    return selection ? selection.rangeCount : 0;
}
