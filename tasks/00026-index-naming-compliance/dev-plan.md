# Dev Plan: Index Naming Compliance

**Task:** 00026-index-naming-compliance
**Date:** 2026-01-03
**ADR Reference:** ADR-0012 - Backend Naming Conventions

## ADR-0012 Index Naming Convention

```
Pattern: by_[camelCaseField]_[camelCaseField]
```

**Rules:**
1. Preserve camelCase field names (do NOT convert to snake_case)
2. Underscore only as separator between fields
3. `_active` suffix for soft-delete filtering (`isDeleted` field)

**Examples:**
- Single field: `by_createdBy` (not `by_created_by`)
- Compound: `by_artifactId_number` (not `by_artifact_version`)
- Soft-delete: `by_createdBy_active` (not `by_created_by_active`)

---

## Email Index Investigation

**Investigation Date:** 2026-01-03

### Summary

The `email` index on the `users` table **CANNOT be renamed to `by_email`** because the `@convex-dev/auth` library has hardcoded dependencies on this exact index name.

### Evidence

1. **Schema Definition in `@convex-dev/auth`:**
   - File: `app/node_modules/@convex-dev/auth/src/server/implementation/types.ts` (line 49)
   - Code: `.index("email", ["email"])`
   - The `authTables` export defines the users table with an index named exactly `"email"`

2. **Runtime Usage in `@convex-dev/auth`:**
   - File: `app/node_modules/@convex-dev/auth/src/server/implementation/users.ts` (line 169)
   - Code: `.withIndex("email", (q) => q.eq("email", email))`
   - The `uniqueUserWithVerifiedEmail` function uses this index to find existing users by email during account creation/linking

3. **Application Code Using the Index:**
   | File | Line | Purpose |
   |------|------|---------|
   | `app/convex/auth.ts` | 62 | `createOrUpdateUser` callback for account linking |
   | `app/convex/users.ts` | 71 | `getByEmail` query for user lookup |
   | `app/convex/sharing.ts` | 77 | `inviteReviewer` to check if user exists |

### Impact of Renaming

If the `email` index were renamed to `by_email`:
- **Authentication would break** - The `@convex-dev/auth` library would fail when trying to look up users by email during sign-in
- **Account linking would fail** - New users with existing invitations would not be properly linked
- **Magic link auth would break** - Email verification flow depends on this lookup

### Decision

**OUT OF SCOPE** - The `email` index on the `users` table must remain named `"email"` to maintain compatibility with the `@convex-dev/auth` library.

This is an acceptable exception to ADR-0012's naming convention because:
1. The index is defined and used by a third-party library we do not control
2. Changing it would require forking the auth library
3. The `users` table is fundamentally managed by Convex Auth

### Files Confirmed OUT OF SCOPE

These files use `withIndex("email", ...)` and must NOT be modified:

| File | Reason |
|------|--------|
| `app/convex/auth.ts` | Convex Auth callback - uses `email` index |
| `app/convex/users.ts` | Uses `email` index for user lookup |
| `app/convex/sharing.ts` | Uses `email` index (lines 77) - **keep as-is** |
| `app/convex/__tests__/magicLinkAuth.test.ts` | Tests auth functionality |
| `app/convex/__tests__/passwordAuth.test.ts` | Tests auth functionality |
| `app/__tests__/convex/magicLinkAuth.test.ts` | Tests auth functionality |
| `app/__tests__/convex/passwordAuth.test.ts` | Tests auth functionality |

---

## Index Rename Mapping

### users table - OUT OF SCOPE

**DO NOT MODIFY** - Managed by Convex Auth. The `email` index is required by the auth library.

### artifacts table

| Current Index | Fields | Compliant Name | Change Needed |
|--------------|--------|----------------|---------------|
| `by_created_by` | `["createdBy"]` | `by_createdBy` | Yes |
| `by_created_by_active` | `["createdBy", "isDeleted"]` | `by_createdBy_active` | Yes |
| `by_share_token` | `["shareToken"]` | `by_shareToken` | Yes |

### artifactVersions table

| Current Index | Fields | Compliant Name | Change Needed |
|--------------|--------|----------------|---------------|
| `by_artifact` | `["artifactId"]` | `by_artifactId` | Yes |
| `by_artifact_active` | `["artifactId", "isDeleted"]` | `by_artifactId_active` | Yes |
| `by_artifact_version` | `["artifactId", "number"]` | `by_artifactId_number` | Yes |
| `by_created_by` | `["createdBy"]` | `by_createdBy` | Yes |

### artifactFiles table

| Current Index | Fields | Compliant Name | Change Needed |
|--------------|--------|----------------|---------------|
| `by_version` | `["versionId"]` | `by_versionId` | Yes |
| `by_version_path` | `["versionId", "filePath"]` | `by_versionId_filePath` | Yes |
| `by_version_active` | `["versionId", "isDeleted"]` | `by_versionId_active` | Yes |

### artifactReviewers table

| Current Index | Fields | Compliant Name | Change Needed |
|--------------|--------|----------------|---------------|
| `by_artifact` | `["artifactId"]` | `by_artifactId` | Yes |
| `by_artifact_active` | `["artifactId", "isDeleted"]` | `by_artifactId_active` | Yes |
| `by_artifact_email` | `["artifactId", "email"]` | `by_artifactId_email` | Yes |
| `by_email` | `["email"]` | `by_email` | No |
| `by_user` | `["userId"]` | `by_userId` | Yes |

### comments table

| Current Index | Fields | Compliant Name | Change Needed |
|--------------|--------|----------------|---------------|
| `by_version_active` | `["versionId", "isDeleted"]` | `by_versionId_active` | Yes |
| `by_version` | `["versionId"]` | `by_versionId` | Yes |
| `by_created_by` | `["createdBy"]` | `by_createdBy` | Yes |
| `by_created_by_active` | `["createdBy", "isDeleted"]` | `by_createdBy_active` | Yes |

### commentReplies table

| Current Index | Fields | Compliant Name | Change Needed |
|--------------|--------|----------------|---------------|
| `by_comment_active` | `["commentId", "isDeleted"]` | `by_commentId_active` | Yes |
| `by_comment` | `["commentId"]` | `by_commentId` | Yes |
| `by_created_by` | `["createdBy"]` | `by_createdBy` | Yes |
| `by_created_by_active` | `["createdBy", "isDeleted"]` | `by_createdBy_active` | Yes |

---

## Summary of Changes

| Rename Pattern | Count | Tables Affected |
|---------------|-------|-----------------|
| `by_created_by` -> `by_createdBy` | 4 | artifacts, artifactVersions, comments, commentReplies |
| `by_created_by_active` -> `by_createdBy_active` | 3 | artifacts, comments, commentReplies |
| `by_artifact` -> `by_artifactId` | 2 | artifactVersions, artifactReviewers |
| `by_artifact_active` -> `by_artifactId_active` | 2 | artifactVersions, artifactReviewers |
| `by_artifact_version` -> `by_artifactId_number` | 1 | artifactVersions |
| `by_artifact_email` -> `by_artifactId_email` | 1 | artifactReviewers |
| `by_version` -> `by_versionId` | 2 | artifactFiles, comments |
| `by_version_active` -> `by_versionId_active` | 2 | artifactFiles, comments |
| `by_version_path` -> `by_versionId_filePath` | 1 | artifactFiles |
| `by_share_token` -> `by_shareToken` | 1 | artifacts |
| `by_user` -> `by_userId` | 1 | artifactReviewers |
| `by_comment` -> `by_commentId` | 1 | commentReplies |
| `by_comment_active` -> `by_commentId_active` | 1 | commentReplies |

**Total indexes to rename:** 22

**Out of scope:** `users.email` (Convex Auth managed)

---

## Code Changes Required

### schema.ts (app/convex/schema.ts)

#### users table - OUT OF SCOPE (Convex Auth)

#### artifacts table
- Line 217: `.index("by_created_by", ["createdBy"])` -> `.index("by_createdBy", ["createdBy"])`
- Line 224: `.index("by_created_by_active", ["createdBy", "isDeleted"])` -> `.index("by_createdBy_active", ["createdBy", "isDeleted"])`
- Line 232: `.index("by_share_token", ["shareToken"])` -> `.index("by_shareToken", ["shareToken"])`

#### artifactVersions table
- Line 353: `.index("by_artifact", ["artifactId"])` -> `.index("by_artifactId", ["artifactId"])`
- Line 360: `.index("by_artifact_active", ["artifactId", "isDeleted"])` -> `.index("by_artifactId_active", ["artifactId", "isDeleted"])`
- Line 368: `.index("by_artifact_version", ["artifactId", "number"])` -> `.index("by_artifactId_number", ["artifactId", "number"])`
- Line 376: `.index("by_created_by", ["createdBy"])` -> `.index("by_createdBy", ["createdBy"])`

#### artifactFiles table
- Line 470: `.index("by_version", ["versionId"])` -> `.index("by_versionId", ["versionId"])`
- Line 477: `.index("by_version_path", ["versionId", "filePath"])` -> `.index("by_versionId_filePath", ["versionId", "filePath"])`
- Line 484: `.index("by_version_active", ["versionId", "isDeleted"])` -> `.index("by_versionId_active", ["versionId", "isDeleted"])`

#### artifactReviewers table
- Line 575: `.index("by_artifact", ["artifactId"])` -> `.index("by_artifactId", ["artifactId"])`
- Line 582: `.index("by_artifact_active", ["artifactId", "isDeleted"])` -> `.index("by_artifactId_active", ["artifactId", "isDeleted"])`
- Line 589: `.index("by_artifact_email", ["artifactId", "email"])` -> `.index("by_artifactId_email", ["artifactId", "email"])`
- Line 603: `.index("by_user", ["userId"])` -> `.index("by_userId", ["userId"])`

#### comments table
- Line 726: `.index("by_version_active", ["versionId", "isDeleted"])` -> `.index("by_versionId_active", ["versionId", "isDeleted"])`
- Line 733: `.index("by_version", ["versionId"])` -> `.index("by_versionId", ["versionId"])`
- Line 740: `.index("by_created_by", ["createdBy"])` -> `.index("by_createdBy", ["createdBy"])`
- Line 747: `.index("by_created_by_active", ["createdBy", "isDeleted"])` -> `.index("by_createdBy_active", ["createdBy", "isDeleted"])`

#### commentReplies table
- Line 836: `.index("by_comment_active", ["commentId", "isDeleted"])` -> `.index("by_commentId_active", ["commentId", "isDeleted"])`
- Line 843: `.index("by_comment", ["commentId"])` -> `.index("by_commentId", ["commentId"])`
- Line 850: `.index("by_created_by", ["createdBy"])` -> `.index("by_createdBy", ["createdBy"])`
- Line 857: `.index("by_created_by_active", ["createdBy", "isDeleted"])` -> `.index("by_createdBy_active", ["createdBy", "isDeleted"])`

---

### artifacts.ts (app/convex/artifacts.ts)

- Line 271: `.withIndex("by_version_active", ...)` -> `.withIndex("by_versionId_active", ...)`
- Line 305: `.withIndex("by_share_token", ...)` -> `.withIndex("by_shareToken", ...)`
- Line 347: `.withIndex("by_created_by_active", ...)` -> `.withIndex("by_createdBy_active", ...)`
- Line 469: `.withIndex("by_artifact", ...)` -> `.withIndex("by_artifactId", ...)`
- Line 596: `.withIndex("by_artifact", ...)` -> `.withIndex("by_artifactId", ...)`
- Line 610: `.withIndex("by_version", ...)` -> `.withIndex("by_versionId", ...)`
- Line 663: `.withIndex("by_artifact_active", ...)` -> `.withIndex("by_artifactId_active", ...)`
- Line 684: `.withIndex("by_version", ...)` -> `.withIndex("by_versionId", ...)`
- Line 734: `.withIndex("by_artifact_active", ...)` -> `.withIndex("by_artifactId_active", ...)`
- Line 795: `.withIndex("by_artifact_version", ...)` -> `.withIndex("by_artifactId_number", ...)`
- Line 858: `.withIndex("by_artifact_active", ...)` -> `.withIndex("by_artifactId_active", ...)`
- Line 903: `.withIndex("by_version_active", ...)` -> `.withIndex("by_versionId_active", ...)`
- Line 936: `.withIndex("by_version_path", ...)` -> `.withIndex("by_versionId_filePath", ...)`
- Line 982: `.withIndex("by_artifact_version", ...)` -> `.withIndex("by_artifactId_number", ...)`
- Line 1063: `.withIndex("by_share_token", ...)` -> `.withIndex("by_shareToken", ...)`
- Line 1110: `.withIndex("by_version_path", ...)` -> `.withIndex("by_versionId_filePath", ...)`
- Line 1257: `.withIndex("by_artifact_active", ...)` -> `.withIndex("by_artifactId_active", ...)`

---

### sharing.ts (app/convex/sharing.ts)

**In Scope:**
- Line 65: `.withIndex("by_artifact_email", ...)` -> `.withIndex("by_artifactId_email", ...)`
- Line 151: `.withIndex("by_artifact_active", ...)` -> `.withIndex("by_artifactId_active", ...)`
- Line 258: `.withIndex("by_artifact_active", ...)` -> `.withIndex("by_artifactId_active", ...)`
- Line 290: `.withIndex("by_email", ...)` - **NO CHANGE** (artifactReviewers table, already compliant)

**Out of Scope (Convex Auth):**
- Line 77: `.withIndex("email", ...)` - **DO NOT CHANGE** (users table, required by @convex-dev/auth)

---

### auth.ts - OUT OF SCOPE (Convex Auth)

**DO NOT MODIFY** - Line 62 uses `withIndex("email", ...)` which is required by the auth library.

---

### users.ts - OUT OF SCOPE (Convex Auth)

**DO NOT MODIFY** - Line 71 uses `withIndex("email", ...)` for user lookup by email.

### comments.ts (app/convex/comments.ts)

- Line 58: `.withIndex("by_version_active", ...)` -> `.withIndex("by_versionId_active", ...)`
- Line 72: `.withIndex("by_comment_active", ...)` -> `.withIndex("by_commentId_active", ...)`
- Line 120: `.withIndex("by_artifact_active", ...)` -> `.withIndex("by_artifactId_active", ...)`
- Line 291: `.withIndex("by_comment", ...)` -> `.withIndex("by_commentId", ...)`

---

### commentReplies.ts (app/convex/commentReplies.ts)

- Line 61: `.withIndex("by_comment_active", ...)` -> `.withIndex("by_commentId_active", ...)`

---

### zipUpload.ts (app/convex/zipUpload.ts)

- Line 112: `.withIndex("by_artifact", ...)` -> `.withIndex("by_artifactId", ...)`

---

### lib/permissions.ts (app/convex/lib/permissions.ts)

- Line 50: `.withIndex("by_artifact_active", ...)` -> `.withIndex("by_artifactId_active", ...)`
- Line 105: `.withIndex("by_share_token", ...)` -> `.withIndex("by_shareToken", ...)`

---

### lib/commentPermissions.ts (app/convex/lib/commentPermissions.ts)

- Line 59: `.withIndex("by_artifact_active", ...)` -> `.withIndex("by_artifactId_active", ...)`

---

## Test Files to Update

### app/convex/__tests__/softDeletion.test.ts
- Line 56: `.withIndex("by_artifact", ...)` -> `.withIndex("by_artifactId", ...)`

### app/convex/__tests__/zip-multi-level-nesting.test.ts
- Line 223: `.withIndex("by_version_active", ...)` -> `.withIndex("by_versionId_active", ...)`

### app/convex/__tests__/magicLinkAuth.test.ts - OUT OF SCOPE (Convex Auth)

### app/convex/__tests__/passwordAuth.test.ts - OUT OF SCOPE (Convex Auth)

### app/convex/__tests__/sharing.test.ts
- Line 889: `.withIndex("by_user", ...)` -> `.withIndex("by_userId", ...)`
- Line 994: `.withIndex("by_user", ...)` -> `.withIndex("by_userId", ...)`

### app/convex/__tests__/zip-backend-integration.test.ts
- Line 202: `.withIndex("by_version_active", ...)` -> `.withIndex("by_versionId_active", ...)`
- Line 284: `.withIndex("by_version_active", ...)` -> `.withIndex("by_versionId_active", ...)`
- Line 348: `.withIndex("by_version_active", ...)` -> `.withIndex("by_versionId_active", ...)`
- Line 515: `.withIndex("by_artifact", ...)` -> `.withIndex("by_artifactId", ...)`
- Line 527: `.withIndex("by_version_active", ...)` -> `.withIndex("by_versionId_active", ...)`

### app/convex/__tests__/comments.test.ts
- Line 1118: `.withIndex("by_comment", ...)` -> `.withIndex("by_commentId", ...)`
- Line 1148: `.withIndex("by_comment", ...)` -> `.withIndex("by_commentId", ...)`
- Line 1980: `.withIndex("by_comment", ...)` -> `.withIndex("by_commentId", ...)`

### app/convex/__tests__/phase1-zip-storage.test.ts
- Line 528: `.withIndex("by_version_active", ...)` -> `.withIndex("by_versionId_active", ...)`

### app/__tests__/convex/softDeletion.test.ts
- Line 58: `.withIndex("by_artifact", ...)` -> `.withIndex("by_artifactId", ...)`

### app/__tests__/convex/magicLinkAuth.test.ts - OUT OF SCOPE (Convex Auth)

### app/__tests__/convex/sharing.test.ts
- Line 889: `.withIndex("by_user", ...)` -> `.withIndex("by_userId", ...)`
- Line 994: `.withIndex("by_user", ...)` -> `.withIndex("by_userId", ...)`

### app/__tests__/convex/passwordAuth.test.ts - OUT OF SCOPE (Convex Auth)

---

## Schema Comment Updates

The schema.ts file contains JSDoc comments with `@example` blocks showing withIndex usage. All of these must also be updated:

- Line 113: `withIndex("email", ...)` example
- Line 215: `withIndex("by_created_by", ...)` example
- Line 222: `withIndex("by_created_by_active", ...)` example
- Line 230: `withIndex("by_share_token", ...)` example
- Line 351: `withIndex("by_artifact", ...)` example
- Line 358: `withIndex("by_artifact_active", ...)` example
- Line 366: `withIndex("by_artifact_version", ...)` example
- Line 374: `withIndex("by_created_by", ...)` example
- Line 468: `withIndex("by_version", ...)` example
- Line 475: `withIndex("by_version_path", ...)` example
- Line 482: `withIndex("by_version_active", ...)` example
- Line 573: `withIndex("by_artifact", ...)` example
- Line 580: `withIndex("by_artifact_active", ...)` example
- Line 587: `withIndex("by_artifact_email", ...)` example
- Line 594: `withIndex("by_email", ...)` example (NO CHANGE)
- Line 601: `withIndex("by_user", ...)` example
- Line 724: `withIndex("by_version_active", ...)` example
- Line 731: `withIndex("by_version", ...)` example
- Line 738: `withIndex("by_created_by", ...)` example
- Line 745: `withIndex("by_created_by_active", ...)` example
- Line 834: `withIndex("by_comment_active", ...)` example
- Line 841: `withIndex("by_comment", ...)` example
- Line 848: `withIndex("by_created_by", ...)` example
- Line 855: `withIndex("by_created_by_active", ...)` example

---

## Execution Order

### Out of Scope

**DO NOT MODIFY** any Convex Auth tables or references:
- `users` table `email` index
- `auth.ts` file
- `users.ts` file
- Auth-related test files (`magicLinkAuth.test.ts`, `passwordAuth.test.ts`)

### Phase 1: Schema Changes

1. **Update schema.ts index definitions**
   - Rename all 22 non-compliant indexes
   - Update all JSDoc `@example` comments
   - Skip `users` table entirely (Convex Auth managed)

### Phase 2: Query Updates (by file)

2. **Update app/convex/artifacts.ts** (17 changes)
3. **Update app/convex/sharing.ts** (3 changes)
4. **Update app/convex/comments.ts** (4 changes)
5. **Update app/convex/commentReplies.ts** (1 change)
6. **Update app/convex/zipUpload.ts** (1 change)
7. **Update app/convex/lib/permissions.ts** (2 changes)
8. **Update app/convex/lib/commentPermissions.ts** (1 change)

### Phase 3: Test Updates

9. **Update all test files** (see Test Files section - skip auth tests)

### Phase 4: Verification

10. **Run `npx convex dev`** - Verify schema deploys without errors
11. **Run full test suite** - Verify all tests pass
12. **Manual smoke test** - Quick manual verification of key flows

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Convex Auth breaks | None | N/A | Auth tables are out of scope |
| Missing a withIndex reference | Low | Medium | Grep exhaustively, run tests |
| Index rename causes deploy failure | Low | Low | Convex handles renames gracefully |
| Production data loss | None | N/A | Index renames are metadata-only |

---

## Files Summary

### In Scope

| File | Changes | Priority |
|------|---------|----------|
| `app/convex/schema.ts` | 22 indexes + 23 comments | Critical |
| `app/convex/artifacts.ts` | 17 withIndex calls | Critical |
| `app/convex/sharing.ts` | 3 withIndex calls (skip email index) | Critical |
| `app/convex/comments.ts` | 4 withIndex calls | Critical |
| `app/convex/commentReplies.ts` | 1 withIndex call | High |
| `app/convex/zipUpload.ts` | 1 withIndex call | High |
| `app/convex/lib/permissions.ts` | 2 withIndex calls | High |
| `app/convex/lib/commentPermissions.ts` | 1 withIndex call | High |
| Test files (8+) | 12+ withIndex calls | After production code |

### Out of Scope (Convex Auth)

| File | Reason |
|------|--------|
| `app/convex/auth.ts` | Uses `email` index required by @convex-dev/auth |
| `app/convex/users.ts` | Uses `email` index for user lookup |
| `app/convex/schema.ts` (users table) | `email` index managed by Convex Auth |
| `app/convex/__tests__/magicLinkAuth.test.ts` | Tests auth functionality |
| `app/convex/__tests__/passwordAuth.test.ts` | Tests auth functionality |
| `app/__tests__/convex/magicLinkAuth.test.ts` | Tests auth functionality |
| `app/__tests__/convex/passwordAuth.test.ts` | Tests auth functionality |

**Total estimated changes:** 65+ individual edits across 15+ files (excluding auth-related)
