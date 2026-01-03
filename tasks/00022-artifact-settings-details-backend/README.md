# Task 00022: Hook Up Artifact Settings Details Tab to Backend

**GitHub Issue:** #22
**Status:** READY FOR IMPLEMENTATION
**Created:** 2026-01-01
**Last Updated:** 2026-01-02

---

## Resume (Start Here)

### Current Status: ✅ Design Complete, Ready to Implement

**Phase:** 1 of 2 (Backend Only)

**Estimated Effort:** 3-4 hours

### Quick Summary

Update the artifacts table schema per ADR 12 naming conventions and add backend support for the Artifact Settings Details tab.

**Schema Changes:**
- `artifacts.title` → `artifacts.name`
- `artifacts.creatorId` → `artifacts.createdBy`
- Indexes: `by_creator*` → `by_created_by*`

**New Backend:**
- `updateDetails` mutation (owner-only name/description editing)
- `getDetailsForSettings` query (enriched data with creator email, version count, file size)

### Implementation Checklist

- [ ] **Subtask 01:** Schema migrations in `schema.ts`
  - [ ] Rename `title` → `name` (line 148)
  - [ ] Rename `creatorId` → `createdBy` (line 162)
  - [ ] Update indexes: `by_creator` → `by_created_by`
  - [ ] Run `npx convex dev` to verify

- [ ] **Subtask 02:** Update existing queries/mutations in `artifacts.ts`
  - [ ] Update `create` action (args, internal call)
  - [ ] Update `createInternal` mutation (args, insert)
  - [ ] Update all return validators (8 functions)
  - [ ] Update `softDelete` permission check
  - [ ] Search for references in `sharing.ts`, `lib/permissions.ts`

- [ ] **Subtask 03:** Add `updateDetails` mutation
  - [ ] Implement owner verification
  - [ ] Validate name (1-100 chars)
  - [ ] Validate description (0-500 chars)
  - [ ] Update `updatedAt` timestamp

- [ ] **Subtask 04:** Add `getDetailsForSettings` query
  - [ ] Join with users table for creator email
  - [ ] Count active versions
  - [ ] Sum file sizes from active versions
  - [ ] Owner-only access check

- [ ] **Testing:**
  - [ ] Manual test via Convex dashboard
  - [ ] Verify schema pushes successfully
  - [ ] Test `updateDetails` with various inputs
  - [ ] Test `getDetailsForSettings` returns correct data

### Session History

**Session 1 (2026-01-01):**
- Created GitHub issue #22
- Created task folder
- Ran architect agent to analyze requirements
- Created detailed design document (`design.md`)
- Initial scope: `title` → `name` rename only

**Session 2 (2026-01-02):**
- **ADR 12 updates:** Standardized on `createdBy` for all creator fields
- Added `creatorId` → `createdBy` rename to scope
- Updated design doc with both field renames
- Added index rename requirements
- Validated field length limits (100 chars name, 500 chars description)
- Created ADR 0013: Comment Character Limits
- Increased effort estimate to 3-4 hours

### Key Design Decisions

**Why rename `title` → `name`?**
- Per ADR 12: Avoid redundancy with table context
- `artifacts.name` is cleaner than `artifacts.title`
- Consistent with `artifactVersions.name`

**Why rename `creatorId` → `createdBy`?**
- Per ADR 12: Standard creator field across all tables
- Pairs with `createdAt` timestamp
- Industry aligned (Notion, Microsoft REST API, Django)
- Future-proof for ownership transfer (add `ownerId` separately later)

**Field length limits:**
- Name: 100 chars (matches Figma design, GitHub repos)
- Description: 500 chars (matches Figma design, generous for context)
- Validated against industry standards (Google Docs, Adobe, etc.)

### Files to Modify

| File | Changes |
|------|---------|
| `app/convex/schema.ts` | 2 field renames + 2 index renames |
| `app/convex/artifacts.ts` | Update 8 functions + add 2 new functions |
| `app/convex/sharing.ts` | Possibly update artifact references |
| `app/convex/lib/permissions.ts` | Possibly update permission checks |

### Next Steps

1. Start with **Subtask 01** (schema migrations)
2. Run `npx convex dev` immediately to catch any issues
3. Work through **Subtask 02** (update existing code)
4. Implement **Subtasks 03 & 04** (new functions)
5. Manual testing via Convex dashboard
6. Phase 2 (frontend wiring) will be a separate task

---

## Files

- `design.md` - Detailed implementation design with code snippets
- `README.md` - This file

## Reference

- ADR 12: Field naming conventions
- Related task: 00016-implement-artifacts-settings-panel (created the static UI)
- Convex rules: `docs/architecture/convex-rules.md`
