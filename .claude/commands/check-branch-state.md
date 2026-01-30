# /check-branch-state - Detect Branch State and Validate Baseline

Determine if this is new development or work-in-progress, then take appropriate action. This is **Step 2** of the session startup flow.

**Prerequisite:** `/ready-environment` must pass first.

## Reference Docs

- **Testing:** See `docs/development/testing-guide.md`
- **TDD Workflow:** See `docs/development/workflow.md`

## Branch States

| State | Criteria | Action |
|-------|----------|--------|
| `main` | On main/master branch | Warning: create feature branch first |
| `new` | Feature branch, no commits ahead of main | Run full tests to validate baseline |
| `wip` | Feature branch with commits ahead of main | Load context, report status |

## Workflow

### 1. Detect State

```bash
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  STATE="main"
elif git log main..HEAD --oneline | head -1 | grep -q .; then
  STATE="wip"
else
  STATE="new"
fi
```

### 2. Handle State

**If `main`:** Warn user to create feature branch.

**If `new`:** Run full test suite. All must pass before starting work.
```bash
cd app && npm test
```
- All green → Ready to dev
- Any red → STOP. Don't start new work on broken baseline.

**If `wip`:** Load context and report.
```bash
git log main..HEAD --oneline
cat SESSION-RESUME.md 2>/dev/null
git status --short
```

## Key Principle

**New dev requires clean baseline.** Any test failures before your changes means the baseline is broken - fix it first or escalate.
