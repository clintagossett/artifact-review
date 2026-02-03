# Task 00049: Artifact Version Processing Status - Investigation

## Issue Summary
GitHub Issue #49 proposes adding a `status` field to artifact versions to provide user feedback during upload and processing.

## Current Architecture

### Schema (`app/convex/schema.ts`)

The `artifactVersions` table currently has **no status field**. Key fields:

```typescript
artifactVersions: defineTable({
  artifactId: v.id("artifacts"),
  number: v.number(),
  createdBy: v.id("users"),
  name: v.optional(v.string()),
  fileType: v.string(),        // "html" | "markdown" | "zip"
  entryPoint: v.string(),      // Main file path
  size: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
  createdAt: v.number(),
})
```

### Upload Flows

#### Flow 1: HTML/Markdown (Single File)

```
User selects file
    │
    ▼
useArtifactUpload.uploadFile()
    │
    ├── readFileAsText(file)
    │
    ├── artifacts.create (action)
    │      │
    │      ├── Store blob in ctx.storage
    │      └── Call createInternal (mutation)
    │             ├── Insert artifact
    │             ├── Insert artifactVersion  ← status would go here
    │             └── Insert artifactFile
    │
    └── Return { shareToken }
           │
           ▼
router.push(`/a/${shareToken}`)  ← IMMEDIATE navigation
```

**Location:** `app/convex/artifacts.ts:23-94` (create action), `:100-186` (createInternal mutation)

#### Flow 2: ZIP Files (Multi-step Async)

```
User selects ZIP
    │
    ▼
useArtifactUpload.uploadFile()
    │
    ├── zipUpload.createArtifactWithZip (mutation)
    │      ├── Insert artifact
    │      ├── Insert artifactVersion (entryPoint: "index.html" placeholder)
    │      └── Return uploadUrl, versionId
    │
    ├── fetch(uploadUrl, { body: file })  ← Upload to storage
    │
    ├── zipUpload.triggerZipProcessing (action)
    │      │
    │      └── zipProcessor.processZipFile (internal action)
    │             ├── Load ZIP from storage
    │             ├── Validate (file count, size, forbidden types)
    │             ├── Detect entry point
    │             ├── Extract each file → store → createArtifactFileRecord
    │             ├── markProcessingComplete (updates entryPoint)
    │             └── OR markProcessingError (soft-deletes version)
    │
    └── Return { shareToken }
           │
           ▼
router.push(`/a/${shareToken}`)  ← IMMEDIATE navigation
```

**Key Files:**
- `app/convex/zipUpload.ts` - createArtifactWithZip, addZipVersion, triggerZipProcessing
- `app/convex/zipProcessor.ts` - processZipFile (extraction logic)
- `app/convex/zipProcessorMutations.ts` - createArtifactFileRecord, markProcessingComplete, markProcessingError

### Current Error Handling

On ZIP processing failure (`zipProcessorMutations.ts:59-77`):
```typescript
export const markProcessingError = internalMutation({
  handler: async (ctx, args) => {
    console.error(`ZIP processing error...`);
    // Soft-delete the version - makes it invisible
    await ctx.db.patch(args.versionId, {
      isDeleted: true,
      deletedAt: Date.now(),
    });
  },
});
```

**Problems:**
1. Error message is only logged to console, not stored
2. Version becomes invisible (soft-deleted)
3. User navigates to page with no content
4. No retry mechanism

### Frontend Components

| Component | File | Current Behavior |
|-----------|------|------------------|
| Dashboard upload | `app/src/app/dashboard/page.tsx` | Navigates immediately after uploadFile() returns |
| useArtifactUpload | `app/src/hooks/useArtifactUpload.ts` | Has uploadProgress (fake %) but no status tracking |
| UploadDropzone | `app/src/components/artifacts/UploadDropzone.tsx` | Shows isUploading state only |
| UploadNewVersionDialog | `app/src/components/artifact-settings/UploadNewVersionDialog.tsx` | Shows "Uploading..." during action call |
| ArtifactVersionsTab | `app/src/components/artifact-settings/ArtifactVersionsTab.tsx` | Calls triggerZipProcessing, closes dialog after |

### The Core Problem

For ZIP uploads, the flow is:
1. `createArtifactWithZip` → version record created (user can see it)
2. `triggerZipProcessing` → processes synchronously within the action
3. If processing fails → version soft-deleted, user lands on empty page
4. If processing succeeds → user lands on working page

The `triggerZipProcessing` action **does wait** for processing to complete before returning. However:
- There's no UI feedback during the processing
- On error, the version is silently deleted
- E2E tests have nothing deterministic to wait on

## Proposed Schema Change

Add to `artifactVersions`:

```typescript
// Processing status for async operations
status: v.optional(v.union(
  v.literal("uploading"),
  v.literal("processing"),
  v.literal("ready"),
  v.literal("error")
)),

// Error details when status === "error"
errorMessage: v.optional(v.string()),
```

**Migration:** Existing records have `status: undefined` which should be treated as `"ready"`.

## Processing Flow Changes

### For HTML/Markdown (synchronous)
```
create action called
    → createInternal: insert with status: "ready"
    → Return shareToken
```
Single-file uploads are synchronous, so no intermediate states needed.

### For ZIP (async processing)
```
createArtifactWithZip called
    → Insert version with status: "uploading"
    → Return uploadUrl

Client uploads file to storage
    → (no status change)

triggerZipProcessing called
    → Update version status: "processing"
    → processZipFile runs
        → On success: markProcessingComplete → status: "ready"
        → On failure: markProcessingError → status: "error", errorMessage: "..."
```

## Files to Modify

### Backend
1. `app/convex/schema.ts` - Add status + errorMessage fields
2. `app/convex/zipUpload.ts:64` - Set initial status: "uploading"
3. `app/convex/zipUpload.ts:166` - Add mutation to set status: "processing"
4. `app/convex/zipProcessorMutations.ts:41-52` - markProcessingComplete → set status: "ready"
5. `app/convex/zipProcessorMutations.ts:59-77` - markProcessingError → set status: "error" + errorMessage, **remove soft-delete**
6. `app/convex/artifacts.ts` - Update queries to return status field

### Frontend
1. `app/src/hooks/useArtifactUpload.ts` - Return versionId for status tracking
2. New hook: `useVersionStatus(versionId)` - Subscribe to version status
3. `app/src/app/dashboard/page.tsx` - Wait for status: "ready" before navigating
4. `app/src/components/artifacts/UploadProgress.tsx` - Show processing state
5. `app/src/components/artifact-settings/ArtifactVersionsTab.tsx` - Show error state with retry

## Questions to Resolve

1. **Should failed versions be soft-deleted or kept visible?**
   - Current: Soft-deleted (invisible)
   - Proposed: Keep visible with status: "error"
   - Trade-off: Visible errors vs. orphan cleanup

2. **Cleanup strategy for stuck uploads?**
   - Uploads that never complete (browser closed mid-upload)
   - Options: Scheduled job, user-managed, keep all
   - Recommendation: Scheduled job to mark status: "error" after 10min

3. **Status for single-file uploads?**
   - Current proposal: Just use "ready" since they're synchronous
   - Alternative: Full status flow for consistency

4. **Add index on status field?**
   - Would enable queries like "show all failed uploads"
   - Suggested: `.index("by_status", ["status"])`

## E2E Test Impact

With status field, tests can:
```typescript
// Wait for version to be ready
await page.waitForSelector('[data-version-status="ready"]');
```

Instead of:
```typescript
// Current: Arbitrary wait or navigation timeout
await page.waitForTimeout(5000);
```

## Scope Decision

**In Scope (This Task):**
- Schema: Add `status` + `errorMessage` fields to `artifactVersions`
- Backend: Update ZIP mutations to set status transitions
- Frontend: Subscribe to status, wait for "ready" before navigating
- E2E: Update tests to wait for status indicators

**Deferred (Future Task):**
- Agent HTTP API (`POST /api/v1/artifacts`) - currently synchronous, works fine
- New status polling endpoint for agents
- OpenAPI spec updates

## Next Steps

1. Add status + errorMessage to schema
2. Update `createArtifactWithZip` → status: "uploading"
3. Update `addZipVersion` → status: "uploading"
4. Add mutation to set status: "processing" (called before processZipFile)
5. Update `markProcessingComplete` → status: "ready"
6. Update `markProcessingError` → status: "error" + errorMessage (remove soft-delete)
7. Add query to get version status
8. Frontend: useVersionStatus hook with Convex subscription
9. Frontend: Wait for ready before navigation
10. E2E: Update tests to use `[data-version-status="ready"]`
