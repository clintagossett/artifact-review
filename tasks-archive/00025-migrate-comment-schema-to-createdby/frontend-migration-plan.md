# Frontend Migration Plan: authorId to createdBy

**Task:** 00025 - Migrate comment and commentReply schema from authorId to createdBy
**Date:** 2026-01-03
**Scope:** Frontend (React/TypeScript) only - backend already migrated

---

## Summary

This document details every frontend change required to complete the migration from `authorId` to `createdBy` for comments and comment replies. The backend migration is complete - schema, Convex functions, and backend tests all now use `createdBy`.

### Key Insight: Backend Returns `createdBy`, Frontend Expects `authorId`

The core issue is a **field name mismatch**:

| Layer | Field Name | Status |
|-------|------------|--------|
| Convex Schema | `createdBy` | Migrated |
| Convex Query Returns | `createdBy` | Migrated |
| Frontend Types | `authorId` | **Needs Update** |
| Frontend Components | `authorId` | **Needs Update** |

The backend returns comments and replies with `createdBy`, but the frontend:
1. Maps `createdBy` back to `authorId` in the transformation layer
2. Uses `authorId` in types, props, and component logic

This creates fragile, confusing code that should be unified.

---

## Files Requiring Changes

### 1. Types Definition: `app/src/components/comments/types.ts`

**File Path:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/comments/types.ts`

**Current Code (line 18):**
```typescript
export interface Comment {
  id: string;
  versionId: string;
  authorId?: string; // For permission checks (optional for mock comments)
  author: Author;
  content: string;
  timestamp: string;
  resolved: boolean;
  replies: Reply[];
  // ... other fields
}
```

**Required Changes:**

| Line | Current | New |
|------|---------|-----|
| 18 | `authorId?: string;` | `createdBy?: string;` |
| 18 (comment) | `// For permission checks (optional for mock comments)` | `// For permission checks (creator ID from backend)` |

**Add to Reply interface (if needed for permission checks):**
```typescript
export interface Reply {
  id: string;
  createdBy?: string; // For permission checks (creator ID)
  author: Author;
  content: string;
  timestamp: string;
}
```

---

### 2. Document Viewer: `app/src/components/artifact/DocumentViewer.tsx`

**File Path:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/artifact/DocumentViewer.tsx`

#### Change 1: Helper Function Parameter Names (lines 117-126)

**Current Code:**
```typescript
// Check if user can delete a comment (author or owner)
const canDeleteComment = (authorId: string) => {
  if (!currentUserId) return false;
  return currentUserId === authorId || currentUserId === artifactOwnerId;
};

// Check if user can edit a comment (only author)
const canEditComment = (authorId: string) => {
  if (!currentUserId) return false;
  return currentUserId === authorId;
};
```

**New Code:**
```typescript
// Check if user can delete a comment (creator or owner)
const canDeleteComment = (createdBy: string) => {
  if (!currentUserId) return false;
  return currentUserId === createdBy || currentUserId === artifactOwnerId;
};

// Check if user can edit a comment (only creator)
const canEditComment = (createdBy: string) => {
  if (!currentUserId) return false;
  return currentUserId === createdBy;
};
```

#### Change 2: Comment Transformation (lines 134-153)

**Current Code (line 138):**
```typescript
const transformedComments: Comment[] = backendComments.map((bc) => ({
  id: bc._id,
  versionId: bc.versionId,
  authorId: bc.authorId, // Keep authorId for permission checks
  author: {
    name: bc.author.name || 'Anonymous',
    avatar: (bc.author.name || 'A').substring(0, 2).toUpperCase(),
  },
  // ... rest of transformation
}));
```

**New Code:**
```typescript
const transformedComments: Comment[] = backendComments.map((bc) => ({
  id: bc._id,
  versionId: bc.versionId,
  createdBy: bc.createdBy, // Creator ID for permission checks
  author: {
    name: bc.author.name || 'Anonymous',
    avatar: (bc.author.name || 'A').substring(0, 2).toUpperCase(),
  },
  // ... rest of transformation
}));
```

**Summary of Changes:**

| Line | Current | New | Description |
|------|---------|-----|-------------|
| 117 | `const canDeleteComment = (authorId: string)` | `const canDeleteComment = (createdBy: string)` | Function parameter |
| 119 | `currentUserId === authorId` | `currentUserId === createdBy` | Variable usage |
| 123 | `const canEditComment = (authorId: string)` | `const canEditComment = (createdBy: string)` | Function parameter |
| 125 | `currentUserId === authorId` | `currentUserId === createdBy` | Variable usage |
| 138 | `authorId: bc.authorId` | `createdBy: bc.createdBy` | Property mapping |
| 138 (comment) | `// Keep authorId for permission checks` | `// Creator ID for permission checks` | Comment update |

---

### 3. Comment Card: `app/src/components/artifact/CommentCard.tsx`

**File Path:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/components/artifact/CommentCard.tsx`

#### Change 1: Reply Transformation (lines 76-85)

**Current Code:**
```typescript
const replies = backendReplies?.map((br) => ({
  id: br._id,
  authorId: br.authorId,
  author: {
    name: br.author.name || 'Anonymous',
    avatar: (br.author.name || 'A').substring(0, 2).toUpperCase(),
  },
  content: br.content,
  timestamp: new Date(br.createdAt).toLocaleString(),
})) || [];
```

**New Code:**
```typescript
const replies = backendReplies?.map((br) => ({
  id: br._id,
  createdBy: br.createdBy,
  author: {
    name: br.author.name || 'Anonymous',
    avatar: (br.author.name || 'A').substring(0, 2).toUpperCase(),
  },
  content: br.content,
  timestamp: new Date(br.createdAt).toLocaleString(),
})) || [];
```

#### Change 2: Permission Check Functions (lines 87-105)

**Current Code:**
```typescript
const canEditComment = (authorId: string) => {
  if (!currentUserId) return false;
  return currentUserId === authorId;
};

const canDeleteComment = (authorId: string) => {
  if (!currentUserId) return false;
  return currentUserId === authorId || currentUserId === artifactOwnerId;
};

const canEditReply = (authorId: Id<"users">) => {
  if (!currentUserId) return false;
  return currentUserId === authorId;
};

const canDeleteReply = (authorId: Id<"users">) => {
  if (!currentUserId) return false;
  return currentUserId === authorId || currentUserId === artifactOwnerId;
};
```

**New Code:**
```typescript
const canEditComment = (createdBy: string) => {
  if (!currentUserId) return false;
  return currentUserId === createdBy;
};

const canDeleteComment = (createdBy: string) => {
  if (!currentUserId) return false;
  return currentUserId === createdBy || currentUserId === artifactOwnerId;
};

const canEditReply = (createdBy: Id<"users">) => {
  if (!currentUserId) return false;
  return currentUserId === createdBy;
};

const canDeleteReply = (createdBy: Id<"users">) => {
  if (!currentUserId) return false;
  return currentUserId === createdBy || currentUserId === artifactOwnerId;
};
```

#### Change 3: Reply Permission Usage (lines 292, 305)

**Current Code:**
```typescript
{canEditReply(reply.authorId) && (
  // Edit button
)}
{canDeleteReply(reply.authorId) && (
  // Delete button
)}
```

**New Code:**
```typescript
{canEditReply(reply.createdBy) && (
  // Edit button
)}
{canDeleteReply(reply.createdBy) && (
  // Delete button
)}
```

#### Change 4: Comment Permission Usage (lines 374, 389)

**Current Code:**
```typescript
{comment.authorId && canEditComment(comment.authorId) && (
  // Edit button
)}
{comment.authorId && canDeleteComment(comment.authorId) && (
  // Delete button
)}
```

**New Code:**
```typescript
{comment.createdBy && canEditComment(comment.createdBy) && (
  // Edit button
)}
{comment.createdBy && canDeleteComment(comment.createdBy) && (
  // Delete button
)}
```

**Summary of All Changes:**

| Line | Current | New | Description |
|------|---------|-----|-------------|
| 78 | `authorId: br.authorId` | `createdBy: br.createdBy` | Reply transformation |
| 87 | `const canEditComment = (authorId: string)` | `const canEditComment = (createdBy: string)` | Function param |
| 89 | `currentUserId === authorId` | `currentUserId === createdBy` | Variable usage |
| 92 | `const canDeleteComment = (authorId: string)` | `const canDeleteComment = (createdBy: string)` | Function param |
| 94 | `currentUserId === authorId` | `currentUserId === createdBy` | Variable usage |
| 97 | `const canEditReply = (authorId: Id<"users">)` | `const canEditReply = (createdBy: Id<"users">)` | Function param |
| 99 | `currentUserId === authorId` | `currentUserId === createdBy` | Variable usage |
| 102 | `const canDeleteReply = (authorId: Id<"users">)` | `const canDeleteReply = (createdBy: Id<"users">)` | Function param |
| 104 | `currentUserId === authorId` | `currentUserId === createdBy` | Variable usage |
| 292 | `canEditReply(reply.authorId)` | `canEditReply(reply.createdBy)` | Permission check |
| 305 | `canDeleteReply(reply.authorId)` | `canDeleteReply(reply.createdBy)` | Permission check |
| 374 | `comment.authorId && canEditComment(comment.authorId)` | `comment.createdBy && canEditComment(comment.createdBy)` | Permission check |
| 389 | `comment.authorId && canDeleteComment(comment.authorId)` | `comment.createdBy && canDeleteComment(comment.createdBy)` | Permission check |

---

## Files NOT Requiring Changes

### Hooks (No Changes Needed)

These hooks do not reference `authorId` directly - they just pass through to Convex:

1. **`app/src/hooks/useComments.ts`** - Returns raw Convex data (already has `createdBy`)
2. **`app/src/hooks/useCommentReplies.ts`** - Returns raw Convex data (already has `createdBy`)
3. **`app/src/hooks/useCommentActions.ts`** - Mutation wrappers, no field references
4. **`app/src/hooks/useReplyActions.ts`** - Mutation wrappers, no field references

### Backend Files (Already Migrated)

These were updated in the backend migration:

1. `app/convex/schema.ts`
2. `app/convex/comments.ts`
3. `app/convex/commentReplies.ts`
4. `app/convex/lib/commentPermissions.ts`
5. `app/convex/__tests__/comments.test.ts`

---

## Important Note: `author` Object Unchanged

The backend enrichment still returns an `author` object with display information:

```typescript
// Backend returns:
{
  createdBy: Id<"users">,  // ID field (CHANGED from authorId)
  author: {                 // Display object (UNCHANGED)
    name: string | undefined,
    email: string | undefined,
  },
  // ... other fields
}
```

The `author` object is intentionally named differently from `createdBy` because:
- `createdBy` is the raw user ID for permission checks
- `author` is the enriched display information (name, avatar initials)

This distinction is correct and follows the pattern in ADR 12.

---

## Unit Testing Strategy

### Pre-Migration Tests (Write These BEFORE Making Changes)

These tests verify current behavior works and will catch regressions:

#### 1. Type Safety Tests

Create file: `tasks/00025-migrate-comment-schema-to-createdby/tests/unit/types.test.ts`

```typescript
/**
 * Type safety tests to verify Comment and Reply types
 * Run BEFORE migration to ensure we understand current shape
 * Run AFTER migration to verify new shape works
 */
import { Comment, Reply } from '@/components/comments/types';

describe('Comment type shape', () => {
  it('should accept createdBy field after migration', () => {
    const comment: Comment = {
      id: 'test-id',
      versionId: 'version-id',
      createdBy: 'user-id', // After migration
      author: { name: 'Test User', avatar: 'TU' },
      content: 'Test comment',
      timestamp: '2026-01-03',
      resolved: false,
      replies: [],
    };
    expect(comment.createdBy).toBe('user-id');
  });
});
```

#### 2. Permission Logic Tests

Create file: `tasks/00025-migrate-comment-schema-to-createdby/tests/unit/permissions.test.ts`

```typescript
/**
 * Permission logic tests for comment/reply edit/delete
 * These test the pure logic functions independent of React
 */

describe('Comment Permission Logic', () => {
  const artifactOwnerId = 'owner-123';
  const currentUserId = 'user-456';
  const otherUserId = 'user-789';

  describe('canEditComment', () => {
    const canEditComment = (createdBy: string, currentUser: string | undefined) => {
      if (!currentUser) return false;
      return currentUser === createdBy;
    };

    it('should allow creator to edit their own comment', () => {
      expect(canEditComment(currentUserId, currentUserId)).toBe(true);
    });

    it('should not allow other users to edit', () => {
      expect(canEditComment(otherUserId, currentUserId)).toBe(false);
    });

    it('should not allow unauthenticated users to edit', () => {
      expect(canEditComment(currentUserId, undefined)).toBe(false);
    });
  });

  describe('canDeleteComment', () => {
    const canDeleteComment = (
      createdBy: string,
      currentUser: string | undefined,
      ownerId: string
    ) => {
      if (!currentUser) return false;
      return currentUser === createdBy || currentUser === ownerId;
    };

    it('should allow creator to delete their own comment', () => {
      expect(canDeleteComment(currentUserId, currentUserId, artifactOwnerId)).toBe(true);
    });

    it('should allow artifact owner to delete any comment', () => {
      expect(canDeleteComment(otherUserId, artifactOwnerId, artifactOwnerId)).toBe(true);
    });

    it('should not allow random users to delete', () => {
      expect(canDeleteComment(otherUserId, currentUserId, artifactOwnerId)).toBe(false);
    });
  });
});
```

#### 3. Data Transformation Tests

Create file: `tasks/00025-migrate-comment-schema-to-createdby/tests/unit/transformation.test.ts`

```typescript
/**
 * Tests for transforming backend data to frontend format
 * Verifies the createdBy field is correctly mapped
 */

describe('Comment Transformation', () => {
  it('should map backend createdBy to frontend comment', () => {
    const backendComment = {
      _id: 'comment-123',
      versionId: 'version-456',
      createdBy: 'user-789', // Backend field name
      author: { name: 'Test User', email: 'test@example.com' },
      content: 'Test content',
      createdAt: 1704326400000,
      resolved: false,
    };

    const transformed = {
      id: backendComment._id,
      versionId: backendComment.versionId,
      createdBy: backendComment.createdBy, // Should use createdBy, not authorId
      author: {
        name: backendComment.author.name || 'Anonymous',
        avatar: (backendComment.author.name || 'A').substring(0, 2).toUpperCase(),
      },
      content: backendComment.content,
      timestamp: new Date(backendComment.createdAt).toLocaleString(),
      resolved: backendComment.resolved,
      replies: [],
    };

    expect(transformed.createdBy).toBe('user-789');
  });

  it('should map backend createdBy to frontend reply', () => {
    const backendReply = {
      _id: 'reply-123',
      commentId: 'comment-456',
      createdBy: 'user-789', // Backend field name
      author: { name: 'Reply Author', email: 'reply@example.com' },
      content: 'Reply content',
      createdAt: 1704326400000,
    };

    const transformed = {
      id: backendReply._id,
      createdBy: backendReply.createdBy, // Should use createdBy, not authorId
      author: {
        name: backendReply.author.name || 'Anonymous',
        avatar: (backendReply.author.name || 'A').substring(0, 2).toUpperCase(),
      },
      content: backendReply.content,
      timestamp: new Date(backendReply.createdAt).toLocaleString(),
    };

    expect(transformed.createdBy).toBe('user-789');
  });
});
```

### During Migration Tests

Run these after each file change to catch issues early:

```bash
# Run TypeScript compilation to catch type errors
cd app && npx tsc --noEmit

# Run unit tests
npm test -- --testPathPattern="permissions|transformation|types"
```

### Post-Migration Tests

#### 1. Integration Test: Full Comment Flow

Create file: `tasks/00025-migrate-comment-schema-to-createdby/tests/e2e/comment-permissions.spec.ts`

```typescript
/**
 * E2E test verifying comment permission flow after migration
 * MUST produce video recording per project requirements
 */
import { test, expect } from '@playwright/test';

test.describe('Comment Permissions After Migration', () => {
  test('should show edit button only for comment creator', async ({ page }) => {
    // 1. Login as user A
    // 2. Navigate to artifact with comments
    // 3. Verify edit button visible on own comment
    // 4. Verify edit button NOT visible on other user's comment
  });

  test('should show delete button for creator or artifact owner', async ({ page }) => {
    // 1. Login as artifact owner
    // 2. Navigate to artifact
    // 3. Verify delete button visible on ALL comments
  });

  test('should allow editing own reply', async ({ page }) => {
    // 1. Login as user
    // 2. Create a reply
    // 3. Click edit on own reply
    // 4. Verify edit modal appears
  });
});
```

#### 2. TypeScript Compilation Verification

```bash
# Full TypeScript check after all changes
cd app && npx tsc --noEmit

# If using strict mode, ensure no 'any' slipped in
npx tsc --noEmit --strict
```

#### 3. Runtime Verification Checklist

After migration, manually verify:

- [ ] Create a comment (should work, save with createdBy)
- [ ] Edit own comment (should show edit button, save works)
- [ ] Cannot edit other's comment (edit button not visible)
- [ ] Delete own comment (should work)
- [ ] Artifact owner can delete any comment
- [ ] Create a reply (should work)
- [ ] Edit own reply (should work)
- [ ] Cannot edit other's reply
- [ ] Delete own reply
- [ ] Artifact owner can delete any reply

---

## Implementation Order

Execute changes in this order to minimize broken states:

### Step 1: Update Types (`types.ts`)

This is the foundation - change the interface first.

```bash
# After change, verify no new TypeScript errors:
cd app && npx tsc --noEmit
```

**Expected:** TypeScript errors in DocumentViewer.tsx and CommentCard.tsx (they reference `authorId` which no longer exists).

### Step 2: Update DocumentViewer (`DocumentViewer.tsx`)

Fix the transformation layer and helper functions.

```bash
# After change, verify:
cd app && npx tsc --noEmit
```

**Expected:** TypeScript errors in CommentCard.tsx remain (it still uses `comment.authorId`).

### Step 3: Update CommentCard (`CommentCard.tsx`)

Fix all permission checks and reply transformation.

```bash
# After change, should be clean:
cd app && npx tsc --noEmit
```

**Expected:** Clean compilation.

### Step 4: Run All Tests

```bash
# Run all tests to verify nothing broke
cd app && npm test

# Run specific comment-related tests
npm test -- --testPathPattern="comment"
```

### Step 5: Manual Verification

Start the dev server and manually test the flows in the checklist above.

---

## Risk Assessment

### Low Risk

| Risk | Mitigation |
|------|------------|
| TypeScript catches field name mismatches | Run `tsc --noEmit` after each file |
| Backend already migrated | Data consistency guaranteed |
| Limited scope (3 files) | Small blast radius |

### Medium Risk

| Risk | Mitigation |
|------|------------|
| Permission checks silently fail | Write unit tests for permission logic |
| UI buttons disappear | Manual verification after changes |
| `author` vs `createdBy` confusion | Clear documentation in code comments |

### Potential Runtime Errors

These patterns could cause silent failures at runtime:

1. **Optional chaining on wrong field:**
   ```typescript
   // WRONG - will always be undefined after migration
   comment.authorId && canEdit(comment.authorId)

   // CORRECT
   comment.createdBy && canEdit(comment.createdBy)
   ```

2. **Transformation returns undefined:**
   ```typescript
   // WRONG - backend returns createdBy, not authorId
   createdBy: bc.authorId  // undefined!

   // CORRECT
   createdBy: bc.createdBy
   ```

### Rollback Plan

If issues arise:

1. Revert frontend changes via git
2. Backend is stable and returns `createdBy` (which frontend ignores if authorId is used)
3. No data changes needed - this is purely a naming convention fix

---

## Summary Table

| File | Changes | Risk |
|------|---------|------|
| `app/src/components/comments/types.ts` | 1 field rename | Low |
| `app/src/components/artifact/DocumentViewer.tsx` | 6 changes | Low |
| `app/src/components/artifact/CommentCard.tsx` | 14 changes | Medium |

**Total: 21 changes across 3 files**

---

## Definition of Done

- [ ] `types.ts` updated with `createdBy` field
- [ ] `DocumentViewer.tsx` uses `createdBy` in all places
- [ ] `CommentCard.tsx` uses `createdBy` in all places
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] All existing tests pass
- [ ] New permission unit tests added and passing
- [ ] Manual verification complete (all checklist items)
- [ ] No console errors in browser during testing
