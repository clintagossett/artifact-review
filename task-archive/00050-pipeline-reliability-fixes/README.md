# Task 00050: Pipeline Reliability Fixes

**Issue:** #50
**Status:** Complete
**Created:** 2026-01-31

## Problem Statement

Task 48 (agent-init overhaul) used the agentic task-pipeline and exposed critical reliability issues. The pipeline produced 97 files (1.0 MB) over 201 minutes but the resulting code was broken - requiring a 2-minute direct fix (Task 49).

## Issues Identified

| Issue | Root Cause | Fix Implemented |
|-------|------------|-----------------|
| Duplicate artifacts | No check for existing task dir | Added deduplication check in `run.py` |
| TDD specs not executed | TDD wrote tests but never ran them | Added RED phase verification |
| Timeouts ignored | `run_subtask()` result not checked | Added failure threshold (default: 3) |
| No integration test | Pipeline ended after subtask loop | Added Phase 4: Integration test |
| No real-world validation | Never tested actual deliverable | Added Phase 5: Smoke test |
| Artifact bloat (40KB specs) | No size limits | Added MAX_SPEC_LINES=100 |
| Code in markdown | Tests inline in .md files | Prompts enforce code in `.test.*` files |
| Wasted exploration | Each agent re-explored codebase | Added `reference_files` in subtasks |

## Changes Made

### `orchestrator.py`
- Added `max_failures` parameter (default: 3)
- Track failure count during subtask loop
- Stop pipeline when failure threshold exceeded
- Check TDD/Executor status for timeout/error
- Added Phase 4: `run_integration_test()` - runs after all subtasks
- Added Phase 5: `run_smoke_test()` - validates deliverable
- Save integration/smoke test output to task directory

### `agents/planner.py`
- Updated prompt to capture `reference_files` for each subtask
- Enforces brief descriptions (max 200 words)
- Points to existing code instead of documenting patterns

### `agents/tdd.py`
- Added `_format_reference_files()` - includes refs in prompt
- Added `MAX_SPEC_LINES = 100` limit
- Added `_enforce_size_limits()` - truncates bloated specs
- Detects code blocks in markdown (anti-pattern)
- Updated prompt: code in `.test.*` files, not markdown
- Added `_verify_red_phase()` - runs tests to confirm they fail
- Returns `status: "red_verified"` or `"red_not_verified"`

### `agents/executor.py`
- Added `_format_reference_files()` - includes refs in prompt
- Added `MAX_NOTES_LINES = 50` limit
- Added `_enforce_size_limits()` - truncates bloated notes
- Added `_verify_green_phase()` - runs tests to confirm they pass
- Returns `status: "green_verified"` or `"green_not_verified"`

### `run.py`
- Check for existing task directory before creating new one
- Offer to resume existing task (prevents duplicates)
- Added `--max-failures` argument (default: 3, 0=unlimited)

## New Pipeline Flow

```
Phase 1: ARCHITECT (opus)
    ├── Analyzes issue
    ├── Explores codebase
    └── Outputs: analysis.md, codebase-notes.md

Phase 2: PLANNER (sonnet)
    ├── Reads architect analysis
    ├── Captures reference_files for each subtask
    └── Outputs: plan.md, subtasks.json (with reference_files)

Phase 3: SUBTASK LOOP (for each subtask)
    ├── TDD Agent
    │   ├── Reads reference_files (no re-exploration!)
    │   ├── Writes brief test-spec.md (max 100 lines)
    │   ├── Writes executable tests/*.test.* files
    │   └── Verifies RED: tests fail as expected
    │
    └── Executor Agent
        ├── Reads reference_files
        ├── Implements minimal code
        ├── Writes brief implementation-notes.md (max 50 lines)
        └── Verifies GREEN: tests pass

    [Stop if failure_count >= max_failures]

Phase 4: INTEGRATION TEST
    ├── Runs full test suite
    └── Verifies subtasks don't break each other

Phase 5: SMOKE TEST
    ├── Runs smoke-test.sh if present
    └── Validates actual deliverable works
```

## Acceptance Criteria

- [x] Single task directory per task (no parallel streams)
- [x] TDD phase executes tests and verifies failure before handoff
- [x] Executor phase executes tests and verifies pass before completion
- [x] Timeout/failure threshold stops pipeline with clear error
- [x] Integration test phase runs after subtask loop
- [x] Smoke test validates actual deliverable works
- [x] Artifact size limits enforced (100 lines test-spec, 50 lines notes)
- [x] Code in code files, not markdown
- [x] Reference files captured by Planner, used by TDD/Executor
- [x] Pipeline can be resumed from checkpoint after failure (existing)

## Token Savings Estimate

Based on Task 48 metrics:
- Test specs reduced: 342KB → ~50KB (size limits)
- Implementation notes reduced: 105KB → ~30KB (size limits)
- Re-exploration eliminated: ~60K tokens saved
- **Total: ~150K+ tokens saved per pipeline run**
