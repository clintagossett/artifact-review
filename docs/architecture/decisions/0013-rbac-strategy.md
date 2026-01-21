# ADR 0013: RBAC Strategy

**Status:** Accepted
**Date:** 2026-01-20
**Decision Maker:** Clint Gossett
**Scope:** Authorization System-wide

## Context
As we introduce Team Accounts (Task 00038), we need a robust RBAC system that balances velocity (easy sharing) with safety (agent containment).

## Decision

### 1. Organization-Level Permissions
All artifacts belong to an Organization. All Org Members inherit access to all Org artifacts.

**Deferred:** Workspaces (sub-organization grouping) are deferred to avoid scope creep.

### 2. Architectural Denial
For high-risk capabilities, we document them as permissions but mark **ALWAYS FALSE**.

*   `comment:edit_content_any`: **ALWAYS FALSE**. Do not implement.

### 3. Agent Containment (Organization Policy)
*   **Policy:** `allowAgents` (boolean) on Organization.
*   **Behavior (False):** Agents blocked from Writes (Read/Download only).
*   **Behavior (True):** Agents can Write.

## Consequences

### Positive
*   ✅ Simple: No Workspace complexity.
*   ✅ Fast: Low friction for small teams.

### Negative
*   ❌ Agent containment is all-or-nothing per Org (no granular Workspace control).

### Future
Workspaces can be introduced later for sub-organization segregation if needed.
