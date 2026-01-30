# /e2e-fixes - E2E Timing Fix Patterns

Apply common patterns for fixing E2E test timing issues.

## Reference Docs

- **Full patterns guide:** See `docs/development/e2e-timing-patterns.md`
- **Testing guide:** See `docs/development/testing-guide.md`

## Quick Reference

| Problem | Fix Pattern |
|---------|-------------|
| `locator.fill: Timeout` | Add `waitForSelector` before interaction |
| Modal not appearing | Wait for modal text before proceeding |
| Navigation timeout | Add `waitForLoadState('networkidle')` + `waitForURL` |
| Data not loaded | Wait for specific content selector |
| Button disabled | Wait for button to be enabled |

## Application Process

1. Identify failing test file and line
2. Read test code around the failure
3. Match error to pattern in `docs/development/e2e-timing-patterns.md`
4. Apply the fix
5. Run specific test to validate:
   ```bash
   cd app && npm run test:e2e -- --grep "test name"
   ```

## Key Principles

- **Wait for the right thing** - Don't add arbitrary delays
- **Be specific** - Wait for exact element/state needed
- **Never use `waitForTimeout()`** - Always wait for conditions
