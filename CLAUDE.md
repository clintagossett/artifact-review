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
- `output/` - Generated artifacts (code, data, docs)
- Subtask directories (see below)
- Any other relevant files

### Subtasks

Subtasks are smaller units of work within a task. They live inside the task folder with their own directory and README:

```
tasks/00001-first-task/
├── README.md
├── 01-subtask-descriptive-name/
│   └── README.md
├── 02-subtask-another-name/
│   └── README.md
└── output/
```

- Use 2-digit numbering (01, 02, etc.)
- Format: `##-subtask-descriptive-name`
- Each subtask has its own `README.md`
- Subtasks are ordered/stacked numerically

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

When Convex is set up:
```bash
npx convex dev          # Start Convex dev server
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
