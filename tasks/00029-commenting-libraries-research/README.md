# Custom Annotation Library Research (Active)

## Current Status
- **Interactive Prototype:** Functional at `/spike/library-test`.
- **Features:** Text selection, SVG box selection, Context Menu (Highlight, Strike, Comment), Side Panel.
- **Architecture:** Hybrid approach using `@apache-annotator` for text and custom logic for SVGs.

## Future Requirements & Considerations
### 1. Semantic Agent Context
> "We need to ensure that agents can get the annotation data and know where in the file the user is addressing, ideally without using a rendered .png."

- **Problem:** Current SVG selection is coordinate-based (x, y, width, height). An LLM reading the code won't know that "Box at 100,100" corresponds to the "API Server" node.
- **Requirement:** Shift from purely positional drawings to **Element Selection**.
    - Selecting specific SVG elements (Nodes, Paths, Groups).
    - Annotating "The API Server Node" rather than "The area at 100,100".
    - Supporting semantic markers: Arrows, logic flows, grouped elements.
- **Goal:** Provide a data structure that an Agent can read to understand context without needing Vision/OCR.

### 2. Responsive Reactivity
> "Annotations need to redraw when a page resizes."

- **Problem:** If the SVG or Text container resizes (responsive layout), absolute coordinates might drift if not anchored to relative semantics or re-calculated.
- **Requirement:** Implement a resize observer or responsive coordinate system (percentages vs pixels) to ensure highlights stay attached to their targets dynamically.
