#!/usr/bin/env bash
#
# Unit Tests for scripts/lib/parse-config.sh
#
# Test Framework: Plain bash (no external dependencies)
# Run: ./tasks/00048-agent-init-overhaul/tests/unit/01-parse-config.test.sh
#

set -euo pipefail

# ============================================================================
# Test Framework
# ============================================================================

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
CURRENT_TEST=""

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

setup() {
    # Create temporary test directory
    TEST_DIR=$(mktemp -d)
    MOCK_ORCHESTRATOR_DIR="${TEST_DIR}/orchestrator-artifact-review"
    mkdir -p "${MOCK_ORCHESTRATOR_DIR}"

    # Save original directory
    ORIG_DIR=$(pwd)

    # Create a test project directory structure
    TEST_PROJECT_DIR="${TEST_DIR}/artifact-review-james"
    mkdir -p "${TEST_PROJECT_DIR}/scripts/lib"

    # Copy the actual parse-config.sh if it exists
    if [ -f "${ORIG_DIR}/scripts/lib/parse-config.sh" ]; then
        cp "${ORIG_DIR}/scripts/lib/parse-config.sh" "${TEST_PROJECT_DIR}/scripts/lib/"
    fi

    cd "${TEST_PROJECT_DIR}"
}

teardown() {
    cd "${ORIG_DIR}"
    rm -rf "${TEST_DIR}"
}

assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"

    if [ "$expected" = "$actual" ]; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected: '$expected'"
        echo "    Actual:   '$actual'"
        return 1
    fi
}

assert_exit_code() {
    local expected_code="$1"
    local actual_code="$2"
    local message="${3:-}"

    if [ "$expected_code" -eq "$actual_code" ]; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected exit code: $expected_code"
        echo "    Actual exit code:   $actual_code"
        return 1
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-}"

    if echo "$haystack" | grep -qF "$needle"; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected to contain: '$needle'"
        echo "    Actual output: '$haystack'"
        return 1
    fi
}

test_start() {
    CURRENT_TEST="$1"
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "  ${CURRENT_TEST}..."
}

test_pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e " ${GREEN}✓${NC}"
}

test_fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    # Error already printed by assert functions
}

# ============================================================================
# Test Fixtures
# ============================================================================

create_valid_config() {
    cat > "${MOCK_ORCHESTRATOR_DIR}/config.json" << 'EOF'
{
  "_comment": "Test config",
  "default": {
    "appPort": 3000,
    "convexCloudPort": 3211,
    "convexSitePort": 3212,
    "convexDashboardPort": 6791,
    "mailpitPort": 8025,
    "subnet": "172.27"
  },
  "james": {
    "appPort": 3020,
    "convexCloudPort": 3230,
    "convexSitePort": 3231,
    "mailpitPort": 8045,
    "convexDashboardPort": 6811,
    "subnet": "172.28"
  }
}
EOF
}

create_invalid_json_config() {
    cat > "${MOCK_ORCHESTRATOR_DIR}/config.json" << 'EOF'
{
  "james": {
    "appPort": 3020,
    INVALID JSON HERE
  }
}
EOF
}

create_minimal_config() {
    cat > "${MOCK_ORCHESTRATOR_DIR}/config.json" << 'EOF'
{
  "test-agent": {
    "appPort": 4000
  }
}
EOF
}

# ============================================================================
# Test Cases
# ============================================================================

test_tc01_dependency_validation() {
    test_start "TC01: Dependency validation (jq required)"

    # This test would require mocking the 'command -v jq' check
    # For now, we'll skip it since it requires the actual library
    # In real implementation, we'd use PATH manipulation to hide jq

    echo -e " ${YELLOW}SKIP${NC} (requires PATH mocking)"
}

test_tc02_orchestrator_not_found() {
    test_start "TC02: Orchestrator directory not found"

    # Remove the mock orchestrator directory
    rm -rf "${MOCK_ORCHESTRATOR_DIR}"

    # Try to source the library (this will fail - library doesn't exist yet)
    # Expected: Error about orchestrator not found

    # This test will fail because scripts/lib/parse-config.sh doesn't exist yet
    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        output=$(source scripts/lib/parse-config.sh 2>&1 && get_agent_port "james" "appPort" 2>&1)
        exit_code=$?
        set -e

        assert_exit_code 2 "$exit_code" "Should return exit code 2 for missing orchestrator" && \
        assert_contains "$output" "Orchestrator directory not found" "Should mention orchestrator not found" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

test_tc03_config_not_found() {
    test_start "TC03: config.json not found"

    # Create orchestrator dir but no config.json
    mkdir -p "${MOCK_ORCHESTRATOR_DIR}"

    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        output=$(source scripts/lib/parse-config.sh 2>&1 && get_agent_port "james" "appPort" 2>&1)
        exit_code=$?
        set -e

        assert_exit_code 2 "$exit_code" "Should return exit code 2 for missing config.json" && \
        assert_contains "$output" "config.json not found" "Should mention config.json not found" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

test_tc04_invalid_json() {
    test_start "TC04: Invalid JSON in config.json"

    create_invalid_json_config

    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        output=$(source scripts/lib/parse-config.sh 2>&1 && get_agent_port "james" "appPort" 2>&1)
        exit_code=$?
        set -e

        assert_exit_code 3 "$exit_code" "Should return exit code 3 for invalid JSON" && \
        assert_contains "$output" "not valid JSON" "Should mention invalid JSON" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

test_tc05_agent_not_found() {
    test_start "TC05: Agent not in config"

    create_valid_config

    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        output=$(source scripts/lib/parse-config.sh 2>&1 && get_agent_port "nonexistent" "appPort" 2>&1)
        exit_code=$?
        set -e

        assert_exit_code 4 "$exit_code" "Should return exit code 4 for missing agent" && \
        assert_contains "$output" "Agent 'nonexistent' not found" "Should mention agent not found" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

test_tc06_read_app_port() {
    test_start "TC06: Read appPort for existing agent"

    create_valid_config

    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        output=$(source scripts/lib/parse-config.sh && get_agent_port "james" "appPort" 2>&1)
        exit_code=$?
        set -e

        assert_exit_code 0 "$exit_code" "Should succeed" && \
        assert_equals "3020" "$output" "Should return appPort value" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

test_tc07_read_convex_cloud_port() {
    test_start "TC07: Read convexCloudPort for existing agent"

    create_valid_config

    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        output=$(source scripts/lib/parse-config.sh && get_agent_port "james" "convexCloudPort" 2>&1)
        exit_code=$?
        set -e

        assert_exit_code 0 "$exit_code" "Should succeed" && \
        assert_equals "3230" "$output" "Should return convexCloudPort value" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

test_tc08_read_subnet() {
    test_start "TC08: Read subnet for existing agent"

    create_valid_config

    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        output=$(source scripts/lib/parse-config.sh && get_agent_port "james" "subnet" 2>&1)
        exit_code=$?
        set -e

        assert_exit_code 0 "$exit_code" "Should succeed" && \
        assert_equals "172.28" "$output" "Should return subnet value" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

test_tc09_read_all_config() {
    test_start "TC09: Read all config for agent"

    create_valid_config

    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        output=$(source scripts/lib/parse-config.sh && get_agent_config "james" 2>&1)
        exit_code=$?
        set -e

        assert_exit_code 0 "$exit_code" "Should succeed" && \
        assert_contains "$output" '"appPort"' "Should contain appPort" && \
        assert_contains "$output" '"convexCloudPort"' "Should contain convexCloudPort" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

test_tc10_validate_existing_agent() {
    test_start "TC10: Validate existing agent"

    create_valid_config

    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        source scripts/lib/parse-config.sh
        validate_agent_exists "james" >/dev/null 2>&1
        exit_code=$?
        set -e

        assert_exit_code 0 "$exit_code" "Should return 0 for existing agent" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

test_tc11_validate_nonexistent_agent() {
    test_start "TC11: Validate non-existing agent"

    create_valid_config

    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        source scripts/lib/parse-config.sh
        validate_agent_exists "nonexistent" >/dev/null 2>&1
        exit_code=$?
        set -e

        assert_exit_code 1 "$exit_code" "Should return 1 for non-existing agent" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

test_tc12_read_default_agent() {
    test_start "TC12: Read default agent config"

    create_valid_config

    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        output=$(source scripts/lib/parse-config.sh && get_agent_port "default" "appPort" 2>&1)
        exit_code=$?
        set -e

        assert_exit_code 0 "$exit_code" "Should succeed" && \
        assert_equals "3000" "$output" "Should return default appPort value" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

test_tc13_invalid_port_key() {
    test_start "TC13: Invalid port key requested"

    create_valid_config

    if [ -f "scripts/lib/parse-config.sh" ]; then
        set +e
        output=$(source scripts/lib/parse-config.sh && get_agent_port "james" "invalidPortKey" 2>&1)
        exit_code=$?
        set -e

        assert_exit_code 5 "$exit_code" "Should return exit code 5 for invalid port key" && \
        assert_contains "$output" "Port key 'invalidPortKey' not found" "Should mention port key not found" && \
        test_pass || test_fail
    else
        echo -e " ${RED}FAIL${NC}: scripts/lib/parse-config.sh does not exist (expected - RED phase)"
    fi
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    echo "============================================================================"
    echo "Config Parser Unit Tests (TDD - RED Phase)"
    echo "============================================================================"
    echo ""

    # Run each test in isolation
    for test_func in $(declare -F | grep "test_tc" | awk '{print $3}'); do
        setup
        $test_func
        teardown
    done

    echo ""
    echo "============================================================================"
    echo "Test Summary"
    echo "============================================================================"
    echo -e "Total:  ${TESTS_RUN}"
    echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
    echo ""

    if [ "$TESTS_FAILED" -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Tests failed${NC}"
        exit 1
    fi
}

# ============================================================================
# Main
# ============================================================================

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_all_tests
fi
