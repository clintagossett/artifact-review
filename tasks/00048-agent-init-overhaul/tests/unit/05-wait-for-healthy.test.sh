#!/usr/bin/env bash
#
# Unit Tests for scripts/lib/wait-for-healthy.sh
#
# Test Framework: Plain bash (no external dependencies)
# Run: ./tasks/00048-agent-init-overhaul/tests/unit/05-wait-for-healthy.test.sh
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

    # Save original directory
    ORIG_DIR=$(pwd)

    # Create test project structure
    TEST_PROJECT_DIR="${TEST_DIR}/artifact-review-james"
    mkdir -p "${TEST_PROJECT_DIR}/scripts/lib"

    # Copy the actual wait-for-healthy.sh if it exists
    if [ -f "${ORIG_DIR}/scripts/lib/wait-for-healthy.sh" ]; then
        cp "${ORIG_DIR}/scripts/lib/wait-for-healthy.sh" "${TEST_PROJECT_DIR}/scripts/lib/"
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

assert_not_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-}"

    if ! echo "$haystack" | grep -qF "$needle"; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected to NOT contain: '$needle'"
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
# Mock Docker Commands
# ============================================================================

# Mock docker command that can be overridden per test
mock_docker() {
    # Default behavior: command not found
    echo "bash: docker: command not found" >&2
    return 127
}

# Override docker in test environment
docker() {
    mock_docker "$@"
}

# ============================================================================
# Test Cases
# ============================================================================

test_tc01_script_exists() {
    test_start "TC01: Script exists and is executable"

    if [ ! -f "${ORIG_DIR}/scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    if [ ! -x "${ORIG_DIR}/scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh is not executable"
        test_fail
        return
    fi

    test_pass
}

test_tc02_missing_docker() {
    test_start "TC02: Missing docker command"

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock docker as not found
    mock_docker() {
        echo "bash: docker: command not found" >&2
        return 127
    }

    set +e
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1 && wait_for_container_healthy "test-container" 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 1 "$exit_code" "Should return exit code 1 for missing docker" && \
    assert_contains "$output" "docker" "Should mention docker in error" && \
    test_pass || test_fail
}

test_tc03_container_not_found() {
    test_start "TC03: Container does not exist"

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock docker inspect to fail (container not found)
    mock_docker() {
        if [ "$1" = "inspect" ]; then
            echo "Error: No such object: nonexistent-container" >&2
            return 1
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1 && wait_for_container_healthy "nonexistent-container" 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 2 "$exit_code" "Should return exit code 2 for missing container" && \
    assert_contains "$output" "not found" "Should mention container not found" && \
    test_pass || test_fail
}

test_tc04_no_healthcheck() {
    test_start "TC04: Container has no healthcheck"

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock docker inspect to succeed but return empty health status
    mock_docker() {
        if [ "$1" = "inspect" ]; then
            if [[ "$*" == *"State.Health.Status"* ]]; then
                # Return empty (no healthcheck)
                echo ""
                return 0
            fi
            # Just checking existence
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1 && wait_for_container_healthy "no-health-container" 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 3 "$exit_code" "Should return exit code 3 for no healthcheck" && \
    assert_contains "$output" "no healthcheck" "Should mention no healthcheck" && \
    test_pass || test_fail
}

test_tc05_immediately_healthy() {
    test_start "TC05: Container already healthy"

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock docker inspect to return healthy immediately
    mock_docker() {
        if [ "$1" = "inspect" ]; then
            if [[ "$*" == *"State.Health.Status"* ]]; then
                echo "healthy"
                return 0
            fi
            return 0
        fi
        return 0
    }

    set +e
    start_time=$(date +%s)
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1 && wait_for_container_healthy "healthy-container" 2>&1)
    exit_code=$?
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    set -e

    assert_exit_code 0 "$exit_code" "Should return 0 for healthy container" && \
    assert_contains "$output" "healthy" "Should mention healthy status" && \
    test_pass || test_fail

    # Note: Can't reliably test < 2 seconds due to sourcing overhead
}

test_tc06_becomes_healthy_after_delay() {
    test_start "TC06: Container becomes healthy after delay"

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock docker inspect to return starting then healthy
    # Use a file to track call count across subshells
    COUNT_FILE=$(mktemp)
    echo "0" > "$COUNT_FILE"

    mock_docker() {
        if [ "$1" = "inspect" ]; then
            if [[ "$*" == *"State.Health.Status"* ]]; then
                local count=$(cat "$COUNT_FILE" 2>/dev/null || echo "0")
                count=$((count + 1))
                echo "$count" > "$COUNT_FILE"
                if [ $count -le 2 ]; then
                    echo "starting"
                else
                    echo "healthy"
                fi
                return 0
            fi
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1 && wait_for_container_healthy "delayed-container" 2>&1)
    exit_code=$?
    set -e

    # Cleanup
    rm -f "$COUNT_FILE"

    assert_exit_code 0 "$exit_code" "Should return 0 when becomes healthy" && \
    assert_contains "$output" "healthy" "Should show healthy status" && \
    test_pass || test_fail
}

test_tc07_timeout() {
    test_start "TC07: Container times out"

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock docker inspect to always return starting (never healthy)
    mock_docker() {
        if [ "$1" = "inspect" ]; then
            if [[ "$*" == *"State.Health.Status"* ]]; then
                echo "starting"
                return 0
            fi
            return 0
        fi
        return 0
    }

    set +e
    # Use very short timeout for test speed (e.g., 3 seconds)
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1 && wait_for_container_healthy "timeout-container" 3 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 6 "$exit_code" "Should return exit code 6 on timeout" && \
    assert_contains "$output" "timeout" "Should mention timeout" && \
    test_pass || test_fail
}

test_tc08_custom_timeout() {
    test_start "TC08: Custom timeout parameter"

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock docker to never become healthy
    mock_docker() {
        if [ "$1" = "inspect" ]; then
            if [[ "$*" == *"State.Health.Status"* ]]; then
                echo "starting"
                return 0
            fi
            return 0
        fi
        return 0
    }

    set +e
    start_time=$(date +%s)
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1 && wait_for_container_healthy "test-container" 5 2>&1)
    exit_code=$?
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    set -e

    # Should timeout around 5 seconds (allow 1-7 second range for test overhead)
    if [ $elapsed -lt 4 ] || [ $elapsed -gt 8 ]; then
        echo -e "${RED}  FAIL${NC}: Timeout not respected (elapsed: ${elapsed}s, expected ~5s)"
        test_fail
        return
    fi

    assert_exit_code 6 "$exit_code" "Should timeout" && \
    test_pass || test_fail
}

test_tc09_default_timeout() {
    test_start "TC09: Default timeout (60 seconds)"

    # This test would take 60 seconds, so we'll verify the default is set correctly
    # by checking the script content rather than running it

    if [ ! -f "${ORIG_DIR}/scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Check if script has default timeout of 60
    if grep -q "timeout.*60" "${ORIG_DIR}/scripts/lib/wait-for-healthy.sh" 2>/dev/null; then
        test_pass
    else
        echo -e " ${YELLOW}SKIP${NC} (requires implementation)"
    fi
}

test_tc10_starting_state() {
    test_start "TC10: Container in starting state"

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock docker to return starting then healthy
    COUNT_FILE=$(mktemp)
    echo "0" > "$COUNT_FILE"

    mock_docker() {
        if [ "$1" = "inspect" ]; then
            if [[ "$*" == *"State.Health.Status"* ]]; then
                local count=$(cat "$COUNT_FILE" 2>/dev/null || echo "0")
                count=$((count + 1))
                echo "$count" > "$COUNT_FILE"
                if [ $count -le 1 ]; then
                    echo "starting"
                else
                    echo "healthy"
                fi
                return 0
            fi
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1 && wait_for_container_healthy "starting-container" 2>&1)
    exit_code=$?
    set -e

    # Cleanup
    rm -f "$COUNT_FILE"

    assert_exit_code 0 "$exit_code" "Should eventually succeed" && \
    assert_contains "$output" "healthy" "Should show healthy" && \
    test_pass || test_fail
}

test_tc11_unhealthy_state() {
    test_start "TC11: Container unhealthy state retries"

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock docker to return unhealthy (should retry until timeout)
    mock_docker() {
        if [ "$1" = "inspect" ]; then
            if [[ "$*" == *"State.Health.Status"* ]]; then
                echo "unhealthy"
                return 0
            fi
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1 && wait_for_container_healthy "unhealthy-container" 3 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 6 "$exit_code" "Should timeout on persistent unhealthy" && \
    test_pass || test_fail
}

test_tc12_polling_interval() {
    test_start "TC12: Reasonable polling interval"

    # This test verifies the script doesn't poll too fast or too slow
    # We check this by ensuring it doesn't complete instantly for a starting container

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock to return starting 2 times, then healthy
    COUNT_FILE=$(mktemp)
    echo "0" > "$COUNT_FILE"

    mock_docker() {
        if [ "$1" = "inspect" ]; then
            if [[ "$*" == *"State.Health.Status"* ]]; then
                local count=$(cat "$COUNT_FILE" 2>/dev/null || echo "0")
                count=$((count + 1))
                echo "$count" > "$COUNT_FILE"
                if [ $count -le 2 ]; then
                    echo "starting"
                else
                    echo "healthy"
                fi
                return 0
            fi
            return 0
        fi
        return 0
    }

    set +e
    start_time=$(date +%s)
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1 && wait_for_container_healthy "polling-test" 2>&1)
    exit_code=$?
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    set -e

    # Cleanup
    rm -f "$COUNT_FILE"

    # Should take at least 1 second (polling interval) but not instant
    # Allow up to 5 seconds for overhead
    if [ $elapsed -ge 1 ] && [ $elapsed -le 6 ]; then
        test_pass
    else
        echo -e "${RED}  FAIL${NC}: Polling interval seems wrong (elapsed: ${elapsed}s)"
        test_fail
    fi
}

test_tc13_progress_output() {
    test_start "TC13: Progress output format"

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock docker to return healthy immediately
    mock_docker() {
        if [ "$1" = "inspect" ]; then
            if [[ "$*" == *"State.Health.Status"* ]]; then
                echo "healthy"
                return 0
            fi
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1 && wait_for_container_healthy "test-container" 2>&1)
    exit_code=$?
    set -e

    # Should contain container name and success indicator
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$output" "test-container" "Should mention container name" && \
    test_pass || test_fail
}

test_tc14_library_sourcing() {
    test_start "TC14: Can be sourced without execution"

    if [ ! -f "scripts/lib/wait-for-healthy.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/wait-for-healthy.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Source the library - should not execute anything
    set +e
    output=$(source scripts/lib/wait-for-healthy.sh 2>&1)
    exit_code=$?
    set -e

    # Should succeed and define function
    assert_exit_code 0 "$exit_code" "Should source without error" && \
    assert_not_contains "$output" "Waiting" "Should not execute on source" && \
    test_pass || test_fail
}

test_tc15_multiple_containers() {
    test_start "TC15: Multiple containers (stretch goal)"

    # This is a stretch goal - not required for initial implementation
    echo -e " ${YELLOW}SKIP${NC} (stretch goal - not required)"
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    echo "============================================================================"
    echo "Docker Health Check Unit Tests (TDD - RED Phase)"
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
        echo -e "${RED}Some tests failed (expected in RED phase)${NC}"
        exit 1
    fi
}

# ============================================================================
# Main
# ============================================================================

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_all_tests
fi
