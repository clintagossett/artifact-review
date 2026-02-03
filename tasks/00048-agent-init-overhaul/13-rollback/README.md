# Subtask 13: Add Rollback on Failure

**Status:** RED (Tests Written)
**Parent Task:** #48 - Overhaul agent-init.sh for Reliable Agent Spinup

## Objective

Add robust error recovery to `agent-init.sh` by creating backups before modifying environment files and restoring them if any phase fails.

## Problem

Currently, if `agent-init.sh` fails mid-execution:
- Partial/corrupted env files may be left behind
- No way to recover to the previous working state
- User must manually fix or regenerate env files
- Increases recovery time and manual intervention

## Solution

Implement backup/restore pattern:

1. **Before env generation:** Create `.backup` copies of existing env files
2. **On any failure:** Restore from backups, clean up, exit with appropriate code
3. **On success:** Remove backup files, leaving only current config
4. **Signal handling:** Trap SIGINT/SIGTERM to trigger rollback

## Files Modified

### scripts/agent-init.sh

**New Functions:**
```bash
# Create backups before modifying env files
create_env_backups() {
    [ -f "$PROJECT_ROOT/.env.docker.local" ] && \
        cp "$PROJECT_ROOT/.env.docker.local" "$PROJECT_ROOT/.env.docker.local.backup"

    [ -f "$APP_DIR/.env.nextjs.local" ] && \
        cp "$APP_DIR/.env.nextjs.local" "$APP_DIR/.env.nextjs.local.backup"
}

# Restore env files from backups
rollback_env_files() {
    log_warn "Rolling back changes..."

    [ -f "$PROJECT_ROOT/.env.docker.local.backup" ] && \
        mv "$PROJECT_ROOT/.env.docker.local.backup" "$PROJECT_ROOT/.env.docker.local"

    [ -f "$APP_DIR/.env.nextjs.local.backup" ] && \
        mv "$APP_DIR/.env.nextjs.local.backup" "$APP_DIR/.env.nextjs.local"
}

# Clean up backups after success
cleanup_env_backups() {
    rm -f "$PROJECT_ROOT/.env.docker.local.backup"
    rm -f "$APP_DIR/.env.nextjs.local.backup"
}
```

**Signal Trap:**
```bash
trap 'rollback_env_files; exit 130' INT TERM
```

**Integration Points:**
- Call `create_env_backups()` at start of `setup_env_files()`
- Call `rollback_env_files()` before any `exit` in phases 3-8
- Call `cleanup_env_backups()` at end of `show_status()`

## Acceptance Criteria

- [x] Test TC01: Create backups before generation
- [x] Test TC02: No backups when files don't exist
- [x] Test TC03: Restore on Docker failure
- [x] Test TC04: Restore on Novu setup failure
- [x] Test TC05: Restore on Convex setup failure
- [x] Test TC06: Restore on smoke test failure
- [x] Test TC07: Clean up backups on success
- [x] Test TC08: Partial restore (only backed-up files)
- [x] Test TC09: Handle missing backups gracefully
- [x] Test TC10: Signal handler for Ctrl+C
- [x] Test TC11: Preserve file permissions
- [x] Test TC12: --env-only mode rollback
- [x] Test TC13: Idempotent rollback
- [x] Test TC14: Log rollback actions

## Design Decisions

### Why mv instead of cp for restore?
- `mv` is atomic and faster
- Automatically cleans up backup file
- Prevents leaving duplicate files

### Why not backup all env files?
- Only backup files that are **regenerated** by the script
- `.env.dev.local` and `.env.convex.local` are copied from examples, not generated
- Reduces backup overhead

### Why cleanup on success?
- Prevents accumulation of stale backups
- Clear signal that script completed successfully
- Reduces confusion about which files are current

### Signal handling scope
- Only trap during phases that modify env files (2-8)
- Don't trap during prerequisites check (phase 1)
- Don't trap during status display (phase 9)

## Testing

### Run Tests
```bash
./tasks/00048-agent-init-overhaul/13-rollback/tests/unit/13-rollback.test.sh
```

### Test Coverage
- ✅ Backup creation timing
- ✅ Restore on all failure types
- ✅ Cleanup on success
- ✅ File permissions preserved
- ✅ Signal handling
- ✅ Idempotency
- ⚠️ Some tests skipped (require complex mocking)

## Implementation Notes

### Error Handling
- Rollback should NEVER fail (use `|| true` where needed)
- Log each rollback action for audit trail
- Continue rollback even if one step fails

### Performance
- Backup overhead: <100ms (small files)
- Restore is instant (mv operation)
- No compression needed (files are text, <10KB each)

### Edge Cases
1. **Backup deleted mid-execution:** Log warning, continue
2. **Permission denied:** Log error, continue with other files
3. **Disk full:** Can't create backup → fail fast before modifications
4. **Concurrent runs:** Last backup wins (by design, only one run expected)

## Dependencies

None - uses only bash builtins and standard file operations.

## Next Steps

1. Implement functions in `agent-init.sh`
2. Add signal trap at script start
3. Integrate backup calls in `setup_env_files()`
4. Integrate rollback calls before all `exit` statements
5. Integrate cleanup call in `show_status()`
6. Run tests to verify GREEN phase
7. Manual validation with real agent-init.sh run
