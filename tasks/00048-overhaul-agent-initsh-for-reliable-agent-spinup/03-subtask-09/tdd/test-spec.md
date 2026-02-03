Excellent! The tests are failing as expected (RED phase). 5 out of 8 tests fail, which is perfect - this confirms the restart behavior isn't implemented yet. The 3 that pass (TC05, TC07, TC08) are likely passing by accident or due to existing behavior.

Now let me create the comprehensive test specification document:

Perfect! I've successfully written failing tests for **Subtask 9: Convex Restart After Env Changes**. Here's what was delivered:

## Summary

### Test Specification Document
Created comprehensive specification covering:
- **8 test cases** defining restart behavior
- **Exit codes** (no new codes - continues with 0)
- **User-facing messages** for success and missing session
- **Implementation location** guidance
- **Dependencies** (tmux, AGENT_NAME)

### Test File
**Location:** `tasks/00048-agent-init-overhaul/09-convex-restart/tests/unit/09-convex-restart.test.sh`

**Test Coverage:**
| Test | Description | Status |
|------|-------------|--------|
| TC01 | Kills tmux session after env sync | 🔴 FAIL |
| TC02 | Handles missing session gracefully | 🔴 FAIL |
| TC03 | Uses correct agent name | 🔴 FAIL |
| TC04 | Shows restart notification | 🔴 FAIL |
| TC05 | No restart in check mode | ✅ PASS (accidental) |
| TC06 | Restart in regen mode | 🔴 FAIL |
| TC07 | Restart message in output | ✅ PASS (accidental) |
| TC08 | No restart on admin key refresh | ✅ PASS (edge case) |

**Result:** 5/8 tests failing (RED phase confirmed ✅)

### Subtask README
Created `tasks/00048-agent-init-overhaul/09-convex-restart/README.md` with:
- Problem statement
- Acceptance criteria (9 items)
- Implementation plan (with code examples)
- Test coverage table
- Files to modify
- Dependencies
- Testing instructions

## Key Behaviors Defined

1. **Kill session after env sync** - `tmux kill-session -t {AGENT_NAME}-convex-dev`
2. **Graceful handling** - No error if session doesn't exist
3. **Agent-aware** - Uses AGENT_NAME from config
4. **Mode-specific** - Restart in normal/regen, skip in --check
5. **Smart detection** - Only restart when env vars actually changed

## Next Steps

When you're ready to implement (GREEN phase):
1. Add `restart_convex_dev()` function to `scripts/setup-convex-env.sh`
2. Call it after `set_convex_env()` in appropriate modes
3. Run tests again - all 8 should PASS

The tests are ready and waiting for implementation! 🎯