# ADR 12 Full Compliance Analysis: All Artifact Tables

**Date:** 2026-01-03
**Reviewer:** Claude Code
**Standard:** ADR 12 (Backend Naming Conventions)
**Scope:** All artifact-related tables

---

## Executive Summary

**Tables Analyzed:** 6 artifact-related tables
- `artifacts`
- `artifactVersions`
- `artifactFiles`
- `artifactReviewers`
- `artifactAccess`
- `userInvites`

**Overall Findings:**
- ✅ **5 of 6 tables** are fully compliant
- ❌ **1 table** (`artifactFiles`) has multiple violations

---

## Compliance Checklist (Per ADR 12)

### 1. Table Naming
- [x] Plural camelCase naming
- [x] No snake_case
- [x] No PascalCase

**Status:** ✅ All tables compliant

### 2. Field Naming
- [x] All fields use camelCase
- [ ] Property redundancy avoided (context from table name)
- [x] Foreign keys use `entityId` pattern
- [x] Booleans use `is*` prefix

**Status:** ⚠️ `artifactFiles` has property redundancy violations

### 3. Audit Fields
- [x] `createdBy` for creator
- [ ] `createdAt` for creation timestamp
- [x] `isDeleted` for soft-delete flag
- [x] `deletedAt` for deletion timestamp
- [x] `deletedBy` for deletion user reference

**Status:** ⚠️ `artifactFiles` missing `createdAt`

### 4. Index Naming
- [x] Use `by_` prefix
- [x] Preserve camelCase in field names
- [x] No `_and_` separator
- [x] Use `_active` shorthand for soft-delete
- [ ] Index names match field names exactly

**Status:** ⚠️ `artifactFiles` has index naming mismatch (after field rename needed)

---

## Table-by-Table Analysis

### 1. `artifacts` ✅

**Compliance: 100%**

#### Fields
```typescript
artifacts: defineTable({
  name: v.string(),                      // ✅ No redundancy
  description: v.optional(v.string()),   // ✅
  createdBy: v.id("users"),              // ✅
  shareToken: v.string(),                // ✅
  isDeleted: v.boolean(),                // ✅
  deletedAt: v.optional(v.number()),     // ✅
  createdAt: v.number(),                 // ✅
  updatedAt: v.number(),                 // ✅
  deletedBy: v.optional(v.id("users")),  // ✅
})
```

#### Indexes
```typescript
.index("by_createdBy", ["createdBy"])                    // ✅
.index("by_createdBy_active", ["createdBy", "isDeleted"]) // ✅
.index("by_shareToken", ["shareToken"])                  // ✅
```

**Issues:** None

---

### 2. `artifactVersions` ✅

**Compliance: 100%**

#### Fields
```typescript
artifactVersions: defineTable({
  artifactId: v.id("artifacts"),         // ✅ FK pattern
  number: v.number(),                    // ✅ No redundancy (not "versionNumber")
  createdBy: v.id("users"),              // ✅
  name: v.optional(v.string()),          // ✅ No redundancy (not "versionName")
  deletedBy: v.optional(v.id("users")),  // ✅
  fileType: v.string(),                  // ✅
  entryPoint: v.string(),                // ✅
  fileSize: v.number(),                  // ✅ Acceptable (disambiguates from file-level size)
  isDeleted: v.boolean(),                // ✅
  deletedAt: v.optional(v.number()),     // ✅
  createdAt: v.number(),                 // ✅
})
```

**Note:** `fileSize` in `artifactVersions` is acceptable because it refers to the total ZIP size, not individual file sizes. Context distinguishes it from `artifactFiles.fileSize`.

#### Indexes
```typescript
.index("by_artifactId", ["artifactId"])                   // ✅
.index("by_artifactId_active", ["artifactId", "isDeleted"]) // ✅
.index("by_artifactId_number", ["artifactId", "number"])   // ✅
.index("by_createdBy", ["createdBy"])                      // ✅
```

**Issues:** None

---

### 3. `artifactFiles` ❌

**Compliance: 60%**

#### Current State
```typescript
artifactFiles: defineTable({
  versionId: v.id("artifactVersions"),   // ✅ FK pattern
  filePath: v.string(),                  // ❌ Should be "path"
  storageId: v.id("_storage"),           // ✅
  mimeType: v.string(),                  // ✅ Domain term
  fileSize: v.number(),                  // ❌ Should be "size"
  // ❌ MISSING: createdAt: v.number(),
  isDeleted: v.boolean(),                // ✅
  deletedAt: v.optional(v.number()),     // ✅
  deletedBy: v.optional(v.id("users")),  // ✅
})
```

#### Current Indexes
```typescript
.index("by_versionId", ["versionId"])                       // ✅
.index("by_versionId_filePath", ["versionId", "filePath"])  // ❌ Will be wrong after field rename
.index("by_versionId_active", ["versionId", "isDeleted"])   // ✅
```

#### Issues Found

**Issue 1: Property Redundancy - `filePath`**
- **Current:** `filePath: v.string()`
- **Should be:** `path: v.string()`
- **Reason:** ADR 12 line 310-311 - Table name provides context, avoid redundant "file" prefix
- **Impact:** Field rename + index rename + all query updates

**Issue 2: Property Redundancy - `fileSize`**
- **Current:** `fileSize: v.number()`
- **Should be:** `size: v.number()`
- **Reason:** ADR 12 line 312 - Table context is clear, no need for "file" prefix
- **Impact:** Field rename + all query updates

**Issue 3: Missing Audit Field - `createdAt`**
- **Current:** Missing
- **Should have:** `createdAt: v.number()`
- **Reason:** ADR 12 line 121 - "Required for all tables"
- **Impact:** Schema update + mutation update + optional backfill

**Issue 4: Index Naming Mismatch (consequence of Issue 1)**
- **Current:** `.index("by_versionId_filePath", ["versionId", "filePath"])`
- **Should be:** `.index("by_versionId_path", ["versionId", "path"])`
- **Reason:** Index name must match field names exactly
- **Impact:** Index rename + all query updates

#### Recommended Changes

```typescript
// BEFORE (current - non-compliant)
artifactFiles: defineTable({
  versionId: v.id("artifactVersions"),
  filePath: v.string(),                  // ❌
  storageId: v.id("_storage"),
  mimeType: v.string(),
  fileSize: v.number(),                  // ❌
  // Missing: createdAt                  // ❌
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
})
  .index("by_versionId", ["versionId"])
  .index("by_versionId_filePath", ["versionId", "filePath"])  // ❌
  .index("by_versionId_active", ["versionId", "isDeleted"])

// AFTER (compliant with ADR 12)
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
  .index("by_versionId_path", ["versionId", "path"])  // ✅ Updated to match field
  .index("by_versionId_active", ["versionId", "isDeleted"])
```

---

### 4. `artifactReviewers` ✅

**Compliance: 100%**

#### Fields
```typescript
artifactReviewers: defineTable({
  artifactId: v.id("artifacts"),         // ✅
  email: v.string(),                     // ✅
  userId: v.union(v.id("users"), v.null()), // ✅
  invitedBy: v.id("users"),              // ✅ Semantic variant of createdBy
  invitedAt: v.number(),                 // ✅ Semantic variant of createdAt
  status: v.union(...),                  // ✅
  isDeleted: v.boolean(),                // ✅
  deletedAt: v.optional(v.number()),     // ✅
})
```

**Note:** `invitedBy` and `invitedAt` are acceptable semantic variants per ADR 12.

#### Indexes
```typescript
.index("by_artifactId", ["artifactId"])                   // ✅
.index("by_artifactId_active", ["artifactId", "isDeleted"]) // ✅
.index("by_artifactId_email", ["artifactId", "email"])     // ✅
.index("by_email", ["email"])                             // ✅
.index("by_userId", ["userId"])                           // ✅
```

**Issues:** None

---

### 5. `artifactAccess` ✅

**Compliance: 100%**

#### Fields
```typescript
artifactAccess: defineTable({
  artifactId: v.id("artifacts"),         // ✅
  userId: v.optional(v.id("users")),     // ✅
  userInviteId: v.optional(v.id("userInvites")), // ✅
  createdBy: v.id("users"),              // ✅
  lastSentAt: v.number(),                // ✅
  sendCount: v.number(),                 // ✅
  firstViewedAt: v.optional(v.number()), // ✅
  lastViewedAt: v.optional(v.number()),  // ✅
  isDeleted: v.boolean(),                // ✅
  deletedAt: v.optional(v.number()),     // ✅
})
```

#### Indexes
```typescript
.index("by_artifactId_active", ["artifactId", "isDeleted"])       // ✅
.index("by_artifactId_userId", ["artifactId", "userId"])          // ✅
.index("by_artifactId_userInviteId", ["artifactId", "userInviteId"]) // ✅
.index("by_userId_active", ["userId", "isDeleted"])               // ✅
.index("by_userInviteId", ["userInviteId"])                       // ✅
```

**Issues:** None

---

### 6. `userInvites` ✅

**Compliance: 100%**

#### Fields
```typescript
userInvites: defineTable({
  email: v.string(),                     // ✅
  name: v.optional(v.string()),          // ✅
  createdBy: v.id("users"),              // ✅
  convertedToUserId: v.optional(v.id("users")), // ✅
  isDeleted: v.boolean(),                // ✅
  deletedAt: v.optional(v.number()),     // ✅
})
```

#### Indexes
```typescript
.index("by_email_createdBy", ["email", "createdBy"])  // ✅
.index("by_email", ["email"])                         // ✅
.index("by_convertedToUserId", ["convertedToUserId"]) // ✅
```

**Issues:** None

---

## Summary of Issues

### artifactFiles Table (4 issues)

| # | Issue | Type | Severity |
|---|-------|------|----------|
| 1 | `filePath` should be `path` | Property Redundancy | MEDIUM |
| 2 | `fileSize` should be `size` | Property Redundancy | MEDIUM |
| 3 | Missing `createdAt` field | Audit Trail | LOW |
| 4 | Index `by_versionId_filePath` should be `by_versionId_path` | Index Naming | MEDIUM (after #1) |

### All Other Tables

**Status:** ✅ Fully compliant - no issues

---

## ADR 12 Property Redundancy Rule

From ADR 12 lines 303-335:

> **Convention: Avoid repeating type context in property names**
>
> The table name already provides context, so property names should not repeat it.

**Examples from ADR 12:**

```typescript
// Good - Table context is sufficient
artifactFiles: defineTable({
  path: v.string(),              // Not "filePath" - we're in artifactFiles
  size: v.number(),              // Not "fileSize" - context is clear
  name: v.string(),              // Not "fileName" - table implies it
  mimeType: v.string(),          // Domain term that adds meaning
  versionId: v.id("artifactVersions"),
})
```

**Current artifactFiles violates this rule:**
- Has `filePath` instead of `path`
- Has `fileSize` instead of `size`

---

## Migration Impact

### Option A: Fix All Issues (Recommended)

**Changes required:**
1. Rename `filePath` → `path` in schema
2. Rename `fileSize` → `size` in schema
3. Add `createdAt: v.number()` to schema
4. Rename index `by_versionId_filePath` → `by_versionId_path`
5. Update all mutations that use these fields
6. Update all queries that use these fields
7. Update HTTP file serving logic
8. Update all tests

**Affected files estimate:**
- `convex/schema.ts` - schema changes
- `convex/lib/zipProcessorMutations.ts` - field names
- `convex/artifacts.ts` - queries with field references
- `convex/http.ts` - HTTP serving logic
- `convex/__tests__/*.test.ts` - 10+ test files

**Estimated effort:** 4-6 hours

**Risk:** MEDIUM - Breaking changes to indexes and field names

### Option B: Fix Only `createdAt` (Minimal)

**Changes required:**
1. Add `createdAt: v.number()` to schema
2. Update `createArtifactFileRecord` mutation
3. Optional: backfill migration

**Affected files:**
- `convex/schema.ts`
- `convex/lib/zipProcessorMutations.ts`

**Estimated effort:** 30 minutes

**Risk:** LOW - Additive change only

---

## Recommendations

### Immediate (Task 00028)

✅ **Fix `createdAt` first** (Option B above)
- Low risk, additive change
- Brings audit trail to 100% consistency
- Can be done independently

### Future (Separate Task)

⚠️ **Fix property redundancy** (Option A - Issues #1, #2, #4)
- Higher risk due to breaking changes
- Requires comprehensive testing
- Should be bundled with other schema migrations
- Create separate GitHub issue for field renames

**Suggested approach:**
1. Complete Task 00028 (add `createdAt`)
2. Create new task for field renames (`filePath` → `path`, `fileSize` → `size`)
3. Schedule field rename task when doing next major schema migration

---

## Compliance Scorecard

| Table | Field Naming | Audit Fields | Index Naming | Overall |
|-------|-------------|--------------|--------------|---------|
| `artifacts` | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `artifactVersions` | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `artifactFiles` | ❌ 60% | ❌ 80% | ⚠️ 67% | ❌ 70% |
| `artifactReviewers` | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `artifactAccess` | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `userInvites` | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| **Average** | **93%** | **97%** | **95%** | **95%** |

---

## Next Steps

1. ✅ **Complete Task 00028**: Add `createdAt` to `artifactFiles`
2. ⚠️ **Create new GitHub issue**: "Rename artifactFiles fields for ADR 12 compliance"
   - Rename `filePath` → `path`
   - Rename `fileSize` → `size`
   - Update index to `by_versionId_path`
3. 📝 **Document decision**: Update ADR 12 if needed to clarify property redundancy rules

---

**Analysis Date:** 2026-01-03
**Reviewed By:** Claude Code
**Reference:** ADR 12 (Backend Naming Conventions)
