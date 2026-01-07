import { SelectionAdapter, AnnotationManager } from "../manager";
import { W3CSelector, SVGSelector } from "../types";

export class SVGAdapter implements SelectionAdapter {
    id: string;
    type = "svg" as const;
    private manager: AnnotationManager;
    private container: SVGElement | null = null;
    private isActive = false;

    // Drawing State
    private isDrawing = false;
    private startPoint: DOMPoint | null = null;
    private currentRect: SVGRectElement | null = null;

    constructor(manager: AnnotationManager, id: string = "svg-default") {
        this.manager = manager;
        this.id = id;
    }

    canHandle(element: HTMLElement): boolean {
        return this.container ? this.container.contains(element) || this.container === (element as unknown as SVGElement) : false;
    }

    activate(): void {
        if (this.isActive || !this.container) return;
        this.isActive = true;
        this.container.classList.add("cursor-crosshair");

        this.container.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("mouseup", this.onMouseUp);
    }

    deactivate(): void {
        if (!this.isActive || !this.container) return;
        this.isActive = false;
        this.container.classList.remove("cursor-crosshair");

        this.container.removeEventListener("mousedown", this.onMouseDown);
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mouseup", this.onMouseUp);

        // Clean up partial drawing
        if (this.currentRect) {
            this.currentRect.remove();
            this.currentRect = null;
        }
    }

    bindContainer(element: SVGElement) {
        this.container = element;
        this.manager.bindContainer(this.id, element as unknown as HTMLElement);
    }

    private onMouseDown = (e: MouseEvent) => {
        if (!this.container) return;
        e.preventDefault();
        this.isDrawing = true;

        const pt = this.getSVGPoint(e);
        this.startPoint = pt;

        // Create a temporary rect for visual feedback
        this.currentRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.currentRect.setAttribute("x", pt.x.toString());
        this.currentRect.setAttribute("y", pt.y.toString());
        this.currentRect.setAttribute("width", "0");
        this.currentRect.setAttribute("height", "0");
        this.currentRect.setAttribute("fill", "rgba(0, 0, 255, 0.3)");
        this.currentRect.setAttribute("stroke", "blue");
        this.currentRect.setAttribute("stroke-width", "2");

        this.container.appendChild(this.currentRect);
    };

    private onMouseMove = (e: MouseEvent) => {
        if (!this.isDrawing || !this.startPoint || !this.currentRect) return;

        const pt = this.getSVGPoint(e);
        const x = Math.min(this.startPoint.x, pt.x);
        const y = Math.min(this.startPoint.y, pt.y);
        const width = Math.abs(pt.x - this.startPoint.x);
        const height = Math.abs(pt.y - this.startPoint.y);

        this.currentRect.setAttribute("x", x.toString());
        this.currentRect.setAttribute("y", y.toString());
        this.currentRect.setAttribute("width", width.toString());
        this.currentRect.setAttribute("height", height.toString());
    };

    private onMouseUp = async (e: MouseEvent) => {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        // Finish drawing
        if (this.currentRect) {
            const width = parseFloat(this.currentRect.getAttribute("width") || "0");
            const height = parseFloat(this.currentRect.getAttribute("height") || "0");

            if (width > 0 && height > 0) {
                const selector = await this.createSelector();
                if (selector) {
                    // console.debug("[SVGAdapter] Created selector:", selector);
                    const rect = this.currentRect.getBoundingClientRect();
                    this.manager.emit({ type: "selection:create", payload: selector, domRect: rect });
                }
            }

            this.currentRect.remove();
            this.currentRect = null;
        }
    };

    private getSVGPoint(e: MouseEvent): DOMPoint {
        const defaultPoint = new DOMPoint(0, 0);
        if (!this.container) return defaultPoint;

        const pt = (this.container as unknown as SVGSVGElement).createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;

        try {
            const ctm = (this.container as unknown as SVGSVGElement).getScreenCTM();
            if (!ctm) return defaultPoint;
            return pt.matrixTransform(ctm.inverse());
        } catch (err) {
            console.error("SVG Coordinate transform failed", err);
            return defaultPoint;
        }
    }

    async createSelector(): Promise<W3CSelector | null> {
        if (!this.currentRect) return null;

        const x = this.currentRect.getAttribute("x");
        const y = this.currentRect.getAttribute("y");
        const w = this.currentRect.getAttribute("width");
        const h = this.currentRect.getAttribute("height");

        // Store as fractional W3C Media Fragment? Or just absolute SVG coordinates?
        // For this MVP, absolute SVG coordinates within the viewBox is fine.
        // Ideally we might normalize 0..1 relative to viewBox.

        const value = `<svg><rect x="${x}" y="${y}" width="${w}" height="${h}" /></svg>`;

        const selector: SVGSelector = {
            type: "SVGSelector",
            value: value
        };

        return selector;
    }
}
