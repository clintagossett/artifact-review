# Subtask 02: Artifact Viewer - Version Support

**Parent Task:** 00021-support-multi-version-artifacts
**Status:** OPEN
**Created:** 2026-01-01

---

## Objective

Update the artifact viewer to support multiple versions: version dropdown selector, display current version, show banner on old versions, and hide comment UI on non-latest versions.

---

## Requirements

### UI Components

**1. Version Selector Dropdown**
- Shows all non-deleted versions for artifact
- Format: "v3 - Latest" for latest, "v2" for others
- Located in viewer header/toolbar
- Switching versions updates viewer content
- Default: Always show latest version

**2. Banner for Old Versions**
- Only shows when viewing non-latest version
- Message: "ⓘ Comments are only available on the latest version (vX). Switch to vX →"
- Link/button to switch to latest version
- Dismissible? (TBD)

**3. Comment UI State**
- **Latest version:** Show full comment UI (input, submit, existing comments)
- **Old version:** Hide comment input, show existing comments (read-only)
- Banner explains why commenting is disabled

**4. Version Info Display**
- Show current version number in viewer
- Show upload date/time
- Show file name/size

---

## User Flows

### Flow 1: View Latest Version (Default)
```
User opens artifact → Sees latest version
- Version dropdown shows "v3 - Latest"
- Comment UI is enabled
- No banner
```

### Flow 2: Switch to Old Version
```
User clicks version dropdown → Selects "v2"
- Viewer loads v2 content
- Banner appears: "Comments only on latest version (v3)"
- Comment input hidden
- Existing comments on v2 still visible (read-only)
```

### Flow 3: Upload New Version While Viewing Old
```
User viewing v2 → Owner uploads v3
- Banner updates: "New version available (v3)"
- Version dropdown updates to show v3
- v2 comment UI becomes read-only
```

---

## Technical Implementation

### State Management

```typescript
// Viewer component state
const [currentVersionId, setCurrentVersionId] = useState<Id<"versions">>();
const [isLatestVersion, setIsLatestVersion] = useState(true);

// Query all versions
const versions = useQuery(api.versions.getVersionsByArtifact, {
  artifactId: artifact._id
});

// Get latest version
const latestVersion = versions?.[0]; // Assuming sorted desc

// Determine if current is latest
useEffect(() => {
  if (currentVersionId && latestVersion) {
    setIsLatestVersion(currentVersionId === latestVersion._id);
  }
}, [currentVersionId, latestVersion]);
```

### Version Dropdown Component

```typescript
<VersionDropdown
  versions={versions}
  currentVersionId={currentVersionId}
  latestVersionId={latestVersion._id}
  onVersionChange={(versionId) => setCurrentVersionId(versionId)}
/>

// Renders:
// v3 - Latest ✓
// v2
// v1
```

### Banner Component

```typescript
{!isLatestVersion && (
  <Banner variant="info">
    <InfoIcon />
    Comments are only available on the latest version (v{latestVersion.versionNumber}).
    <Button onClick={() => setCurrentVersionId(latestVersion._id)}>
      Switch to v{latestVersion.versionNumber} →
    </Button>
  </Banner>
)}
```

### Comment UI Conditional

```typescript
{isLatestVersion ? (
  <CommentInput onSubmit={handleAddComment} />
) : (
  <div className="text-muted-foreground text-sm">
    Commenting disabled on older versions
  </div>
)}

{/* Always show existing comments, but read-only on old versions */}
<CommentList comments={comments} readOnly={!isLatestVersion} />
```

---

## Edge Cases

1. **Only one version exists**
   - No version dropdown (or disabled)
   - No banner
   - Comments enabled

2. **Latest version deleted during viewing**
   - Detect version no longer exists
   - Auto-switch to new latest version
   - Show notification: "Version deleted, switched to latest"

3. **User has multiple tabs open**
   - Each tab independently tracks version
   - Switching in one tab doesn't affect others
   - Real-time updates for new versions (Convex subscription)

4. **Version not found**
   - 404 or redirect to latest
   - Error message: "Version not found"

---

## Testing

### Unit Tests
- ✅ Version dropdown renders all versions
- ✅ Latest version shows "Latest" badge
- ✅ Banner only shows on non-latest versions
- ✅ Comment input hidden on old versions
- ✅ Switching versions updates content

### E2E Tests (Playwright with video)
- ✅ Open artifact → sees latest version
- ✅ Switch to old version → banner appears, comment UI hidden
- ✅ Switch back to latest → banner gone, comment UI shown
- ✅ Upload new version → dropdown updates, banner appears on old version
- ✅ Delete latest version → auto-switch to new latest

---

## Deliverables

- [ ] `VersionDropdown` component with "Latest" badge
- [ ] Banner component for old versions
- [ ] Conditional comment UI (enabled/disabled)
- [ ] Version info display (number, date, size)
- [ ] Real-time updates for new versions
- [ ] Handle edge cases (only one version, deleted version)
- [ ] Tests: Unit + E2E with validation videos
