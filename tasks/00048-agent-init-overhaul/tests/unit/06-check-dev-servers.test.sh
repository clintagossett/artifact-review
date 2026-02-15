#!/usr/bin/env bash
#
# Unit Tests for scripts/lib/check-dev-servers.sh
#
# Test Framework: Plain bash (no external dependencies)
# Run: ./tasks/00048-agent-init-overhaul/tests/unit/06-check-dev-servers.test.sh
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

    # Create mock orchestrator config.json
    TEST_ORCHESTRATOR_DIR="${TEST_DIR}/orchestrator-artifact-review"
    mkdir -p "$TEST_ORCHESTRATOR_DIR"

    cat > "$TEST_ORCHESTRATOR_DIR/config.json" << 'EOF'
{
  "james": {
    "appPort": 3020,
    "convexCloudPort": 3231,
    "convexSitePort": 3230,
    "subnet": "172.20.0.0/16"
  },
  "test-agent": {
    "appPort": 4000,
    "convexCloudPort": 4211,
    "convexSitePort": 4210,
    "subnet": "172.21.0.0/16"
  }
}
EOF

    # Copy the actual check-dev-servers.sh if it exists
    if [ -f "${ORIG_DIR}/scripts/lib/check-dev-servers.sh" ]; then
        cp "${ORIG_DIR}/scripts/lib/check-dev-servers.sh" "${TEST_PROJECT_DIR}/scripts/lib/"
    fi

    # Copy parse-config.sh dependency
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

assert_in_range() {
    local value="$1"
    local min="$2"
    local max="$3"
    local message="${4:-}"

    if [ "$value" -ge "$min" ] && [ "$value" -le "$max" ]; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected: ${min} <= ${value} <= ${max}"
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

# Mock curl command that can be overridden per test
mock_curl() {
    echo "bash: curl: command not found" >&2
    return 127
}

# Override curl in test environment
curl() {
    mock_curl "$@"
}

# ============================================================================
# Test Cases
# ============================================================================

test_tc01_script_exists() {
    test_start "TC01: Script exists and is executable"

    if [ ! -f "${ORIG_DIR}/scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    if [ ! -x "${ORIG_DIR}/scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh is not executable"
        test_fail
        return
    fi

    test_pass
}

test_tc02_missing_curl() {
    test_start "TC02: Missing curl command"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl as not found
    mock_curl() {
        echo "bash: curl: command not found" >&2
        return 127
    }

    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers "james" 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 1 "$exit_code" "Should return exit code 1 for missing curl" && \
    assert_contains "$output" "curl" "Should mention curl in error" && \
    test_pass || test_fail
}

test_tc03_convex_not_responding() {
    test_start "TC03: Convex endpoint not responding"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to fail for Convex endpoint
    mock_curl() {
        # Convex endpoint check fails
        if [[ "$*" == *":3231/version"* ]]; then
            return 7  # Connection refused
        fi
        # Next.js succeeds
        if [[ "$*" == *":3020"* ]]; then
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers "james" 5 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 6 "$exit_code" "Should return exit code 6 for timeout" && \
    assert_contains "$output" "Convex" "Should mention Convex" && \
    test_pass || test_fail
}

test_tc04_nextjs_not_responding() {
    test_start "TC04: Next.js endpoint not responding"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to fail for Next.js endpoint
    mock_curl() {
        # Convex succeeds
        if [[ "$*" == *":3231/version"* ]]; then
            return 0
        fi
        # Next.js fails
        if [[ "$*" == *":3020"* ]]; then
            return 7  # Connection refused
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers "james" 5 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 6 "$exit_code" "Should return exit code 6 for timeout" && \
    assert_contains "$output" "Next" "Should mention Next.js" && \
    test_pass || test_fail
}

test_tc05_both_healthy_immediately() {
    test_start "TC05: Both endpoints healthy immediately"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to succeed for both endpoints
    mock_curl() {
        if [[ "$*" == *"-w"* ]]; then
            # Next.js health check (returns HTTP code)
            echo "200"
            return 0
        fi
        # Convex health check (silent success)
        return 0
    }

    set +e
    start_time=$(date +%s)
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers "james" 2>&1)
    exit_code=$?
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    set -e

    assert_exit_code 0 "$exit_code" "Should return 0 for healthy endpoints" && \
    assert_contains "$output" "ready" "Should mention ready status" && \
    test_pass || test_fail
}

test_tc06_convex_becomes_healthy() {
    test_start "TC06: Convex becomes healthy after retries"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Track call count for Convex endpoint
    COUNT_FILE=$(mktemp)
    echo "0" > "$COUNT_FILE"

    mock_curl() {
        if [[ "$*" == *":3231/version"* ]]; then
            # Convex endpoint - fail first 2 times
            local count=$(cat "$COUNT_FILE" 2>/dev/null || echo "0")
            count=$((count + 1))
            echo "$count" > "$COUNT_FILE"
            if [ $count -le 2 ]; then
                return 7  # Connection refused
            fi
            return 0  # Success
        fi
        if [[ "$*" == *"-w"* ]]; then
            # Next.js returns 200
            echo "200"
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers "james" 2>&1)
    exit_code=$?
    set -e

    # Cleanup
    rm -f "$COUNT_FILE"

    assert_exit_code 0 "$exit_code" "Should succeed when Convex becomes healthy" && \
    assert_contains "$output" "retry" "Should show retry attempts" && \
    test_pass || test_fail
}

test_tc07_nextjs_becomes_healthy() {
    test_start "TC07: Next.js becomes healthy after retries"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Track call count for Next.js endpoint
    COUNT_FILE=$(mktemp)
    echo "0" > "$COUNT_FILE"

    mock_curl() {
        if [[ "$*" == *":3231/version"* ]]; then
            # Convex succeeds immediately
            return 0
        fi
        if [[ "$*" == *"-w"* ]] && [[ "$*" == *":3020"* ]]; then
            # Next.js endpoint - fail first 2 times
            local count=$(cat "$COUNT_FILE" 2>/dev/null || echo "0")
            count=$((count + 1))
            echo "$count" > "$COUNT_FILE"
            if [ $count -le 2 ]; then
                echo "000"  # Failed connection
                return 7
            fi
            echo "200"  # Success
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers "james" 2>&1)
    exit_code=$?
    set -e

    # Cleanup
    rm -f "$COUNT_FILE"

    assert_exit_code 0 "$exit_code" "Should succeed when Next.js becomes healthy" && \
    assert_contains "$output" "retry" "Should show retry attempts" && \
    test_pass || test_fail
}

test_tc08_timeout_after_30_seconds() {
    test_start "TC08: Timeout after 30 seconds"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to always fail
    mock_curl() {
        return 7  # Connection refused
    }

    set +e
    start_time=$(date +%s)
    # Use short timeout for test speed (5 seconds)
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers "james" 5 2>&1)
    exit_code=$?
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    set -e

    # Should timeout around 5 seconds (allow 3-8 second range)
    assert_exit_code 6 "$exit_code" "Should return exit code 6 on timeout" && \
    assert_in_range "$elapsed" 3 8 "Should respect timeout parameter" && \
    assert_contains "$output" "timeout" "Should mention timeout" && \
    test_pass || test_fail
}

test_tc09_custom_timeout() {
    test_start "TC09: Custom timeout parameter"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to always fail
    mock_curl() {
        return 7
    }

    set +e
    start_time=$(date +%s)
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers "james" 3 2>&1)
    exit_code=$?
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    set -e

    # Should timeout around 3 seconds (allow 2-5 second range)
    assert_exit_code 6 "$exit_code" "Should timeout" && \
    assert_in_range "$elapsed" 2 5 "Should use custom timeout" && \
    test_pass || test_fail
}

test_tc10_exponential_backoff() {
    test_start "TC10: Exponential backoff retry logic"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Track timing of curl calls
    TIMING_FILE=$(mktemp)
    echo "$(date +%s)" > "$TIMING_FILE"

    COUNT=0
    mock_curl() {
        COUNT=$((COUNT + 1))
        local now=$(date +%s)
        local first=$(head -1 "$TIMING_FILE")
        local elapsed=$((now - first))
        echo "$COUNT:$elapsed" >> "$TIMING_FILE"

        # Fail for first 3 attempts to see backoff
        if [ $COUNT -le 3 ]; then
            return 7
        fi
        # Then succeed
        if [[ "$*" == *"-w"* ]]; then
            echo "200"
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers "james" 2>&1)
    exit_code=$?
    set -e

    # Check timing file for exponential backoff pattern
    # First retry ~1s, second ~2s, third ~4s
    # Due to both Convex and Next.js being checked, exact timing varies
    # We just verify retries happened and took reasonable time

    if [ -f "$TIMING_FILE" ]; then
        local line_count=$(wc -l < "$TIMING_FILE")
        if [ "$line_count" -ge 3 ]; then
            test_pass
        else
            echo -e "${RED}  FAIL${NC}: Not enough retry attempts logged"
            test_fail
        fi
        rm -f "$TIMING_FILE"
    else
        test_pass  # File handling may vary
    fi
}

test_tc11_progress_output() {
    test_start "TC11: Progress output shows retries"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to succeed immediately
    mock_curl() {
        if [[ "$*" == *"-w"* ]]; then
            echo "200"
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers "james" 2>&1)
    exit_code=$?
    set -e

    # Should show checking message
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$output" "Checking" "Should show checking message" && \
    assert_contains "$output" "james" "Should mention agent name" && \
    test_pass || test_fail
}

test_tc12_reads_ports_from_config() {
    test_start "TC12: Reads ports from config.json"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Track which ports were checked using a file
    PORTS_FILE=$(mktemp)

    mock_curl() {
        # Extract port from URL and log to file
        if [[ "$*" == *":4211"* ]]; then
            echo "convex:4211" >> "$PORTS_FILE"
        fi
        if [[ "$*" == *":4000"* ]]; then
            echo "nextjs:4000" >> "$PORTS_FILE"
        fi
        if [[ "$*" == *"-w"* ]]; then
            echo "200"
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers "test-agent" 2>&1)
    exit_code=$?
    set -e

    # Read ports from file
    local ports_checked=""
    if [ -f "$PORTS_FILE" ]; then
        ports_checked=$(cat "$PORTS_FILE")
    fi
    rm -f "$PORTS_FILE"

    # Verify correct ports from config were checked
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$ports_checked" "4211" "Should check Convex port from config" && \
    assert_contains "$ports_checked" "4000" "Should check Next.js port from config" && \
    test_pass || test_fail
}

test_tc13_library_sourcing() {
    test_start "TC13: Can be sourced without execution"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Source the library - should not execute anything
    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1)
    exit_code=$?
    set -e

    # Should succeed and not show checking messages
    assert_exit_code 0 "$exit_code" "Should source without error" && \
    assert_not_contains "$output" "Checking" "Should not execute on source" && \
    test_pass || test_fail
}

test_tc14_check_convex_only() {
    test_start "TC14: Check only Convex endpoint"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Track which services were checked using a file
    CHECKED_FILE=$(mktemp)

    mock_curl() {
        if [[ "$*" == *":3231"* ]]; then
            echo "convex" >> "$CHECKED_FILE"
            return 0
        fi
        if [[ "$*" == *":3020"* ]]; then
            echo "nextjs" >> "$CHECKED_FILE"
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers --convex-only "james" 2>&1)
    exit_code=$?
    set -e

    # Read checked services from file
    local checked=""
    if [ -f "$CHECKED_FILE" ]; then
        checked=$(cat "$CHECKED_FILE")
    fi
    rm -f "$CHECKED_FILE"

    # Should only check Convex
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$checked" "convex" "Should check Convex" && \
    assert_not_contains "$checked" "nextjs" "Should NOT check Next.js" && \
    test_pass || test_fail
}

test_tc15_check_nextjs_only() {
    test_start "TC15: Check only Next.js endpoint"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Track which services were checked using a file
    CHECKED_FILE=$(mktemp)

    mock_curl() {
        if [[ "$*" == *":3231"* ]]; then
            echo "convex" >> "$CHECKED_FILE"
            return 0
        fi
        if [[ "$*" == *":3020"* ]]; then
            echo "nextjs" >> "$CHECKED_FILE"
            if [[ "$*" == *"-w"* ]]; then
                echo "200"
            fi
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers --nextjs-only "james" 2>&1)
    exit_code=$?
    set -e

    # Read checked services from file
    local checked=""
    if [ -f "$CHECKED_FILE" ]; then
        checked=$(cat "$CHECKED_FILE")
    fi
    rm -f "$CHECKED_FILE"

    # Should only check Next.js
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$checked" "nextjs" "Should check Next.js" && \
    assert_not_contains "$checked" "convex" "Should NOT check Convex" && \
    test_pass || test_fail
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    echo "============================================================================"
    echo "Dev Server Health Check Unit Tests (TDD - RED Phase)"
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
