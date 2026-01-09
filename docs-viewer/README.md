# Docs Viewer

A dedicated documentation viewer for the Artifact Review project. Build with Vite + React.

## Features
- **Live Sync**: Automatically reflects changes, additions, or deletions in the `docs/` directory.
- **Markdown Support**: Renders GitHub-flavored markdown.
- **Mermaid Diagrams**: Visualizes system architectures and state machines.
- **Syntax Highlighting**: Beautifully formatted code blocks with Prism.
- **Deep Linking**: Browser URLs map directly to file paths for easy sharing.

## Getting Started

### Prerequisites
- Node.js installed on your machine.

### Installation
From the project root:
```bash
cd docs-viewer
npm install
```

### Running the Viewer
To start the viewer in development mode with live-reloading:
```bash
npm run dev
```

The viewer will be available at:
**[http://localhost:5111](http://localhost:5111)**

## Project Structure
- `src/components/FileTree.tsx`: Renders the documentation navigation sidebar.
- `src/components/DocViewer.tsx`: The main rendering engine for markdown content.
- `scripts/generate-docs-manifest.mjs`: Scans the `docs/` directory to generate the sidebar structure.
- `public/docs`: A symlink to the root `docs/` directory.

## Configuration
The consistent port **5111** is configured in `vite.config.ts`. To change it, update the `server.port` setting.
