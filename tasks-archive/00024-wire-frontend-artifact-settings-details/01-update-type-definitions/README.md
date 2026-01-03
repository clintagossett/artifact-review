# Subtask 01: Update Type Definitions and Interfaces

**Parent Task:** 00024-wire-frontend-artifact-settings-details
**Status:** Pending
**Estimated Time:** 1 hour

## Objective

Update all TypeScript interfaces that use `title` to use `name` instead, matching the backend schema change from Task 00022.

## Files to Modify

| File | Line Numbers | Change |
|------|-------------|--------|
| `app/src/components/artifacts/ArtifactCard.tsx` | 9, 72 | Interface + usage |
| `app/src/components/artifacts/ArtifactList.tsx` | 9 | Interface only |
| `app/src/components/artifact/ArtifactHeader.tsx` | 14, 84, 126 | Interface + usage |
| `app/src/components/artifacts/ShareModal.tsx` | 22, 58 | Interface + usage |
| `app/src/components/artifact/ShareModal.tsx` | 36 | Interface only |

## Detailed Changes

### 1. ArtifactCard.tsx

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/artifacts/ArtifactCard.tsx`

**Line 9 - Interface definition:**
```typescript
// BEFORE
export interface ArtifactCardProps {
  artifact: {
    _id: Id<"artifacts">;
    title: string;
    description?: string;
    // ...

// AFTER
export interface ArtifactCardProps {
  artifact: {
    _id: Id<"artifacts">;
    name: string;
    description?: string;
    // ...
```

**Line 72 - Usage:**
```typescript
// BEFORE
<h3 className="font-semibold text-gray-900">{artifact.title}</h3>

// AFTER
<h3 className="font-semibold text-gray-900">{artifact.name}</h3>
```

---

### 2. ArtifactList.tsx

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/artifacts/ArtifactList.tsx`

**Line 9 - Interface definition:**
```typescript
// BEFORE
export interface ArtifactListProps {
  artifacts: Array<{
    _id: Id<"artifacts">;
    title: string;
    description?: string;
    // ...

// AFTER
export interface ArtifactListProps {
  artifacts: Array<{
    _id: Id<"artifacts">;
    name: string;
    description?: string;
    // ...
```

---

### 3. ArtifactHeader.tsx

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/artifact/ArtifactHeader.tsx`

**Line 14 - Interface definition:**
```typescript
// BEFORE
interface ArtifactHeaderProps {
  artifact: {
    _id?: Id<"artifacts">;
    title: string;
    shareToken: string;
  };

// AFTER
interface ArtifactHeaderProps {
  artifact: {
    _id?: Id<"artifacts">;
    name: string;
    shareToken: string;
  };
```

**Line 84 - Usage in heading:**
```typescript
// BEFORE
<h1 className="text-gray-900">{artifact.title}</h1>

// AFTER
<h1 className="text-gray-900">{artifact.name}</h1>
```

**Lines 124-128 - ShareModal prop:**
```typescript
// BEFORE
<ShareModal
  isOpen={isShareModalOpen}
  onClose={() => setIsShareModalOpen(false)}
  artifact={{
    _id: artifact._id,
    title: artifact.title,
    shareToken: artifact.shareToken,
  }}
/>

// AFTER
<ShareModal
  isOpen={isShareModalOpen}
  onClose={() => setIsShareModalOpen(false)}
  artifact={{
    _id: artifact._id,
    name: artifact.name,
    shareToken: artifact.shareToken,
  }}
/>
```

---

### 4. ShareModal.tsx (artifacts folder)

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/artifacts/ShareModal.tsx`

**Lines 20-25 - Interface definition:**
```typescript
// BEFORE
export interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: {
    _id: Id<"artifacts">;
    title: string;
    shareToken: string;
  };
}

// AFTER
export interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: {
    _id: Id<"artifacts">;
    name: string;
    shareToken: string;
  };
}
```

**Line 58 - Usage in DialogTitle:**
```typescript
// BEFORE
<DialogTitle>Share &quot;{artifact.title}&quot;</DialogTitle>

// AFTER
<DialogTitle>Share &quot;{artifact.name}&quot;</DialogTitle>
```

---

### 5. ShareModal.tsx (artifact folder)

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/artifact/ShareModal.tsx`

**Lines 34-38 - Interface definition:**
```typescript
// BEFORE
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: {
    _id: Id<"artifacts">;
    title: string;
    shareToken: string;
  };
  // ...
}

// AFTER
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: {
    _id: Id<"artifacts">;
    name: string;
    shareToken: string;
  };
  // ...
}
```

---

## Acceptance Criteria

- [ ] All 5 files have their interfaces updated from `title` to `name`
- [ ] All JSX usages of `artifact.title` are updated to `artifact.name`
- [ ] TypeScript compiles without errors: `cd app && npx tsc --noEmit`
- [ ] No runtime errors when rendering components

## Verification Commands

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app

# Check TypeScript compilation
npx tsc --noEmit

# Search for any remaining 'title' references in artifact interfaces
grep -rn "title: string" src/components/artifacts/ src/components/artifact/ArtifactHeader.tsx
```

## Notes

- These changes must be made BEFORE subtask 02 and 03, as other components depend on these interfaces
- The test files will also need updating (handled in subtask 05)
- Do NOT change the `artifactTitle` prop name in `DocumentViewer.tsx` yet - that's handled in subtask 03

## Reference

See full design document: `/Users/clintgossett/Documents/personal/personal projects/artifact-review/tasks/00024-wire-frontend-artifact-settings-details/design.md`
