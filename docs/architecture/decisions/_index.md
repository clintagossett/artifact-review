# Architecture Decision Records (ADRs)

Record of significant architectural decisions made for this project.

## Decisions

| ID | Title | Status | Date |
|----|-------|--------|------|
| [0001](./0001-authentication-provider.md) | Authentication Provider | Accepted | 2024-12-24 |

---

## Pending Architectural Decisions

These are important decisions that need to be made and documented:

| Decision Area | Priority | Notes |
|--------------|----------|-------|
| MCP Integration Approach | High | API Keys vs OAuth authentication - See [claude-integration-plan.md](../claude-integration-plan.md) |
| File Storage Strategy | Medium | Convex native vs external (R2/S3) for HTML artifacts and assets |
| Real-time Collaboration Tech | Medium | Convex (native) vs custom WebSocket vs CRDT library |
