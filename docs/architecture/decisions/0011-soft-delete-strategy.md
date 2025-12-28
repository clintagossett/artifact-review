# ADR 0011: Soft Delete Strategy

**Status:** Accepted
**Date:** 2025-12-28
**Decision Maker:** Clint Gossett

## Context

We need a consistent soft delete pattern across all tables in the schema. The question is how to represent "deleted" state:

1. **Option A:** Two fields - `isDeleted: boolean` + `deletedAt: datetime | null`
2. **Option B:** Single field - `deletedAt: datetime | null` (null = not deleted)
3. **Option C:** Store date only, compute boolean in application layer

The DRY principle suggests avoiding redundant data, but we must also consider:
- Convex query constraints (indexes required, no `filter`)
- Query performance implications
- Data consistency risks
- Developer experience

### Current State

The schema already uses Option A:

```typescript
artifacts: defineTable({
  // ...
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
  .index("by_creator_active", ["creatorId", "isDeleted"])
```

## Decision

**Use Option A: `isDeleted: boolean` + `deletedAt: v.optional(v.number())`**

While this appears to violate DRY, it is the correct choice for Convex due to index requirements.

### Schema Pattern

```typescript
// Standard soft delete fields
isDeleted: v.boolean(),            // For indexing/filtering
deletedAt: v.optional(v.number()), // For audit trail (undefined when not deleted)

// Standard index pattern
.index("by_[field]_active", ["[field]", "isDeleted"])
```

### Why Not Option B (Date-Only)?

**Convex indexes do not support null comparisons effectively.**

With `deletedAt: v.optional(v.number())`:

```typescript
// PROBLEM: This requires filter, which is prohibited
ctx.db.query("artifacts")
  .withIndex("by_creator", q => q.eq("creatorId", userId))
  .filter(q => q.eq(q.field("deletedAt"), undefined))  // BAD - no filter allowed

// PROBLEM: Cannot do "where deletedAt is null" with index
ctx.db.query("artifacts")
  .withIndex("by_creator_deletedAt", q =>
    q.eq("creatorId", userId)
     .eq("deletedAt", undefined)  // Index equality on undefined is unreliable
  )
```

**The boolean field enables clean index queries:**

```typescript
// CORRECT: Boolean in index allows clean filtering
ctx.db.query("artifacts")
  .withIndex("by_creator_active", q =>
    q.eq("creatorId", userId)
     .eq("isDeleted", false)
  )
```

### Why Not Option C (Computed Boolean)?

Computing `isDeleted` from `deletedAt !== undefined` would work at the application layer, but:

1. **Cannot index computed values** - Convex indexes are on stored fields only
2. **Every query needs post-filtering** - Performance penalty at scale
3. **Violates Convex best practices** - "Do NOT use `filter` in queries"

### Addressing DRY Concerns

The redundancy is **intentional and justified**:

| Field | Purpose | When Set |
|-------|---------|----------|
| `isDeleted` | Index optimization, fast filtering | On delete |
| `deletedAt` | Audit trail, restoration decisions | On delete |

**Consistency is enforced at the mutation layer:**

```typescript
// Soft delete mutation
export const softDelete = mutation({
  args: { id: v.id("artifacts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });
    return null;
  },
});

// Restore mutation
export const restore = mutation({
  args: { id: v.id("artifacts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isDeleted: false,
      deletedAt: undefined,
    });
    return null;
  },
});
```

**Helper function for consistency:**

```typescript
// convex/lib/softDelete.ts
export function softDeleteFields() {
  return {
    isDeleted: true,
    deletedAt: Date.now(),
  };
}

export function restoreFields() {
  return {
    isDeleted: false,
    deletedAt: undefined,
  };
}
```

## Alternatives Considered

### Option B: `deletedAt` Only

**Pros:**
- Single source of truth (DRY)
- No risk of `isDeleted` and `deletedAt` being out of sync

**Cons:**
- Cannot efficiently query "not deleted" items in Convex
- Would require `filter()` which is prohibited
- Performance degrades as table grows

**Verdict:** Rejected due to Convex index limitations.

### Option C: Application-Layer Computed Boolean

**Pros:**
- Single source of truth in database
- Boolean available when needed

**Cons:**
- Cannot use for index-based filtering
- Every query must load all records, then filter
- Violates Convex query guidelines

**Verdict:** Rejected due to query performance implications.

### Discriminated Union Approach

An alternative structure using Convex's union types:

```typescript
v.union(
  v.object({ status: v.literal("active"), /* ... */ }),
  v.object({ status: v.literal("deleted"), deletedAt: v.number(), /* ... */ })
)
```

**Pros:**
- Type-safe, impossible to have inconsistent state
- `status` can be indexed

**Cons:**
- More complex schema
- All fields must be duplicated in both union branches
- Overkill for simple soft delete

**Verdict:** Considered but rejected as overly complex for this use case.

## Consequences

### Positive

- Fast queries via index on `isDeleted` boolean
- Audit trail preserved via `deletedAt` timestamp
- Follows Convex best practices (no `filter`)
- Pattern already established in schema

### Negative

- Two fields store logically related information (mild DRY violation)
- Mutation layer must ensure consistency
- Developers must remember to set both fields

### Mitigations

- **Helper functions** enforce consistent updates
- **Code review** catches inconsistent mutations
- **Tests** verify both fields are set together

## Implementation Notes

### Index Naming Convention

Use `by_[primaryField]_active` pattern:

```typescript
.index("by_creator_active", ["creatorId", "isDeleted"])
.index("by_artifact_active", ["artifactId", "isDeleted"])
.index("by_version_active", ["versionId", "isDeleted"])
```

### Query Pattern

```typescript
// Standard pattern for fetching non-deleted items
const activeArtifacts = await ctx.db
  .query("artifacts")
  .withIndex("by_creator_active", q =>
    q.eq("creatorId", userId)
     .eq("isDeleted", false)
  )
  .collect();
```

### When to Show Deleted Items

```typescript
// Admin view: all items including deleted
const allArtifacts = await ctx.db
  .query("artifacts")
  .withIndex("by_creator", q => q.eq("creatorId", userId))
  .collect();

// Filter to deleted only (for trash/restore UI)
const deletedArtifacts = await ctx.db
  .query("artifacts")
  .withIndex("by_creator_active", q =>
    q.eq("creatorId", userId)
     .eq("isDeleted", true)
  )
  .collect();
```

## References

- [Convex Query Guidelines](https://docs.convex.dev/database/reading-data) - "Use indexes for filtering"
- [ADR 0009](./0009-artifact-file-storage-structure.md) - Artifact storage structure (uses this pattern)
- [Convex Rules](../convex-rules.md) - "Do NOT use `filter` in queries"
