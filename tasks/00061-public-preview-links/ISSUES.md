# Public Preview Links - Open Issues

## COMPLETED

### 9. Deep linking for multi-file artifacts ✅
- 9.1 Deep link to specific file/page within artifact (`/a/{token}/v/{version}/{filepath}`) - **DONE**
- 9.2 Deep link to anchor tags within files (`/a/{token}/v/{version}/{filepath}#heading-id`) - **Supported via URL hash**
- 9.3 Update URL when navigating between files - **DONE**
- 9.4 Support deep links in public share routes (`/share/{token}/{filepath}#anchor`) - **DONE**

### 1. Public share needs 3 access levels ✅
Implemented 3 tiers:
- **view** - View artifact, no annotations visible
- **view_read** - Can see existing annotations, can't add
- **view_readwrite** - Can see annotations, can add when logged in

Subtasks completed:
- 1.1 Update schema: `accessMode` to support `view`, `view_read`, `view_readwrite` - **DONE**
- 1.2 Update ShareLinkSection UI dropdown with 3 options - **DONE**
- 1.3 Update resolveToken query to return new access modes - **DONE**
- 1.4 Update PublicArtifactViewer to handle 3 modes - **DONE**

### 2. Public share users can now see and add annotations ✅
Created public annotations API that validates share token.

Subtasks completed:
- 2.1 Create public annotations query (`getByVersionPublic`) - **DONE**
- 2.2 Create public comment creation mutation (`createViaPublicShare`) - **DONE**
- 2.3 Allow annotation creation for authenticated public share users - **DONE**

### 3. Disabled share link now hides URL ✅
- 3.1 Update ShareLinkSection to hide URL when disabled - **DONE**
- 3.2 Show "Enable Link" button when disabled - **DONE**

### 4. Hidden controls from anonymous public share viewers ✅
- 4.1 Hide Back button - **DONE**
- 4.2 Hide Share button - **DONE**
- 4.3 Hide Manage button - **DONE**
- 4.4 Hide annotation filter dropdown - **DONE**
- 4.5 Hide version selector/dropdown - **DONE**
- 4.6 Hide version history list - **DONE**
- 4.7 Create minimal "public viewer" header variant - **DONE** (shows just title + version badge)

---

## TEST INFRASTRUCTURE

### 5. Video recording not working with custom browser contexts
Playwright's `video: 'on'` config setting doesn't apply to manually created `browser.newContext()` calls. Had to add `recordVideo: { dir: 'test-results/videos/' }` to each context creation in tests.

Subtasks:
- 5.1 Document that `recordVideo` must be passed to `browser.newContext()`
- 5.2 Update all E2E tests using custom contexts

---

## PRE-EXISTING TEST FAILURES

### 6. Notification E2E tests failing
5 tests in `notification.spec.ts` - likely pre-existing issue unrelated to public share work.

### 7. Forbidden file types test failing
`artifact-workflow.spec.ts:140` "Shows error state for ZIP with forbidden file types"

### 8. Novu integration smoke test failing
`smoke-integrations.spec.ts:92` "Comment triggers notification" - artifact creation doesn't redirect to `/a/` route.
