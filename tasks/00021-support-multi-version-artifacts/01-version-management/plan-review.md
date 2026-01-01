# Plan Review: Subtask 01 - Version Management

**Reviewed:** 2026-01-01
**Reviewer:** Software Architect Agent
**Status:** CRITICAL ISSUES IDENTIFIED

---

## Executive Summary

The implementation plan in `01-version-management/README.md` contains several issues that need addressing before implementation can proceed safely:

1. **CRITICAL:** Schema needs field renames (`versionName` → `name`, `versionNumber` → `number`)
2. **CRITICAL:** Most backend functionality already exists
3. **CRITICAL:** The "delete all data" strategy is not viable with active agents
4. **MODERATE:** Pseudocode in plan uses wrong patterns (violates Convex rules)
5. **LOW:** Some deliverables are redundant with existing code

This review provides a corrected implementation approach.

---

## 1. Schema Migration Strategy

### Current State Analysis

**Schema currently has:**
- `versionName: v.optional(v.string())` → needs to become `name`
- `versionNumber: v.number()` → needs to become `number`

**Rationale for renames:**
- `version.name` is cleaner than `version.versionName`
- `version.number` is cleaner than `version.versionNumber`

### Recommended Migration Strategy

**Phase A: Update Schema**

1. Change `versionName` → `name` in schema.ts
2. Change `versionNumber` → `number` in schema.ts
3. Update all index definitions that reference these fields

**Phase B: Update All Code References**

| File | Changes Required |
|------|------------------|
| `app/convex/artifacts.ts` | Rename `versionName` → `name`, `versionNumber` → `number` in all functions |
| `app/convex/zipUpload.ts` | Rename both fields in `addZipVersion` |
| `app/src/hooks/useArtifactUpload.ts` | Rename parameters |
| Test files | Update assertions |

**Phase C: Handle Existing Data**

Option 1 (Simple): Accept that old documents have old field names
- Both fields are stored in documents, new names won't match
- Documents need migration

Option 2 (Recommended): Write a one-time migration script
- Query all artifactVersions
- Copy `versionName` → `name` and `versionNumber` → `number`
- Run once in dev environment

**NOTE:** Since we cannot delete data (active agents), migration script is required.

### Files Requiring Updates

```
app/convex/schema.ts
  - versionName -> name
  - versionNumber -> number
  - Update any indexes using these fields

app/convex/artifacts.ts
  - createInternal: versionName arg -> name
  - addVersionInternal: versionName arg -> name, versionNumber -> number
  - updateVersionName: rename to updateName, update field references
  - All queries: update field references in return types
  - All mutations: update field references

app/convex/zipUpload.ts
  - addZipVersion: versionName -> name, versionNumber -> number

app/src/hooks/useArtifactUpload.ts
  - versionName parameter -> name

Test files: Update assertions
```

---

## 2. Existing Code Analysis

### What Already Exists (DO NOT REBUILD)

| Functionality | Location | Status |
|---------------|----------|--------|
| Upload new version (single file) | `artifacts.addVersion` action | **EXISTS** - Full implementation |
| Upload new version (ZIP) | `zipUpload.addZipVersion` mutation | **EXISTS** - Full implementation |
| Delete version (soft delete) | `artifacts.softDeleteVersion` mutation | **EXISTS** - Full implementation with cascade |
| Rename version | `artifacts.updateVersionName` mutation | **EXISTS** - Needs field rename only |
| Get latest version | `artifacts.getLatestVersion` query | **EXISTS** - Full implementation |
| Get versions for artifact | `artifacts.getVersions` query | **EXISTS** - Returns desc order |
| Cannot delete last version | `artifacts.softDeleteVersion` | **EXISTS** - Already enforced |

### What Needs to Be Built

| Functionality | Notes |
|---------------|-------|
| Comment control enforcement | Add to `comments.create` mutation |
| `isLatest` computed flag | Add to `getVersions` query response |
| Frontend: Upload new version UI | May partially exist |
| Frontend: Version list with "Latest" badge | Needs `isLatest` from backend |

---

## 3. Implementation Sequence

### Corrected Order

```
1. Code Alignment (versionName -> name)
   - Backend mutations/queries
   - Frontend hooks
   - Tests

2. Add isLatest Computation
   - Modify getVersions query to compute isLatest per version
   - Add helper function for determining latest

3. Add Comment Control Enforcement
   - Create getLatestVersionId helper
   - Add enforcement to comments.create mutation
   - Add clear error message

4. Frontend Updates
   - Version list displays "Latest" badge
   - Upload new version UI (if missing)
   - Comment UI respects version state

5. Testing
   - Unit tests for comment enforcement
   - E2E tests for full workflow
```

### Critical Dependencies

```
isLatest computation MUST be done before:
  - Frontend can show "Latest" badge
  - Comment enforcement can work correctly

Comment enforcement MUST be done before:
  - Frontend changes (to prevent race conditions)
```

---

## 4. Risk Assessment

### High Risk

| Risk | Mitigation |
|------|------------|
| **Conflicting field names** - Schema says `name`, code writes `versionName` | Fix code to align with schema FIRST |
| **Breaking active agents** - Plan said delete all data | DO NOT delete data - use code alignment approach |
| **Validator mismatches** - Return types may not match actual data | Audit all return validators after field rename |

### Medium Risk

| Risk | Mitigation |
|------|------------|
| **Comment enforcement race** - User comments while switching versions | Backend enforcement is atomic, frontend just for UX |
| **isLatest calculation edge cases** - All versions deleted | Handle empty array case, return null |
| **Concurrent version uploads** - Two versions created simultaneously | Existing code handles this (queries all, finds max) |

### Low Risk

| Risk | Mitigation |
|------|------------|
| **Test breakage** - Tests use old field name | Update tests as part of code alignment |
| **Frontend cache** - Old field name cached | Frontend re-fetches on query change |

---

## 5. Recommendations

### MUST DO

1. **Cancel the "delete all data" approach** - Not viable with active dev environment

2. **Align code with schema** - The schema is correct, the code is wrong:
   ```typescript
   // Change this:
   versionName: args.versionName,
   // To this:
   name: args.versionName, // or rename the arg entirely
   ```

3. **Add isLatest computation** - Critical for frontend and comment control:
   ```typescript
   // In getVersions query handler:
   const versions = await ctx.db.query("artifactVersions")
     .withIndex("by_artifact_active", ...)
     .order("desc")
     .collect();

   const latestId = versions[0]?._id;
   return versions.map(v => ({
     ...v,
     isLatest: v._id === latestId,
   }));
   ```

4. **Add comment enforcement** - In `comments.create`:
   ```typescript
   // Get version being commented on
   const version = await ctx.db.get(args.versionId);

   // Get latest version for this artifact
   const latestVersion = await ctx.db
     .query("artifactVersions")
     .withIndex("by_artifact_active", q =>
       q.eq("artifactId", version.artifactId).eq("isDeleted", false))
     .order("desc")
     .first();

   if (version._id !== latestVersion?._id) {
     throw new Error("Comments are only allowed on the latest version");
   }
   ```

### SHOULD DO

1. **Create shared helper** - Reusable latest version check:
   ```typescript
   // In convex/lib/versionHelpers.ts
   export async function getLatestVersionId(
     ctx: QueryCtx,
     artifactId: Id<"artifacts">
   ): Promise<Id<"artifactVersions"> | null> {
     const latest = await ctx.db
       .query("artifactVersions")
       .withIndex("by_artifact_active", q =>
         q.eq("artifactId", artifactId).eq("isDeleted", false))
       .order("desc")
       .first();
     return latest?._id ?? null;
   }
   ```

2. **Update frontend hooks** - Expose `isLatest` flag

3. **Add integration tests** - Cover comment enforcement edge cases

### COULD DO (Future)

1. **One-time data migration** - Copy `versionName` to `name` for old docs
2. **Add version comparison view** - Side-by-side versions
3. **Version deep links** - URL-based version navigation

---

## 6. Corrected Pseudocode Examples

The original plan had incorrect Convex patterns. Here are corrected versions:

### Original (WRONG - uses filter):
```typescript
// From plan README.md - VIOLATES CONVEX RULES
const versions = await ctx.db.query("versions")
  .withIndex("by_artifact")
  .filter(q => q.eq("deleted", false))  // WRONG: Don't use filter
  .order("desc")
  .first();
```

### Corrected (RIGHT - uses index):
```typescript
const latestVersion = await ctx.db
  .query("artifactVersions")
  .withIndex("by_artifact_active", q =>
    q.eq("artifactId", artifactId).eq("isDeleted", false))
  .order("desc")
  .first();
```

### Original (WRONG - table name):
```typescript
// From plan - uses "versions" which doesn't exist
const versions = await ctx.db.query("versions")
```

### Corrected (RIGHT - actual table name):
```typescript
const versions = await ctx.db.query("artifactVersions")
```

---

## 7. Updated Deliverables Checklist

Based on analysis, here's the corrected deliverable list:

### Backend (Convex)

- [ ] **Code alignment**: Rename `versionName` -> `name` in all code (schema already done)
- [ ] **Helper function**: Create `getLatestVersionId` in `convex/lib/versionHelpers.ts`
- [ ] **Computed isLatest**: Add to `getVersions` query response
- [ ] **Comment enforcement**: Add latest-only check to `comments.create`
- [ ] **Rename mutation update**: Change `updateVersionName` to `updateName` (optional, for API clarity)

### Already Done (Just Verify)

- [x] `addVersion` action - exists
- [x] `addZipVersion` mutation - exists
- [x] `softDeleteVersion` mutation - exists with cascade
- [x] `getLatestVersion` query - exists
- [x] "Cannot delete last version" logic - exists

### Frontend

- [ ] **Version list with "Latest" badge**: Use `isLatest` from query
- [ ] **Upload new version UI**: Check if exists, implement if not
- [ ] **Rename version UI**: Already works, may need field name update
- [ ] **Delete version UI**: Already works via softDeleteVersion

### Tests

- [ ] Unit: Comment enforcement rejects non-latest
- [ ] Unit: isLatest computed correctly
- [ ] Unit: isLatest updates when latest deleted
- [ ] E2E: Full upload-comment-delete workflow
- [ ] E2E: Attempt comment on old version (should fail)

---

## 8. Implementation Notes for TDD Developer

### Starting Point

1. Read `app/convex/schema.ts` - schema is already correct (`name` field)
2. Read `app/convex/artifacts.ts` - most functionality exists
3. Read `app/convex/comments.ts` - where enforcement goes

### Key Files to Modify

| File | Changes |
|------|---------|
| `app/convex/artifacts.ts` | Rename versionName -> name, add isLatest to getVersions |
| `app/convex/zipUpload.ts` | Rename versionName -> name |
| `app/convex/comments.ts` | Add latest-only enforcement to create mutation |
| `app/convex/lib/versionHelpers.ts` | NEW: Create getLatestVersionId helper |

### Test Strategy

1. **Start with failing tests** for comment enforcement
2. Add isLatest tests
3. Run existing tests after field rename (expect some failures)
4. Fix broken tests
5. Add E2E tests last

### Convex Rules Reminder

- Always use `withIndex`, never `filter`
- Always include `args` and `returns` validators
- Use `v.null()` for void returns
- Table is `artifactVersions`, not `versions`
- Field is `isDeleted`, not `deleted`

---

## Summary

The original plan overestimated the work required by not analyzing existing code. The main tasks are:

1. **Align code with schema** (versionName -> name) - 2-3 hours
2. **Add isLatest computation** - 1 hour
3. **Add comment enforcement** - 1 hour
4. **Frontend updates** - 2-3 hours
5. **Testing** - 2-3 hours

**Total estimated time: 8-11 hours** (vs original estimate of full rebuild)

The critical insight is that **most backend functionality already exists** from Tasks 18 and 19. This subtask is primarily about:
- Code cleanup (field rename)
- Adding one computed field (isLatest)
- Adding one enforcement check (comments)
- Frontend integration
