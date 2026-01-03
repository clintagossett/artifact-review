# Subtask 01: Schema Migrations

**Parent Task:** 00022-artifact-settings-details-backend
**Status:** OPEN
**Created:** 2026-01-02

---

## Objective

Rename `title` to `name` and `creatorId` to `createdBy` in the artifacts table, along with updating the associated indexes. This aligns the schema with ADR 12 naming conventions.

---

## Files to Modify

| File | Location | Changes |
|------|----------|---------|
| `app/convex/schema.ts` | Line 148 | `title: v.string()` -> `name: v.string()` |
| `app/convex/schema.ts` | Line 162 | `creatorId: v.id("users")` -> `createdBy: v.id("users")` |
| `app/convex/schema.ts` | Lines 213-220 | Rename indexes |

---

## Specific Changes

### 1. Rename `title` to `name` (Line 148)

**Before:**
```typescript
artifacts: defineTable({
  title: v.string(),
  // ...
})
```

**After:**
```typescript
artifacts: defineTable({
  name: v.string(),  // Renamed from title (ADR 12)
  // ...
})
```

### 2. Rename `creatorId` to `createdBy` (Line 162)

**Before:**
```typescript
creatorId: v.id("users"),
```

**After:**
```typescript
createdBy: v.id("users"),  // Renamed from creatorId (ADR 12)
```

### 3. Update Index Names (Lines 213-220)

**Before:**
```typescript
.index("by_creator", ["creatorId"])
.index("by_creator_active", ["creatorId", "isDeleted"])
```

**After:**
```typescript
.index("by_created_by", ["createdBy"])
.index("by_created_by_active", ["createdBy", "isDeleted"])
```

### 4. Update Schema Comments

Update any comments that mention `title` or `creatorId` to use the new field names.

---

## Acceptance Criteria

- [ ] `title` field renamed to `name` in artifacts table definition
- [ ] `creatorId` field renamed to `createdBy` in artifacts table definition
- [ ] Index `by_creator` renamed to `by_created_by` with field `["createdBy"]`
- [ ] Index `by_creator_active` renamed to `by_created_by_active` with field `["createdBy", "isDeleted"]`
- [ ] Schema comments updated to reflect new field names
- [ ] `npx convex dev` runs successfully (schema pushes without errors)
- [ ] TypeScript compilation has no errors

---

## Verification Steps

1. Run `npx convex dev` from `app/` directory
2. Confirm schema push succeeds
3. Check Convex dashboard to verify fields appear correctly
4. Note: This will cause TypeScript errors in other files until Subtask 02 is complete

---

## Notes

- Convex does NOT require SQL-style migrations for field renames
- The new schema must be compatible with existing data (field name changes are allowed)
- TypeScript will catch most reference issues as compile errors
- After this subtask, Subtask 02 MUST be completed immediately to fix broken references
