# Subtask 03: .env.nextjs.local Generator

**Status:** ✅ Complete
**TDD Phase:** GREEN (all tests passing)

## Overview

Create a generator library for `.env.nextjs.local` that eliminates placeholder values and reads configuration from the orchestrator's `config.json`.

## Acceptance Criteria

- [x] No placeholder values (`YOUR_USERNAME` replaced with actual paths)
- [x] Reads ports from orchestrator `config.json` via `parse-config.sh`
- [x] Uses real mkcert certificate path via `$(mkcert -CAROOT)`
- [x] Generates agent-specific URLs with literal agent names (not variable substitution)
- [x] Shared Novu URLs (no agent name in Novu URLs)
- [x] Empty fields for user secrets (INTERNAL_API_KEY, NOVU_SECRET_KEY)
- [x] Default production email addresses
- [x] Idempotent operation (safe to run multiple times)
- [x] Comprehensive error handling with specific exit codes
- [x] Full test coverage (15 passing tests)

## Implementation

### Files Created

1. **scripts/lib/generate-env-nextjs.sh**
   - Generator library following DX Engineer standards
   - 173 lines of code
   - Error handling with exit codes 0-6
   - Dependencies: parse-config.sh, jq, mkcert

2. **tests/unit/03-generate-env-nextjs.test.sh**
   - 17 test cases (15 pass, 2 skipped)
   - Isolated test environment
   - Comprehensive coverage

### Usage

```bash
source scripts/lib/generate-env-nextjs.sh
generate_env_nextjs "james" "app/.env.nextjs.local"
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0    | Success |
| 1    | Missing prerequisites (jq, mkcert) |
| 4    | Agent not found |
| 5    | Port key not found |
| 6    | Output directory missing |

## Test Results

```
Total:   17
Passed:  15
Failed:  0
Skipped: 2
```

All acceptance criteria validated through automated tests.

## Key Design Decisions

1. **Literal Agent Names**: Uses `https://james.convex.cloud.loc` instead of `https://${AGENT_NAME}.convex.cloud.loc` because Next.js reads these at build time
2. **Shared Novu**: Novu URLs don't include agent name (shared service)
3. **Real Paths**: Detects actual mkcert path, no placeholders
4. **Empty Secrets**: User must fill in INTERNAL_API_KEY, NOVU_SECRET_KEY

## Next Steps

- Integrate into `scripts/agent-init.sh`
- Update documentation if needed
