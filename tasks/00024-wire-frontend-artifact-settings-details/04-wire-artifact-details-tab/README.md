# Subtask 04: Wire Up ArtifactDetailsTab

**Parent Task:** 00024-wire-frontend-artifact-settings-details
**Status:** Pending
**Estimated Time:** 2 hours
**Dependencies:** Subtasks 01-03 must be completed first

## Objective

Replace mock data in `ArtifactDetailsTab.tsx` with real backend integration using the new `getDetailsForSettings` query and `updateDetails` mutation from Task 00022.

## File to Modify

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/artifact-settings/ArtifactDetailsTab.tsx`

## Current State (Mock Implementation)

The component currently:
- Uses hardcoded mock data for `name` and `description` (lines 15-18)
- Has mock metadata (lines 22-29)
- Simulates save with `setTimeout` (lines 31-38)
- Resets to hardcoded values on cancel (lines 40-46)

## Required Changes

### 1. Add New Imports (Lines 1-8)

```typescript
// BEFORE
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Calendar, User, FileText, HardDrive } from 'lucide-react';
import { Id } from '../../../../convex/_generated/dataModel';

// AFTER
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Calendar, User, FileText, HardDrive } from 'lucide-react';
import { Id } from '../../../../convex/_generated/dataModel';
```

---

### 2. Add Query and Mutation Hooks (After Line 14)

```typescript
export function ArtifactDetailsTab({ artifactId }: ArtifactDetailsTabProps) {
  // Add backend integration
  const details = useQuery(api.artifacts.getDetailsForSettings, { artifactId });
  const updateDetailsMutation = useMutation(api.artifacts.updateDetails);

  // Keep existing state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
```

---

### 3. Add useEffect to Sync State from Backend (After State Declarations)

```typescript
  // Sync state from backend data
  useEffect(() => {
    if (details) {
      setName(details.name);
      setDescription(details.description || '');
      setHasChanges(false);
    }
  }, [details]);
```

---

### 4. Add Formatting Helper Functions (After useEffect)

```typescript
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
```

---

### 5. Replace Mock Metadata with Dynamic Computation (Replace Lines 22-29)

```typescript
// BEFORE
  // Mock metadata
  const metadata = {
    created: 'Jan 15, 2024 at 10:30 AM',
    createdBy: 'you@company.com',
    lastModified: 'Jan 20, 2024 at 2:15 PM',
    fileSize: '245 KB',
    versions: 3,
  };

// AFTER
  // Metadata from backend
  const metadata = details ? {
    created: formatDate(details.createdAt),
    createdBy: details.creatorEmail || 'Unknown',
    lastModified: formatDate(details.updatedAt),
    fileSize: formatFileSize(details.totalFileSize),
    versions: details.versionCount,
  } : null;
```

---

### 6. Update handleSave with Real Mutation (Replace Lines 31-38)

```typescript
// BEFORE
  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
    toast({ title: 'Artifact details updated' });
  };

// AFTER
  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name is required',
        description: 'Please enter a name for this artifact.',
        variant: 'destructive',
      });
      return;
    }

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

### 7. Update handleCancel to Reset to Backend Values (Replace Lines 40-46)

```typescript
// BEFORE
  const handleCancel = () => {
    setName('Product Specs V3');
    setDescription(
      'Q1 2024 product specifications for the new feature launch. Includes technical requirements and mockups.'
    );
    setHasChanges(false);
  };

// AFTER
  const handleCancel = () => {
    if (details) {
      setName(details.name);
      setDescription(details.description || '');
    }
    setHasChanges(false);
  };
```

---

### 8. Add Loading State to JSX (Before the Card)

```typescript
  // Add loading state
  if (details === undefined) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="border-t border-gray-200" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  // Check for null (artifact not found or no access)
  if (details === null) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <p className="text-gray-600">Unable to load artifact details.</p>
        </div>
      </div>
    );
  }

  return (
    // ... existing JSX
  );
```

---

### 9. Guard Metadata Display (In JSX, Lines 99-127)

Since `metadata` can now be `null` during loading, ensure it's only rendered when available:

```typescript
{/* Metadata */}
{metadata && (
  <div>
    <h3 className="font-medium text-gray-900 mb-4">Metadata</h3>
    <div className="space-y-3">
      {/* ... existing metadata items ... */}
    </div>
  </div>
)}
```

---

## Complete New Implementation

```typescript
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Calendar, User, FileText, HardDrive } from 'lucide-react';
import { Id } from '../../../../convex/_generated/dataModel';

interface ArtifactDetailsTabProps {
  artifactId: Id<"artifacts">;
}

export function ArtifactDetailsTab({ artifactId }: ArtifactDetailsTabProps) {
  // Backend integration
  const details = useQuery(api.artifacts.getDetailsForSettings, { artifactId });
  const updateDetailsMutation = useMutation(api.artifacts.updateDetails);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync state from backend data
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
    if (!name.trim()) {
      toast({
        title: 'Name is required',
        description: 'Please enter a name for this artifact.',
        variant: 'destructive',
      });
      return;
    }

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

  const handleCancel = () => {
    if (details) {
      setName(details.name);
      setDescription(details.description || '');
    }
    setHasChanges(false);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setHasChanges(true);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setHasChanges(true);
  };

  // Loading state
  if (details === undefined) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="border-t border-gray-200" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  // Error state (null means no access or not found)
  if (details === null) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <p className="text-gray-600">Unable to load artifact details.</p>
        </div>
      </div>
    );
  }

  return (
    // ... existing JSX unchanged ...
  );
}
```

---

## Acceptance Criteria

- [ ] Component loads data from `api.artifacts.getDetailsForSettings`
- [ ] Loading skeleton shown while data is fetching
- [ ] Error state shown if query returns `null`
- [ ] Name and description fields populate from backend data
- [ ] Metadata (created, createdBy, lastModified, fileSize, versions) displays correctly
- [ ] Dates are formatted nicely (e.g., "Jan 15, 2024 at 10:30 AM")
- [ ] File sizes are formatted nicely (e.g., "245 KB", "1.2 MB")
- [ ] Save button calls `api.artifacts.updateDetails` mutation
- [ ] Success toast shown on successful save
- [ ] Error toast shown on save failure
- [ ] Cancel button resets to backend values
- [ ] TypeScript compiles without errors

---

## Verification Commands

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app

# Check TypeScript compilation
npx tsc --noEmit

# Run relevant tests
npm test -- ArtifactDetailsTab

# Check for remaining mock data
grep -n "Mock\|setTimeout\|Simulate\|Product Specs V3" src/components/artifact-settings/ArtifactDetailsTab.tsx
```

---

## Manual Testing Checklist

After implementation, manually test:

1. [ ] Navigate to artifact settings page
2. [ ] Verify Details tab shows loading skeleton initially
3. [ ] Verify name field shows actual artifact name
4. [ ] Verify description field shows actual description (or empty)
5. [ ] Verify metadata shows correct values
6. [ ] Edit name, verify "unsaved changes" banner appears
7. [ ] Click Save, verify toast appears and changes persist
8. [ ] Edit name, click Cancel, verify reverts to saved value
9. [ ] Try saving empty name, verify error toast
10. [ ] Check console for any errors

---

## Notes

- The Skeleton component may need to be added if not already installed: `npx shadcn@latest add skeleton`
- The backend functions `getDetailsForSettings` and `updateDetails` were implemented in Task 00022
- Loading state uses `undefined` (still loading) vs `null` (no access/not found) pattern

## Reference

See full design document: `/Users/clintgossett/Documents/personal/personal projects/artifact-review/tasks/00024-wire-frontend-artifact-settings-details/design.md`
