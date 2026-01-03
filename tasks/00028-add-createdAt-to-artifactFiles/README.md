# Task 00028: Bring artifactFiles Table into Full ADR-12 Compliance

**GitHub Issue:** #28
**Created:** 2026-01-03
**Status:** Not Started
**Estimated Effort:** 4-6 hours

---

## Summary

Bring the `artifactFiles` table into **full compliance** with ADR 12 naming conventions. This is currently the **only artifact table** with compliance violations.

**Current Compliance:** 70% ❌
**Target Compliance:** 100% ✅

---

## Background

A comprehensive compliance audit revealed that `artifactFiles` has 4 violations of ADR 12 naming conventions, while all other 5 artifact-related tables are 100% compliant.

See: `tasks/00028-add-createdAt-to-artifactFiles/adr12-full-compliance-analysis.md`

---

## Issues to Fix

| # | Issue | Type | ADR 12 Reference |
|---|-------|------|------------------|
| 1 | Missing `createdAt` field | Audit Trail | Line 121 - Required for all tables |
| 2 | `filePath` should be `path` | Property Redundancy | Lines 310-312 - Table context is sufficient |
| 3 | `fileSize` should be `size` | Property Redundancy | Lines 310-312 - Avoid repeating table name |
| 4 | Index `by_versionId_filePath` should be `by_versionId_path` | Index Naming | Line 373 - Index names must match fields |

---

## ADR 12 Property Redundancy Rule

From ADR 12 (lines 303-335):

> **Convention: Avoid repeating type context in property names**
>
> The table name already provides context, so property names should not repeat it.

**Example from ADR 12:**
```typescript
// Good - Table context is sufficient
artifactFiles: defineTable({
  path: v.string(),    // Not "filePath" - we're in artifactFiles
  size: v.number(),    // Not "fileSize" - context is clear
  mimeType: v.string(), // Domain term that adds meaning
})
```

**Our current violation:**
- Has `filePath` instead of `path` ❌
- Has `fileSize` instead of `size` ❌

---

## Changes Required

### 1. Schema Updates

**File:** `app/convex/schema.ts`

```typescript
// BEFORE (current - 70% compliant)
artifactFiles: defineTable({
  versionId: v.id("artifactVersions"),
  filePath: v.string(),                  // ❌ Should be "path"
  storageId: v.id("_storage"),
  mimeType: v.string(),
  fileSize: v.number(),                  // ❌ Should be "size"
  // ❌ MISSING: createdAt
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
})
  .index("by_versionId", ["versionId"])
  .index("by_versionId_filePath", ["versionId", "filePath"])  // ❌ Wrong name
  .index("by_versionId_active", ["versionId", "isDeleted"])

// AFTER (100% compliant)
artifactFiles: defineTable({
  versionId: v.id("artifactVersions"),
  path: v.string(),                      // ✅ Renamed from filePath
  storageId: v.id("_storage"),
  mimeType: v.string(),
  size: v.number(),                      // ✅ Renamed from fileSize
  createdAt: v.number(),                 // ✅ Added
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
})
  .index("by_versionId", ["versionId"])
  .index("by_versionId_path", ["versionId", "path"])  // ✅ Updated
  .index("by_versionId_active", ["versionId", "isDeleted"])
```

### 2. Mutation Updates

**File:** `app/convex/lib/zipProcessorMutations.ts`

Update `createArtifactFileRecord` mutation:

```typescript
export const createArtifactFileRecord = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    path: v.string(),        // ✅ Renamed from filePath
    storageId: v.id("_storage"),
    mimeType: v.string(),
    size: v.number(),        // ✅ Renamed from fileSize
  },
  returns: v.id("artifactFiles"),
  handler: async (ctx, args) => {
    const now = Date.now();  // ✅ Add this

    return await ctx.db.insert("artifactFiles", {
      versionId: args.versionId,
      path: args.path,       // ✅ Updated
      storageId: args.storageId,
      mimeType: args.mimeType,
      size: args.size,       // ✅ Updated
      createdAt: now,        // ✅ Add this
      isDeleted: false,
    });
  },
});
```

### 3. Query Updates

**Files to update:**
- `app/convex/artifacts.ts` - Queries that return file records
- `app/convex/http.ts` - HTTP file serving logic

**Pattern to find and replace:**

```typescript
// BEFORE
const file = await ctx.db
  .query("artifactFiles")
  .withIndex("by_versionId_filePath", (q) =>
    q.eq("versionId", versionId).eq("filePath", path)
  )
  .first();

if (file) {
  console.log(file.filePath, file.fileSize);
}

// AFTER
const file = await ctx.db
  .query("artifactFiles")
  .withIndex("by_versionId_path", (q) =>
    q.eq("versionId", versionId).eq("path", path)
  )
  .first();

if (file) {
  console.log(file.path, file.size);
}
```

### 4. Return Validator Updates

Update any return validators that include file fields:

```typescript
// Before
returns: v.object({
  filePath: v.string(),
  fileSize: v.number(),
})

// After
returns: v.object({
  path: v.string(),
  size: v.number(),
  createdAt: v.number(),  // Add if exposing files
})
```

### 5. Test Updates

**Files to update:**
- `app/convex/__tests__/phase1-zip-storage.test.ts`
- `app/convex/__tests__/zip-backend-integration.test.ts`
- `app/convex/__tests__/zip-multi-level-nesting.test.ts`
- `app/convex/__tests__/zip-serving.test.ts`
- Any other tests using `artifactFiles`

**Pattern:**
```typescript
// Before
expect(file.filePath).toBe("index.html");
expect(file.fileSize).toBeGreaterThan(0);

// After
expect(file.path).toBe("index.html");
expect(file.size).toBeGreaterThan(0);
expect(file.createdAt).toBeDefined();
```

---

## Implementation Plan

### Step 1: Find All References

```bash
cd app

# Find all filePath references
grep -rn "filePath" convex/

# Find all fileSize references
grep -rn "fileSize" convex/

# Find index usage
grep -rn "by_versionId_filePath" convex/
```

### Step 2: Update Schema

1. Open `convex/schema.ts`
2. Locate `artifactFiles` table definition
3. Rename fields and index as shown above
4. Save and verify Convex dev server restarts successfully

### Step 3: Update Mutations

1. Open `convex/lib/zipProcessorMutations.ts`
2. Update `createArtifactFileRecord`:
   - Rename arg `filePath` → `path`
   - Rename arg `fileSize` → `size`
   - Add `createdAt: Date.now()`
3. Update any other mutations that create/update files

### Step 4: Update Queries

1. Search for `withIndex("by_versionId_filePath"`
2. Replace with `withIndex("by_versionId_path"`
3. Update field references:
   - `file.filePath` → `file.path`
   - `file.fileSize` → `file.size`

**Files likely affected:**
- `convex/artifacts.ts` - `getFiles` or similar queries
- `convex/http.ts` - File serving logic

### Step 5: Update Tests

1. Update all test files found in Step 1
2. Replace field names in assertions
3. Update any direct `ctx.db.insert("artifactFiles")` calls in tests
4. Run tests: `npm test`

### Step 6: Migration (if needed)

If there's existing data in development/production:

```typescript
// Create migration script in convex/
export const migrateArtifactFiles = internalMutation({
  handler: async (ctx) => {
    const files = await ctx.db.query("artifactFiles").collect();

    for (const file of files) {
      // Only migrate if old fields exist
      if ("filePath" in file || "fileSize" in file) {
        await ctx.db.patch(file._id, {
          path: file.filePath,
          size: file.fileSize,
          createdAt: file.createdAt || file._creationTime,
        });
      }
    }

    return { migrated: files.length };
  },
});
```

**Note:** If database is empty or dev-only, skip migration script.

### Step 7: Testing

**Unit tests:**
```bash
npm test
```

**Manual verification:**
1. Start dev server: `./scripts/start-dev-servers.sh`
2. Upload a ZIP artifact via UI
3. Open Convex dashboard → `artifactFiles` table
4. Verify fields show:
   - ✅ `path` (not `filePath`)
   - ✅ `size` (not `fileSize`)
   - ✅ `createdAt` is populated
5. View artifact in browser to verify HTTP serving works

---

## Affected Files Checklist

**Backend (Convex):**
- [ ] `convex/schema.ts` - Schema definition
- [ ] `convex/lib/zipProcessorMutations.ts` - File creation
- [ ] `convex/artifacts.ts` - File queries (if any)
- [ ] `convex/http.ts` - HTTP file serving

**Tests:**
- [ ] `convex/__tests__/phase1-zip-storage.test.ts`
- [ ] `convex/__tests__/zip-backend-integration.test.ts`
- [ ] `convex/__tests__/zip-multi-level-nesting.test.ts`
- [ ] `convex/__tests__/zip-serving.test.ts`
- [ ] Any other files using `artifactFiles`

**Frontend:**
- [ ] Verify no direct references to `filePath` or `fileSize`
- [ ] Frontend typically doesn't query `artifactFiles` directly

---

## Testing Plan

### Automated Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test phase1-zip-storage.test.ts
npm test zip-backend-integration.test.ts
npm test zip-multi-level-nesting.test.ts
npm test zip-serving.test.ts
```

### Manual Testing

**Test Case 1: ZIP Upload**
1. Upload new ZIP file via UI
2. Check Convex dashboard:
   - Files table has `path`, `size`, `createdAt` fields
   - Index `by_versionId_path` exists
3. Verify artifact displays correctly in browser

**Test Case 2: HTTP File Serving**
1. Navigate to uploaded artifact
2. Open browser DevTools → Network tab
3. Verify all files (HTML, CSS, JS, images) load correctly
4. Check no 404 errors

**Test Case 3: Multi-level ZIP**
1. Upload ZIP with nested directories
2. Verify all files extracted with correct `path` values
3. Verify nested file references work (CSS imports, etc.)

---

## Rollback Plan

If issues arise after deployment:

1. **Revert schema changes:**
   ```bash
   git revert <commit-hash>
   ```

2. **Redeploy previous version:**
   ```bash
   npx convex deploy
   ```

3. **Data recovery (if needed):**
   - Convex stores `_creationTime` automatically
   - Can reconstruct `createdAt` from `_creationTime`
   - Field renames may require manual data fix

---

## Acceptance Criteria

- [ ] Schema updated with:
  - [ ] `path` field (renamed from `filePath`)
  - [ ] `size` field (renamed from `fileSize`)
  - [ ] `createdAt: v.number()` field added
  - [ ] Index renamed to `by_versionId_path`

- [ ] Mutations updated:
  - [ ] `createArtifactFileRecord` uses new field names
  - [ ] Sets `createdAt: Date.now()`

- [ ] Queries updated:
  - [ ] All `withIndex("by_versionId_filePath")` → `withIndex("by_versionId_path")`
  - [ ] All `file.filePath` → `file.path`
  - [ ] All `file.fileSize` → `file.size`

- [ ] Tests updated and passing:
  - [ ] All field name references updated
  - [ ] All assertions use new field names
  - [ ] All tests pass

- [ ] Manual verification:
  - [ ] ZIP upload creates files with correct fields
  - [ ] HTTP serving works (all files load)
  - [ ] Convex dashboard shows correct field names
  - [ ] No errors in browser console or Convex logs

- [ ] Compliance achieved:
  - [ ] `artifactFiles` table at 100% ADR 12 compliance
  - [ ] All 6 artifact tables at 100% compliance

---

## Compliance Impact

**Before this task:**

| Table | Compliance |
|-------|-----------|
| `artifacts` | ✅ 100% |
| `artifactVersions` | ✅ 100% |
| `artifactFiles` | ❌ 70% |
| `artifactReviewers` | ✅ 100% |
| `artifactAccess` | ✅ 100% |
| `userInvites` | ✅ 100% |
| **Average** | **95%** |

**After this task:**

| Table | Compliance |
|-------|-----------|
| `artifacts` | ✅ 100% |
| `artifactVersions` | ✅ 100% |
| `artifactFiles` | ✅ 100% ← **Fixed!** |
| `artifactReviewers` | ✅ 100% |
| `artifactAccess` | ✅ 100% |
| `userInvites` | ✅ 100% |
| **Average** | ✅ **100%** |

---

## Related Documents

- **Full Analysis:** `tasks/00028-add-createdAt-to-artifactFiles/adr12-full-compliance-analysis.md`
- **Original Finding:** `tasks/schema-compliance-review.md`
- **Redundancy Analysis:** `tasks/schema-redundancy-analysis.md`
- **ADR 12:** `docs/architecture/decisions/0012-naming-conventions.md`
- **Related Issue:** #26 (Index naming - separate effort)

---

## Notes

### Why Bundle All Changes Together?

We're fixing all 4 issues in one task because:
1. **Field renames are breaking anyway** - Might as well do them all at once
2. **Minimize migration pain** - One migration better than multiple
3. **Complete compliance** - Gets `artifactFiles` to 100% in one shot
4. **Testing efficiency** - Test all changes together

### Migration Considerations

- **Development:** No migration needed if database is empty
- **Production:** Run migration script before deploying new code
- **Backfill `createdAt`:** Can use `_creationTime` as fallback value

---

**Task Created:** 2026-01-03
**Estimated Effort:** 4-6 hours
**Risk Level:** Medium (breaking schema changes)
**Impact:** High (achieves 100% ADR 12 compliance across all artifact tables)
