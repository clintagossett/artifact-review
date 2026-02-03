# Subtask 02: Frontend Status Tracking

**Parent Task:** 00049-artifact-version-status
**Status:** OPEN
**Created:** 2026-01-31
**Depends On:** Subtask 01 (Schema and Mutations)

---

## Objective

Create a React hook to subscribe to version status changes and update the upload flow to wait for "ready" status before navigation. Add visual feedback during processing.

---

## Acceptance Criteria

1. `useVersionStatus` hook subscribes to version status in real-time
2. Upload flow waits for `status: "ready"` before navigation
3. Processing state shows spinner/progress indicator
4. Error state shows error message with actionable feedback
5. Dashboard page renders `data-version-status` attribute for E2E tests
6. Integration tests pass

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/src/hooks/useVersionStatus.ts` | Hook to subscribe to version status |
| `app/src/components/artifacts/UploadStatusIndicator.tsx` | Visual status feedback component |

## Files to Modify

| File | Changes Required |
|------|------------------|
| `app/src/hooks/useArtifactUpload.ts` | Integrate status tracking, return versionId |
| `app/src/app/dashboard/page.tsx` | Wait for ready before navigation |
| `app/convex/artifacts.ts` | Add query to get version status |

---

## TDD Approach

### Step 1: Write Hook Tests First

```typescript
// tests/unit/useVersionStatus.test.ts

describe('useVersionStatus', () => {
  it('returns undefined when versionId is null', () => {});
  it('returns current status from Convex subscription', () => {});
  it('updates when status changes from uploading to processing', () => {});
  it('updates when status changes from processing to ready', () => {});
  it('returns errorMessage when status is error', () => {});
  it('treats undefined status as ready (backward compatibility)', () => {});
});
```

### Step 2: Write Component Tests

```typescript
// tests/unit/UploadStatusIndicator.test.tsx

describe('UploadStatusIndicator', () => {
  it('renders nothing when status is ready', () => {});
  it('shows spinner when status is uploading', () => {});
  it('shows spinner with "Processing..." when status is processing', () => {});
  it('shows error message when status is error', () => {});
  it('includes retry button on error state', () => {});
  it('renders data-version-status attribute', () => {});
});
```

### Step 3: Write Integration Tests

```typescript
// tests/integration/uploadFlow.test.ts

describe('Upload Flow with Status', () => {
  it('ZIP upload waits for ready status before navigation', () => {});
  it('HTML upload navigates immediately (status is ready)', () => {});
  it('error state prevents navigation and shows message', () => {});
});
```

---

## Implementation Details

### 1. Backend Query: getVersionStatus

Add to `app/convex/artifacts.ts`:

```typescript
/**
 * Get version status for real-time subscription
 * Task 00049 - Frontend Status Tracking
 */
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

### 2. Hook: useVersionStatus

Create `app/src/hooks/useVersionStatus.ts`:

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type VersionStatus = "uploading" | "processing" | "ready" | "error";

export interface UseVersionStatusReturn {
  status: VersionStatus | undefined;
  errorMessage: string | undefined;
  isLoading: boolean;
  isReady: boolean;
  isError: boolean;
}

/**
 * Subscribe to version processing status
 * Returns real-time status updates from Convex
 *
 * @param versionId - The version to track (null to skip subscription)
 */
export function useVersionStatus(
  versionId: Id<"artifactVersions"> | null
): UseVersionStatusReturn {
  const result = useQuery(
    api.artifacts.getVersionStatus,
    versionId ? { versionId } : "skip"
  );

  // Handle loading state
  if (result === undefined) {
    return {
      status: undefined,
      errorMessage: undefined,
      isLoading: true,
      isReady: false,
      isError: false,
    };
  }

  // Handle not found
  if (result === null) {
    return {
      status: undefined,
      errorMessage: undefined,
      isLoading: false,
      isReady: false,
      isError: false,
    };
  }

  return {
    status: result.status,
    errorMessage: result.errorMessage,
    isLoading: false,
    isReady: result.status === "ready",
    isError: result.status === "error",
  };
}
```

### 3. Component: UploadStatusIndicator

Create `app/src/components/artifacts/UploadStatusIndicator.tsx`:

```typescript
"use client";

import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { VersionStatus } from "@/hooks/useVersionStatus";

interface UploadStatusIndicatorProps {
  status: VersionStatus;
  errorMessage?: string;
  onRetry?: () => void;
}

export function UploadStatusIndicator({
  status,
  errorMessage,
  onRetry,
}: UploadStatusIndicatorProps) {
  // Ready state - no indicator needed
  if (status === "ready") {
    return null;
  }

  // Uploading state
  if (status === "uploading") {
    return (
      <div
        className="flex items-center gap-2 text-muted-foreground"
        data-version-status="uploading"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Uploading...</span>
      </div>
    );
  }

  // Processing state
  if (status === "processing") {
    return (
      <div
        className="flex items-center gap-2 text-muted-foreground"
        data-version-status="processing"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Processing ZIP contents...</span>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <Alert variant="destructive" data-version-status="error">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Upload Failed</AlertTitle>
        <AlertDescription className="mt-2">
          {errorMessage || "An error occurred during processing."}
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2"
            >
              Retry Upload
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
```

### 4. Update useArtifactUpload Hook

Modify `app/src/hooks/useArtifactUpload.ts`:

```typescript
// Add to return interface
export interface UploadResult {
  artifactId: Id<"artifacts">;
  versionId: Id<"artifactVersions">;
  number: number;
  shareToken: string;
}

// The hook already returns versionId in the result
// Key change: caller should use useVersionStatus to wait for ready
```

### 5. Update Dashboard Upload Flow

In `app/src/app/dashboard/page.tsx`, modify upload handler:

```typescript
// Instead of immediately navigating:
// router.push(`/a/${result.shareToken}`);

// Use a pattern like:
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

// In upload handler:
const handleUpload = async (data: CreateArtifactData) => {
  const result = await uploadFile(data);
  setPendingUpload({
    versionId: result.versionId,
    shareToken: result.shareToken,
  });
};
```

---

## Test Samples

| Test Case | Sample |
|-----------|--------|
| ZIP with processing delay | `samples/01-valid/zip/charting/v1.zip` |
| Error state test | `samples/04-invalid/wrong-type/presentation-with-video.zip` |

---

## Verification Checklist

- [ ] `useVersionStatus` hook compiles and exports correctly
- [ ] Hook returns loading state initially
- [ ] Hook updates when status changes in Convex
- [ ] `UploadStatusIndicator` renders correct state for each status
- [ ] Component includes `data-version-status` attribute
- [ ] Dashboard waits for ready before navigation
- [ ] Error state shows error message
- [ ] HTML/Markdown uploads navigate immediately (status is ready)

---

## Dependencies

- Subtask 01 must be complete (status field in schema)
- Backend query `getVersionStatus` must exist

---

## UI/UX Considerations

### Loading States
- Show spinner during upload and processing
- Clear messaging about what is happening

### Error States
- Show full error message from backend
- Provide retry button
- Don't navigate away from dashboard on error

### Success States
- Automatic navigation when ready
- No additional confirmation needed

### Data Attributes for Testing
- `data-version-status="uploading"` - File being uploaded
- `data-version-status="processing"` - ZIP being extracted
- `data-version-status="ready"` - Version viewable
- `data-version-status="error"` - Processing failed
