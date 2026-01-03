# Frontend Wiring Plan: Task 00022 Phase 2

**Task:** 00022-artifact-settings-details-backend
**Phase:** 2 of 2 (Frontend Wiring)
**Date:** 2026-01-02
**Status:** Ready for Implementation

---

## Overview

This document provides a detailed implementation plan for updating the frontend to use the new backend functions from Task 00022. The backend changes renamed `artifacts.title` to `artifacts.name` and `artifacts.creatorId` to `artifacts.createdBy`, and added two new functions: `updateDetails` and `getDetailsForSettings`.

### Backend Changes Summary

| Change | Before | After |
|--------|--------|-------|
| Artifact name field | `title: string` | `name: string` |
| Creator field | `creatorId: Id<"users">` | `createdBy: Id<"users">` |
| New mutation | N/A | `api.artifacts.updateDetails` |
| New query | N/A | `api.artifacts.getDetailsForSettings` |

---

## Impact Analysis

### Files Requiring Changes

| File | Impact | Priority | Effort |
|------|--------|----------|--------|
| `app/src/components/artifact-settings/ArtifactDetailsTab.tsx` | **Major** - Wire up to backend | High | 2h |
| `app/src/components/artifact/ArtifactViewerPage.tsx` | **Major** - Rename fields | High | 30m |
| `app/src/components/artifact/ArtifactHeader.tsx` | **Medium** - Rename interface + usage | High | 20m |
| `app/src/components/artifacts/ArtifactCard.tsx` | **Medium** - Rename interface + usage | High | 20m |
| `app/src/components/artifacts/ArtifactList.tsx` | **Medium** - Rename interface | High | 15m |
| `app/src/components/artifacts/ShareModal.tsx` | **Medium** - Rename interface | High | 15m |
| `app/src/components/artifact/ShareModal.tsx` | **Medium** - Rename interface | High | 15m |
| `app/src/components/artifact/DocumentViewer.tsx` | **Medium** - Rename prop | High | 15m |
| `app/src/components/artifact/AccessDeniedMessage.tsx` | **Minor** - Keep as-is (uses generic prop name) | Low | 0m |
| `app/src/app/a/[shareToken]/settings/ArtifactSettingsClient.tsx` | **Medium** - Rename field | High | 10m |
| `app/src/hooks/useArtifactUpload.ts` | **Medium** - Rename arg | High | 15m |
| `app/src/components/artifacts/NewArtifactDialog.tsx` | **Medium** - Rename interface usage | High | 15m |

### Test Files Requiring Changes

| File | Change Required |
|------|-----------------|
| `app/src/__tests__/dashboard/ArtifactCard.test.tsx` | Rename `title` to `name` in mock data |
| `app/src/__tests__/artifact/ShareModal.test.tsx` | Rename `title` to `name` in mock data |
| `app/src/__tests__/artifact/ArtifactHeader.test.tsx` | Rename `title` to `name` in mock data |
| `app/src/hooks/__tests__/useArtifactUpload.test.tsx` | Rename `title` to `name` in calls |

---

## Detailed File Analysis

### 1. ArtifactDetailsTab.tsx (Major Change)

**Path:** `/app/src/components/artifact-settings/ArtifactDetailsTab.tsx`

**Current State:**
- Uses hardcoded mock data
- Has local state for `name` and `description`
- Simulates save with `setTimeout`
- Mock metadata (created, createdBy, lastModified, fileSize, versions)

**Required Changes:**
1. Import `useQuery` and `useMutation` from `convex/react`
2. Import `api` from Convex generated
3. Replace mock data with `useQuery(api.artifacts.getDetailsForSettings, { artifactId })`
4. Wire up save to `useMutation(api.artifacts.updateDetails)`
5. Add loading state for initial data fetch
6. Add error handling for mutation
7. Format dates using `createdAt` and `updatedAt` timestamps
8. Format file size using `totalFileSize`
9. Display `versionCount` and `creatorEmail`

**Before:**
```typescript
// Current mock data
const metadata = {
  created: 'Jan 15, 2024 at 10:30 AM',
  createdBy: 'you@company.com',
  lastModified: 'Jan 20, 2024 at 2:15 PM',
  fileSize: '245 KB',
  versions: 3,
};

const handleSave = async () => {
  setIsSaving(true);
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));
  setIsSaving(false);
  setHasChanges(false);
  toast({ title: 'Artifact details updated' });
};
```

**After:**
```typescript
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

// Inside component:
const details = useQuery(api.artifacts.getDetailsForSettings, { artifactId });
const updateDetailsMutation = useMutation(api.artifacts.updateDetails);

// Initialize state from backend data
useEffect(() => {
  if (details) {
    setName(details.name);
    setDescription(details.description || '');
    setHasChanges(false);
  }
}, [details]);

// Format helpers
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Metadata from backend
const metadata = details ? {
  created: formatDate(details.createdAt),
  createdBy: details.creatorEmail || 'Unknown',
  lastModified: formatDate(details.updatedAt),
  fileSize: formatFileSize(details.totalFileSize),
  versions: details.versionCount,
} : null;

const handleSave = async () => {
  setIsSaving(true);
  try {
    await updateDetailsMutation({
      artifactId,
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setHasChanges(false);
    toast({ title: 'Artifact details updated' });
  } catch (error) {
    toast({
      title: 'Failed to update',
      description: error instanceof Error ? error.message : 'Unknown error',
      variant: 'destructive',
    });
  } finally {
    setIsSaving(false);
  }
};
```

---

### 2. ArtifactViewerPage.tsx (Major Change)

**Path:** `/app/src/components/artifact/ArtifactViewerPage.tsx`

**Current State:**
- Uses `artifact.title` and `artifact.creatorId`
- Passes to `AccessDeniedMessage`, `DocumentViewer`, `ShareModal`

**Required Changes:**
```typescript
// Line 117: Change artifact.title to artifact.name
return <AccessDeniedMessage artifactTitle={artifact.name} />;

// Line 144: Change artifact.title to artifact.name
artifactTitle={artifact.name}

// Line 152: Change artifact.creatorId to artifact.createdBy
artifactOwnerId={artifact.createdBy}

// Lines 159-162: Change artifact.title to artifact.name
artifact={{
  _id: artifact._id,
  title: artifact.name,  // Still 'title' prop for ShareModal interface
  shareToken: artifact.shareToken,
}}
```

**Note:** The `ShareModal` component uses `title` as its prop name. We have two options:
1. Keep ShareModal prop as `title` (simpler, fewer changes)
2. Rename ShareModal prop to `name` (more consistent)

**Recommendation:** Rename ShareModal interface to use `name` for consistency.

---

### 3. ArtifactHeader.tsx

**Path:** `/app/src/components/artifact/ArtifactHeader.tsx`

**Current State:**
```typescript
interface ArtifactHeaderProps {
  artifact: {
    _id?: Id<"artifacts">;
    title: string;  // <-- Change to 'name'
    shareToken: string;
  };
  // ...
}

// Usage:
<h1 className="text-gray-900">{artifact.title}</h1>
title: artifact.title,  // ShareModal prop
```

**After:**
```typescript
interface ArtifactHeaderProps {
  artifact: {
    _id?: Id<"artifacts">;
    name: string;  // Renamed from 'title'
    shareToken: string;
  };
  // ...
}

// Usage:
<h1 className="text-gray-900">{artifact.name}</h1>
name: artifact.name,  // Updated ShareModal prop
```

---

### 4. ArtifactCard.tsx and ArtifactList.tsx

**Path:** `/app/src/components/artifacts/ArtifactCard.tsx`

**Current State:**
```typescript
export interface ArtifactCardProps {
  artifact: {
    _id: Id<"artifacts">;
    title: string;  // <-- Change to 'name'
    description?: string;
    // ...
  };
  // ...
}

// Usage:
<h3 className="font-semibold text-gray-900">{artifact.title}</h3>
```

**After:**
```typescript
export interface ArtifactCardProps {
  artifact: {
    _id: Id<"artifacts">;
    name: string;  // Renamed from 'title'
    description?: string;
    // ...
  };
  // ...
}

// Usage:
<h3 className="font-semibold text-gray-900">{artifact.name}</h3>
```

**Path:** `/app/src/components/artifacts/ArtifactList.tsx`

**Current State:**
```typescript
export interface ArtifactListProps {
  artifacts: Array<{
    _id: Id<"artifacts">;
    title: string;  // <-- Change to 'name'
    // ...
  }>;
  // ...
}
```

---

### 5. ShareModal Components (Both)

**Path:** `/app/src/components/artifacts/ShareModal.tsx`

```typescript
// Line 20-24: Update interface
export interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: {
    _id: Id<"artifacts">;
    name: string;  // Renamed from 'title'
    shareToken: string;
  };
}

// Line 58: Update usage
<DialogTitle>Share &quot;{artifact.name}&quot;</DialogTitle>
```

**Path:** `/app/src/components/artifact/ShareModal.tsx`

```typescript
// Lines 34-38: Update interface
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: {
    _id: Id<"artifacts">;
    name: string;  // Renamed from 'title'
    shareToken: string;
  };
  // ...
}
```

---

### 6. DocumentViewer.tsx

**Path:** `/app/src/components/artifact/DocumentViewer.tsx`

**Current State:**
```typescript
interface DocumentViewerProps {
  documentId: string;
  onBack: () => void;
  artifactTitle: string;  // Keep as 'artifactTitle' - it's a prop name, not data field
  // ...
  artifactOwnerId: Id<"users">;  // Keep as is - it's a prop name
  // ...
}
```

**Note:** The `artifactTitle` prop name can stay as-is since it's a descriptive prop name, not a data field. However, for consistency, consider renaming to `artifactName`. The `artifactOwnerId` prop also stays the same as it describes what the ID represents.

**Recommendation:** Rename `artifactTitle` to `artifactName` for full consistency.

---

### 7. ArtifactSettingsClient.tsx

**Path:** `/app/src/app/a/[shareToken]/settings/ArtifactSettingsClient.tsx`

**Current State:**
```typescript
artifactName={artifact.title}
```

**After:**
```typescript
artifactName={artifact.name}
```

---

### 8. useArtifactUpload.ts and NewArtifactDialog.tsx

**Path:** `/app/src/hooks/useArtifactUpload.ts`

**Current State:**
```typescript
export interface CreateArtifactData {
  file: File;
  title: string;  // <-- Change to 'name'
  description?: string;
  entryPoint?: string;
}

// Line 96-98: Update action call
const result = await createArtifact({
  title,  // <-- This should be 'name' to match backend
  // ...
});
```

**After:**
```typescript
export interface CreateArtifactData {
  file: File;
  name: string;  // Renamed from 'title'
  description?: string;
  entryPoint?: string;
}

// Update destructuring and action call
const { file, name, description, entryPoint } = data;
const result = await createArtifact({
  name,  // Matches backend arg
  description,
  fileType,
  content,
  originalFileName: file.name,
});
```

**Path:** `/app/src/components/artifacts/NewArtifactDialog.tsx`

**Current State:**
- Uses local `title` state for the input
- Passes `title` to `onCreateArtifact`

**After:**
- Rename local state from `title` to `name` for consistency
- Update all references
- This ensures data flows correctly from form -> hook -> backend

---

## Subtask Breakdown

### Subtask 01: Update Type Definitions and Interfaces (Est: 1h)

**Files:**
1. `app/src/components/artifacts/ArtifactCard.tsx` - Update interface
2. `app/src/components/artifacts/ArtifactList.tsx` - Update interface
3. `app/src/components/artifact/ArtifactHeader.tsx` - Update interface
4. `app/src/components/artifacts/ShareModal.tsx` - Update interface
5. `app/src/components/artifact/ShareModal.tsx` - Update interface
6. `app/src/hooks/useArtifactUpload.ts` - Update `CreateArtifactData` interface

**Steps:**
1. For each file, change `title: string` to `name: string` in interfaces
2. Update any JSX that uses `artifact.title` to `artifact.name`
3. Run TypeScript to find any missed references

### Subtask 02: Update Hook and Dialog (Est: 30m)

**Files:**
1. `app/src/hooks/useArtifactUpload.ts`
2. `app/src/components/artifacts/NewArtifactDialog.tsx`

**Steps:**
1. Update `useArtifactUpload.ts`:
   - Change interface `title` to `name`
   - Update destructuring and action call
2. Update `NewArtifactDialog.tsx`:
   - Rename local state `title` to `name`
   - Update all references (state, handlers, JSX)
   - Update `onCreateArtifact` call to use `name`

### Subtask 03: Update Viewer Components (Est: 45m)

**Files:**
1. `app/src/components/artifact/ArtifactViewerPage.tsx`
2. `app/src/components/artifact/DocumentViewer.tsx`
3. `app/src/app/a/[shareToken]/settings/ArtifactSettingsClient.tsx`

**Steps:**
1. Update `ArtifactViewerPage.tsx`:
   - Change `artifact.title` to `artifact.name` (lines 117, 144, 161)
   - Change `artifact.creatorId` to `artifact.createdBy` (line 152)
2. Update `DocumentViewer.tsx`:
   - Rename prop `artifactTitle` to `artifactName`
   - Update all internal usages
3. Update `ArtifactSettingsClient.tsx`:
   - Change `artifact.title` to `artifact.name`

### Subtask 04: Wire Up ArtifactDetailsTab (Est: 2h)

**File:** `app/src/components/artifact-settings/ArtifactDetailsTab.tsx`

**Steps:**
1. Add imports for `useQuery`, `useMutation`, `api`, `useEffect`
2. Add query for `getDetailsForSettings`
3. Add mutation for `updateDetails`
4. Add loading state check
5. Add `useEffect` to sync state from backend data
6. Update `handleSave` to use mutation
7. Update `handleCancel` to reset to backend values
8. Add date and file size formatting helpers
9. Update metadata section to use real data
10. Add error handling with toast notifications

### Subtask 05: Update Tests (Est: 30m)

**Files:**
1. `app/src/__tests__/dashboard/ArtifactCard.test.tsx`
2. `app/src/__tests__/artifact/ShareModal.test.tsx`
3. `app/src/__tests__/artifact/ArtifactHeader.test.tsx`
4. `app/src/hooks/__tests__/useArtifactUpload.test.tsx`

**Steps:**
1. Update mock data: `title` -> `name`
2. Run tests to verify all pass
3. Add tests for loading/error states in ArtifactDetailsTab (optional)

### Subtask 06: Validation and Cleanup (Est: 30m)

**Steps:**
1. Run `npx tsc --noEmit` to check for type errors
2. Run `npm test` to verify all tests pass
3. Start dev servers and manually test:
   - Dashboard shows artifacts with correct names
   - New artifact dialog works
   - Artifact viewer shows correct name
   - Settings Details tab loads real data
   - Save changes works
4. Check for any console warnings/errors

---

## Testing Approach

### Unit Tests

**Existing tests to update:**
- Mock data uses `title` -> change to `name`
- Verify tests still pass after changes

**New tests for ArtifactDetailsTab:**
```typescript
describe('ArtifactDetailsTab', () => {
  it('should show loading state initially');
  it('should display artifact name from backend');
  it('should display description from backend');
  it('should display formatted metadata');
  it('should enable save button when changes made');
  it('should call updateDetails on save');
  it('should show error toast on save failure');
  it('should reset to original values on cancel');
});
```

### Manual Testing Checklist

- [ ] Dashboard loads and shows artifact names (not titles)
- [ ] Create new artifact - form works with "name" field
- [ ] View artifact - header shows correct name
- [ ] Settings page loads - shows correct artifact name
- [ ] Details tab - loads real data from backend
- [ ] Details tab - name/description editable
- [ ] Details tab - metadata shows correct values
- [ ] Details tab - save works and persists
- [ ] Details tab - cancel resets changes
- [ ] Share modal - shows correct artifact name

---

## Migration Considerations

### Breaking Changes

The backend field rename from `title` to `name` is a breaking change. The frontend must be updated atomically to avoid runtime errors.

**Deployment Strategy:**
1. Deploy backend changes first (already done in Phase 1)
2. Immediately deploy frontend changes
3. Both should be deployed in same release window

### Rollback Plan

If issues occur:
1. The backend already uses `name` - cannot rollback without data migration
2. Frontend must be fixed forward, not rolled back
3. Keep previous frontend version ready for quick reference

---

## Summary

| Subtask | Files | Estimated Time |
|---------|-------|----------------|
| 01: Update Interfaces | 6 files | 1h |
| 02: Update Hook/Dialog | 2 files | 30m |
| 03: Update Viewer Components | 3 files | 45m |
| 04: Wire Up Details Tab | 1 file | 2h |
| 05: Update Tests | 4 files | 30m |
| 06: Validation | - | 30m |
| **Total** | **16 files** | **~5.5h** |

---

## Appendix: Complete File Change Summary

### Files Changing `title` to `name`:

| File | Lines | Change |
|------|-------|--------|
| `ArtifactCard.tsx` | 9, 72 | Interface + usage |
| `ArtifactList.tsx` | 9 | Interface |
| `ArtifactHeader.tsx` | 14, 84, 126 | Interface + usage |
| `ShareModal.tsx` (artifacts) | 22, 58 | Interface + usage |
| `ShareModal.tsx` (artifact) | 37 | Interface |
| `ArtifactViewerPage.tsx` | 117, 144, 161 | Usage |
| `ArtifactSettingsClient.tsx` | 79 | Usage |
| `useArtifactUpload.ts` | 10, 67, 97 | Interface + usage |
| `NewArtifactDialog.tsx` | 50-51, 58, 71, 74, 78-79, 96, 134 | State + usage |

### Files Changing `creatorId` to `createdBy`:

| File | Line | Change |
|------|------|--------|
| `ArtifactViewerPage.tsx` | 152 | `artifact.creatorId` -> `artifact.createdBy` |

### Files with Prop Renames (optional but recommended):

| File | Prop | Change |
|------|------|--------|
| `DocumentViewer.tsx` | `artifactTitle` | -> `artifactName` |

### New Functionality:

| File | Addition |
|------|----------|
| `ArtifactDetailsTab.tsx` | Query `getDetailsForSettings`, mutation `updateDetails` |
