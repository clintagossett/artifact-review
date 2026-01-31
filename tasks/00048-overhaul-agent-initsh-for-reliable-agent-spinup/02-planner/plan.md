# Implementation Plan: Agent Init Overhaul

**Task:** #48 - Agent Init Script Overhaul
**Goal:** Fix configuration generation, port mismatches, and ensure reliable first-time setup

## Overview

This plan breaks the agent-init overhaul into 15 sequential subtasks. Each subtask follows TDD:
1. Write test first (in `tasks/00048-agent-init-overhaul/tests/`)
2. Implement minimal code to pass
3. Validate and refactor

## Phase 1: Configuration Generation (Subtasks 1-4)

### Subtask 01: Create config.json parser utility
- **Goal:** Extract port mappings and agent config from orchestrator config.json
- **Test:** Verify parser reads config.json and returns structured data
- **Deliverable:** `scripts/lib/parse-config.sh` with port extraction functions

### Subtask 02: Create .env.docker.local generator
- **Goal:** Generate .env.docker.local from config.json (replace current logic)
- **Test:** Verify generated file has correct ports matching config.json
- **Deliverable:** `scripts/lib/generate-env-docker.sh`

### Subtask 03: Create .env.nextjs.local generator
- **Goal:** Generate .env.nextjs.local with NO placeholders, correct ports
- **Test:** Verify no "YOUR_USERNAME", correct NOVU_APP_URL, correct mkcert path
- **Deliverable:** `scripts/lib/generate-env-nextjs.sh`

### Subtask 04: Create master generate-all-env.sh script
- **Goal:** Orchestrate all env file generation from single source of truth
- **Test:** Verify all 4 env files created correctly from config.json
- **Deliverable:** `scripts/generate-all-env.sh` (calls subtask 2-3 generators)

## Phase 2: Health Checks & Reliability (Subtasks 5-7)

### Subtask 05: Create Docker health check utility
- **Goal:** Wait for Docker containers to be healthy before proceeding
- **Test:** Verify waits for containers, times out appropriately
- **Deliverable:** `scripts/lib/wait-for-healthy.sh`

### Subtask 06: Create dev server health check
- **Goal:** Verify Convex and Next.js are responding on correct endpoints
- **Test:** Verify checks both services, retries, times out
- **Deliverable:** `scripts/lib/check-dev-servers.sh`

### Subtask 07: Create orchestrator connectivity check
- **Goal:** Verify orchestrator proxy is routing correctly
- **Test:** Verify checks *.loc domains resolve and respond
- **Deliverable:** `scripts/lib/check-orchestrator.sh`

## Phase 3: Convex Configuration (Subtasks 8-9)

### Subtask 08: Add RESEND_API_KEY to setup-convex-env.sh
- **Goal:** Ensure Resend API key is set in Convex environment
- **Test:** Verify setup-convex-env.sh sets RESEND_API_KEY from .env.nextjs.local
- **Deliverable:** Updated `scripts/setup-convex-env.sh`

### Subtask 09: Add Convex restart after env changes
- **Goal:** Kill and restart Convex dev tmux session after env sync
- **Test:** Verify tmux session killed and restarted after env changes
- **Deliverable:** Updated `scripts/setup-convex-env.sh` with restart logic

## Phase 4: Prerequisites & Validation (Subtasks 10-11)

### Subtask 10: Add mkcert to prerequisites check
- **Goal:** Verify mkcert is installed before attempting to use cert paths
- **Test:** Verify prereq check fails gracefully if mkcert missing
- **Deliverable:** Updated prerequisite check in `scripts/agent-init.sh`

### Subtask 11: Create end-to-end smoke test
- **Goal:** Validate entire setup after agent-init completes
- **Test:** Verify can hit all endpoints, auth works, Novu accessible
- **Deliverable:** `scripts/lib/smoke-test.sh`

## Phase 5: Integration & Error Handling (Subtasks 12-14)

### Subtask 12: Integrate all utilities into agent-init.sh
- **Goal:** Replace current logic with new utilities from subtasks 1-11
- **Test:** Run full agent-init.sh and verify all steps complete
- **Deliverable:** Refactored `scripts/agent-init.sh`

### Subtask 13: Add rollback on failure
- **Goal:** If any step fails, restore previous env files
- **Test:** Verify rollback restores .env.*.local.backup files
- **Deliverable:** Backup/restore logic in `scripts/agent-init.sh`

### Subtask 14: Add --check mode improvements
- **Goal:** Enhanced status reporting showing all config sources
- **Test:** Verify --check shows ports from config.json vs actual env files
- **Deliverable:** Updated `scripts/agent-init.sh --check`

## Phase 6: Documentation (Subtask 15)

### Subtask 15: Update documentation
- **Goal:** Document new behavior, troubleshooting, and configuration flow
- **Test:** Manual review - docs match implementation
- **Deliverables:**
  - Updated `CLAUDE.md` (remove manual setup, reference agent-init.sh)
  - Updated `docs/setup/local-infrastructure.md` (config.json as source of truth)
  - Updated `docs/setup/troubleshooting.md` (new error scenarios)

## Success Criteria

- ✅ All env files generated from config.json (single source of truth)
- ✅ No hardcoded ports or placeholders in generated files
- ✅ RESEND_API_KEY set in Convex environment
- ✅ Health checks prevent premature continuation
- ✅ Rollback on failure protects existing config
- ✅ --check mode shows comprehensive status
- ✅ All tests pass
- ✅ Documentation updated

## Testing Strategy

Each subtask has unit tests in:
```
tasks/00048-agent-init-overhaul/tests/unit/
  ├── 01-parse-config.test.sh
  ├── 02-generate-env-docker.test.sh
  ├── 03-generate-env-nextjs.test.sh
  └── ...
```

Integration test:
```
tasks/00048-agent-init-overhaul/tests/e2e/
  └── full-agent-init.test.sh
```

## Execution Order

Subtasks must be completed sequentially (1 → 2 → 3 → ... → 15).
Dependencies are explicit in subtasks.json.

## Estimated Effort

- Phase 1 (Config Generation): ~4 subtasks
- Phase 2 (Health Checks): ~3 subtasks  
- Phase 3 (Convex): ~2 subtasks
- Phase 4 (Prerequisites): ~2 subtasks
- Phase 5 (Integration): ~3 subtasks
- Phase 6 (Documentation): ~1 subtask

**Total: 15 subtasks**