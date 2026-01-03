# Subtask 01: Comprehensive Version Management Test

**Status:** In Progress
**Created:** 2025-12-27

## Objective

Create comprehensive integration test for ZIP artifact version management covering:
- Multiple version uploads (v1, v2, v3, v4)
- Soft deletes of versions
- Version numbering with gaps (deleted versions)
- Error handling when deleting last active version
- Data integrity validation at each step

## Test Scenarios

### Scenario 1: Upload ZIP v1
- Upload first version of ZIP artifact
- Validate:
  - Artifact created with correct metadata
  - Version 1 created with versionNumber = 1
  - ZIP files extracted to `artifactFiles` table
  - Entry point detected correctly
  - All files accessible via HTTP router

### Scenario 2: Upload ZIP v2
- Upload second version to same artifact
- Validate:
  - Version 2 created with versionNumber = 2
  - v1 still exists and is accessible
  - v2 files extracted correctly
  - Both versions can be viewed independently

### Scenario 3: Validate Everything in Order
- Check database state:
  - 1 artifact record
  - 2 artifactVersion records (v1, v2)
  - All files for both versions in `artifactFiles` table
  - Both versions marked `isDeleted: false`

### Scenario 4: Upload ZIP v3
- Upload third version
- Validate:
  - Version 3 created with versionNumber = 3
  - All three versions exist and accessible

### Scenario 5: Delete v2 (Soft Delete)
- Delete version 2
- Validate:
  - v2 marked with `isDeleted: true`
  - v2 files still in database (soft delete)
  - v1 and v3 still active and accessible
  - v2 NOT returned in active version queries

### Scenario 6: Delete v3 (Soft Delete)
- Delete version 3 (note: user said "delete v4" but meant v3)
- Validate:
  - v3 marked with `isDeleted: true`
  - Only v1 remains active
  - v1 still fully accessible

### Scenario 7: Attempt to Delete v1 (Should Error)
- Try to delete version 1 (last active version)
- Validate:
  - Error thrown with message about needing at least one active version
  - Suggested action: delete entire artifact instead
  - v1 remains active (delete was rejected)

### Scenario 8: Upload v4 with Gaps
- Upload new version after v2 and v3 are deleted
- Validate:
  - New version created with versionNumber = 4 (NOT 2!)
  - Version numbering respects deleted versions (never reuses numbers)
  - v4 files extracted correctly
  - v1 and v4 both active and accessible

### Scenario 9: Final State Validation
- Verify final database state:
  - 1 artifact record
  - 4 artifactVersion records:
    - v1: active (`isDeleted: false`)
    - v2: soft deleted (`isDeleted: true`)
    - v3: soft deleted (`isDeleted: true`)
    - v4: active (`isDeleted: false`)
  - Active versions query returns only v1 and v4
  - All files accessible for v1 and v4
  - v2 and v3 files still in database but not accessible via public routes

## Test Implementation Plan

### 1. Setup
- Use sample ZIP from `/samples/` directory
- Create test helper functions:
  - `uploadZipVersion(artifactId, zipFile)` - Upload new version
  - `deleteVersion(versionId)` - Delete version
  - `validateVersion(versionId, expected)` - Validate version state
  - `validateArtifactFiles(versionId, expectedCount)` - Validate extracted files

### 2. Test Structure
```typescript
describe('Comprehensive ZIP Version Management', () => {
  let artifactId: Id<"artifacts">;
  let v1Id: Id<"artifactVersions">;
  let v2Id: Id<"artifactVersions">;
  let v3Id: Id<"artifactVersions">;
  let v4Id: Id<"artifactVersions">;

  it('should upload v1 and extract files', async () => { ... });
  it('should upload v2 and maintain v1', async () => { ... });
  it('should have correct state after 3 versions', async () => { ... });
  it('should upload v3', async () => { ... });
  it('should soft delete v2', async () => { ... });
  it('should validate v2 soft delete', async () => { ... });
  it('should soft delete v3', async () => { ... });
  it('should error when deleting last active version (v1)', async () => { ... });
  it('should upload v4 with correct version number', async () => { ... });
  it('should validate final state', async () => { ... });
});
```

### 3. Validation Checks
Each step should validate:
- Database records (artifacts, artifactVersions, artifactFiles)
- HTTP router accessibility (can we GET the files?)
- Version numbering logic
- Soft delete flags
- Error messages

## Files to Create

- `tests/version-management.test.ts` - Main integration test
- `tests/helpers/upload-helpers.ts` - Reusable upload/validate helpers
- `output/test-results.md` - Test execution results
- `output/validation-video.mp4` - Manual validation recording

## Sample Files to Use

From `/samples/`:
- `simple-html.v1.zip` - For v1
- `simple-html.v2.zip` - For v2
- `simple-html.v3.zip` - For v3
- `simple-html.v4.zip` - For v4

(Or any other versioned ZIP samples available)

## Acceptance Criteria

- [ ] All 9 scenarios pass
- [ ] Test is repeatable (can run multiple times)
- [ ] Test uses central `/samples/` files
- [ ] Test uses structured logging (not console.log)
- [ ] Test validates database state at each step
- [ ] Test validates HTTP router accessibility
- [ ] Error messages are clear and actionable
- [ ] Final state matches expected (v1 active, v2/v3 deleted, v4 active)

## Questions to Resolve

1. **Do version delete APIs exist yet?**
   - Need to check `app/convex/artifacts.ts` or create them

2. **How to validate HTTP router accessibility in tests?**
   - Make HTTP requests to artifact URLs?
   - Query `artifactFiles` table directly?

3. **What sample ZIPs should we use?**
   - Check `/samples/` for versioned ZIP files
   - May need to create test ZIPs if they don't exist

4. **Should test run against real Convex dev server or use test framework?**
   - Recommendation: Run against real dev server for true integration test
   - Alternative: Use Convex test framework if available

## Next Steps

1. [x] Create subtask folder and README
2. [ ] Check if version delete APIs exist
3. [ ] Check what ZIP samples are available in `/samples/`
4. [ ] Create test helper functions
5. [ ] Write integration test
6. [ ] Run test and fix issues
7. [ ] Document results
