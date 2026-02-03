# Project Rules (Antigravity)

These rules are mirrored from `CLAUDE.md` and `docs/architecture/convex-rules.md`.

## 🚨 Critical Mandates

1.  **Task Initiation**: You MUST create a GitHub issue using `gh issue create` BEFORE starting work. The resulting issue number MUST be used as the task ID (e.g. `tasks/00042-.../`).
2.  **Strict TDD**: You MUST write a failing test in `tasks/XXXXX/tests/` before writing implementation code.
    *   **Red**: Write test, confirm failure.
    *   **Green**: Write minimal code to pass.
    *   **Refactor**: Clean up.
3.  **Task Artifacts**: Design docs, task-specific scripts, and isolated tests live in `tasks/XXXXX-task-name/`.
    *   **Application Code**: Lives in `src/` and `convex/` (the root). Do NOT try to run the app from the task folder.
    *   **Tests**: Unit tests can live alongside components, but task-specific reproduction/e2e tests often live in `tasks/XXXXX/tests/`.
3.  **Convex Security**: 
    *   ALWAYS use validators (`args`, `returns`).
    *   NEVER use `filter` (use `withIndex`).
    *   Action cannot access `ctx.db`.
4.  **Test Accounts & Emails**: ALL test accounts and emails used in testing (manual or automated) MUST use the domain `@tolauante.resend.app`. 
    *   **NEVER** use `example.com`, `test.com`, or other placeholder domains. 
    *   **ALWAYS** use a timestamped prefix (e.g., `test.user.1768226084936@tolauante.resend.app`) to ensure uniqueness and prevent collisions. 
    *   Do NOT pollute the project with improper or made-up domains.

## 🛠️ Common Commands

- **Start Dev Servers**: `./scripts/start-dev-servers.sh` (Check if running first!)
- **Docs Viewer**: `cd docs-viewer && npm run dev` (Runs on http://localhost:5111)
- **Run Tests**: `npm run test -- tasks/XXXXX/tests/my_test.test.ts`
- **Deploy**: `npx convex deploy`

## 📂 File Structure

- `convex/`: Backend code (follow `convex-rules.md`)
- `src/`: Frontend code
- `docs/`: Documentation files (symlinked to `docs-viewer/public/docs`)
- `docs-viewer/`: Vite site for browsing and collaborating on documentation.
- `tasks/`: All active work.
    - `tasks/XXXXX/tests/`: TDD tests go here.
    - `tasks/XXXXX/README.md`: Task documentation.

## 🧠 Memory & Context
- **Documentation**: 
    - Start by reading `docs/_index.md` if you are lost.
    - **Maintain Indexes**: Every directory in `docs/` MUST have an `_index.md`. When adding or moving documents, you MUST update the corresponding `_index.md` to reflect the changes.
    - Run the **Docs Viewer** (`npm run dev` in `docs-viewer`) to view rendered markdown with diagrams and syntax highlighting at http://localhost:5111.
- **Samples**: Use `/samples/` for test data. Never create custom test data files if a sample exists.
