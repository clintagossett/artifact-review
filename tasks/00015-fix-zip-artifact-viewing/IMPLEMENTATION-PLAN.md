# ZIP Upload Implementation Plan

**Focus:** Get ZIP file upload working end-to-end

## Implementation Steps

### Step 1: Backend - ZIP Upload Mutations/Actions
**File:** `app/convex/zipUpload.ts` (new)

Create three functions:

1. **`createArtifactWithZip`** (mutation)
   - Creates artifact + version records
   - Generates upload URL
   - Returns: `{ uploadUrl, artifactId, versionId, shareToken }`

2. **`triggerZipProcessing`** (action)
   - Called after client uploads ZIP to storage
   - Triggers `internal.zipProcessor.processZipFile`
   - Args: `{ versionId, storageId }`

### Step 2: Frontend - Update Upload Hook
**File:** `app/src/hooks/useArtifactUpload.ts`

For ZIP files:
1. Call `createArtifactWithZip` to get upload URL
2. Upload ZIP file to the URL via fetch
3. Extract storageId from response
4. Call `triggerZipProcessing` with versionId + storageId
5. Return artifact data

### Step 3: Backend Tests
**File:** `tasks/00015-fix-zip-artifact-viewing/tests/zip-upload.test.ts`

Test:
- `createArtifactWithZip` creates records and returns upload URL
- Upload URL generation works
- `triggerZipProcessing` triggers the processor

### Step 4: User Testing
User will test:
- Upload ZIP file through UI
- Verify files appear in browser
- Check multi-page navigation
- Verify assets load correctly

## Files to Create/Modify

**Create:**
- `app/convex/zipUpload.ts`

**Modify:**
- `app/src/hooks/useArtifactUpload.ts`

**Test:**
- `tasks/00015-fix-zip-artifact-viewing/tests/zip-upload.test.ts`

## Success Criteria

- [ ] Backend mutations/actions created and tested
- [ ] Frontend upload hook updated
- [ ] ZIP file uploads to Convex storage
- [ ] ZIP processing is triggered
- [ ] User can test upload through UI
