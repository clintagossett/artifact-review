# Index Naming Convention Analysis

**Date:** 2026-01-03
**Related:** ADR 0012 (Backend Naming Conventions)
**Status:** Analysis Complete

## Summary

This document analyzes the inconsistency in index naming conventions between ADR 0012's specification and the actual codebase implementation, specifically regarding the `_and_` separator pattern.

---

## The Problem

ADR 0012 specifies two index naming patterns that appear inconsistent:

**Pattern 1: Multi-field indexes should use `_and_` separator**

```typescript
// ADR 0012 example
.index("by_artifact_and_version", ["artifactId", "versionNumber"])
.index("by_version_and_path", ["versionId", "filePath"])
```

**Pattern 2: Soft-delete indexes use `_active` shorthand**

```typescript
// ADR 0012 example
.index("by_creator_active", ["creatorId", "isDeleted"])  // NOT "by_creator_and_is_deleted"
.index("by_artifact_active", ["artifactId", "isDeleted"])
```

The inconsistency: Pattern 1 says "include `_and_` between fields" but Pattern 2 skips the `_and_` for the `_active` shorthand.

---

## Actual Codebase Audit

### Current Index Names in `schema.ts`

| Table | Index Name | Fields | Uses `_and_`? |
|-------|-----------|--------|---------------|
| artifacts | `by_created_by` | `["createdBy"]` | N/A (single) |
| artifacts | `by_created_by_active` | `["createdBy", "isDeleted"]` | No |
| artifacts | `by_share_token` | `["shareToken"]` | N/A (single) |
| artifactVersions | `by_artifact` | `["artifactId"]` | N/A (single) |
| artifactVersions | `by_artifact_active` | `["artifactId", "isDeleted"]` | No |
| artifactVersions | `by_artifact_version` | `["artifactId", "number"]` | No |
| artifactVersions | `by_created_by` | `["createdBy"]` | N/A (single) |
| artifactFiles | `by_version` | `["versionId"]` | N/A (single) |
| artifactFiles | `by_version_path` | `["versionId", "filePath"]` | No |
| artifactFiles | `by_version_active` | `["versionId", "isDeleted"]` | No |
| artifactReviewers | `by_artifact` | `["artifactId"]` | N/A (single) |
| artifactReviewers | `by_artifact_active` | `["artifactId", "isDeleted"]` | No |
| artifactReviewers | `by_artifact_email` | `["artifactId", "email"]` | No |
| artifactReviewers | `by_email` | `["email"]` | N/A (single) |
| artifactReviewers | `by_user` | `["userId"]` | N/A (single) |
| comments | `by_version_active` | `["versionId", "isDeleted"]` | No |
| comments | `by_version` | `["versionId"]` | N/A (single) |
| comments | `by_created_by` | `["createdBy"]` | N/A (single) |
| comments | `by_created_by_active` | `["createdBy", "isDeleted"]` | No |
| commentReplies | `by_comment_active` | `["commentId", "isDeleted"]` | No |
| commentReplies | `by_comment` | `["commentId"]` | N/A (single) |
| commentReplies | `by_created_by` | `["createdBy"]` | N/A (single) |
| commentReplies | `by_created_by_active` | `["createdBy", "isDeleted"]` | No |

### Key Finding

**The codebase does NOT use `_and_` in ANY multi-field index.** Every multi-field index uses direct concatenation:

- `by_artifact_version` (not `by_artifact_and_version`)
- `by_version_path` (not `by_version_and_path`)
- `by_artifact_email` (not `by_artifact_and_email`)
- `by_created_by_active` (not `by_created_by_and_active`)

---

## Options Analysis

### Option A: Keep `_active` (current) - Simpler but skips `_and_`

**What it means:** Continue using `_active` suffix for soft-delete indexes without `_and_`.

**Pros:**
- Already implemented across entire codebase (17+ indexes)
- Shorter, more readable names
- `_active` is semantically clear (filters out deleted items)
- No migration required

**Cons:**
- ADR 0012 documentation says to use `_and_` but codebase doesn't follow it
- Creates documentation vs reality mismatch

### Option B: Use `_and_active` - Consistent with `_and_` pattern

**What it means:** Rename all `_active` indexes to `_and_active`.

**Pros:**
- Literal consistency with `_and_` pattern in ADR

**Cons:**
- Requires renaming 12+ indexes
- Longer names (`by_created_by_and_active` vs `by_created_by_active`)
- Still doesn't match the field name (`_and_active` vs `_and_is_deleted`)
- Breaks every query in the codebase

### Option C: Drop `_and_` entirely for all multi-field indexes

**What it means:** Update ADR 0012 to match current codebase practice - no `_and_` anywhere.

**Pros:**
- Matches actual implementation (zero changes to code)
- Shorter, cleaner index names
- Consistent pattern: `by_field1_field2` for all multi-field indexes
- Easier to type and read

**Cons:**
- Deviates from `convex-rules.md` which says to include `_and_`
- May be less explicit about multi-field nature

### Option D: Use `_and_` everywhere except semantic shorthands

**What it means:** Create a formal rule that:
1. General multi-field indexes use `_and_` (e.g., `by_artifact_and_version`)
2. Semantic patterns use shorthand (e.g., `_active` for soft-delete)

**Pros:**
- Provides flexibility for common patterns
- Documents when shorthands are acceptable

**Cons:**
- Requires updating existing indexes to add `_and_` where missing
- Creates two rules to remember
- Current codebase doesn't use `_and_` anywhere

---

## Convex Rules Guidance

From `docs/architecture/convex-rules.md`:

> Always include all index fields in the index name. For example, if an index is defined as `["field1", "field2"]`, the index name should be "by_field1_and_field2".

This is a recommendation, not a hard technical requirement. Convex itself does not enforce index naming conventions.

---

## Industry Context

Looking at database and ORM conventions:

| Framework/DB | Multi-Column Index Convention |
|--------------|------------------------------|
| Rails/ActiveRecord | `index_table_on_field1_and_field2` (uses `_and_`) |
| Django | `table_field1_field2_idx` (no separator) |
| PostgreSQL | User-defined (no convention) |
| MongoDB | Field order in compound index (no naming convention) |
| Prisma | `@@index([field1, field2])` auto-named |

There is no universal standard. Both `_and_` and direct concatenation are used in practice.

---

## Recommendation

**Recommended: Option C - Drop `_and_` entirely, update ADR 0012 to match codebase**

### Rationale

1. **Reality over documentation**: The entire codebase (17+ indexes) already uses direct concatenation without `_and_`. Changing code to match docs would be a significant breaking change with no functional benefit.

2. **Consistency**: Currently 100% of multi-field indexes use direct concatenation. Introducing `_and_` selectively would create inconsistency.

3. **Readability**: Index names without `_and_` are shorter and equally clear:
   - `by_artifact_version` vs `by_artifact_and_version` (4 chars saved)
   - `by_created_by_active` vs `by_created_by_and_active` (4 chars saved)
   - When you see `by_X_Y`, you know it's a compound index on X and Y

4. **Semantic shorthands preserved**: The `_active` shorthand is valuable because:
   - It indicates query intent (filtering out deleted items)
   - It's self-documenting (read: "active items by X")
   - Using `_and_is_deleted` would be technically accurate but semantically misleading (we filter for `isDeleted = false`, not just "has isDeleted")

5. **Minimal disruption**: Only ADR 0012 needs updating, no code changes required.

---

## Specific Recommendations

### 1. Should we use `_and_` between all fields?

**No.** Drop the `_and_` convention entirely.

Pattern: `by_field1_field2` for all multi-field indexes

Examples:
- `by_artifact_version` (not `by_artifact_and_version`)
- `by_version_path` (not `by_version_and_path`)
- `by_artifact_email` (not `by_artifact_and_email`)

### 2. How should we handle the `_active` shorthand?

**Keep `_active` as a semantic shorthand** for indexes that filter soft-deleted records.

Pattern: `by_field_active` = `["field", "isDeleted"]` where query uses `eq("isDeleted", false)`

The shorthand is valuable because:
- It describes query intent, not just field list
- It's consistent with the "active/inactive" mental model
- It avoids the awkward `_is_deleted` which sounds like we're querying FOR deleted items

### 3. Should we update ADR 12 to match reality or update code to match ADR?

**Update ADR 12 to match reality.**

Changing 17+ indexes across 6 tables and updating every query that uses them would be:
- High effort with no functional benefit
- Risk of introducing bugs
- Unnecessary churn in git history

---

## Proposed ADR 0012 Changes

Update the Index Naming section from:

```markdown
**Convention: `by_field` or `by_field1_and_field2`**

Follow the pattern from `convex-rules.md`: include all indexed fields in the name.

// Good - Multi-field index (include all fields)
.index("by_creator_and_is_deleted", ["creatorId", "isDeleted"])
.index("by_artifact_and_version", ["artifactId", "versionNumber"])
```

To:

```markdown
**Convention: `by_field` or `by_field1_field2`**

Include all indexed fields in the name using underscore concatenation.

// Good - Multi-field index (concatenate field names)
.index("by_artifact_version", ["artifactId", "number"])
.index("by_version_path", ["versionId", "filePath"])
.index("by_artifact_email", ["artifactId", "email"])

// Good - Semantic shorthand for soft-delete pattern
.index("by_creator_active", ["createdBy", "isDeleted"])  // "_active" = filters out deleted
.index("by_artifact_active", ["artifactId", "isDeleted"])

// Bad - Don't use "_and_" separator (adds length without clarity)
.index("by_artifact_and_version", ["artifactId", "number"])
.index("by_creator_and_is_deleted", ["createdBy", "isDeleted"])
```

Also update `convex-rules.md` to remove the `_and_` recommendation if it exists there.

---

## Action Items

1. [ ] Update ADR 0012 Index Naming section to match this analysis
2. [ ] Update `convex-rules.md` if it mentions `_and_` convention
3. [ ] Ensure all new indexes follow `by_field1_field2` pattern (no `_and_`)
4. [ ] Keep `_active` shorthand for soft-delete indexes

---

## Conclusion

The codebase already follows a consistent pattern: direct concatenation for multi-field indexes with `_active` as a semantic shorthand for soft-delete filtering. The documentation in ADR 0012 should be updated to match this reality rather than requiring a large-scale code migration with no functional benefit.
