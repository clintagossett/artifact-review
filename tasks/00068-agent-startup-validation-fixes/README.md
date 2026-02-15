# Task 00068: Agent Startup Validation Fixes

**GitHub Issue:** #68
**Created:** 2026-02-02
**Status:** In Progress

## Overview

Implement critical fixes to agent startup scripts based on Luke's startup issues analysis. The root cause was silent failures in `setup-convex-env.sh` that prevented environment variables from being synced to Convex, causing 16 test failures.

## Source Analysis

See: `../orchestrator-artifact-review/analysis/luke-agent-startup-issue.md`

## Implementation Plan

### P0 (Critical) - Must Implement

1. **Fix --env-file bug in setup-convex-env.sh --check**
   - Lines 195, 218 missing `--env-file` flag
   - Causes incorrect "not set" reports for variables that ARE set
   - Fix: Add `--env-file "$env_file"` to both `npx convex env get` calls

2. **Add validate_convex_env() to agent-init.sh**
   - New step 6.5 after configure_convex_env()
   - Validates critical vars: RESEND_API_KEY, EMAIL_FROM_AUTH, STRIPE_SECRET_KEY, JWT_PRIVATE_KEY, INTERNAL_API_KEY
   - Fails fast with clear error if any critical var is missing
   - Suggests remediation steps

3. **Better error handling in sync_passthrough_vars()**
   - Track successful vs failed syncs
   - Return exit code 1 if any syncs fail
   - Explicit error logging for each failure
   - Report summary of failures

### P1 (High Priority) - Should Implement

4. **Increase Convex wait time with health check**
   - Replace 10-second sleep with 30-second health check loop
   - Check for Convex initialization marker
   - Fail fast if health check never passes

5. **Enhanced logging in configure_convex_env()**
   - Capture full output to log file
   - Display full log on failure (not truncated)
   - Better error messages

### P2 (Nice to Have) - Future Work

6. Idempotent retry logic (3 attempts)
7. Smoke test after agent-init

## Testing Strategy

After implementation:
1. Test with fresh agent (`test-agent`)
2. Verify all critical vars are validated
3. Verify clear error messages on failure
4. Verify health check works correctly

## Files Modified

- `scripts/setup-convex-env.sh` - P0 fixes 1, 3; P1 fix 5
- `scripts/agent-init.sh` - P0 fix 2; P1 fix 4

## Success Criteria

- [ ] All P0 fixes implemented
- [ ] All P1 fixes implemented
- [ ] Scripts tested with fresh agent setup
- [ ] No manual intervention needed for successful setup
- [ ] Clear error messages on failure
- [ ] Validation detects missing critical vars

## Notes

- Do NOT merge to dev until verified working
- Test on clean agent before committing
- Document any deviations from analysis recommendations
