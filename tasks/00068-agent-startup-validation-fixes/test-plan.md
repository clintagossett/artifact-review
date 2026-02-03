# Test Plan: Agent Startup Validation Fixes

**Task:** #68
**Date:** 2026-02-02

## Changes Implemented

### P0 (Critical) Fixes

#### 1. Fixed --env-file bug in setup-convex-env.sh --check
**File:** `scripts/setup-convex-env.sh`
**Lines:** 184-230 (check_convex_env function)
**Changes:**
- Added env_file determination at start of function
- Added `--env-file "$env_file"` to line 197 (generated vars check)
- Added `--env-file "$env_file"` to line 220 (passthrough vars check)

**Expected Behavior:**
- `--check` now queries correct Convex deployment
- Variables that ARE set will show as set (not "not set")
- Agents can trust check output for validation

#### 2. Added validate_convex_env() to agent-init.sh
**File:** `scripts/agent-init.sh`
**Lines:** 564-618 (new function)
**Changes:**
- New Step 6.5 function after configure_convex_env()
- Validates 5 critical vars: RESEND_API_KEY, EMAIL_FROM_AUTH, STRIPE_SECRET_KEY, JWT_PRIVATE_KEY, INTERNAL_API_KEY
- Exits with error code 1 if any critical var missing
- Provides troubleshooting steps in error message
- Called in main() between configure_convex_env() and show_status()

**Expected Behavior:**
- Catches missing variables before tests run
- Fails fast with clear error message
- Suggests remediation steps
- Prevents 45-minute debugging sessions

#### 3. Better error handling in sync_passthrough_vars()
**File:** `scripts/setup-convex-env.sh`
**Lines:** 273-313 (sync_passthrough_vars function)
**Changes:**
- Added failed counter and failed_vars array
- Wrapped npx convex env set in conditional to detect failures
- Returns exit code 1 if any failures
- Displays failed variable names and count
- Suggests remediation steps

**Expected Behavior:**
- No silent failures
- Clear error message showing which vars failed
- Exit code indicates failure to calling script
- Suggests fix (refresh admin key)

### P1 (High Priority) Fixes

#### 4. Increased Convex wait time with health check
**File:** `scripts/agent-init.sh`
**Lines:** 511-536 (start_convex_container function)
**Changes:**
- Replaced 10-second sleep with 30-second health check loop
- Checks for container running AND initialized marker
- Reports actual wait time on success
- Warns but continues if not fully initialized
- Better error messages

**Expected Behavior:**
- Waits up to 30 seconds for Convex to be ready
- No race condition failures on slower machines
- Reports actual initialization time
- Graceful degradation if init marker missing

#### 5. Enhanced logging in configure_convex_env()
**File:** `scripts/agent-init.sh`
**Lines:** 548-571 (configure_convex_env function)
**Changes:**
- Captures full output to `/tmp/convex-setup-${AGENT_NAME}.log`
- Uses tee to show output AND save to log
- Displays full log on failure (not truncated)
- Saves log file for post-mortem debugging

**Expected Behavior:**
- All output visible during run
- Full log available for debugging on failure
- No truncated "… +2 lines" issues
- Log file persists for analysis

## Test Cases

### Test 1: setup-convex-env.sh --check accuracy
**Setup:** Fresh agent with vars set
**Command:** `./scripts/setup-convex-env.sh --check`
**Expected:** All set variables show as "set" (not "not set")
**Validates:** P0 Fix 1

### Test 2: Missing critical var detection
**Setup:** Agent with RESEND_API_KEY missing from Convex
**Command:** `./scripts/agent-init.sh`
**Expected:**
- Step 6.5 fails with clear error
- Shows which var(s) missing
- Suggests troubleshooting steps
- Exit code 1

**Validates:** P0 Fix 2

### Test 3: sync_passthrough_vars failure handling
**Setup:** Convex backend stopped mid-setup
**Command:** `./scripts/setup-convex-env.sh --sync`
**Expected:**
- Detects sync failures
- Reports failed variables by name
- Returns exit code 1
- Suggests fix (admin key refresh)

**Validates:** P0 Fix 3

### Test 4: Convex initialization wait
**Setup:** Fresh agent, Convex takes 15s to initialize
**Command:** `./scripts/agent-init.sh`
**Expected:**
- Waits up to 30s for health check
- Reports actual wait time (e.g., "15s")
- Does not timeout prematurely
- Continues to next step

**Validates:** P1 Fix 4

### Test 5: Failed setup logging
**Setup:** Force setup-convex-env.sh to fail (bad admin key)
**Command:** `./scripts/agent-init.sh`
**Expected:**
- Full error output displayed
- Log file saved to /tmp/convex-setup-${AGENT_NAME}.log
- Log file path shown in error message
- No truncated output

**Validates:** P1 Fix 5

## Manual Testing Procedure

### Phase 1: Syntax Check
```bash
# Verify scripts have no syntax errors
bash -n scripts/setup-convex-env.sh
bash -n scripts/agent-init.sh
```

### Phase 2: Isolated Function Tests
```bash
# Test --check with current agent
./scripts/setup-convex-env.sh --check

# Verify output shows correct values (not "not set" for existing vars)
```

### Phase 3: Full Agent Init (Existing Agent)
```bash
# Run on current agent to verify no regressions
./scripts/agent-init.sh --check
```

### Phase 4: Fresh Agent Test (Ideal)
**Only do this if orchestrator can support test-agent:**
```bash
# From orchestrator, create test-agent
cd ../artifact-review-orchestrator
# Add test-agent to config.json with port 5999, subnet 172.99

# Create worktree
cd ..
git worktree add artifact-review-test-agent -b test-agent/dev-work origin/dev

# Run init
cd artifact-review-test-agent
./scripts/agent-init.sh

# Should complete without errors
# All 5 critical vars should validate
```

## Success Criteria

- [ ] All syntax checks pass
- [ ] setup-convex-env.sh --check shows correct values
- [ ] validate_convex_env() detects missing vars
- [ ] sync_passthrough_vars() reports failures correctly
- [ ] Convex health check waits appropriately
- [ ] Enhanced logging captures full output
- [ ] No regressions on existing agents
- [ ] Fresh agent init completes successfully (if tested)

## Known Limitations

1. Health check looks for `/root/.convex/initialized` file
   - This file may not exist in older Convex containers
   - Fallback: continues after 30s with warning

2. Validation only checks 5 critical vars
   - Other vars (STRIPE_PRICE_ID_*, etc.) not validated
   - Rationale: these 5 cause most common failures

3. Log files saved to /tmp
   - May be cleared on reboot
   - Not persistent long-term

## Rollback Plan

If issues arise:
```bash
# Revert both files
git checkout HEAD -- scripts/setup-convex-env.sh scripts/agent-init.sh

# Or revert specific commits
git revert <commit-sha>
```

## Next Steps After Testing

1. Run manual tests (Phase 1-3 minimum)
2. Document any issues found
3. Fix issues or adjust implementation
4. Update this test plan with results
5. Create commit with fixes
6. Do NOT merge to dev until verified working
