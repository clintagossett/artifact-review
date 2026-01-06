# Plan: Reviewer Permission Modals

## Problem Statement

When a reviewer (non-owner with "can-comment" permission) views an artifact, they can see UI elements they shouldn't be able to use:
- **"Upload New Version"** in the Version History dropdown
- **"Share"** button
- **"Manage"** button (settings)

Clicking these should show a browser modal (alert) explaining that only the artifact owner can perform that action.

---

## Research Findings

### Permission Flow

1. **ArtifactViewerPage** (`/app/src/components/artifact/ArtifactViewerPage.tsx`):
   - Fetches `userPermission` via `useQuery(api.access.getPermission, { artifactId })`
   - Permission values: `"owner" | "can-comment" | null`
   - Currently does NOT pass permission to DocumentViewer

2. **DocumentViewer** (`/app/src/components/artifact/DocumentViewer.tsx`):
   - Receives props but currently has NO `userPermission` prop
   - Fetches `currentUser` via `useQuery(api.users.getCurrentUser)` (line 108)
   - Determines owner via `artifactOwnerId` prop
   - Currently shows Share/Manage buttons unconditionally (lines 961-972)

3. **ArtifactHeader** (`/app/src/components/artifact/ArtifactHeader.tsx`):
   - Already receives `userPermission` prop
   - Already has `isOwner` logic (line 47)
   - Already conditionally shows Share button based on `isOwner` (lines 98-107)
   - Does NOT show Manage button (that's in DocumentViewer)

### UI Elements Locations

#### 1. Upload New Version
**File:** `/app/src/components/artifact/DocumentViewer.tsx`
**Lines:** 939-945
```tsx
<DropdownMenuItem
  className="text-purple-600"
  onClick={onNavigateToVersions}
>
  <Upload className="w-4 h-4 mr-2" />
  Upload New Version
</DropdownMenuItem>
```
**Parent:** DropdownMenu for version history (lines 890-947)
**Trigger:** Button showing current version (lines 892-903)

#### 2. Share Button
**File:** `/app/src/components/artifact/DocumentViewer.tsx`
**Lines:** 961-966
```tsx
{onNavigateToShare && (
  <Button variant="outline" size="sm" onClick={onNavigateToShare}>
    <Share2 className="w-4 h-4 mr-2" />
    Share
  </Button>
)}
```
**Location:** Top bar, right side actions section

#### 3. Manage Button
**File:** `/app/src/components/artifact/DocumentViewer.tsx`
**Lines:** 967-972
```tsx
{onNavigateToSettings && (
  <Button variant="outline" size="sm" onClick={onNavigateToSettings}>
    <Settings className="w-4 h-4 mr-2" />
    Manage
  </Button>
)}
```
**Location:** Top bar, right side actions section

### Current Permission Handling

- **ArtifactViewerPage** fetches permission but doesn't pass it to DocumentViewer
- **DocumentViewer** has no knowledge of user permission level
- All three UI elements are shown regardless of permission
- Clicking them triggers navigation handlers passed as props

---

## Implementation Approach

### Phase 1: Pass Permission to DocumentViewer

**File:** `/app/src/components/artifact/ArtifactViewerPage.tsx`

1. Update DocumentViewer prop passing (around line 141):
```tsx
<DocumentViewer
  documentId={artifact._id}
  onBack={() => router.push("/dashboard")}
  artifactTitle={artifact.name}
  versions={versions}
  onNavigateToShare={() => router.push(`/a/${shareToken}/settings#access-and-activity`)}
  onNavigateToSettings={() => router.push(`/a/${shareToken}/settings`)}
  onNavigateToVersions={() => router.push(`/a/${shareToken}/settings#versions`)}
  shareToken={shareToken}
  versionNumber={targetVersion.number}
  versionId={targetVersion._id}
  artifactOwnerId={artifact.createdBy}
  convexUrl={convexUrl}
  userPermission={userPermission}  // ADD THIS LINE
/>
```

### Phase 2: Update DocumentViewer to Accept Permission

**File:** `/app/src/components/artifact/DocumentViewer.tsx`

1. Update interface (around line 74):
```tsx
interface DocumentViewerProps {
  documentId: string;
  onBack: () => void;
  artifactTitle: string;
  versions: BackendVersion[];
  onNavigateToSettings?: () => void;
  onNavigateToShare?: () => void;
  onNavigateToVersions?: () => void;
  shareToken: string;
  versionNumber: number;
  versionId: Id<"artifactVersions">;
  artifactOwnerId: Id<"users">;
  convexUrl: string;
  userPermission?: "owner" | "can-comment" | null;  // ADD THIS LINE
}
```

2. Destructure in function signature (around line 91):
```tsx
export function DocumentViewer({
  documentId,
  onBack,
  artifactTitle,
  versions,
  onNavigateToSettings,
  onNavigateToShare,
  onNavigateToVersions,
  shareToken,
  versionNumber,
  versionId,
  artifactOwnerId,
  convexUrl,
  userPermission,  // ADD THIS LINE
}: DocumentViewerProps) {
```

3. Calculate `isOwner` (add near line 105, after currentUser query):
```tsx
// Determine if current user is owner
const isOwner = userPermission === "owner";
```

### Phase 3: Add Permission Modals

**File:** `/app/src/components/artifact/DocumentViewer.tsx`

Create helper function to show permission modal (add after component function declaration, around line 105):

```tsx
/**
 * Show browser alert for permission-restricted actions
 */
const showPermissionModal = (action: 'upload' | 'share' | 'manage') => {
  const messages = {
    upload: 'Only the artifact owner can upload a new version.',
    share: 'Only the artifact owner can share this artifact.',
    manage: 'Only the artifact owner can manage this artifact.',
  };
  window.alert(messages[action]);
};
```

### Phase 4: Modify UI Elements

**File:** `/app/src/components/artifact/DocumentViewer.tsx`

#### 1. Upload New Version (line 939)

**Before:**
```tsx
<DropdownMenuItem
  className="text-purple-600"
  onClick={onNavigateToVersions}
>
  <Upload className="w-4 h-4 mr-2" />
  Upload New Version
</DropdownMenuItem>
```

**After:**
```tsx
<DropdownMenuItem
  className="text-purple-600"
  onClick={() => {
    if (!isOwner) {
      showPermissionModal('upload');
      return;
    }
    onNavigateToVersions?.();
  }}
>
  <Upload className="w-4 h-4 mr-2" />
  Upload New Version
</DropdownMenuItem>
```

#### 2. Share Button (line 961)

**Before:**
```tsx
{onNavigateToShare && (
  <Button variant="outline" size="sm" onClick={onNavigateToShare}>
    <Share2 className="w-4 h-4 mr-2" />
    Share
  </Button>
)}
```

**After:**
```tsx
{onNavigateToShare && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => {
      if (!isOwner) {
        showPermissionModal('share');
        return;
      }
      onNavigateToShare();
    }}
  >
    <Share2 className="w-4 h-4 mr-2" />
    Share
  </Button>
)}
```

#### 3. Manage Button (line 967)

**Before:**
```tsx
{onNavigateToSettings && (
  <Button variant="outline" size="sm" onClick={onNavigateToSettings}>
    <Settings className="w-4 h-4 mr-2" />
    Manage
  </Button>
)}
```

**After:**
```tsx
{onNavigateToSettings && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => {
      if (!isOwner) {
        showPermissionModal('manage');
        return;
      }
      onNavigateToSettings();
    }}
  >
    <Settings className="w-4 h-4 mr-2" />
    Manage
  </Button>
)}
```

---

## Files to Modify

| File | Changes | Lines |
|------|---------|-------|
| `/app/src/components/artifact/ArtifactViewerPage.tsx` | Pass `userPermission` prop to DocumentViewer | ~154 |
| `/app/src/components/artifact/DocumentViewer.tsx` | Add `userPermission` to interface | ~87 |
| `/app/src/components/artifact/DocumentViewer.tsx` | Destructure `userPermission` in function | ~103 |
| `/app/src/components/artifact/DocumentViewer.tsx` | Add `showPermissionModal` helper function | ~105 (new) |
| `/app/src/components/artifact/DocumentViewer.tsx` | Add `isOwner` constant | ~106 (new) |
| `/app/src/components/artifact/DocumentViewer.tsx` | Modify "Upload New Version" click handler | ~939-945 |
| `/app/src/components/artifact/DocumentViewer.tsx` | Modify "Share" button click handler | ~961-966 |
| `/app/src/components/artifact/DocumentViewer.tsx` | Modify "Manage" button click handler | ~967-972 |

---

## Testing Approach

### Manual Testing as Reviewer

1. **Setup:**
   - Create an artifact as User A
   - Invite User B (your test email) as a reviewer
   - Log in as User B
   - Navigate to the artifact via share link

2. **Test "Upload New Version":**
   - Click the version history dropdown (showing current version)
   - Click "Upload New Version"
   - **Expected:** Browser alert: "Only the artifact owner can upload a new version."
   - **Expected:** No navigation occurs

3. **Test "Share" button:**
   - Click the "Share" button in the top bar
   - **Expected:** Browser alert: "Only the artifact owner can share this artifact."
   - **Expected:** No navigation occurs

4. **Test "Manage" button:**
   - Click the "Manage" button in the top bar
   - **Expected:** Browser alert: "Only the artifact owner can manage this artifact."
   - **Expected:** No navigation occurs

5. **Test as Owner (Regression):**
   - Log in as User A (owner)
   - Navigate to the artifact
   - Click all three buttons
   - **Expected:** All buttons work normally, navigating to their respective pages
   - **Expected:** No alerts shown

### Edge Cases to Test

1. **Unauthenticated user:** Should not reach DocumentViewer (handled by ArtifactViewerPage)
2. **Permission changes during session:** Covered by existing real-time permission hook
3. **Old versions:** Reviewers can already only comment on latest version

---

## Alternative Approaches Considered

### 1. Hide Buttons for Reviewers
**Pros:** Cleaner UI, no confusing buttons
**Cons:**
- Users might not know these features exist
- Inconsistent with showing disabled elements in other UIs
**Decision:** Rejected - showing disabled state with explanation is better UX

### 2. Use ShadCN Dialog Instead of window.alert()
**Pros:** Better visual design, consistent with app UI
**Cons:**
- More code to write
- Need to manage dialog state
- Overkill for simple permission denial
**Decision:** Rejected for v1 - `window.alert()` is simplest solution per task requirements

### 3. Disable Buttons with Tooltip
**Pros:** Proactive feedback before click
**Cons:**
- Requires ShadCN Tooltip component
- More complex state management
- Still need onClick handler for accessibility
**Decision:** Could be future enhancement, but start with modal per requirements

---

## Implementation Notes

1. **Why not use `currentUserId === artifactOwnerId`?**
   - Permission should come from `access.ts` (single source of truth)
   - Keeps permission logic centralized
   - Easier to extend (e.g., add "can-edit" permission in future)

2. **Why `window.alert()` instead of ShadCN Dialog?**
   - Task explicitly requests "browser modal (alert)"
   - Simplest implementation
   - No state management needed
   - Can enhance later if needed

3. **Why not hide buttons?**
   - Showing disabled states is better UX (users know features exist)
   - Consistent with "read-only old version" banner pattern
   - Clearer permission model

4. **Why inline onClick handlers instead of separate functions?**
   - Each handler is simple (permission check + action)
   - Keeps related logic close to UI
   - Easier to read and maintain

---

## Future Enhancements

1. **Replace `window.alert()` with ShadCN Dialog**
   - Better visual design
   - Branded experience
   - Can include helpful links (e.g., "Contact the owner")

2. **Add visual indicators**
   - Disable button styling for reviewers
   - Tooltip on hover explaining why button is restricted

3. **Extend permission model**
   - Add "can-edit" permission
   - Allow owners to delegate upload permissions
   - Role-based access control

4. **Accessibility improvements**
   - Ensure alerts are screen-reader friendly
   - Add ARIA labels for permission-restricted buttons

---

## Success Criteria

- [ ] Reviewer sees "Upload New Version", "Share", and "Manage" buttons
- [ ] Clicking "Upload New Version" shows alert: "Only the artifact owner can upload a new version."
- [ ] Clicking "Share" shows alert: "Only the artifact owner can share this artifact."
- [ ] Clicking "Manage" shows alert: "Only the artifact owner can manage this artifact."
- [ ] No navigation occurs when clicking restricted buttons
- [ ] Owner can still use all buttons normally
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Changes do not break existing functionality

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking owner functionality | High | Test as owner before committing |
| `userPermission` undefined | Medium | Use optional chaining, default to "safe" (non-owner) |
| Modal not showing in tests | Low | Manual testing only for alerts |
| Inconsistent with other UIs | Low | Document pattern for future features |

---

## Timeline Estimate

| Task | Estimated Time |
|------|---------------|
| Update ArtifactViewerPage | 5 min |
| Update DocumentViewer interface | 5 min |
| Add showPermissionModal helper | 5 min |
| Modify Upload button | 5 min |
| Modify Share button | 5 min |
| Modify Manage button | 5 min |
| Manual testing | 15 min |
| **Total** | **45 min** |
