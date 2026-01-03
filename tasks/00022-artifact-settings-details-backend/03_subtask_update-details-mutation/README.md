# Subtask 03: Implement updateDetails Mutation

**Parent Task:** 00022-artifact-settings-details-backend
**Status:** OPEN
**Created:** 2026-01-02
**Depends On:** Subtask 01 (schema), Subtask 02 (existing code updates)

---

## Objective

Implement the `updateDetails` mutation that allows artifact owners to update the name and description of their artifacts. This enables the Settings Details tab to save changes.

---

## File to Modify

| File | Location |
|------|----------|
| `app/convex/artifacts.ts` | Add new mutation after existing mutations (around line 554) |

---

## Implementation

Add the following mutation to `app/convex/artifacts.ts`:

```typescript
/**
 * Update artifact name and description (owner only)
 *
 * @throws "Not authenticated" - No user session
 * @throws "Artifact not found" - Does not exist or is deleted
 * @throws "Not authorized" - User is not the owner
 * @throws "Name cannot be empty" - Empty after trim
 * @throws "Name too long (max 100 characters)" - Exceeds limit
 * @throws "Description too long (max 500 characters)" - Exceeds limit
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

---

## Behavior Details

### Authentication
- Requires authenticated user
- Uses `getAuthUserId(ctx)` from Convex Auth

### Authorization
- Only the artifact owner (`createdBy`) can update details
- Reviewers and public viewers cannot update

### Name Validation
1. Trim whitespace from both ends
2. Reject if empty after trim
3. Reject if length > 100 characters
4. Store trimmed value

### Description Validation
1. If undefined, leave as undefined (no change)
2. If provided, trim whitespace
3. Reject if length > 500 characters
4. If empty string after trim, store as undefined (clears description)

### Side Effects
- Updates `updatedAt` timestamp to current time

---

## Acceptance Criteria

- [ ] Mutation compiles with proper validators
- [ ] Owner can update name only
- [ ] Owner can update description only
- [ ] Owner can update both name and description
- [ ] Owner can clear description by passing empty string
- [ ] Unauthenticated user gets "Not authenticated" error
- [ ] Non-owner gets "Not authorized" error
- [ ] Empty name (after trim) gets "Name cannot be empty" error
- [ ] Name > 100 chars gets "Name too long" error
- [ ] Description > 500 chars gets "Description too long" error
- [ ] Updating deleted artifact returns "Artifact not found" error
- [ ] Updating non-existent artifact returns "Artifact not found" error
- [ ] `updatedAt` is updated on successful save

---

## Test Cases

### Happy Path
1. **Owner updates name only** - Should succeed, description unchanged
2. **Owner updates description only** - Should succeed, name unchanged
3. **Owner updates both** - Should succeed
4. **Owner clears description** - Pass `""`, description becomes undefined

### Error Cases
5. **Unauthenticated user** - Error: "Not authenticated"
6. **Non-owner tries to update** - Error: "Not authorized"
7. **Empty name** - Error: "Name cannot be empty"
8. **Whitespace-only name** - Error: "Name cannot be empty"
9. **Name > 100 chars** - Error: "Name too long"
10. **Description > 500 chars** - Error: "Description too long"
11. **Deleted artifact** - Error: "Artifact not found"
12. **Non-existent artifact** - Error: "Artifact not found"

---

## Verification Steps

1. Start dev server: `npx convex dev`
2. Open Convex dashboard
3. Navigate to Functions > artifacts > updateDetails
4. Test with valid artifactId and name
5. Verify artifact updated in Data > artifacts table
6. Test error cases (wrong owner, invalid inputs)

---

## Notes

- Import statement for `getAuthUserId` should already exist in artifacts.ts
- Field name is `createdBy` (updated in Subtask 01/02)
- Character limits match ADR 12 and Figma design specifications
