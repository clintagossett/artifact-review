# Subtask 04: Integrate MarkdownViewer with DocumentViewer

**Parent Task:** 00027-md-file-viewing-support
**Status:** COMPLETE
**Created:** 2026-01-03
**Completed:** 2026-01-03

---

## Objective

Integrate the `MarkdownViewer` component into the existing `DocumentViewer` to automatically detect and render markdown artifacts instead of using the iframe.

---

## Background

The current `DocumentViewer.tsx` always renders content via an iframe:

```tsx
<iframe
  ref={iframeRef}
  src={artifactUrl}
  className="w-full h-[1000px] border-0"
  title="HTML Document Preview"
/>
```

For markdown files (where `version.fileType === "markdown"`), we need to:
1. Detect the file type from the version data
2. Render using `MarkdownViewer` instead of iframe
3. Preserve all other functionality (header, sidebar, version switching)

---

## Requirements

### Detection Logic

The version data is already available in `DocumentViewer`:

```typescript
interface BackendVersion {
  _id: Id<"artifactVersions">;
  fileType: string; // "html" | "markdown" | "zip"
  // ...
}
```

Use this to switch between renderers.

### Implementation

1. **Get current version's fileType**
   - Access `currentVersion.fileType` from the versions array
   - Default to "html" if undefined (backward compatibility)

2. **Conditional Rendering**
   ```tsx
   {currentVersion?.fileType === 'markdown' ? (
     <MarkdownViewer src={artifactUrl} />
   ) : (
     <iframe ... />
   )}
   ```

3. **Container Consistency**
   - Both renderers should have consistent container styling
   - Same max-width, shadow, background as current iframe container

4. **Pass Required Props**
   - `src` - the artifact URL (same as iframe)
   - `className` - for consistent styling

---

## Files to Modify

```
app/src/components/artifact/DocumentViewer.tsx
```

---

## Testing

1. **HTML artifacts** - Should continue to work with iframe
2. **Markdown artifacts** - Should render with MarkdownViewer
3. **Version switching** - When switching between HTML and MD versions, renderer should switch
4. **ZIP artifacts** - Should continue to work with iframe (HTML entry point)

---

## Deliverables

- [x] `DocumentViewer.tsx` updated with conditional rendering
- [x] Markdown artifacts render with `MarkdownViewer`
- [x] HTML/ZIP artifacts continue using iframe
- [x] Container styling consistent across both renderers
- [x] Build verification confirms no errors

---

## Dependencies

- Subtask 03 must be complete (`MarkdownViewer` component exists)

---

## Notes

- Comment targeting for markdown is handled in Subtask 05
- Multi-page navigation (for ZIP) should not apply to markdown (single file)
- The iframeRef is still needed for HTML artifacts, so keep it

## Implementation Summary

**Changes Made:**

1. **Import MarkdownViewer**
   ```typescript
   import { MarkdownViewer } from '@/components/artifact/MarkdownViewer';
   ```

2. **Conditional Rendering Logic**
   ```tsx
   {currentVersion?.fileType === 'markdown' ? (
     <MarkdownViewer src={artifactUrl} className="min-h-[1000px]" />
   ) : (
     <iframe
       ref={iframeRef}
       src={artifactUrl}
       className="w-full h-[1000px] border-0"
       title="HTML Document Preview"
     />
   )}
   ```

**How It Works:**
- Checks `currentVersion.fileType` to determine render method
- Markdown files: Renders with `MarkdownViewer` component (fetches and renders markdown)
- HTML/ZIP files: Continues using iframe (existing behavior)
- Same artifact URL is used for both (`/api/artifact/{shareToken}/v{version}/{page}`)
- Container styling is consistent (same shadow, max-width, overflow)

**Backward Compatibility:**
- HTML and ZIP artifacts continue to work exactly as before
- Only markdown files get the new rendering path
- No breaking changes to existing functionality

**Build Verification:**
- Next.js build completed successfully
- TypeScript compilation passed
- No runtime errors introduced
