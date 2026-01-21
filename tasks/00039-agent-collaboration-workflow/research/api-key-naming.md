# Research: API Key Naming Conventions

**Date:** 2026-01-19
**Purpose:** Determine standard usage of "Name" vs "Description" fields for API keys to inform Agent Identity design.

## Industry Standards

| Platform | Field Name | Purpose | Convention |
|----------|------------|---------|------------|
| **Stripe** | `Name` | Identification | Short, functional (e.g., "Backend Service A") |
| **GitHub** | `Note` | Context | Descriptive purpose (e.g., "CI Pipeline Token") |
| **AWS** | User tags | Attribution | `app-backend-service-prod` |

## Findings

1. **"Name" is the Identity**
   - Most platforms treat the "Name" or "Note" field as the primary human-readable identifier.
   - It is standard practice to display this name in logs and audit trails.

2. **No "Display Name" Standard**
   - Platforms rarely have a separate "Display Name" field distinct from the functional name.
   - The user-provided name serves both purposes: identification in management UI and attribution in logs.

## Recommendation for Artifact Review

**Use a single `name` field.**

- **User Action:** User names the key "Claude Home" or "CI/CD Pipeline".
- **System Action:** We use this string as the `agentName` in attribution.
- **UI:** "Comment from Clint Gossett via Claude Home"

**Why:**
- Simple concept for users (name the thing accessing the API).
- Matches user mental model from other platforms.
- Avoids complexity of managing two names.

---

# Architecture Update: Agent Attribution

The user emphasized tracking **who resolved a comment** (User vs Agent).

## Original Proposal (Missing Resolution Tracking)

Existing schema only tracks `resolvedUpdatedBy` (User ID).

```typescript
resolved: v.boolean(),
resolvedUpdatedBy: v.optional(v.id("users")),
resolvedUpdatedAt: v.optional(v.number()),
```

## Updated Proposal (With Agent Tracking)

We need to add agent attribution to the resolution action fields.

```typescript
// Add to comments table:
resolvedByAgentId: v.optional(v.id("apiKeys")),
resolvedByAgentName: v.optional(v.string()),

// Display Logic:
// "Resolved by Clint Gossett"
// "Resolved by Clint Gossett via Claude Home"
```
