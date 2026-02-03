#!/usr/bin/env bash
#
# Unit Tests for scripts/lib/generate-env-docker.sh
#
# Test Framework: Plain bash (no external dependencies)
# Run: ./tasks/00048-agent-init-overhaul/tests/unit/02-generate-env-docker.test.sh
#

set -euo pipefail

# ============================================================================
# Test Framework
# ============================================================================

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0
CURRENT_TEST=""

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

setup() {
    # Create temporary test directory
    TEST_DIR=$(mktemp -d)
    MOCK_ORCHESTRATOR_DIR="${TEST_DIR}/artifact-review-orchestrator"
    mkdir -p "${MOCK_ORCHESTRATOR_DIR}"

    # Save original directory
    ORIG_DIR=$(pwd)

    # Create a test project directory structure
    TEST_PROJECT_DIR="${TEST_DIR}/artifact-review-james"
    mkdir -p "${TEST_PROJECT_DIR}/scripts/lib"

    # Copy the actual scripts if they exist
    if [ -f "${ORIG_DIR}/scripts/lib/parse-config.sh" ]; then
        cp "${ORIG_DIR}/scripts/lib/parse-config.sh" "${TEST_PROJECT_DIR}/scripts/lib/"
    fi

    if [ -f "${ORIG_DIR}/scripts/lib/generate-env-docker.sh" ]; then
        cp "${ORIG_DIR}/scripts/lib/generate-env-docker.sh" "${TEST_PROJECT_DIR}/scripts/lib/"
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

assert_file_exists() {
    local file="$1"
    local message="${2:-}"

    if [ -f "$file" ]; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    File does not exist: $file"
        return 1
    fi
}

assert_file_not_exists() {
    local file="$1"
    local message="${2:-}"

    if [ ! -f "$file" ]; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    File should not exist: $file"
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

test_skip() {
    local reason="$1"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    echo -e " ${YELLOW}SKIP${NC} ($reason)"
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

create_incomplete_config() {
    cat > "${MOCK_ORCHESTRATOR_DIR}/config.json" << 'EOF'
{
  "incomplete": {
    "convexCloudPort": 3230
  }
}
EOF
}

create_no_subnet_config() {
    cat > "${MOCK_ORCHESTRATOR_DIR}/config.json" << 'EOF'
{
  "nosubnet": {
    "appPort": 3040,
    "convexCloudPort": 3250
  }
}
EOF
}

# ============================================================================
# Test Cases
# ============================================================================

test_tc01_missing_jq() {
    test_start "TC01: Missing jq prerequisite"
    test_skip "requires PATH mocking"
}

test_tc02_missing_mkcert() {
    test_start "TC02: Missing mkcert prerequisite"
    test_skip "requires PATH mocking"
}

test_tc03_agent_not_found() {
    test_start "TC03: Agent not found in config"

    create_valid_config

    # Try to generate for non-existent agent
    local output_file="${TEST_DIR}/test.env"
    local error_output
    error_output=$(source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "nonexistent" "$output_file" 2>&1) || local exit_code=$?

    assert_exit_code 4 "${exit_code:-0}" "Should exit with code 4 for agent not found" || { test_fail; return; }
    assert_file_not_exists "$output_file" "Should not create file when agent not found" || { test_fail; return; }
    assert_contains "$error_output" "not found" "Should show error message" || { test_fail; return; }

    test_pass
}

test_tc04_missing_port_key() {
    test_start "TC04: Missing port key in config"

    create_incomplete_config

    # Try to generate for agent with incomplete config
    local output_file="${TEST_DIR}/test.env"
    local error_output
    error_output=$(source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "incomplete" "$output_file" 2>&1) || local exit_code=$?

    assert_exit_code 5 "${exit_code:-0}" "Should exit with code 5 for missing port" || { test_fail; return; }
    assert_file_not_exists "$output_file" "Should not create file when config incomplete" || { test_fail; return; }

    test_pass
}

test_tc05_missing_subnet() {
    test_start "TC05: Missing subnet in config"

    create_no_subnet_config

    # Try to generate for agent without subnet
    local output_file="${TEST_DIR}/test.env"
    local error_output
    error_output=$(source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "nosubnet" "$output_file" 2>&1) || local exit_code=$?

    assert_exit_code 5 "${exit_code:-0}" "Should exit with code 5 for missing subnet" || { test_fail; return; }
    assert_file_not_exists "$output_file" "Should not create file when subnet missing" || { test_fail; return; }

    test_pass
}

test_tc06_generate_valid_agent() {
    test_start "TC06: Generate for valid agent (james)"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "james" "$output_file" || local exit_code=$?

    assert_exit_code 0 "${exit_code:-0}" "Should succeed" || { test_fail; return; }
    assert_file_exists "$output_file" "Should create output file" || { test_fail; return; }

    local content=$(cat "$output_file")
    assert_contains "$content" "AGENT_NAME=james" "Should contain agent name" || { test_fail; return; }
    assert_contains "$content" "BASE_PORT=3020" "Should contain base port" || { test_fail; return; }
    assert_contains "$content" "RESEND_NETWORK_SUBNET=172.28.0.0/16" "Should contain subnet" || { test_fail; return; }
    assert_contains "$content" "RESEND_PROXY_IP=172.28.0.10" "Should contain proxy IP" || { test_fail; return; }
    assert_contains "$content" 'SITE_URL=https://${AGENT_NAME}.loc' "Should contain site URL with variable" || { test_fail; return; }

    test_pass
}

test_tc07_generate_default_agent() {
    test_start "TC07: Generate for default agent"

    create_valid_config

    local output_file="${TEST_DIR}/test-default.env"
    source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "default" "$output_file" || local exit_code=$?

    assert_exit_code 0 "${exit_code:-0}" "Should succeed" || { test_fail; return; }

    local content=$(cat "$output_file")
    assert_contains "$content" "AGENT_NAME=default" "Should contain default agent name" || { test_fail; return; }
    assert_contains "$content" "BASE_PORT=3000" "Should contain default base port" || { test_fail; return; }
    assert_contains "$content" "RESEND_NETWORK_SUBNET=172.27.0.0/16" "Should contain default subnet" || { test_fail; return; }
    assert_contains "$content" "RESEND_PROXY_IP=172.27.0.10" "Should contain default proxy IP" || { test_fail; return; }

    test_pass
}

test_tc08_overwrite_existing() {
    test_start "TC08: Overwrite existing file"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"

    # Create initial file
    echo "OLD CONTENT" > "$output_file"

    # Generate new content
    source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "james" "$output_file" || local exit_code=$?

    assert_exit_code 0 "${exit_code:-0}" "Should succeed" || { test_fail; return; }

    local content=$(cat "$output_file")
    assert_contains "$content" "AGENT_NAME=james" "Should contain new content" || { test_fail; return; }

    if echo "$content" | grep -q "OLD CONTENT"; then
        echo -e "${RED}  FAIL${NC}: Old content should be completely replaced"
        test_fail
        return
    fi

    test_pass
}

test_tc09_directory_not_exists() {
    test_start "TC09: Output directory doesn't exist"

    create_valid_config

    local output_file="${TEST_DIR}/nonexistent/directory/test.env"
    local error_output
    error_output=$(source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "james" "$output_file" 2>&1) || local exit_code=$?

    assert_exit_code 6 "${exit_code:-0}" "Should exit with code 6 for missing directory" || { test_fail; return; }

    test_pass
}

test_tc10_header_comment() {
    test_start "TC10: File contains header comment"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "james" "$output_file"

    local content=$(cat "$output_file")
    assert_contains "$content" "AUTO-GENERATED" "Should contain auto-generated warning" || { test_fail; return; }
    assert_contains "$content" "Do not edit" "Should warn against manual editing" || { test_fail; return; }
    assert_contains "$content" "Generated:" "Should contain timestamp marker" || { test_fail; return; }

    test_pass
}

test_tc11_all_sections() {
    test_start "TC11: File contains all required sections"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "james" "$output_file"

    local content=$(cat "$output_file")
    assert_contains "$content" "AGENT IDENTITY" "Should have AGENT IDENTITY section" || { test_fail; return; }
    assert_contains "$content" "DERIVED PORTS" "Should have DERIVED PORTS section" || { test_fail; return; }
    assert_contains "$content" "SERVICE DOMAINS" "Should have SERVICE DOMAINS section" || { test_fail; return; }
    assert_contains "$content" "DOCKER COMPOSE" "Should have DOCKER COMPOSE section" || { test_fail; return; }
    assert_contains "$content" "TLS CERTIFICATES" "Should have TLS CERTIFICATES section" || { test_fail; return; }
    assert_contains "$content" "RESEND PROXY NETWORK" "Should have RESEND PROXY NETWORK section" || { test_fail; return; }

    test_pass
}

test_tc12_mkcert_caroot() {
    test_start "TC12: Verify mkcert CAROOT path"

    # This test verifies the function attempts to detect mkcert CAROOT
    # We can't test actual mkcert without it being installed, so we check the file content

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "james" "$output_file" || local exit_code=$?

    # Should succeed even if mkcert not found (graceful degradation)
    assert_exit_code 0 "${exit_code:-0}" "Should succeed" || { test_fail; return; }

    local content=$(cat "$output_file")
    assert_contains "$content" "MKCERT_CERTS_PATH" "Should contain mkcert certs path" || { test_fail; return; }

    test_pass
}

test_tc13_subnet_math() {
    test_start "TC13: Subnet math verification"

    create_valid_config

    # Test james agent (172.28)
    local output_file="${TEST_DIR}/test-james.env"
    source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "james" "$output_file"

    local content=$(cat "$output_file")
    assert_contains "$content" "RESEND_NETWORK_SUBNET=172.28.0.0/16" "James subnet should be 172.28.0.0/16" || { test_fail; return; }
    assert_contains "$content" "RESEND_PROXY_IP=172.28.0.10" "James proxy IP should be 172.28.0.10" || { test_fail; return; }

    # Test default agent (172.27)
    local output_file2="${TEST_DIR}/test-default.env"
    source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "default" "$output_file2"

    local content2=$(cat "$output_file2")
    assert_contains "$content2" "RESEND_NETWORK_SUBNET=172.27.0.0/16" "Default subnet should be 172.27.0.0/16" || { test_fail; return; }
    assert_contains "$content2" "RESEND_PROXY_IP=172.27.0.10" "Default proxy IP should be 172.27.0.10" || { test_fail; return; }

    test_pass
}

test_tc14_variable_substitution() {
    test_start "TC14: Variable substitution protection"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-docker.sh 2>&1 && generate_env_docker "james" "$output_file"

    local content=$(cat "$output_file")

    # Check that ${AGENT_NAME} is preserved as literal string (not expanded)
    assert_contains "$content" '${AGENT_NAME}' "Should contain literal \${AGENT_NAME}" || { test_fail; return; }

    # Verify it appears in URL contexts
    assert_contains "$content" 'https://${AGENT_NAME}.loc' "Should preserve variable in SITE_URL" || { test_fail; return; }
    assert_contains "$content" 'https://${AGENT_NAME}.convex.cloud.loc' "Should preserve variable in CONVEX_CLOUD_URL" || { test_fail; return; }

    test_pass
}

test_tc15_idempotency() {
    test_start "TC15: Idempotency test"

    create_valid_config

    local output_file1="${TEST_DIR}/test1.env"
    local output_file2="${TEST_DIR}/test2.env"

    # Generate twice
    source scripts/lib/generate-env-docker.sh 2>&1
    generate_env_docker "james" "$output_file1" || local exit1=$?
    sleep 1  # Ensure timestamp difference
    generate_env_docker "james" "$output_file2" || local exit2=$?

    assert_exit_code 0 "${exit1:-0}" "First generation should succeed" || { test_fail; return; }
    assert_exit_code 0 "${exit2:-0}" "Second generation should succeed" || { test_fail; return; }

    # Both files should exist
    assert_file_exists "$output_file1" "First file should exist" || { test_fail; return; }
    assert_file_exists "$output_file2" "Second file should exist" || { test_fail; return; }

    # Compare content (excluding timestamp line)
    local content1=$(grep -v "^# Generated:" "$output_file1")
    local content2=$(grep -v "^# Generated:" "$output_file2")

    assert_equals "$content1" "$content2" "Content should be identical (except timestamp)" || { test_fail; return; }

    test_pass
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    echo "======================================================================"
    echo "Unit Tests: scripts/lib/generate-env-docker.sh"
    echo "======================================================================"

    setup

    test_tc01_missing_jq
    test_tc02_missing_mkcert
    test_tc03_agent_not_found
    test_tc04_missing_port_key
    test_tc05_missing_subnet
    test_tc06_generate_valid_agent
    test_tc07_generate_default_agent
    test_tc08_overwrite_existing
    test_tc09_directory_not_exists
    test_tc10_header_comment
    test_tc11_all_sections
    test_tc12_mkcert_caroot
    test_tc13_subnet_math
    test_tc14_variable_substitution
    test_tc15_idempotency

    teardown

    echo ""
    echo "======================================================================"
    echo "Test Results"
    echo "======================================================================"
    echo -e "Total:   $TESTS_RUN"
    echo -e "${GREEN}Passed:  $TESTS_PASSED${NC}"
    echo -e "${RED}Failed:  $TESTS_FAILED${NC}"
    echo -e "${YELLOW}Skipped: $TESTS_SKIPPED${NC}"
    echo "======================================================================"

    if [ $TESTS_FAILED -gt 0 ]; then
        exit 1
    fi

    exit 0
}

# Run tests if executed directly
if [ "${BASH_SOURCE[0]}" -ef "$0" ]; then
    run_all_tests
fi
