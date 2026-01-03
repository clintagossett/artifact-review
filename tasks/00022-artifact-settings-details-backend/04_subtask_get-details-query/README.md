# Subtask 04: Implement getDetailsForSettings Query

**Parent Task:** 00022-artifact-settings-details-backend
**Status:** OPEN
**Created:** 2026-01-02
**Depends On:** Subtask 01 (schema), Subtask 02 (existing code updates)

---

## Objective

Implement the `getDetailsForSettings` query that returns enriched artifact details for the Settings page. This includes computed fields like creator email, version count, and total file size.

---

## File to Modify

| File | Location |
|------|----------|
| `app/convex/artifacts.ts` | Add new query after `updateDetails` mutation |

---

## Implementation

Add the following query to `app/convex/artifacts.ts`:

```typescript
/**
 * Get artifact details for settings page (owner only)
 *
 * Includes enriched fields:
 * - creatorEmail: Email of the user who created the artifact
 * - versionCount: Number of active (non-deleted) versions
 * - totalFileSize: Sum of file sizes from all active versions
 *
 * @returns Enriched artifact data or null if not found/deleted
 * @throws "Not authenticated" - No user session
 * @throws "Not authorized" - User is not the owner
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

---

## Response Shape

The query returns an object with these fields:

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `_id` | `Id<"artifacts">` | `artifact._id` | Artifact ID |
| `name` | `string` | `artifact.name` | Display name |
| `description` | `string \| undefined` | `artifact.description` | Optional description |
| `createdAt` | `number` | `artifact.createdAt` | Creation timestamp (ms) |
| `updatedAt` | `number` | `artifact.updatedAt` | Last update timestamp (ms) |
| `creatorEmail` | `string \| undefined` | `users.email` | Email of creator (may be undefined) |
| `versionCount` | `number` | Computed | Count of active versions |
| `totalFileSize` | `number` | Computed | Sum of active version file sizes (bytes) |

---

## Computed Fields Logic

### creatorEmail
- Join on `artifact.createdBy` to get user record
- Return `user.email` if exists, otherwise `undefined`
- Note: Some users may not have an email set

### versionCount
- Query `artifactVersions` table using `by_artifact_active` index
- Filter by `artifactId` and `isDeleted = false`
- Return count of matching records

### totalFileSize
- Same query as versionCount
- Sum the `fileSize` field from each version
- Result in bytes (frontend will format for display)

---

## Acceptance Criteria

- [ ] Query compiles with proper validators
- [ ] Returns enriched data for owner
- [ ] Returns correct `creatorEmail` from users table
- [ ] Returns `undefined` for `creatorEmail` if user has no email
- [ ] Returns correct `versionCount` (excludes deleted versions)
- [ ] Returns correct `totalFileSize` (sum of active version file sizes)
- [ ] Returns `null` for deleted artifact
- [ ] Returns `null` for non-existent artifact
- [ ] Non-owner gets "Not authorized" error
- [ ] Unauthenticated user gets "Not authenticated" error

---

## Test Cases

### Happy Path
1. **Owner gets enriched data** - All fields populated correctly
2. **Artifact with multiple versions** - versionCount and totalFileSize correct
3. **Artifact with deleted versions** - Deleted versions excluded from counts
4. **Creator has no email** - creatorEmail is undefined

### Null Cases
5. **Deleted artifact** - Returns null (not error)
6. **Non-existent artifact** - Returns null (not error)

### Error Cases
7. **Unauthenticated user** - Error: "Not authenticated"
8. **Non-owner (reviewer)** - Error: "Not authorized"
9. **Non-owner (random user)** - Error: "Not authorized"

---

## Verification Steps

1. Start dev server: `npx convex dev`
2. Create an artifact with multiple versions
3. Open Convex dashboard
4. Navigate to Functions > artifacts > getDetailsForSettings
5. Call with valid artifactId
6. Verify response includes all enriched fields
7. Verify versionCount matches active versions
8. Verify totalFileSize is sum of version file sizes
9. Test error cases (wrong owner, non-existent artifact)

---

## Index Usage

This query uses:
- `by_artifact_active` index on `artifactVersions` table
  - Fields: `["artifactId", "isDeleted"]`
  - Already exists in schema

---

## Notes

- Uses `v.optional(v.string())` for `creatorEmail` since users may not have email
- Uses existing `by_artifact_active` index - no schema changes needed
- File sizes are in bytes; frontend should format as KB/MB for display
- Consider caching if this query becomes performance-sensitive (future optimization)
