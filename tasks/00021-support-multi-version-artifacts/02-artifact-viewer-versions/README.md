# Subtask 02: Artifact Viewer - Version Support

**Parent Task:** 00021-support-multi-version-artifacts
**Status:** COMPLETE ✅
**Created:** 2026-01-01
**Updated:** 2026-01-01
**Completed:** 2026-01-01

---

## Resume (Start Here)

**Last Updated:** 2026-01-01

### Current Status: COMPLETE ✅

**All implementation phases complete:**
- ✅ Phase 1: VersionSwitcher "Latest" badge
- ✅ Phase 2: Banner "Switch to latest" button
- ✅ Phase 3: ArtifactVersionsTab backend connection

**Test Results:**
- 19 unit tests passing
- Backend integration working
- Real-time updates via Convex subscriptions

**See:** `test-report.md` for detailed coverage

---

### Background (When Starting)

**Subtask 01 is COMPLETE.** The backend has all the APIs needed:
- `isLatest` computed field in `getVersions` query
- Comment enforcement in `comments.create` mutation (rejects comments on non-latest versions)
- Schema field renames done (`versionName` -> `name`, `versionNumber` -> `number`)

### What Already Exists (Partial Implementation)

The viewer components have **partial version support** already built:

| Component | Status | Notes |
|-----------|--------|-------|
| `VersionSwitcher.tsx` | EXISTS | Basic dropdown, uses ShadCN Select |
| `ArtifactHeader.tsx` | EXISTS | Has banner for old versions, passes props to VersionSwitcher |
| `ArtifactViewer.tsx` | EXISTS | Has `isLatestVersion` prop, passes to header |
| `ArtifactViewerPage.tsx` | EXISTS | Fetches versions, calculates isLatest, handles version switching via URL |
| `DocumentViewer.tsx` | EXISTS | Has old version banner, blocks comments on old versions |
| `ArtifactVersionsTab.tsx` | MOCK DATA | Settings page version list - uses mock data, not connected to backend |

### What Needs to Be Built

| Feature | Priority | Notes |
|---------|----------|-------|
| "Latest" badge in VersionSwitcher | HIGH | Use `isLatest` from `getVersions` response |
| Connect ArtifactVersionsTab to backend | HIGH | Replace mock data with real API calls |
| Banner link to switch to latest | MEDIUM | Existing banner needs "Switch to latest" button |
| Real-time version updates | LOW | Already works via Convex subscriptions |

---

## Objective

Update the artifact viewer to fully support multiple versions with proper UI indicators and connect the settings page version management to real backend APIs.

---

## Requirements

### UI Components

**1. Version Selector Dropdown (VersionSwitcher.tsx)**

Current state: Basic dropdown showing `v{number} - {date}`

Needed changes:
- Add "Latest" badge for the latest version
- Use `isLatest` field from `getVersions` query response

```typescript
// Current format (exists):
// v3 - 1/1/2026
// v2 - 12/31/2025

// Target format:
// v3 - Latest
// v2 - 12/31/2025
// v1 - 12/30/2025
```

**2. Banner for Old Versions (ArtifactHeader.tsx)**

Current state: Banner exists but only shows text message

Needed changes:
- Add button to switch to latest version
- Use `onVersionChange` callback to switch

```typescript
// Current (exists):
<div className="bg-yellow-50 border-b border-yellow-200 p-4">
  <p className="text-sm text-yellow-800">
    This is an old version (v{version.number}). This version is
    read-only. View the latest version to add comments.
  </p>
</div>

// Target: Add switch button
```

**3. ArtifactVersionsTab Connection**

Current state: Uses mock data (`mockVersions` array)

Needed changes:
- Fetch real versions using `useQuery(api.artifacts.getVersions, { artifactId })`
- Upload new version using `api.artifacts.addVersion` or `api.zipUpload.addZipVersion`
- Rename version using `useMutation(api.artifacts.updateName)`
- Delete version using `useMutation(api.artifacts.softDeleteVersion)`
- Display "Latest" badge using `isLatest` field

**4. Comment UI State (Already Done)**

The `DocumentViewer.tsx` already blocks comments on old versions:
- `isViewingOldVersion` check in text selection handler
- `isViewingOldVersion` check in element click handler
- Banner shown when viewing old version

Backend enforcement is also complete in `comments.create`.

---

## Backend APIs Available

All APIs are ready from Subtask 01:

| API | Purpose | Args | Returns |
|-----|---------|------|---------|
| `api.artifacts.getVersions` | List all versions | `{ artifactId }` | Array with `isLatest: boolean` |
| `api.artifacts.getLatestVersion` | Get latest version | `{ artifactId }` | Version object or null |
| `api.artifacts.getVersionByNumber` | Get specific version | `{ artifactId, number }` | Version object or null |
| `api.artifacts.addVersion` | Upload new single-file version | `{ artifactId, fileType, content, ... }` | `{ versionId, number }` |
| `api.artifacts.updateName` | Rename version | `{ versionId, name }` | null |
| `api.artifacts.softDeleteVersion` | Delete version | `{ versionId }` | null |
| `api.zipUpload.addZipVersion` | Upload ZIP version | `{ artifactId, ... }` | `{ versionId, number }` |

### Version Object Shape (from getVersions)

```typescript
{
  _id: Id<"artifactVersions">,
  _creationTime: number,
  artifactId: Id<"artifacts">,
  number: number,               // Version number (1, 2, 3...)
  name: string | undefined,     // Custom label
  createdBy: Id<"users">,
  fileType: string,             // "html", "markdown", "zip"
  fileSize: number,
  createdAt: number,
  isLatest: boolean,            // COMPUTED - true for highest non-deleted version
}
```

---

## User Flows

### Flow 1: View Latest Version (Default)
```
User opens artifact via share link
  -> ArtifactViewerPage fetches artifact + latest version
  -> DocumentViewer renders with version dropdown
  -> Dropdown shows "v3 - Latest" selected
  -> Comment UI is enabled
  -> No banner
```

### Flow 2: Switch to Old Version
```
User clicks version dropdown -> Selects "v2"
  -> URL changes to /a/{shareToken}/v/2
  -> ArtifactViewerPage fetches specific version
  -> DocumentViewer renders v2
  -> Banner appears: "This is an old version..."
  -> Comment input blocked (frontend + backend)
```

### Flow 3: Navigate to Latest from Old Version
```
User viewing v2 -> Clicks "Switch to latest" in banner
  -> URL changes to /a/{shareToken} (no version number)
  -> ArtifactViewerPage fetches latest version
  -> Banner disappears
  -> Comments enabled
```

### Flow 4: Settings - View Version History
```
Owner opens artifact settings -> Versions tab
  -> ArtifactVersionsTab fetches versions via getVersions
  -> List shows all versions with "Latest" badge on v3
  -> Owner can rename, delete, upload new version
```

---

## Technical Implementation

### 1. Update VersionSwitcher Props

```typescript
// Current interface (app/src/components/artifact/VersionSwitcher.tsx):
interface VersionSwitcherProps {
  currentVersion: number;
  versions: Array<{
    number: number;
    createdAt: number;
  }>;
  onVersionChange: (versionNumber: number) => void;
}

// Updated interface:
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

### 2. Update VersionSwitcher Display

```typescript
// Current (line ~41-48):
<SelectItem key={version.number} value={version.number.toString()}>
  v{version.number} - {formatDate(version.createdAt)}
</SelectItem>

// Updated:
<SelectItem key={version.number} value={version.number.toString()}>
  v{version.number}
  {version.name && ` - ${version.name}`}
  {version.isLatest ? " - Latest" : ` - ${formatDate(version.createdAt)}`}
</SelectItem>
```

### 3. Update ArtifactHeader Banner

```typescript
// Current (line ~55-63):
{!isLatestVersion && (
  <div className="bg-yellow-50 border-b border-yellow-200 p-4">
    <p className="text-sm text-yellow-800">
      This is an old version (v{version.number}). This version is
      read-only. View the latest version to add comments.
    </p>
  </div>
)}

// Updated - add button:
{!isLatestVersion && (
  <div className="bg-yellow-50 border-b border-yellow-200 p-4 flex items-center justify-between">
    <p className="text-sm text-yellow-800">
      This is an old version (v{version.number}). This version is
      read-only. View the latest version to add comments.
    </p>
    <Button
      size="sm"
      variant="outline"
      onClick={() => onVersionChange(latestVersionNumber)}
    >
      Switch to latest
    </Button>
  </div>
)}
```

### 4. Connect ArtifactVersionsTab to Backend

```typescript
// Replace mock data with real queries:
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ArtifactVersionsTab({ artifactId }: { artifactId: Id<"artifacts"> }) {
  // Fetch real versions
  const versions = useQuery(api.artifacts.getVersions, { artifactId });

  // Mutations
  const updateName = useMutation(api.artifacts.updateName);
  const softDeleteVersion = useMutation(api.artifacts.softDeleteVersion);

  // ... rest of component uses real data
}
```

---

## Edge Cases

1. **Only one version exists**
   - Version dropdown can still be shown (shows single item)
   - "Latest" badge shown on the only version
   - Delete button disabled (cannot delete last version - backend enforces)

2. **Latest version deleted while viewing**
   - Convex subscription updates versions array
   - Frontend detects version no longer exists or `isLatest` changed
   - Auto-redirect to new latest version

3. **User has multiple tabs open**
   - Each tab has its own URL state
   - Version dropdown updates via Convex subscriptions
   - URL-based navigation is independent per tab

4. **Version not found (URL deep link to deleted version)**
   - `getVersionByNumber` returns null
   - ArtifactViewerPage shows "Artifact Not Found" message

---

## Testing

### Unit Tests

Test files location: `tasks/00021-support-multi-version-artifacts/02-artifact-viewer-versions/tests/unit/`

| Test | Description |
|------|-------------|
| VersionSwitcher renders isLatest badge | Version marked as latest shows "Latest" label |
| VersionSwitcher handles missing isLatest | Graceful fallback if isLatest undefined |
| Banner shows switch button | Old version banner includes switch link |
| ArtifactVersionsTab displays real data | Component renders backend version data |
| ArtifactVersionsTab rename works | updateName mutation called correctly |
| ArtifactVersionsTab delete works | softDeleteVersion mutation called correctly |

### E2E Tests (Playwright with video)

Test files location: `tasks/00021-support-multi-version-artifacts/02-artifact-viewer-versions/tests/e2e/`

| Test | Description |
|------|-------------|
| version-switching.spec.ts | Open artifact, switch versions, verify content changes |
| old-version-banner.spec.ts | Switch to old version, verify banner appears, click switch link |
| comment-blocking.spec.ts | Try to comment on old version, verify blocked |
| version-management.spec.ts | Settings page: list, rename, delete versions |

All E2E tests MUST generate video recordings per project requirements.

---

## Deliverables

- [ ] Update `VersionSwitcher.tsx` to show "Latest" badge
- [ ] Update `ArtifactHeader.tsx` banner with switch button
- [ ] Update `ArtifactViewerPage.tsx` to pass `isLatest` from query
- [ ] Connect `ArtifactVersionsTab.tsx` to real backend APIs
- [ ] Unit tests for version switching UI
- [ ] E2E tests with validation videos
- [ ] Test report documenting coverage

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/src/components/artifact/VersionSwitcher.tsx` | Add `isLatest` prop, show "Latest" badge |
| `app/src/components/artifact/ArtifactHeader.tsx` | Add switch button to banner, pass latestVersionNumber |
| `app/src/components/artifact/ArtifactViewer.tsx` | Pass `isLatest` field from versions array |
| `app/src/components/artifact/ArtifactViewerPage.tsx` | Pass `isLatest` from getVersions response |
| `app/src/components/artifact-settings/ArtifactVersionsTab.tsx` | Replace mock data with real API calls |

---

## Implementation Order

1. **Phase 1: VersionSwitcher Updates** (LOW EFFORT)
   - Update interface to include `isLatest`
   - Update display to show "Latest" badge
   - Update parent components to pass `isLatest`

2. **Phase 2: Banner Enhancement** (LOW EFFORT)
   - Add switch button to old version banner
   - Pass `latestVersionNumber` prop to banner

3. **Phase 3: ArtifactVersionsTab Connection** (MEDIUM EFFORT)
   - Replace mock data with `useQuery`
   - Connect rename mutation
   - Connect delete mutation
   - Handle loading states
   - Handle error states

4. **Phase 4: Testing** (MEDIUM EFFORT)
   - Unit tests for component changes
   - E2E tests for full user flows
   - Validation videos

---

## Notes for TDD Developer

1. **Read Subtask 01 README first** - Understand what backend APIs exist and their exact signatures

2. **Use central test samples** - Test data should come from `/samples/` directory per project guidelines

3. **Convex rules apply** - Any backend changes must follow `docs/architecture/convex-rules.md`

4. **Check existing patterns** - The codebase already has version switching working; build on existing patterns

5. **Real-time updates work** - Convex subscriptions already update the UI when versions change; no extra work needed

6. **Backend enforcement exists** - Comments are already blocked on non-latest versions in `comments.create`; frontend is UX improvement
