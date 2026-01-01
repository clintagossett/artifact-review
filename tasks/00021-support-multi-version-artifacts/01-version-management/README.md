# Subtask 01: Version Management

**Parent Task:** 00021-support-multi-version-artifacts
**Status:** OPEN
**Created:** 2026-01-01

---

## Objective

Implement backend logic and UI for managing artifact versions: upload new versions, delete versions, and automatically control which version accepts comments.

---

## Requirements

### Backend (Convex)

**1. Version Upload**
- Create new version with incremented `versionNumber`
- New version automatically becomes "latest"
- Previous versions automatically close for commenting (no flag needed - determined by query)

**2. Version Deletion**
- Soft delete: set `deleted: true` on version
- When latest version deleted → previous version becomes latest
- Previous version automatically reopens for commenting (no manual toggle)

**3. Comment Control (Backend Enforced)**
- **CRITICAL:** Only latest version (highest non-deleted `versionNumber`) accepts comments
- Enforce in `addComment` mutation - reject if not latest version
- No frontend bypass possible
- Error message: "Comments are only allowed on the latest version"

**4. Get Latest Version**
```typescript
getLatestVersion(artifactId) {
  // Returns highest versionNumber where deleted = false
  return db.query("versions")
    .withIndex("by_artifact")
    .filter(q => q.eq("deleted", false))
    .order("desc")
    .first();
}
```

### Frontend

**1. Upload New Version**
- Add "Upload New Version" button to artifact settings
- File picker → upload → create new version
- Shows success message with new version number

**2. Delete Version**
- "Delete Version" action in version list
- Confirmation dialog
- Cannot delete if only one version exists
- Success message

**3. Version List Display**
- Show all versions (exclude deleted)
- Display version number, upload date, file size
- Badge: "Latest" on highest non-deleted version
- Actions: Download, Delete

---

## Technical Notes

### Backend Mutations

```typescript
// mutations/versions.ts
export const uploadVersion = mutation({
  args: {
    artifactId: v.id("artifacts"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    // Get current max version number
    const versions = await ctx.db.query("versions")
      .withIndex("by_artifact", q => q.eq("artifactId", args.artifactId))
      .collect();

    const maxVersion = Math.max(...versions.map(v => v.versionNumber), 0);

    // Create new version
    const versionId = await ctx.db.insert("versions", {
      artifactId: args.artifactId,
      versionNumber: maxVersion + 1,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      deleted: false,
      createdAt: Date.now(),
    });

    return versionId;
  },
});

export const deleteVersion = mutation({
  args: { versionId: v.id("versions") },
  handler: async (ctx, args) => {
    // Check if only version
    const version = await ctx.db.get(args.versionId);
    const versions = await ctx.db.query("versions")
      .withIndex("by_artifact", q => q.eq("artifactId", version.artifactId))
      .filter(q => q.eq(q.field("deleted"), false))
      .collect();

    if (versions.length === 1) {
      throw new Error("Cannot delete the only version");
    }

    // Soft delete
    await ctx.db.patch(args.versionId, { deleted: true });
  },
});

// Enforce in comment mutation
export const addComment = mutation({
  args: {
    versionId: v.id("versions"),
    text: v.string(),
    // ... other args
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);

    // Get latest version
    const latestVersion = await ctx.db.query("versions")
      .withIndex("by_artifact", q => q.eq("artifactId", version.artifactId))
      .filter(q => q.eq(q.field("deleted"), false))
      .order("desc")
      .first();

    // ENFORCE: Only latest version accepts comments
    if (version._id !== latestVersion._id) {
      throw new Error("Comments are only allowed on the latest version");
    }

    // Create comment...
  },
});
```

---

## Testing

### Unit Tests
- ✅ Upload version increments versionNumber correctly
- ✅ Delete version sets deleted flag
- ✅ Cannot delete only version
- ✅ getLatestVersion returns correct version after delete
- ✅ addComment rejects on non-latest version

### E2E Tests
- ✅ Upload new version flow
- ✅ Delete version flow
- ✅ Try to comment on old version (should fail)
- ✅ Delete latest, previous becomes latest and accepts comments

---

## Deliverables

- [ ] Backend mutations: `uploadVersion`, `deleteVersion`
- [ ] Backend enforcement in `addComment` mutation
- [ ] Helper: `getLatestVersion(artifactId)`
- [ ] Frontend: Upload new version UI
- [ ] Frontend: Delete version UI
- [ ] Frontend: Version list with "Latest" badge
- [ ] Tests: Unit + E2E
- [ ] Validation video
