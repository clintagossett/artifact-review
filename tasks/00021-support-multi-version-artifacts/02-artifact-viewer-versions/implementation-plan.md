# Implementation Plan: Subtask 02 - Artifact Viewer Versions

**Task:** 00021-support-multi-version-artifacts
**Subtask:** 02-artifact-viewer-versions
**Date:** 2026-01-01

---

## Overview

This document provides a step-by-step TDD implementation plan for updating the artifact viewer to fully support multi-version artifacts.

**Pre-requisites:**
- Subtask 01 is COMPLETE (backend APIs ready)
- Dev servers running (`./scripts/start-dev-servers.sh`)
- Understanding of Convex queries and mutations

---

## Phase 1: VersionSwitcher "Latest" Badge

**Estimated Time:** 1-2 hours

### Step 1.1: Write Test for VersionSwitcher isLatest Display

**File:** `tasks/00021-support-multi-version-artifacts/02-artifact-viewer-versions/tests/unit/version-switcher.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { VersionSwitcher } from '@/components/artifact/VersionSwitcher';

describe('VersionSwitcher', () => {
  const mockVersions = [
    { number: 3, createdAt: Date.now(), isLatest: true },
    { number: 2, createdAt: Date.now() - 86400000, isLatest: false },
    { number: 1, createdAt: Date.now() - 172800000, isLatest: false },
  ];

  it('displays "Latest" badge for the latest version', () => {
    render(
      <VersionSwitcher
        currentVersion={3}
        versions={mockVersions}
        onVersionChange={() => {}}
      />
    );

    // Open dropdown
    screen.getByRole('combobox').click();

    // Check for Latest label on v3
    expect(screen.getByText(/v3.*Latest/)).toBeInTheDocument();
  });

  it('displays date for non-latest versions', () => {
    render(
      <VersionSwitcher
        currentVersion={3}
        versions={mockVersions}
        onVersionChange={() => {}}
      />
    );

    // Open dropdown
    screen.getByRole('combobox').click();

    // v2 should show date, not "Latest"
    const v2Option = screen.getByText(/v2/);
    expect(v2Option).not.toHaveTextContent('Latest');
  });
});
```

**Expected:** Test FAILS (isLatest prop not supported yet)

### Step 1.2: Update VersionSwitcher Interface

**File:** `app/src/components/artifact/VersionSwitcher.tsx`

```typescript
interface VersionSwitcherProps {
  currentVersion: number;
  versions: Array<{
    number: number;
    createdAt: number;
    name?: string;
    isLatest: boolean;  // ADD THIS
  }>;
  onVersionChange: (versionNumber: number) => void;
}
```

### Step 1.3: Update VersionSwitcher Display Logic

**File:** `app/src/components/artifact/VersionSwitcher.tsx`

Update the SelectItem rendering:

```typescript
{sortedVersions.map((version) => (
  <SelectItem
    key={version.number}
    value={version.number.toString()}
  >
    v{version.number}
    {version.name && ` - ${version.name}`}
    {version.isLatest ? " - Latest" : ` - ${formatDate(version.createdAt)}`}
  </SelectItem>
))}
```

**Expected:** Test PASSES

### Step 1.4: Update Parent Components to Pass isLatest

Update prop passing in these files (in order):

1. **`app/src/components/artifact/ArtifactViewerPage.tsx`**
   - The `versions` query already returns `isLatest` from backend
   - Map the query result to include `isLatest` when passing to child

2. **`app/src/components/artifact/ArtifactViewer.tsx`**
   - Update interface to include `isLatest` in versions array type

3. **`app/src/components/artifact/ArtifactHeader.tsx`**
   - Update interface to include `isLatest` in versions array type

---

## Phase 2: Banner "Switch to Latest" Button

**Estimated Time:** 1 hour

### Step 2.1: Write Test for Banner Switch Button

**File:** `tasks/00021-support-multi-version-artifacts/02-artifact-viewer-versions/tests/unit/artifact-header.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtifactHeader } from '@/components/artifact/ArtifactHeader';

describe('ArtifactHeader', () => {
  const mockProps = {
    artifact: { title: 'Test', shareToken: 'abc123' },
    version: { number: 2, fileSize: 1024, createdAt: Date.now() },
    versions: [
      { number: 3, createdAt: Date.now(), isLatest: true },
      { number: 2, createdAt: Date.now(), isLatest: false },
    ],
    isLatestVersion: false,
    onVersionChange: jest.fn(),
    latestVersionNumber: 3,
  };

  it('shows banner with switch button when viewing old version', () => {
    render(<ArtifactHeader {...mockProps} />);

    expect(screen.getByText(/old version/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to latest/i })).toBeInTheDocument();
  });

  it('calls onVersionChange with latest version number when switch button clicked', () => {
    const onVersionChange = jest.fn();
    render(<ArtifactHeader {...mockProps} onVersionChange={onVersionChange} />);

    fireEvent.click(screen.getByRole('button', { name: /switch to latest/i }));

    expect(onVersionChange).toHaveBeenCalledWith(3);
  });

  it('does not show banner when viewing latest version', () => {
    render(<ArtifactHeader {...mockProps} isLatestVersion={true} />);

    expect(screen.queryByText(/old version/i)).not.toBeInTheDocument();
  });
});
```

**Expected:** Test FAILS (switch button doesn't exist)

### Step 2.2: Add latestVersionNumber Prop and Button

**File:** `app/src/components/artifact/ArtifactHeader.tsx`

Update interface:

```typescript
interface ArtifactHeaderProps {
  // ... existing props
  latestVersionNumber?: number;  // ADD THIS
}
```

Update banner:

```typescript
{!isLatestVersion && (
  <div className="bg-yellow-50 border-b border-yellow-200 p-4 flex items-center justify-between">
    <p className="text-sm text-yellow-800">
      This is an old version (v{version.number}). This version is
      read-only. View the latest version to add comments.
    </p>
    {latestVersionNumber && (
      <Button
        size="sm"
        variant="outline"
        onClick={() => onVersionChange(latestVersionNumber)}
      >
        Switch to latest
      </Button>
    )}
  </div>
)}
```

**Expected:** Test PASSES

### Step 2.3: Update Parent to Pass latestVersionNumber

**File:** `app/src/components/artifact/ArtifactViewer.tsx`

Calculate and pass latestVersionNumber:

```typescript
const latestVersionNumber = versions.find(v => v.isLatest)?.number
  ?? Math.max(...versions.map(v => v.number));

<ArtifactHeader
  // ... existing props
  latestVersionNumber={latestVersionNumber}
/>
```

---

## Phase 3: ArtifactVersionsTab Backend Connection

**Estimated Time:** 3-4 hours

This is the most substantial change - replacing mock data with real backend calls.

### Step 3.1: Write Test for Version List Rendering

**File:** `tasks/00021-support-multi-version-artifacts/02-artifact-viewer-versions/tests/unit/artifact-versions-tab.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ArtifactVersionsTab } from '@/components/artifact-settings/ArtifactVersionsTab';

// Mock the Convex hooks
jest.mock('convex/react', () => ({
  ...jest.requireActual('convex/react'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

describe('ArtifactVersionsTab', () => {
  it('displays versions from backend query', async () => {
    const mockVersions = [
      { _id: 'v3', number: 3, createdAt: Date.now(), isLatest: true, createdBy: 'user1', fileType: 'html', fileSize: 1024 },
      { _id: 'v2', number: 2, createdAt: Date.now() - 86400000, isLatest: false, createdBy: 'user1', fileType: 'html', fileSize: 2048 },
    ];

    (useQuery as jest.Mock).mockReturnValue(mockVersions);

    render(<ArtifactVersionsTab artifactId="artifact123" />);

    await waitFor(() => {
      expect(screen.getByText(/v3/)).toBeInTheDocument();
      expect(screen.getByText(/v2/)).toBeInTheDocument();
      expect(screen.getByText(/Latest/)).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching', () => {
    (useQuery as jest.Mock).mockReturnValue(undefined);

    render(<ArtifactVersionsTab artifactId="artifact123" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

### Step 3.2: Update ArtifactVersionsTab Props

**File:** `app/src/components/artifact-settings/ArtifactVersionsTab.tsx`

Change props interface:

```typescript
import { Id } from '@/convex/_generated/dataModel';

interface ArtifactVersionsTabProps {
  artifactId: Id<"artifacts">;  // Was: artifactId: string
}
```

### Step 3.3: Replace Mock Data with useQuery

**File:** `app/src/components/artifact-settings/ArtifactVersionsTab.tsx`

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ArtifactVersionsTab({ artifactId }: ArtifactVersionsTabProps) {
  // Replace mock data with real query
  const versions = useQuery(api.artifacts.getVersions, { artifactId });

  // Loading state
  if (versions === undefined) {
    return <div className="p-6">Loading versions...</div>;
  }

  // Transform to component's internal format if needed
  const displayVersions = versions.map(v => ({
    id: v._id,
    number: v.number,
    customName: v.name || `v${v.number}`,
    uploadedAt: new Date(v.createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    uploadedBy: 'Owner', // TODO: Fetch user name
    isLatest: v.isLatest,
  }));

  // ... rest of component
}
```

### Step 3.4: Connect Rename Mutation

```typescript
const updateNameMutation = useMutation(api.artifacts.updateName);

const handleSaveRename = async (versionId: string) => {
  try {
    await updateNameMutation({
      versionId: versionId as Id<"artifactVersions">,
      name: editingName || null,  // null to clear
    });
    setEditingId(null);
    toast({ title: 'Version renamed' });
  } catch (error) {
    toast({ title: 'Failed to rename', variant: 'destructive' });
  }
};
```

### Step 3.5: Connect Delete Mutation

```typescript
const softDeleteMutation = useMutation(api.artifacts.softDeleteVersion);

const handleDelete = async (versionId: string) => {
  // Check if this is the last version
  if (versions.length === 1) {
    toast({ title: 'Cannot delete the only version', variant: 'destructive' });
    return;
  }

  if (!confirm('Delete this version? This action cannot be undone.')) {
    return;
  }

  try {
    await softDeleteMutation({
      versionId: versionId as Id<"artifactVersions">,
    });
    toast({ title: 'Version deleted' });
  } catch (error) {
    toast({ title: 'Failed to delete', variant: 'destructive' });
  }
};
```

### Step 3.6: Add "Latest" Badge to Version List

```typescript
{version.isLatest && (
  <Badge className="bg-green-100 text-green-800 text-xs">
    Latest
  </Badge>
)}
```

### Step 3.7: Update Upload Handler

The existing `UploadNewVersionDialog` needs to be connected to real upload APIs.

This may require:
- Using `api.artifacts.addVersion` for single files
- Using `api.zipUpload.addZipVersion` for ZIP files
- The existing `useArtifactUpload` hook may already support this

---

## Phase 4: E2E Testing

**Estimated Time:** 2-3 hours

### Step 4.1: Setup Playwright Test Structure

**Directory:** `tasks/00021-support-multi-version-artifacts/02-artifact-viewer-versions/tests/e2e/`

```bash
mkdir -p tasks/00021-support-multi-version-artifacts/02-artifact-viewer-versions/tests/e2e
cd tasks/00021-support-multi-version-artifacts/02-artifact-viewer-versions/tests
npm init -y
npm install @playwright/test
npx playwright install chromium
```

**File:** `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    video: 'on',  // MANDATORY per project requirements
    trace: 'on',
  },
  webServer: {
    command: 'cd ../../../../app && npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

### Step 4.2: Version Switching E2E Test

**File:** `tests/e2e/version-switching.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Version Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to artifact with multiple versions
    // (Setup test data via API or use existing test artifact)
  });

  test('switching versions updates content', async ({ page }) => {
    // Navigate to artifact viewer
    await page.goto('/a/test-artifact-token');

    // Verify we're on latest version
    await expect(page.getByText('v3 - Latest')).toBeVisible();

    // Click version dropdown
    await page.getByRole('combobox').click();

    // Select older version
    await page.getByRole('option', { name: /v2/ }).click();

    // Verify URL changed
    await expect(page).toHaveURL(/\/v\/2$/);

    // Verify banner appears
    await expect(page.getByText(/old version/i)).toBeVisible();
  });

  test('banner switch button navigates to latest', async ({ page }) => {
    // Navigate to old version directly
    await page.goto('/a/test-artifact-token/v/2');

    // Verify banner is visible
    await expect(page.getByText(/old version/i)).toBeVisible();

    // Click switch to latest button
    await page.getByRole('button', { name: /switch to latest/i }).click();

    // Verify URL changed to latest (no version number)
    await expect(page).toHaveURL('/a/test-artifact-token');

    // Verify banner is gone
    await expect(page.getByText(/old version/i)).not.toBeVisible();
  });
});
```

### Step 4.3: Comment Blocking E2E Test

**File:** `tests/e2e/comment-blocking.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Comment Blocking on Old Versions', () => {
  test('comment input is disabled on old versions', async ({ page }) => {
    // Navigate to old version
    await page.goto('/a/test-artifact-token/v/1');

    // Verify banner indicates comments are disabled
    await expect(page.getByText(/read-only/i)).toBeVisible();

    // Attempt to select text and comment
    // (The comment tooltip should not appear or submit should fail)

    // Try to submit comment via API and verify error
    // ...
  });
});
```

### Step 4.4: Version Management E2E Test

**File:** `tests/e2e/version-management.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Version Management in Settings', () => {
  test('can rename a version', async ({ page }) => {
    await page.goto('/a/test-artifact-token/settings#versions');

    // Click rename on first version
    await page.getByRole('button', { name: /rename/i }).first().click();

    // Type new name
    await page.fill('input', 'Release Candidate 1');

    // Save
    await page.getByRole('button', { name: /save/i }).click();

    // Verify name updated
    await expect(page.getByText('Release Candidate 1')).toBeVisible();
  });

  test('can delete a non-last version', async ({ page }) => {
    await page.goto('/a/test-artifact-token/settings#versions');

    // Get initial version count
    const initialCount = await page.getByTestId('version-row').count();

    // Click delete on second version (not last)
    await page.getByRole('button', { name: /delete/i }).nth(1).click();

    // Confirm deletion
    page.on('dialog', dialog => dialog.accept());

    // Verify version removed
    await expect(page.getByTestId('version-row')).toHaveCount(initialCount - 1);
  });

  test('cannot delete last version', async ({ page }) => {
    // Setup: artifact with only one version
    await page.goto('/a/single-version-artifact/settings#versions');

    // Try to delete
    await page.getByRole('button', { name: /delete/i }).click();

    // Verify error message
    await expect(page.getByText(/cannot delete the only version/i)).toBeVisible();
  });
});
```

---

## Validation Checklist

After implementation, verify:

- [ ] VersionSwitcher shows "Latest" badge on latest version
- [ ] Old version banner has "Switch to latest" button
- [ ] Clicking "Switch to latest" navigates to latest version
- [ ] ArtifactVersionsTab shows real data from backend
- [ ] Can rename versions in settings
- [ ] Can delete versions in settings (except last one)
- [ ] Cannot delete last version
- [ ] Comments blocked on old versions (frontend UI)
- [ ] Comments blocked on old versions (backend enforcement - already done)
- [ ] All E2E tests pass with video recordings

---

## Files Summary

### Files to Modify

| File | Changes |
|------|---------|
| `app/src/components/artifact/VersionSwitcher.tsx` | Add `isLatest` prop, display "Latest" badge |
| `app/src/components/artifact/ArtifactHeader.tsx` | Add `latestVersionNumber` prop, add switch button to banner |
| `app/src/components/artifact/ArtifactViewer.tsx` | Calculate and pass `latestVersionNumber` |
| `app/src/components/artifact/ArtifactViewerPage.tsx` | Pass `isLatest` from query response |
| `app/src/components/artifact-settings/ArtifactVersionsTab.tsx` | Replace mock data with Convex queries/mutations |

### New Files to Create

| File | Purpose |
|------|---------|
| `tasks/00021.../02-.../tests/unit/version-switcher.test.tsx` | Unit tests for VersionSwitcher |
| `tasks/00021.../02-.../tests/unit/artifact-header.test.tsx` | Unit tests for ArtifactHeader banner |
| `tasks/00021.../02-.../tests/unit/artifact-versions-tab.test.tsx` | Unit tests for ArtifactVersionsTab |
| `tasks/00021.../02-.../tests/e2e/version-switching.spec.ts` | E2E tests for version switching |
| `tasks/00021.../02-.../tests/e2e/comment-blocking.spec.ts` | E2E tests for comment blocking |
| `tasks/00021.../02-.../tests/e2e/version-management.spec.ts` | E2E tests for settings management |
| `tasks/00021.../02-.../tests/package.json` | Playwright dependencies |
| `tasks/00021.../02-.../tests/playwright.config.ts` | Playwright configuration |

---

## Common Pitfalls to Avoid

1. **Convex ID types** - Always cast string IDs to proper `Id<"tableName">` types when calling mutations

2. **Hook rules** - Don't conditionally call `useQuery` or `useMutation` - always call them, use "skip" for conditional queries

3. **Optimistic updates** - Convex subscriptions auto-update, but optimistic updates improve perceived performance

4. **Test isolation** - E2E tests should not depend on each other's state; use fresh test data

5. **Video recording** - Playwright config MUST have `video: 'on'` per project requirements
