# ADR Review Report

**Date:** 2025-12-31
**Reviewer:** AI Software Architect Agent
**Scope:** All ADRs in `docs/architecture/decisions/`
**Status:** UPDATED - ADR 0012 Deleted

---

## Update: ADR 0012 Deleted (2025-12-31)

**Decision:** ADR 0012 (Unified Artifact Storage Strategy) has been deleted from the ADR collection.

**Rationale:**
- The content was task implementation planning, not an architectural decision
- All content is thoroughly documented in Task 00018 (`tasks/00018-refine-version-model-permissions/`)
- Task 00018 contains more comprehensive documentation including:
  - Problem statement and proposed solution (README.md)
  - Complete end-state design (END-STATE-DESIGN.md)
  - Implementation phases and migration strategy
- ADRs should document **accepted architectural decisions**, not ongoing task work
- ADR 0012 was marked "Proposed" because it represents work in progress, not a finalized decision

**References Updated:**
- Removed from `docs/architecture/decisions/_index.md`
- Reference removed from `tasks/00018-refine-version-model-permissions/END-STATE-DESIGN.md`

---

## Executive Summary

Reviewed 12 Architecture Decision Records (ADRs 0001-0013, excluding deleted 0012). Overall, the ADR collection is well-organized and follows consistent formatting. However, there are several areas requiring attention:

1. **Redundancy issues:** ADRs 0002 and 0009 have some overlap regarding artifact storage (previously overlapped with deleted ADR 0012)
2. **Transitional language:** Several ADRs contain "changed minds" language that will confuse future readers
3. **Status inconsistencies:** Some ADRs marked as "Proposed" appear to already be implemented

---

## ADR Inventory

| ID | Title | Status | Summary |
|----|-------|--------|---------|
| 0001 | Authentication Provider | Accepted | Convex Auth with magic links via Resend, email-based account linking |
| 0002 | HTML Artifact Storage Strategy | Accepted | HTTP proxy with per-request permission checks, Convex storage for MVP |
| 0003 | Deployment & Hosting Strategy | Accepted | Vercel for frontend, direct Convex account (not Marketplace) |
| 0004 | Email Strategy | Accepted | Resend for transactional email, Mailpit for local dev |
| 0005 | Domain Registrar | Accepted | Porkbun for HTTPS URL forwarding support |
| 0006 | Frontend Stack | Accepted | Next.js 14 App Router + ShadCN UI |
| 0007 | Logging Strategy | Accepted | loglevel (frontend) + custom wrapper (backend), file-based logging |
| 0008 | Next.js App Router for Routing | Accepted | File-based routing for auth pages, SEO, deep linking |
| 0009 | Artifact File Storage Structure | Accepted | Flat `artifactFiles` table with path strings for ZIP extraction |
| 0010 | Reviewer Invitation Account Linking | Accepted | Link pending invitations at signup via auth hook |
| 0011 | Soft Delete Strategy | Accepted | `isDeleted: boolean` + `deletedAt: number` for Convex index compatibility |
| ~~0012~~ | ~~Unified Artifact Storage~~ | **DELETED** | Moved to Task 00018 documentation |
| 0013 | Backend Naming Conventions | **Proposed** | Naming standards for Convex functions, tables, indexes, fields |

---

## Redundancies Found

### Storage Strategy Overlap (ADRs 0002, 0009)

**Note:** Previously overlapped with ADR 0012, which has been deleted.

These two ADRs cover related aspects of artifact storage:

| ADR | Focus | Relationship |
|-----|-------|--------------|
| 0002 | Overall storage architecture (HTTP proxy, Convex vs R2) | Foundation |
| 0009 | `artifactFiles` table structure for ZIP extraction | Extension of 0002 |

**Current State:**
- ADR 0002 provides the high-level storage strategy
- ADR 0009 defines the `artifactFiles` table structure
- Task 00018 is implementing unified storage (all file types use `artifactFiles`)

**Recommendation:**
- Monitor Task 00018 progress
- Once Task 00018 is complete, update ADR 0002 to reference the unified storage pattern
- No consolidation needed - they serve different purposes (strategy vs schema)

---

## ADRs with "Changed Minds" / Transitional Language

### ADR 0002: HTML Artifact Storage Strategy

**Problematic Language:**

Line 6-7:
```
**Updated:** 2024-12-24 (Revised: Access control requirements simplified the decision)
```

**Issue:** The "Revised" note implies this was changed from something else, but doesn't say what.

**Recommendation:** Remove the "Revised" note. The ADR should state the current decision as if it was always the decision.

---

### ADR 0009: Artifact File Storage Structure

**No transitional language issues.** This ADR is well-written and authoritative.

---

### ADR 0010: Reviewer Invitation Account Linking

**Problematic Language:**

Lines 503-513:
```markdown
## MVP Scope Simplification (2025-12-27)

**After initial planning, scope was simplified to:**
- Email invitations only (no public share links)
- Single permission level: "can-comment" (no "view-only")
...
- Public share links -> Deferred to Task 00013
- "View-only" permission -> Deferred to Task 00013
```

**Issue:** The phrase "After initial planning, scope was simplified" tells future readers about a planning process, not the current decision. The deferred items reference specific task numbers that may become stale.

**Recommendation:** Rewrite as:

```markdown
## Scope

This ADR covers email invitations with "can-comment" permission.

**Not in scope (future consideration):**
- Public share links
- "View-only" permission
```

---

### ADR 0013: Backend Naming Conventions

**Minor Issue:**

Lines 554-585 (Implementation section):
```markdown
### Phase 1: Documentation
1. Add this ADR to `docs/architecture/decisions/`

### Phase 3: Gradual Refactoring
1. Fix violations in new code immediately
2. Refactor existing code opportunistically...
```

**Issue:** The implementation phases suggest this is a new convention being introduced, which is transitional thinking.

**Recommendation:** After the convention is established:
- Remove "Phase 1: Documentation" (it will already be documented)
- Rename "Phase 3: Gradual Refactoring" to just "Refactoring Approach"
- Present as the established standard, not a new initiative

---

## Status Inconsistencies

### ADR 0010: Marked "Proposed" but Appears Accepted

The ADR header says:
```
**Status:** Accepted
```

But the Decision Status section (lines 517-526) says:
```
**Current Status:** Accepted
**Completed:**
- Architecture reviewed and approved
```

**Issue:** No inconsistency here - the status is correctly "Accepted". However, the "Decision Status" section with checkboxes is transitional tracking that should be removed after acceptance.

---

### ADR 0013: Status "Proposed" - Needs Resolution

**Current Status:** Proposed

**Questions:**
1. Are these naming conventions already being followed in the codebase?
2. Is there any disagreement on the conventions?

**Recommendation:** If the conventions are established, mark as "Accepted" and remove implementation phases.

---

## Recommended Actions

### High Priority

1. ~~**Resolve ADR 0012 status**~~ - ✅ **COMPLETED** - Deleted, documented in Task 00018
2. **Remove transitional language from ADR 0010** - Rewrite scope section
3. **Update ADR 0002** - Remove "Revised" note from header

### Medium Priority

4. **Resolve ADR 0013 status** - Accept if conventions are established
5. **Clean up ADR 0010** - Remove implementation tracking section after acceptance

### Low Priority

6. **Audit ADR dates** - Some use 2024 dates, others 2025; ensure consistency with actual decision dates

---

## ADRs That Are Clean (No Issues Found)

The following ADRs are well-written, authoritative, and contain no transitional language:

- **ADR 0001: Authentication Provider** - Clear decision, migration path is forward-looking not transitional
- **ADR 0003: Deployment & Hosting Strategy** - Clean and authoritative
- **ADR 0004: Email Strategy** - Clean and authoritative
- **ADR 0005: Domain Registrar** - Clean and authoritative
- **ADR 0006: Frontend Stack** - Clean and authoritative
- **ADR 0007: Logging Strategy** - Clean and authoritative
- **ADR 0008: Next.js App Router for Routing** - Clean and authoritative
- **ADR 0009: Artifact File Storage Structure** - Clean and authoritative
- **ADR 0011: Soft Delete Strategy** - Clean and authoritative

---

## Appendix: Specific Rewrites Suggested

### ADR 0002: Remove Update Note

**Before:**
```markdown
**Status:** Accepted
**Date:** 2024-12-24
**Decision Maker:** Clint Gossett
**Updated:** 2024-12-24 (Revised: Access control requirements simplified the decision)
```

**After:**
```markdown
**Status:** Accepted
**Date:** 2024-12-24
**Decision Maker:** Clint Gossett
```

---

### ADR 0010: Rewrite Scope Section

**Before:**
```markdown
## MVP Scope Simplification (2025-12-27)

**After initial planning, scope was simplified to:**
- Email invitations only (no public share links)
- Single permission level: "can-comment" (no "view-only")
- Email sending via Resend (not mocked)
- Deep linking after authentication
- Public share links -> Deferred to Task 00013
- "View-only" permission -> Deferred to Task 00013

**This ADR covers the simplified MVP scope.**
```

**After:**
```markdown
## Scope

This ADR covers reviewer invitations via email with "can-comment" permission.

**Included:**
- Email invitations (not public share links)
- Single permission level: "can-comment"
- Email sending via Resend
- Deep linking after authentication

**Out of scope (future consideration):**
- Public share links
- "View-only" permission level
```

---

### ADR 0010: Remove Implementation Tracking Section

**Remove entirely (lines 517-533):**
```markdown
## Decision Status

**Current Status:** Accepted

**Implementation Ready:**
- Subtask 02 (Backend) - Ready for TDD agent
...
```

**Rationale:** Once accepted, implementation tracking belongs in task management, not the ADR.

---

## Summary

| Category | Count |
|----------|-------|
| Total ADRs reviewed | 12 (excluding deleted 0012) |
| Clean (no issues) | 9 |
| With transitional language | 3 (0002, 0010, 0013) |
| Deleted as task documentation | 1 (0012) |
| Pending status resolution | 1 (0013) |

The ADR collection is healthy. The main areas for improvement are:
1. ✅ **Storage ADR overlap resolved** - ADR 0012 deleted, documented in Task 00018
2. Removing transitional language that will confuse future AI agents
3. Finalizing the status of proposed ADR 0013
