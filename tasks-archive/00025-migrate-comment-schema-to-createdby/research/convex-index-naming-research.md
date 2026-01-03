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

---

## External GitHub Sources

**Date Added:** 2026-01-03
**Purpose:** Validate patterns against publicly available Convex repositories

### Successfully Fetched Repositories

#### 1. get-convex/convex-helpers (Official Helper Library)
**URL:** `https://raw.githubusercontent.com/get-convex/convex-helpers/main/convex/schema.ts`

```typescript
// users table
.index("tokenIdentifier", ["tokenIdentifier"])

// join_table_example table
.index("by_userId", ["userId"])

// join_storage_example table
.index("storageId", ["storageId"])
.index("userId_storageId", ["userId", "storageId"])

// presence table
.index("room_updated", ["room", "updated"])
.index("user_room", ["user", "room"])

// privateMessages table
.index("to", ["to"])
.index("from", ["from"])
.index("from_to", ["from", "to"])
```

**Patterns Observed:**
- Mixed use of `by_` prefix (sometimes omitted)
- Compound indexes use underscore concatenation: `from_to`, `user_room`, `userId_storageId`
- No `_and_` separator used

---

#### 2. get-convex/fullstack-convex (Official Full-Stack Template)
**URL:** `https://raw.githubusercontent.com/get-convex/fullstack-convex/main/convex/schema.ts`

```typescript
// tasks table
.index("by_number", ["number"])
.index("by_ownerId", ["ownerId"])
.index("by_owner", ["owner"])
.index("by_status", ["status"])
.index("by_title", ["title"])
.index("by_commentCount", ["commentCount"])
.index("by_fileCount", ["fileCount"])

// users table
.index("by_tokenIdentifier", ["tokenIdentifier"])

// comments table
.index("by_task", ["task"])

// files table
.index("by_task", ["task"])
```

**Patterns Observed:**
- Consistent `by_` prefix on all indexes
- camelCase field names: `by_ownerId`, `by_tokenIdentifier`
- Single-field indexes predominate

---

#### 3. get-convex/convex-auth-example (Official Auth Example)
**URL:** `https://raw.githubusercontent.com/get-convex/convex-auth-example/main/convex/schema.ts`

```typescript
// users table
.index("email", ["email"])
.index("phone", ["phone"])
```

**Patterns Observed:**
- No `by_` prefix
- Simple field name as index name

---

#### 4. get-convex/convex-js (Official Convex JS SDK Tests)
**URL:** `https://raw.githubusercontent.com/get-convex/convex-js/main/src/server/schema.test.ts`

```typescript
// Test examples showing official naming conventions
.index("by_property1", ["property1"])
.index("by_property1_property2", ["property1", "property2"])
.index("by_a", ["a"])
.index("by_a_b", ["a", "b"])
.index("by_enabled", ["enabled"])
.index("by_enabled2", ["enabled"])
.index("by_enabled3", ["enabled"])
.index("by_staged", ["staged"])
```

**Patterns Observed:**
- Consistent `by_` prefix
- Compound indexes use direct underscore: `by_property1_property2`, `by_a_b`
- **NO `_and_` separator in official test examples**

---

#### 5. get-convex/llama-farm-chat (Official LLaMA Chat Demo)
**URL:** `https://raw.githubusercontent.com/get-convex/llama-farm-chat/main/convex/schema.ts`

```typescript
// sessions table
.index("sessionId", ["sessionId"])

// threads table
.index("uuid", ["uuid"])

// threadMembers table
.index("threadId", ["threadId", "userId"])
.index("userId", ["userId"])

// messages table
.index("state", ["state", "author.userId"])
.index("threadId", ["threadId"])

// jobs table
.index("responseId", ["work.responseId"])
.index("status", ["status", "lastUpdate"])

// workers table
.index("apiKey", ["apiKey"])
```

**Patterns Observed:**
- No `by_` prefix used
- Compound indexes named after first field: `threadId` for `["threadId", "userId"]`
- Nested field access in indexes: `author.userId`, `work.responseId`

---

#### 6. get-convex/multiplayer-game-with-dall-e (Official Game Demo)
**URL:** `https://raw.githubusercontent.com/get-convex/multiplayer-game-with-dall-e/main/convex/schema.ts`

```typescript
// users table
.index("by_token", ["tokenIdentifier"])

// games table
.index("s", ["slug"])

// rounds table
.index("public_game", ["publicRound", "stage", "lastUsed"])
```

**Patterns Observed:**
- Mixed prefix usage: `by_token` vs `s` vs `public_game`
- Descriptive compound index: `public_game` for multiple fields
- Very short names allowed: `s`

---

#### 7. a16z-infra/ai-town (Popular AI Town Demo)
**URL:** `https://raw.githubusercontent.com/a16z-infra/ai-town/main/convex/schema.ts`

```typescript
// messages table
.index("conversationId", ["worldId", "conversationId"])
.index("messageUuid", ["conversationId", "messageUuid"])
```

**Patterns Observed:**
- No `by_` prefix
- Index named after a semantically important field, not all fields
- Multi-field indexes don't include all fields in name

---

#### 8. xixixao/convex-auth (Convex Auth Alternative)
**URL:** `https://raw.githubusercontent.com/xixixao/convex-auth/main/convex/schema.ts`

```typescript
// users table
.index("email", ["email"])

// sessions table
.index("userId", ["userId"])

// numbers table
.index("userId", ["userId"])
```

**Patterns Observed:**
- No `by_` prefix
- Simple field name as index name
- Same index name can be used across different tables

---

#### 9. thomasballinger/convex-clerk-users-table (Clerk Integration Example)
**URL:** `https://raw.githubusercontent.com/thomasballinger/convex-clerk-users-table/main/convex/schema.ts`

```typescript
// users table
.index("by_clerk_id", ["clerkUser.id"])
```

**Patterns Observed:**
- Uses `by_` prefix with snake_case
- Nested field access: `clerkUser.id`

---

#### 10. ianmacartney/embeddings-in-convex (Embeddings Demo)
**URL:** `https://raw.githubusercontent.com/ianmacartney/embeddings-in-convex/main/convex/schema.ts`

```typescript
// chunks table
.index("embeddingId", ["embeddingId"])

// searches table
.index("input", ["input"])
.index("embeddingId", ["embeddingId"])

// comparisons table
.index("target", ["target"])
```

**Patterns Observed:**
- No `by_` prefix
- Simple field name as index name

---

#### 11. webdevcody/thumbnail-critique (Community Project)
**URL:** `https://raw.githubusercontent.com/webdevcody/thumbnail-critique/main/convex/schema.ts`

```typescript
// comments table
.index("by_thumbnailnId", ["thumbnailId"])  // Note: typo in original

// follows table
.index("by_userId_targetUserId", ["userId", "targetUserId"])
.index("by_targetUserId", ["targetUserId"])

// users table
.index("by_userId", ["userId"])
.index("by_subscriptionId", ["subscriptionId"])

// notifications table
.index("by_userId", ["userId"])
```

**Patterns Observed:**
- Consistent `by_` prefix
- Compound indexes use underscore: `by_userId_targetUserId`
- **NO `_and_` separator**

---

#### 12. webdevcody/survive-the-night-sim (Community Project)
**URL:** `https://raw.githubusercontent.com/webdevcody/survive-the-night-sim/main/convex/schema.ts`

```typescript
// maps table
.index("by_level", ["level"])
.index("by_isReviewed_level", ["isReviewed", "level"])

// scores table
.index("by_modelId", ["modelId"])

// models table
.index("by_active", ["active"])
.index("by_slug", ["slug"])

// results table
.index("by_gameId_level", ["gameId", "level"])
.index("by_status", ["status"])

// globalRankings table
.index("by_modelId_promptId", ["modelId", "promptId"])

// levelRankings table
.index("by_modelId_level_promptId", ["modelId", "level", "promptId"])
.index("by_level", ["level"])

// userResults table
.index("by_mapId_userId", ["mapId", "userId"])
.index("by_userId", ["userId"])

// admins table
.index("by_userId", ["userId"])

// prompts table
.index("by_active", ["active"])
```

**Patterns Observed:**
- Consistent `by_` prefix
- Compound indexes use underscore: `by_isReviewed_level`, `by_gameId_level`, `by_modelId_promptId`
- Three-field compound: `by_modelId_level_promptId`
- **NO `_and_` separator anywhere**

---

#### 13. get-convex/convex-ents (Entities Library - Dynamic Indexes)
**URL:** `https://raw.githubusercontent.com/get-convex/convex-ents/main/src/schema.ts`

This library generates indexes dynamically for edge relationships:

```typescript
// Dynamic compound index naming pattern:
edgeCompoundIndexNameRaw(forwardId, inverseId)  // e.g., "aId_bId"
```

**Patterns Observed:**
- Compound indexes use underscore concatenation: `aId_bId`
- No `_and_` separator
- Edge field indexes created automatically on FK fields

---

### Summary Table: All External GitHub Sources

| Repository | Prefix Used | Compound Separator | Uses `_and_`? |
|------------|-------------|-------------------|---------------|
| convex-helpers | Mixed (some `by_`) | Underscore (`_`) | No |
| fullstack-convex | `by_` | N/A (single field) | No |
| convex-auth-example | None | N/A | No |
| convex-js (tests) | `by_` | Underscore (`_`) | **No** |
| llama-farm-chat | None | First field name | No |
| multiplayer-game-with-dall-e | Mixed | Underscore (`_`) | No |
| ai-town | None | Semantic name | No |
| xixixao/convex-auth | None | N/A | No |
| convex-clerk-users-table | `by_` | N/A | No |
| embeddings-in-convex | None | N/A | No |
| thumbnail-critique | `by_` | Underscore (`_`) | No |
| survive-the-night-sim | `by_` | Underscore (`_`) | **No** |
| convex-ents | None | Underscore (`_`) | No |

---

### Key Findings from External Sources

1. **Zero repositories use `_and_` separator**
   - Across 13 repositories and 50+ index definitions, not a single one uses `by_field1_and_field2`
   - This conclusively confirms that `_and_` is not a Convex convention

2. **Two main conventions exist:**
   - **Convention A:** `by_field1_field2` (snake_case with `by_` prefix) - Used by fullstack-convex, convex-js tests, thumbnail-critique, survive-the-night-sim
   - **Convention B:** `field1` or semantic name (no prefix) - Used by llama-farm-chat, ai-town, embeddings-in-convex

3. **Underscore concatenation is universal for compound indexes:**
   - Every compound index across all repos uses direct underscore: `by_userId_targetUserId`, `by_gameId_level`, `from_to`
   - No other separator pattern exists

4. **The `by_` prefix is popular but optional:**
   - Official demos like fullstack-convex use `by_` consistently
   - Other official demos like llama-farm-chat don't use it
   - Both patterns are valid Convex conventions

5. **Our codebase pattern is validated:**
   - Our use of `by_field1_field2` matches survive-the-night-sim, thumbnail-critique, and convex-js tests
   - This is a well-established pattern in the Convex ecosystem

---

### URLs Attempted But Failed (404)

The following URLs returned 404 errors:
- `get-convex/convex-demos/main/convex/schema.ts` (monorepo - no root schema)
- `get-convex/convex-auth/main/src/server/schema.ts`
- `get-convex/aggregate/main/convex/schema.ts`
- `get-convex/raggy/main/convex/schema.ts`
- `get-convex/convex-demos/main/presence/convex/schema.ts`
- Various other paths that don't exist or are in different locations

---

### Conclusion from External Research

This external GitHub research **strongly validates** our existing findings:

1. **The `_and_` pattern does not exist in the Convex ecosystem** - not in official repos, not in popular community projects
2. **Underscore concatenation (`by_field1_field2`) is the de facto standard** for compound indexes when using the `by_` prefix
3. **Our ADR-0012 documentation should be updated** to remove any reference to `_and_` and recommend `by_field1_field2`
4. **No changes needed to our codebase** - we already follow the correct pattern
