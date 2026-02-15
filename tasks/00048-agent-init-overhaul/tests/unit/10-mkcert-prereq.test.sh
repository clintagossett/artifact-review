#!/usr/bin/env bash
#
# Unit Tests for mkcert Prerequisite Check in scripts/agent-init.sh
#
# Test Framework: Plain bash (no external dependencies)
# Run: ./tasks/00048-agent-init-overhaul/tests/unit/10-mkcert-prereq.test.sh
#
# TDD Phase: RED - These tests define the contract and MUST fail initially

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
BLUE='\033[0;34m'
NC='\033[0m' # No Color

setup() {
    # Create temporary test directory
    TEST_DIR=$(mktemp -d)

    # Save original directory
    ORIG_DIR=$(pwd)

    # Create test project structure
    TEST_PROJECT_DIR="${TEST_DIR}/artifact-review-test"
    mkdir -p "${TEST_PROJECT_DIR}/scripts"
    mkdir -p "${TEST_PROJECT_DIR}/app"

    # Create orchestrator dir with minimal config
    TEST_ORCHESTRATOR_DIR="${TEST_DIR}/orchestrator-artifact-review"
    mkdir -p "$TEST_ORCHESTRATOR_DIR"

    cat > "$TEST_ORCHESTRATOR_DIR/config.json" << 'EOF'
{
  "test-agent": {
    "appPort": 4000,
    "convexCloudPort": 4211,
    "convexSitePort": 4210,
    "subnet": "172.21"
  }
}
EOF

    # Create a mock bin directory for PATH manipulation
    MOCK_BIN_DIR="${TEST_DIR}/bin"
    mkdir -p "$MOCK_BIN_DIR"

    # Create system bin directory with essential commands
    # This prevents fallback to real system PATH
    SYSTEM_BIN_DIR="${TEST_DIR}/system-bin"
    mkdir -p "$SYSTEM_BIN_DIR"

    # Link essential system commands that scripts need
    for cmd in bash sh cat mkdir rm cp sed grep head tail awk date dirname basename pwd cd ls chmod source; do
        if command -v "$cmd" &> /dev/null; then
            ln -s "$(command -v $cmd)" "${SYSTEM_BIN_DIR}/$cmd" 2>/dev/null || true
        fi
    done

    # Build isolated PATH: mock bin first, then system bin (NO real system PATH)
    ISOLATED_PATH="${MOCK_BIN_DIR}:${SYSTEM_BIN_DIR}"

    # Copy actual agent-init.sh if it exists
    if [ -f "${ORIG_DIR}/scripts/agent-init.sh" ]; then
        cp "${ORIG_DIR}/scripts/agent-init.sh" "${TEST_PROJECT_DIR}/scripts/"
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
        echo "    Actual output:"
        echo "$haystack" | head -20
        return 1
    fi
}

assert_not_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-}"

    if ! echo "$haystack" | grep -qF "$needle"; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected to NOT contain: '$needle'"
        echo "    Actual output:"
        echo "$haystack" | head -20
        return 1
    fi
}

assert_matches_regex() {
    local haystack="$1"
    local pattern="$2"
    local message="${3:-}"

    if echo "$haystack" | grep -qE "$pattern"; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected to match regex: '$pattern'"
        echo "    Actual output:"
        echo "$haystack" | head -20
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
# Mock Commands
# ============================================================================

create_mock_mkcert() {
    local version="${1:-v1.4.4}"
    cat > "${MOCK_BIN_DIR}/mkcert" << EOF
#!/bin/bash
if [[ "\$1" == "-CAROOT" ]]; then
    echo "${TEST_DIR}/.local/share/mkcert"
elif [[ "\$1" == "--version" ]] || [[ "\$1" == "-version" ]]; then
    echo "${version}"
else
    echo "mkcert: command executed"
fi
EOF
    chmod +x "${MOCK_BIN_DIR}/mkcert"
}

create_non_executable_mkcert() {
    echo "#!/bin/bash" > "${MOCK_BIN_DIR}/mkcert"
    echo 'echo "mkcert"' >> "${MOCK_BIN_DIR}/mkcert"
    chmod -x "${MOCK_BIN_DIR}/mkcert"
}

remove_mkcert() {
    # Simply remove from mock bin - rely on isolated PATH in test execution
    rm -f "${MOCK_BIN_DIR}/mkcert"
}

create_all_prerequisites() {
    # Create minimal mocks for all other prerequisites
    for cmd in node npm docker tmux jq; do
        cat > "${MOCK_BIN_DIR}/${cmd}" << 'EOF'
#!/bin/bash
echo "v1.0.0"
exit 0
EOF
        chmod +x "${MOCK_BIN_DIR}/${cmd}"
    done

    # Special mock for docker info
    cat > "${MOCK_BIN_DIR}/docker" << 'EOF'
#!/bin/bash
if [[ "$1" == "info" ]]; then
    echo "Docker running"
    exit 0
else
    echo "v20.10.0"
    exit 0
fi
EOF
    chmod +x "${MOCK_BIN_DIR}/docker"
}

# ============================================================================
# Test Cases
# ============================================================================

test_tc01_mkcert_installed_and_accessible() {
    test_start "TC01: mkcert is installed and accessible"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist"
        test_fail
        return
    fi

    # Create all prerequisite mocks including mkcert
    create_all_prerequisites
    create_mock_mkcert "v1.4.4"

    # Run with mocked PATH
    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh --check 2>&1)
    exit_code=$?
    set -e

    # Should show success for mkcert
    assert_exit_code 0 "$exit_code" "Should succeed when all prereqs present" && \
    assert_contains "$output" "mkcert" "Should mention mkcert" && \
    (assert_contains "$output" "✅" "Should show success indicator" || \
     assert_contains "$output" "✓" "Should show checkmark") && \
    test_pass || test_fail
}

test_tc02_mkcert_not_in_path() {
    test_start "TC02: mkcert is not in PATH"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Create other prerequisites but NOT mkcert
    create_all_prerequisites
    remove_mkcert

    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh 2>&1)
    exit_code=$?
    set -e

    # Should fail and show error
    assert_exit_code 1 "$exit_code" "Should exit with code 1 when mkcert missing" && \
    assert_contains "$output" "mkcert" "Should mention mkcert" && \
    (assert_contains "$output" "❌" "Should show error indicator" || \
     assert_contains "$output" "not found" "Should say not found") && \
    (assert_contains "$output" "brew install mkcert" "Should show macOS install" || \
     assert_contains "$output" "apt install mkcert" "Should show Linux install" || \
     assert_contains "$output" "install" "Should mention installation") && \
    test_pass || test_fail
}

test_tc03_mkcert_not_executable() {
    test_start "TC03: mkcert exists but not executable"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    create_all_prerequisites
    create_non_executable_mkcert

    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh 2>&1)
    exit_code=$?
    set -e

    # Should treat as missing (command -v won't find non-executable)
    assert_exit_code 1 "$exit_code" "Should fail when mkcert not executable" && \
    (assert_contains "$output" "mkcert" "Should mention mkcert" || \
     assert_contains "$output" "not found" "Should indicate missing") && \
    test_pass || test_fail
}

test_tc04_all_prerequisites_present() {
    test_start "TC04: All prerequisites including mkcert are present"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Create ALL prerequisites including mkcert
    create_all_prerequisites
    create_mock_mkcert

    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh --check 2>&1)
    exit_code=$?
    set -e

    # Should succeed and show all checks passed
    assert_exit_code 0 "$exit_code" "Should succeed with all prereqs" && \
    assert_contains "$output" "node" "Should check node" && \
    assert_contains "$output" "npm" "Should check npm" && \
    assert_contains "$output" "docker" "Should check docker" && \
    assert_contains "$output" "tmux" "Should check tmux" && \
    assert_contains "$output" "jq" "Should check jq" && \
    assert_contains "$output" "mkcert" "Should check mkcert" && \
    test_pass || test_fail
}

test_tc05_only_mkcert_missing() {
    test_start "TC05: Only mkcert is missing (others present)"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Create all except mkcert
    create_all_prerequisites
    remove_mkcert

    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh 2>&1)
    exit_code=$?
    set -e

    # Should fail with exit code 1
    assert_exit_code 1 "$exit_code" "Should exit 1 when only mkcert missing" && \
    assert_contains "$output" "mkcert" "Should show mkcert error" && \
    (assert_contains "$output" "Missing prerequisites" "Should show prereq summary" || \
     assert_contains "$output" "not found" "Should indicate missing") && \
    test_pass || test_fail
}

test_tc06_multiple_prerequisites_missing() {
    test_start "TC06: mkcert and other tools are missing"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Create only some prerequisites
    cat > "${MOCK_BIN_DIR}/node" << 'EOF'
#!/bin/bash
echo "v18.0.0"
EOF
    chmod +x "${MOCK_BIN_DIR}/node"

    # Missing: npm, docker, tmux, jq, mkcert

    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh 2>&1)
    exit_code=$?
    set -e

    # Should fail and list all missing including mkcert
    assert_exit_code 1 "$exit_code" "Should exit 1 with multiple missing" && \
    assert_contains "$output" "mkcert" "Should show mkcert missing" && \
    (assert_contains "$output" "Missing" "Should show missing summary" || \
     assert_contains "$output" "not found" "Should indicate missing tools") && \
    test_pass || test_fail
}

test_tc07_mkcert_version_displayed() {
    test_start "TC07: mkcert version is displayed when present"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    create_all_prerequisites
    create_mock_mkcert "v1.4.4"

    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh --check 2>&1)
    exit_code=$?
    set -e

    # Should display version information (similar to other tools)
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$output" "mkcert" "Should mention mkcert" && \
    # Version might be shown in different formats
    (assert_contains "$output" "1.4" "Should show version" || \
     assert_contains "$output" "v1" "Should show version prefix" || \
     assert_matches_regex "$output" "mkcert.*v[0-9]" "Should show version near mkcert") && \
    test_pass || test_fail
}

test_tc08_check_caroot_optional() {
    test_start "TC08: CAROOT path check (optional feature)"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${YELLOW}SKIP${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        TESTS_RUN=$((TESTS_RUN - 1))
        return
    fi

    create_all_prerequisites
    create_mock_mkcert

    # Create CAROOT directory with rootCA.pem
    mkdir -p "${TEST_DIR}/.local/share/mkcert"
    touch "${TEST_DIR}/.local/share/mkcert/rootCA.pem"

    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh --check 2>&1)
    exit_code=$?
    set -e

    # This is optional - if implemented, should verify CAROOT
    # If not implemented, that's fine too
    if echo "$output" | grep -qi "CAROOT\|root.*CA"; then
        # Feature is implemented
        assert_exit_code 0 "$exit_code" "Should succeed with valid CAROOT" && \
        assert_contains "$output" "mkcert" "Should check mkcert" && \
        test_pass
    else
        # Feature not implemented - this is acceptable
        echo -e " ${YELLOW}SKIP${NC} (optional CAROOT check not implemented)"
        TESTS_RUN=$((TESTS_RUN - 1))
    fi
}

test_tc09_error_message_contains_install_instructions() {
    test_start "TC09: Error message contains installation instructions"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    create_all_prerequisites
    remove_mkcert

    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh 2>&1)
    exit_code=$?
    set -e

    # Should provide helpful installation guidance
    assert_exit_code 1 "$exit_code" "Should fail when missing" && \
    (assert_contains "$output" "brew install mkcert" "Should show macOS install" || \
     assert_contains "$output" "apt install mkcert" "Should show Linux install" || \
     assert_contains "$output" "github.com/FiloSottile/mkcert" "Should link to repo" || \
     assert_matches_regex "$output" "install.*mkcert" "Should mention installation") && \
    test_pass || test_fail
}

test_tc10_prerequisite_check_format_consistency() {
    test_start "TC10: mkcert check follows same format as other prereqs"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    create_all_prerequisites
    create_mock_mkcert

    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh --check 2>&1)
    exit_code=$?
    set -e

    # Should follow consistent format:
    # "✅ mkcert: v1.4.4" or similar pattern matching node/npm/etc
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    (
        # Check for consistent format with other tools
        # Extract the mkcert line and verify it matches pattern
        mkcert_line=$(echo "$output" | grep -i "mkcert" || echo "")
        if [ -n "$mkcert_line" ]; then
            # Should have success indicator and tool name
            echo "$mkcert_line" | grep -qE "(✅|✓|success)" && return 0
        fi
        return 1
    ) && \
    test_pass || test_fail
}

test_tc11_stops_before_env_generation_when_missing() {
    test_start "TC11: Script stops before env generation when mkcert missing"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    create_all_prerequisites
    remove_mkcert

    # Try to run full init (not --check)
    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh 2>&1)
    exit_code=$?
    set -e

    # Should exit early, NOT generate env files
    assert_exit_code 1 "$exit_code" "Should exit 1 before continuing" && \
    assert_not_contains "$output" "Environment Files" "Should not reach env file step" && \
    assert_not_contains "$output" "Generated .env" "Should not generate files" && \
    [ ! -f ".env.docker.local" ] && \
    test_pass || test_fail
}

test_tc12_check_mode_shows_mkcert_status() {
    test_start "TC12: --check mode shows mkcert status"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    create_all_prerequisites
    create_mock_mkcert

    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh --check 2>&1)
    exit_code=$?
    set -e

    # --check mode should include mkcert in status report
    assert_exit_code 0 "$exit_code" "Should succeed in check mode" && \
    assert_contains "$output" "mkcert" "Should show mkcert status" && \
    (assert_contains "$output" "Checking" "Should be in check phase" || \
     assert_contains "$output" "Status" "Should show status") && \
    test_pass || test_fail
}

test_tc13_integration_with_existing_checks() {
    test_start "TC13: mkcert check integrates with existing prerequisite flow"

    if [ ! -f "scripts/agent-init.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/agent-init.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    create_all_prerequisites
    create_mock_mkcert

    set +e
    output=$(PATH="${ISOLATED_PATH}" bash scripts/agent-init.sh --check 2>&1)
    exit_code=$?
    set -e

    # Should be part of "Checking Prerequisites" section
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$output" "Prerequisites" "Should be in prerequisites section" && \
    assert_contains "$output" "mkcert" "Should check mkcert" && \
    # Should appear alongside other tools (verify all are checked)
    assert_contains "$output" "node" "Should check node too" && \
    assert_contains "$output" "docker" "Should check docker too" && \
    test_pass || test_fail
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    echo "============================================================================"
    echo "mkcert Prerequisite Check Unit Tests (TDD - RED Phase)"
    echo "============================================================================"
    echo ""
    echo "These tests define the contract for mkcert prerequisite checking."
    echo "They MUST fail initially (RED phase of TDD)."
    echo ""

    # Run each test in isolation
    for test_func in $(declare -F | grep "test_tc" | awk '{print $3}' | sort); do
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
        echo ""
        echo "Note: In TDD RED phase, we expect these to fail initially."
        echo "This means the feature hasn't been implemented yet."
        exit 0
    else
        echo -e "${RED}Tests failed (expected in RED phase)${NC}"
        echo ""
        echo "Next step: Implement the feature to make these tests pass (GREEN phase)"
        exit 1
    fi
}

# ============================================================================
# Main
# ============================================================================

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_all_tests
fi
