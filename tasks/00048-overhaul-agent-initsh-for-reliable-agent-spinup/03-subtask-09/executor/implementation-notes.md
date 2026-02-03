Perfect! All 8 tests now pass! 🎉 Let me create the implementation notes:

<artifact name="implementation-notes.md" type="text/markdown">
# Implementation Notes: Subtask 09 - Convex Restart After Env Changes

## Status
✅ **GREEN Phase** - All 8 tests passing

## Files Modified

### 1. `scripts/setup-convex-env.sh`
**Changes:**
- Added `restart_convex_dev()` function (lines 263-276)
- Calls `restart_convex_dev()` after `set_convex_env()` in `--regen` mode (line 348)
- Calls `restart_convex_dev()` after `set_convex_env()` in normal setup mode (line 380)
- Updated "Next steps" message to simplify restart instructions (line 385)

**Key Implementation Details:**
```bash
restart_convex_dev() {
    echo ""
    echo "Restarting Convex dev server..."

    local session_name="${AGENT_NAME}-convex-dev"

    if tmux has-session -t "$session_name" 2>/dev/null; then
        tmux kill-session -t "$session_name"
        echo -e "${GREEN}Convex dev server session killed.${NC}"
        echo "Restart it with: ./scripts/start-dev-servers.sh"
    else
        echo -e "${YELLOW}No Convex dev session running - skipping restart.${NC}"
    fi
}
```

**Behavior:**
- Gracefully handles missing tmux session (no error)
- Uses `AGENT_NAME` from environment to construct session name
- Only called after env var changes (normal setup, --regen mode)
- NOT called in --check mode (read-only)
- NOT called when only admin key is refreshed (no env changes)

### 2. `tasks/00048-agent-init-overhaul/09-convex-restart/tests/unit/09-convex-restart.test.sh`
**Changes:**
- Fixed mock `openssl` to handle `-out` parameter and write to files (lines 108-166)
- Fixed mock `tmux` to log both `-t` and session name (line 92)
- Fixed mock `docker` to return multiple agent-backend containers (lines 238-262)
- Added AGENT_NAME restoration in TC03 to prevent test pollution (lines 526-529)

**Why Test Fixes Were Needed:**
The test infrastructure had incomplete mocks that prevented the script from running to completion:
1. **openssl mock** - Didn't respect `-out` flag, causing `cat` to fail on non-existent files
2. **tmux mock** - Only logged `-t` without session name, causing assertion mismatches
3. **docker mock** - Only returned one agent name, failing when tests changed AGENT_NAME
4. **Test isolation** - TC03 modified AGENT_NAME but didn't restore it, affecting TC06

## Test Results

All 8 tests passing:
- ✅ TC01: Kills tmux session after env sync
- ✅ TC02: Handles missing tmux session gracefully
- ✅ TC03: Uses correct agent name for session
- ✅ TC04: Shows restart notification
- ✅ TC05: No restart in check mode
- ✅ TC06: Restart happens in regen mode
- ✅ TC07: Restart message in final output
- ✅ TC08: No restart on admin key refresh only

## Key Decisions

### 1. Kill vs Restart
Chose to **kill the session** rather than restart it directly. Rationale:
- Delegates service startup to `start-dev-servers.sh` (single responsibility)
- Allows user to decide when to restart (may want to make other changes first)
- Consistent with existing pattern in the "Next steps" output

### 2. Error Handling
Graceful handling when session doesn't exist:
- Uses `tmux has-session` check before killing
- Shows informative message rather than erroring
- Allows script to succeed even if dev server wasn't running

### 3. Agent Name Awareness
Uses `AGENT_NAME` from environment:
- Supports multi-agent development (mark, james, different-agent, etc.)
- Reads from `.env.docker.local` (already sourced at script start)
- Constructs session name as `${AGENT_NAME}-convex-dev`

### 4. Mode-Specific Behavior
- **Normal mode** (first setup with JWT generation): Restart ✅
- **--regen mode** (JWT regeneration): Restart ✅
- **--check mode** (read-only inspection): No restart ❌
- **Admin key refresh only** (JWT exists, no env changes): No restart ❌

## Issues Encountered

### Issue 1: Test Infrastructure Incomplete
**Problem:** Mock commands (`openssl`, `tmux`, `docker`) didn't fully replicate real behavior, causing script to fail before reaching `restart_convex_dev()`.

**Solution:** Enhanced mocks to handle file I/O, proper argument parsing, and multi-agent support.

### Issue 2: Test Pollution
**Problem:** TC03 changed `AGENT_NAME` to `different-agent`, which persisted to TC06, causing assertion failure.

**Solution:** Added cleanup in TC03 to restore original `AGENT_NAME=test-agent` after test completion.

### Issue 3: Mock tmux Logging
**Problem:** Mock tmux logged `KILLED: -t` but tests expected `KILLED: -t {session-name}`.

**Solution:** Changed mock to log both `$2` (flag) and `$3` (session name).

## Verification

Run the test suite:
```bash
./tasks/00048-agent-init-overhaul/09-convex-restart/tests/unit/09-convex-restart.test.sh
```

Expected output: All 8 tests pass (GREEN phase)

## Next Steps

- Subtask complete and ready for integration
- Consider upleveling tests to task level if valuable for regression testing
- Update task README to mark subtask as complete
</artifact>

Perfect! I've successfully implemented the Convex restart functionality. Here's a summary:

## Summary

**Implementation completed successfully** - All 8 tests passing ✅

### Changes Made

1. **Added `restart_convex_dev()` function** to `scripts/setup-convex-env.sh`
   - Kills the Convex dev tmux session after env variable sync
   - Gracefully handles missing sessions
   - Uses agent-aware session naming

2. **Integrated restart calls** in appropriate modes:
   - ✅ Normal mode (first-time setup with JWT generation)
   - ✅ `--regen` mode (JWT regeneration)
   - ❌ `--check` mode (read-only, no restart)
   - ❌ Admin key refresh only (no env changes, no restart)

3. **Fixed test infrastructure** to support full script execution:
   - Enhanced mock `openssl` to handle `-out` parameter and create files
   - Fixed mock `tmux` to log complete kill command
   - Updated mock `docker` to support multiple agent names
   - Added test cleanup to prevent pollution

### Test Results
```
Total:   8
Passed:  8
Failed:  0
```

All acceptance criteria met! The implementation follows TDD principles - minimal code to make tests pass, with proper error handling and agent-awareness.