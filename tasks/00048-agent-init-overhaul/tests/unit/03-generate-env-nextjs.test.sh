#!/usr/bin/env bash
#
# Unit Tests for scripts/lib/generate-env-nextjs.sh
#
# Test Framework: Plain bash (no external dependencies)
# Run: ./tasks/00048-agent-init-overhaul/tests/unit/03-generate-env-nextjs.test.sh
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
    MOCK_ORCHESTRATOR_DIR="${TEST_DIR}/orchestrator-artifact-review"
    mkdir -p "${MOCK_ORCHESTRATOR_DIR}"

    # Save original directory
    ORIG_DIR=$(pwd)

    # Create a test project directory structure
    TEST_PROJECT_DIR="${TEST_DIR}/artifact-review-james"
    mkdir -p "${TEST_PROJECT_DIR}/scripts/lib"
    mkdir -p "${TEST_PROJECT_DIR}/app"

    # Copy the actual scripts if they exist
    if [ -f "${ORIG_DIR}/scripts/lib/parse-config.sh" ]; then
        cp "${ORIG_DIR}/scripts/lib/parse-config.sh" "${TEST_PROJECT_DIR}/scripts/lib/"
    fi

    if [ -f "${ORIG_DIR}/scripts/lib/generate-env-nextjs.sh" ]; then
        cp "${ORIG_DIR}/scripts/lib/generate-env-nextjs.sh" "${TEST_PROJECT_DIR}/scripts/lib/"
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
        echo "    Actual output (first 200 chars): '${haystack:0:200}'"
        return 1
    fi
}

assert_not_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-}"

    if echo "$haystack" | grep -qF "$needle"; then
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Should NOT contain: '$needle'"
        echo "    But found in output"
        return 1
    else
        return 0
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
    "appPort": 3040
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
    error_output=$(source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "nonexistent" "$output_file" 2>&1) || local exit_code=$?

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
    error_output=$(source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "incomplete" "$output_file" 2>&1) || local exit_code=$?

    assert_exit_code 5 "${exit_code:-0}" "Should exit with code 5 for missing port" || { test_fail; return; }
    assert_file_not_exists "$output_file" "Should not create file when config incomplete" || { test_fail; return; }

    test_pass
}

test_tc05_generate_valid_agent() {
    test_start "TC05: Generate for valid agent (james)"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "james" "$output_file" || local exit_code=$?

    assert_exit_code 0 "${exit_code:-0}" "Should succeed" || { test_fail; return; }
    assert_file_exists "$output_file" "Should create output file" || { test_fail; return; }

    local content=$(cat "$output_file")
    assert_contains "$content" "CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3230" "Should contain correct Convex URL with port" || { test_fail; return; }
    assert_contains "$content" "NEXT_PUBLIC_CONVEX_URL=https://james.convex.cloud.loc" "Should contain public Convex URL" || { test_fail; return; }
    assert_contains "$content" "NEXT_PUBLIC_CONVEX_HTTP_URL=https://james.convex.site.loc" "Should contain HTTP URL" || { test_fail; return; }
    assert_contains "$content" "SITE_URL=https://james.loc" "Should contain site URL" || { test_fail; return; }
    assert_contains "$content" "CONVEX_SITE_URL=https://james.convex.site.loc" "Should contain Convex site URL" || { test_fail; return; }
    assert_contains "$content" "MAILPIT_API_URL=https://james.mailpit.loc/api/v1" "Should contain Mailpit URL" || { test_fail; return; }
    assert_contains "$content" "RESEND_FULL_ACCESS_API_KEY=re_dummy_key_for_localhost" "Should contain dummy Resend key" || { test_fail; return; }

    test_pass
}

test_tc06_generate_default_agent() {
    test_start "TC06: Generate for default agent"

    create_valid_config

    local output_file="${TEST_DIR}/test-default.env"
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "default" "$output_file" || local exit_code=$?

    assert_exit_code 0 "${exit_code:-0}" "Should succeed" || { test_fail; return; }

    local content=$(cat "$output_file")
    assert_contains "$content" "CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3211" "Should contain default Convex port" || { test_fail; return; }
    assert_contains "$content" "NEXT_PUBLIC_CONVEX_URL=https://default.convex.cloud.loc" "Should use 'default' in URLs" || { test_fail; return; }
    assert_contains "$content" "SITE_URL=https://default.loc" "Should use 'default' in site URL" || { test_fail; return; }

    test_pass
}

test_tc07_overwrite_existing() {
    test_start "TC07: Overwrite existing file"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"

    # Create initial file
    echo "OLD CONTENT" > "$output_file"

    # Generate new content
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "james" "$output_file" || local exit_code=$?

    assert_exit_code 0 "${exit_code:-0}" "Should succeed" || { test_fail; return; }

    local content=$(cat "$output_file")
    assert_contains "$content" "CONVEX_SELF_HOSTED_URL" "Should contain new content" || { test_fail; return; }

    if echo "$content" | grep -q "OLD CONTENT"; then
        echo -e "${RED}  FAIL${NC}: Old content should be completely replaced"
        test_fail
        return
    fi

    test_pass
}

test_tc08_directory_not_exists() {
    test_start "TC08: Output directory doesn't exist"

    create_valid_config

    local output_file="${TEST_DIR}/nonexistent/directory/test.env"
    local error_output
    error_output=$(source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "james" "$output_file" 2>&1) || local exit_code=$?

    assert_exit_code 6 "${exit_code:-0}" "Should exit with code 6 for missing directory" || { test_fail; return; }

    test_pass
}

test_tc09_header_comment() {
    test_start "TC09: File contains header comment"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "james" "$output_file"

    local content=$(cat "$output_file")
    assert_contains "$content" "AUTO-GENERATED" "Should contain auto-generated warning" || { test_fail; return; }
    assert_contains "$content" "Do not edit" "Should warn against manual editing" || { test_fail; return; }
    assert_contains "$content" "Generated:" "Should contain timestamp marker" || { test_fail; return; }

    test_pass
}

test_tc10_all_sections() {
    test_start "TC10: File contains all required sections"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "james" "$output_file"

    local content=$(cat "$output_file")
    assert_contains "$content" "CONVEX CONNECTION" "Should have CONVEX CONNECTION section" || { test_fail; return; }
    assert_contains "$content" "AUTHENTICATION & SECURITY" "Should have AUTHENTICATION & SECURITY section" || { test_fail; return; }
    assert_contains "$content" "EMAIL (RESEND)" "Should have EMAIL section" || { test_fail; return; }
    assert_contains "$content" "NOTIFICATIONS (NOVU)" "Should have NOTIFICATIONS section" || { test_fail; return; }
    assert_contains "$content" "LOCAL DEV TOOLS" "Should have LOCAL DEV TOOLS section" || { test_fail; return; }
    assert_contains "$content" "TLS CERTIFICATES" "Should have TLS CERTIFICATES section" || { test_fail; return; }

    test_pass
}

test_tc11_mkcert_caroot_replacement() {
    test_start "TC11: mkcert CAROOT path replacement"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "james" "$output_file" || local exit_code=$?

    assert_exit_code 0 "${exit_code:-0}" "Should succeed" || { test_fail; return; }

    local content=$(cat "$output_file")
    assert_contains "$content" "NODE_EXTRA_CA_CERTS=" "Should contain NODE_EXTRA_CA_CERTS" || { test_fail; return; }
    assert_not_contains "$content" "YOUR_USERNAME" "Should NOT contain YOUR_USERNAME placeholder" || { test_fail; return; }
    assert_contains "$content" "/rootCA.pem" "Should contain rootCA.pem path" || { test_fail; return; }

    test_pass
}

test_tc12_port_math_verification() {
    test_start "TC12: Port math verification"

    create_valid_config

    # Test james agent (convexCloudPort: 3230)
    local output_file="${TEST_DIR}/test-james.env"
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "james" "$output_file"

    local content=$(cat "$output_file")
    assert_contains "$content" "CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3230" "James should use port 3230" || { test_fail; return; }

    # Test default agent (convexCloudPort: 3211)
    local output_file2="${TEST_DIR}/test-default.env"
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "default" "$output_file2"

    local content2=$(cat "$output_file2")
    assert_contains "$content2" "CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3211" "Default should use port 3211" || { test_fail; return; }

    test_pass
}

test_tc13_agent_name_substitution() {
    test_start "TC13: Agent name substitution (literal values)"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "james" "$output_file"

    local content=$(cat "$output_file")

    # Values should be literal strings with agent name embedded (NOT ${AGENT_NAME})
    assert_contains "$content" "NEXT_PUBLIC_CONVEX_URL=https://james.convex.cloud.loc" "Should have literal agent name in Convex URL" || { test_fail; return; }
    assert_contains "$content" "SITE_URL=https://james.loc" "Should have literal agent name in site URL" || { test_fail; return; }
    assert_contains "$content" "MAILPIT_API_URL=https://james.mailpit.loc/api/v1" "Should have literal agent name in Mailpit URL" || { test_fail; return; }

    # Should NOT use variable substitution like ${AGENT_NAME}
    if echo "$content" | grep -q 'NEXT_PUBLIC_CONVEX_URL=https://${AGENT_NAME}'; then
        echo -e "${RED}  FAIL${NC}: Should use literal agent name, not \${AGENT_NAME} variable"
        test_fail
        return
    fi

    test_pass
}

test_tc14_novu_urls_shared() {
    test_start "TC14: Novu URLs (shared service)"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "james" "$output_file"

    local content=$(cat "$output_file")

    # Novu URLs should NOT include agent name (shared service)
    assert_contains "$content" "NOVU_API_URL=https://api.novu.loc" "Should have shared Novu API URL" || { test_fail; return; }
    assert_contains "$content" "NEXT_PUBLIC_NOVU_API_URL=https://api.novu.loc" "Should have shared public Novu API URL" || { test_fail; return; }
    assert_contains "$content" "NEXT_PUBLIC_NOVU_SOCKET_URL=wss://ws.novu.loc" "Should have shared Novu WebSocket URL" || { test_fail; return; }

    # Should NOT contain agent-specific Novu URLs
    assert_not_contains "$content" "james.novu.loc" "Should NOT have agent-specific Novu URL" || { test_fail; return; }

    test_pass
}

test_tc15_idempotency() {
    test_start "TC15: Idempotency test"

    create_valid_config

    local output_file1="${TEST_DIR}/test1.env"
    local output_file2="${TEST_DIR}/test2.env"

    # Generate twice
    source scripts/lib/generate-env-nextjs.sh 2>&1
    generate_env_nextjs "james" "$output_file1" || local exit1=$?
    sleep 1  # Ensure timestamp difference
    generate_env_nextjs "james" "$output_file2" || local exit2=$?

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

test_tc16_empty_placeholder_fields() {
    test_start "TC16: Empty/placeholder fields for user secrets"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "james" "$output_file"

    local content=$(cat "$output_file")

    # These fields should be empty (user must provide)
    assert_contains "$content" "INTERNAL_API_KEY=" "Should have empty INTERNAL_API_KEY" || { test_fail; return; }
    assert_contains "$content" "NOVU_SECRET_KEY=" "Should have empty NOVU_SECRET_KEY" || { test_fail; return; }
    assert_contains "$content" "NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=" "Should have empty Novu app ID" || { test_fail; return; }

    test_pass
}

test_tc17_default_email_values() {
    test_start "TC17: Default email values"

    create_valid_config

    local output_file="${TEST_DIR}/test.env"
    source scripts/lib/generate-env-nextjs.sh 2>&1 && generate_env_nextjs "james" "$output_file"

    local content=$(cat "$output_file")

    # Should contain default email addresses
    assert_contains "$content" 'EMAIL_FROM_AUTH="Artifact Review <auth@artifactreview-early.xyz>"' "Should have default auth email" || { test_fail; return; }
    assert_contains "$content" 'EMAIL_FROM_NOTIFICATIONS="Artifact Review <notify@artifactreview-early.xyz>"' "Should have default notification email" || { test_fail; return; }

    test_pass
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    echo "======================================================================"
    echo "Unit Tests: scripts/lib/generate-env-nextjs.sh"
    echo "======================================================================"

    setup

    test_tc01_missing_jq
    test_tc02_missing_mkcert
    test_tc03_agent_not_found
    test_tc04_missing_port_key
    test_tc05_generate_valid_agent
    test_tc06_generate_default_agent
    test_tc07_overwrite_existing
    test_tc08_directory_not_exists
    test_tc09_header_comment
    test_tc10_all_sections
    test_tc11_mkcert_caroot_replacement
    test_tc12_port_math_verification
    test_tc13_agent_name_substitution
    test_tc14_novu_urls_shared
    test_tc15_idempotency
    test_tc16_empty_placeholder_fields
    test_tc17_default_email_values

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
