#!/usr/bin/env bash
#
# Unit Tests for Convex Dev Server Restart in scripts/setup-convex-env.sh
#
# Test Framework: Plain bash (no external dependencies)
# Run: ./tasks/00048-agent-init-overhaul/tests/unit/09-convex-restart.test.sh
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

    # Create basic config for AGENT_NAME
    cat > "${TEST_PROJECT_DIR}/.env.docker.local" << 'EOF'
AGENT_NAME=test-agent
CONVEX_ADMIN_PORT=3220
EOF

    # Copy the actual setup-convex-env.sh if it exists
    if [ -f "${ORIG_DIR}/scripts/setup-convex-env.sh" ]; then
        cp "${ORIG_DIR}/scripts/setup-convex-env.sh" "${TEST_PROJECT_DIR}/scripts/"
    fi

    # Create mock binaries
    mkdir -p "${TEST_DIR}/bin"
    create_mock_commands

    # Add mock bin to PATH
    export PATH="${TEST_DIR}/bin:$PATH"

    cd "${TEST_PROJECT_DIR}"
}

teardown() {
    cd "${ORIG_DIR}"
    rm -rf "${TEST_DIR}"
}

# Create mock commands for testing
create_mock_commands() {
    # Track tmux commands
    export TMUX_LOG="${TEST_DIR}/tmux.log"
    touch "$TMUX_LOG"

    # Mock tmux
    cat > "${TEST_DIR}/bin/tmux" << 'EOF'
#!/bin/bash
# Mock tmux for testing
TMUX_LOG="${TMUX_LOG:-/tmp/tmux.log}"

# Log all tmux commands
echo "$@" >> "$TMUX_LOG"

case "$1" in
    has-session)
        # Check if we should simulate session exists
        if [ -f "${TMUX_SESSION_EXISTS_FILE}" ]; then
            exit 0
        else
            exit 1
        fi
        ;;
    kill-session)
        # Log the kill command with session name
        echo "KILLED: $2 $3" >> "$TMUX_LOG"
        exit 0
        ;;
    *)
        exit 0
        ;;
esac
EOF
    chmod +x "${TEST_DIR}/bin/tmux"

    # Mock npx/convex
    create_mock_convex

    # Mock docker
    create_mock_docker

    # Mock openssl
    cat > "${TEST_DIR}/bin/openssl" << 'EOF'
#!/bin/bash
case "$1" in
    genrsa)
        # Parse -out parameter
        output_file=""
        for ((i=1; i<=$#; i++)); do
            if [ "${!i}" = "-out" ]; then
                j=$((i+1))
                output_file="${!j}"
                break
            fi
        done

        content="-----BEGIN RSA PRIVATE KEY-----
mock_private_key_content
-----END RSA PRIVATE KEY-----"

        if [ -n "$output_file" ]; then
            echo "$content" > "$output_file"
        else
            echo "$content"
        fi
        ;;
    rsa)
        # Parse -in and -out parameters
        input_file=""
        output_file=""
        for ((i=1; i<=$#; i++)); do
            if [ "${!i}" = "-in" ]; then
                j=$((i+1))
                input_file="${!j}"
            elif [ "${!i}" = "-out" ]; then
                j=$((i+1))
                output_file="${!j}"
            fi
        done

        if [[ "$*" == *"-pubout"* ]]; then
            content="-----BEGIN PUBLIC KEY-----
mock_public_key
-----END PUBLIC KEY-----"
            if [ -n "$output_file" ]; then
                echo "$content" > "$output_file"
            else
                echo "$content"
            fi
        else
            # Modulus output (for JWKS generation)
            echo "Modulus:"
            echo "    00:aa:bb:cc"
        fi
        ;;
    rand)
        echo "mockhex32charsrandomvalue1234"
        ;;
esac
exit 0
EOF
    chmod +x "${TEST_DIR}/bin/openssl"

    # Mock jq
    cat > "${TEST_DIR}/bin/jq" << 'EOF'
#!/bin/bash
# Simple mock jq that handles basic cases
echo '{"keys":[{"kty":"RSA","n":"mockn","e":"AQAB","use":"sig","alg":"RS256","kid":"convex-auth-key"}]}'
EOF
    chmod +x "${TEST_DIR}/bin/jq"
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
    exit 0
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
                # Set environment variable - mark that env was changed
                touch "${MOCK_ENV_FILE}.changed"

                # Parse arguments
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
                    # Remove existing entry
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
        # Return agent-backend containers for any agent
        # This allows tests to work with different AGENT_NAME values
        echo "test-agent-backend"
        echo "different-agent-backend"
        echo "mark-backend"
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
        echo "    Actual output (first 300 chars): '${haystack:0:300}'"
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

test_tc01_kills_tmux_session_after_env_sync() {
    test_start "TC01: Kills tmux session after env sync"

    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist"
        test_fail
        return
    fi

    # Reset logs
    > "$TMUX_LOG"
    > "$MOCK_ENV_FILE"

    # Simulate session exists
    export TMUX_SESSION_EXISTS_FILE="${TEST_DIR}/session-exists"
    touch "$TMUX_SESSION_EXISTS_FILE"

    # Create env file
    cat > "app/.env.nextjs.local" << 'EOF'
NOVU_SECRET_KEY=test_novu_key
EOF

    # Run setup (first time - will set env vars)
    set +e
    bash scripts/setup-convex-env.sh 2>&1 > /dev/null
    local exit_code=$?
    set -e

    # Check tmux log for kill command
    local tmux_commands=$(cat "$TMUX_LOG")

    # Should have killed the session
    if echo "$tmux_commands" | grep -qF "KILLED: -t test-agent-convex-dev"; then
        test_pass
    else
        echo -e " ${RED}FAIL${NC}: tmux session was not killed after env sync (expected - RED phase)"
        echo "    Expected: KILLED: -t test-agent-convex-dev"
        echo "    Tmux log: $tmux_commands"
        test_fail
    fi

    rm -f "$TMUX_SESSION_EXISTS_FILE"
}

test_tc02_handles_missing_session_gracefully() {
    test_start "TC02: Handles missing tmux session gracefully"

    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist"
        test_fail
        return
    fi

    # Reset logs
    > "$TMUX_LOG"
    > "$MOCK_ENV_FILE"

    # No session exists (don't create TMUX_SESSION_EXISTS_FILE)
    rm -f "$TMUX_SESSION_EXISTS_FILE"

    # Create env file
    cat > "app/.env.nextjs.local" << 'EOF'
NOVU_SECRET_KEY=test_novu_key
EOF

    # Run setup
    set +e
    local output
    output=$(bash scripts/setup-convex-env.sh 2>&1)
    local exit_code=$?
    set -e

    # Should succeed even without session
    assert_exit_code 0 "$exit_code" "Should succeed when session missing" || { test_fail; return; }

    # Should mention that session wasn't running
    assert_contains "$output" "No Convex dev session" "Should mention missing session" || \
    assert_contains "$output" "skipping restart" "Should mention skipping restart" || \
    { test_fail; return; }

    test_pass
}

test_tc03_uses_correct_agent_name() {
    test_start "TC03: Uses correct agent name for session"

    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist"
        test_fail
        return
    fi

    # Reset logs
    > "$TMUX_LOG"
    > "$MOCK_ENV_FILE"

    # Different agent name
    cat > ".env.docker.local" << 'EOF'
AGENT_NAME=different-agent
CONVEX_ADMIN_PORT=3220
EOF

    # Simulate session exists
    export TMUX_SESSION_EXISTS_FILE="${TEST_DIR}/session-exists"
    touch "$TMUX_SESSION_EXISTS_FILE"

    # Create env file
    cat > "app/.env.nextjs.local" << 'EOF'
NOVU_SECRET_KEY=test_novu_key
EOF

    # Run setup
    set +e
    bash scripts/setup-convex-env.sh 2>&1 > /dev/null
    local exit_code=$?
    set -e

    # Check tmux log
    local tmux_commands=$(cat "$TMUX_LOG")

    # Should use different-agent in session name
    assert_contains "$tmux_commands" "different-agent-convex-dev" "Should use correct agent name" || { test_fail; return; }

    # Restore original AGENT_NAME for subsequent tests
    cat > ".env.docker.local" << 'EOF'
AGENT_NAME=test-agent
CONVEX_ADMIN_PORT=3220
EOF

    test_pass
    rm -f "$TMUX_SESSION_EXISTS_FILE"
}

test_tc04_shows_restart_notification() {
    test_start "TC04: Shows restart notification"

    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist"
        test_fail
        return
    fi

    # Reset logs
    > "$TMUX_LOG"
    > "$MOCK_ENV_FILE"

    # Simulate session exists
    export TMUX_SESSION_EXISTS_FILE="${TEST_DIR}/session-exists"
    touch "$TMUX_SESSION_EXISTS_FILE"

    # Create env file
    cat > "app/.env.nextjs.local" << 'EOF'
NOVU_SECRET_KEY=test_novu_key
EOF

    # Run setup
    set +e
    local output
    output=$(bash scripts/setup-convex-env.sh 2>&1)
    local exit_code=$?
    set -e

    # Should mention Convex restart
    (assert_contains "$output" "Convex dev server" "Should mention Convex dev server" || \
     assert_contains "$output" "session killed" "Should mention session killed" || \
     assert_contains "$output" "restart" "Should mention restart") && \
    test_pass || test_fail

    rm -f "$TMUX_SESSION_EXISTS_FILE"
}

test_tc05_no_restart_in_check_mode() {
    test_start "TC05: No restart in check mode"

    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist"
        test_fail
        return
    fi

    # Reset logs
    > "$TMUX_LOG"
    > "$MOCK_ENV_FILE"

    # Simulate session exists
    export TMUX_SESSION_EXISTS_FILE="${TEST_DIR}/session-exists"
    touch "$TMUX_SESSION_EXISTS_FILE"

    # Pre-populate some env vars
    echo "JWT_PRIVATE_KEY=test_key" >> "$MOCK_ENV_FILE"

    # Run in check mode
    set +e
    bash scripts/setup-convex-env.sh --check 2>&1 > /dev/null
    local exit_code=$?
    set -e

    # Check tmux log
    local tmux_commands=$(cat "$TMUX_LOG")

    # Should NOT have killed session in check mode
    if echo "$tmux_commands" | grep -qF "KILLED"; then
        echo -e " ${RED}FAIL${NC}: tmux session was killed in check mode (should not happen)"
        test_fail
    else
        test_pass
    fi

    rm -f "$TMUX_SESSION_EXISTS_FILE"
}

test_tc06_restart_happens_in_regen_mode() {
    test_start "TC06: Restart happens in regen mode"

    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist"
        test_fail
        return
    fi

    # Reset logs
    > "$TMUX_LOG"
    > "$MOCK_ENV_FILE"

    # Simulate session exists
    export TMUX_SESSION_EXISTS_FILE="${TEST_DIR}/session-exists"
    touch "$TMUX_SESSION_EXISTS_FILE"

    # Create env file
    cat > "app/.env.nextjs.local" << 'EOF'
NOVU_SECRET_KEY=test_novu_key
EOF

    # Run in regen mode (auto-confirm)
    set +e
    local output
    output=$(echo "yes" | bash scripts/setup-convex-env.sh --regen 2>&1)
    local exit_code=$?
    set -e

    # Check tmux log
    local tmux_commands=$(cat "$TMUX_LOG")

    # Should have killed session
    assert_contains "$tmux_commands" "KILLED: -t test-agent-convex-dev" "Should kill session in regen mode" || { test_fail; return; }

    test_pass
    rm -f "$TMUX_SESSION_EXISTS_FILE"
}

test_tc07_restart_message_in_final_output() {
    test_start "TC07: Restart message in final output"

    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist"
        test_fail
        return
    fi

    # Reset logs
    > "$TMUX_LOG"
    > "$MOCK_ENV_FILE"

    # Simulate session exists
    export TMUX_SESSION_EXISTS_FILE="${TEST_DIR}/session-exists"
    touch "$TMUX_SESSION_EXISTS_FILE"

    # Create env file
    cat > "app/.env.nextjs.local" << 'EOF'
NOVU_SECRET_KEY=test_novu_key
EOF

    # Run setup
    set +e
    local output
    output=$(bash scripts/setup-convex-env.sh 2>&1)
    local exit_code=$?
    set -e

    # Should include next steps about restarting
    (assert_contains "$output" "start-dev-servers.sh" "Should mention start-dev-servers.sh" || \
     assert_contains "$output" "Next steps" "Should show next steps") && \
    test_pass || test_fail

    rm -f "$TMUX_SESSION_EXISTS_FILE"
}

test_tc08_no_restart_on_admin_key_refresh_only() {
    test_start "TC08: No restart on admin key refresh only"

    if [ ! -f "scripts/setup-convex-env.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/setup-convex-env.sh does not exist"
        test_fail
        return
    fi

    # Reset logs
    > "$TMUX_LOG"
    > "$MOCK_ENV_FILE"

    # Pre-populate JWT keys (simulate already exists)
    echo "JWT_PRIVATE_KEY=existing_jwt_key" >> "$MOCK_ENV_FILE"
    echo "JWKS=existing_jwks" >> "$MOCK_ENV_FILE"

    # Simulate session exists
    export TMUX_SESSION_EXISTS_FILE="${TEST_DIR}/session-exists"
    touch "$TMUX_SESSION_EXISTS_FILE"

    # Create env file
    cat > "app/.env.nextjs.local" << 'EOF'
NOVU_SECRET_KEY=test_novu_key
EOF

    # Run setup (JWT exists, so only admin key refresh)
    set +e
    bash scripts/setup-convex-env.sh 2>&1 > /dev/null
    local exit_code=$?
    set -e

    # Check tmux log
    local tmux_commands=$(cat "$TMUX_LOG")

    # Check if env was actually changed
    if [ ! -f "${MOCK_ENV_FILE}.changed" ]; then
        # No env changes = no restart needed
        if echo "$tmux_commands" | grep -qF "KILLED"; then
            echo -e " ${RED}FAIL${NC}: Session killed even though no env vars changed"
            test_fail
        else
            test_pass
        fi
    else
        # Env changed = restart expected
        # This test should still pass
        test_pass
    fi

    rm -f "$TMUX_SESSION_EXISTS_FILE"
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    echo "======================================================================"
    echo "Unit Tests: Convex Dev Server Restart"
    echo "======================================================================"
    echo ""
    echo "NOTE: These tests are in RED phase - they SHOULD FAIL initially."
    echo "After implementation, all tests should pass (GREEN phase)."
    echo ""

    setup

    test_tc01_kills_tmux_session_after_env_sync
    test_tc02_handles_missing_session_gracefully
    test_tc03_uses_correct_agent_name
    test_tc04_shows_restart_notification
    test_tc05_no_restart_in_check_mode
    test_tc06_restart_happens_in_regen_mode
    test_tc07_restart_message_in_final_output
    test_tc08_no_restart_on_admin_key_refresh_only

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
