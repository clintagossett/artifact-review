# Issue #119 - DB Access Layer Audit

## Overview

This audit maps every UI mutation/query and Agent API endpoint, documenting what each does, DB tables touched, business logic, and divergences between the two code paths.

**Files Audited:**
- `app/convex/agentApi.ts` - Agent API internal functions (1138 lines)
- `app/convex/http.ts` - Agent API HTTP routing (1283 lines)
- `app/convex/artifacts.ts` - UI artifact CRUD (1348 lines)
- `app/convex/comments.ts` - UI comment CRUD (565 lines)
- `app/convex/commentReplies.ts` - UI reply CRUD (307 lines)
- `app/convex/access.ts` - UI access/reviewer management (1117 lines)
- `app/convex/shares.ts` - UI share link management (309 lines)
- `app/convex/views.ts` - UI view tracking (192 lines)

---

## 1. Authentication Models

### UI Path
- Uses `getAuthUserId(ctx)` from `@convex-dev/auth/server`
- Session-based auth (cookie/token)
- Returns `Id<"users">` directly

### Agent API Path
- HTTP handlers in `http.ts` use `validateApiKey()` to check `x-api-key` header
- Calls `internal.agentApi.requireAuth` which validates API key against `agents` table
- Returns `{ agentId, userId }` (agent's linked user)
- Then calls `requireArtifactOwner()` to verify the agent's user owns the artifact

### Divergence
- **UI** checks "is this user authenticated?" then per-function permission checks (owner, reviewer, etc.)
- **Agent API** checks "is this API key valid?" then enforces **owner-only** access everywhere via `requireArtifactOwner()`
- Agent API has NO concept of reviewer-level access

---

## 2. Artifact Operations

### 2.1 Create Artifact

| Aspect | UI (`artifacts.create`) | Agent API (`POST /api/v1/artifacts`) |
|--------|------------------------|--------------------------------------|
| **Type** | Action | HTTP handler → `internal.artifacts.createInternal` |
| **Auth** | `getAuthUserId` | `validateApiKey` → `requireAuth` |
| **File validation** | `isValidFileType()`, `isSingleFileType()`, `MAX_SINGLE_FILE_SIZE` | Inline in http.ts - checks `content-type`, 50MB limit |
| **Blob creation** | Via `ctx.storage.store()` in action | Inline `ctx.storage.store()` in HTTP handler |
| **DB writes** | Calls `internal.artifacts.createInternal` | Same `internal.artifacts.createInternal` |
| **Tables** | `artifacts`, `artifactVersions`, `artifactFiles`, `artifactAccess` | Same |
| **Post-create** | Returns `{ artifactId, shareToken }` | Returns JSON with `{ id, shareToken, versionId }` |

**Shared internal:** `createInternal` is called by BOTH paths. This is already unified.

**Divergence:** File validation and blob creation logic is duplicated. The HTTP handler does its own content-type and size checks before calling the shared internal.

### 2.2 Add Version

| Aspect | UI (`artifacts.addVersion`) | Agent API (`POST /api/v1/artifacts/:shareToken/versions`) |
|--------|---------------------------|----------------------------------------------------------|
| **Type** | Action | HTTP handler → `internal.artifacts.addVersionInternal` |
| **Auth** | `getAuthUserId` + ownership check | `validateApiKey` → `requireArtifactOwner` |
| **File validation** | Same validators as create | Inline in http.ts |
| **DB writes** | Calls `internal.artifacts.addVersionInternal` | Same |
| **Tables** | `artifactVersions`, `artifactFiles` | Same |

**Shared internal:** `addVersionInternal` is called by BOTH paths. Already unified.

**Divergence:** Same file validation duplication as create.

### 2.3 Update Artifact Name

| Aspect | UI (`artifacts.updateName`) | Agent API (not exposed) |
|--------|---------------------------|------------------------|
| **Type** | Mutation | N/A |
| **Tables** | `artifacts` | N/A |

**Gap:** Agent API has no endpoint for renaming artifacts.

### 2.4 Update Artifact Details

| Aspect | UI (`artifacts.updateDetails`) | Agent API (not exposed) |
|--------|-------------------------------|------------------------|
| **Type** | Mutation | N/A |
| **Tables** | `artifacts` | N/A |

**Gap:** Agent API cannot update artifact details (description, entryPointFilePath).

### 2.5 Soft Delete Artifact

| Aspect | UI (`artifacts.softDelete`) | Agent API (not exposed) |
|--------|---------------------------|------------------------|
| **Type** | Mutation | N/A |
| **Tables** | `artifacts` | N/A |

**Gap:** Agent API cannot delete artifacts.

### 2.6 Soft Delete Version

| Aspect | UI (`artifacts.softDeleteVersion`) | Agent API (`DELETE /api/v1/artifacts/:shareToken/versions/:n`) |
|--------|----------------------------------|--------------------------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.softDeleteVersionInternal` |
| **Auth** | `getAuthUserId` + ownership | `requireArtifactOwner` |
| **Logic** | Prevents deleting last version, soft deletes version + files | Same logic, duplicated |
| **Tables** | `artifactVersions`, `artifactFiles` | Same |

**Divergence:** Logic is fully duplicated in `agentApi.softDeleteVersionInternal`.

### 2.7 Update Version Name

| Aspect | UI (not exposed) | Agent API (`PATCH /api/v1/artifacts/:shareToken/versions/:n`) |
|--------|-----------------|--------------------------------------------------------------|
| **Type** | N/A | HTTP handler → `internal.agentApi.updateVersionNameInternal` |
| **Tables** | N/A | `artifactVersions` |

**Gap:** UI has no version rename mutation. Agent API does.

### 2.8 Restore Version

| Aspect | UI (not exposed) | Agent API (`POST /api/v1/artifacts/:shareToken/versions/:n/restore`) |
|--------|-----------------|---------------------------------------------------------------------|
| **Type** | N/A | HTTP handler → `internal.agentApi.restoreVersionInternal` |
| **Tables** | N/A | `artifactVersions` |

**Gap:** UI has no version restore mutation. Agent API does.

### 2.9 List Versions

| Aspect | UI (`artifacts.getVersions`) | Agent API (`GET /api/v1/artifacts/:shareToken/versions`) |
|--------|----------------------------|--------------------------------------------------------|
| **Type** | Query | HTTP handler → `internal.agentApi.listVersionsInternal` |
| **Auth** | `getAuthUserId` + `canViewArtifact` | `requireArtifactOwner` |
| **Returns** | Versions with file count, includes deleted flag | Versions with file count, comment count, includes deleted |
| **Tables** | `artifactVersions`, `artifactFiles` | `artifactVersions`, `artifactFiles`, `comments` |

**Divergence:**
- UI allows reviewer access; Agent API is owner-only
- Agent API includes comment counts; UI does not
- Logic is fully duplicated

### 2.10 Artifact Queries (UI only)

These UI queries have NO Agent API equivalent:
- `artifacts.get` - Get artifact by ID
- `artifacts.getVersion` - Get version by ID
- `artifacts.getVersionByNumber` - Get version by number
- `artifacts.getLatestVersion` - Get latest active version
- `artifacts.getFilesByVersion` - List files for a version
- `artifacts.getByShareToken` - Get artifact by share token
- `artifacts.listHtmlFiles` - List HTML files in a version
- `artifacts.getEntryPointContent` - Get entry point file content
- `artifacts.getDetailsForSettings` - Get artifact details for settings page
- `artifacts.getVersionStatus` - Get version processing status

---

## 3. Comment Operations

### 3.1 Get Comments

| Aspect | UI (`comments.getByVersion`) | Agent API (`GET /api/v1/artifacts/:shareToken/comments`) |
|--------|----------------------------|--------------------------------------------------------|
| **Type** | Query | HTTP handler → `internal.agentApi.getComments` |
| **Auth** | `requireCommentPermission` (owner OR reviewer) | `requireArtifactOwner` (owner ONLY) |
| **Enrichment** | Author name/email, reply count | Author name/email, reply count, agentId/agentName, replies inline |
| **Tables** | `comments`, `commentReplies`, `users` | `comments`, `commentReplies`, `users`, `agents` |
| **Scope** | Active comments only | Active comments only |

**Divergence:**
- **Permission model:** UI allows reviewers to see comments; Agent API is owner-only
- **Response shape:** Agent API nests full replies inline; UI returns reply count only
- **Agent info:** Agent API enriches with agent name lookup from `agents` table
- Logic is fully duplicated

### 3.2 Create Comment

| Aspect | UI (`comments.create`) | Agent API (`POST /api/v1/artifacts/:shareToken/comments`) |
|--------|----------------------|----------------------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.createComment` |
| **Auth** | `requireCommentPermission` + `getAuthUserId` | `requireArtifactOwner` |
| **Content validation** | Trim, empty check, 10000 char max | **NONE** |
| **Latest-version check** | Yes | Yes (via `getLatestVersion` helper) |
| **Agent support** | No `agentId` field | Sets `agentId` on comment |
| **Notifications** | `triggerCommentNotification` via scheduler | `triggerCommentNotification` via scheduler |
| **Notification URL** | `process.env.CONVEX_SITE_URL + /artifacts/...` | `process.env.CONVEX_SITE_URL + /artifacts/...` |
| **Notification author** | User's name or "Someone" | User's name, agent name, or "AI Agent" |
| **Tables** | `comments`, `artifacts`, `artifactVersions`, `users` | Same + `agents` |

**Divergence:**
- **No content validation** in Agent API (no trim, no empty check, no length limit)
- **Agent support:** Agent API can set `agentId` on comments; UI cannot
- **Author fallback:** Agent API falls back to agent name then "AI Agent"; UI falls back to "Someone"
- Logic is mostly duplicated with different validation

### 3.3 Edit Comment

| Aspect | UI (`comments.updateContent`) | Agent API (`PATCH /api/v1/comments/:commentId`) |
|--------|------------------------------|------------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.editComment` |
| **Auth** | `requireCommentPermission` + author check | `requireArtifactOwner` + author check (agentId match) |
| **Content validation** | Trim, empty check, 10000 char max | **NONE** |
| **No-op check** | Yes (skip if content unchanged) | No |
| **Tables** | `comments` | `comments`, `agents` |

**Divergence:**
- **No content validation** in Agent API
- **Author check differs:** UI checks `createdBy === userId`; Agent API checks `agentId === callingAgentId`
- No no-op optimization in Agent API

### 3.4 Delete Comment

| Aspect | UI (`comments.softDelete`) | Agent API (`DELETE /api/v1/comments/:commentId`) |
|--------|--------------------------|------------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.deleteComment` |
| **Auth** | `requireCommentPermission` + `canDeleteComment` | `requireArtifactOwner` + author check |
| **Who can delete** | Author OR artifact owner | Author only (agentId match) |
| **Cascade** | Soft deletes all replies | Soft deletes all replies |
| **Tables** | `comments`, `commentReplies` | Same |

**Divergence:**
- **UI allows artifact owner to moderate-delete any comment; Agent API does NOT**
- Author check differs (userId vs agentId)

### 3.5 Toggle Resolved

| Aspect | UI (`comments.toggleResolved`) | Agent API (`PATCH /api/v1/comments/:commentId` with status) |
|--------|-------------------------------|-------------------------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.updateCommentStatus` |
| **Auth** | `requireCommentPermission` + `getAuthUserId` | `requireArtifactOwner` |
| **Logic** | Toggles `resolvedUpdatedAt`/`resolvedUpdatedBy` | Sets `resolvedUpdatedAt`/`resolvedUpdatedBy` based on status param |
| **Tables** | `comments` | `comments` |

**Divergence:**
- UI toggles; Agent API sets explicitly (resolve/unresolve via `status` field)
- Agent API uses `userId` (agent's linked user) for `resolvedUpdatedBy`

### 3.6 Public Share Comments

| Aspect | UI (`comments.getByVersionPublic`) | Agent API (not exposed) |
|--------|-----------------------------------|------------------------|
| **Type** | Query | N/A |

| Aspect | UI (`comments.createViaPublicShare`) | Agent API (not exposed) |
|--------|-------------------------------------|------------------------|
| **Type** | Mutation | N/A |

**Gap:** Agent API has no public share comment access.

---

## 4. Reply Operations

### 4.1 Get Replies

| Aspect | UI (`commentReplies.getReplies`) | Agent API (inline in `getComments`) |
|--------|--------------------------------|-------------------------------------|
| **Type** | Query | Returned inline with comments |

**Divergence:** UI fetches replies separately per comment; Agent API returns them inline with comments response.

### 4.2 Create Reply

| Aspect | UI (`commentReplies.createReply`) | Agent API (`POST /api/v1/comments/:commentId/replies`) |
|--------|----------------------------------|------------------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.createReply` |
| **Auth** | `requireCommentPermission` + `getAuthUserId` | `requireArtifactOwner` |
| **Content validation** | Trim, empty check, 5000 char max | **NONE** |
| **Agent support** | No | Sets `agentId` on reply |
| **Notifications** | Full: notifies comment author + all thread participants | **NONE** |
| **Tables** | `commentReplies`, `comments`, `users`, `artifacts`, `artifactVersions` | `commentReplies`, `comments` |

**Divergence (CRITICAL):**
- **No content validation** in Agent API
- **No notification logic** in Agent API (comment in code says "omitted for brevity")
- **No thread participant tracking** in Agent API
- Agent API can set `agentId`; UI cannot

### 4.3 Edit Reply

| Aspect | UI (`commentReplies.updateReply`) | Agent API (`PATCH /api/v1/replies/:replyId`) |
|--------|----------------------------------|---------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.editReply` |
| **Content validation** | Trim, empty check, 5000 char max | **NONE** |
| **Tables** | `commentReplies` | Same |

**Divergence:** No content validation in Agent API.

### 4.4 Delete Reply

| Aspect | UI (`commentReplies.softDeleteReply`) | Agent API (`DELETE /api/v1/replies/:replyId`) |
|--------|--------------------------------------|---------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.deleteReply` |
| **Who can delete** | Author OR artifact owner | Author only (agentId match) |
| **Tables** | `commentReplies` | Same |

**Divergence:** UI allows artifact owner to moderate-delete; Agent API does not.

---

## 5. Access / Reviewer Management

### 5.1 Grant Access

| Aspect | UI (`access.grant`) | Agent API (`POST /api/v1/artifacts/:shareToken/access`) |
|--------|--------------------|---------------------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.grantAccess` |
| **Auth** | `getAuthUserId` + ownership | `requireArtifactOwner` |
| **Email validation** | Full regex validation | **NONE** |
| **Email sending** | Sends invitation email via `sendEmailInternal` | **NONE** |
| **Existing user check** | Looks up user by email, handles differently | Looks up user by email |
| **Duplicate check** | Yes | Yes |
| **Tables** | `artifactAccess`, `users` | `artifactAccess`, `users` |

**Divergence (CRITICAL):**
- **No email validation** in Agent API
- **No invitation email sent** via Agent API
- Different handling of existing vs new user paths

### 5.2 Revoke Access

| Aspect | UI (`access.revoke`) | Agent API (`DELETE /api/v1/artifacts/:shareToken/access/:accessId`) |
|--------|--------------------|--------------------------------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.revokeAccess` |
| **Tables** | `artifactAccess` | Same |

**Divergence:** Logic is duplicated but functionally similar.

### 5.3 List Access

| Aspect | UI (`access.listReviewers`) | Agent API (`GET /api/v1/artifacts/:shareToken/access`) |
|--------|---------------------------|-------------------------------------------------------|
| **Type** | Query | HTTP handler → `internal.agentApi.listAccess` |
| **Enrichment** | User name/email, status (accepted/pending), view timestamps | User name/email only |
| **Tables** | `artifactAccess`, `users` | Same |

**Divergence:** UI returns richer data (status, view timestamps); Agent API returns minimal data.

### 5.4 UI-Only Access Operations

These have NO Agent API equivalent:
- `access.resend` - Resend invitation email
- `access.recordView` - Track first/last view timestamps
- `access.getPermission` - Get user's permission level for artifact
- `access.listShared` - List artifacts shared with current user
- `access.getActivityStats` - Owner-only view/comment activity stats

---

## 6. Share Link Management

### 6.1 Create Share Link

| Aspect | UI (`shares.create`) | Agent API (`POST /api/v1/artifacts/:shareToken/sharelink`) |
|--------|--------------------|------------------------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.createShareLink` |
| **Idempotent** | Yes (returns existing ID) | Yes (updates existing, returns URL) |
| **Default capabilities** | `{readComments: false, writeComments: false}` | `{readComments: true, writeComments: false}` |
| **Returns** | Share ID | Full URL with token |
| **Tables** | `artifactShares` | Same |

**Divergence:**
- **Different defaults:** Agent API defaults `readComments: true`; UI defaults both to `false`
- **Update behavior:** Agent API updates existing share's capabilities; UI returns existing as-is
- **Return value:** Agent API returns constructed URL; UI returns Convex document ID

### 6.2 Toggle Enabled

| Aspect | UI (`shares.toggleEnabled`) | Agent API (`PATCH /api/v1/artifacts/:shareToken/sharelink`) |
|--------|---------------------------|-------------------------------------------------------------|
| **Type** | Mutation | HTTP handler → `internal.agentApi.updateShareLink` |
| **Logic** | Toggle enabled boolean | Set enabled + capabilities explicitly |
| **Tables** | `artifactShares` | Same |

**Divergence:** UI only toggles enabled; Agent API can update both enabled and capabilities in one call.

### 6.3 Update Capabilities

| Aspect | UI (`shares.updateCapabilities`) | Agent API (combined with 6.2) |
|--------|--------------------------------|-------------------------------|
| **Type** | Mutation | N/A (combined into updateShareLink) |

### 6.4 Get Share Link

| Aspect | UI (`shares.getForArtifact`) | Agent API (`GET /api/v1/artifacts/:shareToken/sharelink`) |
|--------|----------------------------|------------------------------------------------------------|
| **Type** | Query | HTTP handler → `internal.agentApi.getShareLink` |
| **Returns** | Share object with token, capabilities, enabled, timestamps | Same data as URL |
| **Tables** | `artifactShares` | Same |

### 6.5 Delete Share Link

| Aspect | UI (not exposed) | Agent API (`DELETE /api/v1/artifacts/:shareToken/sharelink`) |
|--------|-----------------|-------------------------------------------------------------|
| **Type** | N/A | HTTP handler → `internal.agentApi.deleteShareLink` |
| **Tables** | N/A | `artifactShares` |

**Gap:** UI has no share link delete mutation. Agent API does (hard delete).

### 6.6 Resolve Token (UI only)

| Aspect | UI (`shares.resolveToken`) | Agent API (not exposed) |
|--------|--------------------------|------------------------|
| **Type** | Query (public, no auth) | N/A |

---

## 7. View Tracking

| Aspect | UI (`views.record`, `views.listByVersion`, etc.) | Agent API |
|--------|------------------------------------------------|-----------|
| **Endpoints** | `record`, `listByVersion`, `listByUser`, `listAllStats` | **NONE** |
| **Tables** | `artifactViews`, `artifactVersionStats`, `artifactAccess` | N/A |

**Gap:** Agent API has NO view tracking. The `getStats` endpoint returns comment/reply counts only, not view data.

---

## 8. Agent API Stats Endpoint

| Aspect | Agent API (`GET /api/v1/artifacts/:shareToken/stats`) | UI equivalent |
|--------|------------------------------------------------------|---------------|
| **Internal** | `internal.agentApi.getStats` | No direct equivalent |
| **Returns** | Version count, comment count, reply count, reviewer count, share link status | N/A |
| **Tables** | `artifactVersions`, `comments`, `commentReplies`, `artifactAccess`, `artifactShares` | N/A |

**Gap:** UI has no single "stats" query. Data is assembled from multiple queries on the frontend.

---

## 9. Summary of Divergences

### Critical Divergences (Business Logic Differences)

| Area | Divergence | Risk |
|------|-----------|------|
| **Content validation** | Agent API has NO validation (trim, empty, length) on comments/replies | Bad data in DB |
| **Reply notifications** | Agent API sends NONE; UI notifies comment author + thread participants | Silent replies from agents |
| **Access grant emails** | Agent API sends no invitation emails | Reviewers don't know they have access |
| **Delete permissions** | Agent API: author-only. UI: author OR artifact owner | Owner can't moderate agent comments |
| **Share link defaults** | Agent API defaults `readComments: true`; UI defaults `false` | Inconsistent default behavior |
| **Permission model** | Agent API is owner-only everywhere; UI supports reviewer access | Agents can't act as reviewers |

### Duplicated Logic (Same Functionality, Two Implementations)

| Function | UI Location | Agent API Location |
|----------|------------|-------------------|
| Get comments | `comments.getByVersion` | `agentApi.getComments` |
| Create comment | `comments.create` | `agentApi.createComment` |
| Edit comment | `comments.updateContent` | `agentApi.editComment` |
| Delete comment | `comments.softDelete` | `agentApi.deleteComment` |
| Toggle resolved | `comments.toggleResolved` | `agentApi.updateCommentStatus` |
| Create reply | `commentReplies.createReply` | `agentApi.createReply` |
| Edit reply | `commentReplies.updateReply` | `agentApi.editReply` |
| Delete reply | `commentReplies.softDeleteReply` | `agentApi.deleteReply` |
| Soft delete version | `artifacts.softDeleteVersion` | `agentApi.softDeleteVersionInternal` |
| List versions | `artifacts.getVersions` | `agentApi.listVersionsInternal` |
| Grant access | `access.grant` | `agentApi.grantAccess` |
| Revoke access | `access.revoke` | `agentApi.revokeAccess` |
| List access | `access.listReviewers` | `agentApi.listAccess` |
| Create share link | `shares.create` | `agentApi.createShareLink` |
| Get share link | `shares.getForArtifact` | `agentApi.getShareLink` |
| Update share link | `shares.toggleEnabled` + `shares.updateCapabilities` | `agentApi.updateShareLink` |

### Already Unified (Shared Internals)

| Function | Shared Internal |
|----------|----------------|
| Create artifact | `internal.artifacts.createInternal` |
| Add version | `internal.artifacts.addVersionInternal` |

### Gaps (One Side Only)

| Function | Available In | Missing From |
|----------|-------------|-------------|
| Update artifact name | UI | Agent API |
| Update artifact details | UI | Agent API |
| Soft delete artifact | UI | Agent API |
| Restore version | Agent API | UI |
| Update version name | Agent API | UI |
| Delete share link | Agent API | UI |
| Public share comments | UI | Agent API |
| View tracking | UI | Agent API |
| Aggregate stats | Agent API | UI (assembled client-side) |

---

## 10. DB Tables Touched

| Table | UI Writes | Agent API Writes |
|-------|-----------|-----------------|
| `artifacts` | create, updateName, updateDetails, softDelete | create (via shared internal) |
| `artifactVersions` | create, softDelete | create (shared), softDelete, updateName, restore |
| `artifactFiles` | create, softDelete | create (shared), softDelete |
| `artifactAccess` | grant, revoke, recordView | grant, revoke |
| `artifactShares` | create, toggleEnabled, updateCapabilities | create, update, delete |
| `comments` | create, updateContent, toggleResolved, softDelete | create, edit, updateStatus, delete |
| `commentReplies` | create, update, softDelete | create, edit, delete |
| `artifactViews` | record | - |
| `artifactVersionStats` | record | - |
| `users` | (read only) | (read only) |
| `agents` | - | (read only) |

---

## 11. Recommendations for Unification

### Phase 1: Extract shared internals for all duplicated operations
Convert all duplicated logic into `internal` functions (like `createInternal`/`addVersionInternal` already are). Both UI mutations and Agent API handlers call the same internals.

### Phase 2: Add missing validation to Agent API
Route Agent API through the same content validation the UI uses.

### Phase 3: Add missing notifications to Agent API
Route Agent API comment/reply creation through the same notification logic.

### Phase 4: Align permission models
Decide if Agent API should support reviewer-level access or remain owner-only. Document the decision.

### Phase 5: Fill gaps
Add missing operations to whichever side lacks them (e.g., version restore to UI, artifact delete to Agent API).
