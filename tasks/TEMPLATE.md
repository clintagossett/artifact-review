# Task XXXXX: Task Title

**GitHub Issue:** #X
**Related Project:** _(optional - link to `projects/YYYY-MM-project-name/` if applicable)_

---

## Resume (Start Here)

**Last Updated:** YYYY-MM-DD (Session N)

### Current Status: [emoji] STATUS DESCRIPTION

**Phase:** What's currently happening or what's next.

### What We Did This Session (Session N)

1. **First thing** - Brief description
2. **Second thing** - Brief description

### Previous Sessions

_(Move session summaries here as new sessions are added)_

### Next Steps

1. **Next action** - Brief description
2. **Following action** - Brief description

---

## Objective

Brief description of what this task accomplishes.

---

## Subtasks

For complex tasks, break work into numbered subtasks. Each subtask gets its own folder with a README defining scope, deliverables, and status.

### Subtask Structure

```
tasks/XXXXX-task-name/
├── README.md                           # Main task file (this template)
├── scripts/                            # Task-level utility/setup/debugging scripts
├── tests/                              # Task-level tests (upleveled from subtasks)
│   ├── package.json                    # E2E dependencies
│   ├── playwright.config.ts
│   ├── unit/                           # Unit tests upleveled from subtasks
│   ├── e2e/                            # E2E tests upleveled from subtasks
│   └── validation-videos/              # GITIGNORED - video output
├── output/                             # Task-level generated artifacts
├── 01_subtask_descriptive-name/
│   ├── README.md                       # Subtask requirements & status
│   ├── scripts/                        # Subtask-specific utility scripts
│   ├── tests/                          # Subtask-specific tests
│   │   ├── unit/                       # Unit tests scoped to this subtask
│   │   └── e2e/                        # E2E tests scoped to this subtask
│   │       └── playwright.config.ts    # Subtask E2E config (inherits from task)
│   ├── output/                         # Subtask deliverables
│   └── *.sql                           # Self-contained SQL (if applicable)
├── 02_subtask_another-name/
│   ├── README.md
│   ├── scripts/
│   ├── tests/
│   │   ├── unit/
│   │   └── e2e/
│   └── output/
└── 03_subtask_third-name/
    ├── README.md
    ├── tests/
    │   ├── unit/
    │   └── e2e/
    └── output/
```

**Important:** Keep all task-related work contained within the task folder. Any utility scripts, debugging tools, or temporary files created during the task must live in the appropriate `scripts/` folder, NOT in the main app/ directory.

### Test Upleveling

Tests start at the subtask level and can be "upleveled" to the task level when:

1. **Broader coverage**: Test validates functionality across multiple subtasks
2. **Integration boundary**: Test validates how subtasks integrate with each other
3. **Regression value**: Test provides ongoing regression protection for the feature

#### How to Uplevel

1. Move test file from `subtask/tests/` to `task/tests/`
2. Update any relative imports/paths
3. Document the uplevel in the subtask README ("Test upleveled to task level")
4. Run the test from its new location to verify it still passes

#### Keep at Subtask Level

- Tests that validate only subtask-specific logic
- Tests that would break if subtask implementation changes
- Exploratory tests used during development

#### Video Recording (Mandatory)

All e2e tests MUST produce video recordings. Configure Playwright with:

```typescript
use: {
  video: 'on',  // MANDATORY - records all tests
  trace: 'on',
}
```

**Videos are gitignored** - they are NOT committed to the repository. They are generated for:
- Human review during development
- Debugging failed tests
- Stakeholder demonstrations

### Subtask README Template

```markdown
# Subtask NN: Descriptive Name

**Parent Task:** XXXXX-task-name
**Status:** OPEN | IN PROGRESS | COMPLETE
**Created:** YYYY-MM-DD
**Completed:** YYYY-MM-DD (when done)

---

## Objective

What this subtask accomplishes.

---

## Files

| File | Description |
|------|-------------|
| `README.md` | This file |
| `output.csv` | Deliverable description |

---

## Requirements

Detailed requirements for the deliverable.

---

## How This Will Be Used

How the output feeds into the next step or final goal.
```

### When to Use Subtasks

- **Multi-phase analysis** - Each phase has distinct deliverables (e.g., data extraction -> analysis -> visualization)
- **Sequential dependencies** - Phase 2 depends on Phase 1 output
- **Agent handoffs** - Clear scope for different sessions/agents to pick up
- **Complex SQL work** - Each query gets its own self-contained file

### Subtask Naming Convention

- Format: `NN_subtask_descriptive-name/`
- Zero-padded numbers: `01_`, `02_`, etc.
- Kebab-case description: `threshold-analysis`, `data-enrichment`

---

## Current State

Description of how things work before this task (if applicable).

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| Option A | ... | ... |
| Option B | ... | ... |

## Decision

Which option was chosen and why.

## Changes Made

- File 1: Description of change
- File 2: Description of change

## Output

List any artifacts produced by this task (in `output/` subfolder or subtask folders).

## Testing

How to verify the changes work correctly.
