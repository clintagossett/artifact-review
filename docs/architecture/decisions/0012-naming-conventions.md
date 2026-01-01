# ADR 0012: Backend Naming Conventions

**Status:** Accepted
**Date:** 2025-12-31
**Decision Maker:** Clint Gossett

## TL;DR

Establish consistent naming conventions for Convex backend code including function names, schema fields, table names, and indexes. Use camelCase for fields/functions, plural camelCase for tables, snake_case for indexes, and standardized CRUD patterns.

## Quick Reference

| Item | Convention | Example |
|------|-----------|---------|
| **Table Names** | Plural camelCase | `artifacts`, `artifactVersions` |
| **Schema Fields** | camelCase | `createdAt`, `shareToken` |
| **Audit Timestamps** | `*At` suffix | `createdAt`, `deletedAt` |
| **Audit User Refs** | `*By` suffix | `createdBy`, `deletedBy` |
| **Boolean Fields** | `is*` prefix | `isDeleted`, `isUpdated` |
| **Foreign Keys** | `entityId` | `artifactId`, `creatorId` |
| **Index Names** | `by_field` (snake_case) | `by_creator`, `by_artifact_active` |
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
| `createdBy` | `v.optional(v.id("users"))` | Who created | When authorship matters |
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
  creatorId: v.id("users"),             // Owner/creator
  authorId: v.id("users"),              // Author (for content)

  // ---- Creation Audit ----
  createdAt: v.number(),                 // Required: Unix timestamp (ms)
  createdBy: v.optional(v.id("users")), // Optional: Who created

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
  .index("by_creator", ["creatorId"])
  .index("by_creator_active", ["creatorId", "isDeleted"])
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
- [ ] Audit fields: `createdAt`, `isDeleted`, `deletedAt`, etc.?
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
