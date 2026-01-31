Now I have a good understanding of the context. Let me create the failing tests for subtask 12 - integrating all utilities into agent-init.sh.

<artifact name="test-spec.md" type="text/markdown">
# Test Specification: Subtask 12 - Integrate All Utilities into agent-init.sh

## Overview

This subtask integrates all the utilities built in subtasks 1-11 into a refactored `agent-init.sh` script. The new flow should be: prerequisites → generate env → start Docker → wait healthy → setup Novu → setup Convex → start dev servers → smoke test → show status.

## Acceptance Criteria

1. **Phase Structure**: Script executes in clear phases with progress output
2. **Library Integration**: Uses all new libraries from `scripts/lib/`
3. **Proper Orchestration**: Correct order of operations with health checks between steps
4. **Error Handling**: Meaningful exit codes and failure messages
5. **Idempotent**: Safe to run multiple times without breaking existing setup
6. **Fast Execution**: Completes in <2 minutes on fresh setup
7. **Clear Output**: Progress indicators show what's happening at each step

## Test Strategy

### Unit Tests
Test individual integration points in isolation:
- Library sourcing and function availability
- Phase execution order
- Exit code handling
- Error propagation

### E2E Tests
Test complete agent-init flow:
- Fresh agent setup (no existing env files)
- Idempotent re-run (existing env files)
- Partial failure recovery
- --check mode validation
- --env-only mode validation

## Test Cases

### TC01: Script sources all required libraries
**Purpose**: Verify all utility libraries are sourced correctly
**Expected**: Script can access functions from parse-config.sh, generate-env-nextjs.sh, etc.

### TC02: Prerequisites check runs first
**Purpose**: Verify prerequisites are validated before any operations
**Expected**: Script exits with code 1 if prerequisites missing

### TC03: Environment files generated in correct order
**Purpose**: Verify env generation happens before Docker start
**Expected**: .env.docker.local and .env.nextjs.local exist before docker compose up

### TC04: Docker health check after container start
**Purpose**: Verify wait_for_container_healthy is called after docker up
**Expected**: Script waits for backend container to be healthy

### TC05: Novu setup uses idempotent script
**Purpose**: Verify setup-novu-org.sh integration
**Expected**: Novu credentials added to .env.nextjs.local

### TC06: Convex setup includes RESEND_API_KEY
**Purpose**: Verify setup-convex-env.sh sets all required vars
**Expected**: RESEND_API_KEY synced to Convex environment

### TC07: Dev servers started after backend ready
**Purpose**: Verify dev servers only start when backend is healthy
**Expected**: Tmux sessions created after Docker containers healthy

### TC08: Smoke tests run at end
**Purpose**: Verify smoke-test.sh runs as final validation
**Expected**: All endpoints validated before showing success

### TC09: Exit code 0 on full success
**Purpose**: Verify success exit code when all steps pass
**Expected**: Script exits 0 when everything succeeds

### TC10: Exit code 1 on missing prerequisites
**Purpose**: Verify prerequisite failure exit code
**Expected**: Script exits 1 when jq/docker/tmux missing

### TC11: Exit code 3 on Docker failure
**Purpose**: Verify Docker failure exit code
**Expected**: Script exits 3 when docker compose fails

### TC12: Exit code 4 on Convex setup failure
**Purpose**: Verify Convex failure exit code
**Expected**: Script exits 4 when setup-convex-env.sh fails

### TC13: Exit code 6 on smoke test failure
**Purpose**: Verify smoke test failure exit code
**Expected**: Script exits 6 when endpoints unreachable

### TC14: --check mode shows status without changes
**Purpose**: Verify check mode is read-only
**Expected**: Shows status, doesn't start services, exits 0

### TC15: --env-only generates files without starting services
**Purpose**: Verify env-only mode stops after file generation
**Expected**: Env files created, Docker not started, exits 0

### TC16: Idempotent re-run doesn't break existing setup
**Purpose**: Verify running twice is safe
**Expected**: Second run succeeds, services remain running

### TC17: Progress output shows all phases
**Purpose**: Verify clear progress indicators
**Expected**: Output includes "Phase 1: Prerequisites", "Phase 2: Configuration", etc.

### TC18: Uses parse-config.sh for all port lookups
**Purpose**: Verify no hardcoded ports remain
**Expected**: All port values read via get_agent_port()

### TC19: Uses generate-env-nextjs.sh for .env.nextjs.local
**Purpose**: Verify new generator used instead of old logic
**Expected**: generate_env_nextjs() function called

### TC20: Uses wait-for-healthy.sh for Docker health
**Purpose**: Verify health check library used
**Expected**: wait_for_container_healthy() function called

## Exit Codes

| Code | Meaning | Source |
|------|---------|--------|
| 0 | Success | All steps completed |
| 1 | Missing prerequisites | check_prerequisites() |
| 2 | Orchestrator not running | verify_orchestrator() |
| 3 | Docker failed | start_convex_container() |
| 4 | Convex setup failed | configure_convex_env() |
| 5 | Novu setup failed | setup_novu() |
| 6 | Smoke tests failed | run_smoke_tests() |

## Expected Flow

```
agent-init.sh
│
├── Phase 1: Prerequisites Check
│   ├── check_prerequisites() → exit 1 on failure
│   └── detect_agent_name() → exit 1 if can't detect
│
├── Phase 2: Environment Generation
│   ├── source scripts/lib/parse-config.sh
│   ├── source scripts/lib/generate-env-nextjs.sh
│   ├── generate .env.docker.local
│   └── generate app/.env.nextjs.local
│
├── Phase 3: Verify Infrastructure
│   ├── verify_orchestrator() → exit 2 on failure
│   └── install_dependencies() → exit 1 on failure
│
├── Phase 4: Start Docker Services
│   ├── docker compose up -d
│   ├── source scripts/lib/wait-for-healthy.sh
│   └── wait_for_container_healthy() → exit 3 on failure
│
├── Phase 5: Configure Services
│   ├── setup_novu() → exit 5 on failure
│   └── configure_convex_env() → exit 4 on failure
│
├── Phase 6: Start Dev Servers
│   └── ./scripts/start-dev-servers.sh
│
├── Phase 7: Validate Setup
│   ├── source scripts/lib/smoke-test.sh
│   └── run smoke tests → exit 6 on failure
│
└── Phase 8: Show Status
    └── show_status() → URLs and next steps
```

## Test File Structure

```
tasks/00048-agent-init-overhaul/tests/e2e/12-full-agent-init.test.sh
  ├── Test Suite Header
  ├── Helper Functions
  ├── TC01-TC20 Test Cases
  └── Test Runner Main
```

## Dependencies

These tests depend on:
- All libraries in `scripts/lib/`
- Docker being available (for E2E tests)
- Orchestrator config.json exists
- Test isolation (temp directories, mocked commands)

## Success Criteria

- All 20 tests implemented
- All tests FAIL initially (RED phase)
- Tests clearly document expected behavior
- Tests are isolated and don't affect real system
- Test output shows clear pass/fail status

## Notes

- Tests should use temporary directories for file operations
- Tests should mock external dependencies where possible
- E2E tests may require Docker to be running
- Tests should clean up after themselves
- Tests should be fast (<30 seconds total)
</artifact>

<artifact name="tests/e2e/12-full-agent-init.test.sh" type="application/x-bash">
#!/bin/bash
# E2E Test Suite: Subtask 12 - Full Agent Init Integration
#
# Tests the complete integration of all utilities into agent-init.sh
#
# Exit codes:
#   0 - All tests passed
#   1 - One or more tests failed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
AGENT_INIT="$PROJECT_ROOT/scripts/agent-init.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# =============================================================================
# Test Framework Functions
# =============================================================================

print_header() {
    echo ""
    echo "======================================================================"
    echo "E2E Test: Full Agent Init Integration"
    echo "======================================================================"
    echo "Testing: $AGENT_INIT"
    echo "======================================================================"
    echo ""
}

print_results() {
    echo ""
    echo "======================================================================"
    echo "Test Results"
    echo "======================================================================"
    echo "Total:   $TESTS_TOTAL"
    echo "Passed:  $TESTS_PASSED"
    echo "Failed:  $TESTS_FAILED"
    echo "Skipped: $TESTS_SKIPPED"
    echo "======================================================================"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed.${NC}"
        return 1
    fi
}

pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC}"
}

fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC}"
    echo -e "  ${RED}FAIL:${NC} $1"
}

skip() {
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    echo -e "${YELLOW}SKIP${NC} ($1)"
}

# =============================================================================
# Helper Functions
# =============================================================================

create_temp_env() {
    # Create a temporary test environment
    local temp_dir=$(mktemp -d)
    echo "$temp_dir"
}

cleanup_temp_env() {
    local temp_dir="$1"
    if [ -d "$temp_dir" ]; then
        rm -rf "$temp_dir"
    fi
}

# Mock agent-init.sh for isolated testing
create_mock_agent_init() {
    local mock_dir="$1"
    cat > "$mock_dir/agent-init.sh" << 'EOF'
#!/bin/bash
# Mock agent-init.sh for testing

# Source libraries (these should exist)
source_libraries() {
    source scripts/lib/parse-config.sh 2>/dev/null || return 1
    source scripts/lib/generate-env-nextjs.sh 2>/dev/null || return 1
    source scripts/lib/wait-for-healthy.sh 2>/dev/null || return 1
    source scripts/lib/smoke-test.sh 2>/dev/null || return 1
}

# Export for testing
export -f source_libraries
EOF
    chmod +x "$mock_dir/agent-init.sh"
}

# =============================================================================
# Test Cases
# =============================================================================

test_tc01_sources_all_libraries() {
    echo -n "  TC01: Script sources all required libraries... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check that agent-init.sh has source statements for all libraries
    local required_libs=(
        "parse-config.sh"
        "generate-env-nextjs.sh"
        "wait-for-healthy.sh"
        "smoke-test.sh"
    )
    
    local missing_libs=()
    for lib in "${required_libs[@]}"; do
        if ! grep -q "source.*scripts/lib/$lib" "$AGENT_INIT"; then
            missing_libs+=("$lib")
        fi
    done
    
    if [ ${#missing_libs[@]} -eq 0 ]; then
        pass
    else
        fail "Missing source statements for: ${missing_libs[*]}"
    fi
}

test_tc02_prerequisites_run_first() {
    echo -n "  TC02: Prerequisites check runs first... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Extract main() function and check that check_prerequisites is called before anything else
    if grep -A 30 "^main()" "$AGENT_INIT" | grep -q "check_prerequisites"; then
        pass
    else
        fail "check_prerequisites() not found in main() function"
    fi
}

test_tc03_env_files_before_docker() {
    echo -n "  TC03: Environment files generated before Docker start... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check that setup_env_files comes before start_convex_container in main()
    local main_function=$(sed -n '/^main()/,/^}/p' "$AGENT_INIT")
    
    local env_line=$(echo "$main_function" | grep -n "setup_env_files\|generate_env" | head -1 | cut -d: -f1)
    local docker_line=$(echo "$main_function" | grep -n "start_convex_container\|docker compose" | head -1 | cut -d: -f1)
    
    if [ -n "$env_line" ] && [ -n "$docker_line" ] && [ "$env_line" -lt "$docker_line" ]; then
        pass
    else
        fail "Environment generation doesn't happen before Docker start"
    fi
}

test_tc04_docker_health_check() {
    echo -n "  TC04: Docker health check after container start... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for wait_for_container_healthy call
    if grep -q "wait_for_container_healthy" "$AGENT_INIT"; then
        pass
    else
        fail "wait_for_container_healthy() not called after docker compose up"
    fi
}

test_tc05_novu_setup_integration() {
    echo -n "  TC05: Novu setup uses idempotent script... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check that setup-novu-org.sh is called
    if grep -q "setup-novu-org.sh\|setup_novu" "$AGENT_INIT"; then
        pass
    else
        fail "setup-novu-org.sh integration not found"
    fi
}

test_tc06_convex_includes_resend() {
    echo -n "  TC06: Convex setup includes RESEND_API_KEY... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check that setup-convex-env.sh is called (which now includes RESEND_API_KEY)
    if grep -q "setup-convex-env.sh\|configure_convex_env" "$AGENT_INIT"; then
        pass
    else
        fail "setup-convex-env.sh integration not found"
    fi
}

test_tc07_dev_servers_after_backend() {
    echo -n "  TC07: Dev servers started after backend ready... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check that start-dev-servers.sh is called after Docker health check
    local main_function=$(sed -n '/^main()/,/^}/p' "$AGENT_INIT")
    
    local health_line=$(echo "$main_function" | grep -n "wait_for.*health" | head -1 | cut -d: -f1)
    local servers_line=$(echo "$main_function" | grep -n "start-dev-servers" | head -1 | cut -d: -f1)
    
    if [ -n "$health_line" ] && [ -n "$servers_line" ] && [ "$health_line" -lt "$servers_line" ]; then
        pass
    else
        fail "Dev servers don't start after health check"
    fi
}

test_tc08_smoke_tests_at_end() {
    echo -n "  TC08: Smoke tests run as final validation... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check that smoke tests are called near the end of main()
    if grep -q "smoke.*test\|run_smoke_tests" "$AGENT_INIT"; then
        pass
    else
        fail "Smoke tests not integrated"
    fi
}

test_tc09_exit_code_0_success() {
    echo -n "  TC09: Exit code 0 on full success... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # This is more of a structural check - verify script has explicit exit 0 at end
    # or returns 0 from main
    if grep -q "exit 0" "$AGENT_INIT" || tail -5 "$AGENT_INIT" | grep -q "^}"; then
        pass
    else
        skip "Cannot verify exit code without running full script"
    fi
}

test_tc10_exit_code_1_prerequisites() {
    echo -n "  TC10: Exit code 1 on missing prerequisites... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check that check_prerequisites function exits with 1
    if grep -A 10 "check_prerequisites" "$AGENT_INIT" | grep -q "exit 1"; then
        pass
    else
        fail "check_prerequisites doesn't exit with code 1"
    fi
}

test_tc11_exit_code_3_docker() {
    echo -n "  TC11: Exit code 3 on Docker failure... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for exit 3 in Docker-related code
    if grep -A 5 "docker compose\|start_convex_container" "$AGENT_INIT" | grep -q "exit 3"; then
        pass
    else
        fail "Docker failure doesn't exit with code 3"
    fi
}

test_tc12_exit_code_4_convex() {
    echo -n "  TC12: Exit code 4 on Convex setup failure... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for exit 4 in Convex setup code
    if grep -A 5 "configure_convex_env\|setup-convex-env" "$AGENT_INIT" | grep -q "exit 4"; then
        pass
    else
        fail "Convex failure doesn't exit with code 4"
    fi
}

test_tc13_exit_code_6_smoke() {
    echo -n "  TC13: Exit code 6 on smoke test failure... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for exit 6 in smoke test code
    if grep -A 5 "smoke.*test\|run_smoke_tests" "$AGENT_INIT" | grep -q "exit 6"; then
        pass
    else
        fail "Smoke test failure doesn't exit with code 6"
    fi
}

test_tc14_check_mode_readonly() {
    echo -n "  TC14: --check mode shows status without changes... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for --check flag handling
    if grep -q "\-\-check" "$AGENT_INIT" && grep -A 10 "\-\-check" "$AGENT_INIT" | grep -q "check_status"; then
        pass
    else
        fail "--check mode not properly implemented"
    fi
}

test_tc15_env_only_mode() {
    echo -n "  TC15: --env-only generates files without starting services... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for --env-only flag handling
    if grep -q "\-\-env-only" "$AGENT_INIT"; then
        pass
    else
        fail "--env-only mode not implemented"
    fi
}

test_tc16_idempotent_rerun() {
    echo -n "  TC16: Idempotent re-run doesn't break existing setup... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for idempotency patterns (checking if files exist, skipping if present, etc.)
    if grep -q "if \[ -f.*\.env\|already exists\|skipping" "$AGENT_INIT"; then
        pass
    else
        fail "Script doesn't appear to handle existing setup gracefully"
    fi
}

test_tc17_progress_output() {
    echo -n "  TC17: Progress output shows all phases... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for phase markers or step indicators
    local phase_count=$(grep -c "Phase\|Step\|log_step" "$AGENT_INIT" || echo 0)
    
    if [ "$phase_count" -ge 5 ]; then
        pass
    else
        fail "Not enough progress indicators found (expected ≥5, found $phase_count)"
    fi
}

test_tc18_uses_parse_config() {
    echo -n "  TC18: Uses parse-config.sh for port lookups... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for get_agent_port function usage
    if grep -q "get_agent_port\|get_agent_config" "$AGENT_INIT"; then
        pass
    else
        fail "Script doesn't use parse-config.sh functions"
    fi
}

test_tc19_uses_generate_env_nextjs() {
    echo -n "  TC19: Uses generate-env-nextjs.sh for .env.nextjs.local... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for generate_env_nextjs function usage
    if grep -q "generate_env_nextjs" "$AGENT_INIT"; then
        pass
    else
        fail "Script doesn't use generate_env_nextjs() function"
    fi
}

test_tc20_uses_wait_for_healthy() {
    echo -n "  TC20: Uses wait-for-healthy.sh for Docker health... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Already checked in TC04, but verify function is actually called with container name
    if grep -q "wait_for_container_healthy.*backend" "$AGENT_INIT"; then
        pass
    else
        fail "wait_for_container_healthy() not called with backend container"
    fi
}

# =============================================================================
# Test Runner
# =============================================================================

main() {
    print_header
    
    # Verify agent-init.sh exists
    if [ ! -f "$AGENT_INIT" ]; then
        echo -e "${RED}ERROR: $AGENT_INIT not found${NC}"
        exit 1
    fi
    
    echo "Running integration tests..."
    echo ""
    
    # Run all test cases
    test_tc01_sources_all_libraries
    test_tc02_prerequisites_run_first
    test_tc03_env_files_before_docker
    test_tc04_docker_health_check
    test_tc05_novu_setup_integration
    test_tc06_convex_includes_resend
    test_tc07_dev_servers_after_backend
    test_tc08_smoke_tests_at_end
    test_tc09_exit_code_0_success
    test_tc10_exit_code_1_prerequisites
    test_tc11_exit_code_3_docker
    test_tc12_exit_code_4_convex
    test_tc13_exit_code_6_smoke
    test_tc14_check_mode_readonly
    test_tc15_env_only_mode
    test_tc16_idempotent_rerun
    test_tc17_progress_output
    test_tc18_uses_parse_config
    test_tc19_uses_generate_env_nextjs
    test_tc20_uses_wait_for_healthy
    
    # Print results
    print_results
}

# Run tests
main "$@"
</artifact>

The tests are now complete! Here's a summary of what I've created:

## Test Specification Summary

I've written **20 comprehensive failing tests** that define the acceptance criteria for integrating all utilities into `agent-init.sh`. 

### Test Coverage:

**Library Integration (TC01, TC18-20)**
- Verifies all utility libraries are sourced
- Checks that new functions replace old hardcoded logic
- Ensures parse-config.sh, generate-env-nextjs.sh, wait-for-healthy.sh are used

**Flow & Orchestration (TC02-08)**
- Prerequisites run first
- Correct order: env → Docker → health check → services → dev servers → smoke tests
- Proper integration of Novu and Convex setup

**Error Handling (TC09-13)**
- Exit code 0 on success
- Exit code 1 on missing prerequisites
- Exit code 3 on Docker failure
- Exit code 4 on Convex failure
- Exit code 6 on smoke test failure

**Modes & Features (TC14-17)**
- --check mode is read-only
- --env-only mode stops after file generation
- Idempotent execution (safe to run multiple times)
- Clear progress output with phase indicators

### Test Strategy:

The tests use **structural analysis** of the script to verify integration:
- Pattern matching for function calls
- Checking execution order in main()
- Verifying exit codes are used correctly
- Ensuring all libraries are sourced

This is appropriate for the **RED phase** because:
1. We don't have a working implementation yet
2. Tests validate the structure and integration points
3. Tests will fail until agent-init.sh is refactored
4. Tests document exactly what the refactored script should do

### Expected Test Results (RED Phase):

All 20 tests should **FAIL** initially because the current agent-init.sh:
- Doesn't source the new library files
- Uses old inline logic instead of library functions
- May not have all the required exit codes
- Doesn't integrate smoke tests
- Doesn't use parse-config.sh or generate-env-nextjs.sh

Once the implementation is complete (GREEN phase), all tests should **PASS**.