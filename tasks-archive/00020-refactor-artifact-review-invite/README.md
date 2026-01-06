# Task 00020: Refactor and Artifact Review Invite

**GitHub Issue:** [#20](https://github.com/clintagossett/artifact-review/issues/20)
**Status:** Complete
**Created:** 2025-12-31

---

## Resume (Start Here)

**Last Updated:** 2026-01-06 (Session 4)

### Current Status: Complete

**Phase:** Implementation complete, all scenarios validated.

### What We Did This Session (Session 4)

1. **Implemented "Viewed" Status** - Updated backend and frontend to track and display when a reviewer has viewed an artifact.
2. **Dashboard Integration** - Added "Shared with me" section to the dashboard.
3. **Artifact Deletion** - Implemented soft-delete for artifacts with cascading deletes for versions and files, plus a "Danger Zone" in settings.
4. **Documentation** - Created `invitation-states.md` with Mermaid diagram.
5. **Dev Workflow** - Created `.agent/workflows/dev.md` for consistent server management.

### Next Steps

1. **Architecture Archival** - Archive Task 20 folder now that all scenarios are validated. ✅

### Design Documents

| Document | Description |
|----------|-------------|
| `design-revised.md` | Two-table architecture, data model, lifecycle flows, validation scenarios |
| `diagrams.md` | Mermaid diagrams for all flows (ER, sequence, flowcharts) |
| `implementation-architecture.md` | Schema, backend functions, frontend components, implementation order |

### Subtasks

| Subtask | Description | Status |
|---------|-------------|--------|
| `01-backend/` | Schema + Convex functions (`convex/access.ts`) | COMPLETE |
| `02-frontend/` | Components, hooks, UI integration | COMPLETE |

### Next Steps

1. **Start 01-backend** - Implement schema and Convex functions
2. **Start 02-frontend** - Components, hooks, ShareModal integration (after backend)
3. **Test** - Validate all 13 scenarios
4. **Cleanup** - Remove old `artifactReviewers` table and `sharing.ts`

---

## Architecture Summary

### Two-Table Model

| Table | Purpose | PII? |
|-------|---------|------|
| `userInvites` | Pending users (no account yet) | Yes (email, name) |
| `artifactAccess` | Access grants linking artifacts to users | No (IDs only) |

### Key Design Decisions

1. **PII Isolation** - Email/name only in `userInvites`, not in access table
2. **Privacy between inviters** - `userInvites` unique by (email, createdBy)
3. **No status enum** - State derived from data (userId, isDeleted, firstViewedAt)
4. **Reactive permissions** - Real-time revocation via Convex subscriptions
5. **Re-invite = un-delete** - Don't create new records, restore existing

### State Derivation

```typescript
function deriveStatus(access) {
  if (access.isDeleted) return "removed";
  if (!access.userId) return "pending";
  if (access.firstViewedAt) return "viewed";
  return "added";
}
```

---

## Scope

### In Scope

- Two-table architecture (userInvites + artifactAccess)
- Invite existing users and new users
- Re-send capability with tracking (lastSentAt, sendCount)
- View tracking (firstViewedAt, lastViewedAt)
- Revoke and re-invite flows
- Real-time permission revocation
- Signup linking (auth callback)

### Out of Scope

- Permission levels beyond "can-comment"
- Email template redesign
- Invitation expiration
- Bulk invite optimization

---

## Output

### Documents Created

- `design-revised.md` - Full design specification
- `diagrams.md` - Visual diagrams (Mermaid)
- `implementation-architecture.md` - Implementation plan

### Documents Deleted (superseded)

- `design-proposal.md` - Old three-table design
- `design-challenge-single-table.md` - Old analysis

---

## Validation Checklist

13 scenarios that must pass:

| # | Scenario |
|---|----------|
| 1 | Invite existing user |
| 2 | Invite new user |
| 3 | Same owner invites same email to multiple artifacts |
| 4 | Different owners invite same email (privacy) |
| 5 | Pending user signs up (linking) |
| 6 | Resend invitation |
| 7 | Revoke access (existing user) |
| 8 | Revoke access (pending user) |
| 9 | Re-invite after revocation |
| 10 | Permission check (O(1) critical path) |
| 11 | "Shared with me" query |
| 12 | Owner views reviewer list |
| 13 | Real-time revocation (reactive) |
