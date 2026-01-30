# /analyze-failures - Categorize Test Failures

Analyze test output and categorize failures by root cause.

## Reference Docs

- **Full analysis guide:** See `docs/development/test-failure-analysis.md`
- **E2E fix patterns:** See `docs/development/e2e-timing-patterns.md`

## Quick Reference

| Category | Indicators | Action |
|----------|------------|--------|
| **Timing** | `Timeout`, `waitForSelector` | Apply `/e2e-fixes` |
| **Environment** | `ECONNREFUSED`, `Service unavailable` | Run `/ready-environment` |
| **Real Bug** | Wrong business logic values | **ESCALATE** - don't fix test |
| **Flaky** | Intermittent failures | Investigate isolation |

## Process

1. Read test output from `/tmp/*-test-output.txt`
2. Match errors against category indicators
3. Group by category
4. Report with recommended actions

## Output Format

```markdown
## Failure Analysis

### Timing Issues (X) - Can Fix
- [ ] `test name` in `file:line` - timeout type

### Real Bugs (X) - ESCALATE
- [ ] `test name` in `file:line` - what's wrong
```

## Key Principle

**Categorize before fixing.** Timing issues are fixable. Real bugs must be escalated - never mask them with test workarounds.

## Background Agent Hint

For verbose test logs, spawn a background agent to analyze and return a summary.

**When to use background agent:**
- Large test output file (100+ lines)
- Just categorizing failures for triage

**When to stay in main context:**
- Need to make decisions about which failures to fix
- Small output, quick analysis
