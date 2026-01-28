# Session Resume - Task 00043: Novu Comment Notifications

## Session Date: 2026-01-27

## Current Status: BLOCKED on Issue #45

Task 43 (Novu notifications) is blocked because E2E tests cannot create artifacts. The ZIP processing in Node actions fails due to a self-hosted Convex infrastructure issue.

## Blocking Issue

**GitHub Issue:** https://github.com/clintagossett/artifact-review/issues/45

**Problem:** Node actions (`"use node"` directive) cannot access Convex storage. Both `ctx.storage.getUrl()` + `fetch()` and `ctx.storage.get()` fail with "fetch failed" errors.

**Root Cause:** The Node executor subprocess in self-hosted Convex Docker has different networking than V8 isolates. Storage access requires HTTP calls that fail from inside the Node executor.

## What Was Accomplished This Session

### 1. Auth Issues Fixed
- The auth state propagation issue from previous sessions was resolved
- Admin key derivation fixed in `start-dev-servers.sh`

### 2. Storage Access Fix Attempted
- Changed `zipProcessor.ts` from `getUrl()` + `fetch()` to `storage.get()` directly
- This also failed - `storage.get()` uses HTTP internally in Node actions

### 3. Research Completed
- Identified this as a known issue with self-hosted Convex Node actions
- Found related GitHub issues (#177, #179) in convex-backend repo
- Documented potential solutions in issue #45

## Subtask Status

| Subtask | Status |
|---------|--------|
| 01-subscriber-sync | ✅ Complete |
| 02-novu-workflow-setup | ✅ Complete |
| 03-e2e-notification-tests | ⛔ Blocked (Issue #45) |
| 04-email-digest-integration | ⏳ Not started |

## Files Modified

- `app/convex/zipProcessor.ts` - Changed to use `ctx.storage.get()` (still fails)
- `app/convex/zipUpload.ts` - Added structured logging
- `app/convex/lib/logger.ts` - Already existed, used for debugging

## Next Steps

1. **Resolve Issue #45** - Fix Node action storage access in self-hosted setup
2. **Resume E2E tests** - Once artifacts can be created, run notification tests
3. **Complete subtask 03** - Validate in-app notifications work
4. **Implement subtask 04** - Email digest integration

## Commands to Resume

```bash
# Verify infrastructure is running
tmux has-session -t mark-convex-dev && echo "OK" || ./scripts/start-dev-servers.sh

# Run the blocked test (will fail until #45 is fixed)
cd app && npx playwright test tests/e2e/artifact-workflow.spec.ts --project=chromium -g "upload"

# Check Convex logs
tmux capture-pane -t mark-convex-dev -p -S -50 | tail -30
```
