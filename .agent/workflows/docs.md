---
description: start the documentation viewer for browsing and collaborating on docs
---

This workflow starts the dedicated `docs-viewer` application to provide a rendered view of the `docs/` directory with Mermaid diagrams and syntax highlighting.

1. Navigate to the docs viewer directory:
   ```bash
   cd docs-viewer
   ```

2. Start the development server (includes manifest auto-generation and directory watching):
   ```bash
   npm run dev
   ```

3. Access the viewer:
   - Open [http://localhost:5111](http://localhost:5111) in your browser.

4. Collaboration:
   - Edits made to files in the root `docs/` directory will automatically hot-reload in the viewer.
   - Creating new files or directories in `docs/` will automatically update the sidebar file tree.
   - **Note**: Always maintain the `_index.md` file in the folder you are working in to ensure the landing page and links stay up to date.
