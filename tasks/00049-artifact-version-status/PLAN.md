# Task 00049: Artifact Version Processing Status - Implementation Plan

**GitHub Issue:** #49
**Status:** PLANNED
**Created:** 2026-01-31

---

## Summary

This task adds a `status` field to artifact versions to provide user feedback during upload and processing. This enables deterministic UI states and E2E test synchronization.

## Problem Statement

Currently, ZIP uploads have no status tracking:
1. User uploads ZIP and navigates immediately
2. ZIP processing happens asynchronously
3. If processing fails, version is silently soft-deleted
4. User lands on empty/broken page with no feedback
5. E2E tests have no deterministic wait condition

## Solution

Add `status` and `errorMessage` fields to `artifactVersions`:
- `status: "uploading" | "processing" | "ready" | "error"`
- `errorMessage: string` (when status is "error")

## Subtask Overview

| Subtask | Description | Dependencies |
|---------|-------------|--------------|
| 01 | Schema + Backend Mutations | None |
| 02 | Frontend Status Tracking | Subtask 01 |
| 03 | E2E Test Updates | Subtasks 01 + 02 |

## Implementation Flow

```
01-schema-and-mutations/
    |
    v
02-frontend-status-tracking/
    |
    v
03-e2e-test-updates/
```

## Subtask Details

### Subtask 01: Schema and Backend Mutations

**Objective:** Add status field to schema and update all mutations that create/modify artifact versions.

**Key Changes:**
- Schema: Add `status` and `errorMessage` fields
- `createArtifactWithZip`: Set `status: "uploading"`
- `addZipVersion`: Set `status: "uploading"`
- Add new mutation: `updateVersionStatus` (internal)
- `markProcessingComplete`: Set `status: "ready"`
- `markProcessingError`: Set `status: "error"` + `errorMessage`, remove soft-delete
- `artifacts.create` (HTML/MD): Set `status: "ready"` directly

**Files to Modify:**
- `app/convex/schema.ts`
- `app/convex/zipUpload.ts`
- `app/convex/zipProcessorMutations.ts`
- `app/convex/artifacts.ts`

### Subtask 02: Frontend Status Tracking

**Objective:** Create hook to subscribe to version status and update upload flow to wait for ready.

**Key Changes:**
- New hook: `useVersionStatus(versionId)` - subscribes to version status
- Update `useArtifactUpload`: Return versionId, add status subscription
- Create `<UploadStatusIndicator>` component for visual feedback
- Dashboard: Wait for `status: "ready"` before navigation
- Error state: Show error message with retry option

**Files to Create/Modify:**
- `app/src/hooks/useVersionStatus.ts` (new)
- `app/src/hooks/useArtifactUpload.ts`
- `app/src/components/artifacts/UploadStatusIndicator.tsx` (new)
- `app/src/app/dashboard/page.tsx`

### Subtask 03: E2E Test Updates

**Objective:** Update E2E tests to wait for status indicators instead of arbitrary timeouts.

**Key Changes:**
- Add `data-version-status` attribute to viewer components
- Update upload tests to wait for `[data-version-status="ready"]`
- Add tests for error state (forbidden file types)
- Use `/samples/04-invalid/wrong-type/presentation-with-video.zip` for error tests

**Files to Modify:**
- `app/tests/e2e/artifact-workflow.spec.ts`
- Viewer components (to add data attributes)

## Test Strategy

### Unit Tests (Subtask 01)
- Test status transitions: uploading -> processing -> ready
- Test status transitions: uploading -> processing -> error
- Test that HTML/MD uploads go directly to "ready"
- Verify error message is stored correctly

### Integration Tests (Subtask 02)
- Test `useVersionStatus` hook subscription
- Test upload flow completes with ready status
- Test error display when processing fails

### E2E Tests (Subtask 03)
- Test: Upload ZIP, wait for `[data-version-status="ready"]`, verify content
- Test: Upload invalid ZIP, verify `[data-version-status="error"]` shows message
- Test: Upload HTML, verify immediate `[data-version-status="ready"]`

### Sample Files to Use

| Test Case | Sample File |
|-----------|-------------|
| Valid ZIP | `samples/01-valid/zip/charting/v1.zip` |
| Error state | `samples/04-invalid/wrong-type/presentation-with-video.zip` |
| Valid HTML | `samples/01-valid/html/simple-html/v1/index.html` |

## Architectural Decisions

### 1. Keep Failed Versions Visible

**Decision:** Failed versions will have `status: "error"` instead of being soft-deleted.

**Rationale:**
- Users can see what failed and why
- Enables retry functionality
- Maintains audit trail

**Trade-off:** Need to filter out error versions from version switcher (or show with warning indicator).

### 2. Status Field is Optional (Migration Compatible)

**Decision:** `status` field is `v.optional()` - undefined treated as "ready".

**Rationale:**
- Existing records work without migration
- New records always have explicit status

### 3. Synchronous HTML/MD Skip Intermediate States

**Decision:** HTML and Markdown uploads set `status: "ready"` directly.

**Rationale:**
- These uploads are synchronous (no async processing)
- Adding "uploading" state would be misleading
- Simplifies the flow

### 4. No New Index on Status Field (Deferred)

**Decision:** Skip adding `by_status` index for now.

**Rationale:**
- No current query needs to filter by status
- Can add later if "show all failed uploads" feature is needed

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Race condition: navigation before status updated | Frontend polls/subscribes until ready |
| Error versions clutter version list | Filter or show with warning badge |
| Breaking change to frontend components | All changes additive (optional field) |

## Definition of Done

- [ ] Schema updated with status + errorMessage fields
- [ ] All ZIP mutations set appropriate status
- [ ] HTML/MD uploads set status: "ready"
- [ ] Frontend hook subscribes to status changes
- [ ] Upload UI shows processing state
- [ ] Dashboard waits for ready before navigation
- [ ] Error state shows message
- [ ] E2E tests use `[data-version-status]` attribute
- [ ] No arbitrary waits/timeouts in E2E tests
- [ ] All existing tests pass

## Files Summary

### Backend (Subtask 01)
| File | Change |
|------|--------|
| `app/convex/schema.ts` | Add status, errorMessage fields |
| `app/convex/zipUpload.ts` | Set status: "uploading" on create |
| `app/convex/zipProcessorMutations.ts` | Set status on complete/error |
| `app/convex/artifacts.ts` | Set status: "ready" for HTML/MD |

### Frontend (Subtask 02)
| File | Change |
|------|--------|
| `app/src/hooks/useVersionStatus.ts` | New hook |
| `app/src/hooks/useArtifactUpload.ts` | Add status tracking |
| `app/src/components/artifacts/UploadStatusIndicator.tsx` | New component |
| `app/src/app/dashboard/page.tsx` | Wait for ready |

### E2E Tests (Subtask 03)
| File | Change |
|------|--------|
| `app/tests/e2e/artifact-workflow.spec.ts` | Use data-version-status |
| Viewer components | Add data attributes |
