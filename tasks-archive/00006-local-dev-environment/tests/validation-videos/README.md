# Validation Videos - Anonymous Authentication

## Files

| File | Description | How to View |
|------|-------------|-------------|
| `anonymous-auth-flow.webm` | Video recording of the test | Any video player |
| `anonymous-auth-trace.zip` | Playwright trace with click tracking (red dots/animations) | `npx playwright show-trace anonymous-auth-trace.zip` |

## Viewing the Trace (Click Tracking with Red Dots)

The trace file contains **interactive playback** with click tracking, red dot animations, and full DevTools:

```bash
cd tasks/00006-local-dev-environment/tests
npx playwright show-trace ./validation-videos/anonymous-auth-trace.zip
```

This will open an interactive viewer in your browser showing:
- ✅ Click animations with red dots
- ✅ Screenshot of every action
- ✅ Network requests
- ✅ Console logs
- ✅ DOM snapshots
- ✅ Timeline scrubbing

## What the Test Validates

The E2E test demonstrates the complete anonymous authentication flow:

1. **Landing Page Load**
   - Page loads and displays "Artifact Review" heading
   - "Start Using Artifact Review" button is visible

2. **Anonymous Sign-In**
   - User clicks the sign-in button
   - Authentication completes successfully
   - "Welcome to Artifact Review" heading appears
   - "Anonymous session" text is displayed
   - User ID is generated and displayed

3. **Session Persistence**
   - Page is refreshed
   - Session persists across refresh
   - Same User ID is maintained
   - JWT token remains in localStorage

## Test Source

The Playwright E2E test is located at:
- `tasks/00006-local-dev-environment/tests/e2e/anonymous-auth.spec.ts`

To run the test yourself:

```bash
cd tasks/00006-local-dev-environment/tests
npx playwright test
```

To run with visible browser:

```bash
cd tasks/00006-local-dev-environment/tests
npx playwright test --headed
```

## Playwright Configuration

Configuration: `tasks/00006-local-dev-environment/tests/playwright.config.ts`

Key settings:
- Video recording: Always on
- Trace recording: Always on (includes action tracking)
- Screenshots: On failure and during test
- Base URL: http://localhost:3000
- Local node_modules: Gitignored, safe to recreate with `npm install`
