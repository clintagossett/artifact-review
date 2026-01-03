# Task 00020: Refactor and Artifact Review Invite

**GitHub Issue:** [#20](https://github.com/clintagossett/artifact-review/issues/20)
**Status:** Design Complete - Ready for Implementation
**Created:** 2025-12-31

---

## Resume (Start Here)

**Last Updated:** 2026-01-01 (Session 2)

### Current Status: Ready for Implementation

**Phase:** Design complete, implementation architecture defined. Ready to build.

### What We Did This Session (Session 2)

1. **Simplified design** - Challenged the three-table architecture
   - Removed `systemInvites` table (not needed)
   - Landed on cleaner two-table model
   - Focus on PII isolation

2. **Finalized two-table architecture:**
   ```
   userInvites     → Pending users (PII: email, name)
   artifactAccess  → Access grants (no PII, just IDs)
   ```

3. **Created diagrams** - Visual flows for:
   - Invite existing user
   - Invite new user
   - Signup linking
   - Resend invitation
   - Revoke & re-invite
   - Document: `diagrams.md`

4. **Architect review** - Fixed issues:
   - Clarified re-invite lookup flow
   - Fixed ER diagram (missing fields)
   - Standardized state naming
   - Resolved open questions

5. **Implementation architecture** - Created full implementation plan:
   - Schema additions
   - Backend functions (queries, mutations)
   - Frontend components and hooks
   - Validation checklist (13 scenarios)
   - Document: `implementation-architecture.md`

6. **Added reactive permissions** - Real-time permission revocation
   - Reviewer kicked out immediately when access revoked
   - Graceful UX (toast + redirect)

### Design Documents

| Document | Description |
|----------|-------------|
| `design-revised.md` | Two-table architecture, data model, lifecycle flows, validation scenarios |
| `diagrams.md` | Mermaid diagrams for all flows (ER, sequence, flowcharts) |
| `implementation-architecture.md` | Schema, backend functions, frontend components, implementation order |

### Next Steps

1. **Implement schema** - Add `userInvites` and `artifactAccess` tables
2. **Build backend** - Create `convex/access.ts` with queries/mutations
3. **Update auth** - Wire up signup linking
4. **Build frontend** - Components, hooks, ShareModal integration
5. **Test** - Validate all 13 scenarios
6. **Cleanup** - Remove old `artifactReviewers` table

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
