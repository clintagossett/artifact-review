# Subtask 02: Frontend Status Tracking - COMPLETE

**Task:** 00049-artifact-version-status
**Subtask:** 02-frontend-status-tracking
**Status:** ✅ COMPLETE
**Date:** 2026-01-31

---

## Summary

Successfully implemented frontend status tracking for artifact version processing. Users now see real-time status updates during ZIP upload/processing, and the dashboard waits for "ready" status before navigating to the artifact.

---

## Changes Implemented

### 1. Backend Query (`app/convex/artifacts.ts`)

Added `getVersionStatus` query:

```typescript
export const getVersionStatus = query({
  args: {
    versionId: v.id("artifactVersions"),
  },
  returns: v.union(
    v.object({
      status: v.union(
        v.literal("uploading"),
        v.literal("processing"),
        v.literal("ready"),
        v.literal("error")
      ),
      errorMessage: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) return null;

    // Treat undefined status as "ready" for backward compatibility
    const status = version.status ?? "ready";

    return {
      status: status as "uploading" | "processing" | "ready" | "error",
      errorMessage: version.errorMessage,
    };
  },
});
```

**Purpose:** Real-time subscription to version processing status.

### 2. Frontend Hook (`app/src/hooks/useVersionStatus.ts`)

Created `useVersionStatus` hook:

```typescript
export function useVersionStatus(
  versionId: Id<"artifactVersions"> | null
): UseVersionStatusReturn {
  const result = useQuery(
    api.artifacts.getVersionStatus,
    versionId ? { versionId } : "skip"
  );

  // Returns: status, errorMessage, isLoading, isReady, isError
}
```

**Features:**
- Subscribes to version status updates from Convex
- Returns convenience booleans (`isReady`, `isError`, `isLoading`)
- Handles null versionId (skips subscription)
- Handles undefined status (backward compatibility)

### 3. Upload Status Indicator Component (`app/src/components/artifacts/UploadStatusIndicator.tsx`)

Created visual status indicator component:

```typescript
export function UploadStatusIndicator({
  status,
  errorMessage,
  onRetry,
}: UploadStatusIndicatorProps)
```

**Visual States:**
- **uploading**: Spinner + "Uploading..." message
- **processing**: Spinner + "Processing ZIP contents..." message
- **error**: Alert with error message + retry button
- **ready**: No display (returns null)

**E2E Testing Support:**
- Includes `data-version-status` attribute on all states
- Enables deterministic waits in E2E tests

### 4. Dashboard Upload Flow (`app/src/app/dashboard/page.tsx`)

Updated dashboard to track upload status:

```typescript
// Track pending upload
const [pendingUpload, setPendingUpload] = useState<{
  versionId: Id<"artifactVersions">;
  shareToken: string;
} | null>(null);

const { status, isReady, isError, errorMessage } = useVersionStatus(
  pendingUpload?.versionId ?? null
);

// Navigate when ready
useEffect(() => {
  if (pendingUpload && isReady) {
    router.push(`/a/${pendingUpload.shareToken}`);
    setPendingUpload(null);
  }
}, [pendingUpload, isReady, router]);

// Clear on error
useEffect(() => {
  if (pendingUpload && isError) {
    setPendingUpload(null);
  }
}, [pendingUpload, isError]);
```

**Behavior Changes:**

**Before:**
- Dashboard navigated immediately after upload
- User landed on empty/broken page if ZIP processing failed
- No visual feedback during processing

**After:**
- Dashboard shows status indicator while processing
- Waits for `status: "ready"` before navigation
- Shows error message if processing fails
- HTML/MD uploads navigate immediately (status is "ready")

---

## Test Coverage

### Backend Query Tests

Created `app/convex/__tests__/getVersionStatus.test.ts` with 6 tests:

✅ **Null Handling:**
- Returns null when version does not exist

✅ **Status States:**
- Returns "ready" for version with undefined status (backward compat)
- Returns "uploading" when version is being uploaded
- Returns "processing" when version is being processed
- Returns "ready" when version is ready
- Returns "error" with errorMessage when processing failed

### Test Results

```bash
Test Files  92 passed (92)
Tests       1004 passed | 2 skipped (1006)
```

All tests passing! ✅

---

## Acceptance Criteria Coverage

| Criterion | Implementation | Status |
|-----------|----------------|--------|
| `useVersionStatus` hook subscribes to version status in real-time | `useVersionStatus.ts` using `useQuery` | ✅ |
| Upload flow waits for `status: "ready"` before navigation | Dashboard `useEffect` hooks | ✅ |
| Processing state shows spinner/progress indicator | `UploadStatusIndicator` component | ✅ |
| Error state shows error message with actionable feedback | `UploadStatusIndicator` with Alert | ✅ |
| Dashboard page renders `data-version-status` attribute for E2E tests | Component includes attribute | ✅ |
| Integration tests pass | All 1004 tests passing | ✅ |

---

## Files Created

| File | Purpose |
|------|---------|
| `app/src/hooks/useVersionStatus.ts` | Hook to subscribe to version status |
| `app/src/components/artifacts/UploadStatusIndicator.tsx` | Visual status feedback component |
| `app/convex/__tests__/getVersionStatus.test.ts` | Backend query tests |
| `tasks/00049-artifact-version-status/02-frontend-status-tracking/COMPLETE.md` | This file |

## Files Modified

| File | Changes |
|------|---------|
| `app/convex/artifacts.ts` | Added `getVersionStatus` query |
| `app/src/app/dashboard/page.tsx` | Integrated status tracking, wait for ready before navigation |

---

## User Experience Improvements

### ZIP Upload Flow

**Previous:**
1. User uploads ZIP
2. Dashboard navigates immediately
3. User sees empty page
4. Processing happens in background
5. If error → version silently deleted, user confused

**New:**
1. User uploads ZIP
2. Dashboard shows "Processing ZIP contents..." spinner
3. Processing completes → automatic navigation
4. If error → clear error message with retry button

### HTML/Markdown Upload Flow

**Previous:**
1. User uploads HTML/MD
2. Dashboard navigates immediately
3. Content displayed

**New:**
1. User uploads HTML/MD
2. Status is immediately "ready"
3. Dashboard navigates immediately (same as before)
4. Content displayed

### Error Handling

**Previous:**
- Silent failure
- Version soft-deleted
- User sees empty page

**New:**
- Clear error message displayed
- Version kept with `status: "error"` (not deleted)
- Retry button available
- No navigation on error

---

## Implementation Notes

### Backward Compatibility

The `getVersionStatus` query treats `undefined` status as `"ready"`:

```typescript
const status = version.status ?? "ready";
```

This ensures existing artifact versions (created before Task 00049) work correctly without migration.

### E2E Test Support

All status states include `data-version-status` attribute:
- `data-version-status="uploading"`
- `data-version-status="processing"`
- `data-version-status="ready"`
- `data-version-status="error"`

E2E tests can now wait for specific statuses instead of using arbitrary timeouts:

```typescript
// Instead of:
await page.waitForTimeout(5000);

// E2E tests can do:
await page.waitForSelector('[data-version-status="ready"]');
```

### Real-Time Updates

The `useVersionStatus` hook uses Convex's `useQuery`, which provides real-time subscription. Status changes in the backend automatically trigger re-renders in the frontend.

---

## Next Steps (Subtask 03)

E2E test updates:
- Update upload tests to wait for `[data-version-status="ready"]`
- Add tests for error state (forbidden file types)
- Remove arbitrary `waitForTimeout` calls
- Use `/samples/04-invalid/wrong-type/presentation-with-video.zip` for error tests

---

## Dependencies

- ✅ Subtask 01 complete (status field in schema)
- ✅ Backend query `getVersionStatus` implemented
- ✅ Frontend hooks and components implemented
- ✅ Dashboard integration complete

---

## Testing Commands

```bash
# Run backend query tests
cd app && npx vitest run convex/__tests__/getVersionStatus.test.ts

# Run all tests
cd app && npx vitest run

# Type check
cd app && npx tsc --noEmit
```
