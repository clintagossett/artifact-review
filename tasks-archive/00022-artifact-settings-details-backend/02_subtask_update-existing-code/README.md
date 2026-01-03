# Subtask 02: Update Existing Code References

**Parent Task:** 00022-artifact-settings-details-backend
**Status:** OPEN
**Created:** 2026-01-02
**Depends On:** Subtask 01 (schema migrations)

---

## Objective

Update all existing code references from `title` to `name` and `creatorId` to `createdBy` across the Convex backend. This fixes the TypeScript errors introduced by the schema changes in Subtask 01.

---

## Files to Modify

| File | Reference Type | Count |
|------|---------------|-------|
| `app/convex/artifacts.ts` | Fields, validators, permission checks | ~15 references |
| `app/convex/sharing.ts` | Possible artifact references | TBD |
| `app/convex/lib/permissions.ts` | Permission checks | TBD |
| `app/convex/zipUpload.ts` | Artifact creation | TBD |

---

## Specific Changes in `artifacts.ts`

### 1. `create` action (approx line 23-92)

**Before:**
```typescript
args: {
  title: v.string(),
  // ...
}
```

**After:**
```typescript
args: {
  name: v.string(),
  // ...
}
```

Also update the internal call from `args.title` to `args.name`.

### 2. `createInternal` mutation (approx line 98-162)

**Args:**
```typescript
// Before
args: { title: v.string(), ... }
// After
args: { name: v.string(), ... }
```

**Insert statement:**
```typescript
// Before
await ctx.db.insert("artifacts", {
  title: args.title,
  creatorId: args.userId,
  // ...
});

// After
await ctx.db.insert("artifacts", {
  name: args.name,
  createdBy: args.userId,
  // ...
});
```

### 3. `get` query (approx line 167-189)

**Return validator:**
```typescript
// Before
returns: v.union(
  v.object({
    title: v.string(),
    creatorId: v.id("users"),
    // ...
  }),
  v.null()
),

// After
returns: v.union(
  v.object({
    name: v.string(),
    createdBy: v.id("users"),
    // ...
  }),
  v.null()
),
```

### 4. `getByShareToken` query (approx line 280-313)

Same pattern as `get` - update return validator fields.

### 5. `list` query (approx line 318-349)

Same pattern - update return validator fields.

### 6. `softDelete` mutation (approx line 391-447)

**Permission check:**
```typescript
// Before
if (artifact.creatorId !== userId) {
  throw new Error("Not authorized");
}

// After
if (artifact.createdBy !== userId) {
  throw new Error("Not authorized");
}
```

### 7. `getByIdInternal` query (approx line 1009-1032)

Same pattern as `get` - update return validator fields.

### 8. `getByShareTokenInternal` query (approx line 1037-1068)

Same pattern as `get` - update return validator fields.

---

## Search Commands

Run these to find all references that need updating:

```bash
# From app/convex/ directory
grep -rn "\.title" .
grep -rn "title:" .
grep -rn "\.creatorId" .
grep -rn "creatorId:" .
grep -rn "by_creator" .
```

---

## Acceptance Criteria

- [ ] All `title` field references in `artifacts.ts` changed to `name`
- [ ] All `creatorId` field references in `artifacts.ts` changed to `createdBy`
- [ ] All `by_creator` index references changed to `by_created_by`
- [ ] All `by_creator_active` index references changed to `by_created_by_active`
- [ ] `sharing.ts` updated if it references artifact `title` or `creatorId`
- [ ] `lib/permissions.ts` updated if it references `creatorId`
- [ ] `zipUpload.ts` updated if it references `title` or `creatorId`
- [ ] TypeScript compilation succeeds with no errors
- [ ] `npx convex dev` runs without errors
- [ ] Existing functionality works (create artifact, view artifact, delete artifact)

---

## Verification Steps

1. Run `npx tsc --noEmit` from `app/` directory to check TypeScript
2. Run `npx convex dev` to verify backend starts
3. Create a new artifact through the UI
4. Verify artifact appears in dashboard
5. Verify artifact can be viewed by share link
6. Verify artifact can be deleted

---

## Notes

- Use grep/search to ensure no references are missed
- TypeScript will catch most field access errors
- Pay special attention to return validators - they must match actual return types
- Some files may reference `artifact.title` in string templates (emails) - check `sharing.ts`
