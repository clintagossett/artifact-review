# Convex Index Naming Research

**Date:** 2026-01-03
**Purpose:** Validate or refine ADR-0012 index naming conventions against official Convex patterns
**Status:** Complete

---

## Executive Summary

Official Convex sources use **two distinct conventions** for compound index naming:

| Source | Convention | Example |
|--------|------------|---------|
| Convex Core Tests | `by_field1_field2` (underscore, no `_and_`) | `by_property1_property2` |
| @convex-dev/auth | `camelCaseAndCamelCase` (no prefix, `And` in middle) | `userIdAndProvider` |

**Key Finding:** Neither official source uses `_and_` (lowercase with underscores). The `by_field1_and_field2` pattern appears to be a documentation example, not the actual convention used in Convex's own code.

---

## Sources Consulted

### 1. Convex Core SDK (node_modules/convex)

**Location:** `app/node_modules/convex/src/server/schema.test.ts`

This is the authoritative test file for Convex schema functionality. It contains the patterns that Convex uses internally.

### 2. @convex-dev/auth Package (Official Auth Library)

**Location:** `app/node_modules/@convex-dev/auth/src/server/implementation/types.ts`

This is Convex's official authentication library, maintained by the Convex team.

### 3. convex-rules.md (Project Documentation)

**Location:** `docs/architecture/convex-rules.md` (line 181)

This is our project's internal rules document, which states:
> "Always include all index fields in the index name. For example, if an index is defined as `["field1", "field2"]`, the index name should be "by_field1_and_field2"."

**Note:** This appears to contradict Convex's own internal patterns.

---

## Findings: Code Snippets from Official Sources

### Convex Core SDK Test Examples

```typescript
// From: node_modules/convex/src/server/schema.test.ts

// Pattern 1: Single field index
.index("by_property1", ["property1"])

// Pattern 2: Compound index - NO "_and_" separator
.index("by_property1_property2", ["property1", "property2"])

// Pattern 3: Simple field names
.index("by_a", ["a"])
.index("by_a_b", ["a", "b"])

// Pattern 4: Boolean fields
.index("by_enabled", ["enabled"])
.index("by_staged", { fields: ["staged"], staged: true })
```

**Key Observations:**
- Uses `by_` prefix consistently
- Uses snake_case for index names
- Compound indexes use direct underscore concatenation: `by_a_b` not `by_a_and_b`
- No `_and_` separator in any example

### @convex-dev/auth Package Examples

```typescript
// From: node_modules/@convex-dev/auth/src/server/implementation/types.ts

// Pattern 1: Single field index - NO prefix
.index("email", ["email"])
.index("phone", ["phone"])
.index("userId", ["userId"])
.index("sessionId", ["sessionId"])
.index("accountId", ["accountId"])
.index("code", ["code"])
.index("signature", ["signature"])
.index("identifier", ["identifier"])

// Pattern 2: Compound index - camelCase with "And" in the middle
.index("userIdAndProvider", ["userId", "provider"])
.index("providerAndAccountId", ["provider", "providerAccountId"])
.index("sessionIdAndParentRefreshTokenId", ["sessionId", "parentRefreshTokenId"])
```

**Key Observations:**
- No `by_` prefix
- Uses camelCase for index names
- Compound indexes use `And` (capital A) in camelCase
- Field names included in index name (pattern: `field1AndField2`)

### System Indexes (Built-in)

```typescript
// From: node_modules/convex/src/server/system_fields.ts

by_id: ["_id"];
by_creation_time: ["_creationTime"];
```

**Key Observations:**
- Uses `by_` prefix
- Uses snake_case: `by_creation_time` not `byCreationTime`

---

## Patterns Observed

### Summary of All Official Conventions

| Aspect | Convex Core Tests | @convex-dev/auth | System Indexes |
|--------|-------------------|------------------|----------------|
| Prefix | `by_` | None | `by_` |
| Case | snake_case | camelCase | snake_case |
| Separator | Underscore only | `And` (camelCase) | Underscore only |
| Example | `by_a_b` | `userIdAndProvider` | `by_creation_time` |

### Pattern Analysis

1. **The `_and_` pattern is NOT used in official Convex code**
   - Convex Core uses: `by_property1_property2`
   - @convex-dev/auth uses: `property1AndProperty2`
   - Neither uses: `by_property1_and_property2`

2. **Two valid conventions exist:**
   - **Convention A (Core SDK):** `by_field1_field2` - snake_case with `by_` prefix
   - **Convention B (@convex-dev/auth):** `field1AndField2` - camelCase without prefix

3. **The `by_` prefix appears more commonly** in system indexes and core tests

4. **No standard for "active" filtering:**
   - Neither official source has examples of soft-delete pattern indexes
   - Our `_active` suffix is a project-specific convention (not from Convex)

---

## Recommendations for ADR-0012

### 1. Remove `_and_` from the convention

**Current ADR-0012 Rule (from convex-rules.md):**
> "the index name should be "by_field1_and_field2""

**Recommended Change:**
> "the index name should be "by_field1_field2" (underscore concatenation without `_and_`)"

**Rationale:**
- Convex Core SDK tests use `by_property1_property2` not `by_property1_and_property2`
- Matches our actual codebase implementation (17+ indexes)
- Shorter, equally readable
- Aligns with official Convex patterns

### 2. Keep the `by_` prefix

**Recommendation:** Continue using `by_` prefix for all indexes

**Rationale:**
- Convex Core SDK tests use `by_` prefix
- System indexes use `by_` prefix
- Clearly distinguishes index names from table/field names
- More readable than camelCase without prefix

### 3. Keep the `_active` shorthand for soft-delete filtering

**Recommendation:** Continue using `by_field_active` for `["field", "isDeleted"]` indexes

**Rationale:**
- Neither official pattern addresses soft-delete filtering
- The shorthand is project-specific but valuable for our use case
- `_active` is semantically meaningful (filters for active records)
- Already consistently implemented across our codebase

### 4. Update convex-rules.md

**Current Line 181:**
```
- Always include all index fields in the index name. For example, if an index is defined as `["field1", "field2"]`, the index name should be "by_field1_and_field2".
```

**Recommended Update:**
```
- Always include all index fields in the index name. For example, if an index is defined as `["field1", "field2"]`, the index name should be "by_field1_field2" (underscore concatenation, no "and" separator).
```

---

## Comparison: Current Codebase vs Official Patterns

| Our Pattern | Convex Core Pattern | Match? |
|-------------|---------------------|--------|
| `by_created_by` | `by_property1` | Yes |
| `by_artifact_version` | `by_property1_property2` | Yes |
| `by_version_path` | `by_a_b` | Yes |
| `by_created_by_active` | (no equivalent) | N/A (project-specific) |

**Conclusion:** Our codebase already follows Convex Core SDK patterns. The only discrepancy is that our ADR-0012/convex-rules.md documentation recommends `_and_` which is not used in practice (neither in our code nor in Convex's code).

---

## Why the `_and_` Pattern Exists in Documentation

The `_and_` pattern likely originated from:

1. **Readability in documentation examples:** `by_field1_and_field2` reads more naturally in English
2. **Rails influence:** Rails ActiveRecord uses `index_table_on_field1_and_field2`
3. **Early Convex documentation:** May have suggested this for clarity before settling on shorter patterns

However, Convex's own implementation uses the shorter `by_field1_field2` pattern.

---

## Action Items

Based on this research:

1. [x] Research complete - documented in this file
2. [ ] Update ADR-0012 to specify `by_field1_field2` (no `_and_`)
3. [ ] Update `convex-rules.md` line 181 to match
4. [ ] No code changes needed - codebase already follows correct pattern
5. [ ] Keep `_active` suffix as our project-specific convention for soft-delete filtering

---

## References

### Official Convex Sources (in node_modules)

| File | Location | Contains |
|------|----------|----------|
| Convex Core SDK Tests | `node_modules/convex/src/server/schema.test.ts` | Authoritative index naming examples |
| System Fields | `node_modules/convex/src/server/system_fields.ts` | Built-in index patterns |
| @convex-dev/auth Types | `node_modules/@convex-dev/auth/src/server/implementation/types.ts` | Auth library indexes |

### Project Documentation

| File | Location | Contains |
|------|----------|----------|
| ADR-0012 | `docs/architecture/decisions/0012-naming-conventions.md` | Current naming conventions |
| Convex Rules | `docs/architecture/convex-rules.md` | Backend development rules |
| Index Analysis | `tasks/00025-migrate-comment-schema-to-createdby/index-naming-analysis.md` | Codebase audit |

---

## Conclusion

The research validates that our codebase follows correct Convex patterns. The `_and_` recommendation in our documentation appears to be an error that should be corrected. Official Convex code uses direct underscore concatenation (`by_field1_field2`) for compound indexes, which is exactly what we have implemented.
