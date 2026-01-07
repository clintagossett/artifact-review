# Architectural Analysis: Commenting System Layers

This document analyzes the architecture for the "Artifact Review" system using a 4-layer model to determine whether to **Wrap Existing Libraries** or **Build Custom**.

## The 4 Layers

| Layer | Name | Responsibility | Key Challenge |
|---|---|---|---|
| **1** | **Placement Selection** | User interactions to specify *where* (click, drag, highlight). | Handling different DOM events (Text vs SVG) unifiedly. |
| **2** | **Targeting Data** | Storing the *address* of the comment (W3C Selectors). | Precision and robustness (what if text changes?). |
| **3** | **Decorations** | Visual indicators (highlights, outlines, pins). | Rendering accurately over responsive/dynamic content. |
| **4** | **Comment Box** | The actual input/thread UI. | Positioning (popover vs sidebar) and connection to Layer 2. |

---

## Analysis: Option A (Wrap Libraries) vs Option B (Custom React Lib)

### Layer 1: Placement Selection (The "Action")

**Option A: Wrap Annotator.js + Annotorious**
- **Pros:** They have battle-tested event handlers. They handle the "drag to select" logic for you.
- **Cons:**
    - **Annotator.js** is heavily coupled to its own UI (popups) which we have to fight/suppress.
    - **Annotorious** takes over the SVG DOM event loop, making it hard to coexist with other interactions.
    - **Inconsistent UX:** Text selection feels native; Annotorious feels like a "mode".

**Option B: Custom React Library (Recommended)**
- **Props:** We write clean `onMouseUp` (Text) and `onMouseDown/Move` (SVG) handlers using standard React patterns.
- **Cons:** We must implement the "rubber band" box drawing logic ourselves (approx 50 lines of code).
- **Verdict:** **Custom** is cleaner. We get total control over the "Mode Switching" (hover detection) without fighting library/jQuery event bubbles.

### Layer 2: Targeting Data (The "Model")

**Shared Wisdom:** Both options should stick to **W3C Web Annotation** standards.
- Text: `TextQuoteSelector` (exact text + prefix/suffix)
- SVG: `SVGSelector` (geometry geometry)

**Option A:**
- Libraries generate these objects automatically.
- *Risk:* Annotator.js generates legacy formats that might need conversion.

**Option B:**
- We port the **Selection Logic only**.
- Use `apache-annotator` (headless) to calculate `TextQuoteSelector`.
- Use simple math to calculate SVG rects.
- **Verdict:** **Tie**. We rely on established algorithms in both cases.

### Layer 3: Comment Decorations (The "View")

**Option A:**
- Libraries handle rendering highlights.
- **Cons:**
    - **Styling:** Hard to customize. Annotorious uses specific CSS classes/internal nodes. Annotator.js inserts `<span>` tags that might mess with your app's CSS.
    - **React Lifecycle:** If React re-renders the DOM, these external libraries might lose their DOM attachments (zombie highlights).

**Option B:**
- **Text:** We use a standardized "Highlight" component (or `CSS.highlights` API).
- **SVG:** We render a standard React `<svg>` overlay purely driven by state.
- **Verdict:** **Custom** is superior for React. It ensures decorations stay in sync with component state/re-renders.

### Layer 4: Comment Box (The "UI")

**Option A:**
- Annotator.js tries to spawn its own comment box. We have to hack it to open *our* React component instead.
- Annotorious emits events, which is cleaner.

**Option B:**
- Trivial. Our `onSelectionComplete` callback simply sets React state: `setDraftComment(selection)`.
- The App renders the Comment Box wherever it wants (Sidebar/Popover) based on that state.
- **Verdict:** **Custom** eliminates the "fighting the library UI" problem.

---

## Strategy Recommendation

**"Build Custom, Borrow Wisdom"**

We should aggressively **borrow the math** but **own the events and rendering**.

### The Hybrid Plan

1.  **Placement (Layer 1):** Write our own `useSelectionLayer` hook.
    - *Why?* To unify the Text vs SVG "hover mode" behavior which libraries don't do well together.
2.  **Targeting (Layer 2):** Use `apache-annotator` (npm: `@apache-annotator/dom`) for the hard math.
    - *Why?* Don't re-invent `TextQuoteSelector` generation or range-finding robustness.
    - *SVG:* Simple coordinate math is easy to own.
3.  **Decorations (Layer 3):** Render via React.
    - *Text:* `Range.surroundContents` (classic) or CSS Highlights.
    - *SVG:* Just render `<rect>` elements in a pointer-events-none overlay.
4.  **Box (Layer 4):** Standard React integration.

### Summary
Wrap the *algorithms*, not the *libraries*.

| Feature | Implementation | source |
|---|---|---|
| Text Range Finding | `@apache-annotator/dom` | External |
| Text Highlighting | React `Mark` component | Custom |
| SVG Drawing | React `onMouseMove` | Custom |
| SVG Rendering | React SVG Overlay | Custom |
| Data Format | W3C JSON-LD | Standard |
