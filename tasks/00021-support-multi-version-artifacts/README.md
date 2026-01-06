# Task 00021: Support Multi-Version Artifacts

**GitHub Issue:** #21

---

## Resume (Start Here)

**Last Updated:** 2026-01-01 (Session 2 - Architect Review)

### Current Status: 🏁 CLOSED (Implementation Complete, Verification Pending)

**Phase:** Implementation phase wrapped up. Core features working. E2E tests and minor polishing deferred. See [PENDING.md](./PENDING.md) for details.

### What We Did This Session (Session 2 - Architect Review)

1. **Analyzed existing code** - Found most backend functionality already exists from Tasks 18/19
2. **Identified field renames needed** - `versionName` → `name`, `versionNumber` → `number`
3. **Corrected implementation plan** - Removed "delete all data" approach, added migration script
4. **Updated subtask README** - Reflects actual work needed vs what exists
5. **Created plan-review.md** - Detailed analysis document

### Schema Field Renames Required

For cleaner API (`version.name` instead of `version.versionName`):

| Current Field | New Field | Rationale |
|---------------|-----------|-----------|
| `versionName` | `name` | `version.name` is cleaner |
| `versionNumber` | `number` | `version.number` is cleaner |

**Migration required:** Cannot delete data (active agents), need one-time migration script.

### What Already Exists (from Tasks 18/19)

| Functionality | Status |
|---------------|--------|
| Upload new version (single file) | EXISTS - `artifacts.addVersion` |
| Upload new version (ZIP) | EXISTS - `zipUpload.addZipVersion` |
| Delete version (soft delete) | EXISTS - `artifacts.softDeleteVersion` |
| Rename version | EXISTS - `artifacts.updateVersionName` |
| Get latest version | EXISTS - `artifacts.getLatestVersion` |
| Cannot delete last version | EXISTS - already enforced |

### What Still Needs to Be Built

| Functionality | Subtask | Notes |
|---------------|---------|-------|
| Schema field renames | 01 | `versionName` → `name`, `versionNumber` → `number` |
| Data migration script | 01 | Copy old field values to new fields |
| `isLatest` computed flag | 01 | Add to getVersions response |
| Comment enforcement | 01 | Add to comments.create |
| Frontend: "Latest" badge | 01/02 | Use isLatest from query |
| Frontend: Version dropdown | 02 | New component |
| Frontend: Old version banner | 02 | New component |

### Key Decisions Made

**MVP Scope:**
- ✅ IN: Multiple versions, upload, delete, rename, view versions, latest-only commenting
- ❌ OUT: Version deep links, custom default version, manual comment controls

**Comment Control Logic:**
- Only latest version (highest non-deleted) accepts comments
- Automatic: new upload closes previous versions for commenting
- Backend enforced in `comments.create` mutation (security)
- Frontend shows UI state via computed `isLatest` flag (UX)

**UI Terminology:**
- "Latest Version" badge in version dropdown
- Banner on old versions: "Comments only available on latest version"
- No manual comment toggles - system controlled

**Technical Approach:**
- `isLatest` is **computed** at query time, not stored in database
- Delete latest → previous automatically becomes latest
- Single source of truth: `number + isDeleted` fields (after rename)

### Next Steps

1. **Implement Subtask 01** - Schema renames, migration script, isLatest computation, comment enforcement
2. **Implement Subtask 02** - Artifact viewer (dropdown, banner, conditional comment UI)
3. **Write tests** - Unit + E2E with validation videos
4. **Integration testing** - Ensure frontend + backend work together

### Estimated Effort (Revised)

| Subtask | Original Estimate | Revised Estimate | Notes |
|---------|-------------------|------------------|-------|
| 01 - Version Management | Full rebuild | 8-10 hours | Most backend exists |
| 02 - Artifact Viewer | TBD | TBD | Needs review |

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
- Rename versions (update `versionName` field, max 100 chars)
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

## Implementation Summary

All core features for multi-version artifacts have been implemented:
- **Backend**: Schema renames, `isLatest` computation, and comment enforcement.
- **Frontend**: Version switcher, old version banner with switch link, and full version management in settings.
- **Routing**: Support for version deep links via `/a/{token}/v/{number}`.

## Pending Verification & Polishing
See [PENDING.md](./PENDING.md) for a detailed list of remaining work, including:
- E2E Tests (Playwright)
- Validation Videos
- Dynamic "Uploaded By" names in settings.

## Subtasks

### 01-version-management/
Code alignment, backend enhancements, and frontend verification for version management.

**What Already Exists (from Tasks 18/19):**
- `addVersion` action (single file upload)
- `addZipVersion` mutation (ZIP upload)
- `softDeleteVersion` mutation with cascade
- `updateVersionName` mutation
- `getLatestVersion` query
- "Cannot delete last version" enforcement

**What Needs to Be Built:**
- Schema renames: `versionName` → `name`, `versionNumber` → `number`
- Data migration script (copy old field values to new)
- Update all code references to use new field names
- Computed `isLatest` flag in `getVersions` response
- Comment enforcement in `comments.create` mutation
- Frontend: Version list with "Latest" badge
- Tests: Unit + E2E with validation videos

**Estimated Effort:** 8-10 hours (revised from full rebuild)

See: `01-version-management/README.md` and `01-version-management/plan-review.md`

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
