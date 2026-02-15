# Implementation Notes: Subtask 10 - Add mkcert to Prerequisites Check

## TDD Phase: GREEN ✅

All 12 unit tests passing (12/12).

## Files Modified

### 1. `scripts/agent-init.sh`

**Changes Made:**

#### Addition 1: mkcert check in `check_prerequisites()` function (lines 207-218)
Added mkcert verification after the jq check, following the same pattern as other prerequisites:

```bash
# Check mkcert (for TLS certificate generation)
if command -v mkcert &> /dev/null; then
    local mkcert_version=$(mkcert -version 2>&1 || echo "unknown")
    log_success "mkcert: $mkcert_version"
else
    log_error "mkcert not found"
    log_info "Install mkcert:"
    log_info "  macOS:        brew install mkcert"
    log_info "  Debian/Ubuntu: sudo apt install mkcert"
    log_info "  Other:        https://github.com/FiloSottile/mkcert"
    missing=1
fi
```

**Key Implementation Decisions:**
- Uses `command -v mkcert` for detection (consistent with other tools)
- Shows version using `mkcert -version 2>&1` (handles stderr output)
- Provides platform-specific installation instructions (macOS, Debian/Ubuntu, generic)
- Increments `missing` counter to trigger exit code 1
- Positioned after jq since both are required for environment setup

#### Addition 2: mkcert status in `check_status()` function (lines 469-481)
Added mkcert to the prerequisites status report in --check mode:

```bash
# Check prerequisites first
log_info "Prerequisites:"
command -v node &> /dev/null && log_success "  node: $(node --version)" || log_warn "  node: not found"
command -v npm &> /dev/null && log_success "  npm: $(npm --version)" || log_warn "  npm: not found"
command -v docker &> /dev/null && log_success "  docker: installed" || log_warn "  docker: not found"
command -v tmux &> /dev/null && log_success "  tmux: $(tmux -V)" || log_warn "  tmux: not found"
command -v jq &> /dev/null && log_success "  jq: $(jq --version)" || log_warn "  jq: not found"
if command -v mkcert &> /dev/null; then
    local mkcert_version=$(mkcert -version 2>&1 || echo "unknown")
    log_success "  mkcert: $mkcert_version"
else
    log_warn "  mkcert: not found"
fi
echo ""
```

**Key Implementation Decisions:**
- Shows as warning (not error) in --check mode (consistent with other tools)
- Displays version when present
- Maintains consistent formatting with other prerequisites
- Uses same version detection logic as main check

### 2. `tasks/00048-agent-init-overhaul/tests/unit/10-mkcert-prereq.test.sh`

**Created:** Comprehensive test suite with 13 test cases (12 executed, 1 skipped as optional).

**Test Framework Features:**
- Isolated PATH environment to prevent fallback to system binaries
- Mock command creation with version simulation
- Full setup/teardown for each test
- Color-coded output (RED/GREEN/YELLOW)
- Multiple assertion types (exit code, contains, regex, etc.)

**Test Coverage:**
1. ✅ TC01: mkcert installed and accessible
2. ✅ TC02: mkcert not in PATH (exits with code 1)
3. ✅ TC03: mkcert not executable (treated as missing)
4. ✅ TC04: All prerequisites present (continues to next step)
5. ✅ TC05: Only mkcert missing (exits with code 1)
6. ✅ TC06: Multiple prerequisites missing (exits with code 1)
7. ✅ TC07: Version displayed when present
8. ⏭️ TC08: CAROOT validation (optional, not implemented)
9. ✅ TC09: Installation instructions shown in error
10. ✅ TC10: Format consistent with other prerequisites
11. ✅ TC11: Stops before env generation when missing
12. ✅ TC12: --check mode shows status
13. ✅ TC13: Integrates with existing prerequisite flow

## Key Design Decisions

### 1. Placement in Check Order
**Decision:** Add mkcert check after jq, before the `missing` check.

**Rationale:**
- mkcert is required for TLS certificate generation (resend-proxy)
- jq is needed earlier for reading config.json
- Both are required before environment file generation
- Logical ordering: package managers (node/npm) → runtime (docker) → utilities (tmux/jq) → certificates (mkcert)

### 2. Version Detection
**Decision:** Use `mkcert -version 2>&1` with fallback to "unknown"

**Rationale:**
- mkcert outputs version to stderr (not stdout)
- 2>&1 redirect captures stderr
- Fallback prevents failure if version command fails
- Consistent with how other tools show version

### 3. Installation Instructions
**Decision:** Show multi-platform instructions (macOS/Debian/GitHub)

**Rationale:**
- macOS developers use Homebrew (most common in dev)
- Debian/Ubuntu covers popular Linux distros
- GitHub link covers all other platforms
- Follows DX Engineer principle: "helpful, actionable errors"

### 4. Error Handling
**Decision:** Treat as missing prerequisite (exit 1), not warning

**Rationale:**
- TLS certificates are required for local dev (orchestrator proxy)
- Failing later with cryptic errors is poor DX
- Consistent with other prerequisites (node, docker, etc.)
- Forces fix before setup can proceed

### 5. --check Mode Behavior
**Decision:** Show warning in --check, error in normal mode

**Rationale:**
- --check is informational (doesn't modify system)
- Normal mode enforces prerequisites (exits on missing)
- Consistent with existing check_status() pattern
- Allows users to see status without blocking

## Issues Encountered

### Issue 1: Test PATH Isolation
**Problem:** Initial tests used `PATH="${MOCK_BIN_DIR}:${PATH}"` which fell back to system mkcert when mock was removed.

**Solution:** Created fully isolated PATH with only essential system commands (bash, sh, cat, mkdir, etc.) symlinked to a separate system-bin directory. This ensures tests run in controlled environment without system binary fallback.

**Code:**
```bash
SYSTEM_BIN_DIR="${TEST_DIR}/system-bin"
mkdir -p "$SYSTEM_BIN_DIR"
for cmd in bash sh cat mkdir rm cp sed grep head tail awk date dirname basename pwd cd ls chmod source; do
    if command -v "$cmd" &> /dev/null; then
        ln -s "$(command -v $cmd)" "${SYSTEM_BIN_DIR}/$cmd" 2>/dev/null || true
    fi
done
ISOLATED_PATH="${MOCK_BIN_DIR}:${SYSTEM_BIN_DIR}"
```

### Issue 2: Test Mode Confusion
**Problem:** Tests expected exit code 1 but were running in --check mode, which only warns (exit 0).

**Solution:** Separated tests into two categories:
- Tests verifying exit code 1: Use normal mode (no --check flag)
- Tests verifying status display: Use --check mode

**Affected Tests:** TC02, TC03, TC05, TC06, TC09 changed from `--check` to normal mode.

### Issue 3: mkcert Version Output to stderr
**Problem:** `mkcert -version` outputs to stderr, not stdout.

**Solution:** Use `2>&1` redirect to capture stderr as stdout:
```bash
local mkcert_version=$(mkcert -version 2>&1 || echo "unknown")
```

## Testing Validation

```bash
$ bash tasks/00048-agent-init-overhaul/tests/unit/10-mkcert-prereq.test.sh
============================================================================
mkcert Prerequisite Check Unit Tests (TDD - GREEN Phase)
============================================================================
  TC01: mkcert is installed and accessible... ✓
  TC02: mkcert is not in PATH... ✓
  TC03: mkcert exists but not executable... ✓
  TC04: All prerequisites including mkcert are present... ✓
  TC05: Only mkcert is missing (others present)... ✓
  TC06: mkcert and other tools are missing... ✓
  TC07: mkcert version is displayed when present... ✓
  TC08: CAROOT path check (optional feature)... SKIP
  TC09: Error message contains installation instructions... ✓
  TC10: mkcert check follows same format as other prereqs... ✓
  TC11: Script stops before env generation when mkcert missing... ✓
  TC12: --check mode shows mkcert status... ✓
  TC13: mkcert check integrates with existing prerequisite flow... ✓
============================================================================
Test Summary
============================================================================
Total:  12
Passed: 12
Failed: 0
✅ All tests passed!
```

## Integration Points

The mkcert prerequisite check integrates with:

1. **Environment Setup Flow**
   - Runs before env file generation (Step 1)
   - Prevents setup when missing
   - Provides clear remediation steps

2. **Orchestrator Infrastructure**
   - mkcert generates certs in `orchestrator-artifact-review/certs/`
   - Required for resend-proxy TLS
   - Needed for `NODE_EXTRA_CA_CERTS` configuration

3. **Existing Prerequisites**
   - Follows same pattern as node, npm, docker, tmux, jq
   - Uses same logging functions (`log_success`, `log_error`, `log_info`)
   - Contributes to `missing` counter for exit decision

4. **Status Reporting**
   - Appears in `--check` mode output
   - Shows version when present
   - Warns (doesn't error) in status mode

## Manual Testing

To verify the implementation manually:

```bash
# With mkcert installed
./scripts/agent-init.sh --check
# Should show: ✅ mkcert: v1.4.4 (or your version)

# Simulate missing mkcert (rename binary temporarily)
sudo mv $(which mkcert) /tmp/mkcert.bak
./scripts/agent-init.sh
# Should show:
#   ❌ mkcert not found
#   ℹ  Install mkcert:
#   ℹ    macOS:        brew install mkcert
#   ℹ    Debian/Ubuntu: sudo apt install mkcert
#   ℹ    Other:        https://github.com/FiloSottile/mkcert
#   ❌ Missing prerequisites. Please install them first.
# Exit code: 1

# Restore
sudo mv /tmp/mkcert.bak $(which mkcert)
```

## Code Quality

**Follows DX Engineer Standards:**
- ✅ Idempotent (safe to run multiple times)
- ✅ Clear, actionable error messages
- ✅ Platform-specific installation guidance
- ✅ Consistent with existing patterns
- ✅ Progress indicators (✅/❌/ℹ)
- ✅ Comprehensive test coverage (92% - 12/13 test cases)

**Follows Script Standards:**
- ✅ Proper exit code (1 for missing prerequisites)
- ✅ Consistent output format
- ✅ No hardcoded values
- ✅ Proper error handling

## Next Steps (REFACTOR Phase)

Optional enhancements (not required for this subtask):

1. **CAROOT Validation (TC08)**
   - Verify `mkcert -CAROOT` returns valid path
   - Check if `rootCA.pem` exists
   - Warn if `mkcert -install` hasn't been run
   - Provide remediation steps

2. **Version Compatibility Check**
   - Verify mkcert version >= minimum required
   - Show warning if outdated version detected

3. **Certificate Status Check**
   - In --check mode, verify certs exist in orchestrator/certs/
   - Show expiration date if available

These are optional and should only be implemented if they provide clear value to the developer experience.

## Conclusion

**TDD GREEN Phase Complete** ✅

The mkcert prerequisite check has been successfully implemented with:
- **12/12 tests passing** (1 skipped optional test)
- **Minimal code changes** (2 additions to agent-init.sh)
- **Zero breaking changes** (backward compatible)
- **Clear error messages** with installation instructions
- **Consistent integration** with existing prerequisite checks

The implementation follows TDD principles:
- ✅ RED: Comprehensive failing tests defined the contract
- ✅ GREEN: Minimal code implemented to make tests pass
- ⏭️ REFACTOR: Optional enhancements documented for future consideration

Ready for code review and merge.
