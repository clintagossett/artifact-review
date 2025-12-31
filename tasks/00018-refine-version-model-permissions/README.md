# Task 00018: Refine Document Version Model and Permissioning

**GitHub Issue:** #18

**Status:** 🚧 In Progress

---

## Objective

Refine the artifact version model and permission system to support robust version management, proper access controls, and clear ownership semantics.

## Problem Statement

The current implementation has basic version support but lacks:

1. **Version Lifecycle Management**: No concept of draft, published, or archived states
2. **Version Authorship**: No tracking of who created each version (assumes artifact owner)
3. **Permission Inheritance**: Permission model exists at artifact level but unclear how it applies to versions
4. **Version-Level Permissions**: No way to control who can create/view/delete specific versions
5. **Missing Validation**: No checks for version authorship or creation permissions

## Current State Analysis

### Schema (convex/schema.ts)

**artifactVersions table:**
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

### Subtask 1: Design Permission Model (ADR)
**Location:** `tasks/00018-refine-version-model-permissions/01-adr-permission-model/`

**Deliverables:**
- ADR documenting permission decisions
- Diagrams showing permission flow
- Edge case analysis

**Key Decisions:**
1. Who can create versions?
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
