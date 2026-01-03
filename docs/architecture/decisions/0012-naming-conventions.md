# ADR 0012: Backend Naming Conventions

**Status:** Accepted
**Date:** 2025-12-31
**Last Updated:** 2026-01-02 (Simplified creator field convention - use `createdBy` for all)
**Decision Maker:** Clint Gossett

## TL;DR

Establish consistent naming conventions for Convex backend code including function names, schema fields, table names, and indexes. Use camelCase for fields/functions, plural camelCase for tables, snake_case for indexes, and standardized CRUD patterns.

## Quick Reference

| Item | Convention | Example |
|------|-----------|---------|
| **Table Names** | Plural camelCase | `artifacts`, `artifactVersions` |
| **Schema Fields** | camelCase | `createdAt`, `shareToken` |
| **Property Names** | Avoid redundancy with table context | `path` not `filePath` in `artifactFiles` |
| **Audit Timestamps** | `*At` suffix | `createdAt`, `deletedAt` |
| **Record Creator** | `createdBy` | All tables - who created this record |
| **Boolean Fields** | `is*` prefix | `isDeleted`, `isUpdated` |
| **Foreign Keys** | `entityId` | `artifactId`, `versionId` |
| **Index Names** | `by_field` (snake_case) | `by_created_by`, `by_artifact_active` |
| **Query Functions** | `get*`, `list*`, `getBy*` | `get`, `list`, `getByShareToken` |
| **Mutation Functions** | verb | `create`, `delete`, `updateContent` |
| **Internal Functions** | `*Internal` suffix | `createInternal`, `getByIdInternal` |
| **Convex Files** | plural noun | `artifacts.ts`, `users.ts` |

## Decision Drivers (Priority Order)

1. **Consistency** - Same patterns across all backend code
2. **Readability** - Clear, self-documenting code
3. **TypeScript/JavaScript standards** - Follow community conventions
4. **Convex conventions** - Match Convex documentation patterns
5. **AI agent compatibility** - Clear naming helps AI understand context
6. **Index efficiency** - Names reflect query patterns

## Related Decisions

- [ADR 0007: Logging Strategy](./0007-logging-strategy.md) - Log topic naming
- [ADR 0011: Soft Delete Strategy](./0011-soft-delete-strategy.md) - `isDeleted` + `deletedAt` pattern

## Context

### The Problem

Without explicit backend naming conventions:
1. **Inconsistency** - Different patterns across Convex functions and schema
2. **Confusion** - Unclear CRUD operation naming (get vs fetch vs retrieve)
3. **Index inefficiency** - Index names don't reflect their fields
4. **Audit trail gaps** - Inconsistent timestamp and user tracking fields
5. **AI agent confusion** - Inconsistent patterns make AI-assisted development harder
6. **Code review friction** - Style debates distract from logic review

### Convex-Specific Considerations

**Convex Backend Requirements:**
- camelCase for function names in `convex/` directory
- Schema field names use camelCase
- Indexes must be named to understand their purpose
- Internal vs public function distinction via `internalQuery`/`internalMutation`
- Soft delete requires indexed `isDeleted` field (per ADR 0011)

## Decision

### Table Naming

**Convention: Plural camelCase**

Tables represent collections of entities, so use plural names. Multi-word tables use camelCase.

```typescript
// Good
defineSchema({
  users: defineTable({ ... }),
  artifacts: defineTable({ ... }),
  artifactVersions: defineTable({ ... }),     // Multi-word: camelCase
  artifactFiles: defineTable({ ... }),
  artifactReviewers: defineTable({ ... }),
  comments: defineTable({ ... }),
  commentReplies: defineTable({ ... }),       // Nested entity
})

// Bad
defineSchema({
  user: defineTable({ ... }),                 // Singular
  artifact_versions: defineTable({ ... }),    // snake_case
  ArtifactFiles: defineTable({ ... }),        // PascalCase
  comment_reply: defineTable({ ... }),        // snake_case + singular
})
```

### Schema Field Naming

**All fields: camelCase**

```typescript
// Good
artifacts: defineTable({
  title: v.string(),
  description: v.optional(v.string()),
  creatorId: v.id("users"),
  shareToken: v.string(),
  fileSize: v.number(),
})

// Bad
artifacts: defineTable({
  Title: v.string(),           // PascalCase
  file_size: v.number(),       // snake_case
  creator_id: v.id("users"),   // snake_case
})
```

### Audit Trail Fields

**Standard audit field set (per ADR 0011):**

| Field | Type | Purpose | Required? |
|-------|------|---------|-----------|
| `createdAt` | `v.number()` | Creation timestamp (ms) | Yes for all |
| `createdBy` | `v.optional(v.id("users"))` | Who triggered record creation | For audit trail |
| `updatedAt` | `v.number()` | Last modification timestamp | When tracking edits |
| `updatedBy` | `v.optional(v.id("users"))` | Who last modified | Rare - usually overkill |
| `isDeleted` | `v.boolean()` | Soft delete flag (for indexing) | Yes for soft-deletable |
| `deletedAt` | `v.optional(v.number())` | Deletion timestamp | Yes for soft-deletable |
| `deletedBy` | `v.optional(v.id("users"))` | Who deleted | Recommended for audit |
| `isUpdated` | `v.boolean()` | Has been updated after creation | When tracking user content changes |

```typescript
// Good - Standard soft-deletable entity
artifacts: defineTable({
  // ... business fields ...

  // Creation audit
  createdAt: v.number(),
  createdBy: v.optional(v.id("users")),  // Optional if inferred from context

  // Update audit (if tracking updates)
  updatedAt: v.number(),

  // Soft delete fields (ADR 0011)
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
})

// Good - Update tracking for user content
comments: defineTable({
  content: v.string(),
  isUpdated: v.boolean(),
  // ... other fields ...
})

// Bad - Inconsistent audit fields
artifacts: defineTable({
  created_at: v.number(),        // snake_case
  modified: v.number(),          // Use updatedAt
  deleted: v.boolean(),          // Use isDeleted
  deletionTime: v.number(),      // Use deletedAt
})
```

### Record Creator: `createdBy`

**Use `createdBy` for all tables.** This field answers one question: "Who initiated this record's creation?"

```typescript
// Good - createdBy for ALL tables
artifacts: defineTable({
  createdBy: v.id("users"),      // Who created this artifact
  title: v.string(),
  // ...
})
  .index("by_created_by", ["createdBy"])

artifactVersions: defineTable({
  createdBy: v.id("users"),      // Who created this version
  fileType: v.string(),
  // ...
})
  .index("by_created_by", ["createdBy"])

comments: defineTable({
  createdBy: v.id("users"),      // Who created this comment
  content: v.string(),
  // ...
})
  .index("by_created_by", ["createdBy"])

commentReplies: defineTable({
  createdBy: v.id("users"),      // Who created this reply
  content: v.string(),
  // ...
})
  .index("by_created_by", ["createdBy"])
```

**Why `createdBy`?**

1. **Pairs with `createdAt`** - Both describe the creation event
2. **Industry aligned** - Microsoft REST API Guidelines, Notion API, Django all use `created_by`/`createdBy`
3. **One field to remember** - No cognitive overhead deciding which variant to use
4. **Consistent indexes** - All tables use `by_created_by` pattern
5. **Future-proof** - If ownership transfer is needed later, add `ownerId` separately

**Industry Context:**

Research of major SaaS APIs shows most platforms use ONE field for "who made this":

| Platform | Field Used | Pattern |
|----------|-----------|---------|
| Notion API | `created_by` | Consistent across all resources |
| Microsoft REST | `createdBy` | Standard audit field |
| Django | `created_by` | Via auditing packages |
| GitHub API | `user` | Single field per resource |
| Slack API | `user` | Single field per resource |

**Permission Check Examples:**

```typescript
// All permission checks use the same field
if (artifact.createdBy === userId) { /* owner */ }
if (comment.createdBy === userId) { /* can edit */ }
if (version.createdBy === userId) { /* can delete */ }

// Consistent query pattern
const userArtifacts = await ctx.db
  .query("artifacts")
  .withIndex("by_created_by", q => q.eq("createdBy", userId))
  .collect();

const userComments = await ctx.db
  .query("comments")
  .withIndex("by_created_by", q => q.eq("createdBy", userId))
  .collect();
```

**Future Ownership Transfer:**

If/when we need to transfer ownership of artifacts:

```typescript
artifacts: defineTable({
  createdBy: v.id("users"),  // Immutable - original creator (audit)
  ownerId: v.id("users"),    // Mutable - current owner (permissions)
  // ...
})
```

Until then, `createdBy` serves as both audit trail AND permission check. YAGNI.

### Boolean Field Naming

**Convention: `is*` prefix for state flags**

```typescript
// Good
isDeleted: v.boolean(),
isUpdated: v.boolean(),
isAnonymous: v.boolean(),
resolved: v.boolean(),  // Exception: natural boolean concepts

// Bad
deleted: v.boolean(),    // Ambiguous - could be deletion timestamp
updated: v.boolean(),    // Use isUpdated
anonymous: v.boolean(),  // Use isAnonymous
```

**Exception:** Simple boolean concepts that read naturally without prefix:
- `resolved` (not `isResolved`) - "comment.resolved" reads naturally
- Domain-specific booleans where the name is unambiguous

### Foreign Key / Reference Naming

**Convention: `entityId` for references**

```typescript
// Good
artifacts: defineTable({
  creatorId: v.id("users"),      // Who created this
})

artifactVersions: defineTable({
  artifactId: v.id("artifacts"), // Parent artifact
  createdBy: v.id("users"),      // Who created this version
})

comments: defineTable({
  versionId: v.id("artifactVersions"),
  authorId: v.id("users"),       // Comment author
})

// Bad
artifacts: defineTable({
  creator: v.id("users"),        // Missing "Id" suffix
  user_id: v.id("users"),        // snake_case
  UserId: v.id("users"),         // PascalCase
})
```

### Property Name Redundancy

**Convention: Avoid repeating type context in property names**

The table name already provides context, so property names should not repeat it. This follows the principle of eliminating redundant information that adds noise without value.

```typescript
// Good - Table context is sufficient
artifactFiles: defineTable({
  path: v.string(),              // Not "filePath" - we're in artifactFiles
  size: v.number(),              // Not "fileSize" - context is clear
  name: v.string(),              // Not "fileName" - table implies it
  mimeType: v.string(),          // Domain term that adds meaning
  versionId: v.id("artifactVersions"),
})

artifactVersions: defineTable({
  number: v.number(),            // Not "versionNumber" - we're in artifactVersions
  artifactId: v.id("artifacts"), // FK keeps "Id" suffix - clarifies role
  name: v.optional(v.string()),  // Not "versionName"
})

// Bad - Redundant with table context
artifactFiles: defineTable({
  filePath: v.string(),          // "file" already in table name
  fileSize: v.number(),          // Redundant prefix
  fileName: v.string(),          // Redundant prefix
})

artifactVersions: defineTable({
  versionNumber: v.number(),     // "version" already in table name
  versionName: v.string(),       // Redundant prefix
})
```

**When redundancy IS acceptable:**

| Scenario | Example | Reason |
|----------|---------|--------|
| Foreign keys | `artifactId`, `versionId` | Role clarification - distinguishes from other IDs |
| Disambiguation | `sourcePath` vs `destinationPath` | Two properties of same type need distinction |
| Domain terms | `mimeType` not just `type` | Technical term that adds meaning |
| Cross-table clarity | `creatorId` not just `creator` | Consistent FK pattern across all tables |

```typescript
// Good - Redundancy serves a purpose
artifactFiles: defineTable({
  sourcePath: v.string(),        // Disambiguation: two paths
  destinationPath: v.string(),
  mimeType: v.string(),          // Domain term: "mime" adds meaning
  versionId: v.id("artifactVersions"),  // FK role clarification
})

// Also good - Simple names when context is sufficient
artifacts: defineTable({
  type: v.string(),              // Only one "type" field, context is clear
  status: v.string(),            // Generic enough, no qualifier needed
})
```

**Authoritative Sources:**

- [Google AIP-140](https://google.aip.dev/140) - Recommends avoiding redundant prefixes in field names
- Clean Code (Robert C. Martin), Chapter 2 - "Avoid Disinformation" and "Make Meaningful Distinctions"
- [Effective Go](https://go.dev/doc/effective_go#package-names) - Package name provides context for exported names
- [Swift API Design Guidelines](https://swift.org/documentation/api-design-guidelines/) - "Omit needless words"

### Index Naming

**Convention: `by_field` or `by_field1_and_field2`**

Follow the pattern from `convex-rules.md`: include all indexed fields in the name.

```typescript
// Good - Single field index
.index("by_creator", ["creatorId"])
.index("by_email", ["email"])
.index("by_share_token", ["shareToken"])

// Good - Multi-field index (include all fields)
.index("by_creator_and_is_deleted", ["creatorId", "isDeleted"])
.index("by_artifact_and_version", ["artifactId", "versionNumber"])
.index("by_version_and_path", ["versionId", "filePath"])
.index("by_artifact_and_email", ["artifactId", "email"])

// Good - Shorthand for soft-delete pattern
.index("by_creator_active", ["creatorId", "isDeleted"])  // "_active" implies isDeleted filter
.index("by_artifact_active", ["artifactId", "isDeleted"])

// Bad
.index("creator_index", ["creatorId"])     // Don't use "_index" suffix
.index("byCreator", ["creatorId"])          // Use snake_case for index names
.index("by_creator", ["creatorId", "isDeleted"])  // Missing second field in name!
.index("idx_creator", ["creatorId"])       // Don't use "idx_" prefix
```

**Special index pattern for soft-deletable entities:**

Use `_active` suffix as shorthand for `_and_is_deleted` when the index is used to filter out deleted items:

```typescript
// Pattern: by_[field]_active for filtering out deleted items
.index("by_creator_active", ["creatorId", "isDeleted"])
.index("by_artifact_active", ["artifactId", "isDeleted"])
.index("by_version_active", ["versionId", "isDeleted"])
.index("by_comment_active", ["commentId", "isDeleted"])
```

---

## Function Naming

**Naming Principles:**
1. **Resource context from file name:** The file name provides the resource context (`artifacts.ts`, `commentReplies.ts`), so functions are named by their action, not `resourceAction`.
2. **Keep functions generic:** Use `create`, `get`, `update`, `delete` - not `createArtifact`, `getReply`, etc.
3. **Delete naming:** Per ADR 0011, all deletes are soft deletes using `isDeleted` + `deletedAt` fields. The function is simply named `delete` (not `softDelete`) because:
   - Industry standard ([Google AIP-164](https://google.aip.dev/164)) uses `Delete` for soft delete operations
   - From the user's perspective, the resource *is* deleted (gone from view)
   - If hard delete is added later, use `purge` or `permanentlyDelete` for that privileged operation
   - The pattern `delete` + `undelete` + `purge` is well-established

### CRUD Operations Pattern

**Queries (read operations):**

| Pattern | Use Case | Example |
|---------|----------|---------|
| `get` | Get by ID (primary key) | `get({ id })` |
| `getBy*` | Get by other unique field | `getByShareToken({ shareToken })` |
| `getVersion` | Get related entity by ID | `getVersion({ versionId })` |
| `getVersionByNumber` | Get by compound key | `getVersionByNumber({ artifactId, versionNumber })` |
| `list` | List user's own resources | `list({})` |
| `list*` | List with filter | `listHtmlFiles({ versionId })` |
| `getLatestVersion` | Get computed resource | `getLatestVersion({ artifactId })` |

**Mutations (write operations):**

| Pattern | Use Case | Example |
|---------|----------|---------|
| `create` | Create new resource | `create({ title, content })` |
| `addVersion` | Add child to parent | `addVersion({ artifactId, content })` |
| `update*` | Update specific field(s) | `updateName({ name })`, `updateContent({ content })` |
| `updateVersionName` | Update child resource | `updateVersionName({ versionId, name })` |
| `delete` | Delete resource (soft delete per ADR 0011) | `delete({ id })` |
| `deleteVersion` | Delete child resource | `deleteVersion({ versionId })` |
| `toggle*` | Toggle boolean | `toggleResolved({ commentId })` |
| `remove*` | Remove/revoke access | `removeReviewer({ reviewerId })` |
| `invite*` | Create invitation | `inviteReviewer({ artifactId, email })` |
| `link*` | Link entities | `linkPendingInvitations({ userId, email })` |

```typescript
// Good - Clear CRUD patterns (resource context from file name)
// In artifacts.ts:
export const get = query({ ... });           // Get by ID
export const getByShareToken = query({ ... }); // Get by unique field
export const list = query({ ... });          // List user's resources
export const create = action({ ... });       // Create new
export const update = mutation({ ... });     // Update
export const delete = mutation({ ... });     // Delete (soft delete per ADR 0011)

// In commentReplies.ts:
export const create = action({ ... });       // Create reply (NOT createReply)
export const update = mutation({ ... });     // Update reply (NOT updateReply)
export const delete = mutation({ ... });     // Delete reply (NOT deleteReply)

// Bad - Don't include resource name in function
// In artifacts.ts:
export const createArtifact = action({ ... }); // Redundant - just use "create"
export const getArtifact = query({ ... });     // Redundant - just use "get"
export const deleteArtifact = mutation({ ... }); // Redundant - just use "delete"

// In commentReplies.ts:
export const createReply = action({ ... });  // Redundant - just use "create"
export const updateReply = mutation({ ... }); // Redundant - just use "update"

// Other anti-patterns:
export const fetchArtifact = query({ ... }); // "fetch" is frontend term
export const removeArtifact = mutation({ ... }); // Use "delete"
export const softDelete = mutation({ ... }); // Too verbose - just use "delete"
export const artifact = query({ ... });      // Not a verb
```

### Internal vs Public Functions

**Public functions:** Exported with `query`, `mutation`, `action`
- Part of the public API
- Directly callable from frontend
- Use clear, simple names

**Internal functions:** Exported with `internalQuery`, `internalMutation`, `internalAction`
- Only callable from other Convex functions
- Use `*Internal` suffix when there's a public counterpart

```typescript
// Good - Public/Internal pairs
// Public (for frontend)
export const get = query({ ... });
export const getByShareToken = query({ ... });
export const create = action({ ... });

// Internal (for actions to call)
export const getByIdInternal = internalQuery({ ... });
export const getByShareTokenInternal = internalQuery({ ... });
export const createInternal = internalMutation({ ... });

// Good - Internal-only (no public counterpart)
export const sendInvitationEmail = internalAction({ ... });
export const linkPendingInvitations = internalMutation({ ... });

// Bad
export const _get = internalQuery({ ... });        // Don't use underscore prefix
export const getPrivate = internalQuery({ ... });  // Use *Internal
export const internalGet = internalQuery({ ... }); // Suffix, not prefix
```

### Helper Functions (Non-Convex)

Regular TypeScript helper functions (not registered with Convex):

```typescript
// Good - Pure helper functions
function isValidEmail(email: string): boolean { ... }
function normalizeEmail(email: string): string { ... }
function softDeleteFields() {
  return {
    isDeleted: true,
    deletedAt: Date.now()
  };
}

// These are NOT exported as Convex functions
// They're just regular TypeScript helpers
```

---

## File Organization

**Convention: Resource-based files with related functions**

```
convex/
├── artifacts.ts       // Artifact CRUD + version operations
├── users.ts           // User CRUD
├── comments.ts        // Comment CRUD
├── commentReplies.ts  // Reply CRUD (separate for clarity)
├── sharing.ts         // Invitation/permission operations
├── http.ts            // HTTP route handlers
├── auth.ts            // Auth configuration
├── schema.ts          // Database schema
└── lib/
    ├── logger.ts          // Logging utilities
    ├── fileTypes.ts       // File type validation
    ├── mimeTypes.ts       // MIME type mapping
    └── commentPermissions.ts  // Permission helpers
```

**File naming rules:**
- Main resource files: plural noun (`artifacts.ts`, `users.ts`)
- Related operations: descriptive noun (`sharing.ts`)
- Utilities in `lib/`: descriptive camelCase (`fileTypes.ts`)

```typescript
// Good
convex/artifacts.ts        // contains get, create, addVersion, etc.
convex/users.ts            // contains get, list, create, etc.
convex/lib/validation.ts   // utilities

// Bad
convex/UploadArtifact.ts   // function files should be lowercase
convex/artifacts_helper.ts // snake_case
convex/artifact.ts         // use plural: artifacts
```

---

## Complete Schema Field Reference

Based on our established patterns:

```typescript
// Standard entity with all audit fields
tableNamePlural: defineTable({
  // ---- Business Fields ----
  title: v.string(),
  description: v.optional(v.string()),
  content: v.string(),
  fileSize: v.number(),
  mimeType: v.string(),

  // ---- Foreign Keys ----
  parentId: v.id("parentTable"),        // Reference to parent

  // ---- Creation Audit ----
  createdBy: v.id("users"),              // Who created this record (required)
  createdAt: v.number(),                 // When created: Unix timestamp (ms)

  // ---- Update Audit (if needed) ----
  updatedAt: v.number(),                 // Last modification time
  updatedBy: v.optional(v.id("users")), // Who last modified

  // ---- Update Tracking (for user content) ----
  isUpdated: v.boolean(),                // Has been updated after creation?

  // ---- Soft Delete (ADR 0011) ----
  isDeleted: v.boolean(),                // For index queries
  deletedAt: v.optional(v.number()),     // When deleted
  deletedBy: v.optional(v.id("users")),  // Who deleted

  // ---- Status/Resolution ----
  status: v.union(v.literal("pending"), v.literal("accepted")),
  resolved: v.boolean(),
  resolvedUpdatedBy: v.optional(v.id("users")),
  resolvedUpdatedAt: v.optional(v.number()),
})
  // ---- Indexes ----
  .index("by_parent", ["parentId"])
  .index("by_parent_active", ["parentId", "isDeleted"])
  .index("by_created_by", ["createdBy"])
  .index("by_created_by_active", ["createdBy", "isDeleted"])
```

---

## Anti-Patterns to Avoid

```typescript
// Table Naming
artifact: defineTable({ ... })           // Use plural: artifacts
Artifacts: defineTable({ ... })          // Use lowercase: artifacts
artifact_versions: defineTable({ ... }) // Use camelCase: artifactVersions

// Field Naming
created_at: v.number(),                  // Use createdAt
user_id: v.id("users"),                  // Use userId
isactive: v.boolean(),                   // Use isActive
CreatedAt: v.number(),                   // Use camelCase: createdAt

// Non-standard creator field names (always use createdBy)
comments: defineTable({
  authorId: v.id("users"),               // Use createdBy
  madeBy: v.id("users"),                 // Use createdBy
  writtenBy: v.id("users"),              // Use createdBy
  postedBy: v.id("users"),               // Use createdBy
})
artifacts: defineTable({
  creatorId: v.id("users"),              // Use createdBy
  ownerId: v.id("users"),                // Use createdBy (until ownership transfer is needed)
})
artifactVersions: defineTable({
  uploadedBy: v.id("users"),             // Use createdBy
  addedBy: v.id("users"),                // Use createdBy
})

// Property Name Redundancy - Table context already provides meaning
artifactFiles: defineTable({
  filePath: v.string(),                  // "file" in table name - use "path"
  fileSize: v.number(),                  // "file" in table name - use "size"
  fileName: v.string(),                  // "file" in table name - use "name"
})
artifactVersions: defineTable({
  versionNumber: v.number(),             // "version" in table name - use "number"
  versionName: v.string(),               // "version" in table name - use "name"
})

// Index Naming
.index("idx_creator", ["creatorId"])     // Use by_creator
.index("byCreator", ["creatorId"])       // Use snake_case: by_creator
.index("by_creator", ["creatorId", "isDeleted"]) // Missing second field!

// Function Naming - Don't include resource name
export const createArtifact = action({ ... })   // Redundant - just "create"
export const getArtifact = query({ ... })       // Redundant - just "get"
export const deleteArtifact = mutation({ ... }) // Redundant - just "delete"
export const createReply = action({ ... })      // Redundant - just "create"
export const updateReply = mutation({ ... })    // Redundant - just "update"

// Function Naming - Other issues
export const fetchArtifact = query({ ... })     // Use "get" not "fetch"
export const removeArtifact = mutation({ ... }) // Use "delete" not "remove"
export const softDelete = mutation({ ... })     // Too verbose - use "delete"
export const GetArtifact = query({ ... })       // Use camelCase: get
export const artifact_get = query({ ... })      // Use camelCase: get

// Internal Function Naming
export const _getArtifact = internalQuery({ ... }) // Use getInternal suffix
export const privateGet = internalQuery({ ... })   // Use *Internal suffix
export const internalGet = internalQuery({ ... })  // Suffix, not prefix
```

---

## Acronyms and Abbreviations

**Acronyms: Treat as words in camelCase**

```typescript
// Good
const htmlContent = '<div>...</div>';
const userId = 'abc123';
const apiEndpoint = '/api/users';
const mimeType = 'text/html';

// Bad
const HTMLContent = '<div>...</div>';  // looks like constant
const userID = 'abc123';               // inconsistent with userId
const API_ENDPOINT = '/api/users';     // UPPER_SNAKE_CASE is for constants only
```

---

## Consequences

### Positive

- **Consistent backend codebase** - Easy to navigate Convex functions
- **Self-documenting** - Names reveal intent without comments
- **AI-friendly** - Clear patterns help AI agents generate better code
- **Index efficiency** - Index names reflect query patterns
- **Audit trail consistency** - Standard fields across all tables
- **Code review efficiency** - No style debates, focus on logic
- **Convex best practices** - Aligned with official documentation

### Negative

- **Refactoring burden** - Existing code may need updates
- **Learning curve** - Team must internalize conventions
- **Linter setup** - Need ESLint rules to enforce automatically

### Neutral

- Some index naming (`_active` shorthand) is project-specific convention
- Soft delete pattern tightly coupled to ADR 0011

---

## Enforcement

### Linting (Future Enhancement)

Consider adding ESLint rules for the Convex directory:
```json
{
  "@typescript-eslint/naming-convention": [
    "error",
    {
      "selector": "variable",
      "format": ["camelCase", "UPPER_CASE"],
      "filter": {
        "regex": "^(convex/).*",
        "match": true
      }
    }
  ]
}
```

Potential custom linting rules:
- Index naming validation (all fields in name)
- Audit field presence on tables
- Internal function suffix validation

### Refactoring Approach

When modifying existing files:
1. Fix naming violations in new code immediately
2. Refactor existing code opportunistically (when touching files)
3. Avoid mass renames unless necessary (git history preservation)

### Quick Start Checklist

When writing Convex backend code, ask:
- [ ] Table names: plural camelCase?
- [ ] Schema fields: camelCase?
- [ ] Property names: no redundancy with table context? (`path` not `filePath` in `artifactFiles`)
- [ ] Audit fields: `createdAt`, `isDeleted`, `deletedAt`, etc.?
- [ ] Creator field: `createdBy` for who created this record?
- [ ] Booleans: `is*` prefix?
- [ ] Foreign keys: `entityId` pattern?
- [ ] Indexes: `by_field` and all fields in name?
- [ ] Functions: CRUD verb pattern (`create`, `get`, `delete` - NOT `createReply`, `getArtifact`)?
- [ ] Functions: No resource name in function (context from file name)?
- [ ] Internal functions: `*Internal` suffix?

---

## Alternatives Considered

### Alt 1: snake_case for Everything

**Approach:** Use Python/SQL-style snake_case for all backend code

**Rejected because:**
- Not TypeScript/JavaScript convention
- Conflicts with Convex documentation (uses camelCase)
- Poor ecosystem fit (most TypeScript backend libs use camelCase)

### Alt 2: PascalCase Table Names

**Approach:** Use PascalCase for table names like `Artifacts`, `ArtifactVersions`

**Rejected because:**
- Convex docs use lowercase/camelCase
- Creates confusion with TypeScript types
- Inconsistent with JavaScript object naming

### Alt 3: No Boolean Prefixes

**Approach:** Allow booleans without `is*` prefix

**Rejected because:**
- Reduces readability: `deleted` vs `isDeleted`
- Type ambiguity: `deleted` could be a timestamp
- JavaScript/TypeScript community standard uses prefixes

### Alt 4: Verbose Index Names

**Approach:** Use descriptive index names like `creator_deleted_status_index`

**Rejected because:**
- Too verbose
- `by_field` pattern is clear and concise
- Convex best practices use simpler names

### Alt 5: No Audit Field Standards

**Approach:** Let each table define its own audit pattern

**Rejected because:**
- Creates inconsistency across schema
- Harder to write generic audit queries
- AI agents struggle with inconsistent patterns

---

## References

### Convex Documentation
- [Convex Schema Design](https://docs.convex.dev/database/schemas)
- [Convex Functions](https://docs.convex.dev/functions)
- [Convex Indexes](https://docs.convex.dev/database/indexes)

### Internal Documentation
- [Convex Rules](../../architecture/convex-rules.md)
- [ADR 0011: Soft Delete Strategy](./0011-soft-delete-strategy.md)

### Community Standards
- [TypeScript Naming Conventions](https://typescript-eslint.io/rules/naming-convention/)
- [Convex Stack Templates](https://stack.convex.dev/)

---

## References & Industry Standards

This section documents industry research conducted to validate and contextualize our naming conventions.

### Google API Improvement Proposals (AIPs)

| AIP | Topic | Relevance to Our Conventions |
|-----|-------|------------------------------|
| [AIP-140](https://google.aip.dev/140) | Field Names | Supports avoiding redundant prefixes (`path` not `filePath`). Google uses snake_case; we use camelCase per TypeScript conventions. |
| [AIP-148](https://google.aip.dev/148) | Standard Fields | Defines `create_time`, `update_time`, `delete_time`. No author/creator distinction. |
| [AIP-164](https://google.aip.dev/164) | Soft Delete | Uses `delete_time` timestamp, not boolean flag. Our `isDeleted` + `deletedAt` pattern differs for index efficiency in Convex. |
| [AIP-203](https://google.aip.dev/203) | Field Behavior | Defines OUTPUT_ONLY for computed fields. No authorship guidance. |

**Key insight:** Google AIPs do not distinguish between `author` and `creator`. Our semantic distinction is project-specific.

### Major Framework Conventions

| Framework | Timestamp Fields | User Reference Fields | Notes |
|-----------|-----------------|----------------------|-------|
| **Rails/ActiveRecord** | `created_at`, `updated_at` | `user_id`, `author_id` (domain-specific) | snake_case, no formal author/creator distinction |
| **Django** | `created_at`, `modified_at` | `created_by`, `modified_by` | Uses `*_by` pattern for audit |
| **Laravel** | `created_at`, `updated_at` | `created_by`, `user_id` | Via auditing packages |

**Key insight:** Frameworks use snake_case and do not enforce author/creator distinction at the ORM level.

### REST API Guidelines

| Standard | Recommendation | Our Alignment |
|----------|---------------|---------------|
| **Microsoft REST API Guidelines** | `createdBy`, `lastModifiedBy` | Aligned on `*By` pattern |
| **Zalando API Guidelines** | `created_at`, `created_by` | Aligned on audit fields |
| **JSON:API** | No field naming prescription | N/A |

### Notable SaaS Platform APIs

#### GitHub API (v3 REST and v4 GraphQL)
- **Commits:** `author` and `committer` (the canonical author/committer distinction)
- **Comments:** `user` (NOT `author`)
- **Issues/PRs:** `user` for creator
- **Repositories:** `owner`

**Key insight:** GitHub only uses `author` for commits. Comments use `user`. This is more limited than our Git-inspired pattern.

**References:**
- [GitHub REST API - Commits](https://docs.github.com/en/rest/commits/commits)
- [GitHub REST API - Issue Comments](https://docs.github.com/en/rest/issues/comments)

#### Slack API
- **Messages:** `user` field for message author
- No `author` or `creator` terminology

**Reference:** [Slack API - Message Object](https://api.slack.com/types/message)

#### Notion API
- **All objects:** `created_by`, `last_edited_by` (nested user objects)
- Consistent `*_by` pattern across all resources

**Reference:** [Notion API - Working with Databases](https://developers.notion.com/docs/working-with-databases)

#### Linear API (GraphQL)
- **Issues:** `creator`, `assignee`
- No `author` field

**Reference:** [Linear API Documentation](https://developers.linear.app/docs/graphql/working-with-the-graphql-api)

#### Jira API
- **Issues:** `creator`, `reporter`
- **Comments:** `author`
- Closest to our semantic distinction (uses `author` for comments, `creator` for issues)

**Reference:** [Jira Cloud REST API - Issue Fields](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)

#### Stripe API
- No explicit creator fields
- Uses implicit context (authenticated user)
- Audit via event logs

**Reference:** [Stripe API Reference](https://stripe.com/docs/api)

### Field Name Pattern Summary

| Pattern | Used By | Our Usage |
|---------|---------|-----------|
| `user` | GitHub (comments), Slack | Not used |
| `author` / `authorId` | Jira (comments), GitHub (commits) | Not used (use `createdBy`) |
| `creator` / `creatorId` | Linear, Jira (issues) | Not used (use `createdBy`) |
| `created_by` / `createdBy` | Notion, Microsoft, Django | **All tables** |
| `owner` | GitHub (repos) | Not used (future: `ownerId` if needed) |

### Research Conclusion

Our choice of `createdBy` for all tables is **industry-aligned**:

1. **Matches Notion API** - uses `created_by` consistently
2. **Matches Microsoft REST API Guidelines** - uses `createdBy`
3. **Matches Django patterns** - uses `created_by` via auditing packages
4. **Simpler than alternatives** - one field to remember, consistent indexes

**Benefits:**
- (+) Industry-standard naming
- (+) One pattern for all tables
- (+) Pairs naturally with `createdAt`
- (+) Future-proof for ownership transfer (add `ownerId` later if needed)

---

## Field Length Guidelines

This section documents validated field length limits for all text fields in our schema, with industry research and rationale.

### Quick Reference

| Field Type | Limit | Location | Rationale |
|------------|-------|----------|-----------|
| User names | 100 chars | `users.updateName` | Industry standard range (50-100) |
| Artifact name | 100 chars | `artifacts.updateDetails` (Task 22) | Matches file name conventions |
| Artifact description | 500 chars | `artifacts.updateDetails` (Task 22) | Short-form description standard |
| Version names | 100 chars | `artifacts.updateVersionName` | Matches artifact name pattern |
| Comments | 10,000 chars | `comments.create` | Long-form collaborative content |
| Comment replies | 5,000 chars | `commentReplies.create` | Shorter than parent comments |

### Industry Standards Research

#### User Names / Display Names

| Platform | Limit | Notes |
|----------|-------|-------|
| Twitter/X | 50 chars | Display name |
| GitHub | 39 chars | Username (technical constraint) |
| Slack | 80 chars | Display name |
| Discord | 32 chars | Username |
| LinkedIn | 100 chars | Combined first + last name |
| Google | 100 chars | Account name |
| Microsoft | 64 chars | Display name |

**Our choice: 100 characters**
- Accommodates international names with multiple parts
- Matches Google/LinkedIn upper bound
- Allows for organization prefixes or suffixes
- Simple, memorable limit

#### Project/Resource Names

| Platform | Field | Limit | Notes |
|----------|-------|-------|-------|
| GitHub | Repository name | 100 chars | URL-safe constraint |
| Jira | Project name | 80 chars | |
| Notion | Page title | 250 chars | Very permissive |
| Asana | Project name | 255 chars | |
| Trello | Board name | 16,384 chars | Essentially unlimited |
| Figma | File name | 255 chars | Filesystem compatibility |
| Google Drive | File name | 255 chars | Filesystem compatibility |

**Our choice: 100 characters**
- Practical for UI display without truncation
- Matches GitHub repository convention
- Fits comfortably in browser tabs, email subjects
- Figma designs show character counter at 100

#### Description Fields

| Platform | Field | Limit | Notes |
|----------|-------|-------|-------|
| GitHub | Repository description | 350 chars | Short summary |
| GitHub | Issue body | 65,536 chars | Long-form |
| Jira | Description | 32,767 chars | Long-form |
| Notion | Page content | Unlimited | |
| Slack | Channel description | 250 chars | |
| Twitter/X | Post | 280 chars | Very short |
| LinkedIn | Post | 3,000 chars | Medium-form |

**Our choice: 500 characters**
- Short-form summary (like GitHub repo description, but more generous)
- Encourages concise, useful descriptions
- Fits in preview cards without excessive truncation
- Figma designs show character counter at 500
- Sufficient for 2-3 sentences of context

#### Comment/Message Content

| Platform | Field | Limit | Notes |
|----------|-------|-------|-------|
| GitHub | Comment | 65,536 chars | Very generous |
| Jira | Comment | 32,767 chars | |
| Slack | Message | 40,000 chars | |
| Discord | Message | 2,000 chars | Relatively short |
| Twitter/X | Reply | 280 chars | Very short |
| Linear | Comment | 10,000 chars | |
| Notion | Block | Unlimited | |

**Our choice: 10,000 chars (comments), 5,000 chars (replies)**
- Comments: Generous for detailed feedback with code snippets
- Replies: Shorter since replies are responses, not primary content
- Matches Linear's approach for similar use case
- Prevents abuse while allowing substantive discussion
- UTF-8 consideration: 10,000 chars = up to 40KB (acceptable)

### Technical Constraints

#### Database Considerations

Convex uses document storage with no VARCHAR limits, but we enforce limits for:

1. **Performance**: Large text fields slow down queries and indexing
2. **UI/UX**: Prevents rendering issues and poor user experience
3. **Security**: Prevents denial-of-service via excessive data
4. **Cost**: Convex charges by data stored and transferred

#### UTF-8 Multi-Byte Considerations

| Character Type | Bytes | Impact |
|----------------|-------|--------|
| ASCII (a-z, 0-9) | 1 byte | Standard |
| Accented Latin (e, u, n) | 2 bytes | Common in European names |
| CJK (Chinese, Japanese, Korean) | 3 bytes | Full character = 3 bytes |
| Emoji | 4 bytes | Single emoji = 4 bytes |

**Storage estimate for max limits:**
- User name (100 chars): up to 400 bytes
- Artifact name (100 chars): up to 400 bytes
- Artifact description (500 chars): up to 2KB
- Comment (10,000 chars): up to 40KB
- Reply (5,000 chars): up to 20KB

All limits are well within acceptable ranges for modern applications.

### UX/Usability Guidelines

#### Character Count Display Thresholds

Show character count when:
1. User is within 20% of limit (e.g., at 80/100)
2. Field is focused (always show for description/comment fields)
3. User exceeds limit (prevent submission, show error)

#### Input Type by Length

| Content Length | Recommended Input | Notes |
|----------------|-------------------|-------|
| < 50 chars | Single-line input | Simple text |
| 50-200 chars | Single-line with counter | Names, titles |
| 200-1000 chars | Textarea (auto-grow) | Descriptions |
| > 1000 chars | Textarea (fixed height, scrollable) | Comments |

#### Truncation Patterns

| Display Context | Max Display | Truncation |
|-----------------|-------------|------------|
| Browser tab title | 50 chars | Ellipsis |
| List/card view | 60-80 chars | Ellipsis |
| Full view | Full length | Scroll/expand |
| Email subject | 78 chars | RFC 5322 limit |

### Validation Implementation

All field length validation is enforced at the **backend mutation level**, not just the frontend:

```typescript
// Pattern for field validation
const trimmedName = args.name.trim();
if (!trimmedName) {
  throw new Error("Name cannot be empty");
}
if (trimmedName.length > 100) {
  throw new Error("Name too long (max 100 characters)");
}
```

**Centralized constants** are defined in `convex/lib/fileTypes.ts`:

```typescript
export const MAX_VERSION_NAME_LENGTH = 100;
// Add additional constants as needed:
// export const MAX_ARTIFACT_NAME_LENGTH = 100;
// export const MAX_ARTIFACT_DESCRIPTION_LENGTH = 500;
// export const MAX_COMMENT_LENGTH = 10000;
// export const MAX_REPLY_LENGTH = 5000;
```

### Recommendations for Task 22

The proposed limits in Task 22 design document are **validated and approved**:

| Field | Proposed Limit | Status | Notes |
|-------|----------------|--------|-------|
| Artifact name | 100 chars | **Approved** | Matches industry standards and Figma design |
| Artifact description | 500 chars | **Approved** | Good balance for short-form description |

**Implementation note**: Create centralized constants for these limits alongside `MAX_VERSION_NAME_LENGTH` in `convex/lib/fileTypes.ts`.

### Future Considerations

Fields that may need limits in the future:

| Field | Suggested Limit | Notes |
|-------|----------------|-------|
| Version tags | 50 chars each | If implementing tagging per ARTIFACT_SETTINGS.md |
| Email subject (invites) | 78 chars | RFC 5322 email subject limit |
| Share link custom slug | 50 chars | If implementing custom URLs |

### References

#### Formal Standards
- [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322) - Email format (78 char subject recommended)
- [W3C HTML5](https://html.spec.whatwg.org/multipage/input.html#attr-input-maxlength) - maxlength attribute specification
- [Unicode UTF-8](https://www.unicode.org/versions/Unicode15.0.0/) - Multi-byte encoding reference

#### Platform Documentation
- [GitHub API Limits](https://docs.github.com/en/rest/overview/resources-in-the-rest-api)
- [Slack Message Guidelines](https://api.slack.com/reference/surfaces/formatting)
- [Twitter Developer Docs](https://developer.twitter.com/en/docs/counting-characters)

#### UX Research
- [Nielsen Norman Group: Text Fields](https://www.nngroup.com/articles/form-design-placeholders/)
- [Material Design: Text Fields](https://material.io/components/text-fields)
- [Apple HIG: Text Input](https://developer.apple.com/design/human-interface-guidelines/text-fields)
