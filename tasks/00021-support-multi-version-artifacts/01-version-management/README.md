# Subtask 01: Version Management

**Parent Task:** 00021-support-multi-version-artifacts
**Status:** BACKEND COMPLETE - FRONTEND PENDING
**Created:** 2026-01-01
**Updated:** 2026-01-01

---

## Resume (Start Here)

**Last Updated:** 2026-01-01

### Current Status: BACKEND COMPLETE

**What's Done:**
- Schema field renames (`versionName` → `name`, `versionNumber` → `number`)
- `isLatest` computed field in `getVersions` query
- Comment enforcement in `comments.create` mutation
- All backend functions updated with new field names
- All frontend files updated to use new field names from API
- Unit tests for `isLatest` and comment enforcement (10 tests passing)

**What's NOT Done:**
- Frontend `ArtifactVersionsTab` still uses **mock data** (not connected to backend)
- No real upload/delete/rename functionality in settings page
- This is deferred to **Subtask 02** (Artifact Viewer Updates)

### Files Changed

**Backend (Convex):**
- `app/convex/schema.ts` - Field renames + updated index
- `app/convex/artifacts.ts` - All functions + `isLatest` computation
- `app/convex/zipUpload.ts` - Field renames
- `app/convex/comments.ts` - Comment enforcement added
- `app/convex/http.ts` - API parameter rename

**Frontend:**
- `app/src/hooks/useArtifactUpload.ts` - Interface + param renames
- `app/src/components/artifact/VersionSwitcher.tsx`
- `app/src/components/artifact/ArtifactHeader.tsx`
- `app/src/components/artifact/ArtifactViewer.tsx`
- `app/src/components/artifact/ArtifactViewerPage.tsx`
- `app/src/components/artifact/DocumentViewer.tsx`
- `app/src/components/artifact-settings/ArtifactVersionsTab.tsx`
- `app/src/components/artifacts/ArtifactCard.tsx`
- `app/src/components/artifacts/ArtifactList.tsx`
- Various test files

**New Test Files:**
- `app/convex/__tests__/isLatest.test.ts` (5 tests)
- `app/convex/__tests__/comment-latest-enforcement.test.ts` (5 tests)

### Test Results

```
✓ convex/__tests__/isLatest.test.ts (5 tests)
✓ convex/__tests__/comment-latest-enforcement.test.ts (5 tests)
Test Files: 2 passed
Tests: 10 passed
```

**Note:** Some pre-existing tests fail due to `blob.arrayBuffer` issue in convex-test (unrelated to this task).

---

## Objective

Complete the backend logic and UI for managing artifact versions: align code with schema, add `isLatest` computation, enforce comment controls, and ensure frontend supports version management.

---

## Completed Work

### 1. Schema Field Renames ✅

| Old Field | New Field | Location |
|-----------|-----------|----------|
| `versionName` | `name` | `artifactVersions` table |
| `versionNumber` | `number` | `artifactVersions` table |

Updated index: `by_artifact_version` now uses `["artifactId", "number"]`

### 2. `isLatest` Computation ✅

Added to `getVersions` query (`artifacts.ts:704-753`):

```typescript
const versions = await ctx.db.query("artifactVersions")
  .withIndex("by_artifact_active", q =>
    q.eq("artifactId", args.artifactId).eq("isDeleted", false))
  .order("desc")
  .collect();

const latestId = versions[0]?._id;
return versions.map(v => ({
  ...v,
  isLatest: v._id === latestId,
}));
```

### 3. Comment Enforcement ✅

Added to `comments.create` mutation (`comments.ts`):

```typescript
// Check if latest version (Task 00021)
const latestVersion = await ctx.db
  .query("artifactVersions")
  .withIndex("by_artifact_active", (q) =>
    q.eq("artifactId", version.artifactId).eq("isDeleted", false))
  .order("desc").first();

if (!latestVersion || version._id !== latestVersion._id) {
  throw new Error("Comments are only allowed on the latest version");
}
```

### 4. Frontend Field Name Updates ✅

All frontend components updated to use `number` instead of `versionNumber` when accessing version data from the API. Component prop names kept as `versionNumber` where it makes sense for clarity.

### 5. Unit Tests ✅

**`isLatest.test.ts`:**
- Single version marked as latest
- Highest version number is latest
- Latest updates when version deleted
- Empty array when all deleted
- Handles gaps in version numbers

**`comment-latest-enforcement.test.ts`:**
- Comments allowed on latest version
- Comments rejected on old version
- Works after latest version deleted
- Clear error message returned

---

## Remaining Work (Subtask 02)

The `ArtifactVersionsTab` component (`app/src/components/artifact-settings/ArtifactVersionsTab.tsx`) currently uses **mock data**. It needs to be connected to real backend APIs:

| Feature | Backend API | Frontend Status |
|---------|-------------|-----------------|
| List versions | `getVersions` query | Uses mock data |
| Upload new version | `addVersion` action | Not connected |
| Rename version | `updateName` mutation | Not connected |
| Delete version | `softDeleteVersion` mutation | Not connected |
| Show "Latest" badge | `isLatest` field | Not implemented |

This work is part of **Subtask 02: Artifact Viewer Updates**.

---

## Technical Notes

### Backend APIs Ready for Frontend

| API | Purpose | Returns |
|-----|---------|---------|
| `artifacts.getVersions` | List all versions | Array with `isLatest` flag |
| `artifacts.addVersion` | Upload new version | `{ versionId, number }` |
| `artifacts.updateName` | Rename version | `null` |
| `artifacts.softDeleteVersion` | Delete version | `null` |
| `artifacts.getLatestVersion` | Get latest version | Version object |

### Convex Rules Reminder

- **ALWAYS** use `withIndex`, **NEVER** use `filter`
- **ALWAYS** include `args` and `returns` validators
- Use `v.null()` for void returns
- Table is `artifactVersions`, not `versions`
- Field is `isDeleted`, not `deleted`

---

## Next Steps

1. **Subtask 02**: Connect `ArtifactVersionsTab` to real backend APIs
2. Add "Latest" badge to version list using `isLatest` from query
3. Add version dropdown to artifact viewer
4. Show banner on old versions indicating comments are disabled
5. E2E tests with validation videos
