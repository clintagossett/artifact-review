# Task 00106: Code Quality Improvements

**GitHub Issue:** [#106](https://github.com/clintagossett/artifact-review/issues/106)
**Status:** In Progress
**Code Review:** [`tasks/code-review-2026-02-07.md`](../code-review-2026-02-07.md)

## Overview

Code quality improvements identified in comprehensive code review. Work organized into 3 cycles, each completed and verified before moving to the next.

## Cycle 1: Security & Critical Bugs

Focus: Fix security vulnerabilities and critical bugs.

| Item | Status | Notes |
|------|--------|-------|
| #1 Path traversal fix | CLOSED | False positive - database lookup, not filesystem |
| #2 Math.max empty array guard | FIXED | Added guards in 3 frontend files |
| #4 Singleton cleanup | CLOSED | False positive - uses React useMemo properly |

**Files Modified:**
- `app/src/components/artifact/ArtifactViewerPage.tsx`
- `app/src/components/artifact/ArtifactViewer.tsx`
- `app/src/components/share/PublicArtifactViewer.tsx`

**Verification:**
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual verification of version display

---

## Cycle 2: Auth/API Hardening

Focus: Security testing for API endpoints and auth.

### Tasks

| Item | Status | Notes |
|------|--------|-------|
| #3 apiKeys.ts test coverage | TODO | New test file with security scenarios |
| #9 localStorage error handling | TODO | Wrap in try/catch for Safari private mode |
| #15 HTTP error response standardization | TODO | Consistent JSON error format |

### Security Test Requirements

**API Key Tests (think like an attacker):**
- [ ] Invalid/malformed API keys (wrong prefix, truncated, garbage)
- [ ] Expired API keys
- [ ] Revoked API keys
- [ ] Missing auth headers (no X-API-Key, no Authorization)
- [ ] Rate limiting enforcement
- [ ] Cross-user access attempts (user A tries user B's artifact)
- [ ] Resource enumeration prevention

**HTTP Endpoint Tests:**
- [ ] Unauthorized requests (no key, bad key)
- [ ] Forbidden requests (valid key, wrong owner)
- [ ] Malformed request bodies (invalid JSON, missing fields)
- [ ] SQL/NoSQL injection patterns in inputs
- [ ] XSS payloads in content fields
- [ ] Oversized payloads
- [ ] Invalid IDs (wrong format, non-existent)

**localStorage Handling:**
- [ ] Safari private browsing (throws SecurityError)
- [ ] Quota exceeded scenarios
- [ ] Corrupted stored data

**Verification:**
- [ ] All new tests pass
- [ ] Existing tests still pass
- [ ] Security test coverage report

---

## Cycle 3: DRY Refactoring

Focus: Extract repeated patterns into shared utilities.

### Tasks

| Item | Status | Notes |
|------|--------|-------|
| #5 Extract auth helper | TODO | Reduce 25+ auth validation duplications |
| #6 Extract owner verification helper | TODO | Reduce 8 artifact ownership check duplications |

### Implementation Plan

**Auth Helper (`app/convex/lib/auth.ts`):**
```typescript
export async function authenticateRequest(ctx: ActionCtx, request: Request) {
  const apiKeyHeader = extractApiKey(request);
  if (!apiKeyHeader) return { error: "Unauthorized", status: 401 };

  const apiKey = await ctx.runQuery(internal.apiKeys.validateApiKey, { key: apiKeyHeader });
  if (!apiKey) return { error: "Invalid API key", status: 401 };

  return { userId: apiKey.userId, agentId: apiKey.agentId };
}
```

**Owner Verification Helper (`app/convex/lib/artifacts.ts`):**
```typescript
export async function getArtifactAsOwner(
  ctx: QueryCtx,
  shareToken: string,
  userId: Id<"users">
) {
  const artifact = await ctx.db
    .query("artifacts")
    .withIndex("by_share_token", (q) => q.eq("shareToken", shareToken))
    .first();
  if (!artifact) throw new Error("Artifact not found");
  if (artifact.createdBy !== userId) throw new Error("Not authorized");
  return artifact;
}
```

**Verification:**
- [ ] All tests pass after refactoring
- [ ] No behavior changes (pure refactor)
- [ ] Reduced LOC in http.ts and agentApi.ts

---

## Acceptance Criteria

- [ ] All 3 cycles completed
- [ ] All unit tests pass (168+ tests)
- [ ] All E2E tests pass
- [ ] Security test coverage for attack scenarios
- [ ] Code review report updated with fix status
- [ ] Single PR to dev with all changes
- [ ] Staging verification after merge

## Test Commands

```bash
# Unit tests
cd app && npm test

# E2E tests
cd app && npm run test:e2e

# Specific test file
cd app && npm test -- apiKeys
```
