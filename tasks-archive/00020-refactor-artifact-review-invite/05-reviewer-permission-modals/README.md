# Subtask 05: Reviewer Permission Modals

## Status: COMPLETE

## Objective

Prevent reviewers (users with "can-comment" permission) from accessing owner-only features by showing browser alerts when they attempt to:
- Upload a new version
- Share the artifact
- Manage artifact settings

## Implementation Summary

### Changes Made

#### 1. ArtifactViewerPage.tsx
- **Line 154:** Added `userPermission={userPermission}` prop to DocumentViewer component
- **Purpose:** Pass permission level from parent to child component

#### 2. DocumentViewer.tsx

**Interface Updates:**
- **Line 88:** Added `userPermission?: "owner" | "can-comment" | null;` to `DocumentViewerProps`
- **Line 105:** Destructured `userPermission` in function parameters

**Permission Logic:**
- **Line 114:** Added `isOwner` constant: `const isOwner = userPermission === "owner";`
- **Lines 119-126:** Added `showPermissionModal()` helper function to display browser alerts

**UI Element Updates:**
- **Lines 958-964:** Modified "Upload New Version" button click handler
  - Checks `isOwner` before allowing navigation
  - Shows alert: "Only the artifact owner can upload a new version."

- **Lines 988-994:** Modified "Share" button click handler
  - Checks `isOwner` before allowing navigation
  - Shows alert: "Only the artifact owner can share this artifact."

- **Lines 1005-1010:** Modified "Manage" button click handler
  - Checks `isOwner` before allowing navigation
  - Shows alert: "Only the artifact owner can manage this artifact."

## Technical Approach

### Permission Check
- Uses `userPermission === "owner"` from Convex backend
- Single source of truth (no client-side owner calculation)
- Safe default: if permission is falsy, treat as non-owner

### Alert Implementation
- Uses native `window.alert()` (per requirements)
- Helper function centralizes alert messages
- Early return prevents navigation after alert

### Code Pattern
```typescript
onClick={() => {
  if (!isOwner) {
    showPermissionModal('action');
    return;
  }
  onNavigateToAction();
}}
```

## Validation

### Compile-Time
- TypeScript compilation successful for modified files
- No new TypeScript errors introduced
- All props correctly typed

### Runtime
- Dev server running on port 3000
- No console errors expected from changes
- Changes are backwards compatible

### Manual Testing Required

**As Reviewer (can-comment permission):**
1. Click "Upload New Version" → Should show alert
2. Click "Share" → Should show alert
3. Click "Manage" → Should show alert
4. All buttons should remain visible
5. No navigation should occur after dismissing alerts

**As Owner:**
1. Click "Upload New Version" → Should navigate to versions tab
2. Click "Share" → Should navigate to access tab
3. Click "Manage" → Should navigate to settings
4. No alerts should appear

## Files Modified

| File | Lines | Type |
|------|-------|------|
| `src/components/artifact/ArtifactViewerPage.tsx` | 154 | Added prop |
| `src/components/artifact/DocumentViewer.tsx` | 88, 105, 114, 119-126, 958-964, 988-994, 1005-1010 | Interface, logic, handlers |

## Dependencies

**None** - Uses existing:
- `userPermission` from `api.access.getPermission` (already fetched)
- Native `window.alert()` (browser API)
- Existing click handler patterns

## Future Enhancements

Per PLAN.md, potential improvements:
1. Replace `window.alert()` with ShadCN Dialog for better UX
2. Add visual disabled state to buttons for reviewers
3. Add tooltip explaining why action is restricted
4. Add ARIA labels for accessibility

## Success Criteria

- [x] TypeScript compiles without new errors
- [x] `userPermission` prop passed from ArtifactViewerPage
- [x] `isOwner` logic implemented
- [x] `showPermissionModal()` helper function created
- [x] "Upload New Version" handler updated
- [x] "Share" button handler updated
- [x] "Manage" button handler updated
- [x] Code follows existing patterns
- [ ] Manual testing as reviewer (requires user setup)
- [ ] Manual testing as owner (requires user setup)

## Notes

- No backend changes required (permission already available)
- No new components created (uses inline handlers)
- No state management needed (stateless permission check)
- Alert dismissal handled by browser
- Works with existing real-time permission updates from Convex

## Related Documentation

- **Planning:** `PLAN.md`
- **Development:** `DEVELOPMENT.md`
- **Parent Task:** `../README.md`
