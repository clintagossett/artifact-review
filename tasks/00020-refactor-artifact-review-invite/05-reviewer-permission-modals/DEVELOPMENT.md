# Development Plan: Reviewer Permission Modals

## Overview

Implement permission modals that prevent reviewers from accessing owner-only features (Upload New Version, Share, Manage).

## TDD Approach

**Note:** This is a UI interaction change with no backend logic modifications. Traditional TDD with unit tests would test implementation details (React component internals) rather than behavior. Instead, we'll:

1. **Manual validation** of the feature working correctly
2. **TypeScript compilation** to ensure type safety
3. **Runtime testing** to verify no console errors
4. **Visual confirmation** that modals appear with correct messages

**Rationale:** Testing `window.alert()` calls requires mocking global browser APIs, which tests implementation details rather than user behavior. E2E tests with Playwright could verify alerts, but are overkill for this simple permission guard. The real validation is manual testing as both owner and reviewer.

## Implementation Steps

### Step 1: Pass `userPermission` to DocumentViewer

**File:** `/app/src/components/artifact/ArtifactViewerPage.tsx`

**Changes:**
- Add `userPermission={userPermission}` to DocumentViewer props (line ~154)

**Validation:**
- TypeScript should not show errors
- App should compile without warnings

### Step 2: Update DocumentViewer Interface

**File:** `/app/src/components/artifact/DocumentViewer.tsx`

**Changes:**
1. Add `userPermission?: "owner" | "can-comment" | null;` to `DocumentViewerProps` interface (line ~87)
2. Destructure `userPermission` in function parameters (line ~103)

**Validation:**
- TypeScript should recognize the new prop
- No compilation errors

### Step 3: Add Permission Helper Logic

**File:** `/app/src/components/artifact/DocumentViewer.tsx`

**Changes:**
Add after line 109 (after `currentUserId` declaration):

```typescript
// Determine if current user is owner
const isOwner = userPermission === "owner";

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

**Validation:**
- No TypeScript errors
- Helper function is defined before it's used in JSX

### Step 4: Modify "Upload New Version" Click Handler

**File:** `/app/src/components/artifact/DocumentViewer.tsx`

**Location:** Line 939-945 (inside version history dropdown)

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

**Validation:**
- TypeScript accepts the inline arrow function
- `isOwner` and `showPermissionModal` are in scope

### Step 5: Modify "Share" Button Click Handler

**File:** `/app/src/components/artifact/DocumentViewer.tsx`

**Location:** Line 961-966

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

**Validation:**
- Button still renders conditionally based on `onNavigateToShare`
- Click handler checks permission before navigating

### Step 6: Modify "Manage" Button Click Handler

**File:** `/app/src/components/artifact/DocumentViewer.tsx`

**Location:** Line 967-972

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

**Validation:**
- Button still renders conditionally based on `onNavigateToSettings`
- Click handler checks permission before navigating

## Validation Steps

### Compile-Time Validation

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app
npm run build
```

**Expected:**
- Build succeeds without TypeScript errors
- No warnings about unused props or variables

### Runtime Validation

```bash
# Start dev servers
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review
./scripts/start-dev-servers.sh
```

**Expected:**
- App starts without errors
- No console errors on page load

### Manual Testing as Reviewer

**Prerequisites:**
1. Create an artifact as User A (owner)
2. Invite User B as reviewer (with "can-comment" permission)
3. Log in as User B
4. Navigate to artifact via share link

**Test Cases:**

#### TC1: Upload New Version Button
1. Click the version history dropdown (shows current version)
2. Click "Upload New Version"

**Expected:**
- Browser alert appears: "Only the artifact owner can upload a new version."
- Alert dismissed, no navigation occurs
- User remains on artifact view page

#### TC2: Share Button
1. Click the "Share" button in top bar

**Expected:**
- Browser alert appears: "Only the artifact owner can share this artifact."
- Alert dismissed, no navigation occurs
- User remains on artifact view page

#### TC3: Manage Button
1. Click the "Manage" button in top bar

**Expected:**
- Browser alert appears: "Only the artifact owner can manage this artifact."
- Alert dismissed, no navigation occurs
- User remains on artifact view page

### Regression Testing as Owner

**Prerequisites:**
1. Log in as User A (owner of the artifact)
2. Navigate to the artifact

**Test Cases:**

#### TC4: Owner Can Upload New Version
1. Click version history dropdown
2. Click "Upload New Version"

**Expected:**
- No alert appears
- Navigation to settings page, "Versions" tab

#### TC5: Owner Can Share
1. Click "Share" button

**Expected:**
- No alert appears
- Navigation to settings page, "Access and Activity" tab

#### TC6: Owner Can Manage
1. Click "Manage" button

**Expected:**
- No alert appears
- Navigation to settings page

### Edge Case Testing

#### TC7: Permission is Undefined
**Scenario:** `userPermission` is `undefined` or `null` (edge case)

**Expected:**
- User is treated as non-owner (safe default)
- Clicking buttons shows permission modals

#### TC8: Permission Changes During Session
**Scenario:** Owner demotes themselves or promotes reviewer (unlikely but possible)

**Expected:**
- Permission change reflected in real-time
- UI updates based on new permission level
- (This is already handled by Convex reactive queries)

## Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| `ArtifactViewerPage.tsx` | 154 | Pass `userPermission` prop |
| `DocumentViewer.tsx` | 87 | Add interface property |
| `DocumentViewer.tsx` | 103 | Destructure prop |
| `DocumentViewer.tsx` | 110-121 | Add helper logic |
| `DocumentViewer.tsx` | 939-945 | Modify upload handler |
| `DocumentViewer.tsx` | 961-966 | Modify share handler |
| `DocumentViewer.tsx` | 967-972 | Modify manage handler |

## Success Criteria

- [ ] TypeScript compiles without errors
- [ ] App runs without console errors
- [ ] Reviewer sees all three buttons (Upload, Share, Manage)
- [ ] Clicking Upload as reviewer shows correct alert message
- [ ] Clicking Share as reviewer shows correct alert message
- [ ] Clicking Manage as reviewer shows correct alert message
- [ ] No navigation occurs when reviewer clicks restricted buttons
- [ ] Owner can still use all buttons normally (no alerts)
- [ ] Owner buttons navigate to correct pages
- [ ] Code follows existing patterns in codebase

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Break owner functionality | High | Test as owner before committing |
| `userPermission` undefined causes crash | Medium | Use safe default (`!isOwner` = true if permission falsy) |
| Browser alert blockers | Low | Document that alerts must be enabled for feature |
| TypeScript errors from prop passing | Medium | Verify interface matches usage |

## Timeline

| Task | Estimated Time |
|------|---------------|
| Step 1: Pass prop | 2 min |
| Step 2: Update interface | 3 min |
| Step 3: Add helpers | 5 min |
| Step 4: Upload handler | 3 min |
| Step 5: Share handler | 3 min |
| Step 6: Manage handler | 3 min |
| Compile validation | 2 min |
| Manual testing as reviewer | 10 min |
| Regression testing as owner | 10 min |
| **Total** | **41 min** |

## Notes

- Using `window.alert()` per task requirements (not ShadCN Dialog)
- Inline click handlers for simplicity (no new functions to hoist)
- Permission check uses `userPermission === "owner"` (explicit check)
- Safe default: if permission is falsy, treat as non-owner
- No backend changes required (permission already fetched in ArtifactViewerPage)
