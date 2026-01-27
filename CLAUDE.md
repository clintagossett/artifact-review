# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Artifact Review** - A SaaS platform for teams to upload, share, and collaboratively review AI-generated artifacts (HTML, and future formats) from AI agents (Claude Code, Cursor, etc.). Solves the format mismatch between AI-native output and traditional collaboration tools.

**Core Value Proposition:** "From AI output to stakeholder feedback in one click"

See `PRODUCT-DISCOVERY.md` for full product research and strategy.

## Environment

Uses direnv for environment management (`.envrc` with `source_up` to inherit from parent directory).

### First-Time Environment Setup

Before developing, ensure these shared services are configured.

**Important:** Read [docs/setup/local-infrastructure.md](docs/setup/local-infrastructure.md) to understand:
- DNS routing (`*.loc` domains instead of `localhost:port`)
- Convex endpoint separation (`convex.cloud` vs `convex.site`)
- Why CORS is handled in the orchestrator proxy

#### 1. Start Orchestrator (Infrastructure)

The orchestrator proxy provides DNS-based routing for all local services. **Required for local development.**

```bash
cd /home/clint-gossett/Documents/agentic-dev/orchestrator
./start.sh
```

See also: [Infrastructure ADRs](/home/clint-gossett/Documents/agentic-dev/docs/adr/) for architecture decisions.

#### 2. Configure Novu (Notifications)

**IMPORTANT:** On first-time setup, the local Novu database is empty. You must create an organization before notifications will work (data persists after setup).

**Run the setup script (recommended):**

```bash
./scripts/setup-novu-org.sh
```

This script will:
- Check if Novu is available (fails gracefully if not)
- Create user `admin@mark.loc` with password `Password123$`
- Create organization `mark-artifact-review`
- Retrieve API keys and update `app/.env.local` automatically

**To check if already configured:**

```bash
./scripts/setup-novu-org.sh --check
```

See: `/home/clint-gossett/Documents/agentic-dev/docs/guides/shared-novu.md` for manual setup details.

#### 3. Start Dev Servers

```bash
./scripts/start-dev-servers.sh
```

### Creating a New Task (MANDATORY SEQUENCE)

1. **Create GitHub Issue FIRST:**
   ```bash
   gh issue create --title "Task title" --body "Description"
   ```
   *Note: This command will return an issue number (e.g. #30).*

2. **Create Task Folder:**
   ```bash
   mkdir tasks/000XX-task-name/
   ```
   - **MANDATORY:** The folder name MUST use the GitHub issue number as its prefix (zero-padded to 5 digits).
   - Example: Issue #30 results in `tasks/00030-track-artifact-views/`.

3. **Add README.md** to document the task (see `tasks/TEMPLATE.md`).

4. **Do the work**

5. **Commit with Issue Reference:**
   ```
   Closes #X
   ```

### Task Folder Contents

Each task folder may contain:
- `README.md` - Task description, decisions, outcomes
- `scripts/` - Utility/setup/debugging scripts created during task work
- `tests/` - Tests specific to this task
- `output/` - Generated artifacts (code, data, docs)
- Subtask directories (see below)

**Important:** Keep task work contained. Any utility scripts, tests, or temporary files created during task work must live within the task folder structure, NOT in the main app/ directory.

### Subtasks

Subtasks are smaller units of work within a task. They live inside the task folder with their own directory and README:

```
tasks/00001-first-task/
├── README.md
├── scripts/                      # Task-level utility scripts
├── tests/                        # Task-level tests (upleveled from subtasks)
│   ├── unit/
│   └── e2e/
├── output/                       # Task-level output
├── 01-subtask-descriptive-name/
│   ├── README.md
│   ├── scripts/                  # Subtask-specific scripts
│   ├── tests/                    # Subtask-specific tests
│   │   ├── unit/                 # Unit tests for this subtask
│   │   └── e2e/                  # E2E tests for this subtask
│   └── output/                   # Subtask-specific output
└── 02-subtask-another-name/
    ├── README.md
    ├── tests/
    │   ├── unit/
    │   └── e2e/
    └── output/
```

- Use 2-digit numbering (01, 02, etc.)
- Format: `##-subtask-descriptive-name`
- Each subtask has its own `README.md`
- Subtasks are ordered/stacked numerically
- Subtasks can have their own `scripts/`, `tests/`, and `output/` folders
- Subtask `tests/` folders have `unit/` and `e2e/` subdirectories
- All e2e tests MUST produce video recordings (mandatory)
- Videos are gitignored and NOT committed to the repository
- Tests can be "upleveled" from subtask to task level when they provide broader value

## Documentation System

Documentation lives in `docs/` and uses an `_index.md` convention for efficient navigation.

### Structure

```
docs/
├── _index.md                    # Docs home/overview
├── personas/
│   ├── _index.md                # Personas overview
│   └── *.md                     # Individual personas
├── journeys/
│   ├── _index.md                # Journeys overview
│   └── *.md                     # Individual journeys
├── architecture/
│   ├── _index.md                # Architecture overview
│   └── decisions/
│       ├── _index.md            # ADR index
│       └── 0001-*.md            # Individual ADRs
└── design/
    ├── _index.md                # Design overview
    └── *.md                     # Design documents
```

### _index.md Strategy

**For Claude:**
- ALWAYS start by reading `docs/_index.md` to understand documentation structure
- Use `_index.md` files to navigate — they contain summaries and links to detail docs
- Only read individual docs when specific detail is needed
- This minimizes context bloat

**When updating docs:**
- ALWAYS update the relevant `_index.md` when adding/removing/modifying documents
- Keep `_index.md` files as accurate tables of contents
- Include brief descriptions in index entries so Claude can decide if it needs the full doc

## Technology Stack

- **Backend:** Convex
- **Reference Designs:** `figma-designs/` (git submodule, read-only)

## Development Commands

**IMPORTANT - Start dev servers:**
```bash
./scripts/start-dev-servers.sh           # Start servers (skips if already running)
./scripts/start-dev-servers.sh --restart # Kill existing servers and restart fresh
```

Always use this script to start dev servers. It:
- Checks if ports are already in use before starting
- Skips servers that are already running (safe to run multiple times)
- Logs output to `app/logs/` for debugging
- Only stops processes it started on Ctrl+C

**When to use `--restart`:**
- Server crashed or is unresponsive
- Environment variables changed (`.env.local`)
- Dependencies changed (`package.json`)
- Config files changed (`convex.json`, `next.config.js`)

**Note:** For normal code changes, restart is NOT needed - both Convex and Next.js have hot reloading.

**Manual commands (from app/ directory) - use only if script fails:**
```bash
npx convex dev          # Start Convex dev server
npm run dev             # Start Next.js dev server
npx convex deploy       # Deploy to production
```

## Docker Rules (CRITICAL)

The Convex backend runs in Docker. The Docker volume (`{AGENT_NAME}_convex_data`) contains critical data including JWT signing keys. **Destroying this volume requires complete environment re-setup.**

### NEVER Run These Commands

```bash
# These destroy your data - NEVER run them:
docker compose down -v                    # Deletes volumes, loses all data
docker volume rm {AGENT_NAME}_convex_data # Destroys Convex data
docker system prune                       # May remove critical volumes
docker compose ...                        # NEVER run docker compose directly!
```

### ALWAYS Use These Scripts

```bash
# Correct way to manage services:
./scripts/start-dev-servers.sh           # Start services (safe, idempotent)
./scripts/start-dev-servers.sh --restart # Restart if needed (preserves volumes)

# Fix environment/auth issues:
./scripts/setup-convex-env.sh            # Refresh admin key, set env vars
./scripts/setup-convex-env.sh --check    # View current state
./scripts/setup-convex-env.sh --regen    # Regenerate JWT keys (invalidates sessions!)
```

### Why Never Run Docker Compose Directly

Running `docker compose` without the script creates containers with wrong names (e.g., `artifact-review-backend` instead of `mark-backend`). This causes:
- Volume attachment failures
- Admin key mismatches
- Complete auth breakdown

The `start-dev-servers.sh` script sets required variables (`AGENT_NAME`, `COMPOSE_PROJECT_NAME`). See `docs/setup/troubleshooting.md` for details.

### If You See Errors

**`BadAdminKey` or authentication errors:**
```bash
./scripts/setup-convex-env.sh  # Refreshes admin key automatically
```

**Auth not working after container restart:**
```bash
./scripts/setup-convex-env.sh
tmux kill-session -t mark-convex-dev
./scripts/start-dev-servers.sh
```

**Docker "not running" or "connection refused":**
1. The script will start Docker automatically
2. If it fails, run `sudo systemctl start docker`
3. Do NOT try to "fix" by removing containers or volumes

**Why this matters:** Deleting the Docker volume destroys JWT signing keys, Convex data, and requires regenerating admin keys. This is NOT a quick fix - it breaks authentication for all existing sessions.

### Troubleshooting Reference

See `docs/setup/troubleshooting.md` for comprehensive troubleshooting guide.

## Figma Designs Reference

The `figma-designs/` directory is a git submodule containing Figma Make exports. This is **read-only reference material**.

- Original Figma: https://www.figma.com/design/8Roikp7VBTQaxiWbQKRtZ2/Collaborative-HTML-Review-Platform
- To update: `git submodule update --remote figma-designs`
- Do NOT modify files in this directory

## Convex Backend Rules

**MANDATORY:** When working on backend code or any changes that touch Convex:

1. **Read the rules first:** Always read `docs/architecture/convex-rules.md` before making any Convex changes
2. **Strict adherence:** Follow ALL guidelines in the Convex rules document — no exceptions
3. **Key requirements:**
   - Use new function syntax with `args`, `returns`, and `handler`
   - ALWAYS include argument and return validators (use `v.null()` for void returns)
   - Use `internalQuery`/`internalMutation`/`internalAction` for private functions
   - Do NOT use `filter` in queries — use indexes with `withIndex`
   - Schema defined in `convex/schema.ts`
   - Actions cannot access `ctx.db`

Failure to follow these rules will result in broken or insecure code.

## Agent Delegation

Always prefer handing tasks off to specialized agents (Task tool) when the task matches an agent's capabilities. Use parallel agents when tasks are independent. This maximizes efficiency and keeps context focused.

## Development Standards

**MANDATORY:** When implementing features, follow these development guides:

1. **Read the guides first:** `docs/development/_index.md`
2. **Use central test samples:** Load test files from `/samples/`, never create your own
3. **Follow TDD workflow:** Write tests first, in `tasks/XXXXX/tests/`
4. **Use structured logging:** Never raw `console.log`

### Quick Reference

| Guide | Purpose |
|-------|---------|
| [workflow.md](docs/development/workflow.md) | TDD workflow, task structure |
| [testing-guide.md](docs/development/testing-guide.md) | How to write tests, **use /samples/** |
| [logging-guide.md](docs/development/logging-guide.md) | How to log |
| [/samples/README.md](samples/README.md) | **Central test data** - 15+ sample files |

### TDD Cycle

```
RED    → Write failing test in tasks/XXXXX/tests/
GREEN  → Minimal code to pass
REFACTOR → Clean up
REPEAT → Next test
```

### Logging

```typescript
// Frontend
import { logger, LOG_TOPICS } from '@/lib/logger';
logger.info(LOG_TOPICS.Auth, 'LoginForm', 'User signed in', { userId });

// Backend (Convex)
import { createLogger, Topics } from './lib/logger';
const log = createLogger('auth.signIn');
log.info(Topics.Auth, 'User signed in', { userId });
```

### Test Data

**CRITICAL:** Use centralized test samples from `/samples/` directory:
- **15 versioned artifacts** - ZIP, HTML, Markdown (5 versions each)
- **Invalid test cases** - Oversized files, forbidden types (real videos)
- **Well documented** - Each sample has expected behavior defined

**Never create your own test files** - use the central repository to ensure consistency across all tests.

See: `/samples/README.md` and `docs/development/testing-guide.md#sample-test-files`

### Feature Handoff

After implementation, deliver:
- Working feature
- Passing tests in `tasks/XXXXX/tests/` **using central /samples/**
- Validation video in `tasks/XXXXX/tests/validation-videos/`
- `test-report.md` documenting coverage
