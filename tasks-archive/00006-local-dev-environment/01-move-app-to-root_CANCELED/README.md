# Subtask 01: Move App to Project Root

**Parent Task:** 00006-local-dev-environment
**Status:** Cancelled

## Decision

After architectural review, keeping the app in `/app` subdirectory is acceptable and preferred.

See [ADR 0006: Frontend Stack](/docs/architecture/decisions/0006-frontend-stack.md) for project structure documentation.

## Rationale

1. **Current structure works** - Step 1 anonymous auth is functional
2. **Migration cost exceeds benefit** - Moving files, updating paths, regenerating types adds risk with no functional improvement
3. **Vercel supports subdirectory config** - Just needs `vercel.json` or dashboard settings
4. **Future flexibility** - Structure accommodates future multi-package scenarios (CLI, workers, shared libs)
5. **Clear separation** - App code is cleanly isolated from docs, tasks, and figma-designs

## Configuration Required

For Vercel deployment, configure root directory to `app` in dashboard or use `vercel.json` at repo root.
