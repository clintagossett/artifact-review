# Task 00018: Refine Single-File Artifact Upload and Versioning

**GitHub Issue:** #18

**Status:** 🚧 In Progress

---

## Objective

Refine and perfect the architecture and process for **single-file artifacts (HTML and Markdown)** including upload flow, storage, retrieval, versioning, and permissions.

**Scope:** HTML and Markdown artifacts only. Multi-file ZIP artifacts are explicitly out of scope and will be addressed in a separate task.

## Scope Definition

### ✅ In Scope: Single-File Artifacts

**File Types:**
- HTML artifacts (`fileType: "html"`, stored in `htmlContent` field)
- Markdown artifacts (`fileType: "markdown"`, stored in `markdownContent` field)

**Areas to Perfect:**
1. **Upload Flow** - How users create and upload HTML/Markdown artifacts
2. **Storage** - How content is stored (inline in database)
3. **Retrieval** - How versions are fetched and served
4. **Versioning** - Creating new versions, version metadata, authorship
5. **Permissions** - Who can create/view/edit/delete versions

### ❌ Out of Scope: Multi-File Artifacts

**Deferred to separate task:**
- ZIP artifacts (`fileType: "zip"`)
- File extraction and processing (`zipProcessor.ts`)
- Multi-file storage (`artifactFiles` table)
- ZIP serving via HTTP routes

**Rationale:** Perfect the simpler single-file case first, but design with forward-compatibility for ZIP artifacts in mind. The patterns we establish here (versioning, permissions, authorship) should naturally extend to multi-file artifacts.

**Design Principle:** Any schema changes, permission models, or architectural decisions made for single-file artifacts must work equally well when we add ZIP support later.

---

## Problem Statement

The current implementation has a **fundamentally flawed data model** that needs to be fixed:

### 🚨 PRIMARY ISSUE: Type-Specific Content Fields (Wrong Design)

**Current Schema (WRONG):**
```typescript
artifactVersions {
  fileType: "html" | "markdown" | "zip",
  htmlContent?: string,      // ❌ Type-specific field
  markdownContent?: string,  // ❌ Type-specific field
  entryPoint?: string,       // ❌ Only used for ZIP
}
```

**Problems:**
1. **Not Extensible** - Adding a new file type requires schema change
2. **Inconsistent** - Different storage pattern for each type
3. **Fragile** - Must maintain type-specific logic everywhere
4. **Type-Unsafe** - Nothing prevents HTML content in markdownContent field

**Correct Approach:**
```typescript
artifactVersions {
  fileType: "html" | "markdown" | "zip",  // Extensible union
  entryPoint: string,  // ALWAYS points to content location
  // For single-file: Point to storage ID or use special marker
  // For multi-file: Path like "index.html"
}
```

**Benefits:**
1. ✅ Unified model - All types use same pattern
2. ✅ Extensible - Add new types without schema changes
3. ✅ Consistent - Same retrieval logic for all types
4. ✅ Forward-compatible - Naturally extends to ZIP

### Secondary Issues:

2. **Version Authorship**: No tracking of who created each version
3. **Permission Checks**: Inconsistent - mutations check auth, queries don't
4. **Version Metadata**: No description/changelog for versions

## Proposed Unified Storage Model

### Current (Wrong) vs Proposed (Correct)

**❌ CURRENT - Type-Specific Fields:**
```typescript
artifactVersions {
  fileType: "html" | "markdown" | "zip",
  htmlContent?: string,      // Only for HTML
  markdownContent?: string,  // Only for Markdown
  entryPoint?: string,       // Only for ZIP
  fileSize: number,
}
// Problem: Each type has different storage pattern
```

**✅ PROPOSED - Unified File Storage (artifactFiles for everything):**
```typescript
artifactVersions {
  fileType: "html" | "markdown" | "zip" | "pdf" | ...,  // Infinitely extensible
  authorId: v.id("users"),    // NEW: Who created this version
  description?: string,       // NEW: Version notes
  versionNumber: number,      // Existing

  entryPoint: string,         // Path to main file in artifactFiles
  fileSize: number,           // Total size (sum of all files)

  // NO type-specific fields!
  // NO inline content storage!
}

artifactFiles {  // Used for ALL file types (single and multi-file)
  versionId: Id<"artifactVersions">,
  filePath: string,        // Relative path: "index.html", "style.css", etc.
  storageId: Id<"_storage">,  // Convex file storage reference
  mimeType: string,        // "text/html", "text/markdown", etc.
  fileSize: number,
  isDeleted: boolean,
  deletedAt?: number,
}
```

### How It Works (Unified Pattern)

**Single-File HTML:**
1. Upload: User uploads `dashboard.html`
2. Storage: Store in Convex file storage → `storageId`
3. Database:
   - `artifactVersions`: `entryPoint = "index.html"`, `fileType = "html"`
   - `artifactFiles`: One row: `filePath = "index.html"`, `storageId = ...`
4. Retrieval: Lookup `artifactFiles` where `filePath = entryPoint` ("index.html")

**Single-File Markdown:**
1. Upload: User uploads `README.md`
2. Storage: Store in Convex file storage → `storageId`
3. Database:
   - `artifactVersions`: `entryPoint = "README.md"`, `fileType = "markdown"`
   - `artifactFiles`: One row: `filePath = "README.md"`, `storageId = ...`
4. Retrieval: Lookup `artifactFiles` where `filePath = entryPoint` ("README.md")

**Multi-File ZIP:**
1. Upload: User uploads `site.zip`
2. Extraction: Extract files → store each in Convex file storage
3. Database:
   - `artifactVersions`: `entryPoint = "index.html"`, `fileType = "zip"`
   - `artifactFiles`: Multiple rows (one per extracted file)
4. Retrieval: Lookup `artifactFiles` where `filePath = entryPoint` ("index.html")

**Future (PDF, JSON, etc.):**
- Same pattern - store file in `artifactFiles`, set `entryPoint`
- No schema changes needed!

### Benefits

**Unified Pattern:**
- ✅ ALL file types use `artifactFiles` table (no special cases)
- ✅ Same retrieval logic for everything
- ✅ No inline content fields cluttering schema
- ✅ Single-file and multi-file are identical patterns

**Extensibility:**
- ✅ Add new file types by adding to `fileType` union (trivial change)
- ✅ No new fields needed per file type
- ✅ Support ANY file extension via `filePath` + `mimeType`

**Migration Path:**
- ✅ Easy to convert single-file to multi-file (just add more `artifactFiles` rows)
- ✅ Can attach assets to HTML/Markdown later (CSS, images, etc.)

---

## Current State Analysis

### Schema (convex/schema.ts)

**artifactVersions table (current):**
```typescript
{
  artifactId: Id<"artifacts">,
  versionNumber: number,  // Sequential, starts at 1
  fileType: "zip" | "html" | "markdown",
  htmlContent?: string,
  markdownContent?: string,
  entryPoint?: string,
  fileSize: number,
  isDeleted: boolean,
  deletedAt?: number,
  createdAt: number,
  // ❌ Missing: authorId (who created this version)
  // ❌ Missing: status (draft/published)
  // ❌ Missing: description (version notes/changelog)
}
```

**Indexes:**
- `by_artifact` - All versions for artifact
- `by_artifact_active` - Active versions only
- `by_artifact_version` - Lookup specific version number

### Permission Model (convex/sharing.ts)

**Current permission levels (artifact-level only):**
- `owner` - Artifact creator (from `artifacts.creatorId`)
- `can-comment` - Invited reviewers (from `artifactReviewers` table)
- `null` - No access

**Permission boundaries:**
| Operation | Owner | Reviewer | Public |
|-----------|-------|----------|--------|
| View artifact | ✅ | ✅ | ✅ (via shareToken) |
| Create version | ✅ | ❌ | ❌ |
| Delete version | ✅ | ❌ | ❌ |
| Add comments | ✅ | ✅ | ❌ |
| Invite reviewers | ✅ | ❌ | ❌ |

### Version Operations (convex/artifacts.ts)

**Create Operations:**
- `artifacts.create` - Creates artifact + version 1 (owner only)
- `artifacts.addVersion` - Adds new version (owner only)

**Read Operations:**
- `artifacts.getVersion` - Get version by ID (no auth check!)
- `artifacts.getVersionByNumber` - Get by artifact + version number (no auth check!)
- `artifacts.getVersions` - List all versions for artifact (no auth check!)
- `artifacts.getLatestVersion` - Get highest version number (no auth check!)

**Delete Operations:**
- `artifacts.softDelete` - Delete artifact (cascades to versions)
- `artifacts.softDeleteVersion` - Delete specific version (owner only, prevents last version deletion)

### Issues Identified

#### 1. **No Version Authorship Tracking**
```typescript
// Current: No way to know WHO created a version
await ctx.db.insert("artifactVersions", {
  artifactId,
  versionNumber: 1,
  // ❌ Missing: authorId field
});

// Problem: Can't attribute versions to specific users
// Use case: Reviewer uploads new version after feedback
```

#### 2. **Inconsistent Permission Checks**
```typescript
// artifacts.addVersion - Has auth check ✅
if (artifact.creatorId !== userId) {
  throw new Error("Not authorized");
}

// artifacts.getVersion - NO auth check ❌
// Anyone can read any version if they know the ID!
```

#### 3. **No Version Lifecycle States**
```typescript
// Current: Only isDeleted flag
// Missing: draft, published, archived states
// Use case: Draft versions visible only to author until published
```

#### 4. **Permission Model Gaps**
- Who can create versions? (currently: owner only)
  - Should reviewers be able to upload revised versions?
  - Should there be "can-edit" permission level?
- Who can view versions? (currently: everyone with shareToken)
  - Should draft versions be restricted?
  - Should specific versions be private?

#### 5. **Missing Version Metadata**
```typescript
// No description/changelog field
// No parent version tracking (for version history)
// No approval/review status
```

---

## Proposed Refinements

### Phase 1: Add Version Authorship

**Goal:** Track who created each version

**Schema Changes:**
```typescript
artifactVersions: defineTable({
  // ... existing fields
  authorId: v.id("users"),  // NEW: Who created this version
  description: v.optional(v.string()),  // NEW: Version notes/changelog
})
  .index("by_author", ["authorId"])  // NEW: List versions by author
```

**Migration:**
- Backfill existing versions with `authorId = artifact.creatorId`

**Benefits:**
- Attribution for version uploads
- Enables "who uploaded what" tracking
- Foundation for version-level permissions

### Phase 2: Define Permission Model

**Decision Points:**

**A. Who can create versions?**
- Option 1: Owner only (current behavior) ✅ **RECOMMENDED**
- Option 2: Owner + reviewers with "can-edit" permission
- Option 3: Anyone with "can-comment" permission

**B. Who can view versions?**
- Option 1: Same as artifact access (shareToken) ✅ **RECOMMENDED**
- Option 2: Version-level privacy controls
- Option 3: Draft versions restricted to author + owner

**C. Who can delete versions?**
- Option 1: Owner only (current behavior) ✅ **KEEP**
- Option 2: Version author can delete own versions
- Option 3: Owner + version author

**Recommendation: Start Simple**
- Keep current permission model (owner creates/deletes, shareToken views)
- Add authorship tracking for attribution
- Defer advanced permissions (can-edit, draft states) to future

### Phase 3: Add Permission Checks

**Queries needing auth checks:**
```typescript
// artifacts.getVersion - Should check artifact access
// artifacts.getVersionByNumber - Should check artifact access
// artifacts.getVersions - Should check artifact access
```

**Implementation:**
```typescript
// Helper: Check if user can access artifact
async function canAccessArtifact(
  ctx: QueryCtx,
  artifactId: Id<"artifacts">
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  const artifact = await ctx.db.get(artifactId);

  if (!artifact || artifact.isDeleted) return false;

  // Owner has access
  if (userId && artifact.creatorId === userId) return true;

  // Reviewers have access
  if (userId) {
    const reviewer = await ctx.db
      .query("artifactReviewers")
      .withIndex("by_artifact_active", q =>
        q.eq("artifactId", artifactId).eq("isDeleted", false)
      )
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    if (reviewer) return true;
  }

  // Public access via shareToken (already have artifact)
  return true;
}
```

### Phase 4: Backend Tests

**Test Coverage:**
- Version authorship tracking
- Permission checks on all queries
- Backfill migration correctness

---

## Implementation Plan

### Subtask 1: Architect Review (In Progress)
**Location:** `tasks/00018-refine-version-model-permissions/IMPLEMENTATION-OVERVIEW.md`

**Status:** 🔄 Background agent analyzing architecture

**Deliverables:**
- Comprehensive implementation overview document
- Data flow diagrams for upload/storage/retrieval
- Current state assessment
- Specific recommendations for single-file artifacts

### Subtask 2: Review Upload Flow for Single-File Artifacts
**Location:** `tasks/00018-refine-version-model-permissions/02-upload-flow-analysis/`

**Deliverables:**
- Analysis of current HTML/Markdown upload UI and UX
- Validation rules and error handling
- File size limits and content checks
- Upload flow diagram (user action → backend → storage)

**Key Files:**
- `app/src/hooks/useArtifactUpload.ts` - Upload hook
- `app/src/components/artifacts/NewArtifactDialog.tsx` - Upload UI
- `app/convex/artifacts.ts` - Create/addVersion mutations

### Subtask 3: Design Permission Model (ADR)
**Location:** `tasks/00018-refine-version-model-permissions/03-adr-permission-model/`

**Deliverables:**
- ADR documenting permission decisions for single-file artifacts
- Diagrams showing permission flow
- Edge case analysis

**Key Decisions:**
1. Who can create versions? (HTML/Markdown only)
2. Who can view versions?
3. Who can delete versions?
4. Do we need draft/published states now?
5. Do we need "can-edit" permission level?

### Subtask 2: Schema Updates
**Location:** `tasks/00018-refine-version-model-permissions/02-schema-updates/`

**Deliverables:**
- Update `convex/schema.ts` with new fields
- Create migration script for backfilling authorId
- Update TypeScript types

**Schema Changes:**
```typescript
artifactVersions: defineTable({
  // ... existing fields
  authorId: v.id("users"),
  description: v.optional(v.string()),
})
  .index("by_author", ["authorId"])
  .index("by_artifact_author", ["artifactId", "authorId"])
```

### Subtask 3: Update Version Operations
**Location:** `tasks/00018-refine-version-model-permissions/03-update-operations/`

**Deliverables:**
- Update `artifacts.create` to set authorId
- Update `artifacts.addVersion` to set authorId
- Add permission helper functions
- Add auth checks to all queries

**Files to modify:**
- `convex/artifacts.ts` - Add authorId to version creation
- `convex/lib/versionPermissions.ts` (NEW) - Permission helpers
- `convex/sharing.ts` - Update getUserPermission if needed

### Subtask 4: Backend Tests
**Location:** `tasks/00018-refine-version-model-permissions/04-backend-tests/`

**Deliverables:**
- Unit tests for permission helpers
- Integration tests for version CRUD
- Edge case tests (last version, deleted artifacts, etc.)

**Test Coverage:**
- ✅ Version authorship set correctly
- ✅ Permission checks prevent unauthorized access
- ✅ Owner can create/delete versions
- ✅ Reviewers can view but not create/delete
- ✅ Public users can view via shareToken
- ✅ Cannot delete last active version

### Subtask 5: Migration & Deployment
**Location:** `tasks/00018-refine-version-model-permissions/05-migration/`

**Deliverables:**
- Migration script to backfill authorId
- Deployment plan
- Rollback strategy

**Migration Steps:**
1. Deploy schema changes (authorId optional initially)
2. Run backfill script: `authorId = artifact.creatorId`
3. Verify all versions have authorId
4. Make authorId required in schema
5. Deploy updated operations

---

## Out of Scope (Future Tasks)

### Deferred: Multi-File Artifacts (Task 19+)
- ZIP artifact upload and processing
- Multi-file storage and serving
- File extraction logic
- ZIP-specific permissions

### Deferred: Advanced Features (Later)
1. **Version Lifecycle States**: Draft, published, archived states
2. **Version Comparison**: Diff view between versions
3. **Version Approval Workflow**: Owner approves reviewer-submitted versions
4. **"Can-Edit" Permission**: Reviewers who can upload new versions
5. **Version-Level Privacy**: Hide specific versions from reviewers
6. **Parent Version Tracking**: Track version lineage/branching

---

## Success Criteria

- [x] GitHub issue created (#18)
- [x] Task folder created (00018)
- [x] Current state analyzed
- [ ] ADR written for permission model
- [ ] Schema updated with authorId field
- [ ] All version operations set authorId
- [ ] Permission checks added to all queries
- [ ] Backend tests cover all scenarios (target: 100% test coverage)
- [ ] Migration script tested and deployed
- [ ] Documentation updated

---

## References

- **Current Schema:** `app/convex/schema.ts`
- **Sharing/Permissions:** `app/convex/sharing.ts`
- **Artifact Operations:** `app/convex/artifacts.ts`
- **ADR Template:** `docs/architecture/decisions/XXXX-template.md`
- **Related:** Task 00017 (Commenting - shows permission model in practice)

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Add authorId to versions | Attribution needed for multi-user collaboration | 2025-12-31 |
| Keep simple permission model initially | Avoid over-engineering before user validation | 2025-12-31 |
| Defer draft/published states | Not critical for MVP, add when needed | 2025-12-31 |
| Add auth checks to all version queries | Security: prevent unauthorized version access | 2025-12-31 |

---

**Next Step:** Create Subtask 1 (ADR for permission model)
