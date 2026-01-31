# Subtask 01: Schema and Backend Mutations

**Parent Task:** 00049-artifact-version-status
**Status:** OPEN
**Created:** 2026-01-31

---

## Objective

Add `status` and `errorMessage` fields to the `artifactVersions` table and update all backend mutations to set appropriate status values during the artifact lifecycle.

---

## Acceptance Criteria

1. Schema updated with `status` and `errorMessage` fields
2. ZIP upload creates version with `status: "uploading"`
3. ZIP processing sets `status: "processing"` before extraction
4. Successful processing sets `status: "ready"`
5. Failed processing sets `status: "error"` and `errorMessage` (NO soft-delete)
6. HTML/Markdown uploads set `status: "ready"` directly
7. Existing versions (status: undefined) treated as ready
8. All backend unit tests pass

---

## Files to Modify

| File | Changes Required |
|------|------------------|
| `app/convex/schema.ts` | Add `status` and `errorMessage` fields to `artifactVersions` |
| `app/convex/zipUpload.ts` | Set `status: "uploading"` in `createArtifactWithZip` and `addZipVersion` |
| `app/convex/zipProcessor.ts` | Set `status: "processing"` before extraction starts |
| `app/convex/zipProcessorMutations.ts` | Update `markProcessingComplete` and `markProcessingError` |
| `app/convex/artifacts.ts` | Set `status: "ready"` in HTML/Markdown create flow |

---

## TDD Approach

### Step 1: Write Schema Tests First

```typescript
// Test: status field accepts valid values
// Test: errorMessage is optional
// Test: existing records without status work (undefined = ready)
```

### Step 2: Write Mutation Tests

```typescript
// Test: createArtifactWithZip sets status: "uploading"
// Test: addZipVersion sets status: "uploading"
// Test: markProcessingComplete sets status: "ready"
// Test: markProcessingError sets status: "error" and errorMessage
// Test: markProcessingError does NOT soft-delete
// Test: artifacts.create for HTML sets status: "ready"
// Test: artifacts.create for Markdown sets status: "ready"
```

### Step 3: Implement Schema Changes

Add to `artifactVersions` in `schema.ts`:

```typescript
/**
 * Processing status for async operations.
 * - "uploading": Version created, waiting for file upload
 * - "processing": ZIP file being extracted
 * - "ready": Processing complete, version is viewable
 * - "error": Processing failed, see errorMessage
 *
 * Optional for backward compatibility - undefined treated as "ready".
 * Task 00049 - Artifact Version Status
 */
status: v.optional(v.union(
  v.literal("uploading"),
  v.literal("processing"),
  v.literal("ready"),
  v.literal("error")
)),

/**
 * Error details when status === "error".
 * Contains human-readable error message for display.
 * Task 00049 - Artifact Version Status
 */
errorMessage: v.optional(v.string()),
```

### Step 4: Implement Mutation Updates

#### zipUpload.ts - createArtifactWithZip (line ~64)

```typescript
const versionId = await ctx.db.insert("artifactVersions", {
  // ... existing fields ...
  status: "uploading",  // ADD THIS
});
```

#### zipUpload.ts - addZipVersion (line ~132)

```typescript
const versionId = await ctx.db.insert("artifactVersions", {
  // ... existing fields ...
  status: "uploading",  // ADD THIS
});
```

#### zipProcessor.ts - Before extraction

Add call to set status: "processing" before extraction begins.

```typescript
// At start of processZipFile, before extraction
await ctx.runMutation(internal.zipProcessorMutations.updateVersionStatus, {
  versionId: args.versionId,
  status: "processing",
});
```

#### zipProcessorMutations.ts - New mutation

```typescript
/**
 * Update version processing status
 * Task 00049 - Artifact Version Status
 */
export const updateVersionStatus = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.versionId, {
      status: args.status,
    });
    return null;
  },
});
```

#### zipProcessorMutations.ts - markProcessingComplete (line ~41)

```typescript
handler: async (ctx, args) => {
  await ctx.db.patch(args.versionId, {
    entryPoint: args.entryPoint,
    status: "ready",  // ADD THIS
  });
  return null;
},
```

#### zipProcessorMutations.ts - markProcessingError (line ~59)

**IMPORTANT CHANGE:** Remove soft-delete, add status and errorMessage instead.

```typescript
export const markProcessingError = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.error(`ZIP processing error for version ${args.versionId}:`, args.error);

    // Set error status instead of soft-deleting
    // This allows users to see what failed and potentially retry
    await ctx.db.patch(args.versionId, {
      status: "error",
      errorMessage: args.error,
      // REMOVED: isDeleted: true, deletedAt: Date.now()
    });

    return null;
  },
});
```

#### artifacts.ts - HTML/Markdown create

In the `createInternal` mutation, add status: "ready":

```typescript
const versionId = await ctx.db.insert("artifactVersions", {
  // ... existing fields ...
  status: "ready",  // ADD THIS - synchronous uploads are immediately ready
});
```

---

## Test Samples

| Test Case | Sample |
|-----------|--------|
| Valid ZIP upload | `samples/01-valid/zip/charting/v1.zip` |
| ZIP with forbidden types | `samples/04-invalid/wrong-type/presentation-with-video.zip` |
| Valid HTML | `samples/01-valid/html/simple-html/v1/index.html` |
| Valid Markdown | `samples/01-valid/markdown/product-spec/v1.md` |

---

## Verification Checklist

- [ ] Schema compiles without errors
- [ ] Convex dev server starts successfully
- [ ] `createArtifactWithZip` creates version with `status: "uploading"`
- [ ] `addZipVersion` creates version with `status: "uploading"`
- [ ] `processZipFile` sets `status: "processing"` before extraction
- [ ] `markProcessingComplete` sets `status: "ready"`
- [ ] `markProcessingError` sets `status: "error"` and `errorMessage`
- [ ] `markProcessingError` does NOT soft-delete the version
- [ ] HTML upload creates version with `status: "ready"`
- [ ] Markdown upload creates version with `status: "ready"`
- [ ] Existing versions without status field still work

---

## Dependencies

- None (this is the first subtask)

---

## How This Will Be Used

The status field enables:
1. **Frontend subscription:** React components can subscribe to status changes
2. **E2E test synchronization:** Tests can wait for `[data-version-status="ready"]`
3. **Error display:** Failed uploads show error message instead of disappearing
4. **Future retry:** Error status enables "Retry" button functionality
