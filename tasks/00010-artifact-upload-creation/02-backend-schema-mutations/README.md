# Subtask 02: Backend Schema & Mutations

**Status:** Pending
**Estimated Effort:** 3-4 hours
**Owner:** TBD
**Prerequisites:** Subtask 01 (Architecture Decisions) must be complete

## Purpose

Implement Convex backend for artifact storage, retrieval, and management.

## Scope

### Schema Definition
Update `convex/schema.ts` with `artifacts` table (per architecture decisions).

### Mutations to Implement

#### 1. `createArtifact`
```typescript
// convex/artifacts.ts
export const createArtifact = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    htmlContent: v.string(),
  },
  returns: v.object({
    artifactId: v.id("artifacts"),
    shareToken: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Validate user is authenticated
    // 2. Sanitize HTML content
    // 3. Generate unique share token
    // 4. Validate file size
    // 5. Insert artifact document
    // 6. Return artifact ID and share token
  },
});
```

#### 2. `updateArtifact`
```typescript
export const updateArtifact = mutation({
  args: {
    artifactId: v.id("artifacts"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    htmlContent: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Validate ownership
    // 2. Sanitize new HTML if provided
    // 3. Update artifact
    // 4. Update `updatedAt` timestamp
  },
});
```

#### 3. `deleteArtifact`
```typescript
export const deleteArtifact = mutation({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Validate ownership
    // 2. Delete artifact document
    // 3. (Future: cascade delete comments, etc.)
  },
});
```

### Queries to Implement

#### 1. `listUserArtifacts`
```typescript
export const listUserArtifacts = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("artifacts"),
    title: v.string(),
    description: v.optional(v.string()),
    shareToken: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.union(v.literal("draft"), v.literal("published")),
  })),
  handler: async (ctx) => {
    // 1. Get authenticated user
    // 2. Query artifacts by creatorId using index
    // 3. Return metadata (NOT full HTML content)
    // 4. Sort by updatedAt DESC
  },
});
```

#### 2. `getArtifact`
```typescript
export const getArtifact = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      title: v.string(),
      description: v.optional(v.string()),
      htmlContent: v.string(),
      shareToken: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      status: v.union(v.literal("draft"), v.literal("published")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // 1. Get artifact by ID
    // 2. Validate ownership (only owner can access via ID)
    // 3. Return full artifact including HTML content
  },
});
```

#### 3. `getArtifactByShareToken`
```typescript
export const getArtifactByShareToken = query({
  args: {
    shareToken: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      title: v.string(),
      description: v.optional(v.string()),
      htmlContent: v.string(),
      createdAt: v.number(),
      // Note: NOT returning shareToken to prevent enumeration
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // 1. Query by shareToken using index
    // 2. NO auth required (public access)
    // 3. Return artifact for rendering
    // 4. (Future: track views/analytics)
  },
});
```

### Utility Functions

#### `sanitizeHtml`
```typescript
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    // Configure per architecture decisions
    ALLOWED_TAGS: [...],
    ALLOWED_ATTR: [...],
  });
};
```

#### `generateShareToken`
```typescript
import { nanoid } from 'nanoid';

export const generateShareToken = (): string => {
  return nanoid(8); // 8-char alphanumeric
};
```

#### `ensureUniqueShareToken`
```typescript
const ensureUniqueShareToken = async (ctx): Promise<string> => {
  let token = generateShareToken();
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  while (attempts < MAX_ATTEMPTS) {
    const existing = await ctx.db
      .query("artifacts")
      .withIndex("by_share_token", (q) => q.eq("shareToken", token))
      .first();

    if (!existing) return token;

    token = generateShareToken();
    attempts++;
  }

  throw new Error("Failed to generate unique share token");
};
```

## Security Checklist

- [ ] All mutations require authentication (except public queries)
- [ ] Ownership validation before update/delete operations
- [ ] HTML sanitization on all uploads
- [ ] File size validation enforced
- [ ] Share tokens are cryptographically random (not sequential)
- [ ] Rate limiting considered (future enhancement)

## Testing Requirements

Create backend tests in `tasks/00010-artifact-upload-creation/tests/backend/`:

### Test Files
1. **`artifacts.test.ts`** - Mutation and query tests
   - Test `createArtifact` with valid/invalid input
   - Test HTML sanitization removes dangerous tags
   - Test file size validation
   - Test share token uniqueness
   - Test ownership validation
   - Test query filtering by user

2. **`security.test.ts`** - Security boundary tests
   - Test XSS prevention (script tags stripped)
   - Test event handler removal
   - Test file size limit enforcement
   - Test unauthorized access prevention

## Acceptance Criteria

- [ ] Schema deployed to Convex
- [ ] All mutations implemented with validators
- [ ] All queries implemented with validators
- [ ] HTML sanitization working (tested with malicious HTML)
- [ ] Share token generation unique
- [ ] Ownership validation enforced
- [ ] Backend tests pass
- [ ] No console errors in Convex logs

## Implementation Notes

### Follow Convex Rules
**CRITICAL:** Read `docs/architecture/convex-rules.md` before implementation.

Key reminders:
- Use new function syntax: `args`, `returns`, `handler`
- Always include return validators (use `v.null()` for void)
- Use indexes for queries (NOT filter)
- Mutations cannot call other mutations (use helpers)

### Logging
Use structured logging per `docs/development/logging-guide.md`:

```typescript
import { createLogger, Topics } from './lib/logger';
const log = createLogger('artifacts.createArtifact');

log.info(Topics.Artifacts, 'Artifact created', {
  artifactId,
  creatorId: userId,
  size: htmlContent.length,
});
```

---

**Next:** Subtask 03 (Frontend Upload UI)
