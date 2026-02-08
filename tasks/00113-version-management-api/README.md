# Task 00113: Agent API Version Management

**Issue:** #113
**Status:** In Progress
**Branch:** james/dev-work

## Summary

Agents can create artifacts (with v1) but cannot publish subsequent versions, list versions, rename, soft-delete, or restore them via the API. This blocks launch since agents need full version management to iterate on artifacts based on reviewer feedback.

## Endpoints Added

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/artifacts/{shareToken}/versions` | List active versions |
| POST | `/api/v1/artifacts/{shareToken}/versions` | Publish new version |
| PATCH | `/api/v1/artifacts/{shareToken}/versions/{n}` | Rename version |
| DELETE | `/api/v1/artifacts/{shareToken}/versions/{n}` | Soft-delete version |
| POST | `/api/v1/artifacts/{shareToken}/versions/{n}/restore` | Restore version |

## Files Modified

- `app/convex/agentApi.ts` — 4 new internal functions
- `app/convex/http.ts` — Extended GET/POST/PATCH/DELETE handlers
- `app/convex/lib/openapi.ts` — Added version endpoint specs

## Files Created

- `app/convex/__tests__/agentApi-versions.test.ts` — Unit tests
- `app/tests/e2e/agent-api-versions.spec.ts` — E2E tests

## Design Decisions

- All write endpoints are owner-only (same pattern as existing share/access endpoints)
- Version numbers are plain integers in URLs (not prefixed with `v`)
- Reuses existing `artifacts.addVersionInternal` for creating versions
- Last-active-version protection prevents deleting the only remaining version
- Soft-delete cascades to `artifactFiles` (and restore cascades back)
