# Dev Plan: Novu Workflow Setup (Subtask 02)

## Overview

This subtask configures the Novu workflow(s) for comment notifications. Based on analysis, **most implementation already exists**:

| Component | Status | Location |
|-----------|--------|----------|
| Workflow definition | ✅ Exists | `app/src/app/api/novu/workflows/comment-workflow.ts` |
| Bridge API route | ✅ Exists | `app/src/app/api/novu/route.ts` |
| Backend triggers | ✅ Exists | `app/convex/novu.ts` |
| NotificationCenter | ✅ Exists | `app/src/components/NotificationCenter.tsx` |
| Environment vars | ⚠️ Partial | `.env.local.example` has template |

**Primary Gap:** Unit tests for the workflow and documentation.

---

## Tests to Write (TDD Order)

### Unit Tests for Workflow Logic

Location: `tasks/00043-novu-comment-notifications/02-novu-workflow-setup/tests/unit/`

#### Test 1: Workflow exports and structure
- [x] **Test 1.1:** `commentWorkflow` is exported from `comment-workflow.ts`
- [x] **Test 1.2:** Workflow has correct name (`"new-comment"`)
- [x] **Test 1.3:** Workflow has trigger and discover functions (payload validation via Zod)

#### Test 2: In-app notification content generation
- [x] **Test 2.1:** New comment generates correct subject: `"New comment on {artifactTitle}"`
- [x] **Test 2.2:** Reply to comment author generates: `"{authorName} replied to your comment"`
- [x] **Test 2.3:** Reply to thread participant generates: `"New reply on {artifactTitle}"`
- [x] **Test 2.4:** Avatar URL is passed through correctly
- [x] **Test 2.5:** Primary action URL points to artifact

#### Test 3: Email digest content generation
- [x] **Test 3.1:** Single comment generates correct email subject
- [x] **Test 3.2:** Single reply generates correct email subject
- [x] **Test 3.3:** Multiple comments generates plural subject: `"3 comments on {artifact}"`
- [x] **Test 3.4:** Mixed comments/replies generates combined subject: `"2 comments and 1 reply on {artifact}"`
- [x] **Test 3.5:** Email body contains all digested events
- [x] **Test 3.6:** Each event has author name, preview text, and view link

#### Test 4: Digest configuration
- [x] **Test 4.1:** Default digest interval is 10 minutes
- [x] **Test 4.2:** `NOVU_DIGEST_INTERVAL` env var overrides default
- [x] **Test 4.3:** Digest unit is "minutes"

#### Test 5: Payload validation
- [x] **Test 5.1:** Valid payload passes schema validation
- [x] **Test 5.2:** Missing required fields (`artifactDisplayTitle`, `authorName`, `commentPreview`, `artifactUrl`) rejected
- [x] **Test 5.3:** Optional fields (`isReply`, `isCommentAuthor`, `authorAvatarUrl`) are truly optional

### Integration Tests (Novu Bridge)

Location: `tasks/00043-novu-comment-notifications/02-novu-workflow-setup/tests/unit/`

#### Test 6: Bridge endpoint registration
- [x] **Test 6.1:** `GET /api/novu` exports handler function
- [x] **Test 6.2:** `POST /api/novu` exports handler function
- [x] **Test 6.3:** `OPTIONS /api/novu` exports handler function

---

## Implementation Steps

### Step 1: Create Test Infrastructure
1. Create test directory structure:
   ```
   tasks/00043-novu-comment-notifications/02-novu-workflow-setup/tests/
   ├── unit/
   │   ├── comment-workflow.test.ts
   │   └── novu-bridge.test.ts
   └── vitest.config.ts
   ```

2. Set up Vitest config to run workflow tests

### Step 2: Write Failing Tests (RED)
1. Write tests for workflow structure (Test 1.x)
2. Write tests for in-app notification content (Test 2.x)
3. Write tests for email digest content (Test 3.x)
4. Write tests for digest configuration (Test 4.x)
5. Write tests for payload validation (Test 5.x)
6. Write tests for bridge endpoint (Test 6.x)

### Step 3: Verify Existing Implementation (GREEN)
Since the workflow already exists, tests should pass. If any fail:
1. Fix workflow logic in `comment-workflow.ts`
2. Fix bridge route in `route.ts`
3. Update payload schema if needed

### Step 4: Add Test Selectors (Enhancement)
Update `NotificationCenter.tsx` to add `data-testid` attributes for E2E testing:
- `data-testid="notification-bell"`
- `data-testid="notification-badge"`
- `data-testid="notification-count"`

### Step 5: Create Documentation
Create `docs/development/novu-setup.md` with:
- Environment variables required
- Local development setup
- Bridge endpoint configuration
- Testing workflow locally
- Troubleshooting common issues

---

## Files to Create/Modify

### Files to Create

| File | Description |
|------|-------------|
| `tasks/00043-novu-comment-notifications/02-novu-workflow-setup/tests/unit/comment-workflow.test.ts` | Workflow logic unit tests |
| `tasks/00043-novu-comment-notifications/02-novu-workflow-setup/tests/unit/novu-bridge.test.ts` | Bridge endpoint tests |
| `tasks/00043-novu-comment-notifications/02-novu-workflow-setup/tests/vitest.config.ts` | Vitest configuration |
| `docs/development/novu-setup.md` | Setup documentation |

### Files to Modify

| File | Change |
|------|--------|
| `app/src/components/NotificationCenter.tsx` | Add `data-testid` attributes |
| `docs/development/_index.md` | Add link to novu-setup.md |

### Files to Verify (No Changes Expected)

| File | Verification |
|------|--------------|
| `app/src/app/api/novu/workflows/comment-workflow.ts` | Workflow logic correct |
| `app/src/app/api/novu/route.ts` | Bridge route configured |
| `app/convex/novu.ts` | Trigger functions exist |
| `app/.env.local.example` | All required vars documented |

---

## Acceptance Criteria Checklist

### Workflow Configuration
- [x] `"new-comment"` workflow exists and is registered with Novu Bridge
- [x] Workflow payload schema validates all required fields
- [x] In-app notification step generates correct content
- [x] Digest step batches notifications per `NOVU_DIGEST_INTERVAL`
- [x] Email step generates correct subject and body for single/multiple events

### Test Coverage
- [x] Unit tests cover all workflow branches (comment vs reply, single vs multiple)
- [x] Payload validation tests cover required and optional fields
- [x] Bridge endpoint tests verify registration

### Test Selectors
- [x] `data-testid="notification-bell"` on bell icon
- [x] `data-testid="notification-badge"` on unseen count badge
- [x] `data-testid="notification-count"` on count value

### Documentation
- [x] `docs/development/novu-setup.md` created with setup instructions
- [x] Environment variables documented
- [x] Local development workflow documented
- [x] Troubleshooting section included

### Existing Tests Pass
- [x] `app/convex/__tests__/novu-subscriber.test.ts` continues to pass
- [x] No regressions in existing functionality

---

## Test Commands

```bash
# Run subtask unit tests
cd tasks/00043-novu-comment-notifications/02-novu-workflow-setup/tests
npx vitest run

# Run existing Novu tests (verify no regression)
cd app
npx vitest run convex/__tests__/novu-subscriber.test.ts

# Verify bridge endpoint (manual)
curl http://localhost:3000/api/novu
```

---

## Dependencies

- **Subtask 01 (Subscriber Sync):** Should be complete for subscribers to exist
- **Novu SDK:** `@novu/framework`, `@novu/node` already installed
- **Zod:** For payload schema validation (already used)

---

## Notes

1. **Workflow Already Exists:** The implementation in `comment-workflow.ts` is complete. This subtask focuses on:
   - Writing tests to verify correctness
   - Adding test selectors for E2E
   - Creating documentation

2. **Testing Strategy:** Since Novu Framework workflows are declarative, tests focus on:
   - Correct payload schema
   - Content generation logic
   - Digest configuration

3. **No Convex Changes:** All Convex trigger code in `novu.ts` is already implemented. This subtask is purely frontend (Next.js API route + workflow).
