# Artifact Upload Status Tracking Investigation
**Issue:** #49 - Add artifact version processing status for user feedback
**Date:** 2026-01-31
**Agent:** mark

---

## Current Upload Flow Analysis

### For ZIP Files (Most Complex Case)

**Frontend (`useArtifactUpload.ts`)**
```typescript
// Line 111-151
1. createArtifactWithZip() → Creates artifact + version records, returns uploadUrl
2. fetch(uploadUrl) → Upload ZIP to Convex storage
3. triggerZipProcessing() → Kicks off async processing action
4. Return { artifactId, versionId, shareToken } immediately
```

**Backend (`zipUpload.ts` + `zipProcessor.ts`)**
```typescript
// zipUpload.ts: createArtifactWithZip (mutation)
1. Validate auth, size, organization
2. Create artifact record
3. Create version record with:
   - fileType: "zip"
   - entryPoint: "index.html" (placeholder)
   - createdAt: now
4. Generate storage upload URL
5. Return immediately

// zipUpload.ts: triggerZipProcessing (action)
1. Call zipProcessor.processZipFile()
2. Wait for completion (blocking)
3. Re-throw errors if processing fails

// zipProcessor.ts: processZipFile (internal action)
1. Download ZIP from storage
2. Extract and validate files (count, size, forbidden types)
3. Detect entry point (index.html, README.md, etc.)
4. Upload each file to storage
5. Create artifactFiles records
6. Update version.entryPoint
7. Delete original ZIP
```

**Problem:** Frontend returns immediately after step 3, but processing happens async in steps 4-7. No status tracking.

---

## Where Status Field Would Fit

### Schema Changes

```typescript
// convex/schema.ts - artifactVersions table
artifactVersions: defineTable({
  // ... existing fields ...

  /**
   * Processing status of this version.
   * Tracks lifecycle from upload through processing to ready state.
   *
   * States:
   * - "uploading": Version record created, file upload in progress
   * - "processing": File uploaded to storage, backend extracting/validating
   * - "ready": Processing complete, version ready to view
   * - "error": Processing failed, see errorMessage
   *
   * Default: "ready" for existing records (backward compatibility)
   * Issue #49
   */
  status: v.union(
    v.literal("uploading"),
    v.literal("processing"),
    v.literal("ready"),
    v.literal("error")
  ),

  /**
   * Error message when status === "error".
   * Contains user-friendly description of what went wrong.
   * Undefined when status !== "error".
   * Issue #49
   */
  errorMessage: v.optional(v.string()),

  /**
   * Timestamp when processing completed (ready or error state).
   * Unix timestamp in milliseconds.
   * Used for cleanup of stuck "processing" records.
   * Issue #49
   */
  processedAt: v.optional(v.number()),

  // ... rest of fields ...
})
```

### Backend Changes

#### 1. `zipUpload.ts:createArtifactWithZip` (Line 64-73)
```typescript
// BEFORE
const versionId = await ctx.db.insert("artifactVersions", {
  artifactId,
  number: 1,
  createdBy: userId,
  fileType: "zip",
  entryPoint: args.entryPoint || "index.html",
  size: args.size,
  isDeleted: false,
  createdAt: now,
});

// AFTER
const versionId = await ctx.db.insert("artifactVersions", {
  artifactId,
  number: 1,
  createdBy: userId,
  fileType: "zip",
  entryPoint: args.entryPoint || "index.html",
  size: args.size,
  status: "uploading",  // NEW
  isDeleted: false,
  createdAt: now,
});
```

#### 2. `useArtifactUpload.ts` - After storage upload (Line 136)
```typescript
// NEW: Update status after successful upload to storage
const { storageId } = await uploadResponse.json();

// Mark version as processing
await updateVersionStatus({
  versionId,
  status: "processing"
});

setUploadProgress(70);
```

#### 3. `zipProcessorMutations.ts:markProcessingComplete` (existing function)
```typescript
// BEFORE
export const markProcessingComplete = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    entryPoint: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.versionId, {
      entryPoint: args.entryPoint,
    });
    return null;
  },
});

// AFTER
export const markProcessingComplete = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    entryPoint: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.versionId, {
      entryPoint: args.entryPoint,
      status: "ready",           // NEW
      processedAt: Date.now(),   // NEW
    });
    return null;
  },
});
```

#### 4. `zipProcessorMutations.ts:markProcessingError` (existing function)
```typescript
// BEFORE
export const markProcessingError = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.versionId, {
      processingError: args.error,
    });
    return null;
  },
});

// AFTER
export const markProcessingError = mutation({
  args: {
    versionId: v.id("artifactVersions"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.versionId, {
      status: "error",            // NEW
      errorMessage: args.error,   // RENAMED from processingError
      processedAt: Date.now(),    // NEW
    });
    return null;
  },
});
```

### Frontend Changes

#### 1. New Hook: `useVersionStatus.ts`
```typescript
/**
 * Subscribe to version processing status in real-time.
 * Returns current status and waits for "ready" or "error" state.
 */
export function useVersionStatus(versionId: Id<"artifactVersions">) {
  const version = useQuery(api.versions.getStatus, { versionId });

  return {
    status: version?.status,
    errorMessage: version?.errorMessage,
    isProcessing: version?.status === "uploading" || version?.status === "processing",
    isReady: version?.status === "ready",
    isError: version?.status === "error",
  };
}
```

#### 2. Updated `NewArtifactDialog.tsx`
```typescript
// BEFORE: Close dialog immediately after upload
await onCreateArtifact({ file, name, description });
onOpenChange(false);

// AFTER: Keep dialog open, show processing state
const result = await onCreateArtifact({ file, name, description });
setProcessingVersionId(result.versionId);
setProcessingState("processing");
// Dialog shows "Processing..." spinner
// Wait for status === "ready" via useVersionStatus
// Then navigate and close dialog
```

#### 3. Updated `dashboard/page.tsx`
```typescript
const handleCreateArtifact = async (data) => {
  try {
    setIsNavigating(true);
    const result = await uploadFile(data);

    // Don't navigate immediately!
    // Return versionId to dialog so it can subscribe to status
    return result;

  } catch (error) {
    setIsNavigating(false);
    throw error;
  }
};
```

---

## Migration Strategy

### Existing Records
All existing `artifactVersions` records don't have `status` field.

**Options:**
1. **Default to "ready"** - Assume all existing versions are complete
   - Simple, safe
   - Accurately reflects reality (all are already processed)

2. **Schema migration mutation** - One-time backfill
   ```typescript
   // Run once after deploying
   export const backfillVersionStatus = internalMutation({
     handler: async (ctx) => {
       const versions = await ctx.db.query("artifactVersions").collect();
       for (const version of versions) {
         await ctx.db.patch(version._id, {
           status: "ready",
           processedAt: version.createdAt,
         });
       }
     },
   });
   ```

**Recommendation:** Use default value approach - simpler and safer.

---

## Cleanup Strategy for Orphaned Records

### Problem
If upload/processing fails midway, we'll have records stuck in "uploading" or "processing" state.

### Solutions

#### Option 1: Auto-Cleanup (Scheduled Job)
```typescript
// convex/crons.ts
export default cronJobs.daily({
  name: "cleanupStaleVersions",
  schedule: "0 2 * * *", // 2 AM daily
  handler: internalMutation(async (ctx) => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    const staleVersions = await ctx.db
      .query("artifactVersions")
      .filter(q =>
        q.or(
          q.eq(q.field("status"), "uploading"),
          q.eq(q.field("status"), "processing")
        )
      )
      .filter(q => q.lt(q.field("createdAt"), cutoff))
      .collect();

    for (const version of staleVersions) {
      await ctx.db.patch(version._id, {
        status: "error",
        errorMessage: "Upload timed out - please try again",
        processedAt: Date.now(),
      });
    }
  }),
});
```

#### Option 2: User-Managed (Show in UI)
```typescript
// Dashboard shows failed uploads
// User can:
// - Retry upload (delete + recreate)
// - Dismiss (soft delete)
// - View error details
```

#### Option 3: Accept Orphans (No Cleanup)
- Keep all records for debugging
- Filter out non-ready versions from UI queries
- Useful for analytics/troubleshooting

**Recommendation:** Option 1 (Auto-cleanup) + filter in queries. Best UX, no orphan accumulation.

---

## Testing Impact

### E2E Test Fix

**Current Problem:**
```typescript
// Tests timeout waiting for navigation
await page.waitForURL(/\/a\//, { timeout: 60000 }); // FAILS
```

**With Status Tracking:**
```typescript
// Test can wait for visible "ready" indicator
await expect(page.getByTestId('artifact-status')).toHaveText('Ready', { timeout: 30000 });
// Or wait for spinner to disappear
await expect(page.getByTestId('processing-spinner')).not.toBeVisible({ timeout: 30000 });
// Then navigation happens automatically
await expect(page).toHaveURL(/\/a\//);
```

**Key Benefit:** Deterministic wait condition instead of arbitrary timeout.

---

## Implementation Phases

### Phase 1: Backend Status Tracking (Minimum Viable)
1. Add `status`, `errorMessage`, `processedAt` to schema
2. Update `createArtifactWithZip` to set status="uploading"
3. Update `markProcessingComplete` to set status="ready"
4. Update `markProcessingError` to set status="error"
5. No frontend changes yet - field exists but unused

### Phase 2: Frontend Status Display
1. Create `useVersionStatus` hook
2. Update `NewArtifactDialog` to show processing state
3. Keep dialog open until status="ready"
4. Show error state with retry option
5. Update dashboard to not navigate immediately

### Phase 3: E2E Test Fixes
1. Add `data-testid` to status indicators
2. Update tests to wait for status="ready"
3. Remove arbitrary timeouts
4. Verify all 15 tests pass

### Phase 4: Cleanup & Polish
1. Add auto-cleanup cron job
2. Add queries to filter out non-ready versions
3. Add UI for viewing/retrying failed uploads
4. Add analytics/logging for processing times

---

## Open Questions

1. **Should status apply to HTML/Markdown uploads too?**
   - Currently only ZIP files have async processing
   - HTML/Markdown are instant (just create file record)
   - Could add for consistency, but adds complexity

2. **Granular progress (percentage) or just states?**
   - States are simpler: uploading → processing → ready
   - Percentage requires more backend updates (progress tracking in ZIP processor)
   - Recommendation: Start with states, add percentage later if needed

3. **Show status in artifact list view?**
   - Helpful for seeing in-progress uploads
   - Adds UI complexity
   - Recommendation: Yes, with icon/badge for non-ready versions

4. **Migration - what about in-flight uploads during deployment?**
   - Very small window (seconds)
   - Worst case: status=undefined, default to "ready" or show as error
   - Recommendation: Accept the race, document in release notes

---

## Recommended Implementation Order

1. ✅ **This document** - Investigation complete
2. **Issue #49 discussion** - Get user buy-in on approach
3. **Schema changes** - Add status fields to artifactVersions
4. **Backend Phase 1** - Update mutations to set status
5. **Frontend Phase 2** - Add status display and wait logic
6. **E2E Phase 3** - Update tests to use status indicators
7. **Cleanup Phase 4** - Add cron job and polish

---

**Next Steps:** Present this analysis to user for review and decision on implementation approach.
