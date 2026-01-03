# Grace Period Testing & Reactivity Guide

**Date:** 2025-12-27
**Purpose:** Explain how grace period dynamically updates and how to test expiry

---

## How Grace Period Binding Works

### 1. Server-Side (Source of Truth)

The grace period status is calculated server-side based on session creation time:

```typescript
// app/convex/settings.ts
const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

export const getGracePeriodStatus = query({
  handler: async (ctx) => {
    const session = await ctx.db.get(sessionId);
    const sessionAge = Date.now() - session._creationTime;
    const isWithinGracePeriod = sessionAge < GRACE_PERIOD_MS;

    return {
      isWithinGracePeriod,
      expiresAt: isWithinGracePeriod ? session._creationTime + GRACE_PERIOD_MS : null,
      sessionCreatedAt: session._creationTime
    };
  }
});
```

**Key points:**
- Uses session `_creationTime` (created by Convex Auth)
- Calculates expiry dynamically on every query
- Returns `null` for `expiresAt` when expired

---

### 2. Client-Side (Reactive UI)

The frontend uses Convex's reactive query system + local timer:

```typescript
// app/src/hooks/useGracePeriod.ts
export function useGracePeriod() {
  // Convex query - automatically re-runs when server data changes
  const gracePeriodStatus = useQuery(api.settings.getGracePeriodStatus);

  // Local countdown timer
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!gracePeriodStatus?.expiresAt) {
      setTimeRemaining(0);
      return;
    }

    // Update every second
    const updateTimer = () => {
      const remaining = Math.max(0, gracePeriodStatus.expiresAt - Date.now());
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [gracePeriodStatus?.expiresAt]);

  return {
    isWithinGracePeriod: gracePeriodStatus?.isWithinGracePeriod ?? false,
    expiresAt: gracePeriodStatus?.expiresAt,
    timeRemaining, // Milliseconds remaining (updates every second)
    isLoading: gracePeriodStatus === undefined,
  };
}
```

**How it works:**
1. **Initial load:** Query fetches grace period status from server
2. **Countdown:** `setInterval` updates `timeRemaining` every second
3. **Expiry:** When `timeRemaining` reaches 0, component re-renders
4. **Re-query:** Next query will return `isWithinGracePeriod: false`
5. **UI transition:** React automatically updates from green → orange banner

---

### 3. Component Reactivity

The PasswordSection component automatically updates when grace period expires:

```typescript
// app/src/components/settings/PasswordSection.tsx
export function PasswordSection() {
  const { isWithinGracePeriod, timeRemaining } = useGracePeriod();

  return (
    <>
      {/* Banner changes automatically when isWithinGracePeriod changes */}
      {isWithinGracePeriod ? (
        <div className="bg-green-50 border-green-200">
          <p>You recently signed in</p>
          <p>Time remaining: {formatTimeRemaining(timeRemaining)}</p>
        </div>
      ) : (
        <div className="bg-orange-50 border-orange-200">
          <p>Re-authentication required</p>
          <Button onClick={sendReauthLink}>Send Magic Link</Button>
        </div>
      )}

      {/* Current password field appears automatically when expired */}
      {!isWithinGracePeriod && (
        <Input
          name="currentPassword"
          type="password"
          placeholder="Current password"
          required
        />
      )}

      {/* Always visible */}
      <Input name="newPassword" type="password" />
      <Input name="confirmPassword" type="password" />
    </>
  );
}
```

**React automatically re-renders when:**
- `isWithinGracePeriod` changes from `true` → `false`
- `timeRemaining` updates every second

**User sees:**
1. **Minute 0-14:** Green banner, countdown timer, no current password field
2. **Minute 15:** Timer reaches 0:00, banner turns orange, current password field appears
3. **After 15:** Orange banner, current password required or re-auth option

---

## Testing Grace Period Expiry

### Challenge

Waiting 15 minutes in tests is impractical. We need faster validation.

---

### Solution 1: Configurable Grace Period (Recommended)

**Backend:**
```typescript
// app/convex/settings.ts
const GRACE_PERIOD_MS = process.env.NODE_ENV === 'test'
  ? 5 * 1000        // 5 seconds in tests
  : 15 * 60 * 1000; // 15 minutes in production
```

**Test:**
```typescript
// app/convex/__tests__/settings.test.ts
describe('Grace period expiry', () => {
  it('expires after configured duration', async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';

    // Create session
    const sessionId = await createTestSession();

    // Check immediately: within grace period
    const status1 = await ctx.runQuery(api.settings.getGracePeriodStatus);
    expect(status1.isWithinGracePeriod).toBe(true);
    expect(status1.expiresAt).toBeGreaterThan(Date.now());

    // Wait 6 seconds (exceeds 5-second grace period)
    await sleep(6000);

    // Check again: expired
    const status2 = await ctx.runQuery(api.settings.getGracePeriodStatus);
    expect(status2.isWithinGracePeriod).toBe(false);
    expect(status2.expiresAt).toBe(null);
  });
});
```

**Benefits:**
- Real grace period behavior
- Tests actual expiry logic
- Fast execution (6 seconds vs 15 minutes)

---

### Solution 2: Mock Date.now() (For Unit Tests)

**Test:**
```typescript
// app/src/__tests__/hooks/useGracePeriod.test.ts
import { jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { useGracePeriod } from '@/hooks/useGracePeriod';

describe('useGracePeriod hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('transitions from fresh to stale when timer expires', async () => {
    const now = 1700000000000; // Fixed timestamp
    jest.spyOn(Date, 'now').mockReturnValue(now);

    // Mock Convex query returning fresh grace period
    const mockQuery = jest.fn().mockReturnValue({
      isWithinGracePeriod: true,
      expiresAt: now + (15 * 60 * 1000),
      sessionCreatedAt: now
    });

    const { result, rerender } = renderHook(() => useGracePeriod());

    // Initially fresh
    expect(result.current.isWithinGracePeriod).toBe(true);
    expect(result.current.timeRemaining).toBe(15 * 60 * 1000);

    // Fast-forward 10 minutes
    jest.advanceTimersByTime(10 * 60 * 1000);
    jest.spyOn(Date, 'now').mockReturnValue(now + (10 * 60 * 1000));

    await waitFor(() => {
      expect(result.current.timeRemaining).toBe(5 * 60 * 1000);
    });

    // Fast-forward remaining 5 minutes
    jest.advanceTimersByTime(5 * 60 * 1000);
    jest.spyOn(Date, 'now').mockReturnValue(now + (15 * 60 * 1000));

    // Update mock to return expired state
    mockQuery.mockReturnValue({
      isWithinGracePeriod: false,
      expiresAt: null,
      sessionCreatedAt: now
    });

    rerender();

    await waitFor(() => {
      expect(result.current.isWithinGracePeriod).toBe(false);
      expect(result.current.timeRemaining).toBe(0);
    });
  });
});
```

**Benefits:**
- Instant time travel
- No waiting at all
- Tests timer logic in isolation

**Drawbacks:**
- More complex mocking
- Doesn't test actual backend calculation

---

### Solution 3: Debug Toggle (Manual Testing)

**Implementation:**
```typescript
// app/src/components/settings/DebugToggle.tsx
export function DebugToggle({ onOverride }: { onOverride: (state: 'auto' | 'fresh' | 'stale') => void }) {
  return (
    <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 mb-6">
      <p className="text-sm font-medium text-purple-900 mb-2">
        🔧 Debug Mode: Test Both States
      </p>
      <div className="flex gap-2">
        <Button onClick={() => onOverride('auto')}>Auto</Button>
        <Button onClick={() => onOverride('fresh')}>🔓 Fresh</Button>
        <Button onClick={() => onOverride('stale')}>🔒 Stale</Button>
      </div>
    </div>
  );
}

// In PasswordSection
const [debugOverride, setDebugOverride] = useState<'auto' | 'fresh' | 'stale'>('auto');
const { isWithinGracePeriod: actualGracePeriod } = useGracePeriod();

const effectiveGracePeriod =
  debugOverride === 'auto' ? actualGracePeriod :
  debugOverride === 'fresh' ? true :
  false;
```

**Usage:**
1. Visit `/settings`
2. Click "🔒 Stale" button
3. UI instantly shows stale state (orange banner, current password field)
4. Click "🔓 Fresh" to return to fresh state

**Benefits:**
- Instant state switching
- Visual validation
- No waiting required
- Great for design review

**Important:** Only renders in development (`process.env.NODE_ENV === 'development'`)

---

### Solution 4: E2E Test with Short Duration

**Test:**
```typescript
// tasks/00014-settings-page-implementation/tests/e2e/grace-period.spec.ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Set short grace period for testing
  process.env.GRACE_PERIOD_SECONDS = '5';
});

test('grace period expires and UI updates', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Go to settings
  await page.goto('/settings');

  // Verify fresh state (green banner, no current password field)
  await expect(page.locator('.bg-green-50')).toBeVisible();
  await expect(page.locator('text=You recently signed in')).toBeVisible();
  await expect(page.locator('[name="currentPassword"]')).not.toBeVisible();

  // Verify countdown timer is present
  const timerText = await page.locator('text=/\\d+ (minutes?|seconds?) \\d+ seconds?/').textContent();
  expect(timerText).toBeTruthy();

  // Wait for grace period to expire (6 seconds > 5 second grace period)
  await page.waitForTimeout(6000);

  // Verify stale state (orange banner, current password field visible)
  await expect(page.locator('.bg-orange-50')).toBeVisible();
  await expect(page.locator('text=Re-authentication required')).toBeVisible();
  await expect(page.locator('[name="currentPassword"]')).toBeVisible();
  await expect(page.locator('button:has-text("Send Magic Link")')).toBeVisible();
});
```

**Benefits:**
- Tests full integration
- Validates actual UI transitions
- Catches edge cases

---

## Recommended Testing Approach

### Backend Tests (Convex)
**Use:** Solution 1 (Configurable grace period)
- Set `NODE_ENV=test` for 5-second grace period
- Write tests that `await sleep(6000)` to verify expiry
- Fast enough for CI/CD (6 seconds per test)

### Frontend Unit Tests
**Use:** Solution 2 (Mock Date.now)
- Test hook logic in isolation
- Instant time travel with `jest.useFakeTimers()`
- Fast, deterministic

### Frontend Component Tests
**Use:** Mocked Convex query
```typescript
mockQuery('api.settings.getGracePeriodStatus', {
  isWithinGracePeriod: false, // Test stale state
  expiresAt: null,
  sessionCreatedAt: Date.now() - (20 * 60 * 1000)
});
```

### Manual Testing
**Use:** Solution 3 (Debug toggle)
- Instant state switching
- Visual validation
- Design review

### E2E Tests
**Use:** Solution 4 (Short duration in test env)
- Validates full flow
- Runs in CI with 5-second grace period

---

## Test Coverage Checklist

### Backend
- [ ] Grace period returns true when < 5 seconds old (test mode)
- [ ] Grace period returns false when > 5 seconds old
- [ ] Expiry timestamp calculated correctly
- [ ] Null timestamp when expired
- [ ] Works across session creation/expiry

### Frontend Hook
- [ ] Returns loading state initially
- [ ] Returns grace period status from query
- [ ] Countdown updates every second
- [ ] Timer reaches zero correctly
- [ ] Transitions from fresh to stale automatically

### Frontend UI
- [ ] Green banner shows when fresh
- [ ] Orange banner shows when stale
- [ ] Current password field hidden when fresh
- [ ] Current password field visible when stale
- [ ] Timer displays correct format (MM:SS)
- [ ] Re-auth button visible when stale
- [ ] Debug toggle switches states (dev only)

### Integration
- [ ] Password change succeeds within grace period (no current password)
- [ ] Password change requires current password when expired
- [ ] Re-auth magic link refreshes grace period
- [ ] UI updates automatically at expiry

---

## Manual Testing Procedure

1. **Start dev server** with debug toggle enabled
2. **Login** and navigate to `/settings`
3. **Verify fresh state:**
   - Green banner visible
   - Countdown timer showing ~15 minutes
   - No current password field
4. **Click debug toggle "Stale"**
   - Banner turns orange instantly
   - Current password field appears
   - "Send Magic Link" button visible
5. **Click debug toggle "Fresh"**
   - Returns to green banner
   - Current password field hidden
6. **Test actual expiry** (optional):
   - Set `GRACE_PERIOD_MS = 30 * 1000` (30 seconds)
   - Wait for countdown to reach 0
   - Verify UI transitions automatically

---

## Common Issues & Solutions

### Issue: Timer doesn't update
**Cause:** `setInterval` not cleaning up
**Solution:** Ensure `clearInterval` in useEffect cleanup

### Issue: UI doesn't transition at expiry
**Cause:** Query not re-running
**Solution:** Verify Convex reactivity, check network tab for queries

### Issue: Tests timeout waiting for expiry
**Cause:** Using production grace period (15 min) in tests
**Solution:** Set `NODE_ENV=test` to use 5-second grace period

### Issue: Debug toggle stays in production
**Cause:** Missing environment check
**Solution:** Wrap in `{process.env.NODE_ENV === 'development' && <DebugToggle />}`

---

## Next Steps

When implementing, ensure:
1. Backend uses configurable grace period
2. Frontend hook sets up timer correctly
3. Tests use appropriate strategy for each layer
4. Debug toggle only in development
5. E2E tests validate full flow

See individual subtask READMEs for detailed implementation instructions.
