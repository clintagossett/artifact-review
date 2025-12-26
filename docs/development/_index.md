# Development Guide

Operational instructions for AI-assisted development. These guides distill testing and logging strategies into actionable commands.

## Guides

| Guide | Purpose |
|-------|---------|
| [workflow.md](./workflow.md) | TDD workflow, task structure, dev cycle |
| [testing-guide.md](./testing-guide.md) | How to write and organize tests |
| [TESTING-QUICK-START.md](./TESTING-QUICK-START.md) | **Quick setup for task-level E2E tests** |
| [logging-guide.md](./logging-guide.md) | How to use structured logging |

## Quick Start

### Before Writing Code

1. Read the task requirements
2. Create test files in `tasks/XXXXX/tests/`
3. Write failing tests first (TDD)

### Development Cycle

```
RED    → Write failing test
GREEN  → Minimal code to pass
REFACTOR → Clean up without breaking tests
REPEAT → Next test
```

### After Feature Complete

1. Run E2E tests (generates `trace.zip` automatically)
2. Copy trace: `cp test-results/*/trace.zip validation-videos/feature-trace.zip`
3. Create `test-report.md` in task folder
4. Hand over for review with:
   - Passing tests (backend + E2E)
   - Validation trace (`trace.zip`)
   - Test report

**Note:** Use Playwright trace.zip, NOT manual video recording. See [TESTING-QUICK-START.md](./TESTING-QUICK-START.md)

## Related

- [Testing Strategy](../../tasks/00004-testing-strategy/01-define-initial-test-strategy/README.md) - Full strategy doc
- [Logging Strategy](../../tasks/00005-logging-strategy/01-define-logging-strategy/README.md) - Full strategy doc
- [ADR 0007: Logging](../architecture/decisions/0007-logging-strategy.md) - Architecture decision
- [Convex Rules](../architecture/convex-rules.md) - Backend coding rules
