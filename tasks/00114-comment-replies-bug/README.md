# Task 00114: Fix getReplies query failure for agent-created replies

**Issue:** #114
**Status:** Complete
**Branch:** james/dev-work

## Problem

Production bug: After an agent posts a comment reply via the Agent API, all clients viewing that artifact get a Convex query error from `commentReplies:getReplies`. The commenting experience is completely broken for any artifact with agent replies.

## Root Cause

The `getReplies` query in `commentReplies.ts` uses `...reply` to spread all document fields into its response. API-created replies include `agentId` and `agentName` fields (set by `agentApi.ts:createReply`), but the query's `returns` validator didn't declare these fields. Convex's strict `v.object()` validator rejects objects with undeclared fields, causing the query to fail.

The schema correctly includes both fields — the issue was purely in the return validator.

## Fix

Added `agentId` and `agentName` to the `getReplies` return validator in `commentReplies.ts`.

## Files Modified

- `app/convex/commentReplies.ts` — Added 2 fields to `getReplies` return validator
- `app/tests/convex-integration/comments.test.ts` — Added regression test

## Verification

- Regression test creates a reply with `agentId`/`agentName` fields and verifies `getReplies` succeeds
- All existing comment tests continue to pass
