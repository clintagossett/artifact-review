# Architecture Decision Records (ADRs)

Record of significant architectural decisions made for this project.

## Decisions

| ID | Title | Status | Date |
|----|-------|--------|------|
| [0001](./0001-authentication-provider.md) | Authentication Provider | Accepted | 2024-12-24 |
| [0002](./0002-html-artifact-storage.md) | HTML Artifact Storage Strategy | Accepted | 2024-12-24 |
| [0003](./0003-deployment-hosting-strategy.md) | Deployment & Hosting Strategy | Accepted | 2024-12-24 |
| [0004](./0004-email-strategy.md) | Email Strategy | Accepted | 2024-12-24 |
| [0005](./0005-domain-registrar.md) | Domain Registrar | Accepted | 2024-12-24 |
| [0006](./0006-frontend-stack.md) | Frontend Stack | Accepted | 2024-12-25 |
| [0007](./0007-logging-strategy.md) | Logging Strategy | Accepted | 2024-12-26 |
| [0008](./0008-nextjs-app-router-for-routing.md) | Next.js App Router for Routing | Accepted | 2024-12-26 |
| [0009](./0009-artifact-file-storage-structure.md) | Artifact File Storage Structure | Accepted | 2025-12-26 |
| [0010](./0010-reviewer-invitation-account-linking.md) | Reviewer Invitation Account Linking | **Proposed** | 2025-12-27 |
| [0011](./0011-soft-delete-strategy.md) | Soft Delete Strategy | Accepted | 2025-12-28 |
| [0012](./0012-unified-artifact-storage.md) | Unified Artifact Storage Strategy | **Proposed** | 2025-12-28 |

---

## Pending Architectural Decisions

These are important decisions that need to be made and documented:

| Decision Area | Priority | Notes |
|--------------|----------|-------|
| MCP Integration Approach | High | API Keys vs OAuth authentication - See [claude-integration-plan.md](../claude-integration-plan.md) |
| Real-time Collaboration Tech | Medium | Convex (native) vs custom WebSocket vs CRDT library |
