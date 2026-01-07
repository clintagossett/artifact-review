import { SelectionEvent, SelectionHandler, SelectionMode, W3CSelector } from "./types";

export interface SelectionAdapter {
    id: string;
    type: SelectionMode;
    canHandle(element: HTMLElement): boolean;
    activate(): void;
    deactivate(): void;
    createSelector(): Promise<W3CSelector | null>;
    // anchor(selector: W3CSelector): Promise<void>; // TODO: Add later for display
}

export class AnnotationManager {
    private adapters: ProcessedAdapter[] = [];
    private activeAdapter: SelectionAdapter | null = null;
    private listeners: Set<SelectionHandler> = new Set();

    constructor() {
        if (typeof window !== "undefined") {
            this.bindGlobalEvents();
        }
    }

    public registerAdapter(adapter: SelectionAdapter) {
        this.adapters.push({
            adapter,
            element: null // Will be bound via ref later or explicitly
        });
    }

    public unregisterAdapter(id: string) {
        this.adapters = this.adapters.filter(a => a.adapter.id !== id);
        if (this.activeAdapter?.id === id) {
            this.deactivateCurrent();
        }
    }

    // Called when React ref attaches to a container
    public bindContainer(adapterId: string, element: HTMLElement) {
        const entry = this.adapters.find(a => a.adapter.id === adapterId);
        if (entry) {
            entry.element = element;
        }
    }

    public subscribe(handler: SelectionHandler) {
        this.listeners.add(handler);
        return () => this.listeners.delete(handler);
    }

    public emit(event: SelectionEvent) {
        this.listeners.forEach(fn => fn(event));
    }

    private bindGlobalEvents() {
        // Mode Switching Logic
        // We listen for mouseover to see which container we are over
        document.addEventListener("mousemove", this.handleMouseMove.bind(this));

        // We can add keyboard overrides here (e.g. Shift to force Text mode)
    }

    private handleMouseMove(e: MouseEvent) {
        const target = e.target as HTMLElement;

        // Find if we are inside any registered container
        const match = this.adapters.find(entry =>
            entry.element && entry.element.contains(target)
        );

        if (match) {
            this.switchTo(match.adapter);
        } else {
            // If we are outside all containers, do we deactivate?
            // Maybe not immediately to prevent flickering at boundaries
            // this.deactivateCurrent(); 
        }
    }

    private switchTo(adapter: SelectionAdapter) {
        if (this.activeAdapter === adapter) return;

        // Deactivate previous
        if (this.activeAdapter) {
            this.activeAdapter.deactivate();
        }

        // Activate new
        this.activeAdapter = adapter;
        this.activeAdapter.activate();

        console.debug(`[AnnotationManager] Switched to mode: ${adapter.type}`);
    }

    private deactivateCurrent() {
        if (this.activeAdapter) {
            this.activeAdapter.deactivate();
            this.activeAdapter = null;
        }
    }
}

interface ProcessedAdapter {
    adapter: SelectionAdapter;
    element: HTMLElement | null;
}
