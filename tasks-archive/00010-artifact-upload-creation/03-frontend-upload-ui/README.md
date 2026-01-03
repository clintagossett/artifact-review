# Subtask 03: Frontend Upload UI

**Status:** Pending
**Estimated Effort:** 4-5 hours
**Owner:** TBD
**Prerequisites:** Subtask 02 (Backend) must be complete

## Purpose

Build user interface for artifact creation and upload, aligned with Figma designs.

## Design References

**CRITICAL:** Review Figma designs before implementation:
- Figma: `figma-designs/` (git submodule)
- Figma URL: https://www.figma.com/design/8Roikp7VBTQaxiWbQKRtZ2/Collaborative-HTML-Review-Platform
- Existing chef implementation (review for patterns)

### Design Review Checklist
- [ ] "New Artifact" button placement and styling
- [ ] Upload modal vs dedicated page (check Figma)
- [ ] Drag-and-drop zone visual design
- [ ] File picker button styling
- [ ] Progress indicators
- [ ] Artifact metadata form layout
- [ ] Error state designs
- [ ] Success state / confirmation

## Components to Build

### 1. `UploadArtifact.tsx`
**Location:** `app/src/components/artifacts/UploadArtifact.tsx`

**Purpose:** Main upload component with drag-and-drop and file picker.

**Props:**
```typescript
interface UploadArtifactProps {
  onUploadComplete?: (artifactId: Id<"artifacts">, shareToken: string) => void;
  onCancel?: () => void;
}
```

**Features:**
- Drag-and-drop zone (highlight on dragover)
- File picker fallback button
- File type validation (`.html`, `.htm`)
- File size validation (< 5MB)
- Preview of selected file (name, size)
- Loading state during upload
- Error handling (size limit, invalid format, network errors)
- Success state with share link

**Implementation Notes:**
```typescript
const handleFileDrop = (e: React.DragEvent) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file) return;

  // Validate file type
  if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
    setError('Please upload an HTML file');
    return;
  }

  // Validate file size
  if (file.size > 5 * 1024 * 1024) {
    setError('File size exceeds 5MB limit');
    return;
  }

  // Read file content
  const reader = new FileReader();
  reader.onload = (e) => {
    const htmlContent = e.target?.result as string;
    setUploadedFile({ name: file.name, content: htmlContent });
  };
  reader.readAsText(file);
};
```

### 2. `ArtifactForm.tsx`
**Location:** `app/src/components/artifacts/ArtifactForm.tsx`

**Purpose:** Metadata form for artifact (title, description).

**Props:**
```typescript
interface ArtifactFormProps {
  htmlContent: string;
  fileName: string;
  onSubmit: (data: { title: string; description?: string }) => Promise<void>;
  onCancel: () => void;
}
```

**Fields:**
- Title (required, auto-populated from filename, editable)
- Description (optional, textarea)
- HTML content (hidden, passed through)

**Form Validation:**
- Title: Required, 1-200 characters
- Description: Optional, max 1000 characters

**Integration with Backend:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    setLoading(true);
    const result = await createArtifact({
      title,
      description,
      htmlContent,
    });

    onSubmit(result);
  } catch (error) {
    setError('Failed to create artifact. Please try again.');
    log.error(LOG_TOPICS.Artifacts, 'ArtifactForm', 'Upload failed', { error });
  } finally {
    setLoading(false);
  }
};
```

### 3. Update Dashboard
**Location:** `app/src/app/dashboard/page.tsx` (or wherever dashboard lives)

**Changes:**
- Add "New Artifact" button/CTA
- Handle modal/route to upload flow
- Display success message after upload
- Link to artifact list

**Figma Alignment:**
- Check button placement (header, sidebar, or floating action button?)
- Check button styling (primary CTA, icon + text)
- Check empty state design (first-time user experience)

### 4. Share Link Component
**Location:** `app/src/components/artifacts/ShareLink.tsx`

**Purpose:** Display and copy shareable link.

**Props:**
```typescript
interface ShareLinkProps {
  shareToken: string;
}
```

**Features:**
- Display full URL: `https://app.example.com/a/{shareToken}`
- "Copy Link" button
- Visual feedback on copy (checkmark, "Copied!")
- QR code (future enhancement)

**Implementation:**
```typescript
const shareUrl = `${window.location.origin}/a/${shareToken}`;

const handleCopy = async () => {
  await navigator.clipboard.writeText(shareUrl);
  setShowCopied(true);
  setTimeout(() => setShowCopied(false), 2000);
};
```

## User Flow

### Happy Path
1. User clicks "New Artifact" button in dashboard
2. Upload modal/page opens
3. User drags HTML file into drop zone (or clicks file picker)
4. File validates successfully
5. Form displays with pre-filled title (from filename)
6. User optionally edits title/description
7. User clicks "Create Artifact"
8. Loading spinner shows during upload
9. Success! Share link displayed with copy button
10. User copies link and closes modal
11. Redirected to artifact list (or stays on dashboard)

### Error Paths
- **File too large:** Immediate error message, prevent upload
- **Invalid file type:** Immediate error message, prevent upload
- **Network error:** Retry button, error toast
- **Server error:** User-friendly error message, log details

## ShadCN UI Components to Use

Based on ShadCN UI library:
- `Button` - Primary actions, file picker, copy link
- `Dialog` or `Sheet` - Upload modal (check Figma for preference)
- `Form` + `Input` + `Textarea` - Metadata form
- `Alert` - Error messages
- `Toast` - Success notifications
- `Progress` - Upload progress bar (if needed)
- `Card` - Container styling

## Testing Requirements

### Component Tests
Create tests in `tasks/00010-artifact-upload-creation/tests/frontend/`:

**`UploadArtifact.test.tsx`:**
- Renders drag-and-drop zone
- Validates file type
- Validates file size
- Reads file content correctly
- Displays error messages
- Shows loading state during upload

**`ArtifactForm.test.tsx`:**
- Validates required fields
- Calls mutation on submit
- Displays server errors
- Auto-populates title from filename

**`ShareLink.test.tsx`:**
- Displays correct URL
- Copies to clipboard
- Shows "Copied!" feedback

### Manual Testing Checklist
- [ ] Drag-and-drop works in Chrome, Safari, Firefox
- [ ] File picker works on all browsers
- [ ] Large files show error immediately
- [ ] Non-HTML files rejected
- [ ] Form validation works
- [ ] Share link copies correctly
- [ ] Mobile responsive (touch-friendly drop zone)
- [ ] Keyboard navigation works

## Logging

Use structured logging for all user interactions:

```typescript
import { logger, LOG_TOPICS } from '@/lib/logger';

// File selected
logger.info(LOG_TOPICS.Artifacts, 'UploadArtifact', 'File selected', {
  fileName: file.name,
  fileSize: file.size,
});

// Upload started
logger.info(LOG_TOPICS.Artifacts, 'UploadArtifact', 'Upload started', {
  title,
  contentLength: htmlContent.length,
});

// Upload success
logger.info(LOG_TOPICS.Artifacts, 'UploadArtifact', 'Upload succeeded', {
  artifactId,
  shareToken,
});

// Upload error
logger.error(LOG_TOPICS.Artifacts, 'UploadArtifact', 'Upload failed', {
  error: error.message,
});
```

## Acceptance Criteria

- [ ] "New Artifact" button matches Figma design
- [ ] Upload UI matches Figma design
- [ ] Drag-and-drop works smoothly
- [ ] File picker works as fallback
- [ ] File validation prevents bad uploads
- [ ] Loading states clear and responsive
- [ ] Error messages user-friendly
- [ ] Share link generated and copyable
- [ ] Success state matches Figma
- [ ] Component tests pass
- [ ] No console errors or warnings
- [ ] Responsive on mobile

## Known Issues / Edge Cases

- **Paste HTML directly:** Not in scope (file upload only for now)
- **Multiple file upload:** Not in scope (single file per artifact)
- **Progress bar for large files:** Nice-to-have, defer if time-constrained
- **Cancel mid-upload:** Handle if upload is async, otherwise ignore

---

**Next:** Subtask 04 (Artifact List View)
