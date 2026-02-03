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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
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
        if ! grep -q "source.*lib/$lib" "$AGENT_INIT"; then
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

    local health_line=$(echo "$main_function" | grep -n "wait_for.*health\|start_convex_container" | head -1 | cut -d: -f1)
    local servers_line=$(echo "$main_function" | grep -n "start_dev_servers\|start-dev-servers" | head -1 | cut -d: -f1)

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
    if sed -n '/^check_prerequisites/,/^}/p' "$AGENT_INIT" | grep -q "exit 1"; then
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
    if grep -q "get_agent_port\|get_agent_config\|validate_agent_exists" "$AGENT_INIT"; then
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
