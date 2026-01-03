# Subtask 03: Update Viewer Components

**Parent Task:** 00024-wire-frontend-artifact-settings-details
**Status:** Pending
**Estimated Time:** 45 minutes
**Dependencies:** Subtask 01 must be completed first

## Objective

Update the artifact viewer components to use `name` instead of `title` and `createdBy` instead of `creatorId`, matching the backend schema changes.

## Files to Modify

| File | Line Numbers | Changes |
|------|-------------|---------|
| `app/src/components/artifact/ArtifactViewerPage.tsx` | 117, 144, 152, 159-163 | Field renames |
| `app/src/components/artifact/DocumentViewer.tsx` | 78, 94, 889, 952 | Prop rename (optional) |
| `app/src/app/a/[shareToken]/settings/ArtifactSettingsClient.tsx` | 79 | Field rename |

## Detailed Changes

### 1. ArtifactViewerPage.tsx

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/artifact/ArtifactViewerPage.tsx`

**Line 117 - AccessDeniedMessage prop:**
```typescript
// BEFORE
return <AccessDeniedMessage artifactTitle={artifact.title} />;

// AFTER
return <AccessDeniedMessage artifactTitle={artifact.name} />;
```

**Line 144 - DocumentViewer artifactTitle prop:**
```typescript
// BEFORE
<DocumentViewer
  documentId={artifact._id}
  onBack={() => router.push("/dashboard")}
  artifactTitle={artifact.title}
  // ...

// AFTER
<DocumentViewer
  documentId={artifact._id}
  onBack={() => router.push("/dashboard")}
  artifactTitle={artifact.name}
  // ...
```

**Line 152 - DocumentViewer artifactOwnerId prop:**
```typescript
// BEFORE
artifactOwnerId={artifact.creatorId}

// AFTER
artifactOwnerId={artifact.createdBy}
```

**Lines 159-163 - ShareModal artifact prop:**
```typescript
// BEFORE
<ShareModal
  isOpen={shareModalOpen}
  onClose={() => setShareModalOpen(false)}
  artifact={{
    _id: artifact._id,
    title: artifact.title,
    shareToken: artifact.shareToken,
  }}
/>

// AFTER
<ShareModal
  isOpen={shareModalOpen}
  onClose={() => setShareModalOpen(false)}
  artifact={{
    _id: artifact._id,
    name: artifact.name,
    shareToken: artifact.shareToken,
  }}
/>
```

---

### 2. DocumentViewer.tsx (Optional Prop Rename)

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/artifact/DocumentViewer.tsx`

**Recommendation:** For full consistency, rename the `artifactTitle` prop to `artifactName`. However, this is optional as the prop name is just a descriptor.

**Line 78 - Interface:**
```typescript
// BEFORE
interface DocumentViewerProps {
  documentId: string;
  onBack: () => void;
  // Real artifact data (replacing mock project)
  artifactTitle: string;
  // ...
}

// AFTER (optional - for consistency)
interface DocumentViewerProps {
  documentId: string;
  onBack: () => void;
  // Real artifact data (replacing mock project)
  artifactName: string;
  // ...
}
```

**Line 94 - Destructuring:**
```typescript
// BEFORE
export function DocumentViewer({
  documentId,
  onBack,
  artifactTitle,
  // ...
}: DocumentViewerProps) {

// AFTER (optional - for consistency)
export function DocumentViewer({
  documentId,
  onBack,
  artifactName,
  // ...
}: DocumentViewerProps) {
```

**Line 889 - Usage in header:**
```typescript
// BEFORE
<h1 className="font-semibold text-gray-900">{artifactTitle}</h1>

// AFTER (optional - for consistency)
<h1 className="font-semibold text-gray-900">{artifactName}</h1>
```

**Line 952 - Usage when no versions:**
```typescript
// BEFORE
{versions.length === 0 && <h1 className="font-semibold text-gray-900">{artifactTitle}</h1>}

// AFTER (optional - for consistency)
{versions.length === 0 && <h1 className="font-semibold text-gray-900">{artifactName}</h1>}
```

**Note:** If you rename the prop, you'll also need to update the caller in `ArtifactViewerPage.tsx`:
```typescript
// If prop is renamed to artifactName
artifactName={artifact.name}
```

---

### 3. ArtifactSettingsClient.tsx

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/app/a/[shareToken]/settings/ArtifactSettingsClient.tsx`

**Line 79 - ArtifactSettings prop:**
```typescript
// BEFORE
return (
  <ArtifactSettings
    onBack={handleBack}
    artifactId={artifact._id}
    artifactName={artifact.title}
    isOwner={isOwner}
    initialTab={initialTab}
  />
);

// AFTER
return (
  <ArtifactSettings
    onBack={handleBack}
    artifactId={artifact._id}
    artifactName={artifact.name}
    isOwner={isOwner}
    initialTab={initialTab}
  />
);
```

---

## Acceptance Criteria

- [ ] `ArtifactViewerPage.tsx` uses `artifact.name` instead of `artifact.title`
- [ ] `ArtifactViewerPage.tsx` uses `artifact.createdBy` instead of `artifact.creatorId`
- [ ] `ArtifactSettingsClient.tsx` passes `artifact.name` to `ArtifactSettings`
- [ ] (Optional) `DocumentViewer.tsx` prop renamed from `artifactTitle` to `artifactName`
- [ ] TypeScript compiles without errors
- [ ] Artifact viewer displays correct name

## Verification Commands

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app

# Check TypeScript compilation
npx tsc --noEmit

# Search for any remaining 'title' references in viewer components
grep -n "artifact.title\|creatorId" src/components/artifact/ArtifactViewerPage.tsx
grep -n "artifact.title" src/app/a/\[shareToken\]/settings/ArtifactSettingsClient.tsx
```

## Implementation Order

1. Update `ArtifactViewerPage.tsx` (required)
2. Update `ArtifactSettingsClient.tsx` (required)
3. (Optional) Update `DocumentViewer.tsx` prop name for consistency

## Notes

- The `AccessDeniedMessage` component uses a generic `artifactTitle` prop - leave the prop name as-is
- The `DocumentViewer` prop rename is optional but recommended for consistency
- These changes are presentation layer only - no backend calls modified

## Reference

See full design document: `/Users/clintgossett/Documents/personal/personal projects/artifact-review/tasks/00024-wire-frontend-artifact-settings-details/design.md`
