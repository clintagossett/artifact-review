# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Artifact Review** - A SaaS platform for teams to upload, share, and collaboratively review AI-generated artifacts (HTML, and future formats) from AI agents (Claude Code, Cursor, etc.). Solves the format mismatch between AI-native output and traditional collaboration tools.

**Core Value Proposition:** "From AI output to stakeholder feedback in one click"

See `PRODUCT-DISCOVERY.md` for full product research and strategy.

## Environment

Uses direnv for environment management (`.envrc` with `source_up` to inherit from parent directory).

## Task Workflow

All work is tracked through numbered task folders tied to GitHub issues:

```
tasks/
├── 00001-first-task/        # GitHub Issue #1
├── 00002-another-task/      # GitHub Issue #2
└── XXXXX-task-name/         # Future tasks
```

### Creating a New Task

1. **Create GitHub Issue:**
   ```bash
   gh issue create --title "Task title" --body "Description"
   ```

2. **Create Task Folder:**
   ```bash
   mkdir tasks/XXXXX-task-name/
   ```
   - Use 5-digit numbering (00001, 00002, etc.)
   - Match the GitHub issue number when possible

3. **Add README.md** to document the task (see `tasks/TEMPLATE.md`)

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
├── tests/                        # Task-level tests
├── output/                       # Task-level output
├── 01-subtask-descriptive-name/
│   ├── README.md
│   ├── scripts/                  # Subtask-specific scripts
│   └── output/                   # Subtask-specific output
└── 02-subtask-another-name/
    ├── README.md
    └── output/
```

- Use 2-digit numbering (01, 02, etc.)
- Format: `##-subtask-descriptive-name`
- Each subtask has its own `README.md`
- Subtasks are ordered/stacked numerically
- Subtasks can have their own `scripts/`, `tests/`, and `output/` folders

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
