# Resume File: Task 00011 - Present Artifact Version

**Last Updated:** 2025-12-26
**Status:** COMPLETE - Ready for Testing

---

## What Was Done This Session

### Commits Made

1. **`23ca93c`** - Backend (Subtasks 01-02)
   - HTTP route: `/artifact/{shareToken}/v{version}/{filePath}`
   - 8 Convex queries in `app/convex/artifacts.ts`
   - 12 backend tests passing

2. **`cc4e7da`** - Frontend (Subtasks 03-05)
   - 6 components in `app/src/components/artifact/`
   - Next.js routes: `/a/[shareToken]` and `/a/[shareToken]/v/[version]`
   - 14 frontend tests passing

### Files Created

**Backend:**
- `app/convex/http.ts` - HTTP routes for serving artifacts
- `app/convex/artifacts.ts` - Queries (extended from Task 10)
- `app/convex/__tests__/artifacts-queries.test.ts` - Backend tests

**Frontend:**
- `app/src/components/artifact/ArtifactFrame.tsx` - Sandboxed iframe
- `app/src/components/artifact/ArtifactHeader.tsx` - Title, version badge, metadata
- `app/src/components/artifact/VersionSwitcher.tsx` - Version dropdown
- `app/src/components/artifact/MultiPageNavigation.tsx` - Back/forward for ZIPs
- `app/src/components/artifact/ArtifactViewer.tsx` - Main layout
- `app/src/components/artifact/ArtifactViewerPage.tsx` - Data fetching wrapper
- `app/src/components/artifact/index.ts` - Barrel export
- `app/src/components/artifact/__tests__/*.test.tsx` - Component tests

**Routes:**
- `app/src/app/a/[shareToken]/page.tsx` - Latest version
- `app/src/app/a/[shareToken]/v/[version]/page.tsx` - Specific version

---

## Next Step: Test the Artifact Viewer

### How to Test

1. **Start the dev server:**
   ```bash
   cd app
   npm run dev
   ```

2. **Get a shareToken from existing artifacts:**
   - Check Convex dashboard for artifacts table
   - Or use the API to list artifacts

3. **Visit the viewer:**
   - Latest version: `http://localhost:3000/a/{shareToken}`
   - Specific version: `http://localhost:3000/a/{shareToken}/v/1`

### What to Verify

- [ ] Artifact loads in iframe
- [ ] Title and version badge display correctly
- [ ] Version switcher shows all versions
- [ ] Switching versions updates URL and content
- [ ] Old versions show read-only banner (yellow)
- [ ] ZIP artifacts show multi-page navigation
- [ ] Loading skeleton appears during data fetch
- [ ] 404 page for invalid shareToken

### Test Data

Task 10 backend is complete. Test artifacts exist in the database. Check:
- `samples/01-valid/` - Valid test artifacts
- Convex dashboard - View existing artifacts

---

## Context for Next Session

### Architecture

```
URL: /a/{shareToken}
  → Next.js page extracts shareToken
  → ArtifactViewerPage fetches data via Convex queries
  → ArtifactViewer renders layout
  → ArtifactFrame loads iframe from HTTP endpoint

HTTP: /artifact/{shareToken}/v{n}/{filePath}
  → Convex HTTP action
  → Looks up artifact by shareToken
  → Finds version by number
  → Serves HTML content or fetches file from storage
```

### Key Queries (api.artifacts.*)

- `getByShareToken(shareToken)` - Get artifact
- `getVersions(artifactId)` - List all versions
- `getVersionByNumber(artifactId, versionNumber)` - Specific version
- `getLatestVersion(artifactId)` - Latest version
- `listHtmlFiles(versionId)` - HTML files in ZIP

### Environment

- Convex site URL built from: `NEXT_PUBLIC_CONVEX_URL?.replace('.cloud', '.site')`
- Iframe src: `{convexSiteUrl}/artifact/{shareToken}/v{n}/{filePath}`

---

## Related Tasks

- **Task 00010** - Artifact Upload (backend complete, frontend pending)
- **Task 00012** - Landing page/dashboard (in progress, separate task)
- **Commenting** - Not yet created, was scoped out of Task 11

---

## Commands

```bash
# Run all Task 11 tests
cd app
npx vitest run convex/__tests__/artifacts-queries.test.ts
npx vitest run src/components/artifact/__tests__/

# Start dev server
npm run dev

# Check Convex
npx convex dashboard
```
