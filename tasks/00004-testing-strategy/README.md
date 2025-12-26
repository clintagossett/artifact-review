# Task 00004: Testing Strategy

**GitHub Issue:** #4
**Status:** IN PROGRESS

---

## Resume (Start Here)

**Last Updated:** 2024-12-25 (Session 1)

### Current Status: :white_check_mark: Initial Strategy Defined

**Phase:** Strategy documented. Ready to implement infrastructure and apply to first feature.

### What We Did This Session (Session 1)

1. **Explored testing concerns** - Identified key pain points: test bloat, unclear taxonomy, AI dev workflow needs
2. **Defined three-tier testing system** - Task-level (dev-time), Project-level (promoted), Validation artifacts (video)
3. **Designed task-folder tests structure** - Tests live in task folders, get promoted after review
4. **Completed research** - TDD + AI agents best practices (Kent Beck, Anthropic guidance, community)
5. **Completed research** - Convex-specific testing patterns (convex-test, withIdentity, official docs)
6. **Documented strategy** - Subtask 01 complete with full research findings

### Next Steps

1. **Set up testing infrastructure** - Install convex-test, vitest, playwright
2. **Configure Playwright video recording** - For validation artifacts
3. **Create GitHub Actions workflow** - CI/CD for automated tests
4. **Apply to first feature** - Test the workflow on next task, iterate

---

## Objective

Establish a testing and validation strategy optimized for AI-assisted development that:

- Prevents test bloat and maintenance burden
- Separates dev-time tests from permanent project tests
- Produces video validation artifacts for human review
- Provides clear understanding of when to use each test type

---

## Subtasks

| # | Name | Status | Description |
|---|------|--------|-------------|
| 01 | define-initial-test-strategy | COMPLETE | Document the testing strategy from our TDD expert discussion |

---

## Key Decisions

### Three-Tier Testing System

| Tier | Location | Purpose | Lifespan |
|------|----------|---------|----------|
| **Task-level** | `tasks/XXXXX/tests/` | Dev-time validation by AI | Until promotion review |
| **Project-level** | `convex/__tests__/`, `e2e/critical-paths/` | Prevent regressions | Permanent |
| **Validation artifacts** | `tasks/XXXXX/tests/validation-videos/` | Human proof it works | Archived with task |

### Task-Folder Tests Structure

```
tasks/XXXXX-feature/
├── README.md
├── tests/
│   ├── convex/           # Convex function tests
│   ├── e2e/              # Playwright E2E tests
│   └── validation-videos/ # Recorded validation runs
├── test-report.md        # What was tested, results
└── PROMOTION.md          # Notes on which tests to uplift
```

### Promotion Workflow

1. AI agent builds feature, writes tests in task folder
2. Feature complete → agent creates test-report.md + validation video
3. Developer reviews video + test report
4. Developer decides which tests provide ongoing value
5. Promoted tests copied to main codebase locations
6. Task folder stays as historical record
