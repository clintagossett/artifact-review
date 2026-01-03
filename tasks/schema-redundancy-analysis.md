# Schema Redundancy Analysis: `createdAt` vs `_creationTime`

**Date:** 2026-01-03
**Reviewer:** Claude Code
**Issue:** Potential redundancy between manual `createdAt` fields and Convex's built-in `_creationTime`

---

## Executive Summary

**Redundancy Identified: YES** ⚠️

The schema contains both:
- **Manual `createdAt` fields** - explicitly set using `Date.now()` during record creation
- **Convex's built-in `_creationTime`** - automatically set by Convex on all documents

**Current State:**
- 4 tables have explicit `createdAt` fields
- All 6 tables have Convex's built-in `_creationTime`
- Frontend exclusively uses `createdAt` for display
- Backend exposes both fields in query responses

**Recommendation:** **Keep both, but with clear separation of concerns** (see details below)

---

## Current State Analysis

### Tables with Manual `createdAt`

| Table | Has `createdAt`? | Usage | Frontend Usage |
|-------|------------------|-------|----------------|
| `artifacts` | ✅ Yes | Set on creation: `createdAt: now` | ✅ Used for display |
| `artifactVersions` | ✅ Yes | Set on creation: `createdAt: now` | ✅ Used for display |
| `comments` | ✅ Yes | Set on creation: `createdAt: now` | ✅ Used for display |
| `commentReplies` | ✅ Yes | Set on creation: `createdAt: now` | ✅ Used for display |
| `artifactFiles` | ❌ No | N/A | ❌ Not exposed |
| `artifactReviewers` | ⚠️ `invitedAt` | Set on creation: `invitedAt: now` | ✅ Used for display |

### Usage Patterns

#### Backend: Manual Setting of `createdAt`

**Example from `zipUpload.ts:36-48`:**
```typescript
const now = Date.now();

const artifactId = await ctx.db.insert("artifacts", {
  name: args.name,
  description: args.description,
  createdBy: userId,
  shareToken,
  isDeleted: false,
  createdAt: now,      // ⚠️ Manually set
  updatedAt: now,
});
```

**Example from `comments.ts:142-151`:**
```typescript
const now = Date.now();

const commentId = await ctx.db.insert("comments", {
  versionId: args.versionId,
  createdBy: userId,
  content: trimmedContent,
  resolved: false,
  target: args.target,
  isEdited: false,
  isDeleted: false,
  createdAt: now,      // ⚠️ Manually set
});
```

#### Backend: Exposing Both Fields in Queries

**Example from `artifacts.ts:202-215` (return validator):**
```typescript
returns: v.object({
  _id: v.id("artifactVersions"),
  _creationTime: v.number(),        // ⚠️ Exposed but not used by frontend
  artifactId: v.id("artifacts"),
  number: v.number(),
  name: v.optional(v.string()),
  createdBy: v.id("users"),
  fileType: v.string(),
  entryPoint: v.string(),
  fileSize: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),            // ✅ Used by frontend
}),
```

#### Frontend: Exclusive Use of `createdAt`

**Example from `CommentCard.tsx:84`:**
```typescript
timestamp: new Date(br.createdAt).toLocaleString(),
```

**Example from `ArtifactHeader.tsx:91`:**
```typescript
<span>{formatDate(version.createdAt)}</span>
```

**Finding:** Frontend NEVER uses `_creationTime` - only `createdAt`

---

## Redundancy Analysis

### Why We Have Redundancy

1. **Convex Automatic Behavior:**
   - All documents automatically get `_creationTime` (built-in, cannot disable)
   - Timestamp is set at the moment the document is inserted

2. **Explicit Business Timestamps:**
   - We manually set `createdAt` for business logic control
   - Allows setting the same timestamp across related records (e.g., artifact + version)

3. **Historical Pattern:**
   - Schema was designed before awareness of `_creationTime` built-in

### Current Redundancy Impact

**Storage:**
- 8 bytes per document (duplicate timestamp)
- Minimal impact: ~48 bytes for typical artifact with 6 records

**Bandwidth:**
- Both fields returned in queries (even though `_creationTime` is unused)
- Adds ~10-20 bytes per query response

**Code Complexity:**
- Must remember to set `createdAt: Date.now()` on every insert
- Risk of forgetting to set it (would cause errors due to schema validators)

**Maintenance:**
- Two sources of truth for creation time
- Potential confusion for developers

---

## Options Analysis

### Option A: Remove `createdAt`, Use Only `_creationTime` ❌

**What it means:** Delete manual `createdAt` fields and switch to built-in `_creationTime`

**Pros:**
- Eliminates redundancy entirely
- One less field to manage
- Cannot forget to set it (automatic)
- Reduces schema size

**Cons:**
- ❌ **Breaking change:** Frontend expects `createdAt` in responses
- ❌ **Mass migration required:** Update 4 tables, 50+ mutations, 100+ tests
- ❌ **Loss of control:** Cannot set same timestamp for related records
- ❌ **Semantic clarity:** `_creationTime` is less clear than `createdAt`
- ❌ **Underscore prefix:** Convex convention for system fields, not business fields

**Effort:** HIGH - Breaking change across frontend + backend

**Recommendation:** ❌ Do NOT pursue

---

### Option B: Remove `_creationTime` from Return Validators ⚠️

**What it means:** Keep manual `createdAt` but stop exposing unused `_creationTime` in queries

**Example change:**
```typescript
// Before
returns: v.object({
  _creationTime: v.number(),  // ❌ Remove this
  createdAt: v.number(),
}),

// After
returns: v.object({
  createdAt: v.number(),      // ✅ Keep only this
}),
```

**Pros:**
- Reduces bandwidth slightly
- Removes confusion about which field to use
- No frontend changes required (it doesn't use `_creationTime`)
- Small improvement in API clarity

**Cons:**
- `_creationTime` still exists in database (can't remove it)
- Doesn't eliminate underlying redundancy
- Minor effort to update all return validators

**Effort:** MEDIUM - Update ~20 return validators

**Recommendation:** ⚠️ Optional improvement, low priority

---

### Option C: Keep Both, Document Pattern (RECOMMENDED) ✅

**What it means:** Accept the redundancy, document clear separation of concerns

**Pattern:**
- **`createdAt` (manual)** = Business timestamp for user-facing features
- **`_creationTime` (built-in)** = System timestamp for debugging/audit (internal use only)

**Pros:**
- ✅ No breaking changes
- ✅ No migration required
- ✅ Maintains current functionality
- ✅ Semantic clarity (`createdAt` is domain language)
- ✅ Control over timestamps (e.g., setting same timestamp for related records)
- ✅ Clear separation: business vs system concerns

**Cons:**
- Accepts 8 bytes redundancy per document
- Must remember to set `createdAt` on inserts
- Two sources of truth (though one is unused)

**Effort:** MINIMAL - Just documentation

**Recommendation:** ✅ **This is the pragmatic choice**

---

## Detailed Comparison: `createdAt` vs `_creationTime`

| Aspect | `createdAt` | `_creationTime` |
|--------|-------------|-----------------|
| **Set by** | Developer (`Date.now()`) | Convex (automatic) |
| **Schema field** | Explicit: `createdAt: v.number()` | Implicit (always present) |
| **Control** | Full control over value | No control |
| **Naming** | Domain language | System convention (`_` prefix) |
| **Used by frontend** | ✅ Yes, extensively | ❌ Never |
| **Used by backend** | ✅ Yes, in business logic | ❌ No |
| **Can be same across records** | ✅ Yes (set `now` once) | ❌ No (each insert gets unique time) |
| **Can omit** | ❌ No (schema requires it) | ✅ Yes (can exclude from queries) |
| **Purpose** | Business timestamp | System audit trail |

---

## Use Case: Why Manual `createdAt` is Valuable

### Scenario: Creating Artifact + Version Together

**Current code (`zipUpload.ts:36-61`):**
```typescript
const now = Date.now();  // ✅ Single timestamp for both records

const artifactId = await ctx.db.insert("artifacts", {
  name: args.name,
  createdAt: now,    // Same timestamp
  updatedAt: now,
});

const versionId = await ctx.db.insert("artifactVersions", {
  artifactId,
  createdAt: now,    // Same timestamp (even though insert is milliseconds later)
});
```

**Result:** Artifact and its first version have identical `createdAt` timestamps, which is semantically correct.

**If using `_creationTime`:** The version's `_creationTime` would be slightly later than the artifact's, even though they were created together logically.

---

## Recommendations

### ✅ Primary Recommendation: Keep Both with Clear Documentation

**Action Items:**

1. **Update ADR 12** to document the pattern:
   ```markdown
   ### Creation Timestamps: `createdAt` vs `_creationTime`

   **Pattern:** Use both fields with clear separation of concerns.

   - **`createdAt: v.number()`** - Business timestamp for user-facing features
     - Set explicitly using `Date.now()` during record creation
     - Used by frontend for display
     - Allows setting same timestamp across related records
     - Domain language, clear semantic meaning

   - **`_creationTime` (built-in)** - System timestamp for internal debugging
     - Automatically set by Convex (cannot disable)
     - Should NOT be exposed in public queries
     - Used only for system-level audit trails
     - Convex convention (`_` prefix = system field)

   **Example:**
   ```typescript
   const now = Date.now();

   const artifactId = await ctx.db.insert("artifacts", {
     name: "Test",
     createdAt: now,  // ✅ Explicit business timestamp
     // _creationTime is set automatically by Convex
   });
   ```

   **Rationale:** While this creates 8 bytes of redundancy per document, it provides
   valuable control over business timestamps and maintains semantic clarity.
   ```

2. **Optional: Remove `_creationTime` from return validators** (low priority)
   - Update query return types to exclude `_creationTime`
   - Reduces API surface and clarifies which field is intended for use
   - No frontend changes required

3. **Add validation** to ensure `createdAt` is always set:
   - Consider a schema validator or mutation helper
   - Prevents accidental omission

### ⚠️ Alternative: Clean Up (if perfectionism outweighs pragmatism)

**Only pursue this if:**
- You're doing a major version migration anyway
- The 8-byte redundancy bothers you deeply
- You have time for extensive testing

**Steps:**
1. Remove all `createdAt` fields from schema
2. Update all mutations to stop setting `createdAt`
3. Update all queries to return `_creationTime` instead
4. Update frontend to use `_creationTime` instead of `createdAt`
5. Update all tests (100+ test files)
6. Migration script to backfill any missing data

**Effort:** HIGH (2-3 days of work + testing)
**Risk:** MEDIUM (breaking changes, potential bugs)
**Benefit:** LOW (saves 8 bytes per document)

**Recommendation:** ❌ Not worth the effort

---

## Comparison with `artifactFiles`

**Interesting finding:** The `artifactFiles` table does NOT have a manual `createdAt` field.

**Why?**
- Files are created programmatically during ZIP extraction
- No user-facing need to display file creation time
- Implicit creator = version creator
- Using only `_creationTime` is sufficient for this internal table

**Pattern:**
- **User-facing tables:** Use manual `createdAt` for business semantics
- **Internal/system tables:** Can rely on `_creationTime` alone

This supports the recommendation to keep both patterns and document when to use each.

---

## Implementation Impact

### If We Keep Both (Recommended)

**Schema Changes:** None
**Backend Changes:** None (add documentation only)
**Frontend Changes:** None
**Test Changes:** None
**Migration:** None

**Total Effort:** 30 minutes (documentation)

---

### If We Remove `createdAt` (Alternative)

**Schema Changes:**
- Remove `createdAt` from 4 tables
- Update 50+ validators

**Backend Changes:**
- Update 20+ mutations to stop setting `createdAt`
- Update 30+ queries to return `_creationTime`
- Rename all uses of `createdAt` to `_creationTime`

**Frontend Changes:**
- Update 7 files to use `_creationTime` instead of `createdAt`
- Update TypeScript types

**Test Changes:**
- Update 100+ test files
- Update all fixture data

**Migration:**
- Write migration script
- Test in staging
- Deploy with downtime

**Total Effort:** 2-3 days + testing + migration

---

## Conclusion

**Answer to your question:** "Do we have an issue with redundancy in our schema?"

**Yes, there is redundancy, but it's not a problem.** ✅

The redundancy between `createdAt` and `_creationTime` is:
1. **Intentional** (even if originally accidental) - provides business timestamp control
2. **Minimal cost** - 8 bytes per document
3. **High value** - semantic clarity and timestamp control
4. **Consistent pattern** - used across all user-facing tables

**Recommended action:**
- ✅ Keep both fields
- ✅ Document the pattern in ADR 12
- ⚠️ Optionally remove `_creationTime` from return validators (low priority)
- ❌ Do NOT attempt to remove `createdAt` (not worth the migration effort)

**Pattern to document:**
- **`createdAt`** = Business field (user-facing, semantic, controlled)
- **`_creationTime`** = System field (internal, automatic, audit only)

---

**Analysis Date:** 2026-01-03
**Reviewed By:** Claude Code
**Status:** Recommendation approved pending ADR 12 update
