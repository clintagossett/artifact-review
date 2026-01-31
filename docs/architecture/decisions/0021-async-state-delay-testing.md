---
title: Async State Delay Testing Pattern
status: Accepted
date: 2026-01-31
deciders: Clint Gossett
task: 00049
---

# 21. Async State Delay Testing Pattern

## Context

Modern web applications have async operations that transition through multiple UI states (uploading → processing → ready). These transitions happen quickly in production, making it difficult to:

1. **Visually verify** UI states are rendering correctly
2. **Capture screenshots** of intermediate states for documentation
3. **Debug** issues with state transitions
4. **Test** that real-time subscriptions properly update the UI

During Task 00049 (artifact version processing status), we needed to verify that the `UploadStatusIndicator` component correctly displayed uploading, processing, and ready states. The transitions were too fast to observe or capture.

### The Problem

```
Upload starts → "uploading" (50ms) → "processing" (200ms) → "ready"
                     ↑                      ↑
               Too fast to see      Too fast to capture
```

## Decision

Implement a **configurable delay pattern** using environment variables that:

1. Adds artificial delays between state transitions **only when testing**
2. Is controlled via `NEXT_PUBLIC_TEST_ASYNC_DELAY_MS` environment variable
3. Is threaded through the system via `_testDelayMs` parameter
4. Is **never active in production** (env var not set)

### Implementation Pattern

**1. Environment Variable (Frontend)**

```typescript
// Read delay from env (0 if not set)
const testDelayMs = parseInt(process.env.NEXT_PUBLIC_TEST_ASYNC_DELAY_MS || "0", 10);

// Pass to backend only if positive
await triggerProcessing({
  versionId,
  storageId,
  _testDelayMs: testDelayMs > 0 ? testDelayMs : undefined,
});
```

**2. Backend Action Parameter**

```typescript
export const processFile = internalAction({
  args: {
    versionId: v.id("artifactVersions"),
    storageId: v.id("_storage"),
    _testDelayMs: v.optional(v.number()),  // Underscore prefix = internal/test
  },
  handler: async (ctx, args) => {
    // Delay BEFORE state transition (stay in previous state longer)
    if (args._testDelayMs && args._testDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, args._testDelayMs));
    }

    // Transition to next state
    await ctx.runMutation(internal.mutations.updateStatus, {
      id: args.versionId,
      status: "processing",
    });

    // Delay AFTER state transition (stay in current state longer)
    if (args._testDelayMs && args._testDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, args._testDelayMs));
    }

    // ... actual processing ...
  },
});
```

**3. Test Script Configuration**

```json
// package.json
{
  "scripts": {
    "test:e2e:visual": "NEXT_PUBLIC_TEST_ASYNC_DELAY_MS=10000 playwright test --headed --grep 'visual:'"
  }
}
```

### State Timing with Delays

With `NEXT_PUBLIC_TEST_ASYNC_DELAY_MS=3000`:

```
Upload starts
    │
    ▼
"uploading" ────────────────────► (3 seconds visible)
    │
    ▼
"processing" ───────────────────► (3 seconds visible)
    │
    ▼
"ready"
```

Total time: 6 seconds (3s per state × 2 state transitions)

## Consequences

### Positive

- **Observable states**: Can visually verify each UI state
- **Screenshot capture**: Tests can capture intermediate states
- **Zero production impact**: Env var not set = no delays
- **Reusable pattern**: Any async feature can use this approach
- **Simple**: No complex test infrastructure needed
- **Hot-reloadable**: Next.js picks up `.env.local` changes without restart

### Negative

- **Test duration**: Visual tests take longer (by design)
- **Parameter threading**: Must pass `_testDelayMs` through action chain
- **Convention-based**: Developers must remember to add delays at state transitions

### Neutral

- **Environment-specific**: Only affects local dev and test environments

## Usage Guidelines

### When to Use This Pattern

| Use Case | Use Delay Pattern? |
|----------|-------------------|
| Visual verification of async UI | Yes |
| Screenshot capture for docs | Yes |
| Debugging state transitions | Yes |
| Normal E2E tests | No (too slow) |
| Unit tests | No (mock instead) |
| Production | Never |

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Env var | `NEXT_PUBLIC_TEST_ASYNC_DELAY_MS` | Single global setting |
| Parameter | `_testDelayMs` | Underscore prefix indicates internal/test |
| Test grep | `visual:` prefix | `test('visual: upload states')` |
| Script | `test:e2e:visual` | Separate from normal E2E |

### Adding to New Features

1. **Add parameter to action chain**:
   ```typescript
   _testDelayMs: v.optional(v.number())
   ```

2. **Add delays at state transitions**:
   ```typescript
   if (args._testDelayMs && args._testDelayMs > 0) {
     await new Promise(resolve => setTimeout(resolve, args._testDelayMs));
   }
   ```

3. **Thread from frontend**:
   ```typescript
   const testDelayMs = parseInt(process.env.NEXT_PUBLIC_TEST_ASYNC_DELAY_MS || "0", 10);
   ```

4. **Create visual test**:
   ```typescript
   test('visual: feature state transitions', async ({ page }) => {
     // Test captures screenshots at each state
   });
   ```

## Alternatives Considered

### 1. Mock Time / Fake Timers

Use Jest/Vitest fake timers to control time.

**Rejected**: Doesn't work for real async operations like file uploads and Convex mutations. Only useful for `setTimeout`-based delays in frontend code.

### 2. Polling with Retry

Poll for states with short intervals.

**Rejected**: Doesn't let you observe the state visually. Good for assertions but not for visual verification.

### 3. Separate Test Environment

Different backend with built-in delays.

**Rejected**: Over-engineered. Would require maintaining two backend configurations.

### 4. Browser DevTools Throttling

Use Chrome's network/CPU throttling.

**Rejected**: Affects everything, not just specific state transitions. Can cause unrelated failures.

## Affected Files

| File | Change |
|------|--------|
| `convex/zipProcessor.ts` | Added `_testDelayMs` parameter with delays at state transitions |
| `convex/zipUpload.ts` | Thread `_testDelayMs` to internal action |
| `src/hooks/useArtifactUpload.ts` | Read env var and pass to backend |
| `package.json` | Added `test:e2e:visual` script |
| `tests/e2e/artifact-workflow.visual.spec.ts` | Visual tests with screenshot capture |

## Related

- Task: `tasks/00049-artifact-version-status/`
- Testing Guide: `docs/development/testing-guide.md#visual-async-testing`
