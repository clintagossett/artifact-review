# Task 00030: Track artifact views and "who's currently viewing"

**GitHub Issue:** #30

---

## Resume (Start Here)

**Last Updated:** 2026-01-04 (Session 1)

### Current Status: ✅ IMPLEMENTED

**Phase:** Implementation complete. Verification tests passed. UI integrated.

### Key Decisions
1.  **3-Tier Tracking Model**: `presence` (Live), `artifactVersionStats` (Aggregate), and `artifactViews` (Ledger).
2.  **Privacy**: Strictly relational identity (no PII in logs).
3.  **Viewing Logic**: 5-minute debounce on new ledger entries.
4.  **Reporting**: User-vs-Version matrix implemented in `ArtifactAccessTab`.

### Final Documentation
- [Finalized Architecture Proposal](./architecture_proposal.md)
- [ADR 0014: PII-Safe Relational Tracking](../../docs/architecture/decisions/0014-pii-safe-relational-tracking.md)

---

## Todo List
- [x] Architecture & Planning
- [x] Schema Implementation (`convex/schema.ts`)
- [x] Backend Mutations & Queries
    - [x] `presence.ts`
    - [x] `views.ts`
- [x] Frontend Hooks
    - [x] `usePresence`
    - [x] `useViewTracker`
- [x] UI Components
    - [x] `PresenceAvatars` (Face Pile)
    - [x] View Stats Matrix in Artifact Settings/Dashboard
- [x] Testing & Verification
