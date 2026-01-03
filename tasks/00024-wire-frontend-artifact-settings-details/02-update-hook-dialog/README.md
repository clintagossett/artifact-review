# Subtask 02: Update Hook and Dialog

**Parent Task:** 00024-wire-frontend-artifact-settings-details
**Status:** Pending
**Estimated Time:** 30 minutes
**Dependencies:** Subtask 01 must be completed first

## Objective

Update the `useArtifactUpload` hook interface and the `NewArtifactDialog` component to use `name` instead of `title`, ensuring the artifact creation flow matches the backend.

## Files to Modify

| File | Changes |
|------|---------|
| `app/src/hooks/useArtifactUpload.ts` | Interface + destructuring + action call |
| `app/src/components/artifacts/NewArtifactDialog.tsx` | Local state + handlers + JSX |

## Detailed Changes

### 1. useArtifactUpload.ts

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/hooks/useArtifactUpload.ts`

**Lines 8-13 - Interface definition:**
```typescript
// BEFORE
export interface CreateArtifactData {
  file: File;
  title: string;
  description?: string;
  entryPoint?: string; // For ZIP files
}

// AFTER
export interface CreateArtifactData {
  file: File;
  name: string;
  description?: string;
  entryPoint?: string; // For ZIP files
}
```

**Line 67 - Destructuring:**
```typescript
// BEFORE
const { file, title, description, entryPoint } = data;

// AFTER
const { file, name, description, entryPoint } = data;
```

**Lines 96-103 - Action call for HTML/Markdown:**
```typescript
// BEFORE
const result = await createArtifact({
  title,
  description,
  fileType,
  content,  // Unified field for Phase 1
  originalFileName: file.name,
  name: undefined,
});

// AFTER
const result = await createArtifact({
  name,
  description,
  fileType,
  content,  // Unified field for Phase 1
  originalFileName: file.name,
});
```

**Lines 117-122 - Action call for ZIP:**
```typescript
// BEFORE
const { uploadUrl, artifactId, versionId, shareToken } =
  await createArtifactWithZip({
    title,
    description,
    fileSize: file.size,
    entryPoint,
  });

// AFTER
const { uploadUrl, artifactId, versionId, shareToken } =
  await createArtifactWithZip({
    name,
    description,
    fileSize: file.size,
    entryPoint,
  });
```

---

### 2. NewArtifactDialog.tsx

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/artifacts/NewArtifactDialog.tsx`

This component uses local state named `title` which should be renamed to `name` for consistency with the data model.

**Lines 49-51 - State declaration:**
```typescript
// BEFORE
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [title, setTitle] = useState("");
const [description, setDescription] = useState("");

// AFTER
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [name, setName] = useState("");
const [description, setDescription] = useState("");
```

**Lines 54-59 - File select handler:**
```typescript
// BEFORE
const handleFileSelect = (file: File) => {
  setSelectedFile(file);
  // Auto-suggest title if title is empty
  if (!title) {
    setTitle(suggestTitleFromFilename(file.name));
  }
};

// AFTER
const handleFileSelect = (file: File) => {
  setSelectedFile(file);
  // Auto-suggest name if name is empty
  if (!name) {
    setName(suggestTitleFromFilename(file.name));
  }
};
```

**Lines 66-87 - Submit handler:**
```typescript
// BEFORE
const handleSubmit = async () => {
  if (!selectedFile || !title.trim()) return;

  setIsSubmitting(true);
  try {
    await onCreateArtifact({
      file: selectedFile,
      title: title.trim(),
      description: description.trim() || undefined,
    });

    // Reset form
    setSelectedFile(null);
    setTitle("");
    setDescription("");
    onOpenChange(false);
  } catch (error) {
    console.error("Failed to create artifact:", error);
  } finally {
    setIsSubmitting(false);
  }
};

// AFTER
const handleSubmit = async () => {
  if (!selectedFile || !name.trim()) return;

  setIsSubmitting(true);
  try {
    await onCreateArtifact({
      file: selectedFile,
      name: name.trim(),
      description: description.trim() || undefined,
    });

    // Reset form
    setSelectedFile(null);
    setName("");
    setDescription("");
    onOpenChange(false);
  } catch (error) {
    console.error("Failed to create artifact:", error);
  } finally {
    setIsSubmitting(false);
  }
};
```

**Lines 89-94 - Cancel handler:**
```typescript
// BEFORE
const handleCancel = () => {
  setSelectedFile(null);
  setTitle("");
  setDescription("");
  onOpenChange(false);
};

// AFTER
const handleCancel = () => {
  setSelectedFile(null);
  setName("");
  setDescription("");
  onOpenChange(false);
};
```

**Line 96 - Validation:**
```typescript
// BEFORE
const isValid = selectedFile && title.trim().length > 0;

// AFTER
const isValid = selectedFile && name.trim().length > 0;
```

**Lines 132-138 - Input field:**
```typescript
// BEFORE
<Input
  id="artifact-name"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  placeholder="e.g., June Earnings by Region"
  disabled={isSubmitting}
/>

// AFTER
<Input
  id="artifact-name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="e.g., June Earnings by Region"
  disabled={isSubmitting}
/>
```

---

## Acceptance Criteria

- [ ] `CreateArtifactData` interface uses `name` instead of `title`
- [ ] `useArtifactUpload` passes `name` to backend actions
- [ ] `NewArtifactDialog` local state renamed from `title` to `name`
- [ ] Form validation uses `name` field
- [ ] TypeScript compiles without errors
- [ ] Create artifact flow works end-to-end

## Verification Commands

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app

# Check TypeScript compilation
npx tsc --noEmit

# Search for any remaining 'title' references
grep -n "title" src/hooks/useArtifactUpload.ts
grep -n "setTitle\|title\." src/components/artifacts/NewArtifactDialog.tsx
```

## Notes

- The `suggestTitleFromFilename` function name can stay as-is - it's a helper function name, not a data field
- After this change, the entire artifact creation flow will use `name` consistently
- Tests for `useArtifactUpload` will need updating (handled in subtask 05)

## Reference

See full design document: `/Users/clintgossett/Documents/personal/personal projects/artifact-review/tasks/00024-wire-frontend-artifact-settings-details/design.md`
