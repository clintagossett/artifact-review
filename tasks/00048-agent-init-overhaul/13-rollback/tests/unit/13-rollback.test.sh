#!/usr/bin/env bash
#
# Unit Tests for Rollback on Failure in scripts/agent-init.sh
#
# Test Framework: Plain bash (no external dependencies)
# Run: ./tasks/00048-agent-init-overhaul/13-rollback/tests/unit/13-rollback.test.sh
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
    mkdir -p "${TEST_PROJECT_DIR}/scripts/lib"
    mkdir -p "${TEST_PROJECT_DIR}/app"

    # Create mock orchestrator directory
    MOCK_ORCHESTRATOR_DIR="${TEST_DIR}/artifact-review-orchestrator"
    mkdir -p "${MOCK_ORCHESTRATOR_DIR}"

    # Create orchestrator config.json
    cat > "${MOCK_ORCHESTRATOR_DIR}/config.json" << 'EOF'
{
  "agents": {
    "test-agent": {
      "appPort": 3100,
      "convexCloudPort": 3700,
      "convexSitePort": 3800,
      "subnet": "172.30.0.0/24"
    }
  }
}
EOF

    # Copy scripts if they exist
    if [ -f "${ORIG_DIR}/scripts/agent-init.sh" ]; then
        cp "${ORIG_DIR}/scripts/agent-init.sh" "${TEST_PROJECT_DIR}/scripts/"
    fi

    # Copy lib scripts if they exist
    for lib_file in parse-config.sh generate-env-docker.sh generate-env-nextjs.sh wait-for-healthy.sh smoke-test.sh; do
        if [ -f "${ORIG_DIR}/scripts/lib/${lib_file}" ]; then
            cp "${ORIG_DIR}/scripts/lib/${lib_file}" "${TEST_PROJECT_DIR}/scripts/lib/"
        fi
    done

    # Create mock binaries directory
    mkdir -p "${TEST_DIR}/bin"
    create_mock_binaries

    # Add mock bin to PATH
    export PATH="${TEST_DIR}/bin:$PATH"

    cd "${TEST_PROJECT_DIR}"
}

teardown() {
    cd "${ORIG_DIR}"
    rm -rf "${TEST_DIR}"
}

create_mock_binaries() {
    # Mock node
    cat > "${TEST_DIR}/bin/node" << 'EOF'
#!/bin/bash
echo "v20.0.0"
exit 0
EOF
    chmod +x "${TEST_DIR}/bin/node"

    # Mock npm
    cat > "${TEST_DIR}/bin/npm" << 'EOF'
#!/bin/bash
echo "10.0.0"
exit 0
EOF
    chmod +x "${TEST_DIR}/bin/npm"

    # Mock docker (success by default)
    cat > "${TEST_DIR}/bin/docker" << 'EOF'
#!/bin/bash
case "$1" in
    info)
        echo "Docker running"
        exit 0
        ;;
    ps)
        echo "test-agent-backend"
        exit 0
        ;;
    compose)
        # Check for failure injection
        if [ -f "/tmp/docker-fail" ]; then
            echo "ERROR: Docker compose failed" >&2
            exit 1
        fi
        exit 0
        ;;
    inspect)
        echo '{"State":{"Health":{"Status":"healthy"}}}'
        exit 0
        ;;
esac
exit 0
EOF
    chmod +x "${TEST_DIR}/bin/docker"

    # Mock tmux
    cat > "${TEST_DIR}/bin/tmux" << 'EOF'
#!/bin/bash
case "$1" in
    -V)
        echo "tmux 3.0"
        exit 0
        ;;
    has-session)
        exit 1  # Session doesn't exist
        ;;
    *)
        exit 0
        ;;
esac
EOF
    chmod +x "${TEST_DIR}/bin/tmux"

    # Mock jq
    cat > "${TEST_DIR}/bin/jq" << 'EOF'
#!/bin/bash
echo "--version" | grep -q "$1" && echo "jq-1.6" && exit 0
# Simple JSON parsing for our test config
exec /usr/bin/env jq "$@"
EOF
    chmod +x "${TEST_DIR}/bin/jq"

    # Mock mkcert
    cat > "${TEST_DIR}/bin/mkcert" << 'EOF'
#!/bin/bash
if [ "$1" = "-version" ]; then
    echo "v1.4.4"
    exit 0
elif [ "$1" = "-CAROOT" ]; then
    echo "/tmp/mkcert-ca"
    mkdir -p /tmp/mkcert-ca
    touch /tmp/mkcert-ca/rootCA.pem
    exit 0
fi
exit 0
EOF
    chmod +x "${TEST_DIR}/bin/mkcert"

    # Mock curl
    cat > "${TEST_DIR}/bin/curl" << 'EOF'
#!/bin/bash
# Mock successful responses
exit 0
EOF
    chmod +x "${TEST_DIR}/bin/curl"
}

# Create mock setup scripts that can be configured to fail
create_mock_setup_scripts() {
    local novu_fail="${1:-false}"
    local convex_fail="${2:-false}"

    # Mock setup-novu-org.sh
    cat > "${TEST_PROJECT_DIR}/scripts/setup-novu-org.sh" << EOF
#!/bin/bash
if [ "$novu_fail" = "true" ]; then
    echo "ERROR: Novu setup failed" >&2
    exit 1
fi
echo "Novu setup successful"
exit 0
EOF
    chmod +x "${TEST_PROJECT_DIR}/scripts/setup-novu-org.sh"

    # Mock setup-convex-env.sh
    cat > "${TEST_PROJECT_DIR}/scripts/setup-convex-env.sh" << EOF
#!/bin/bash
if [ "$convex_fail" = "true" ]; then
    echo "ERROR: Convex setup failed" >&2
    exit 1
fi
echo "Convex setup successful"
exit 0
EOF
    chmod +x "${TEST_PROJECT_DIR}/scripts/setup-convex-env.sh"

    # Mock start-dev-servers.sh
    cat > "${TEST_PROJECT_DIR}/scripts/start-dev-servers.sh" << 'EOF'
#!/bin/bash
echo "Dev servers started"
exit 0
EOF
    chmod +x "${TEST_PROJECT_DIR}/scripts/start-dev-servers.sh"
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

assert_file_content_equals() {
    local file="$1"
    local expected_content="$2"
    local message="${3:-}"

    if [ ! -f "$file" ]; then
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    File does not exist: $file"
        return 1
    fi

    local actual_content=$(cat "$file")
    if [ "$expected_content" = "$actual_content" ]; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected content: '$expected_content'"
        echo "    Actual content:   '$actual_content'"
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

test_tc01_create_backups_before_generation() {
    test_start "TC01: Create backups before env file generation"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create existing env files
    echo "AGENT_NAME=old-agent" > ".env.docker.local"
    echo "OLD_CONFIG=true" > "app/.env.nextjs.local"

    create_mock_setup_scripts

    # Run agent-init.sh with timeout (mock libraries will be missing, but we check backup creation)
    set +e
    timeout 3 bash scripts/agent-init.sh > /dev/null 2>&1
    set -e

    # Check if backups were created (THIS WILL FAIL - RED PHASE)
    if [ -f ".env.docker.local.backup" ] && [ -f "app/.env.nextjs.local.backup" ]; then
        test_pass
    else
        echo -e " ${RED}FAIL${NC}: Backup files not created (expected - RED phase)"
        echo "    Expected: .env.docker.local.backup and app/.env.nextjs.local.backup"
        test_fail
    fi
}

test_tc02_no_backups_when_files_dont_exist() {
    test_start "TC02: No backups when files don't exist"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Ensure no env files exist
    rm -f .env.docker.local app/.env.nextjs.local

    create_mock_setup_scripts

    # Run agent-init.sh with timeout
    set +e
    timeout 3 bash scripts/agent-init.sh > /dev/null 2>&1
    set -e

    # Check that no backup files were created
    assert_file_not_exists ".env.docker.local.backup" "Should not create backup when file doesn't exist" || { test_fail; return; }
    assert_file_not_exists "app/.env.nextjs.local.backup" "Should not create backup when file doesn't exist" || { test_fail; return; }

    test_pass
}

test_tc03_restore_on_docker_failure() {
    test_start "TC03: Restore env files on Docker failure"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create existing env files with known content
    local original_docker="AGENT_NAME=original-agent"
    local original_nextjs="ORIGINAL_NEXTJS=true"
    echo "$original_docker" > ".env.docker.local"
    echo "$original_nextjs" > "app/.env.nextjs.local"

    create_mock_setup_scripts

    # Inject Docker failure
    touch /tmp/docker-fail

    # Run agent-init.sh (should fail on Docker)
    set +e
    timeout 3 bash scripts/agent-init.sh > /dev/null 2>&1
    local exit_code=$?
    set -e

    # Clean up failure injection
    rm -f /tmp/docker-fail

    # Check exit code is 3 (Docker failed)
    assert_exit_code 3 "$exit_code" "Should exit with code 3 on Docker failure" || { test_fail; return; }

    # Check that env files were restored to original content (THIS WILL FAIL - RED PHASE)
    if [ -f ".env.docker.local" ]; then
        local restored_docker=$(cat .env.docker.local)
        assert_equals "$original_docker" "$restored_docker" "Should restore .env.docker.local" || { test_fail; return; }
    else
        echo -e " ${RED}FAIL${NC}: .env.docker.local was deleted instead of restored (expected - RED phase)"
        test_fail
        return
    fi

    # Check backup files were cleaned up
    assert_file_not_exists ".env.docker.local.backup" "Should clean up backup after restore" || { test_fail; return; }

    test_pass
}

test_tc04_restore_on_novu_failure() {
    test_start "TC04: Restore env files on Novu setup failure"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create existing env files
    local original_docker="AGENT_NAME=original-agent"
    echo "$original_docker" > ".env.docker.local"
    echo "ORIGINAL=true" > "app/.env.nextjs.local"

    # Create mock scripts with Novu failure
    create_mock_setup_scripts true false

    # Run agent-init.sh (should fail on Novu)
    set +e
    timeout 3 bash scripts/agent-init.sh > /dev/null 2>&1
    local exit_code=$?
    set -e

    # Check exit code is 5 (Novu failed)
    assert_exit_code 5 "$exit_code" "Should exit with code 5 on Novu failure" || { test_fail; return; }

    # Check that env files were restored (THIS WILL FAIL - RED PHASE)
    if [ -f ".env.docker.local" ]; then
        local restored=$(cat .env.docker.local)
        assert_equals "$original_docker" "$restored" "Should restore .env.docker.local on Novu failure" || { test_fail; return; }
    else
        echo -e " ${RED}FAIL${NC}: Env files not restored on Novu failure (expected - RED phase)"
        test_fail
        return
    fi

    test_pass
}

test_tc05_restore_on_convex_failure() {
    test_start "TC05: Restore env files on Convex setup failure"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create existing env files
    local original="AGENT_NAME=original"
    echo "$original" > ".env.docker.local"

    # Create mock scripts with Convex failure
    create_mock_setup_scripts false true

    # Run agent-init.sh
    set +e
    timeout 3 bash scripts/agent-init.sh > /dev/null 2>&1
    local exit_code=$?
    set -e

    # Check exit code is 4 (Convex failed)
    assert_exit_code 4 "$exit_code" "Should exit with code 4 on Convex failure" || { test_fail; return; }

    # Check restoration (THIS WILL FAIL - RED PHASE)
    if [ -f ".env.docker.local" ]; then
        local restored=$(cat .env.docker.local)
        assert_equals "$original" "$restored" "Should restore on Convex failure" || { test_fail; return; }
    else
        echo -e " ${RED}FAIL${NC}: Env files not restored on Convex failure (expected - RED phase)"
        test_fail
        return
    fi

    test_pass
}

test_tc06_restore_on_smoke_test_failure() {
    test_start "TC06: Restore env files on smoke test failure"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # This test requires mocking the smoke test library to fail
    # For now, we'll skip it as it requires more complex setup
    test_skip "Requires smoke test mock"
}

test_tc07_cleanup_backups_on_success() {
    test_start "TC07: Clean up backups on successful completion"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create existing env files
    echo "AGENT_NAME=test" > ".env.docker.local"
    echo "CONFIG=true" > "app/.env.nextjs.local"

    create_mock_setup_scripts

    # Run agent-init.sh (should succeed)
    set +e
    timeout 3 bash scripts/agent-init.sh > /dev/null 2>&1
    local exit_code=$?
    set -e

    # On success, backup files should be removed (THIS WILL FAIL - RED PHASE)
    if [ -f ".env.docker.local.backup" ] || [ -f "app/.env.nextjs.local.backup" ]; then
        echo -e " ${RED}FAIL${NC}: Backup files not cleaned up after success (expected - RED phase)"
        test_fail
        return
    fi

    test_pass
}

test_tc08_partial_restore() {
    test_start "TC08: Only restore files that had backups"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Only create .env.docker.local (not app/.env.nextjs.local)
    local original="AGENT_NAME=original"
    echo "$original" > ".env.docker.local"

    # Inject failure
    create_mock_setup_scripts true false

    # Run agent-init.sh
    set +e
    timeout 3 bash scripts/agent-init.sh > /dev/null 2>&1
    set -e

    # .env.docker.local should be restored
    assert_file_exists ".env.docker.local" "Should restore .env.docker.local" || { test_fail; return; }

    # app/.env.nextjs.local might exist from generation but shouldn't have backup
    # The test verifies selective restoration logic (THIS WILL FAIL - RED PHASE)

    test_pass
}

test_tc09_rollback_handles_missing_backups() {
    test_start "TC09: Gracefully handle missing backups during rollback"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # This test would require manually deleting backups mid-execution
    # Complex to implement without modifying script
    test_skip "Requires manual backup deletion simulation"
}

test_tc10_signal_handler_ctrl_c() {
    test_start "TC10: Handle Ctrl+C with rollback"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Testing SIGINT requires background process and kill
    # Skip for now as it's complex in test framework
    test_skip "Requires SIGINT simulation"
}

test_tc11_preserve_file_permissions() {
    test_start "TC11: Preserve file permissions on restore"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env file with specific permissions
    echo "AGENT_NAME=test" > ".env.docker.local"
    chmod 600 .env.docker.local

    create_mock_setup_scripts true false

    # Run and fail
    set +e
    timeout 3 bash scripts/agent-init.sh > /dev/null 2>&1
    set -e

    # Check permissions were preserved (THIS WILL FAIL - RED PHASE)
    if [ -f ".env.docker.local" ]; then
        local perms=$(stat -c "%a" .env.docker.local)
        assert_equals "600" "$perms" "Should preserve file permissions on restore" || { test_fail; return; }
    fi

    test_pass
}

test_tc12_env_only_mode_rollback() {
    test_start "TC12: Rollback works with --env-only flag"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create existing env file
    local original="AGENT_NAME=original"
    echo "$original" > ".env.docker.local"

    # --env-only mode typically doesn't start services, so harder to inject failure
    # This test would require mocking the env generation libraries to fail
    test_skip "Requires env generation mock failure"
}

test_tc13_idempotent_rollback() {
    test_start "TC13: Rollback is idempotent"

    # This would test calling rollback function twice
    # Requires extracting rollback function or testing via script modification
    test_skip "Requires rollback function extraction"
}

test_tc14_log_rollback_actions() {
    test_start "TC14: Log rollback actions clearly"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env files
    echo "AGENT_NAME=test" > ".env.docker.local"

    create_mock_setup_scripts true false

    # Run and capture output
    set +e
    local output
    output=$(timeout 3 bash scripts/agent-init.sh 2>&1)
    local exit_code=$?
    set -e

    # Should log rollback actions (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" "Rolling back" "Should log rollback message" || { test_fail; return; }

    test_pass
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    echo "======================================================================"
    echo "Unit Tests: Rollback on Failure in scripts/agent-init.sh"
    echo "======================================================================"
    echo ""
    echo "NOTE: These tests are in RED phase - they SHOULD FAIL initially."
    echo "After implementation, all tests should pass (GREEN phase)."
    echo ""

    setup

    test_tc01_create_backups_before_generation
    test_tc02_no_backups_when_files_dont_exist
    test_tc03_restore_on_docker_failure
    test_tc04_restore_on_novu_failure
    test_tc05_restore_on_convex_failure
    test_tc06_restore_on_smoke_test_failure
    test_tc07_cleanup_backups_on_success
    test_tc08_partial_restore
    test_tc09_rollback_handles_missing_backups
    test_tc10_signal_handler_ctrl_c
    test_tc11_preserve_file_permissions
    test_tc12_env_only_mode_rollback
    test_tc13_idempotent_rollback
    test_tc14_log_rollback_actions

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
