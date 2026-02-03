# Task 00064: Fix Novu Env Var Flow

**Issue:** https://github.com/clintagossett/artifact-review/issues/64

## Problem

Novu credentials were incorrectly synced from shared secrets (`../.env.dev.local`), but Novu orgs are **per-agent** - each agent gets unique credentials from `setup-novu-org.sh`.

This caused Mark's Novu credentials to be overwritten with James's, breaking notification tests.

## Changes Made

### 1. Fixed `scripts/agent-init.sh`
- Removed Novu vars from `sync_shared_secrets()` function
- Novu credentials should NOT come from shared secrets
- Added comment explaining Novu is per-agent

### 2. Fixed `scripts/setup-novu-org.sh`
- Added `update_convex_env_file()` function
- Now writes `NOVU_SECRET_KEY` and `NOVU_API_URL` to `.env.convex.local`
- This makes `setup-novu-org.sh` the single source of truth for per-agent Novu credentials

### 3. Fixed `app/.env.convex.local`
- Restored correct per-agent Novu credentials:
  - `NOVU_SECRET_KEY=cde2a75cf7803a368888ada30265cd34`
  - `NOVU_API_URL=https://api.novu.loc`

### 4. Fixed `app/.env.local`
- Cleaned up duplicate entries
- Restored correct credentials:
  - `NOVU_SECRET_KEY=cde2a75cf7803a368888ada30265cd34`
  - `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=-drIeqFbqyq8`

### 5. Fixed `tests/e2e/notification.spec.ts`
- Reverted `test.fixme()` back to `test()` for tests 1, 2, 3, 5
- Fixed artifact upload navigation issue (now uses click-to-navigate fallback)

## Correct Flow (After Fix)

```
setup-novu-org.sh (creates per-agent Novu org)
    → .env.nextjs.local (NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER, etc.)
    → .env.convex.local (NOVU_SECRET_KEY, NOVU_API_URL)
    → setup-convex-env.sh --sync → Convex runtime
```

### 6. Automated Novu Workflow Sync

Added `sync_novu_workflows()` function to `scripts/start-dev-servers.sh`:
- Runs automatically after Next.js starts
- Waits for bridge endpoint to be ready (up to 30s)
- Syncs workflows via Novu API
- Reports success/failure in startup output

This eliminates the manual sync step that was causing notification tests to fail.

## Remaining Work

### Orchestrator Cleanup (Separate PR)
- [ ] Remove `NOVU_SECRET_KEY` and `NOVU_APPLICATION_IDENTIFIER` from `../.env.dev.local`
- [ ] Update `.env.dev.local.example` with note that Novu is per-agent
- [ ] Update orchestrator `CLAUDE.md` docs

### Deployment Automation (Future)
- [ ] Create standalone `scripts/sync-novu-workflows.sh` for CI/CD
- [ ] Add post-deploy sync step to deployment pipeline

## Test Results After Fix

- **14 passed** (auth, artifact-workflow, agent-api, stripe, visual, smoke tests)
- **4 failed** (notification tests - missing Novu workflow, not env var issue)
- **2 skipped** (comment via text selection)
