# Task 00031: Global Schema ADR-0012 Compliance

**GitHub Issue:** #31
**Status:** In Progress
**Created:** 2026-01-06
**Supersedes:** #26, #28

## Objective

Bring the entire Convex database schema into 100% compliance with [ADR 0012: Backend Naming Conventions](../../docs/architecture/decisions/0012-naming-conventions.md).

## Scope

### 1. Field Renames & Removals (Property Redundancy & Timestamps)
- `users`: `emailVerificationTime` -> `emailVerifiedAt`, `phoneVerificationTime` -> `phoneVerifiedAt`, **DELETE** `isAnonymous`
- `artifactVersions`: `fileSize` -> `size`
- `artifactFiles`: `filePath` -> `path`, `fileSize` -> `size`
- `comments`: `resolvedChangedBy` -> `resolvedBy`, `resolvedChangedAt` -> `resolvedAt`
- `presence`: `lastSeen` -> `lastSeenAt`

### 2. Missing Audit Fields (Required `createdAt`)
- `artifactFiles`
- `userInvites`
- `artifactAccess`
- `presence`

### 3. Index Naming
- `users`: `email` -> `by_email`
- `artifactFiles`: `by_versionId_filePath` -> `by_versionId_path`
- `presence`: `by_artifactId_lastSeen` -> `by_artifactId_lastSeenAt`

## Implementation Steps

1. [x] Empty database (via `cleanup:clearAllTables`)
2. [ ] Update `schema.ts` with new field and index names
3. [ ] Update backend mutations and queries to match new names
4. [ ] Update `http.ts` for file serving
5. [ ] Update frontend components and hooks
6. [ ] Verify with tests and manual check

## Acceptance Criteria

- [ ] All schema fields follow camelCase and avoid property redundancy.
- [ ] All timestamps use `*At` suffix.
- [ ] All tables have `createdAt`.
- [ ] All indexes follow `by_field` naming convention.
- [ ] No residual errors in Convex dev server.
- [ ] All tests pass.
