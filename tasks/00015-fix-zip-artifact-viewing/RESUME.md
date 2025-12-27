# Task 00015: Fix ZIP Artifact Viewing - RESUME

**Last Updated:** 2025-12-27
**Status:** Ready for TDD Developer Agent

---

## Where We Are

**Problem Identified:**
Multi-file HTML ZIP uploads are not displaying because the ZIP file upload pipeline was never actually implemented in Task 10, despite being marked "complete" with all tests passing.

**Root Cause:**
- Task 10 spec said to implement ZIP upload with `storage.store()` and `processZipFile()` trigger
- What was delivered: Only metadata creation, no actual file upload
- Tests passed because they were shallow unit tests that only checked "does function run without error?"
- No E2E tests for ZIP uploads were written

---

## What We Discovered

### Infrastructure Exists ✅
1. **HTTP Router** (`app/convex/http.ts`)
   - Serves files via `/artifact/{shareToken}/v{version}/{filePath}`
   - Works for both inline HTML and ZIP files
   - Queries `artifactFiles` table for individual files

2. **ZIP Processor** (`app/convex/zipProcessor.ts`)
   - `processZipFile` action extracts ZIP contents
   - Auto-detects entry point (index.html, main.html, first HTML)
   - Stores files in `artifactFiles` table

3. **ZIP Processor Mutations** (`app/convex/zipProcessorMutations.ts`)
   - `storeExtractedFile` - Stores individual file from ZIP
   - `markProcessingComplete` - Updates version with entry point
   - `markProcessingError` - Handles failures

4. **Schema** (`app/convex/schema.ts`)
   - `artifactFiles` table with `by_version_path` index
   - Ready for O(1) file lookups

### Gap Identified ❌
1. **Frontend** (`app/src/hooks/useArtifactUpload.ts`)
   - For HTML/Markdown: ✅ Works (reads content, calls mutation)
   - For ZIP: ❌ Only creates metadata, **never uploads the file**

2. **Backend** (`app/convex/artifacts.ts`)
   - `create` mutation: ✅ Creates artifact + version records
   - ❌ No mutation to generate upload URL for ZIPs
   - ❌ No action to trigger ZIP processing

### Test Coverage Analysis
- **Unit tests**: Passed, but only tested "function runs without error"
- **E2E tests**: Zero ZIP upload tests
- **Result**: False confidence in feature completion

---

## What's Been Done (This Session)

### 1. Investigation & Planning ✅
- Read Task 10 and Task 11 documentation
- Analyzed current implementation
- Identified root cause
- Created comprehensive plan in `README.md`

### 2. Backend Structure Created ✅
**File:** `app/convex/zipUpload.ts`

Two new functions created:

```typescript
// Step 1: Create artifact and get upload URL
createArtifactWithZip(title, description, fileSize, entryPoint?)
  → Returns: { uploadUrl, artifactId, versionId, shareToken }

// Step 2: Trigger processing after upload
triggerZipProcessing(versionId, storageId)
  → Calls: internal.zipProcessor.processZipFile
```

### 3. Frontend Hook Started 🟡
**File:** `app/src/hooks/useArtifactUpload.ts`

Added imports for new mutations:
```typescript
const createArtifactWithZip = useMutation(api.zipUpload.createArtifactWithZip);
const triggerZipProcessing = useMutation(api.zipUpload.triggerZipProcessing);
```

**Still needs:** Implementation of ZIP upload logic (see next section)

---

## What Needs To Be Done

### Phase 1: Backend Implementation & Testing 🎯 **START HERE**

**Owner:** TDD Developer Agent

**Tasks:**
1. **Write backend tests** (`tasks/00015-fix-zip-artifact-viewing/tests/backend/zip-upload.test.ts`)
   - Test `createArtifactWithZip` creates records and returns upload URL
   - Test upload URL generation works
   - Test `triggerZipProcessing` triggers the processor
   - Use sample ZIP files from `tasks/00010-artifact-upload-creation/samples/`

2. **Verify backend implementation** (`app/convex/zipUpload.ts`)
   - Run tests against existing code
   - Fix any issues found
   - Validate with Convex dashboard

**Expected Duration:** 1-2 hours

**Validation:**
- All backend tests passing
- Can manually test in Convex dashboard:
  1. Call `createArtifactWithZip`
  2. Upload ZIP to returned URL
  3. Call `triggerZipProcessing`
  4. Verify files appear in `artifactFiles` table

---

### Phase 2: Frontend Implementation & Testing

**Owner:** TDD Developer Agent

**File:** `app/src/hooks/useArtifactUpload.ts`

**Replace current ZIP code (lines 110-125):**

```typescript
// Current (broken):
if (fileType === "zip") {
  setUploadProgress(30);
  const result = await createArtifact({
    title,
    description,
    fileType: "zip",
    entryPoint,
    fileSize: file.size,
  });
  setUploadProgress(100);
  return result;
}

// New (working):
if (fileType === "zip") {
  // Step 1: Create artifact and get upload URL
  setUploadProgress(20);
  const { uploadUrl, versionId, artifactId, shareToken } =
    await createArtifactWithZip({
      title,
      description,
      fileSize: file.size,
      entryPoint,
    });

  // Step 2: Upload ZIP file to storage
  setUploadProgress(40);
  const uploadResult = await fetch(uploadUrl, {
    method: "POST",
    body: file,
    headers: { "Content-Type": "application/zip" },
  });

  if (!uploadResult.ok) {
    throw new Error("Failed to upload ZIP file");
  }

  const { storageId } = await uploadResult.json();

  // Step 3: Trigger ZIP processing
  setUploadProgress(70);
  await triggerZipProcessing({ versionId, storageId });

  // Step 4: Complete
  setUploadProgress(100);
  setIsUploading(false);

  return { artifactId, versionId, versionNumber: 1, shareToken };
}
```

**Tests to write:**
- Test ZIP upload calls all three steps
- Test progress tracking through all steps
- Test error handling (upload fails, processing fails)
- Mock fetch for ZIP upload

**Expected Duration:** 1-2 hours

**Validation:**
- Frontend unit tests passing
- Can test with actual ZIP file in UI (manual)

---

### Phase 3: E2E Testing & Integration

**Owner:** TDD Developer Agent

**Tasks:**
1. **Write E2E test** (`tasks/00015-fix-zip-artifact-viewing/tests/e2e/zip-upload.spec.ts`)
   - Upload ZIP via UI
   - Verify artifact appears in dashboard
   - Navigate to artifact viewer
   - Verify HTML displays
   - Verify assets load (CSS, JS, images)
   - Test multi-page navigation

2. **Test with sample files** (`tasks/00010-artifact-upload-creation/samples/`)
   - Test each sample ZIP file
   - Verify entry point detection
   - Verify all files are accessible

**Expected Duration:** 1-2 hours

**Validation:**
- E2E tests passing
- User can upload ZIP through UI
- Artifact viewer displays ZIP contents correctly
- Multi-page navigation works

---

## Sample Files Available

**Location:** `tasks/00010-artifact-upload-creation/samples/`

Use these ZIP files for testing:
- Single HTML with assets
- Multi-page HTML site
- Various entry point patterns (index.html, main.html, etc.)

---

## Files Created/Modified This Session

### Created:
- ✅ `tasks/00015-fix-zip-artifact-viewing/README.md` - Full analysis and plan
- ✅ `tasks/00015-fix-zip-artifact-viewing/IMPLEMENTATION-PLAN.md` - Phase breakdown
- ✅ `tasks/00015-fix-zip-artifact-viewing/RESUME.md` - This file
- ✅ `app/convex/zipUpload.ts` - Backend mutations/actions

### Modified:
- 🟡 `app/src/hooks/useArtifactUpload.ts` - Added imports, needs implementation

### To Create:
- `tasks/00015-fix-zip-artifact-viewing/tests/backend/zip-upload.test.ts`
- `tasks/00015-fix-zip-artifact-viewing/tests/e2e/zip-upload.spec.ts`

---

## Handoff to TDD Developer Agent

**Command to run:**
```
Use the TDD developer agent to complete task 00015-fix-zip-artifact-viewing, starting with Phase 1 (backend tests and validation). After each phase passes, checkpoint with me before proceeding to the next phase.
```

**Agent Instructions:**
1. Read `tasks/00015-fix-zip-artifact-viewing/README.md` for full context
2. Start with Phase 1 - Backend tests
3. Use sample ZIP files from `tasks/00010-artifact-upload-creation/samples/`
4. Follow TDD: Write failing tests → Implement → Pass tests → Refactor
5. After Phase 1 passes, checkpoint before Phase 2
6. After Phase 2 passes, checkpoint before Phase 3
7. Use `docs/development/testing-guide.md` for test standards

**Success Criteria:**
- [ ] All backend tests passing (Phase 1)
- [ ] All frontend tests passing (Phase 2)
- [ ] E2E tests passing (Phase 3)
- [ ] User can upload ZIP files through UI
- [ ] ZIP contents display in artifact viewer
- [ ] Regression: HTML/Markdown uploads still work

---

## References

### Documentation
- **Full Analysis:** `tasks/00015-fix-zip-artifact-viewing/README.md`
- **Implementation Plan:** `tasks/00015-fix-zip-artifact-viewing/IMPLEMENTATION-PLAN.md`
- **Testing Guide:** `docs/development/testing-guide.md`
- **Convex Rules:** `docs/architecture/convex-rules.md`

### Related Tasks
- **Task 10:** `tasks/00010-artifact-upload-creation/` - Original upload implementation
- **Task 11:** `tasks/00011-present-artifact-version-for-commenting/` - Viewer implementation

### Key Files
- **Backend Upload:** `app/convex/zipUpload.ts` (new)
- **Frontend Hook:** `app/src/hooks/useArtifactUpload.ts` (needs update)
- **ZIP Processor:** `app/convex/zipProcessor.ts` (existing, working)
- **HTTP Router:** `app/convex/http.ts` (existing, working)
- **Schema:** `app/convex/schema.ts` (existing, ready)

---

## Questions Resolved

**Q: Why weren't these files populated already?**
A: Task 10 spec included ZIP upload, but only metadata creation was implemented. Tests passed because they were shallow unit tests that didn't validate actual file upload behavior. No E2E tests for ZIP uploads existed.

**Q: Did end-to-end tests include zip upload with no validation?**
A: No ZIP upload E2E tests were written at all. Only HTML and Markdown upload tests existed.

**Q: Should TDD developer take this on?**
A: Yes! Perfect fit. Well-scoped, phases with checkpoints, sample files available, clear tests to write.

---

**Ready for TDD Developer Agent** 🚀
