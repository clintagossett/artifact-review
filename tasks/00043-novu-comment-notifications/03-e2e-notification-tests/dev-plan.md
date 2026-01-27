# Dev Plan: E2E Notification Tests

## Overview

Create comprehensive E2E tests for the Novu-powered notification system, validating in-app bell notifications work correctly for comment and reply scenarios.

## Current State

- **Test infrastructure**: Created (package.json, playwright.config.ts) ✅
- **Novu utilities**: Created in `app/tests/utils/novu.ts` ✅
- **Test selectors**: Already added to NotificationCenter.tsx, AnnotationSidebar.tsx, AnnotationCard.tsx ✅
- **All 6 test scenarios**: Implemented in `notification.spec.ts` ✅
- **Test execution**: ❌ **BLOCKED** - Orchestrator proxy not running

### Infrastructure Blocker
The orchestrator proxy (`/home/clint-gossett/Documents/agentic-dev/orchestrator/proxy.js`) is required for WebSocket connections to `api.mark.loc`. Without it, Convex sync fails and authentication hangs.

**Fix**: Run `sudo node proxy.js` from the orchestrator directory.

## Dependencies

- Subtask 01 (Subscriber Sync) - Complete
- Subtask 02 (Novu Workflow Setup) - Complete
- `NotificationCenter.tsx` has `data-testid` attributes (`notification-bell`, `notification-badge`, `notification-count`)
- `AnnotationSidebar.tsx` has `data-testid` attributes (`annotation-comment-input`, `annotation-submit-button`, `annotation-cancel-button`)
- `AnnotationCard.tsx` has `data-testid` attributes (`annotation-reply-button`, `annotation-reply-input`, `annotation-reply-submit`)

## Test Cases (TDD Order)

### Test 1: New Comment Notifies Artifact Owner
- [x] **Test 1.1**: Reviewer comments on artifact → Owner sees notification badge (IMPLEMENTED - blocked by infra)
  - **Setup**: Create owner user, create reviewer user, owner uploads artifact, owner invites reviewer
  - **Action**: Reviewer adds a comment via the annotation sidebar
  - **Assert**: Owner's notification bell shows badge with count "1"

### Test 2: Reply Notifies Comment Author
- [x] **Test 2.1**: Owner replies to reviewer's comment → Reviewer sees notification badge (IMPLEMENTED - blocked by infra)
  - **Setup**: Continue from Test 1 scenario (reviewer has commented)
  - **Action**: Owner replies to reviewer's comment using reply input
  - **Assert**: Reviewer's notification bell shows badge increment

### Test 3: Thread Participants Get Notified
- [x] **Test 3.1**: Third user replies in thread → Both owner and original commenter notified (IMPLEMENTED - blocked by infra)
  - **Setup**: Three users, reviewer1 comments, owner replies
  - **Action**: Reviewer2 replies in the same thread
  - **Assert**: Reviewer1's bell shows notification, Owner also sees notification

### Test 4: Self-Comment Does NOT Trigger Notification
- [x] **Test 4.1**: Owner comments on own artifact → Owner does NOT get notification (IMPLEMENTED - blocked by infra)
  - **Setup**: Owner user, owner uploads artifact
  - **Action**: Owner adds a comment on their own artifact
  - **Assert**: Owner's notification badge does NOT appear (count stays 0 or hidden)

### Test 5: Notification Count Accumulates
- [x] **Test 5.1**: Multiple comments → Badge shows correct count (IMPLEMENTED - blocked by infra)
  - **Setup**: Owner user, reviewer user, artifact uploaded
  - **Action**: Reviewer adds 3 comments sequentially
  - **Assert**: Owner's notification badge shows "3"

### Test 6: Mark as Read Clears Badge
- [x] **Test 6.1**: Owner opens notification center → Badge clears (IMPLEMENTED - blocked by infra)
  - **Setup**: Owner has unseen notifications from previous comments
  - **Action**: Owner clicks notification bell to open popover
  - **Assert**: Badge disappears or count resets to 0

## Implementation Steps

### Step 1: Complete Test 1 (RED → GREEN)

1. **Fix the text selection and comment flow** in `selectTextAndComment()` helper
   - Current implementation uses JavaScript evaluation to select text in iframe
   - May need to adjust selector logic for actual artifact content structure
   - Ensure annotation sidebar opens correctly after selection

2. **Verify notification badge appears**
   - Use `waitForNotificationCount(ownerPage, 1, 30000)`
   - Ensure Novu WebSocket is connected and receiving events

3. **Debug steps if test fails**:
   - Check Novu workflow is triggered on comment creation
   - Verify subscriber sync is working (user exists in Novu)
   - Check browser console for Novu SDK errors

### Step 2: Write Test 2 (RED → GREEN)

1. Write test for "Reply notifies comment author"
2. Use `data-testid="annotation-reply-button"` to open reply form
3. Use `data-testid="annotation-reply-input"` to type reply
4. Use `data-testid="annotation-reply-submit"` to submit
5. Verify reviewer's notification badge appears

### Step 3: Write Test 3 (RED → GREEN)

1. Write test for "Thread participants notified"
2. This tests the multi-recipient notification scenario
3. Need 3 browser contexts (owner, reviewer1, reviewer2)
4. Verify both owner and reviewer1 receive notifications when reviewer2 replies

### Step 4: Write Test 4 (RED → GREEN)

1. Write test for "Self-comment no notification"
2. Owner creates artifact and comments on it
3. Verify owner does NOT see notification badge
4. Use `expectNoNotificationBadge(ownerPage, 10000)` to verify absence

### Step 5: Write Test 5 (RED → GREEN)

1. Write test for "Multiple comments accumulate"
2. Reviewer adds 3 separate comments
3. Verify badge shows "3" using `waitForNotificationCount(ownerPage, 3, 45000)`

### Step 6: Write Test 6 (RED → GREEN)

1. Write test for "Mark as read"
2. Owner has unseen notifications
3. Owner clicks bell to open notification center
4. Verify badge clears after opening

### Step 7: Refactor and Cleanup

1. Extract common setup into test fixtures
2. Add retry logic for timing-sensitive assertions
3. Generate traces for all tests
4. Create test-report.md

## Files to Create/Modify

| File | Action | Status | Description |
|------|--------|--------|-------------|
| `03-e2e-.../tests/e2e/package.json` | Create | ✅ Done | Playwright dependencies |
| `03-e2e-.../tests/e2e/playwright.config.ts` | Create | ✅ Done | Task-specific Playwright config |
| `03-e2e-.../tests/e2e/notification.spec.ts` | Modify | ✅ Done | All 6 test scenarios implemented |
| `app/tests/utils/novu.ts` | Create | ✅ Done | Novu test utilities |
| `app/src/components/annotations/AnnotationSidebar.tsx` | Modify | ✅ Done | Has `data-testid` attributes |
| `app/src/components/annotations/AnnotationCard.tsx` | Modify | ✅ Done | Has `data-testid` attributes |

## Existing Test Utilities

### Novu Utilities (`app/tests/utils/novu.ts`)

```typescript
// Already implemented:
waitForNotificationCount(page, count, timeout)
expectNoNotificationBadge(page, timeout)
openNotificationCenter(page)
waitForNotificationFeed(page)
getNotificationCount(page)
waitForNotificationCountAtLeast(page, minCount, timeout)
```

### Test Selectors (Already in Components)

#### NotificationCenter.tsx
- `data-testid="notification-bell"` - Bell icon container
- `data-testid="notification-badge"` - Badge element
- `data-testid="notification-count"` - Count text inside badge

#### AnnotationSidebar.tsx
- `data-testid="annotation-comment-input"` - Textarea for new comment
- `data-testid="annotation-submit-button"` - Submit button for comment
- `data-testid="annotation-cancel-button"` - Cancel button for draft

#### AnnotationCard.tsx
- `data-testid="annotation-reply-button"` - Reply action button
- `data-testid="annotation-reply-input"` - Reply textarea
- `data-testid="annotation-reply-submit"` - Submit reply button

## Test Data Strategy

- Use `generateUser()` pattern from `collaboration.spec.ts`
- Use sample files from `/samples/` for artifact uploads
- Generate unique artifact names per test run

## Timing Considerations

1. **Novu WebSocket latency**: Notifications may take 1-3 seconds to appear
2. **Convex sync latency**: Database writes propagate via real-time subscriptions
3. **Retry strategy**: Use Playwright's `expect(...).toBeVisible({ timeout: 30000 })` for notification assertions
4. **Test isolation**: Each test uses fresh browser contexts and unique users

## Acceptance Criteria Checklist

- [x] `notification.spec.ts` exists with all 6 test scenarios
- [ ] Test 1.1: New comment notifies artifact owner - ⏳ BLOCKED BY INFRA
- [ ] Test 2.1: Reply notifies comment author - ⏳ BLOCKED BY INFRA
- [ ] Test 3.1: Thread participants notified - ⏳ BLOCKED BY INFRA
- [ ] Test 4.1: Self-comment no notification - ⏳ BLOCKED BY INFRA
- [ ] Test 5.1: Multiple comments accumulate - ⏳ BLOCKED BY INFRA
- [ ] Test 6.1: Mark as read clears badge - ⏳ BLOCKED BY INFRA
- [ ] All tests pass reliably (no flakiness)
- [x] Test utilities available in `app/tests/utils/novu.ts`
- [ ] Trace files generated for all tests
- [x] Tests follow patterns from `collaboration.spec.ts`
- [x] Tests use `/samples/` for artifact files
- [x] 120-second timeout for multi-user tests
- [x] Browser contexts properly isolated per user

## Infrastructure Blocker Details

**Issue**: Orchestrator proxy not running prevents WebSocket connections
**Error**: `WebSocket connection to 'ws://api.mark.loc/api/1.31.2/sync' failed`
**Fix Required**: Start orchestrator proxy with `sudo node proxy.js` from orchestrator directory
**Impact**: All E2E tests requiring authentication are blocked

## Test Execution

```bash
# From task tests directory
cd tasks/00043-novu-comment-notifications/03-e2e-notification-tests/tests/e2e
npm install
npx playwright test

# Run specific test
npx playwright test -g "1.1"

# View traces
npx playwright show-trace test-results/*/trace.zip

# Run with UI for debugging
npx playwright test --ui
```

## Debugging Tips

1. **If notifications don't appear:**
   - Check Novu dashboard for workflow executions
   - Verify subscriber exists in Novu (check subscriberId matches)
   - Check browser console for Novu SDK connection errors
   - Verify `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER` is set

2. **If comment creation fails:**
   - Check iframe content loads properly
   - Verify text selection triggers annotation sidebar
   - Check annotation submit completes without errors

3. **If tests are flaky:**
   - Increase timeouts for notification assertions
   - Add explicit waits after actions
   - Use `page.reload()` to force state sync if needed
