# Subtask 03: E2E Notification Tests

## Objective

Create comprehensive E2E tests that verify comment and reply notifications work correctly, including in-app bell notifications and email digests.

## Context

From `docs/journeys/003-reviewer-comments-and-feedback.md`:
- E2E tests should be in `tests/e2e/notification.spec.ts`
- Tests should validate in-app notification badge appears
- Tests should validate email digest batching

Currently:
- `notification.spec.ts` does not exist
- Similar patterns exist in `collaboration.spec.ts` (multi-user flows)

## Technical Approach

### Test Scenarios

1. **New Comment → Owner Notification**
   - Reviewer comments on artifact
   - Owner sees bell badge increment
   - Notification feed shows comment

2. **Reply → Comment Author Notification**
   - Owner replies to reviewer's comment
   - Reviewer sees bell badge increment
   - Notification shows "replied to your comment"

3. **Reply → Thread Participants Notification**
   - Third user replies in thread
   - Original commenter and previous repliers notified

4. **Self-Comment No Notification**
   - Owner comments on own artifact
   - Owner does NOT get notification

5. **Email Digest Batching** (if testable)
   - Multiple comments within digest window
   - Single email sent with count

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `tasks/00043-novu-comment-notifications/tests/e2e/notification.spec.ts` | Create | Main E2E test file |
| `tasks/00043-novu-comment-notifications/tests/e2e/fixtures/` | Create | Test fixtures and helpers |
| `app/tests/utils/novu.ts` | Create | Novu test utilities (mock/wait helpers) |

## Implementation Details

### Test File Structure

```typescript
// tasks/00043-novu-comment-notifications/tests/e2e/notification.spec.ts
import { test, expect } from '@playwright/test';
import { getLatestEmail, extractMagicLink } from '../../../app/tests/utils/resend';

const generateUser = (prefix = 'user') => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return {
    name: `${prefix}-${timestamp}`,
    email: `${prefix}+${timestamp}-${random}@tolauante.resend.app`,
  };
};

test.describe('Comment Notifications', () => {
  let owner: { name: string; email: string };
  let reviewer: { name: string; email: string };
  let artifactUrl: string;

  test.beforeAll(async () => {
    owner = generateUser('owner');
    reviewer = generateUser('reviewer');
  });

  test('New comment notifies artifact owner', async ({ browser }) => {
    test.setTimeout(120000);

    const ownerContext = await browser.newContext();
    const reviewerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const reviewerPage = await reviewerContext.newPage();

    // 1. Owner logs in and creates artifact
    // ... (setup similar to collaboration.spec.ts)

    // 2. Owner invites reviewer
    // ... (share artifact)

    // 3. Reviewer logs in and comments
    await reviewerPage.goto(artifactUrl);
    // ... (add comment via UI)

    // 4. Verify owner sees notification
    // Navigate to dashboard or check header
    await ownerPage.reload();

    // Wait for bell badge to appear
    const bellBadge = ownerPage.locator('[data-testid="notification-badge"]');
    await expect(bellBadge).toBeVisible({ timeout: 30000 });
    await expect(bellBadge).toHaveText('1');

    // Click bell to open notification center
    await ownerPage.locator('[data-testid="notification-bell"]').click();

    // Verify notification content
    await expect(ownerPage.getByText('commented')).toBeVisible();
    await expect(ownerPage.getByText(reviewer.name)).toBeVisible();

    await ownerContext.close();
    await reviewerContext.close();
  });

  test('Reply notifies original comment author', async ({ browser }) => {
    // ... similar structure with reply flow
  });

  test('Self-comment does not trigger notification', async ({ browser }) => {
    // Owner comments on own artifact
    // Verify NO notification badge appears
  });
});
```

### Required Test Selectors

Add `data-testid` attributes to `NotificationCenter.tsx`:

```tsx
// In NotificationCenter.tsx
<div className="relative cursor-pointer" data-testid="notification-bell">
  <Bell className="h-5 w-5 ..." />
  {(unseenCount || 0) > 0 && (
    <span data-testid="notification-badge" className="...">
      {unseenCount}
    </span>
  )}
</div>
```

### Novu Test Utilities

```typescript
// app/tests/utils/novu.ts
import { expect, Page } from '@playwright/test';

/**
 * Wait for notification badge to show expected count
 */
export async function waitForNotificationCount(page: Page, count: number, timeout = 30000) {
  const badge = page.locator('[data-testid="notification-badge"]');

  if (count === 0) {
    await expect(badge).not.toBeVisible({ timeout });
  } else {
    await expect(badge).toHaveText(String(count), { timeout });
  }
}

/**
 * Open notification center and verify content
 */
export async function openNotificationCenter(page: Page) {
  await page.locator('[data-testid="notification-bell"]').click();
  // Wait for popover to open
  await page.waitForSelector('.novu-notification-center', { timeout: 5000 });
}
```

## Test Cases

| Test Case | Actors | Action | Expected Result |
|-----------|--------|--------|-----------------|
| New comment | Reviewer → Owner | Reviewer comments | Owner bell shows 1 |
| Reply to author | Owner → Reviewer | Owner replies | Reviewer bell shows 1 |
| Thread notification | User3 → Owner, Reviewer | User3 replies | Both see notification |
| Self-comment | Owner | Comments on own | No notification |
| Mark as read | Owner | Opens notification | Badge clears |
| Multiple comments | Reviewer x3 | 3 comments | Badge shows 3 |

## Dependencies

- Subtask 01 (Subscriber Sync) must be complete
- Subtask 02 (Workflow Setup) must be complete
- Test data selectors added to `NotificationCenter.tsx`

## Acceptance Criteria

- [ ] `notification.spec.ts` exists with passing tests
- [ ] Tests cover all notification scenarios from journey doc
- [ ] Test video recordings generated (gitignored)
- [ ] Tests run reliably in CI (retry strategy for timing issues)
- [ ] Notification badge selectors added to components
