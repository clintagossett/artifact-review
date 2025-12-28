# Subtask 2.1: Schema Design

**Parent:** Phase 2 - Build Backend
**Status:** Not Started

---

## Objective

Design Convex schema for `comments` and `textEdits` tables with proper indexes and relationships.

---

## Deliverables

- [ ] ADR documenting schema design decisions
- [ ] `convex/schema.ts` updated with new tables
- [ ] Indexes defined for efficient queries
- [ ] Foreign key relationships documented

---

## Schema Design

### Comments Table

```typescript
comments: defineTable({
  artifactVersionId: v.id("artifactVersions"),
  authorId: v.id("users"),
  content: v.string(),
  resolved: v.boolean(),
  parentCommentId: v.optional(v.id("comments")), // For replies

  // Target info
  targetType: v.union(v.literal("text"), v.literal("element")),
  highlightedText: v.optional(v.string()),
  elementType: v.optional(v.string()),
  elementId: v.optional(v.string()),
  elementPreview: v.optional(v.string()),
  page: v.optional(v.string()),
})
  .index("by_version", ["artifactVersionId"])
  .index("by_author", ["authorId"])
  .index("by_parent", ["parentCommentId"])
```

### Text Edits Table

```typescript
textEdits: defineTable({
  artifactVersionId: v.id("artifactVersionId"),
  authorId: v.id("users"),
  type: v.union(v.literal("replace"), v.literal("delete")),
  originalText: v.string(),
  newText: v.optional(v.string()),
  comment: v.string(),
  status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
  page: v.optional(v.string()),
})
  .index("by_version", ["artifactVersionId"])
  .index("by_author", ["authorId"])
  .index("by_status", ["status"])
```

---

## Key Decisions to Document

1. **Why store `highlightedText` vs text position?**
   - Rationale: HTML can change between versions

2. **Why `elementId` vs DOM path?**
   - Rationale: More stable than DOM selectors

3. **Why separate `textEdits` table?**
   - Rationale: Different lifecycle than comments

4. **Index strategy**
   - Why these specific indexes?
   - Query patterns to optimize

---

## ADR Template

Use ADR template from `docs/architecture/decisions/_index.md`

**Title:** `00XX-comments-schema.md`

**Sections:**
- Context
- Decision
- Consequences
- Alternatives Considered

---

## References

- **Convex Rules:** `docs/architecture/convex-rules.md` (required reading)
- **Existing Schema:** `convex/schema.ts`
- **ADR Index:** `docs/architecture/decisions/_index.md`
