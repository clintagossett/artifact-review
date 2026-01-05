# Project Rules (Antigravity)

These rules are mirrored from `CLAUDE.md` and `docs/architecture/convex-rules.md`.

## 🚨 Critical Mandates

1.  **Strict TDD**: You MUST write a failing test in `tasks/XXXXX/tests/` before writing implementation code.
    *   **Red**: Write test, confirm failure.
    *   **Green**: Write minimal code to pass.
    *   **Refactor**: Clean up.
2.  **Task Artifacts**: Design docs, task-specific scripts, and isolated tests live in `tasks/XXXXX-task-name/`.
    *   **Application Code**: Lives in `src/` and `convex/` (the root). Do NOT try to run the app from the task folder.
    *   **Tests**: Unit tests can live alongside components, but task-specific reproduction/e2e tests often live in `tasks/XXXXX/tests/`.
3.  **Convex Security**: 
    *   ALWAYS use validators (`args`, `returns`).
    *   NEVER use `filter` (use `withIndex`).
    *   Actions cannot access `ctx.db`.

## 🛠️ Common Commands

- **Start Dev Servers**: `./scripts/start-dev-servers.sh` (Check if running first!)
- **Run Tests**: `npm run test -- tasks/XXXXX/tests/my_test.test.ts`
- **Deploy**: `npx convex deploy`

## 📂 File Structure

- `convex/`: Backend code (follow `convex-rules.md`)
- `src/`: Frontend code
- `tasks/`: All active work.
    - `tasks/XXXXX/tests/`: TDD tests go here.
    - `tasks/XXXXX/README.md`: Task documentation.

## 🧠 Memory & Context
- **Documentation**: Start by reading `docs/_index.md` if you are lost.
- **Samples**: Use `/samples/` for test data. Never create custom test data files if a sample exists.
