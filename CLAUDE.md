# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Artifact Review** - A SaaS platform for teams to upload, share, and collaboratively review AI-generated artifacts (HTML, and future formats) from AI agents (Claude Code, Cursor, etc.). Solves the format mismatch between AI-native output and traditional collaboration tools.

**Core Value Proposition:** "From AI output to stakeholder feedback in one click"

See `PRODUCT-DISCOVERY.md` for full product research and strategy.

## Session Startup (Do This First)

**At the start of every session, spawn the `session-startup` agent as a background task.**

This preserves your main context for development work while verifying the environment.

```
Spawn session-startup agent in background to verify environment and load context
```

The agent will:
1. Verify Docker, orchestrator, and endpoints are running
2. Check branch state (new dev vs WIP)
3. Load SESSION-RESUME.md context
4. Return a concise summary

**Wait for the summary before starting work.** If environment fails, fix issues before proceeding.

If resuming work, also check `SESSION-RESUME.md` for detailed task context.

## Environment

Uses direnv for environment management (`.envrc` with `source_up` to inherit from parent directory).

### Environment Files

This project uses a structured env file system. All `.local` files are gitignored.

| File | Purpose | Contains Secrets? |
|------|---------|-------------------|
| `.env.docker.local` | Agent identity, ports, domains | No |
| `.env.dev.local` | Dev tooling API keys (Vercel, GitHub, etc.) | Yes |
| `app/.env.nextjs.local` | Next.js runtime config | Yes |
| `app/.env.convex.local` | Convex backend secrets | Yes |

**Configuration Source of Truth:** All port assignments and agent configuration come from `../artifact-review-orchestrator/config.json`. Environment files are **GENERATED** from this config, not manually edited. Never hardcode ports - they are derived from config.json to support multi-agent development.

**First-time setup:** Run the initialization script (recommended) or manually copy example files.

```bash
# Recommended: automated setup
./scripts/agent-init.sh

# Alternative: manual setup (copy and fill in values)
cp .env.docker.local.example .env.docker.local
cp .env.dev.local.example .env.dev.local
cp app/.env.nextjs.local.example app/.env.nextjs.local
cp app/.env.convex.local.example app/.env.convex.local
```

**Important:** Set your `AGENT_NAME` in `.env.docker.local` first - other configs reference it.

**About JWT Keys:**
- JWT keys (JWT_PRIVATE_KEY, JWKS) are **NOT** stored in `.env.convex.local`
- They are set directly in Convex via `./scripts/setup-convex-env.sh`
- This prevents accidental overwrites when syncing other environment variables
- See `docs/setup/email-configuration.md` for full environment variable details

### Upgrading Environment Variables

When shared secrets change in the parent `../.env.dev.local` (Stripe keys, Resend, Novu), sync them to your agent:

```bash
# Sync from shared parent (non-disruptive, preserves custom config)
./scripts/agent-init.sh --sync-secrets

# Push changes to Convex backend
./scripts/setup-convex-env.sh --sync

# Check sync status
./scripts/agent-init.sh --check
```

**For complete environment reset** (destroys local data, JWT keys, sessions):

```bash
./scripts/agent-teardown.sh --yes    # Nuclear option - destroys everything
./scripts/agent-init.sh              # Fresh setup
```

**Teardown options:**
- `--dry-run` - Show what would be deleted without making changes
- `--yes` - Skip confirmation prompt (for CI/automation)
- `--keep-deps` - Keep node_modules directory

### First-Time Agent Setup (Recommended)

Run the initialization script which handles dependencies and order of operations:

```bash
./scripts/agent-init.sh
```

This script:
1. Verifies prerequisites (Node, Docker, tmux, jq, mkcert)
2. Reads configuration from `../artifact-review-orchestrator/config.json` (single source of truth)
3. Generates environment files with correct ports and auto-detected mkcert CA path
4. Verifies orchestrator is running
5. Installs npm dependencies
6. Starts and configures Convex (Docker + health checks + admin key)
7. Creates Novu organization and retrieves API keys
8. Runs smoke tests to verify all endpoints are accessible

The script creates backups before modifying any files and automatically rolls back on Ctrl+C or errors, ensuring failed runs won't corrupt your configuration.

**Check current configuration status:**
```bash
./scripts/agent-init.sh --check
```

This compares configuration across multiple sources (config.json, .env.docker.local, app/.env.nextjs.local) and shows any mismatches.

### Manual Environment Setup (Alternative)

Before developing, ensure these shared services are configured.

**Important:** Read [docs/setup/local-infrastructure.md](docs/setup/local-infrastructure.md) to understand:
- DNS routing (`*.loc` domains instead of `localhost:port`)
- Convex endpoint separation (`convex.cloud` vs `convex.site`)
- Why CORS is handled in the orchestrator proxy

#### 1. Start Orchestrator (Infrastructure)

The orchestrator proxy provides DNS-based routing for all local services. **Required for local development.**

```bash
cd ../artifact-review-orchestrator
./start.sh
```

The orchestrator lives alongside this project in the `artifact-review-dev/` workspace:
```
artifact-review-dev/
  ├── artifact-review-orchestrator/   ← Shared infrastructure
  ├── artifact-review/                ← Main repo (main branch)
  └── artifact-review-{agent}/        ← Your worktree
```

#### 2. Configure Novu (Notifications)

**IMPORTANT:** On first-time setup, the local Novu database is empty. You must create an organization before notifications will work (data persists after setup).

**Run the setup script (recommended):**

```bash
./scripts/setup-novu-org.sh
```

This script will:
- Check if Novu is available (fails gracefully if not)
- Create user `admin@{AGENT_NAME}.loc` with password `Password123$`
- Create organization `{AGENT_NAME}-artifact-review`
- Retrieve API keys and update `app/.env.nextjs.local` automatically

**To check if already configured:**

```bash
./scripts/setup-novu-org.sh --check
```

See: `../artifact-review-orchestrator/docs/shared-novu.md` for manual setup details.

#### 3. Configure Stripe (Payments)

Stripe is used for subscription billing. The orchestrator runs a shared Stripe CLI listener that fans out webhooks to all agents.

**Get Stripe API Keys:**

1. Log into [Stripe Dashboard](https://dashboard.stripe.com/) (Test Mode)
2. Go to **Developers > API keys**
3. Copy the **Secret key** (`sk_test_...`)

**Set Convex environment variables:**

Add these to `app/.env.convex.local`:
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
```

Then sync to Convex:
```bash
./scripts/setup-convex-env.sh --sync
```

**Get the webhook secret:**

The webhook secret comes from the Stripe CLI when the orchestrator starts it:

```bash
# Start orchestrator (includes Stripe listener if configured)
cd ../artifact-review-orchestrator
export STRIPE_API_KEY="sk_test_..."
./start.sh

# The listener prints: Ready! Your webhook signing secret is whsec_...
# Use that value for STRIPE_WEBHOOK_SECRET
```

**How multi-agent webhooks work:**

- Orchestrator runs single Stripe CLI listener at `https://stripe.loc/webhook`
- Fan-out broadcasts to all agents' `/stripe/webhook` endpoints
- Each agent filters events by `siteOrigin` metadata (only processes its own)
- See: `docs/architecture/decisions/0022-stripe-webhook-multi-deployment-filtering.md`

**Test the integration:**

```bash
# Trigger a test event
stripe trigger payment_intent.succeeded

# Check your Convex logs for:
# [Stripe] Processing payment_intent.succeeded event
# or
# [Stripe] Filtering event for https://other-agent.loc (we are https://james.loc)
```

#### 4. Start Dev Servers

```bash
./scripts/start-dev-servers.sh
```

### Session Startup Protocol (MANDATORY)

**At the start of every development session**, run the two-step startup flow using background agents to keep context clean.

**Step 1: Verify Environment** (`/ready-environment`)

Spawn a background agent to:
- Start stopped Docker containers (don't recreate - use `docker start`)
- Verify orchestrator proxy is running
- Verify dev servers are running (tmux sessions)
- Run smoke tests (connectivity to `${AGENT_NAME}.loc`, `${AGENT_NAME}.convex.cloud.loc`)

**Step 2: Check Branch State** (`/check-branch-state`)

After environment passes:
- **If NEW dev** (clean branch): Run full test suite to validate baseline. All must pass before starting work.
- **If WIP** (commits ahead of main): Load `SESSION-RESUME.md` context, report status, ready to continue.

**Available Skills:**
| Skill | Purpose |
|-------|---------|
| `/ready-environment` | Infrastructure verification + smoke tests |
| `/check-branch-state` | Branch state detection + baseline validation |
| `/run-tests` | Execute test suites (unit, e2e, smoke) |
| `/analyze-failures` | Categorize test failures by root cause |
| `/e2e-fixes` | E2E timing fix patterns |

**Why background agents:** Infrastructure verification fills context with logs and diagnostics. Running it in background keeps main context clean for actual development work.

**SESSION-RESUME.md:** Always check for and read `SESSION-RESUME.md` at project root - it contains the state of work from the previous session. See `SESSION-RESUME-EXAMPLE.md` for the template format.

**Before ending a session:** Always update `SESSION-RESUME.md` with current state before the user restarts you or ends the session. This ensures the next agent can resume seamlessly. Update it when:
- User says "wrap up", "end session", or "restart"
- You've completed significant work
- You're about to lose context

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
- Environment variables changed (`.env.docker.local`, `app/.env.*.local`)
- Dependencies changed (`package.json`)
- Config files changed (`docker-compose.yml`, `convex.json`, `next.config.js`)

**Note:** For normal code changes, restart is NOT needed - both Convex and Next.js have hot reloading.

### Post-Change Actions (MANDATORY)

**After modifying infrastructure files, you MUST restart before continuing work.**

| File Changed | Required Action |
|--------------|-----------------|
| `docker-compose.yml` | `./scripts/start-dev-servers.sh --restart` |
| `.env.docker.local` | `./scripts/start-dev-servers.sh --restart` |
| `package.json` | `cd app && npm install && cd .. && ./scripts/start-dev-servers.sh --restart` |
| `app/.env.*.local` | `./scripts/start-dev-servers.sh --restart` |

**Do NOT continue implementing until the restart completes.** Changes to these files are not hot-reloaded - containers must be recreated to pick up the new configuration.

**Manual commands (from app/ directory) - use only if script fails:**
```bash
npx convex dev          # Start Convex dev server
npm run dev             # Start Next.js dev server
npx convex deploy       # Deploy to production
```

### Convex Dev Server & Deployment

The Convex dev server MUST be running in the `{AGENT_NAME}-convex-dev` tmux session. Hot-reload handles all code deployments automatically.

**Your agent name is defined in `.env.docker.local` as `AGENT_NAME`.**

**Before making Convex changes, verify the session exists:**
```bash
source .env.docker.local
tmux has-session -t ${AGENT_NAME}-convex-dev 2>/dev/null && echo "Running" || echo "NOT RUNNING - start it!"
```

**If NOT running, start it immediately:**
```bash
./scripts/start-dev-servers.sh  # Creates {AGENT_NAME}-convex-dev and {AGENT_NAME}-nextjs sessions
```

**DO NOT run `npx convex dev --once` as a workaround.** This creates a pattern of working around missing infrastructure instead of fixing it. Always restore the tmux session first.

**View Convex function logs:**
```bash
source .env.docker.local
# Best: from the tmux session
tmux capture-pane -t ${AGENT_NAME}-convex-dev -p | tail -50

# Or from Docker backend logs:
docker logs ${AGENT_NAME}-backend --tail 100 2>&1 | grep -E "your-search-term"
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

# Manage Convex environment variables:
./scripts/setup-convex-env.sh            # Full setup (JWT keys, admin key, sync all vars)
./scripts/setup-convex-env.sh --sync     # Sync vars from .env.convex.local only (non-disruptive)
./scripts/setup-convex-env.sh --check    # View current state
./scripts/setup-convex-env.sh --regen    # Regenerate JWT keys (invalidates sessions!)
```

### When to Use Each setup-convex-env.sh Option

| Scenario | Command |
|----------|---------|
| First-time setup | `./scripts/setup-convex-env.sh` |
| Added/changed env var in `.env.convex.local` | `./scripts/setup-convex-env.sh --sync` |
| After Docker container restart | `./scripts/setup-convex-env.sh` |
| Check what's set in Convex | `./scripts/setup-convex-env.sh --check` |
| JWT keys compromised | `./scripts/setup-convex-env.sh --regen` |

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
source .env.docker.local
./scripts/setup-convex-env.sh
tmux kill-session -t ${AGENT_NAME}-convex-dev
./scripts/start-dev-servers.sh
```

**Docker "not running" or "connection refused":**
1. The script will start Docker automatically
2. If it fails, run `sudo systemctl start docker`
3. Do NOT try to "fix" by removing containers or volumes

**Why this matters:** Deleting the Docker volume destroys JWT signing keys, Convex data, and requires regenerating admin keys. This is NOT a quick fix - it breaks authentication for all existing sessions.

### Recognizing Infrastructure vs Code Issues

**STOP and escalate if you find yourself:**
- Running `npx convex dev --once` multiple times
- Checking Docker networking or DNS resolution
- Looking at Docker container internal connectivity
- Investigating why containers can't reach each other
- Adding extensive debug logging to track down "fetch failed" errors
- About to run `docker compose`, `docker restart`, or similar commands

**These are infrastructure issues**, not code bugs. The correct action is:
1. Document what you found in the SESSION-RESUME.md
2. Ask the user or orchestrator for help
3. Do NOT attempt to "fix" Docker networking, kill processes, or restart containers

**Signs you're in a debugging spiral:**
- You've run the same test 3+ times with small changes
- You're investigating something unrelated to your original task
- You've added more than 10 lines of debug logging
- You're googling Docker networking issues

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

### E2E Testing Rules

**CRITICAL:** Do NOT edit any files while e2e tests are running.

The Next.js dev server runs in a tmux session (`{agent}-nextjs`) on a specific port that matches the orchestrator proxy routing. Hot reload from file edits during tests causes test failures due to page reloads mid-test.

**Workflow for running e2e tests:**
1. Make all code changes first
2. Restart dev servers: `./scripts/start-dev-servers.sh`
3. Run tests: `cd app && npm run test:e2e`
4. Wait for complete results (do NOT edit files during this time)
5. Analyze failures, make fixes
6. Repeat from step 2

**Why we keep the tmux dev servers running:**
- The orchestrator proxy routes `{agent}.loc` → agent's assigned port (e.g., 3030)
- Playwright's `webServer` config uses `reuseExistingServer: true`
- If the tmux server isn't running, Playwright would start its own on the wrong port
- This ensures DNS/proxy routing works correctly in multi-agent environments

### Feature Handoff

After implementation, deliver:
- Working feature
- Passing tests in `tasks/XXXXX/tests/` **using central /samples/**
- Validation video in `tasks/XXXXX/tests/validation-videos/`
- `test-report.md` documenting coverage
