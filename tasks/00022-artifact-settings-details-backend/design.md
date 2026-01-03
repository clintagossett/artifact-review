# Design: Artifact Settings Details Backend

**Task:** 00022-artifact-settings-details-backend
**Phase:** 1 of 2 (Backend Only)
**Date:** 2026-01-01
**Status:** Ready for Implementation

---

## Overview

This design document covers Phase 1: backend work to support the Artifact Settings Details tab. Phase 2 (frontend wiring) will be a separate task.

### Current State

The `ArtifactDetailsTab.tsx` component uses **hardcoded mock data**:

```typescript
// Current mock data in frontend
const metadata = {
  created: 'Jan 15, 2024 at 10:30 AM',
  createdBy: 'you@company.com',
  lastModified: 'Jan 20, 2024 at 2:15 PM',
  fileSize: '245 KB',
  versions: 3,
};
```

### Goals

1. **Rename `title` to `name`** in artifacts table (per ADR 12 naming conventions)
2. **Rename `creatorId` to `createdBy`** in artifacts table (per ADR 12 creator field standard)
3. Create `updateDetails` mutation for editing name/description
4. Create enriched query with computed fields (creator email, version count, total file size)

---

## Analysis: ADR 12 Compliance

### Field Rename Required: `title` -> `name`

Per ADR 12 "Property Name Redundancy" section:

> The table name already provides context, so property names should not repeat it.

The field `title` in the `artifacts` table should be renamed to `name` for consistency:
- `artifacts.name` (not `artifacts.title` or `artifacts.artifactName`)
- Similar to how `artifactVersions` uses `name` (not `versionName`)

**Current schema (line 148):**
```typescript
artifacts: defineTable({
  title: v.string(),  // <-- Should be "name"
  description: v.optional(v.string()),
  // ...
})
```

**Target schema:**
```typescript
artifacts: defineTable({
  name: v.string(),  // <-- Renamed from "title"
  description: v.optional(v.string()),
  // ...
})
```

### Field Rename Required: `creatorId` -> `createdBy`

Per ADR 12 "Record Creator: `createdBy`" section:

> Use `createdBy` for all tables. This field answers one question: "Who initiated this record's creation?"

The field `creatorId` in the `artifacts` table should be renamed to `createdBy` for consistency:
- `artifacts.createdBy` (not `artifacts.creatorId`)
- Pairs with `createdAt` timestamp
- Matches industry standards (Notion, Microsoft REST API)
- Future-proof for ownership transfer (add `ownerId` separately later if needed)

**Current schema:**
```typescript
artifacts: defineTable({
  creatorId: v.id("users"),  // <-- Should be "createdBy"
  // ...
})
  .index("by_creator", ["creatorId"])
```

**Target schema:**
```typescript
artifacts: defineTable({
  createdBy: v.id("users"),  // <-- Renamed from "creatorId"
  // ...
})
  .index("by_created_by", ["createdBy"])
```

### Other Fields - Already Compliant

| Field | Status | Notes |
|-------|--------|-------|
| `description` | OK | Optional string, no redundancy |
| `shareToken` | OK | Domain term adds meaning |
| `isDeleted` | OK | Boolean prefix pattern |
| `deletedAt` | OK | Audit timestamp pattern |
| `deletedBy` | OK | Audit user pattern |
| `createdAt` | OK | Audit timestamp pattern |
| `updatedAt` | OK | Audit timestamp pattern |

---

## Schema Changes

### Migration 1: Rename `title` to `name`

**File:** `app/convex/schema.ts`

**Before (line 148):**
```typescript
artifacts: defineTable({
  title: v.string(),
  // ...
})
```

**After:**
```typescript
artifacts: defineTable({
  name: v.string(),  // Renamed from title
  // ...
})
```

### Migration 2: Rename `creatorId` to `createdBy`

**File:** `app/convex/schema.ts`

**Before (line 162):**
```typescript
artifacts: defineTable({
  creatorId: v.id("users"),
  // ...
})
  .index("by_creator", ["creatorId"])
  .index("by_creator_active", ["creatorId", "isDeleted"])
```

**After:**
```typescript
artifacts: defineTable({
  createdBy: v.id("users"),  // Renamed from creatorId
  // ...
})
  .index("by_created_by", ["createdBy"])
  .index("by_created_by_active", ["createdBy", "isDeleted"])
```

### Migration Strategy

Convex handles schema changes gracefully. The rename approach:

1. **Option A (Recommended): Direct Rename**
   - Change `title` to `name` in schema
   - Update all references in backend code
   - Run `npx convex dev` to push schema
   - Convex will validate existing data matches new schema

2. **Data Migration (if needed)**
   - If Option A fails (Convex rejects due to data mismatch), we need a migration
   - However, since field names are just changing (not types), Option A should work

**Note:** Convex does NOT require SQL-style migrations. Schema changes are applied when you run `npx convex dev` or `npx convex deploy`. The new schema must be compatible with existing data.

---

## API Design

### Mutation: `updateDetails`

**File:** `app/convex/artifacts.ts`

**Signature:**
```typescript
export const updateDetails = mutation({
  args: {
    artifactId: v.id("artifacts"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

**Behavior:**
1. Authenticate user (required)
2. Validate artifact exists and is not deleted
3. Verify user is owner (`createdBy === userId`)
4. Validate `name`:
   - Trim whitespace
   - Non-empty (throw if empty after trim)
   - Max 100 characters
5. Validate `description`:
   - Trim whitespace if provided
   - Max 500 characters
   - Allow empty string (clears description)
6. Update artifact with new values
7. Update `updatedAt` timestamp
8. Return null

**Errors:**
- `"Not authenticated"` - No user session
- `"Artifact not found"` - Does not exist or is deleted
- `"Not authorized"` - User is not the owner
- `"Name cannot be empty"` - Empty after trim
- `"Name too long (max 100 characters)"` - Exceeds limit
- `"Description too long (max 500 characters)"` - Exceeds limit

### Query: `getDetailsForSettings`

**File:** `app/convex/artifacts.ts`

**Purpose:** Return artifact details with computed/joined fields for the settings page.

**Signature:**
```typescript
export const getDetailsForSettings = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      name: v.string(),
      description: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      // Enriched fields
      creatorEmail: v.optional(v.string()),
      versionCount: v.number(),
      totalFileSize: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

**Behavior:**
1. Authenticate user (required)
2. Get artifact by ID
3. Return null if not found or deleted
4. Verify user is owner (only owner can access settings)
5. Join with users table to get creator email
6. Count active versions
7. Sum file sizes from all active versions
8. Return enriched object

**Computed Fields:**

| Field | Source | Calculation |
|-------|--------|-------------|
| `creatorEmail` | `users.email` | Join on `artifact.createdBy` |
| `versionCount` | `artifactVersions` | Count where `artifactId` matches and `isDeleted=false` |
| `totalFileSize` | `artifactVersions` | Sum of `fileSize` where `artifactId` matches and `isDeleted=false` |

---

## Code Changes Summary

### Files to Modify

| File | Changes |
|------|---------|
| `app/convex/schema.ts` | Rename `title` to `name` (line 148), rename `creatorId` to `createdBy` (line 162), update indexes |
| `app/convex/artifacts.ts` | Update all references from `title` to `name` and `creatorId` to `createdBy`, add `updateDetails` mutation, add `getDetailsForSettings` query |

### Specific Code Changes in `artifacts.ts`

**Field Renames (title → name, creatorId → createdBy):**

1. **`create` action** (line 23-92)
   - Change `args.title` to `args.name`

2. **`createInternal` mutation** (line 98-162)
   - Change `args.title` to `args.name`
   - Change insert: `title: args.title` to `name: args.name`
   - Change insert: `creatorId: args.userId` to `createdBy: args.userId`

3. **`get` query** (line 167-189)
   - Change return validator: `title: v.string()` to `name: v.string()`
   - Change return validator: `creatorId: v.id("users")` to `createdBy: v.id("users")`

4. **`getByShareToken` query** (line 280-313)
   - Change return validator: `title: v.string()` to `name: v.string()`
   - Change return validator: `creatorId: v.id("users")` to `createdBy: v.id("users")`

5. **`list` query** (line 318-349)
   - Change return validator: `title: v.string()` to `name: v.string()`
   - Change return validator: `creatorId: v.id("users")` to `createdBy: v.id("users")`

6. **`softDelete` mutation** (line 391-447)
   - Change permission check: `artifact.creatorId !== userId` to `artifact.createdBy !== userId`

7. **`getByIdInternal` query** (line 1009-1032)
   - Change return validator: `title: v.string()` to `name: v.string()`
   - Change return validator: `creatorId: v.id("users")` to `createdBy: v.id("users")`

8. **`getByShareTokenInternal` query** (line 1037-1068)
   - Change return validator: `title: v.string()` to `name: v.string()`
   - Change return validator: `creatorId: v.id("users")` to `createdBy: v.id("users")`

**New Functions:**

9. **Add new mutation: `updateDetails`** (after line 554)

10. **Add new query: `getDetailsForSettings`** (after new mutation)

### Files to Check for Field References

Other files that may reference artifact `title` or `creatorId`:

```bash
# Find title references
grep -r "\.title" app/convex/
grep -r "title:" app/convex/

# Find creatorId references
grep -r "\.creatorId" app/convex/
grep -r "creatorId:" app/convex/
grep -r "by_creator" app/convex/
```

Likely files:
- `app/convex/sharing.ts` - May reference artifact title in email templates and creatorId for permissions
- `app/convex/lib/permissions.ts` - May check artifact.creatorId for ownership
- Any other files that fetch artifacts

---

## Subtask Breakdown

### Subtask 01: Schema Migrations (title -> name, creatorId -> createdBy)

**Status:** Pending

**Steps:**
1. Update `app/convex/schema.ts` line 148: `title: v.string()` -> `name: v.string()`
2. Update `app/convex/schema.ts` line 162: `creatorId: v.id("users")` -> `createdBy: v.id("users")`
3. Update `app/convex/schema.ts` index names:
   - `by_creator` -> `by_created_by`
   - `by_creator_active` -> `by_created_by_active`
4. Update schema documentation comments if they mention "title" or "creatorId"
5. Run `npx convex dev` to verify schema pushes successfully

**Acceptance:**
- Schema compiles without errors
- Existing data remains accessible
- All indexes renamed correctly

### Subtask 02: Update Existing Queries/Mutations

**Status:** Pending

**Steps:**
1. Update `create` action args: `title` -> `name`
2. Update `createInternal` mutation args and insert: `title` -> `name`, `creatorId` -> `createdBy`
3. Update all return validators: `title` -> `name`, `creatorId` -> `createdBy`
4. Update `softDelete` permission check: `artifact.creatorId` -> `artifact.createdBy`
5. Update `getByIdInternal` return validator
6. Update `getByShareTokenInternal` return validator
7. Search for any other `title` or `creatorId` references in `app/convex/`
8. Update any references in `sharing.ts` and `lib/permissions.ts`

**Acceptance:**
- All queries/mutations compile
- Tests pass (if any exist)
- Dev server runs without type errors
- Permission checks work correctly with `createdBy`

### Subtask 03: Add `updateDetails` Mutation

**Status:** Pending

**Implementation:**
```typescript
/**
 * Update artifact name and description (owner only)
 */
export const updateDetails = mutation({
  args: {
    artifactId: v.id("artifacts"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Authenticate
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 2. Get artifact
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact || artifact.isDeleted) {
      throw new Error("Artifact not found");
    }

    // 3. Verify ownership
    if (artifact.createdBy !== userId) {
      throw new Error("Not authorized: Only the owner can update details");
    }

    // 4. Validate name
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Name cannot be empty");
    }
    if (trimmedName.length > 100) {
      throw new Error("Name too long (max 100 characters)");
    }

    // 5. Validate description
    let trimmedDescription: string | undefined = undefined;
    if (args.description !== undefined) {
      trimmedDescription = args.description.trim();
      if (trimmedDescription.length > 500) {
        throw new Error("Description too long (max 500 characters)");
      }
      // Allow empty string to clear description
      if (trimmedDescription === "") {
        trimmedDescription = undefined;
      }
    }

    // 6. Update artifact
    await ctx.db.patch(args.artifactId, {
      name: trimmedName,
      description: trimmedDescription,
      updatedAt: Date.now(),
    });

    return null;
  },
});
```

**Acceptance:**
- Mutation compiles
- Owner can update name/description
- Non-owner gets authorization error
- Validation errors for empty name, too-long values

### Subtask 04: Add `getDetailsForSettings` Query

**Status:** Pending

**Implementation:**
```typescript
/**
 * Get artifact details for settings page (owner only)
 * Includes enriched fields: creator email, version count, total file size
 */
export const getDetailsForSettings = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      name: v.string(),
      description: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      creatorEmail: v.optional(v.string()),
      versionCount: v.number(),
      totalFileSize: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // 1. Authenticate
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 2. Get artifact
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact || artifact.isDeleted) {
      return null;
    }

    // 3. Verify ownership (only owner can access settings)
    if (artifact.createdBy !== userId) {
      throw new Error("Not authorized: Only the owner can access settings");
    }

    // 4. Get creator email
    const creator = await ctx.db.get(artifact.createdBy);
    const creatorEmail = creator?.email;

    // 5. Count active versions and sum file sizes
    const versions = await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .collect();

    const versionCount = versions.length;
    const totalFileSize = versions.reduce((sum, v) => sum + v.fileSize, 0);

    // 6. Return enriched data
    return {
      _id: artifact._id,
      name: artifact.name,
      description: artifact.description,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
      creatorEmail,
      versionCount,
      totalFileSize,
    };
  },
});
```

**Acceptance:**
- Query compiles
- Returns enriched data for owner
- Returns null for non-existent/deleted artifacts
- Throws for non-owner

### Subtask 05: Update Frontend References (Deferred to Phase 2)

This is **out of scope** for Phase 1 (backend). Phase 2 will:
- Update `ArtifactDetailsTab.tsx` to use `getDetailsForSettings` query
- Wire up `updateDetails` mutation
- Update any frontend code that references `artifact.title`

---

## Testing Approach

### Unit Tests (Backend)

Create test file: `tasks/00022-artifact-settings-details-backend/tests/unit/`

**Test Cases for `updateDetails`:**
1. Owner can update name only
2. Owner can update description only
3. Owner can update both name and description
4. Owner can clear description (empty string -> undefined)
5. Unauthenticated user gets error
6. Non-owner gets authorization error
7. Empty name after trim gets error
8. Name > 100 chars gets error
9. Description > 500 chars gets error
10. Updating deleted artifact returns error
11. Updating non-existent artifact returns error

**Test Cases for `getDetailsForSettings`:**
1. Owner gets enriched data
2. Returns correct version count (excludes deleted)
3. Returns correct total file size (sum of active versions)
4. Returns creator email when user has email
5. Returns undefined creatorEmail when user has no email
6. Returns null for deleted artifact
7. Returns null for non-existent artifact
8. Non-owner gets authorization error
9. Unauthenticated user gets error

### Manual Testing Checklist

- [ ] Start dev servers
- [ ] Create artifact via UI
- [ ] Check that `name` field is used (not `title`)
- [ ] Call `updateDetails` via Convex dashboard
- [ ] Verify name/description updated
- [ ] Call `getDetailsForSettings` via Convex dashboard
- [ ] Verify enriched fields are correct

---

## Risks and Mitigations

### Risk 1: Frontend Breaking from Rename

**Risk:** Renaming `title` to `name` will break frontend code that references `artifact.title`.

**Mitigation:**
- Phase 1 is backend only
- Phase 2 will update all frontend references
- Alternatively, could add deprecation period (keep both fields temporarily)

**Decision:** Proceed with rename. Frontend will be updated in Phase 2 immediately after.

### Risk 2: Schema Push Failure

**Risk:** Convex may reject schema change if existing data doesn't match.

**Mitigation:**
- Field name changes don't affect data validation
- Convex validates field types, not names
- If issues occur, we can write a one-time migration script

### Risk 3: Missing Title References

**Risk:** Some code may reference `title` and be missed during update.

**Mitigation:**
- Use grep/search to find all references before making changes
- TypeScript will catch most misses as compile errors

---

## Appendix: Full Search for `title` References

Run before implementation:

```bash
# In app/convex/ directory
grep -rn "title" app/convex/

# In app/src/ directory (for Phase 2 awareness)
grep -rn "\.title" app/src/
grep -rn "artifact\.title" app/src/
```

Expected files with `title`:
- `app/convex/schema.ts` - Schema definition
- `app/convex/artifacts.ts` - Multiple queries/mutations
- `app/src/components/` - Frontend components (Phase 2)

---

## Summary

| Item | Description |
|------|-------------|
| **Schema Changes** | Rename `artifacts.title` to `artifacts.name`, rename `artifacts.creatorId` to `artifacts.createdBy` |
| **Index Updates** | Rename `by_creator` to `by_created_by`, `by_creator_active` to `by_created_by_active` |
| **New Mutation** | `updateDetails(artifactId, name, description)` |
| **New Query** | `getDetailsForSettings(artifactId)` with enriched fields |
| **Files Changed** | `schema.ts`, `artifacts.ts`, possibly `sharing.ts` and `lib/permissions.ts` |
| **Estimated Effort** | 3-4 hours (increased due to additional field rename) |
| **Dependencies** | None |
| **Blocked By** | Nothing |
| **Blocks** | Phase 2 (frontend wiring) |
