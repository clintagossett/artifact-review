# Design: Unified Annotation Library ("ArtifactSector")

## Philosophy
We are building a custom "Selection Layer" library (working title: `ArtifactSelector`) that normalizes the interaction difference between text and graphical content.

**Core Goal:** The consuming application should not care *how* a selection was made (text highlight vs SVG polygon). It should receive a standardized **Selector** object and provide a standardized way to **Anchor** (display) that selector later.

**Primitives (Borrowed Logic):**
- **Text:** Uses `annotator` (or `apache-annotator`) concepts for robust `TextQuoteSelector` creation and anchoring.
- **Visual:** Uses `annotorious` concepts (SVG/Canvas overlays) for `SVGSelector` creation and rendering.

## Architecture

### 1. The Manager (`AnnotationManager`)
The central brain. It maintains the registry of active "Adapters" on the page and handles the "Mode Switching" logic.
- **State:** `activeAdapter` (Text | SVG | null)
- **Event:** Listen globally for mouse moves to determine intent (Hover over text block? Hover over SVG?).
- **Output:** Emits generic `selection` events to the app.

### 2. The Adapters (`SelectionAdapter`)
Each content type has an adapter that implements a common interface.

```typescript
interface SelectionAdapter {
  // Check if this adapter wants to handle the event (e.g. mouseover)
  canHandle(element: HTMLElement): boolean;
  
  // Activate: take over the cursor, start listening for drag/click
  activate(): void;
  
  // Deactivate: clean up, stop listening
  deactivate(): void;
  
  // Create a serializable W3C selector from the current selection
  createSelector(): Promise<W3CSelector>;
  
  // Take a saved selector and visually highlight it on the content
  anchor(selector: W3CSelector): Promise<void>;
}
```

#### TextAdapter (based on Annotator.js)
- **Target:** Generic HTML containers.
- **Logic:**
    - Refines browser `Range` into `TextQuoteSelector` (exact, prefix, suffix).
    - Uses `rangy` or native API to restore generic Ranges from selectors.
    - **UI:** Native browser selection + custom highlight spans.

#### SVGAdapter (based on Annotorious)
- **Target:** `<svg>` or `<img>` tags.
- **Logic:**
    - Maps screen coordinates to SVG coordinate space.
    - Creates `SVGSelector` (polygon points, rect geometry).
    - **UI:** Overlays a transparent SVG layer for drawing.

### 3. The React Interface (`useSelectionLayer`)
A hook that binds the Manager to the React lifecycle.

```typescript
// Usage in App
const { 
  registerContainer, // ref to pass to text/svg containers
  currentSelection,  // current pending selection
  confirmSelection   // finalize and get W3C object
} = useSelectionLayer({
  onSelectionCreate: (selector) => openCommentComposer(selector)
});

return (
  <div ref={registerContainer('text')}>
    <p>Some text...</p>
    <svg ref={registerContainer('svg')}>...</svg>
  </div>
)
```

## Data Model (W3C Web Annotation)
We strictly adhere to the standard.

### Text
```json
{
  "type": "TextQuoteSelector",
  "exact": "foobar",
  "prefix": "context before ",
  "suffix": " context after"
}
```

### SVG
```json
{
  "type": "SVGSelector",
  "value": "<svg><polygon points='...'/></svg>"
}
```

## Implementation Strategy
Instead of installing `annotator` as a global monolithic plugin, we will:
1.  Extract/Vendor the **Selector Logic** (algorithms for finding text/coordinates).
2.  Write our own **Event/UI Layer** (React-driven).

**Why?**
- `annotator` is old (jQuery dependent). We want just the math/logic, not the jQuery UI.
- `annotorious` is heavy. We want the coordinate math, but maybe we want our own cleaner drawing UI.

## Next Steps
1.  Prototype the `TextAdapter` using modern DOM APIs (no jQuery).
2.  Prototype the `SVGAdapter` using a lightweight React-SVG overlay.
3.  Wire them up with the `AnnotationManager`.
