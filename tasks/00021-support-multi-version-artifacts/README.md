# Task 00021: Support Multi-Version Artifacts

**GitHub Issue:** #21

---

## Resume (Start Here)

**Last Updated:** 2026-01-01 (Session 1)

### Current Status: ✅ SCOPED & READY FOR IMPLEMENTATION

**Phase:** MVP scope defined, subtasks created, ready to begin implementation.

### What We Did This Session (Session 1)

1. **Created task** - Set up GitHub issue #21 and task folder structure
2. **Defined MVP scope** - Decided what's in/out for first release
3. **Defined comment control logic** - Only latest version accepts comments (auto-enforced)
4. **Defined terminology** - "Latest Version" for UI labeling
5. **Created subtasks** - Two implementation phases documented

### Key Decisions Made

**MVP Scope:**
- ✅ IN: Multiple versions, upload, delete, view versions, latest-only commenting
- ❌ OUT: Version deep links, custom default version, manual comment controls

**Comment Control Logic:**
- Only latest version (highest non-deleted) accepts comments
- Automatic: new upload closes previous versions for commenting
- Backend enforced in `addComment` mutation (security)
- Frontend shows UI state via computed `isLatest` flag (UX)

**UI Terminology:**
- "Latest Version" badge in version dropdown
- Banner on old versions: "Comments only available on latest version"
- No manual comment toggles - system controlled

**Technical Approach:**
- `isLatest` is **computed** at query time, not stored in database
- Delete latest → previous automatically becomes latest
- Single source of truth: `versionNumber + deleted` fields

### Next Steps

1. **Implement Subtask 01** - Version management (upload, delete, backend enforcement)
2. **Implement Subtask 02** - Artifact viewer (dropdown, banner, conditional comment UI)
3. **Write tests** - Unit + E2E with validation videos
4. **Integration testing** - Ensure frontend + backend work together

---

## Objective

Flesh out the multi-version artifact MVP by:
1. Defining clear feature boundaries for the first release
2. Hooking up the frontend to work seamlessly with multi-version artifacts
3. Enabling users to upload, view, navigate, and manage different versions of artifacts

This builds on the backend foundation from Task 18 (Refine Version Model Permissions) and Task 19 (Multifile ZIP HTML Projects).

---

## Current State

**Backend (from Task 18 & 19):**
- Version model supports multiple versions per artifact
- Permissions system handles version-level access control
- ZIP file support with extraction and path normalization
- File storage handles multi-version artifacts

**Frontend:**
- Currently designed for single-version artifacts
- No UI for version selection/navigation
- Upload flow doesn't handle versioning
- Viewer doesn't support version switching

---

## Options Considered

### Version Deep Linking
| Option | Pros | Cons |
|--------|------|------|
| **No deep links (MVP)** | Simpler URLs, less complexity, one URL per artifact | Can't link directly to specific version |
| Query string (`?version=2`) | Easy to implement, optional parameter | Slightly uglier URLs |
| Path param (`/a/{token}/2`) | Cleaner URLs, RESTful | Requires additional routing |

**Decision:** No deep links for MVP. Can add later if needed.

### Comment Control
| Option | Pros | Cons |
|--------|------|------|
| **All versions accept comments** | Simplest, no state management | Confusing comments on old versions |
| **Latest only (auto)** | Clear focus, prevents confusion, automatic | Need to show state in UI |
| Manual open/closed toggle | Maximum flexibility | Complex mental model, more UI |

**Decision:** Latest only (automatic), backend enforced.

### UI Labeling
| Option | Pros | Cons |
|--------|------|------|
| "Active Version" | Suggests current focus | Implies others are inactive |
| "Current Version" | Simple, intuitive | Could confuse with "latest chronologically" |
| **"Latest Version"** | Clear, factual, no ambiguity | N/A |
| "Open for Commenting" | Very explicit about state | Implies manual control (we don't have) |

**Decision:** "Latest Version" - factual and changeable later if needed.

### Comment State Storage
| Option | Pros | Cons |
|--------|------|------|
| Store `isOpenForComments` flag | Explicit field in DB | Must update all versions on upload, can desync |
| **Compute from versionNumber** | Single source of truth, auto-updates | N/A |

**Decision:** Compute `isLatest` at query time from versionNumber + deleted fields.

## Decision

**MVP Feature Set:**
- Multiple versions per artifact (backed by Task 18 schema)
- Upload new versions (auto-increments versionNumber)
- Delete versions (soft delete with `deleted` flag)
- View any version in artifact viewer
- Version dropdown selector in UI
- Only latest version accepts comments (backend enforced)
- UI shows "Latest Version" badge and banner on old versions

**Out of Scope (Future):**
- Version deep links (URL-based navigation to specific versions)
- Custom default version (always latest)
- Manual comment control (system automatic only)

**Technical Implementation:**
- `isLatest` computed at query time, not stored
- Backend enforces comment rules in `addComment` mutation
- Frontend uses `isLatest` flag for UI state (banner, comment input visibility)
- Two subtasks: (1) Version Management, (2) Artifact Viewer

## Changes Made

_(To be filled in as implementation progresses)_

## Subtasks

### 01-version-management/
Backend and UI for uploading new versions, deleting versions, and enforcing comment controls.

**Deliverables:**
- Convex mutations: `uploadVersion`, `deleteVersion`
- Backend enforcement in `addComment` mutation
- Helper: `getLatestVersion(artifactId)`
- Helper: `getVersionsByArtifact` with computed `isLatest`
- Frontend: Upload new version UI
- Frontend: Delete version UI
- Frontend: Version list with "Latest" badge
- Tests: Unit + E2E with validation videos

See: `01-version-management/README.md`

### 02-artifact-viewer-versions/
Update artifact viewer to support version switching, show banners, and conditionally enable/disable comment UI.

**Deliverables:**
- `VersionDropdown` component with "Latest" badge
- Banner component for old versions
- Conditional comment UI (enabled on latest, hidden on old)
- Version info display (number, date, size)
- Real-time updates for new versions
- Handle edge cases (only one version, deleted version)
- Tests: Unit + E2E with validation videos

See: `02-artifact-viewer-versions/README.md`

## Output

- Two subtasks with detailed implementation plans
- MVP scope documented with architectural decisions
- Ready for implementation

## Testing

Testing will be done at subtask level. Each subtask includes:
- Unit tests for backend logic and frontend components
- E2E tests with Playwright (with mandatory video recording)
- Validation videos demonstrating working features

See individual subtask READMEs for detailed test plans.
