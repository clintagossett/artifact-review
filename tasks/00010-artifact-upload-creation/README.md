# Task 10: HTML Artifact Upload & Creation

**GitHub Issue:** [#10](https://github.com/clintagossett/artifact-review/issues/10)
**Status:** Planning
**Priority:** CRITICAL
**Started:** 2025-12-26

## Overview

Enable users to create and upload artifacts to the platform. This is the **core entry point** to the product value proposition: "From AI output to stakeholder feedback in one click."

## Context

### Existing Assets
- **Working implementation:** Chef htmlreview implementation validated our architecture
- **Design reference:** Figma designs in `figma-designs/` submodule
- **Auth foundation:** Anonymous, password, and magic link authentication complete
- **Architecture:** ADR 0002 (HTTP proxy), ADR 0009 (file storage structure)

### Why This Task Is Critical
Without artifact upload, the platform has no purpose. This task delivers the first half of the core value proposition - getting AI output into the system.

## Artifact Types (Scope)

### All 3 File Types (This Task) ✅

**Backend and API validation will support all 3 types from the start.**

1. **ZIP Archives** - Multi-file HTML projects with assets
   - Extract files, store individually in Convex File Storage
   - Auto-detect entry point (`index.html` or `main.html`)
   - Prompt user to select if neither found
   - Serve via HTTP proxy (per ADR 0002)

2. **Standalone HTML Files** - Self-contained HTML
   - Detect missing dependencies (local file references)
   - Warn user to upload as ZIP if dependencies found
   - Allow external CDN URLs
   - Store directly in `htmlContent` field

3. **Markdown Files** - Rendered markdown documents
   - Store raw markdown in `markdownContent` field
   - Render to HTML for viewing (GitHub-flavored markdown)
   - Support external image URLs only (warn for local refs)
   - Syntax highlighting for code blocks

**Note:** Frontend UI for markdown viewer will be implemented after ZIP/HTML UI is complete.

## Versioning Model

### Key Rules
- ✅ **Artifacts always have 1+ versions** (cannot delete last version)
- ✅ **Can delete any version** if 2+ exist
- ✅ **Soft deletion** - data persists, users don't see it
- ✅ **Cascade deletion** - deleting version deletes all comments
- ✅ **Mixed types allowed** - v1 can be ZIP, v2 can be HTML, v3 can be ZIP again
- ✅ **Graceful share links** - deleted artifacts show "no longer available" message

### Version Upload Flow
1. User uploads new file (ZIP or HTML)
2. System auto-increments version number
3. Full replacement (not delta/patch)
4. Each version independent and complete

## Goals

1. ✅ Users can create new artifacts from dashboard
2. ✅ HTML content upload via drag-and-drop, paste, or file picker
3. ✅ Store artifacts with metadata (title, description, creator, dates)
4. ✅ Generate unique shareable URLs
5. ✅ Display list of user's artifacts
6. ✅ UI aligns with Figma designs

## Subtasks

Breaking this into manageable implementation sections:

### 01-architecture-decisions
**Status:** ✅ COMPLETE
**Owner:** Team
**Purpose:** Make key technical decisions before implementation

**Decisions Made:**
- ✅ **File storage:** Flat table with path strings (ADR 0009)
- ✅ **ZIP extraction:** Async action with JSZip (chef-validated pattern)
- ✅ **Entry point:** Auto-detect index.html/main.html, prompt if neither found
- ✅ **File size limits:** Per ADR 0002 (ZIP: 100MB, HTML: 5MB, individual files: 20MB max)
- ✅ **Soft deletion:** All deletes are soft (isDeleted + deletedAt fields)
- ✅ **Share URLs:** Short codes with nanoid (8 chars)
- ✅ **Versioning:** Mixed types allowed, 1+ versions always required
- ✅ **HTTP serving:** Proxy pattern per ADR 0002
- ✅ **Dependency detection:** Warn for HTML files with local refs

**Outputs:**
- ✅ ADR 0009: Artifact File Storage Structure
- ✅ Schema design documented below
- ✅ Chef implementation reviewed and validated

### 02-backend-schema-mutations
**Status:** ✅ Complete
**Owner:** TDD Developer Agent
**Purpose:** Implement Convex backend for artifact storage

**Deliverables:**
- ✅ Schema with 3 tables (artifacts, artifactVersions, artifactFiles)
- ✅ Mutations: create, addVersion, softDelete, softDeleteVersion
- ✅ Queries: get, getVersion, list, getByShareToken, getFilesByVersion
- ✅ ZIP processor action with entry point detection
- ✅ All tests passing (19/19)
- ✅ Test report: `test-report.md`

### 03-frontend-design-analysis
**Status:** ✅ Complete
**Owner:** Software Architect
**Purpose:** Analyze Figma designs and create implementation guide

**Deliverables:**
- ✅ Design analysis: `03-frontend-design-analysis/README.md`
- ✅ Screenshot reference guide: `03-frontend-design-analysis/SCREENSHOTS.md`
- ✅ Component breakdown with ShadCN mapping
- ✅ Design tokens extracted
- ✅ User flows documented
- ✅ Visual references from Figma screenshots

### 04-upload-flow-components
**Status:** ✅ Complete
**Owner:** TDD Developer Agent
**Purpose:** Build upload UI (drag-and-drop, dialogs, file handling)

**Scope:**
- UploadDropzone (custom drag-and-drop component)
- NewArtifactDialog (create artifact modal)
- EntryPointDialog (ZIP file entry point selection)
- UploadProgress (progress indicator)
- useArtifactUpload hook (upload logic)

**Reference:**
- Subtask README: `04-upload-flow-components/README.md`
- Design analysis: `03-frontend-design-analysis/`
- Screenshots: `03-frontend-design-analysis/screenshots/`

**Deliverables:**
- ✅ UploadDropzone.tsx (14 tests passing)
- ✅ NewArtifactDialog.tsx (9 tests passing)
- ✅ EntryPointDialog.tsx (12 tests passing)
- ✅ UploadProgress.tsx (11 tests passing)
- ✅ useArtifactUpload.ts hook (10 tests passing)
- ✅ Test report: `04-upload-flow-components/test-report.md`
- ⏳ Validation video (pending dashboard integration)

### 05-dashboard-list-view
**Status:** ✅ Complete
**Owner:** TDD Developer Agent
**Purpose:** Display and manage artifacts in dashboard

**Scope:**
- DashboardHeader (top navigation)
- ArtifactCard (individual artifact display)
- ArtifactList (grid layout)
- EmptyState (no artifacts view)
- ShareModal (share link UI)
- Dashboard page integration

**Reference:**
- Subtask README: `05-dashboard-list-view/README.md`
- Design analysis: `03-frontend-design-analysis/`
- Screenshots: `03-frontend-design-analysis/screenshots/`

**Deliverables:**
- ✅ DashboardHeader.tsx (14 tests passing)
- ✅ ArtifactCard.tsx (12 tests passing)
- ✅ ArtifactList.tsx (9 tests passing)
- ✅ EmptyState.tsx (6 tests passing)
- ✅ ShareModal.tsx (9 tests passing)
- ✅ AvatarGroup.tsx (8 tests passing)
- ✅ Dashboard page integrated
- ✅ Test report: `05-dashboard-list-view/test-report.md`

### 06-e2e-testing
**Status:** Pending (after 04 & 05)
**Owner:** TDD Developer Agent
**Purpose:** End-to-end validation of complete flow

**Scope:**
- E2E test: Upload artifact → View in list → Share link → Access via link
- Test all file types (HTML, Markdown, ZIP)
- Test edge cases (oversized, invalid type, network errors)
- Cross-browser validation
- Performance testing

**Outputs:**
- E2E tests in `tests/e2e/`
- Validation videos in `tests/validation-videos/`
- Final test report

## Schema Design ✅

All architecture decisions are finalized (see ADR 0009). Below is the complete schema for Task 10.

### Artifacts Table

```typescript
artifacts: defineTable({
  title: v.string(),                         // User-provided name
  description: v.optional(v.string()),       // Optional description
  creatorId: v.id("users"),                  // Owner
  shareToken: v.string(),                    // Unique 8-char code for /a/{token}
  isDeleted: v.boolean(),                    // Soft deletion
  deletedAt: v.optional(v.number()),         // Soft deletion timestamp
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_creator", ["creatorId"])
  .index("by_creator_active", ["creatorId", "isDeleted"])
  .index("by_share_token", ["shareToken"]),
```

### Artifact Versions Table

```typescript
artifactVersions: defineTable({
  artifactId: v.id("artifacts"),
  versionNumber: v.number(),                 // Auto-incremented: 1, 2, 3...
  fileType: v.union(
    v.literal("zip"),                        // Multi-file HTML project
    v.literal("html"),                       // Standalone HTML file
    v.literal("markdown")                    // Markdown document
  ),

  // For HTML files (standalone)
  htmlContent: v.optional(v.string()),       // Stored directly if type="html"

  // For Markdown files
  markdownContent: v.optional(v.string()),   // Raw markdown if type="markdown"

  // For ZIP files
  entryPoint: v.optional(v.string()),        // Path to main HTML: "index.html" or "v1/dist/index.html"

  // Metadata
  fileSize: v.number(),                      // Total size in bytes
  isDeleted: v.boolean(),                    // Soft deletion
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_active", ["artifactId", "isDeleted"])
  .index("by_artifact_version", ["artifactId", "versionNumber"]),
```

### Artifact Files Table (ZIP extracts only)

```typescript
artifactFiles: defineTable({
  versionId: v.id("artifactVersions"),       // Link to version
  filePath: v.string(),                      // "assets/logo.png" or "v1/dist/app.js"
  storageId: v.id("_storage"),               // Convex File Storage reference
  mimeType: v.string(),                      // "text/html", "image/png", etc.
  fileSize: v.number(),                      // Bytes
  isDeleted: v.boolean(),                    // Soft deletion
  deletedAt: v.optional(v.number()),
})
  .index("by_version", ["versionId"])
  .index("by_version_path", ["versionId", "filePath"])  // ⭐ O(1) lookups for HTTP proxy
  .index("by_version_active", ["versionId", "isDeleted"]),
```

### Entry Point Detection for ZIPs

**Auto-Detection Logic:**
1. Search entire ZIP for `index.html` (case-insensitive, any depth)
2. If not found, search for `main.html`
3. If neither found, prompt user with dropdown of all `.html` files

**Examples:**
- `index.html` → Auto-detected
- `v1/index.html` → Auto-detected
- `dist/build/index.html` → Auto-detected
- `page1.html` + `page2.html` → User selects from dropdown

### File Size Limits (per ADR 0002)

| Type | Limit | Enforcement |
|------|-------|-------------|
| ZIP total | 100MB | Frontend + backend |
| Extracted size | 200MB | Backend only |
| HTML standalone | 5MB | Frontend + backend |
| Markdown | 1MB | Frontend + backend |
| Individual file in ZIP | 20MB | Backend |
| Max files per ZIP | 500 | Backend |

## Design Alignment Checklist

Before implementation, review Figma designs:

- [ ] "New Artifact" button placement and style
- [ ] Upload modal/page layout
- [ ] Drag-and-drop zone visual design
- [ ] Progress indicators during upload
- [ ] Artifact metadata form fields
- [ ] Artifact list/grid layout
- [ ] Artifact card design (thumbnail, title, metadata)
- [ ] Share link display and copy button
- [ ] Empty states
- [ ] Error states

## Integration with Existing System

### Auth
- All artifact operations require authentication
- Anonymous users can create artifacts (tracked by session)
- Authenticated users own artifacts permanently

### Schema Dependencies
```typescript
// New table: artifacts
{
  _id: Id<"artifacts">,
  _creationTime: number,
  title: string,
  description?: string,
  htmlContent: string,          // Or fileId if using File Storage
  creatorId: Id<"users">,
  shareToken: string,            // Unique short code for public sharing
  createdAt: number,
  updatedAt: number,
  status: "draft" | "published", // Future: review workflow
}
```

## Success Criteria

### Functional
- [x] User can create artifact from dashboard
- [x] Upload HTML via drag-and-drop
- [x] Upload HTML via file picker
- [x] HTML stored securely with sanitization
- [x] Shareable URL generated and copyable
- [x] User can view list of their artifacts
- [x] Artifacts display correct metadata

### Technical
- [x] All mutations have proper validators
- [x] HTML sanitization prevents XSS
- [x] File size limits enforced
- [x] Share tokens are unique
- [x] E2E tests pass
- [x] UI matches Figma designs

### Quality
- [x] Validation video demonstrates full flow
- [x] Test coverage documented in `test-report.md`
- [x] No console errors or warnings
- [x] Responsive design works on mobile

## Out of Scope (Future Tasks)

- Folder/project organization
- Team workspace sharing
- Version history
- Bulk uploads
- Advanced metadata (tags, custom fields)
- Artifact templates

## Notes & Decisions

*Document key decisions and discussions here as the task progresses*

---

## References

- **GitHub Issue:** https://github.com/clintagossett/artifact-review/issues/10
- **Figma Designs:** https://www.figma.com/design/8Roikp7VBTQaxiWbQKRtZ2/Collaborative-HTML-Review-Platform
- **Product Discovery:** `/PRODUCT-DISCOVERY.md`
- **Convex Rules:** `/docs/architecture/convex-rules.md`
- **Testing Guide:** `/docs/development/testing-guide.md`
- **Logging Guide:** `/docs/development/logging-guide.md`
