# Subtask 2.1: Schema Design

**Parent:** Phase 2 - Build Backend
**Status:** Not Started

---

## Objective

Design Convex schema for `comments` table with proper indexes and relationships for commenting on text and elements.

**SCOPE:** Comments only - no text editing suggestions.

---

## Deliverables

- [ ] ADR documenting schema design decisions
- [ ] `convex/schema.ts` updated with comments table
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

  // Target info (what the comment is attached to)
  targetType: v.union(v.literal("text"), v.literal("element")),

  // For text comments
  highlightedText: v.optional(v.string()),

  // For element comments (button, heading, image, etc.)
  elementType: v.optional(v.string()),  // e.g., "button", "heading", "image"
  elementId: v.optional(v.string()),    // DOM element ID
  elementPreview: v.optional(v.string()), // Text preview of the element

  // Page identifier (for multi-page artifacts)
  page: v.optional(v.string()),
})
  .index("by_version", ["artifactVersionId"])
  .index("by_author", ["authorId"])
  .index("by_parent", ["parentCommentId"])
```

---

## Key Decisions to Document

1. **Why store `highlightedText` vs text position?**
   - Rationale: HTML can change between versions, text content is more stable

2. **Why `elementId` vs DOM path?**
   - Rationale: More stable than DOM selectors

3. **Why single `targetType` union vs separate tables?**
   - Rationale: Comments on text and elements have similar properties and lifecycle

4. **Index strategy**
   - Why these specific indexes?
   - Query patterns to optimize (fetch by version, author, parent for replies)

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
