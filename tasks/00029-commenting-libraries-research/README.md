# Custom Annotation Library Research (Active)

## Current Status
- **Interactive Prototype:** Functional at `/spike/library-test`.
- **Features:**
    - **Robust Text Selection:** Powered by `@apache-annotator` (W3C Standard).
    - **Intent-Based Decorations:** Distinct visual styles for "Comment" (Highlight) and "Cross Out" (Strikethrough).
    - **Full CRUD Lifecycle:** Create, Read, Update (Edit content), and Delete annotations.
    - **Responsive Re-anchoring:** Highlights automatically re-position when the window resizes or zooms.
    - **Polished UX:** Context menu for creation, dedicated sidebar for drafting, and support for empty/quick annotations.
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

### 2. Validated Capabilities (Completed)
- **Responsive Reactivity:** Implemented `ResizeObserver` / Event Listener logic in `SelectionOverlay`. Annotations now track text reflow perfectly.
- **Visual Distinction:** Clear separation between "Comment" and "Correction" (Strike) intents.
- **Artifact-Free Rendering:** Implemented robust `TreeWalker` based rendering to isolate visible text nodes, preventing block-level artifacts in lists and formatted text.
- **State Management:** Robust handling of "Pending" vs "Draft" selections to prevent UI clutter.
