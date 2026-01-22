# Annotation System Integration Plan

## Objective
Integrate the "Task 29" annotation spike into the main application, replacing the existing "Comment" system. The goal is to combine the robust selection logic of the spike with the rich features (replies, resolving, avatars) of the current application's comment cards.

## Core Concepts
- **Terminology Update**: "Comments" will now be referred to as "Annotations" in the UI and component naming.
- **Schema Strategy**: We will retain the existing Convex `comments` and `commentReplies` tables. The `target` field in the `comments` table will now store the W3C Web Annotation Selector format (from the spike) instead of the previous ad-hoc format.
- **UI/UX**:
    - **Selection**: "Always-on" selection mode (via `SelectionMenu`) replaces the explicit "Comment Mode" toolbar.
    - **sidebar**: A dedicated "Annotations" sidebar will house the list of annotations and the "Draft" form.
    - **Cards**: The visual style of the current `CommentCard` will be preserved but refactored into `AnnotationCard`, supporting threaded replies and resolution status.

## Architecture

### 1. Data Layer (Adapters)
We need to bridge the gap between the Convex `Comment` document and the W3C `Annotation` interface used by the spike's selection logic.

- **Location**: `src/lib/annotation/adapters/`
- **Task**: Create `convexToAnnotation` and `annotationToConvex` transformers.
    - `Convex Comment` -> `UI Annotation`:
        - Maps `_id` to `id`.
        - Maps `target` (W3C JSON) to `target.selector`.
        - Maps `content` to `bodyValue`.
        - Maps `resolved` status and replies.
    - `UI Annotation Draft` -> `Convex Mutation`:
        - Prepares payload for `createComment` mutation using `target` selector from the selection layer.

### 2. Components
We will consolidate components into `src/components/annotations/`.

| Component | Source | Action |
|-----------|--------|--------|
| `AnnotationCard` | `CommentCard.tsx` | **Refactor**. Rename to `AnnotationCard`. Accept `Annotation` type. Keep generic "Reply/Resolve/Edit" logic but ensure it works with the sidebar layout. |
| `SelectionMenu` | `src/components/spike/SelectionMenu.tsx` | **Port**. Move to `components/annotations/`. Ensure it triggers the "Draft" state in the sidebar. |
| `AnnotationSidebar` | `InteractiveArtifactViewer.tsx` (Side Panel) | **Create**. Extracts the side panel logic. Will contain the `AnnotationList` and the "New Annotation" form. |
| `AnnotationOverlay` | `SelectionOverlay` + `useSelectionLayer` | **Integrate**. Ensure it draws highlights based on loaded annotations. |

### 3. Integration Point
The main integration happens in `src/components/artifact/ArtifactViewer.tsx` (or equivalent main viewer).

- **Remove**: `CommentToolbar` and associated "mode" state.
- **Add**:
    - `useSelectionLayer` hook to wrap the content.
    - `SelectionMenu` rendered conditionally on selection.
    - `AnnotationSidebar` rendered in the layout (collapsible).
    - Data fetching via `useComments` passed into the layer and sidebar.

## detailed Implementation Steps

### Step 1: Component Migration & Refactoring
1.  **Create Directory**: `src/components/annotations/`
2.  **Port Selection Menu**: Move `SelectionMenu` from spike to new dir.
3.  **Refactor Card**: Copy `CommentCard` logic to `src/components/annotations/AnnotationCard.tsx`.
    - Update props to align with new `Annotation` data structure.
    - Ensure styling fits the sidebar width.
4.  **Create Sidebar**: Build `AnnotationSidebar.tsx`.
    - Implement the "Draft" form (Comment vs Strike style).
    - Implement the list view using `AnnotationCard`.

### Step 2: Logic & Data Wiring
1.  **Update Hooks**: Ensure `useComments` returns data compatible with the new adapters.
2.  **Selection Layer Integration**: In `ArtifactViewer.tsx`:
    - Initialize `useSelectionLayer`.
    - Pass fetched comments (converted to selectors) to the layer so highlights appear.
    - Handle `onSelectionCreate` -> Set "Draft" state in Sidebar.
    - Handle `onSelectionCancel` -> Clear selection.

### Step 3: Cleanup
1.  **Remove Old UI**: Delete `CommentToolbar` and the old "floating comment button" logic.
2.  **Verify**: Ensure "Resolve" works (updates visual state in card and maybe hides highlight or styles it differently in overlay).
3.  **Mobile Check**: Ensure selection menu works on touch devices (basic check, can be refined later).

## Validation Checklist
- [ ] Users can select text and see the `SelectionMenu`.
- [ ] Clicking "Comment" in menu opens Sidebar with Draft form.
- [ ] Submitting creates a record in Convex with W3C `target`.
- [ ] existing comments/annotations load and highlight correctly.
- [ ] Card supports Replies, Edit, Delete, and Resolve.
- [ ] "Strike" style is supported (visual distinction in highlight and card).
