# Architecture Decision Records (ADRs)

Record of significant architectural decisions made for this project.

## Decisions

| ID | Title | Status | Date |
|----|-------|--------|------|
| [0001](./0001-authentication-provider.md) | Authentication Provider | Accepted | 2024-12-24 |
| [0002](./0002-html-artifact-storage.md) | HTML Artifact Storage Strategy | Accepted | 2024-12-24 |
| [0003](./0003-deployment-hosting-strategy.md) | Deployment & Hosting Strategy | Accepted | 2024-12-24 |
| [0004](./0004-email-strategy.md) | Email Strategy | Accepted | 2024-12-24 |

---

## Pending Architectural Decisions

These are important decisions that need to be made and documented:

| Decision Area | Priority | Notes |
|--------------|----------|-------|
| MCP Integration Approach | High | API Keys vs OAuth authentication - See [claude-integration-plan.md](../claude-integration-plan.md) |
| Real-time Collaboration Tech | Medium | Convex (native) vs custom WebSocket vs CRDT library |
