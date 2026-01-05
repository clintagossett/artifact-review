# GitHub Issue Review - 2026-01-03

Review of 11 remaining open issues for the Artifact Review project.

## Summary

| Recommendation | Count |
|----------------|-------|
| **CLOSE** | 4 |
| **KEEP OPEN** | 7 |

---

## Issues to CLOSE

### #3 - International trademark search for 'Artifact Review'
**Recommendation: CLOSE**

**Rationale:**
- Task `00003-international-trademark-search/README.md` explicitly states **Status: Completed** (2025-12-24)
- Comprehensive research was completed across WIPO, EUIPO, UK IPO, CIPO, and IP Australia
- Findings documented: "No exact 'Artifact Review' trademark registrations found across any of the searched databases"
- International filing strategy recommendations provided
- The README includes full conclusion and next steps for legal counsel

**Note:** This was likely overlooked when the work was completed.

---

### #24 - Wire frontend to artifact settings details backend
**Recommendation: CLOSE**

**Rationale:**
- Task `00024-wire-frontend-artifact-settings-details/README.md` shows **Status: COMPLETE** (2026-01-02)
- All 6 subtasks marked complete with checkmarks
- 16 files changed across type definitions, upload flow, viewer components, and tests
- Backend test files also updated as part of this work
- Implementation Summary section confirms all work finished

---

### #25 - Migrate comment schema from authorId to createdBy
**Recommendation: CLOSE**

**Rationale:**
- Task `00025-migrate-comment-schema-to-createdby/MIGRATION-COMPLETE.md` explicitly states **MIGRATION COMPLETE**
- Current `schema.ts` confirms all comment tables use `createdBy` (verified lines 520, 658)
- 3 frontend files modified, 26 unit tests created and passing
- TypeScript compilation clean with no `authorId`-related errors
- Documentation complete with migration plan and report

---

### #29 - Research commenting libraries
**Recommendation: CLOSE**

**Rationale:**
- Task `00029-commenting-libraries-research/README.md` shows research is complete
- Comprehensive analysis of 20+ commenting and annotation libraries across 6 categories
- Top 3 recommendations provided with clear next steps
- Output file `research-output.md` contains detailed analysis
- The task was research-only; implementation would be a separate issue

---

## Issues to KEEP OPEN

### #1 - Trademark clearance and registration for Artifact Review
**Recommendation: KEEP OPEN**

**Rationale:**
- `RESUME.md` shows status as "90% complete" with pending actions:
  - Social handles NOT registered (HIGH PRIORITY - all available but unclaimed)
  - Email setup for artifactreview.com NOT started
  - USPTO application NOT filed
- This is the parent task; #3 (international search) was a subtask that IS complete
- Actionable work remains before this can be closed

---

### #20 - Refactor and Artifact Review Invite
**Recommendation: KEEP OPEN**

**Rationale:**
- Active bug investigation per `BUG-RESUME-access-not-linked.md` (2026-01-03)
- Bug: Invited user cannot access artifact after signup (linking not working)
- Subtask 05 (reviewer permission modals) is code-complete but requires manual testing
- Subtask 04 (remove artifactReviewers table) has cleanup work in progress
- Git status shows modified files: `sharing.ts` deleted, `permissions.ts` modified
- Root cause investigation ongoing - not safe to close

---

### #21 - Support multi-version artifacts
**Recommendation: KEEP OPEN**

**Rationale:**
- Task README shows "SCOPED & REVIEWED - READY FOR IMPLEMENTATION"
- Subtask 01 (version-management) has schema field renames still needed:
  - `versionName` to `name`
  - `versionNumber` to `number`
  - Current schema (verified) still uses `number` but implementation incomplete
- Subtask 02 test report shows "COMPLETE" but upload functionality is stub
- Backend exists from Tasks 18/19 but frontend version UI work remains
- "Upload New Version" shows toast: "Upload functionality will be implemented soon"

---

### #23 - Finalize and implement past version commenting permissions strategy
**Recommendation: KEEP OPEN**

**Rationale:**
- No task folder found (`tasks/00023*` returns no results)
- ADR index shows no decision documented for past version commenting
- Task #21 mentions "only latest version accepts comments" but implementation not confirmed
- The strategy needs to be formally documented in an ADR before implementation
- This appears to be design/architecture work that hasn't started

---

### #26 - Bring all indexes into compliance with naming convention
**Recommendation: KEEP OPEN**

**Rationale:**
- No task folder created yet
- Detailed analysis exists in `00025-migrate-comment-schema-to-createdby/index-naming-analysis.md`
- Analysis recommends Option C: Drop `_and_` pattern, update ADR 0012 to match codebase
- Action items from analysis NOT yet completed:
  - [ ] Update ADR 0012 Index Naming section
  - [ ] Update `convex-rules.md` if it mentions `_and_` convention
- Current indexes already follow the recommended pattern, but documentation needs updating

---

### #27 - Markdown file viewing support
**Recommendation: KEEP OPEN**

**Rationale:**
- Task README shows **Status: OPEN** with 9 subtasks defined
- Only subtask 01 (library research) is COMPLETE
- Subtasks 02-09 are all PENDING:
  - Install markdown dependencies
  - Create MarkdownViewer component
  - Integrate with DocumentViewer
  - Enable markdown comments
  - Finalize styling
  - Phase 1 testing
  - Mermaid lazy loading
  - Phase 2 testing
- Decision locked on react-markdown + remark-gfm but implementation not started
- This is a significant feature with substantial work remaining

---

### #28 - Bring artifactFiles table into ADR-12 compliance
**Recommendation: KEEP OPEN**

**Rationale:**
- No task folder created yet
- ADR-12 documents the naming convention that should apply
- Current `artifactFiles` schema fields to review:
  - `filePath` - Should be `path` per ADR-12 (avoid redundancy with table name)
  - `fileSize` - Should be `size` per ADR-12
- This is a schema migration task that requires careful planning
- Related to #26 (index naming) but focuses on field naming

---

## Recommended Actions

### Immediate (Close Now)
1. Close #3 with comment: "Research completed 2025-12-24. See `tasks/00003-international-trademark-search/README.md` for full findings."
2. Close #24 with comment: "Implementation completed 2026-01-02. All 6 subtasks finished, 16 files updated."
3. Close #25 with comment: "Migration completed. All comment tables now use `createdBy`. See `MIGRATION-COMPLETE.md`."
4. Close #29 with comment: "Research complete. Top recommendations documented. Implementation would be separate task."

### Follow-Up
- #20: Continue bug investigation - priority to resolve linking issue
- #23: Create task folder and draft ADR for past version commenting strategy
- #26: Create task folder, apply analysis recommendations to ADR-12
- #28: Create task folder after #26 ADR update is merged (dependency)

---

## Files Referenced

| File | Purpose |
|------|---------|
| `/tasks/00001-trademark-clearance/RESUME.md` | #1 status |
| `/tasks/00003-international-trademark-search/README.md` | #3 completion |
| `/tasks/00020-refactor-artifact-review-invite/README.md` | #20 status |
| `/tasks/00020-refactor-artifact-review-invite/BUG-RESUME-access-not-linked.md` | #20 active bug |
| `/tasks/00021-support-multi-version-artifacts/README.md` | #21 status |
| `/tasks/00024-wire-frontend-artifact-settings-details/README.md` | #24 completion |
| `/tasks/00025-migrate-comment-schema-to-createdby/MIGRATION-COMPLETE.md` | #25 completion |
| `/tasks/00025-migrate-comment-schema-to-createdby/index-naming-analysis.md` | #26 analysis |
| `/tasks/00027-md-file-viewing-support/README.md` | #27 status |
| `/tasks/00029-commenting-libraries-research/README.md` | #29 completion |
| `/app/convex/schema.ts` | Schema verification |
| `/docs/architecture/decisions/0012-naming-conventions.md` | ADR-12 reference |
