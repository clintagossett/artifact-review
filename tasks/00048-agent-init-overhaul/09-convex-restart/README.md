# Subtask 09: Convex Restart After Env Changes

## Status
🔴 **RED Phase** - Tests written, implementation pending

## Overview
After syncing environment variables to Convex (via `npx convex env set`), the Convex dev tmux session must be killed and restarted to ensure the new environment variables are loaded by the Convex runtime.

## Problem Statement
Currently, `setup-convex-env.sh` sets environment variables in Convex but doesn't restart the Convex dev server. This means:
1. New environment variables aren't loaded until manual restart
2. Users must remember to restart the dev server manually
3. No clear guidance on when restart is needed

## Acceptance Criteria

- [ ] Kill `{AGENT_NAME}-convex-dev` tmux session after `set_convex_env()` completes
- [ ] Handle missing tmux session gracefully (don't fail if session doesn't exist)
- [ ] Show user-friendly notification about restart
- [ ] Use `AGENT_NAME` from `.env.docker.local` to determine session name
- [ ] Don't restart in `--check` mode (read-only)
- [ ] Do restart in `--regen` mode (env vars changed)
- [ ] Do restart in normal mode when env vars are set (first-time setup)
- [ ] Don't restart when only admin key is refreshed (no env var changes)
- [ ] Include `start-dev-servers.sh` in final "Next steps" output

## Implementation Plan

### 1. Add `restart_convex_dev()` Function
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

### 2. Call After `set_convex_env()`
- In normal mode (first-time setup with JWT generation)
- In `--regen` mode (JWT regeneration)
- NOT in `--check` mode
- NOT when only admin key is refreshed (JWT exists, no env changes)

### 3. Update Final Output
Modify "Next steps" section to emphasize restarting dev servers:
```bash
echo "Next steps:"
echo "  1. Run ./scripts/start-dev-servers.sh to restart Convex dev"
```

## Test Coverage

| Test Case | Description | Status |
|-----------|-------------|--------|
| TC01 | Kills tmux session after env sync | 🔴 RED |
| TC02 | Handles missing session gracefully | 🔴 RED |
| TC03 | Uses correct agent name for session | 🔴 RED |
| TC04 | Shows restart notification | 🔴 RED |
| TC05 | No restart in check mode | 🔴 RED |
| TC06 | Restart happens in regen mode | 🔴 RED |
| TC07 | Restart message in final output | 🔴 RED |
| TC08 | No restart on admin key refresh only | 🔴 RED |

## Files Modified
- `scripts/setup-convex-env.sh` - Add restart logic

## Dependencies
- tmux must be installed
- `AGENT_NAME` from `.env.docker.local` or `.env.agent.local`

## Testing

Run the unit tests:
```bash
./tasks/00048-agent-init-overhaul/09-convex-restart/tests/unit/09-convex-restart.test.sh
```

**Expected Result (RED phase):** All tests should FAIL initially, confirming the behavior isn't implemented yet.

After implementation, all tests should PASS (GREEN phase).

## Notes

- **Why kill instead of restart?** The script should delegate starting services to `start-dev-servers.sh`, which handles proper initialization order
- **Idempotency:** If session doesn't exist, just inform user - don't error
- **User guidance:** Clear messages about next steps prevent confusion
