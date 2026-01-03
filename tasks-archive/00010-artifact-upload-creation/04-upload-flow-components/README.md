# Subtask 04: Upload Flow Components

**Parent Task:** 00010 - Artifact Upload & Creation
**Status:** Ready for Implementation
**Priority:** High
**Owner:** TDD Developer Agent

---

## Overview

Implement the **upload flow** - getting artifacts into the system. This covers drag-and-drop upload, file processing, and the create artifact dialog.

**Core User Story:**
"As a user, I want to upload HTML, Markdown, or ZIP files so I can start reviewing them with my team."

---

## Components to Implement

### 1. **UploadDropzone** (Custom Component)
**File:** `app/src/components/artifacts/UploadDropzone.tsx`

**Purpose:** Drag-and-drop file upload area with file picker fallback

**Props:**
```typescript
interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string; // ".html,.htm,.md,.zip"
  maxSize?: number; // in bytes
  className?: string;
}
```

**States:**
- `default` - Dashed border, upload icon, "Drop your files here" text
- `drag-active` - Purple border, purple-50 background, animated
- `file-selected` - Show file name, size, remove button
- `uploading` - Progress bar, percentage, disable interactions
- `error` - Red border, error message, allow retry

**Visual Reference:** `03-frontend-design-analysis/screenshots/landing_page_logged_in.png`

**Validation:**
- File type: `.html`, `.htm`, `.md`, `.zip` only
- HTML max: 5MB
- Markdown max: 1MB
- ZIP max: 100MB

**Tests:**
- Drag enter/leave states
- Drop valid file
- Drop invalid file type
- Drop oversized file
- Click "Choose File" button
- File input change event
- Remove selected file

---

### 2. **NewArtifactDialog** (Modal)
**File:** `app/src/components/artifacts/NewArtifactDialog.tsx`

**Purpose:** Modal dialog for creating new artifact with metadata

**Props:**
```typescript
interface NewArtifactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateArtifact: (data: CreateArtifactData) => Promise<void>;
}

interface CreateArtifactData {
  file: File;
  title: string;
  description?: string;
}
```

**Features:**
- ShadCN Dialog component
- Embedded UploadDropzone
- Auto-suggest title from filename (smart parsing: remove extension, capitalize)
- Title input (required)
- Description textarea (optional, 3 rows, resize-none)
- Footer: Cancel (outline) + Create Project (purple)
- Disable "Create" until file + title provided
- Close on cancel or successful create

**Visual Reference:** `03-frontend-design-analysis/screenshots/artifact_upload-modal.png`

**Flow:**
1. User opens dialog (via button or dropzone)
2. User drops/selects file
3. Title auto-populates from filename
4. User edits title (optional)
5. User adds description (optional)
6. User clicks "Create Project"
7. For ZIP files: Dialog closes, EntryPointDialog opens
8. For HTML/MD: Upload starts immediately

**Tests:**
- Open/close dialog
- File upload in dialog
- Auto-suggest title from filename
- Edit title manually
- Add description
- Submit without file (disabled)
- Submit without title (disabled)
- Cancel loses changes
- Successful create closes dialog

---

### 3. **EntryPointDialog** (Modal)
**File:** `app/src/components/artifacts/EntryPointDialog.tsx`

**Purpose:** Select entry point HTML file for ZIP archives

**Props:**
```typescript
interface EntryPointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zipFileName: string;
  htmlFiles: string[]; // List of HTML file paths in ZIP
  onSelect: (entryPoint: string) => Promise<void>;
}
```

**Features:**
- ShadCN Dialog component
- Show ZIP filename in subtitle
- Show count: "Found X HTML files:"
- ShadCN ScrollArea (max-height: 300px)
- Radio-style file list (custom, not ShadCN Radio)
- Auto-select `index.html` if exists (case-insensitive)
- Else auto-select `main.html` if exists
- Else first item selected by default
- Selected item: Purple border-2, CheckCircle2 icon
- Unselected: Gray border, clickable
- Footer: Cancel + Confirm (purple)

**Visual Reference:** `figma-designs/src/app/components/EntryPointDialog.tsx`

**Tests:**
- Display file list
- Auto-select index.html
- Auto-select main.html (no index.html)
- Select different file
- Confirm selection
- Cancel selection

---

### 4. **File Upload Integration** (Logic/Hooks)
**File:** `app/src/hooks/useArtifactUpload.ts`

**Purpose:** Handle file upload logic and state

```typescript
interface UseArtifactUploadReturn {
  uploadFile: (data: CreateArtifactData) => Promise<void>;
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

function useArtifactUpload(): UseArtifactUploadReturn;
```

**Flow:**
1. **HTML/Markdown Files:**
   - Read file content as text
   - Call backend `api.artifacts.create` mutation
   - Pass: title, description, fileType, htmlContent/markdownContent, fileSize
   - Return artifactId, versionId, shareToken

2. **ZIP Files:**
   - Upload file to Convex storage (`storage.store`)
   - Call backend `api.artifacts.create` mutation with fileType="zip"
   - Call backend `internal.zipProcessor.processZipFile` action
   - Action extracts files, detects entry point, stores in artifactFiles table
   - Poll or wait for completion

**Error Handling:**
- Network errors
- Validation errors from backend
- File read errors
- ZIP extraction errors

**Tests:**
- Upload HTML file successfully
- Upload Markdown file successfully
- Upload ZIP file successfully
- Handle network error
- Handle validation error
- Show upload progress
- Reset after error

---

### 5. **Progress Indicator**
**File:** `app/src/components/artifacts/UploadProgress.tsx`

**Purpose:** Show upload progress with file name and percentage

**Props:**
```typescript
interface UploadProgressProps {
  fileName: string;
  progress: number; // 0-100
  fileSize?: number;
}
```

**Features:**
- ShadCN Progress component
- File icon + name
- Progress bar (purple)
- Percentage text
- File size (formatted: KB, MB)

**Tests:**
- Display file name
- Show progress percentage
- Update progress value
- Format file size correctly

---

## Backend Integration

### Mutations to Use

```typescript
// For HTML/Markdown
const result = await api.artifacts.create({
  title: string,
  description?: string,
  fileType: "html" | "markdown",
  htmlContent?: string,
  markdownContent?: string,
  fileSize: number,
});

// For ZIP
const result = await api.artifacts.create({
  title: string,
  description?: string,
  fileType: "zip",
  fileSize: number,
});

// Then process ZIP
await internal.zipProcessor.processZipFile({
  versionId: result.versionId,
  storageId: string, // From storage.store
});
```

### Storage Upload

```typescript
// Upload file to Convex storage
const storageId = await storage.store(blob);
```

---

## User Flows

### Flow 1: Upload HTML via Dropzone
```
1. User lands on Dashboard
2. User drags HTML file onto dropzone
3. File validates (type, size)
4. NewArtifactDialog opens with file pre-loaded
5. Title auto-suggests from filename
6. User clicks "Create Project"
7. Upload progress shows
8. Success: Toast notification, navigate to viewer or stay on dashboard
9. Error: Show error message, allow retry
```

### Flow 2: Upload ZIP via Dialog Button
```
1. User clicks "+ New Artifact" button
2. NewArtifactDialog opens (empty)
3. User drops ZIP file in dialog
4. Title auto-suggests
5. User clicks "Create Project"
6. Dialog closes
7. EntryPointDialog opens with HTML file list
8. index.html auto-selected
9. User confirms
10. Upload starts with progress
11. Success: New artifact card appears
```

### Flow 3: Invalid File Type
```
1. User drops .pdf file
2. Dropzone shows error state
3. Red border, error icon
4. Message: "Invalid file type. Supports .html, .md, .zip"
5. User clicks "Choose File" to try again
```

---

## Design Tokens

### Colors
```typescript
// Upload button, icons, accents
const PURPLE = {
  button: 'bg-purple-600 hover:bg-purple-700',
  icon: 'text-purple-600',
  border: 'border-purple-500',
  bg: 'bg-purple-50',
};

// Error states
const ERROR = {
  border: 'border-red-500',
  bg: 'bg-red-50',
  text: 'text-red-600',
};
```

### Spacing
```typescript
// Dropzone
padding: 'p-12' // 48px

// Modal
padding: 'p-6' // 24px

// Buttons gap
gap: 'gap-3' // 12px
```

---

## Accessibility

- **Dropzone:**
  - `role="button"`
  - `aria-label="Drop zone for file upload"`
  - `tabIndex={0}`
  - Enter key triggers file picker

- **File input:**
  - Hidden visually but accessible
  - Label with `htmlFor` attribute

- **Dialogs:**
  - Focus trap
  - Escape key closes
  - Return focus on close

- **Progress:**
  - Announce progress changes to screen readers
  - `aria-live="polite"`

---

## Testing Strategy

### Unit Tests
- Individual component rendering
- State changes (drag states, file selection)
- Props validation
- Event handlers
- Error states

### Integration Tests
- Upload flow end-to-end (HTML, MD, ZIP)
- Backend mutation calls
- File validation
- Progress tracking

### Component Tests Location
`tasks/00010-artifact-upload-creation/tests/frontend/upload-flow/`

Files:
- `UploadDropzone.test.tsx`
- `NewArtifactDialog.test.tsx`
- `EntryPointDialog.test.tsx`
- `useArtifactUpload.test.ts`
- `UploadProgress.test.tsx`

---

## Success Criteria

- [ ] User can drag-and-drop HTML file onto dashboard
- [ ] User can upload Markdown file via dialog
- [ ] User can upload ZIP file with entry point selection
- [ ] File validation works (type, size)
- [ ] Upload progress shows during upload
- [ ] Errors display with helpful messages
- [ ] Success toast appears after upload
- [ ] Auto-suggest title from filename works
- [ ] All components match Figma designs
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Accessibility requirements met

---

## Deliverables

1. **Components:**
   - `UploadDropzone.tsx`
   - `NewArtifactDialog.tsx`
   - `EntryPointDialog.tsx`
   - `UploadProgress.tsx`
   - `useArtifactUpload.ts` (hook)

2. **Tests:**
   - Unit tests for all components
   - Integration tests for upload flows
   - All tests passing

3. **Documentation:**
   - Component usage examples
   - Props documentation (TSDoc comments)

4. **Validation:**
   - Screen recording of upload flows
   - Screenshots matching Figma

---

## References

- **Design Analysis:** `03-frontend-design-analysis/README.md`
- **Screenshots:** `03-frontend-design-analysis/screenshots/`
- **Backend API:** `app/convex/artifacts.ts`
- **Test Report:** `test-report.md` (backend)
- **Convex Rules:** `docs/architecture/convex-rules.md`
- **Testing Guide:** `docs/development/testing-guide.md`

---

**Ready for TDD Developer Agent**
