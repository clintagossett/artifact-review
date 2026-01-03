# Manual Upload Test - Phase 1 Frontend Fix

## Test Date
2025-12-31

## Objective
Verify that the frontend hook correctly calls the backend action with the unified storage argument structure.

## Prerequisites
- Dev servers running (`./scripts/start-dev-servers.sh`)
- User authenticated in browser
- Sample files available in `/samples/`

## Test Steps

### Test 1: Upload HTML File

1. Navigate to `http://localhost:3000`
2. Click "New Artifact" button
3. Fill in form:
   - Title: "Test HTML Upload - Phase 1"
   - Description: "Testing unified blob storage"
4. Select file: `samples/01-valid/html/simple-html/v1/index.html`
5. Click "Upload" or "Create"

**Expected Result:**
- ✅ Upload succeeds without errors
- ✅ No "Trying to execute as Mutation" error
- ✅ Artifact appears in list
- ✅ Can view the artifact and see "Welcome Page v1" rendered

**Actual Result:**
(To be filled in during manual testing)

### Test 2: Upload Markdown File

1. Navigate to `http://localhost:3000`
2. Click "New Artifact" button
3. Fill in form:
   - Title: "Test Markdown Upload - Phase 1"
   - Description: "Testing unified blob storage for Markdown"
4. Select file: `samples/01-valid/markdown/product-spec/v1.md`
5. Click "Upload" or "Create"

**Expected Result:**
- ✅ Upload succeeds without errors
- ✅ No "Trying to execute as Mutation" error
- ✅ Artifact appears in list
- ✅ Can view the artifact and see markdown rendered

**Actual Result:**
(To be filled in during manual testing)

### Test 3: Verify Database Structure

After uploads, check Convex dashboard:

1. Open `artifactVersions` table
2. Find the uploaded versions
3. Verify:
   - ✅ `createdBy` field is set (user ID)
   - ✅ `entryPoint` field is set ("index.html" or "README.md")
   - ✅ `fileType` field is correct ("html" or "markdown")
   - ✅ NO `htmlContent` or `markdownContent` fields
4. Open `artifactFiles` table
5. Verify:
   - ✅ One row per uploaded file
   - ✅ `storageId` points to blob storage
   - ✅ `filePath` matches `entryPoint`
   - ✅ `mimeType` is correct

**Actual Result:**
(To be filled in during manual testing)

## Code Changes Summary

### Fixed Files
- `app/src/hooks/useArtifactUpload.ts`

### Changes Made
1. Changed `useMutation` → `useAction` (line 4)
2. Changed `useMutation(api.artifacts.create)` → `useAction(api.artifacts.create)` (line 38)
3. Updated argument structure for HTML/Markdown:
   - Removed: `htmlContent`, `markdownContent` fields
   - Added: `content` (unified field)
   - Added: `originalFileName`
   - Added: `versionName: undefined`
4. Disabled ZIP uploads temporarily (out of scope for Phase 1)

## Test Result
- [ ] PASS - All tests successful
- [ ] FAIL - Issues found (describe below)

## Issues Found
(None yet - awaiting manual testing)

## Sign-off
Tester: _____________
Date: _____________
