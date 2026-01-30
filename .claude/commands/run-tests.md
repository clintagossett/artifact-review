# /run-tests - Execute Test Suites

Run test suites and capture structured output for analysis.

## Reference Docs

- **Full testing guide:** See `docs/development/testing-guide.md`
- **Quick E2E setup:** See `docs/development/TESTING-QUICK-START.md`

## Usage

```
/run-tests [type]
```

**Types:** `unit`, `integration`, `e2e`, `smoke`, `all` (default)

## Commands

All commands run from `app/` directory.

| Type | Command |
|------|---------|
| Unit | `npm test` |
| Integration | `npm test -- --testPathPattern="integration"` |
| E2E | `npm run test:e2e` |
| Smoke | Quick connectivity checks (see below) |

### Smoke Tests

```bash
curl -s --max-time 10 https://${AGENT_NAME}.loc | grep -q "html" && echo "App: OK"
curl -s --max-time 10 https://${AGENT_NAME}.convex.cloud.loc && echo "Convex: OK"
```

## Output

Capture to `/tmp/*-test-output.txt` for analysis by `/analyze-failures`.

```markdown
## Test Results Summary

| Suite | Total | Passed | Failed |
|-------|-------|--------|--------|
| Unit | 42 | 40 | 2 |
| E2E | 10 | 7 | 3 |
```

## Background Agent Hint

For large test suites, consider spawning a background agent to run tests and summarize results.

**When to use background agent:**
- Verbose output expected (full E2E suite, many unit tests)
- Just gathering pass/fail info for reporting

**When to stay in main context:**
- Need judgment during test run
- Quick smoke test or single file
