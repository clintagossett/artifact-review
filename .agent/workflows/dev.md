---
description: start or restart the development servers (Next.js and Convex)
---

This workflow uses the project's helper script to manage the local development environment.

// turbo
1. Run the startup script to ensure both servers are active:
   ```bash
   ./scripts/start-dev-servers.sh
   ```

2. To force a restart (killing any existing processes on ports 3000 or 8188), run:
   ```bash
   ./scripts/start-dev-servers.sh --restart
   ```

3. **Docs Viewer**: To start the documentation viewer (live-syncing with `docs/`), run:
   ```bash
   cd docs-viewer && npm run dev
   ```
   Open [http://localhost:5111](http://localhost:5111) to view.

4. Monitor the status of the servers:
   - Next.js: `app/logs/nextjs.log`
   - Convex: `app/logs/convex.log`
   - Docs Viewer: Check terminal output in `docs-viewer`
