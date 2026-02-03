Perfect! Now I have enough context to write the failing tests for subtask 8. Let me create the test specification and test file.

<artifact name="test-spec.md" type="application/vnd.ant.code" language="markdown" title="Test Specification for Subtask 8: Add RESEND_API_KEY">
# Test Specification: Subtask 8 - Add RESEND_API_KEY to setup-convex-env.sh

## Objective
Ensure the Resend API key is properly read from `app/.env.nextjs.local` and synced to Convex environment variables using the `setup-convex-env.sh` script.

## Background
Currently, `setup-convex-env.sh` has a `PASSTHROUGH_VARS` array that defines environment variables to read from `.env.nextjs.local` and sync to Convex. The Resend API key needs to be added to this mechanism.

## Acceptance Criteria

### AC1: RESEND_API_KEY in PASSTHROUGH_VARS
- `RESEND_API_KEY` should be added to the `PASSTHROUGH_VARS` array
- This makes it automatically handled by the existing passthrough mechanism

### AC2: Read from .env.nextjs.local
- Script should read `RESEND_API_KEY` from `app/.env.nextjs.local`
- If the file doesn't exist, fallback to `app/.env.local`
- If the variable is not found in the env file, skip it with a warning

### AC3: Set in Convex
- When found, the value should be set in Convex using `npx convex env set`
- Should use the `--` separator to prevent values with special characters from being parsed as flags
- Should use the `--env-file` parameter to provide admin key

### AC4: Check Mode Shows Status
- `./scripts/setup-convex-env.sh --check` should display `RESEND_API_KEY` status
- Should show "(not set)" if not present in Convex
- Should show truncated value if present (first 47 chars + "...")

### AC5: Idempotency
- Running the script multiple times with the same value should not fail
- Setting the same value again should succeed without errors

## Test Cases

### TC01: RESEND_API_KEY not in PASSTHROUGH_VARS (RED phase)
**Given:** The script has not been modified yet
**When:** We check the PASSTHROUGH_VARS array
**Then:** RESEND_API_KEY should NOT be present (this will fail initially)

### TC02: Read RESEND_API_KEY from .env.nextjs.local
**Given:** `.env.nextjs.local` contains `RESEND_API_KEY=re_test_key_12345`
**When:** Script runs in setup mode
**Then:** Script should set `RESEND_API_KEY=re_test_key_12345` in Convex

### TC03: Handle missing RESEND_API_KEY gracefully
**Given:** `.env.nextjs.local` does NOT contain RESEND_API_KEY
**When:** Script runs in setup mode
**Then:** Script should skip RESEND_API_KEY with a warning message
**And:** Script should NOT fail (exit code 0)

### TC04: Check mode displays RESEND_API_KEY
**Given:** RESEND_API_KEY is set in Convex to `re_test_key_12345`
**When:** Script runs with `--check` flag
**Then:** Output should contain "RESEND_API_KEY: re_test_key_12345"

### TC05: Check mode shows "not set" when missing
**Given:** RESEND_API_KEY is NOT set in Convex
**When:** Script runs with `--check` flag
**Then:** Output should contain "RESEND_API_KEY: (not set)"

### TC06: Handle special characters in API key
**Given:** `.env.nextjs.local` contains `RESEND_API_KEY=re_test-key_with/special+chars`
**When:** Script runs in setup mode
**Then:** Script should correctly set the value in Convex without errors
**And:** The value should be preserved exactly as provided

### TC07: Idempotency - setting same value twice
**Given:** RESEND_API_KEY is already set in Convex to `re_test_key_12345`
**When:** Script runs again with the same value
**Then:** Script should succeed (exit code 0)
**And:** No errors should be reported

### TC08: Truncate long values in check mode
**Given:** RESEND_API_KEY is set to a value longer than 50 characters
**When:** Script runs with `--check` flag
**Then:** Output should show first 47 characters followed by "..."

## Exit Codes
All tests should verify appropriate exit codes:
- 0: Success
- 1: Missing prerequisites (jq, npx, openssl)
- 2: Docker container not running

## Test Isolation
Tests should:
- Create temporary test environment
- Mock the Convex CLI (`npx convex env get/set`)
- Mock environment files
- Not touch real Convex deployment
- Clean up after execution

## Implementation Notes
- The actual implementation should only modify the `PASSTHROUGH_VARS` array
- No other changes to `setup-convex-env.sh` should be needed
- The existing passthrough mechanism handles all the logic

## Expected File Changes
1. `scripts/setup-convex-env.sh` - Add `RESEND_API_KEY` to `PASSTHROUGH_VARS` array
2. `tasks/00048-agent-init-overhaul/tests/unit/08-resend-api-key.test.sh` - New test file (this file)
</artifact>

<artifact name="tests/unit/08-resend-api-key.test.sh" type="application/vnd.ant.code" language="bash" title="Unit Tests for RESEND_API_KEY in setup-convex-env.sh">
#!/usr/bin/env bash
#
# Unit Tests for RESEND_API_KEY in scripts/setup-convex-env.sh
#
# Test Framework: Plain bash (no external dependencies)
# Run: ./tasks/00048-agent-init-overhaul/tests/unit/08-resend-api-key.test.sh
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
    
    # Save original directory
    ORIG_DIR=$(pwd)
    
    # Create test project structure
    TEST_PROJECT_DIR="${TEST_DIR}/artifact-review-james"
    mkdir -p "${TEST_PROJECT_DIR}/scripts"
    mkdir -p "${TEST_PROJECT_DIR}/app"
    
    # Create mock orchestrator directory for agent config
    MOCK_ORCHESTRATOR_DIR="${TEST_DIR}/artifact-review-orchestrator"
    mkdir -p "${MOCK_ORCHESTRATOR_DIR}"
    
    # Create basic config for AGENT_NAME
    cat > "${TEST_PROJECT_DIR}/.env.docker.local" << 'EOF'
AGENT_NAME=test-agent
EOF
    
    # Copy the actual setup-convex-env.sh if it exists
    if [ -f "${ORIG_DIR}/scripts/setup-convex-env.sh" ]; then
        cp "${ORIG_DIR}/scripts/setup-convex-env.sh" "${TEST_PROJECT_DIR}/scripts/"
    fi
    
    # Create mock npx/convex commands
    mkdir -p "${TEST_DIR}/bin"
    create_mock_convex
    
    # Add mock bin to PATH
    export PATH="${TEST_DIR}/bin:$PATH"
    
    cd "${TEST_PROJECT_DIR}"
}

teardown() {
    cd "${ORIG_DIR}"
    rm -rf "${TEST_DIR}"
}

# Create mock convex CLI for testing
create_mock_convex() {
    # Create a mock npx that intercepts convex commands
    cat > "${TEST_DIR}/bin/npx" << 'EOF'
#!/bin/bash
# Mock npx for testing

if [ "$1" = "convex" ]; then
    shift
    # Call our mock convex
    exec "$(dirname "$0")/convex" "$@"
else
    # Pass through to real npx
    exec /usr/bin/env npx "$@"
fi
EOF
    chmod +x "${TEST_DIR}/bin/npx"
    
    # Create mock convex CLI
    cat > "${TEST_DIR}/bin/convex" << 'EOF'
#!/bin/bash
# Mock convex CLI for testing

MOCK_ENV_FILE="${MOCK_ENV_FILE:-/tmp/mock-convex-env}"
mkdir -p "$(dirname "$MOCK_ENV_FILE")"
touch "$MOCK_ENV_FILE"

case "$1" in
    env)
        case "$2" in
            get)
                # Get environment variable
                var_name="$3"
                if [ -f "$MOCK_ENV_FILE" ]; then
                    value=$(grep "^${var_name}=" "$MOCK_ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
                    if [ -n "$value" ]; then
                        echo "$value"
                        exit 0
                    fi
                fi
                exit 1
                ;;
            set)
                # Set environment variable
                # Parse flags and arguments
                env_file_arg=""
                var_name=""
                var_value=""
                skip_next=false
                
                shift 2  # Skip 'env set'
                
                for arg in "$@"; do
                    if [ "$skip_next" = true ]; then
                        skip_next=false
                        continue
                    fi
                    
                    if [ "$arg" = "--env-file" ]; then
                        skip_next=true
                        continue
                    elif [ "$arg" = "--" ]; then
                        continue
                    elif [ -z "$var_name" ]; then
                        var_name="$arg"
                    else
                        var_value="$arg"
                        break
                    fi
                done
                
                if [ -n "$var_name" ]; then
                    # Remove existing entry if present
                    if [ -f "$MOCK_ENV_FILE" ]; then
                        grep -v "^${var_name}=" "$MOCK_ENV_FILE" > "${MOCK_ENV_FILE}.tmp" 2>/dev/null || true
                        mv "${MOCK_ENV_FILE}.tmp" "$MOCK_ENV_FILE"
                    fi
                    # Add new entry
                    echo "${var_name}=${var_value}" >> "$MOCK_ENV_FILE"
                fi
                exit 0
                ;;
        esac
        ;;
esac

exit 0
EOF
    chmod +x "${TEST_DIR}/bin/convex"
    
    # Set mock env file location
    export MOCK_ENV_FILE="${TEST_DIR}/mock-convex-env"
}

# Mock Docker for container checks
create_mock_docker() {
    cat > "${TEST_DIR}/bin/docker" << 'EOF'
#!/bin/bash
# Mock docker for testing

case "$1" in
    ps)
        # Return test-agent-backend as running
        echo "test-agent-backend"
        exit 0
        ;;
    exec)
        # Mock admin key generation
        if [[ "$*" == *"generate_admin_key"* ]]; then
            echo "Admin key:"
            echo "test_admin_key_12345"
            exit 0
        fi
        ;;
esac

exit 0
EOF
    chmod +x "${TEST_DIR}/bin/docker"
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
# Test Cases
# ============================================================================

test_tc01_resend_in_passthrough_vars() {
    test_start "TC01: RESEND_API_KEY in PASSTHROUGH_VARS array"
    
    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi
    
    # Check if RESEND_API_KEY is in PASSTHROUGH_VARS array
    local script_content=$(cat scripts/setup-convex-env.sh)
    
    # Look for PASSTHROUGH_VARS declaration and check for RESEND_API_KEY
    if echo "$script_content" | grep -A 5 'PASSTHROUGH_VARS=' | grep -q 'RESEND_API_KEY'; then
        test_pass
    else
        echo -e " ${RED}FAIL${NC}: RESEND_API_KEY not found in PASSTHROUGH_VARS array (expected - RED phase)"
        echo "    This test should FAIL initially - this is the RED phase of TDD"
        test_fail
    fi
}

test_tc02_read_from_env_nextjs() {
    test_start "TC02: Read RESEND_API_KEY from .env.nextjs.local"
    
    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi
    
    # Create .env.nextjs.local with RESEND_API_KEY
    cat > "app/.env.nextjs.local" << 'EOF'
RESEND_API_KEY=re_test_key_12345
NOVU_SECRET_KEY=novu_secret_test
EOF
    
    # Create mock docker
    create_mock_docker
    
    # Run setup script (this will fail because RESEND_API_KEY not in PASSTHROUGH_VARS yet)
    set +e
    local output
    output=$(bash scripts/setup-convex-env.sh 2>&1)
    local exit_code=$?
    set -e
    
    # Check if RESEND_API_KEY was set in mock Convex
    local convex_value
    convex_value=$(grep "^RESEND_API_KEY=" "$MOCK_ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    
    if [ "$convex_value" = "re_test_key_12345" ]; then
        test_pass
    else
        echo -e " ${RED}FAIL${NC}: RESEND_API_KEY not set in Convex (expected - RED phase)"
        echo "    Expected: 're_test_key_12345'"
        echo "    Actual: '$convex_value'"
        test_fail
    fi
}

test_tc03_handle_missing_gracefully() {
    test_start "TC03: Handle missing RESEND_API_KEY gracefully"
    
    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi
    
    # Create .env.nextjs.local WITHOUT RESEND_API_KEY
    cat > "app/.env.nextjs.local" << 'EOF'
NOVU_SECRET_KEY=novu_secret_test
INTERNAL_API_KEY=test_internal_key
EOF
    
    # Create mock docker
    create_mock_docker
    
    # Run setup script
    set +e
    local output
    output=$(bash scripts/setup-convex-env.sh 2>&1)
    local exit_code=$?
    set -e
    
    # Should succeed even without RESEND_API_KEY
    assert_exit_code 0 "$exit_code" "Should succeed when RESEND_API_KEY missing" || { test_fail; return; }
    
    # Should show warning about skipping
    assert_contains "$output" "Skipping" "Should show skip message" || { test_fail; return; }
    
    test_pass
}

test_tc04_check_mode_displays_key() {
    test_start "TC04: Check mode displays RESEND_API_KEY"
    
    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi
    
    # Pre-populate mock Convex env with RESEND_API_KEY
    echo "RESEND_API_KEY=re_test_key_12345" >> "$MOCK_ENV_FILE"
    
    # Create mock docker
    create_mock_docker
    
    # Run in check mode
    set +e
    local output
    output=$(bash scripts/setup-convex-env.sh --check 2>&1)
    local exit_code=$?
    set -e
    
    # Should display RESEND_API_KEY with its value
    assert_contains "$output" "RESEND_API_KEY" "Should show RESEND_API_KEY" || { test_fail; return; }
    assert_contains "$output" "re_test_key_12345" "Should show key value" || { test_fail; return; }
    
    test_pass
}

test_tc05_check_mode_not_set() {
    test_start "TC05: Check mode shows 'not set' when missing"
    
    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi
    
    # Don't set RESEND_API_KEY in mock Convex
    # (mock env file is empty by default)
    
    # Create mock docker
    create_mock_docker
    
    # Run in check mode
    set +e
    local output
    output=$(bash scripts/setup-convex-env.sh --check 2>&1)
    local exit_code=$?
    set -e
    
    # Should display RESEND_API_KEY as not set
    assert_contains "$output" "RESEND_API_KEY" "Should show RESEND_API_KEY" || { test_fail; return; }
    assert_contains "$output" "(not set)" "Should show 'not set' status" || { test_fail; return; }
    
    test_pass
}

test_tc06_special_characters() {
    test_start "TC06: Handle special characters in API key"
    
    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi
    
    # Create .env.nextjs.local with special characters in key
    cat > "app/.env.nextjs.local" << 'EOF'
RESEND_API_KEY=re_test-key_with/special+chars
EOF
    
    # Create mock docker
    create_mock_docker
    
    # Run setup script
    set +e
    local output
    output=$(bash scripts/setup-convex-env.sh 2>&1)
    local exit_code=$?
    set -e
    
    # Check if value was preserved exactly
    local convex_value
    convex_value=$(grep "^RESEND_API_KEY=" "$MOCK_ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    
    assert_equals "re_test-key_with/special+chars" "$convex_value" "Should preserve special characters" || { test_fail; return; }
    
    test_pass
}

test_tc07_idempotency() {
    test_start "TC07: Idempotency - setting same value twice"
    
    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi
    
    # Create .env.nextjs.local
    cat > "app/.env.nextjs.local" << 'EOF'
RESEND_API_KEY=re_test_key_12345
EOF
    
    # Create mock docker
    create_mock_docker
    
    # Run setup script first time
    set +e
    bash scripts/setup-convex-env.sh > /dev/null 2>&1
    local exit_code1=$?
    
    # Run setup script second time
    bash scripts/setup-convex-env.sh > /dev/null 2>&1
    local exit_code2=$?
    set -e
    
    # Both should succeed
    assert_exit_code 0 "$exit_code1" "First run should succeed" || { test_fail; return; }
    assert_exit_code 0 "$exit_code2" "Second run should succeed (idempotent)" || { test_fail; return; }
    
    test_pass
}

test_tc08_truncate_long_values() {
    test_start "TC08: Truncate long values in check mode"
    
    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi
    
    # Create a very long API key (60 characters)
    local long_key="re_very_long_test_key_with_many_characters_to_exceed_limit_12345"
    echo "RESEND_API_KEY=${long_key}" >> "$MOCK_ENV_FILE"
    
    # Create mock docker
    create_mock_docker
    
    # Run in check mode
    set +e
    local output
    output=$(bash scripts/setup-convex-env.sh --check 2>&1)
    local exit_code=$?
    set -e
    
    # Should truncate to 47 chars + "..."
    assert_contains "$output" "RESEND_API_KEY" "Should show RESEND_API_KEY" || { test_fail; return; }
    assert_contains "$output" "..." "Should show truncation ellipsis" || { test_fail; return; }
    
    # Should NOT show the full long value
    assert_not_contains "$output" "$long_key" "Should NOT show full long value" || { test_fail; return; }
    
    test_pass
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    echo "======================================================================"
    echo "Unit Tests: RESEND_API_KEY in scripts/setup-convex-env.sh"
    echo "======================================================================"
    echo ""
    echo "NOTE: These tests are in RED phase - they SHOULD FAIL initially."
    echo "After implementation, all tests should pass (GREEN phase)."
    echo ""
    
    setup
    
    test_tc01_resend_in_passthrough_vars
    test_tc02_read_from_env_nextjs
    test_tc03_handle_missing_gracefully
    test_tc04_check_mode_displays_key
    test_tc05_check_mode_not_set
    test_tc06_special_characters
    test_tc07_idempotency
    test_tc08_truncate_long_values
    
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
    echo ""
    
    if [ $TESTS_FAILED -gt 0 ]; then
        echo -e "${YELLOW}Expected result: Tests FAIL (RED phase)${NC}"
        echo "After implementation, run again to verify GREEN phase."
        exit 1
    else
        echo -e "${GREEN}All tests passed! (GREEN phase)${NC}"
        exit 0
    fi
}

# Run tests if executed directly
if [ "${BASH_SOURCE[0]}" -ef "$0" ]; then
    run_all_tests
fi
</artifact>

I've created comprehensive failing tests for Subtask 8. Here's what I've delivered:

## Test Specification (`test-spec.md`)

Defines the complete acceptance criteria:
- **AC1-AC5**: Clear requirements for RESEND_API_KEY handling
- **8 Test Cases**: Cover all scenarios from basic functionality to edge cases
- **Exit codes**: Document expected error handling
- **Test isolation**: Ensures tests don't affect real environment

## Test File (`tests/unit/08-resend-api-key.test.sh`)

A complete bash test suite following the TDD RED phase:

### Test Coverage

1. **TC01**: Verify RESEND_API_KEY is in PASSTHROUGH_VARS array
2. **TC02**: Read API key from .env.nextjs.local and set in Convex
3. **TC03**: Handle missing API key gracefully (skip with warning)
4. **TC04**: Check mode displays the API key value
5. **TC05**: Check mode shows "(not set)" when missing
6. **TC06**: Handle special characters in API key values
7. **TC07**: Idempotency - running twice doesn't fail
8. **TC08**: Truncate long values in check mode (47 chars + "...")

### Test Framework Features

- **Mock Convex CLI**: Intercepts `npx convex env get/set` commands
- **Mock Docker**: Simulates container for admin key retrieval
- **Isolated environment**: Uses temp directories, no side effects
- **Color-coded output**: Green/Red/Yellow for pass/fail/skip
- **Clear assertions**: Specific error messages on failure

### Key Design Decisions

1. **Follows existing patterns**: Matches the style of `01-parse-config.test.sh` and `03-generate-env-nextjs.test.sh`
2. **Comprehensive mocking**: No dependency on running Docker or Convex services
3. **Expected to FAIL**: Tests are written assuming RESEND_API_KEY is NOT yet in PASSTHROUGH_VARS
4. **Self-documenting**: Clear test names and assertion messages

The tests are ready to run and will FAIL initially (RED phase), which is exactly what we want for TDD. The implementation will be a simple one-line change: adding `"RESEND_API_KEY"` to the `PASSTHROUGH_VARS` array in `scripts/setup-convex-env.sh`.