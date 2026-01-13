# 0015: Organization-First Architecture

**Status:** Accepted
**Date:** 2026-01-11
**Context:** B2B SaaS requirements for billing, team collaboration, and centralized ownership.

## Context

The initial "User-First" architecture of Artifact Review was designed for individual users, where artifacts were directly owned by a user (`createdBy`). This model presented several limitations as we moved towards detailed billing (Stripe integration) and team collaboration features:

1.  **Billing Complexity:** Subscriptions are typically attached to a legal entity/group (tenant), not an individual. Charging per-user without a grouping mechanism is restrictive for B2B.
2.  **Collaboration Limits:** Sharing was limited to "Owners" and "Invited Reviewers". There was no concept of a "Team" that implicitly shares access to a workspace.
3.  **Scalability:** As users join multiple teams, the strict user-ownership model becomes fragmented.
4.  **SaaS Best Practices:** Modern B2B SaaS platforms (like Convex, Vercel, Slack) predominantly use an Organization/Workspace model as the primary tenancy unit.

## Decision

We have adopted an **"Organization-First" Architecture** where the **Organization** is the primary tenant and owner of resources.

### 1. Data Model Changes
*   **New Table: `organizations`**: Represents the tenant.
    *   Fields: `name`, `slug` (future), `subscriptionId`, `seatLimit`.
*   **New Table: `members`**: Links `users` to `organizations`.
    *   Fields: `userId`, `organizationId`, `roles` (e.g., `["owner"]`, `["admin"]`, `["member"]`).
*   **Updated Table: `artifacts`**:
    *   **New Field**: `organizationId` (Required).
    *   **Logic**: Artifacts are now "owned" by the Organization, not the creating User. The `createdBy` field remains for audit purposes.

### 2. "Personal Organization" Pattern
To maintain a seamless experience for individual users without forcing them to manually create a "company", we adopt the **Personal Organization** pattern:
*   Upon sign-up, every user automatically gets a default Organization (e.g., "{Name}'s Org").
*   This ensures the data model is uniform: **Every artifact belongs to an Organization**, whether it's a solo user's personal org or a corporate team.

### 3. Permissions (RBAC)
Permissions are now derived from **Membership**:
*   A user can act on an artifact if they are a **Member** of the owning Organization.
*   Roles (`owner`, `admin`, `member`) within the `members` table determine specific capabilities (e.g., Billing management, Invite permissions).

## Consequences

### Positive
*   **Unified Billing:** We can now attach Stripe Subscriptions directly to the `organizations` table.
*   **Simplified Sharing:** In the future, we can implement "Organization-Wide" visibility easily.
*   **Scalability:** Users can belong to multiple organizations (Personal, Work, Side Project) with distinct billing and resources.
*   **Standardization:** Aligns with the [Convex SaaS Template](https://github.com/get-convex/convex-saas) and industry standards.

### Negative
*   **Migration Complexity:** Existing data (users and artifacts created prior to this change) must be migrated.
    *   *Strategy:* A migration script will create a Personal Organization for each existing user and backfill `artifact.organizationId`.
*   **Query Complexity:** Queries now often require a join or double-lookup (User -> Members -> Organization -> Artifacts).
    *   *Mitigation:* Convex's reactive queries handle this efficiently, and we can denormalize if strictly necessary (though not currently planned).
*   **Breaking Changes:** All mutation signatures creating resources must now be organization-aware.

## Compliance
All new features and code must adhere to this model.
*   Checking `ctx.auth.getUser()` is no longer sufficient for permissioning resource creation; we must check `ctx.db.query("members")...`.
*   Frontend must allow users to "Switch Organizations" if they belong to multiple.
