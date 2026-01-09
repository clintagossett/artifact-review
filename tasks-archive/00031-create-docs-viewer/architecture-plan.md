# Architecture Plan: Docs Viewer

## Overview
The Docs Viewer is a lightweight Vite + React application designed to browse and view the project's documentation stored in the `docs/` directory. It leverages existing UI components from the main application to ensure a consistent look and feel.

## Goals
- Provide a dedicated, focused environment for reading documentation.
- Enable direct linking to specific documentation files via URL.
- Support smooth navigation through the documentation hierarchy.
- Reuse existing rendering logic (Markdown, Mermaid, etc.).

## Key Components

### 1. File Explorer (Sidebar)
- Dynamically scans the `docs/` directory.
- Renders a nested tree view of files and directories.
- Allows users to collapse/expand folders and select files for viewing.

### 2. Document Viewer (Main Content Area)
- Renders the content of the selected `.md` file.
- Uses the project's existing `MarkdownViewer` component.
- Supports Mermaid diagrams via the existing `Mermaid` component.
- Handles internal links and anchors correctly.

### 3. Router
- Uses `react-router-dom` or similar to manage application state based on the URL.
- Maps URL paths directly to file paths relative to the `docs/` root.

## Data Fetching
Since this is a client-side Vite app, we need a way to access the filesystem.
- **Development**: We can use a custom Vite plugin or a simple local dev server endpoint to list and read files from the `docs/` directory.
- **Production**: A build step could generate a static manifest of files, and the app would fetch the files as static assets.

## Integration Strategy
- The `docs-viewer` will be a standalone project in its own directory.
- We will use symlinks or path aliases in Vite to reference components from the main `app/src` directory to avoid code duplication.

## Routing Logic
- `/` -> Renders `docs/README.md` or a landing page.
- `/<path/to/file.md>` -> Renders `docs/<path/to/file.md>`.
- Supports `#fragment` for scrolling to specific sections.
