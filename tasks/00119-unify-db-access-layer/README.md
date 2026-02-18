# Task 00119 - Unify UI and Agent API into Single DB Access Layer

**GitHub Issue:** #119
**Status:** Audit Complete, Refactor Pending

## Problem

The codebase has two separate entry points into the database:
1. **UI path** - Convex `query`/`mutation` functions called directly by the React frontend
2. **Agent API path** - `agentApi.ts` internal functions called from HTTP handlers in `http.ts`

These paths duplicate business logic (validation, permissions, notifications) with divergences that cause inconsistent behavior.

## Deliverables

- [x] **AUDIT.md** - Complete mapping of all UI and Agent API code paths with divergence analysis
- [ ] **Refactor plan** - Architecture for unified DB access layer
- [ ] **Implementation** - Refactored code with single code path

## Key Findings

See [AUDIT.md](./AUDIT.md) for the full audit. Summary:

- **16 duplicated operations** across comments, replies, versions, access, and shares
- **2 already-unified operations** (artifact create, add version) via shared internals
- **6 critical divergences**: missing validation, missing notifications, different permissions
- **10 gap operations** that exist on only one side
