# Task 00049: Artifact Version Processing Status

**GitHub Issue:** #49
**Status:** PLANNED
**Created:** 2026-01-31

---

## Resume (Start Here)

**Last Updated:** 2026-01-31 (Session 1)

### Current Status: Planning Complete

**Phase:** Implementation plan created, ready for TDD development.

### What We Did This Session (Session 1)

1. **Investigation** - Analyzed current architecture, upload flows, and identified gaps
2. **Plan Created** - Designed implementation across 3 subtasks
3. **Subtask READMEs** - Created detailed instructions for each subtask

### Next Steps

1. **Start Subtask 01** - Schema and backend mutations (TDD)
2. **Then Subtask 02** - Frontend status tracking
3. **Finally Subtask 03** - E2E test updates

---

## Objective

Add a `status` field to artifact versions to provide user feedback during upload and processing, enabling deterministic UI states and E2E test synchronization.

---

## Subtasks

| # | Subtask | Status | Description |
|---|---------|--------|-------------|
| 01 | [schema-and-mutations](./01-schema-and-mutations/) | OPEN | Add status field, update backend mutations |
| 02 | [frontend-status-tracking](./02-frontend-status-tracking/) | OPEN | Create hook, update upload flow |
| 03 | [e2e-test-updates](./03-e2e-test-updates/) | OPEN | Update tests to use status indicators |

### Dependency Graph

```
01-schema-and-mutations
        |
        v
02-frontend-status-tracking
        |
        v
03-e2e-test-updates
```

---

## Current State

ZIP uploads have no status tracking:
- User uploads ZIP and navigates immediately
- Processing happens asynchronously
- On failure, version is silently soft-deleted
- User lands on empty/broken page
- E2E tests use arbitrary timeouts

---

## Decision

Add `status` and `errorMessage` fields to `artifactVersions`:

```typescript
status: v.optional(v.union(
  v.literal("uploading"),
  v.literal("processing"),
  v.literal("ready"),
  v.literal("error")
)),
errorMessage: v.optional(v.string()),
```

See [PLAN.md](./PLAN.md) for full implementation details.

---

## Key Documents

| Document | Purpose |
|----------|---------|
| [PLAN.md](./PLAN.md) | Full implementation plan with architecture decisions |
| [investigation.md](./investigation.md) | Initial research and current state analysis |
| [01-schema-and-mutations/README.md](./01-schema-and-mutations/README.md) | Backend subtask details |
| [02-frontend-status-tracking/README.md](./02-frontend-status-tracking/README.md) | Frontend subtask details |
| [03-e2e-test-updates/README.md](./03-e2e-test-updates/README.md) | E2E test subtask details |

---

## Changes to Make

### Backend
- `app/convex/schema.ts` - Add status, errorMessage fields
- `app/convex/zipUpload.ts` - Set status: "uploading"
- `app/convex/zipProcessor.ts` - Set status: "processing"
- `app/convex/zipProcessorMutations.ts` - Set status on complete/error
- `app/convex/artifacts.ts` - Set status: "ready" for HTML/MD

### Frontend
- `app/src/hooks/useVersionStatus.ts` - New subscription hook
- `app/src/hooks/useArtifactUpload.ts` - Integrate status tracking
- `app/src/components/artifacts/UploadStatusIndicator.tsx` - New component
- `app/src/app/dashboard/page.tsx` - Wait for ready

### E2E Tests
- `app/tests/e2e/artifact-workflow.spec.ts` - Use data-version-status
- Viewer components - Add data attributes

---

## Testing

### Sample Files

| Test Case | Sample |
|-----------|--------|
| Valid ZIP | `samples/01-valid/zip/charting/v1.zip` |
| Error state | `samples/04-invalid/wrong-type/presentation-with-video.zip` |
| Valid HTML | `samples/01-valid/html/simple-html/v1/index.html` |

### Test Approach

- Unit tests for status transitions (Subtask 01)
- Integration tests for hooks (Subtask 02)
- E2E tests with `[data-version-status]` waits (Subtask 03)
