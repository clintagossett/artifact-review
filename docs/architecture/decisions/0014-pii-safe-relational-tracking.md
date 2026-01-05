# ADR 0014: Relational Tracking for Presence & Views

**Status:** Accepted
**Date:** 2026-01-04
**Decision Maker:** Antigravity (AI Assistant) & Clint Gossett
**Scope:** Impact on `presence` and `artifactViews` tables

## Context

We need to track user activity (real-time presence and persistent view history). Since the platform requires authentication for all artifact access, we have an authoritative `userId` for every viewer.

**The Problem:**
1. **PII Sprawl**: Storing names/emails in high-frequency logs makes data updates and deletions difficult.
2. **Identity Simplification**: We initially considered "guest" or "pending" tracking, but those states either don't exist (no public access) or are resolved to a `userId` immediately upon login.

## Decision

We will use a **Strict User-Relational approach** for all activity tracking.

1. **Authenticated Users Only**: All tracking records (`presence`, `artifactViews`) will require a valid `userId`.
2. **No Redundant PII**: Tracking tables will NEVER store `name`, `email`, or `image`. They will only store `userId`, `artifactId`, `versionId`, and timestamps.
3. **Read-Time Resolution**: Convex queries will join/enrich `userId`s with the authoritative `users` table at retrieval time to provide UI-ready metadata.

## Consequences

### Positive
- ✅ **Centralized PII**: Deleting a user or changing an email only needs to happen in the `users` table.
- ✅ **Schema Simplicity**: The tracking tables are lean and strictly indexed.
- ✅ **Data Accuracy**: UI always reflects the current profile information of the user.

### Negative
- ❌ **Join-at-Read**: Queries require fetching `users` documents, though Convex optimizes this via batching and caching.

## Implementation Pattern

### Schema
```typescript
presence: defineTable({
  artifactId: v.id("artifacts"),
  versionId: v.id("artifactVersions"),
  userId: v.id("users"),
  lastSeen: v.number(),
})

artifactViews: defineTable({
  artifactId: v.id("artifacts"),
  versionId: v.id("artifactVersions"),
  userId: v.id("users"),
  viewedAt: v.number(),
})
```

## References
- [ADR 0010: Reviewer Invitation Account Linking](./0010-reviewer-invitation-account-linking.md)
- [Architecture Proposal: Simplified Presence & Tracking](../../tasks/00030-track-artifact-views-and-presence/architecture_proposal.md)
