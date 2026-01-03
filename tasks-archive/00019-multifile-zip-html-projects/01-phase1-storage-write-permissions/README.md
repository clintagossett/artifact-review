# Subtask 01: Phase 1 - Storage and Write Permissions

**Parent Task:** 00019 - Upload and View Multi-file HTML Projects via ZIP
**Status:** Pending
**Created:** 2025-12-31

---

## Objective

Enable users to upload ZIP files, validate them against security and size constraints, extract contents to blob storage, detect entry points, and create artifact records with proper write permission enforcement.

---

## Steps

### Step 1.1: Add ZIP Validation Constants

**File:** `/app/convex/lib/fileTypes.ts`

Add the following constants and helper functions:

```typescript
/**
 * Maximum ZIP file size (50MB)
 * Task: 00019 - Multi-file ZIP Projects
 */
export const MAX_ZIP_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Maximum files allowed in a ZIP
 * Task: 00019 - Multi-file ZIP Projects
 */
export const MAX_ZIP_FILE_COUNT = 500;

/**
 * Maximum size per extracted file (5MB)
 * Task: 00019 - Multi-file ZIP Projects
 */
export const MAX_EXTRACTED_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Forbidden file extensions in ZIP (security)
 * Task: 00019 - Multi-file ZIP Projects
 */
export const FORBIDDEN_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1',  // Executables
  '.mov', '.mp4', '.avi', '.mkv', '.wmv',         // Videos
  '.doc', '.docx', '.xls', '.xlsx', '.ppt',       // Office (not needed)
] as const;

/**
 * Validate ZIP file size before upload
 */
export function validateZipSize(sizeBytes: number): void {
  if (sizeBytes > MAX_ZIP_FILE_SIZE) {
    throw new Error(
      `ZIP file too large. Maximum: 50MB, got: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB`
    );
  }
}

/**
 * Check if a file extension is forbidden
 */
export function isForbiddenExtension(filePath: string): boolean {
  const ext = '.' + filePath.toLowerCase().split('.').pop();
  return FORBIDDEN_EXTENSIONS.includes(ext as any);
}
```

---

### Step 1.2: Update ZIP Upload Action - Create Artifact Flow

**File:** `/app/convex/zipUpload.ts`

Add size validation to the existing `createArtifactWithZip` mutation:

- Import `validateZipSize` from `./lib/fileTypes`
- Call `validateZipSize(args.fileSize)` before creating records
- Ensure authentication is checked first

---

### Step 1.3: Add ZIP Version to Existing Artifact

**File:** `/app/convex/zipUpload.ts`

Create a new mutation `addZipVersion`:

```typescript
export const addZipVersion = mutation({
  args: {
    artifactId: v.id("artifacts"),
    fileSize: v.number(),
    versionName: v.optional(v.string()),
  },
  returns: v.object({
    uploadUrl: v.string(),
    versionId: v.id("artifactVersions"),
    versionNumber: v.number(),
  }),
  handler: async (ctx, args) => {
    // 1. Authenticate user
    // 2. Validate ZIP size
    // 3. Verify artifact exists and user is OWNER
    // 4. Get next version number (query existing versions)
    // 5. Create version record with fileType: "zip"
    // 6. Update artifact timestamp
    // 7. Generate and return upload URL
  },
});
```

---

### Step 1.4: Update ZIP Processor with Validation

**File:** `/app/convex/zipProcessor.ts`

Update `processZipFile` to include validation:

1. **File Count Validation:** Reject if > 500 files
2. **Forbidden Extension Check:** Reject if any file has forbidden extension
3. **Individual File Size Check:** Reject if any extracted file > 5MB
4. **Entry Point Detection:** Find index.html using priority order:
   - Priority 1: `index.html` in root
   - Priority 2: `index.htm` in root
   - Priority 3: `index.html` in subdirectory
   - Priority 4: First HTML file found (sorted alphabetically)
5. **Error if no HTML file found**

---

### Step 1.5: Update Processing Status Mutations

**File:** `/app/convex/zipProcessorMutations.ts`

Add or update error handling mutation:

```typescript
export const markProcessingError = internalMutation({
  args: {
    versionId: v.id("artifactVersions"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Log error
    // Soft-delete the version (isDeleted: true, deletedAt: now)
    // This prevents partial/broken artifacts from being visible
  },
});
```

---

### Step 1.6: Write Permission Helpers

**File:** `/app/convex/lib/permissions.ts`

Add a helper for write permission checks:

```typescript
/**
 * Check if user can write/modify an artifact.
 * Only the owner (creator) can upload new versions.
 * Task: 00019 - Write permission check
 */
export async function canWriteArtifact(
  ctx: QueryCtx | MutationCtx,
  artifactId: Id<"artifacts">
): Promise<boolean> {
  const artifact = await ctx.db.get(artifactId);
  if (!artifact || artifact.isDeleted) {
    return false;
  }

  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return false;
  }

  return artifact.creatorId === userId;
}
```

---

### Step 1.7: Write Phase 1 Tests

**File:** `/app/convex/__tests__/zip-upload.test.ts`

Create tests covering:

| Test | Description |
|------|-------------|
| ZIP size validation | Reject ZIP > 50MB |
| File count validation | Reject ZIP with > 500 files |
| Forbidden extension check | Reject .exe, .mov, .mp4, etc. |
| Create artifact flow | Create artifact + version + upload URL |
| Add version flow | Add ZIP version to existing artifact |
| Owner-only upload | Non-owner cannot add version |
| Entry point detection | Detect index.html from sample ZIP |
| File extraction | All files stored in artifactFiles |
| Error handling | Failed processing soft-deletes version |
| Auth requirement | Unauthenticated user cannot create |

---

## File Locations

| File | Purpose |
|------|---------|
| `/app/convex/lib/fileTypes.ts` | ZIP validation constants |
| `/app/convex/lib/permissions.ts` | Write permission helper |
| `/app/convex/zipUpload.ts` | Upload mutations |
| `/app/convex/zipProcessor.ts` | ZIP extraction action |
| `/app/convex/zipProcessorMutations.ts` | Processing status mutations |
| `/app/convex/__tests__/zip-upload.test.ts` | Unit/integration tests |

---

## Sample Test Files

Use centralized samples from `/samples/`:

| Sample | Use Case |
|--------|----------|
| `samples/01-valid/zip/charting/v1.zip` - `v5.zip` | Valid multi-file projects |
| `samples/03-edge-cases/zip/multi-page-site.zip` | No index.html edge case |
| `samples/04-invalid/wrong-type/presentation-with-video.zip` | Forbidden file types |
| `samples/04-invalid/too-large/huge.zip` | Size limit (generated) |

---

## Testing Requirements

### Test Categories

1. **Unit Tests** (in `/app/convex/__tests__/zip-upload.test.ts`)
   - `validateZipSize` function
   - `isForbiddenExtension` function
   - Entry point detection logic

2. **Integration Tests** (in same file)
   - Full `createArtifactWithZip` flow
   - Full `addZipVersion` flow
   - ZIP processing with actual sample files
   - Permission enforcement

### Running Tests

```bash
cd app
npm test -- --grep "ZIP"
```

---

## Success Criteria

- [ ] ZIP files validate size < 50MB before upload
- [ ] ZIP files validate file count < 500
- [ ] Forbidden file extensions are rejected
- [ ] Artifacts and versions created correctly
- [ ] Entry point (index.html) detected correctly
- [ ] All files extracted to artifactFiles table
- [ ] MIME types assigned correctly
- [ ] Only owner can add versions (write permission)
- [ ] Processing errors are handled gracefully (version soft-deleted)
- [ ] All Phase 1 tests pass

---

## Implementation Order (Recommended)

1. Step 1.1: Add validation constants to fileTypes.ts
2. Step 1.2: Update createArtifactWithZip with validation
3. Step 1.3: Add addZipVersion mutation
4. Step 1.4: Update zipProcessor with validation
5. Step 1.5: Improve error handling in mutations
6. Step 1.6: Add write permission helper
7. Step 1.7: Write and run Phase 1 tests

---

## Notes

- Validation happens at two stages: (1) before upload (size check), (2) during processing (file count, extensions, individual file sizes)
- Original ZIP is deleted from storage after successful extraction
- Failed processing soft-deletes the version to prevent partial artifacts
- Entry point detection follows a strict priority order for consistency

---

**Author:** Claude (Software Architect Agent)
**Last Updated:** 2025-12-31
