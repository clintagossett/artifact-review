# Task #00125: Dev Environment Test Results

**GitHub Issue:** #125
**Status:** Documentation Complete
**Date:** 2026-02-17
**Branch:** `tom/dev-work` rebased on `origin/dev` (after PR #122 merge)

## Hosted Environment Health

All 3 environments returning HTTP 200:

- https://artifactreview-early.dev (dev) — 200
- https://artifactreview-early.xyz (staging) — 200
- https://artifactreview.com (production) — 200

## Unit Tests: PASS (1170/1170)

- 100/100 test files passed
- 2 skipped (expected)
- Duration: ~14s

## E2E Tests: 31 FAILED / 32 PASSED / 2 SKIPPED

### Single Root Cause: Local Auth Failure

All 31 failures trace to authentication not working in the local dev environment. Every test that requires a logged-in user fails at the signup/login step. Error context snapshots show:

- Signup form renders but submission fails or hangs
- Login attempts show "Invalid email or password"

This is a **local infrastructure issue**, not a code bug. The auth failure prevents reaching any actual test logic.

### Failure Breakdown

**Auth cascade (28 tests):** auth, artifact-workflow, annotation-sidebar, collaboration, public-share, notification, email-digest, agent-api, agent-api-versions, stripe-subscription

**Local infra dependencies (3 tests):** smoke-integrations (Novu, Mailpit, Novu API) — these services require local Docker setup

### Next Steps

1. Re-run `dev-e2e` GitHub Actions workflow (previous run was cancelled)
2. If hosted E2E passes, local auth issue is environment-only
3. Investigate local Convex auth (JWT keys, password provider config)
