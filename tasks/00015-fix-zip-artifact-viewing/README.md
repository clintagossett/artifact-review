# Task 00015: Fix ZIP Artifact Viewing

**Status:** Planning
**Priority:** CRITICAL
**Created:** 2025-12-27

## Problem Statement

Multi-file HTML ZIP uploads are not displaying. When users upload a ZIP file containing HTML and assets, the artifact viewer shows nothing or errors because the files are not being served.

## Root Cause Analysis

### What I Found

1. ✅ **HTTP Router Exists** (`app/convex/http.ts`)
   - Route: `/artifact/{shareToken}/v{version}/{filePath}`
   - Handles both inline HTML and ZIP files
   - For ZIPs: queries `artifactFiles` table to find individual files
   - Fetches files from Convex storage and serves them

2. ✅ **ZIP Processor Exists** (`app/convex/zipProcessor.ts`)
   - `processZipFile` action extracts ZIP contents
   - Auto-detects entry point (index.html, main.html, or first HTML file)
   - Stores each file individually in `artifactFiles` table
   - Uses `zipProcessorMutations` to store files and mark completion

3. ✅ **Schema Ready** (`app/convex/schema.ts`)
   - `artifactFiles` table with `by_version_path` index for O(1) lookups
   - Supports `versionId`, `filePath`, `storageId`, `mimeType`

4. ❌ **Frontend Upload Incomplete** (`app/src/hooks/useArtifactUpload.ts`)
   - For HTML/Markdown: reads content and passes to `artifacts.create` ✅
   - For ZIP: only passes metadata, **does NOT upload the actual file** ❌
   - No call to upload ZIP to Convex storage
   - No trigger for `processZipFile` action

5. ❌ **Backend Upload Missing** (`app/convex/artifacts.ts`)
   - `artifacts.create` mutation creates artifact + version records ✅
   - **Does NOT handle ZIP file upload** ❌
   - **Does NOT trigger ZIP processing** ❌
   - No mutation/action to generate upload URL for ZIP files

### The Gap

**The ZIP file upload and processing pipeline is disconnected:**

```
Frontend (useArtifactUpload)
  ↓
  Creates artifact metadata ✅
  ↓
  ⚠️  MISSING: Upload ZIP to storage
  ↓
  ⚠️  MISSING: Trigger processZipFile action
  ↓
Backend (zipProcessor)
  → Would extract files ✅
  → Would store in artifactFiles ✅
  → Would set entryPoint ✅
  BUT IS NEVER CALLED ❌
```

**Result:** When HTTP router tries to serve files, `artifactFiles` table is empty, so nothing displays.

## What Needs to Be Built

### 1. Backend: ZIP Upload Mutation/Action

**File:** `app/convex/artifacts.ts` or new `app/convex/zipUpload.ts`

**Needed Functions:**

| Function | Type | Purpose |
|----------|------|---------|
| `generateZipUploadUrl` | mutation | Generate upload URL for client to POST ZIP file |
| `processUploadedZip` | action | After upload, trigger `processZipFile` |
| `createArtifactWithZip` | mutation | Create artifact + version, return upload URL + IDs |

**Flow:**
```typescript
1. Client calls `createArtifactWithZip(title, description, fileSize, entryPoint?)`
2. Backend:
   a. Creates artifact record
   b. Creates artifactVersion record with fileType="zip"
   c. Generates upload URL via ctx.storage.generateUploadUrl()
   d. Returns { uploadUrl, artifactId, versionId, shareToken }
3. Client uploads ZIP file to uploadUrl
4. Client calls `processUploadedZip(versionId, storageId)`
5. Backend triggers internal.zipProcessor.processZipFile(versionId, storageId)
6. ZIP processor extracts files and stores them
```

### 2. Frontend: Complete ZIP Upload Flow

**File:** `app/src/hooks/useArtifactUpload.ts`

**Changes Needed:**

```typescript
// Current (broken):
if (fileType === "zip") {
  const result = await createArtifact({
    title,
    description,
    fileType: "zip",
    entryPoint,
    fileSize: file.size,
  });
  return result; // ❌ ZIP file never uploaded!
}

// New (working):
if (fileType === "zip") {
  // Step 1: Create artifact and get upload URL
  const { uploadUrl, versionId, artifactId, shareToken } =
    await createArtifactWithZip({
      title,
      description,
      fileSize: file.size,
      entryPoint,
    });

  setUploadProgress(40);

  // Step 2: Upload ZIP file to storage
  const uploadResult = await fetch(uploadUrl, {
    method: "POST",
    body: file,
  });

  const { storageId } = await uploadResult.json();
  setUploadProgress(70);

  // Step 3: Trigger ZIP processing
  await processUploadedZip({ versionId, storageId });

  setUploadProgress(100);
  return { artifactId, versionId, versionNumber: 1, shareToken };
}
```

### 3. Missing Backend Mutations

**File:** `app/convex/zipProcessorMutations.ts` (referenced in zipProcessor but may not exist)

Need to verify/create:
- `storeExtractedFile` - Stores individual file from ZIP in artifactFiles table
- `markProcessingComplete` - Updates version with entryPoint
- `markProcessingError` - Marks version as failed

## Implementation Plan

### Phase 1: Verify Existing Infrastructure (30 min)

**Goal:** Confirm what exists vs what's missing

- [ ] Check if `zipProcessorMutations.ts` exists
- [ ] Verify `storeExtractedFile`, `markProcessingComplete`, `markProcessingError` exist
- [ ] Test `zipProcessor.processZipFile` with manual data
- [ ] Verify `artifactFiles` table can be queried by HTTP router

### Phase 2: Build ZIP Upload Backend (2 hours)

**Goal:** Complete the backend upload pipeline

- [ ] Create `generateZipUploadUrl` mutation
- [ ] Create `createArtifactWithZip` mutation (combines create + upload URL)
- [ ] Create `processUploadedZip` action to trigger processing
- [ ] Write unit tests for new mutations/actions
- [ ] Test end-to-end with manual Convex dashboard operations

### Phase 3: Fix Frontend Upload Hook (1 hour)

**Goal:** Complete the frontend upload flow

- [ ] Update `useArtifactUpload.ts` to handle ZIP upload
- [ ] Add progress tracking (upload + processing steps)
- [ ] Add error handling for upload failures
- [ ] Update TypeScript types
- [ ] Write unit tests for ZIP upload flow

### Phase 4: Integration Testing (1 hour)

**Goal:** Verify complete flow works end-to-end

- [ ] Upload single-file HTML (regression test - should still work)
- [ ] Upload ZIP with index.html at root
- [ ] Upload ZIP with index.html in subfolder
- [ ] Upload ZIP with main.html (no index.html)
- [ ] Upload ZIP with multiple HTML files
- [ ] Verify files serve correctly via HTTP router
- [ ] Verify multi-page navigation works
- [ ] Check browser console for errors
- [ ] Check Convex logs for processing errors

### Phase 5: Documentation & Cleanup (30 min)

**Goal:** Document the fix and update task status

- [ ] Update task 11 README with note about this fix
- [ ] Document ZIP upload flow in architecture docs
- [ ] Update test-report.md
- [ ] Create validation video showing ZIP upload working
- [ ] Close GitHub issue

## Files to Create/Modify

### Create New:
- `app/convex/zipUpload.ts` - ZIP upload mutations/actions
- (If missing) `app/convex/zipProcessorMutations.ts` - Mutations for storing extracted files

### Modify Existing:
- `app/src/hooks/useArtifactUpload.ts` - Add ZIP upload logic
- `app/convex/artifacts.ts` - May need to add helper mutations
- Task 11 README - Document this fix

### Tests:
- `tasks/00015-fix-zip-artifact-viewing/tests/zip-upload.test.ts` - Backend tests
- `tasks/00015-fix-zip-artifact-viewing/tests/e2e-zip-upload.spec.ts` - E2E tests

## Acceptance Criteria

- [ ] User can upload a ZIP file containing HTML + assets
- [ ] ZIP file is uploaded to Convex storage
- [ ] ZIP is automatically extracted and files stored in `artifactFiles` table
- [ ] Entry point is auto-detected (index.html, main.html, or first HTML)
- [ ] Artifact viewer displays the HTML correctly
- [ ] All assets (CSS, JS, images) load properly
- [ ] Multi-page navigation works for ZIPs with multiple HTML files
- [ ] Existing single-file HTML uploads still work (regression test)
- [ ] Progress indicator shows upload and processing progress
- [ ] Clear error messages if upload or processing fails
- [ ] All existing tests continue to pass

## Questions to Resolve

1. **Does `zipProcessorMutations.ts` exist?**
   - If yes: verify it has all needed functions
   - If no: need to create it

2. **Should we use a single mutation or separate mutations for upload?**
   - Option A: `createArtifactWithZip` returns upload URL (1 round trip)
   - Option B: `createArtifact` + `generateUploadUrl` (2 round trips)
   - **Recommendation:** Option A for better UX

3. **How to handle ZIP processing errors?**
   - Show error to user immediately?
   - Store error state in version record?
   - Allow retry?

4. **Should we poll for processing completion or use subscriptions?**
   - Polling: Simple, works everywhere
   - Subscriptions: Real-time, better UX
   - **Recommendation:** Start with polling, optimize later

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaks existing HTML uploads | HIGH | Add regression tests for HTML/Markdown |
| ZIP processing fails silently | MEDIUM | Add error handling and user notifications |
| Large ZIPs timeout | MEDIUM | Add size validation, progress tracking |
| Concurrent uploads conflict | LOW | Each upload gets unique versionId |
| Entry point detection fails | MEDIUM | Allow user to manually select entry point |

## Next Steps

1. ✅ Create this task folder and README
2. [ ] Investigate if `zipProcessorMutations.ts` exists
3. [ ] Create detailed subtask breakdowns for each phase
4. [ ] Get user approval on implementation plan
5. [ ] Begin Phase 1: Verify existing infrastructure
