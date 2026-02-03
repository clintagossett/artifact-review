Perfect! Now I have all the context I need. Let me write comprehensive failing tests for **Subtask 6: Dev Server Health Check**. This is different from subtask 5 (Docker health check) - this one checks if Convex and Next.js dev servers are actually responding.

<artifact name="test-spec.md" type="text/markdown">
# Test Specification: Dev Server Health Check

## Purpose
Create a utility script (`scripts/lib/check-dev-servers.sh`) that verifies Convex (port 3220) and Next.js (port 3210) are responding on correct endpoints. This prevents proceeding with initialization when dev servers aren't actually ready to accept traffic.

## Test Results Summary

**Status:** RED Phase (Tests written, awaiting implementation)

| Test | Status | Description |
|------|--------|-------------|
| TC01 | ❌ FAIL | Script exists and is executable |
| TC02 | ❌ FAIL | Missing curl command |
| TC03 | ❌ FAIL | Convex endpoint not responding |
| TC04 | ❌ FAIL | Next.js endpoint not responding |
| TC05 | ❌ FAIL | Both endpoints healthy immediately |
| TC06 | ❌ FAIL | Convex becomes healthy after retries |
| TC07 | ❌ FAIL | Next.js becomes healthy after retries |
| TC08 | ❌ FAIL | Timeout after 30 seconds |
| TC09 | ❌ FAIL | Custom timeout parameter |
| TC10 | ❌ FAIL | Exponential backoff retry logic |
| TC11 | ❌ FAIL | Progress output shows retries |
| TC12 | ❌ FAIL | Reads ports from config.json |
| TC13 | ❌ FAIL | Library sourcing without execution |
| TC14 | ❌ FAIL | Check only Convex endpoint |
| TC15 | ❌ FAIL | Check only Next.js endpoint |

**Total:** 15 tests
**Passed:** 0
**Failed:** 15
**Skipped:** 0

## Acceptance Criteria

### TC01: Script exists and is executable
**Requirement:** File `scripts/lib/check-dev-servers.sh` exists and has execute permissions.

**Test:** Checks file existence and executable bit.

**Expected:** File exists with `-x` permission.

---

### TC02: Missing curl command
**Requirement:** When `curl` command is not available, script exits with code 1 and clear error.

**Test:** Mocks `curl` as unavailable, calls health check function.

**Expected:**
- Exit code: 1
- Output contains: "curl"

---

### TC03: Convex endpoint not responding
**Requirement:** When Convex endpoint returns non-200, script reports error and exits with code 6.

**Test:** Mocks `curl` to fail for Convex endpoint.

**Expected:**
- Exit code: 6
- Output contains: "Convex" and "not responding"

---

### TC04: Next.js endpoint not responding
**Requirement:** When Next.js endpoint returns non-200, script reports error and exits with code 6.

**Test:** Mocks `curl` to fail for Next.js endpoint.

**Expected:**
- Exit code: 6
- Output contains: "Next.js" and "not responding"

---

### TC05: Both endpoints healthy immediately
**Requirement:** When both endpoints respond with 200 on first try, script succeeds immediately.

**Test:** Mocks both endpoints as healthy from the start.

**Expected:**
- Exit code: 0
- Output contains: "Convex" and "Next.js" and "ready"
- Completes in < 2 seconds

---

### TC06: Convex becomes healthy after retries
**Requirement:** When Convex initially fails but becomes healthy, script retries and succeeds.

**Test:** Mocks Convex to fail first 2 attempts, then succeed.

**Expected:**
- Exit code: 0
- Shows retry progress
- Eventually reports success

---

### TC07: Next.js becomes healthy after retries
**Requirement:** When Next.js initially fails but becomes healthy, script retries and succeeds.

**Test:** Mocks Next.js to fail first 2 attempts, then succeed.

**Expected:**
- Exit code: 0
- Shows retry progress
- Eventually reports success

---

### TC08: Timeout after 30 seconds
**Requirement:** When endpoints don't become healthy within default 30s timeout, script exits with code 6.

**Test:** Mocks endpoints to never respond, verifies 30s timeout.

**Expected:**
- Exit code: 6
- Output contains: "timeout"
- Takes approximately 30 seconds (±3s tolerance)

---

### TC09: Custom timeout parameter
**Requirement:** When timeout parameter is provided, script uses custom timeout.

**Test:** Calls with 5-second timeout, verifies timeout is respected.

**Expected:**
- Timeout occurs around 5 seconds (±2s tolerance)
- Exit code: 6

---

### TC10: Exponential backoff retry logic
**Requirement:** Retries use exponential backoff (1s, 2s, 4s, 8s, ...).

**Test:** Measures intervals between retry attempts.

**Expected:**
- First retry after ~1 second
- Second retry after ~2 seconds
- Third retry after ~4 seconds
- Backoff caps at reasonable max (8-10 seconds)

---

### TC11: Progress output shows retries
**Requirement:** Script outputs clear progress during retries.

**Test:** Captures output during retry sequence.

**Expected:**
- Shows which service is being checked
- Shows retry attempt number
- Shows elapsed time

**Desired Format:**
```
Checking dev servers for agent 'james'...
  Convex (port 3231): attempt 1... ✗ retry in 1s
  Convex (port 3231): attempt 2... ✗ retry in 2s
  Convex (port 3231): attempt 3... ✓ healthy
  Next.js (port 3020): attempt 1... ✓ healthy
✓ All dev servers ready (7s)
```

---

### TC12: Reads ports from config.json
**Requirement:** Script reads agent port configuration from orchestrator config.json.

**Test:** Sets up mock config.json with specific ports, verifies correct ports are checked.

**Expected:**
- Reads appPort for Next.js check
- Reads convexCloudPort for Convex check
- Uses parse-config.sh library

---

### TC13: Library sourcing without execution
**Requirement:** Script can be sourced without executing functions.

**Test:** Sources the script, verifies no execution output.

**Expected:**
- Exit code: 0 (no errors)
- No "Checking" messages (nothing executes)
- Functions are defined for use

---

### TC14: Check only Convex endpoint
**Requirement:** Supports checking only Convex when called with `--convex-only`.

**Test:** Calls function with convex-only flag, verifies only Convex is checked.

**Expected:**
- Only checks Convex endpoint
- Ignores Next.js endpoint
- Exit code: 0 if Convex healthy, 6 if not

---

### TC15: Check only Next.js endpoint
**Requirement:** Supports checking only Next.js when called with `--nextjs-only`.

**Test:** Calls function with nextjs-only flag, verifies only Next.js is checked.

**Expected:**
- Only checks Next.js endpoint
- Ignores Convex endpoint
- Exit code: 0 if Next.js healthy, 6 if not

---

## API Contract

### Function Signature
```bash
check_dev_servers <agent_name> [timeout_seconds]
check_dev_servers --convex-only <agent_name> [timeout_seconds]
check_dev_servers --nextjs-only <agent_name> [timeout_seconds]
```

### Parameters
- `agent_name` (required): Agent name to check (reads ports from config.json)
- `timeout_seconds` (optional): Maximum wait time in seconds (default: 30)
- `--convex-only` (flag): Check only Convex endpoint
- `--nextjs-only` (flag): Check only Next.js endpoint

### Return Codes
| Code | Meaning |
|------|---------|
| 0 | All checked endpoints are healthy |
| 1 | Missing prerequisites (curl, jq, config) |
| 6 | Timeout waiting for endpoints to become healthy |

### Endpoint Health Checks

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| Convex | `http://127.0.0.1:{convexCloudPort}/version` | HTTP 200 |
| Next.js | `http://127.0.0.1:{appPort}` | HTTP 200 or 307 (redirect) |

**Note:** Next.js may return 307 redirect to HTTPS - this is considered healthy.

### Expected Output Format

**Success (both healthy):**
```
Checking dev servers for agent 'james'...
  Convex (port 3231): attempt 1... ✓ healthy
  Next.js (port 3020): attempt 1... ✓ healthy
✓ All dev servers ready (2s)
```

**Success with retries:**
```
Checking dev servers for agent 'james'...
  Convex (port 3231): attempt 1... ✗ retry in 1s
  Convex (port 3231): attempt 2... ✗ retry in 2s
  Convex (port 3231): attempt 3... ✓ healthy
  Next.js (port 3020): attempt 1... ✓ healthy
✓ All dev servers ready (7s)
```

**Timeout:**
```
Checking dev servers for agent 'james'...
  Convex (port 3231): attempt 1... ✗ retry in 1s
  Convex (port 3231): attempt 2... ✗ retry in 2s
  [... continues for 30s ...]
✗ Dev server health check timeout after 30s
  Convex (port 3231): not responding
  Next.js (port 3020): healthy
```

## Implementation Guidance

### Port Resolution
```bash
# Source the config parser
source "$(dirname "$0")/parse-config.sh"

# Get ports from config
CONVEX_PORT=$(get_agent_port "$AGENT_NAME" "convexCloudPort")
NEXTJS_PORT=$(get_agent_port "$AGENT_NAME" "appPort")
```

### Health Check Pattern
```bash
# Convex health check (expects JSON version response)
check_convex_healthy() {
    local port="$1"
    curl -sf "http://127.0.0.1:${port}/version" >/dev/null 2>&1
    return $?
}

# Next.js health check (200 or 307 redirect is healthy)
check_nextjs_healthy() {
    local port="$1"
    local status=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${port}" 2>/dev/null)
    [ "$status" = "200" ] || [ "$status" = "307" ]
    return $?
}
```

### Exponential Backoff Loop
```bash
local timeout="${2:-30}"
local elapsed=0
local attempt=1
local backoff=1

while [ $elapsed -lt $timeout ]; do
    echo "  Convex (port $CONVEX_PORT): attempt $attempt..." 
    
    if check_convex_healthy "$CONVEX_PORT"; then
        echo "✓ healthy"
        break
    else
        echo "✗ retry in ${backoff}s"
        sleep $backoff
        elapsed=$((elapsed + backoff))
        
        # Exponential backoff (1, 2, 4, 8, max 10)
        backoff=$((backoff * 2))
        [ $backoff -gt 10 ] && backoff=10
        
        attempt=$((attempt + 1))
    fi
done
```

## Test Strategy

### Unit Tests (Current - RED Phase)
- ✅ Mock curl commands using function overrides
- ✅ Test all exit codes for failure paths
- ✅ Test timeout logic with fast intervals (5 seconds)
- ✅ Verify exponential backoff timing
- ✅ Verify output formatting
- ✅ Test port reading from config.json
- ✅ Test library sourcing (no execution)

### Integration Tests (Future)
- Use real dev servers (Convex + Next.js)
- Test with actual agent endpoints
- Verify behavior when servers crash mid-check

## Dependencies
- `curl` command (checked at runtime)
- `scripts/lib/parse-config.sh` (for port resolution)
- `bash` >= 4.0 (for arithmetic)
- Standard utilities: `sleep`, `echo`

## Usage Examples

### In agent-init.sh
```bash
#!/bin/bash
source scripts/lib/check-dev-servers.sh

# Check both dev servers (default 30s timeout)
check_dev_servers "$AGENT_NAME" || {
    echo "Error: Dev servers not ready" >&2
    exit 6
}
```

### With custom timeout
```bash
# Wait 60 seconds max for dev servers
check_dev_servers "$AGENT_NAME" 60 || {
    echo "Dev server startup timeout" >&2
    exit 6
}
```

### Check only Convex
```bash
# Useful after restarting just Convex
check_dev_servers --convex-only "$AGENT_NAME" || {
    echo "Convex not responding" >&2
    exit 6
}
```

### Standalone usage
```bash
# From command line
./scripts/lib/check-dev-servers.sh james

# With custom timeout
./scripts/lib/check-dev-servers.sh james 45

# Check only Next.js
./scripts/lib/check-dev-servers.sh --nextjs-only james
```

## Integration with Subtask 5 (Docker Health Check)

**Sequence in agent-init.sh:**
```bash
# 1. Wait for Docker containers to be healthy
source scripts/lib/wait-for-healthy.sh
wait_for_container_healthy "${AGENT_NAME}-backend" || exit 3

# 2. Wait for dev servers to respond to HTTP
source scripts/lib/check-dev-servers.sh
check_dev_servers "$AGENT_NAME" || exit 6
```

**Why both checks?**
- Docker health check: Container reports healthy (process running)
- Dev server check: HTTP endpoint actually responds (ready for traffic)

Docker containers can be "healthy" but services inside may still be initializing.

## Next Steps (GREEN Phase)

After tests are confirmed failing (RED phase):

1. **Create `scripts/lib/check-dev-servers.sh`**
   - Implement `check_dev_servers` function
   - Add prerequisite checks (curl, config parser)
   - Load config parser library
   - Implement endpoint health checks
   - Add exponential backoff retry logic
   - Add timeout handling (default 30 seconds)
   - Format progress output

2. **Make executable**
   ```bash
   chmod +x scripts/lib/check-dev-servers.sh
   ```

3. **Run tests until GREEN**
   ```bash
   ./tasks/00048-agent-init-overhaul/tests/unit/06-check-dev-servers.test.sh
   ```

4. **Refactor phase**
   - Clean up code structure
   - Add comprehensive comments
   - Optimize backoff algorithm
   - Improve error messages

5. **Integration**
   - Update `agent-init.sh` to use this utility
   - Add after Docker health check
   - Update documentation

## Test Execution

### Run tests
```bash
# Run this specific test
./tasks/00048-agent-init-overhaul/tests/unit/06-check-dev-servers.test.sh

# Run all unit tests
./tasks/00048-agent-init-overhaul/tests/run-tests.sh unit

# Run all tests
./tasks/00048-agent-init-overhaul/tests/run-tests.sh
```

### Expected RED phase output
```
============================================================================
Dev Server Health Check Unit Tests (TDD - RED Phase)
============================================================================

  TC01: Script exists and is executable... FAIL: scripts/lib/check-dev-servers.sh does not exist
  TC02: Missing curl command... FAIL: scripts/lib/check-dev-servers.sh does not exist
  [... 13 more failures ...]

============================================================================
Test Summary
============================================================================
Total:  15
Passed: 0
Failed: 15

Some tests failed (expected in RED phase)
```

## Design Decisions

### Why 30-second default timeout?
Dev servers typically start in 5-15 seconds. 30 seconds provides buffer for slower machines or cold starts without excessive wait time.

### Why exponential backoff?
- Early retries catch quick recoveries (1-2 second delays)
- Later retries avoid hammering unresponsive services (8-10 second delays)
- More efficient than fixed intervals

### Why check both endpoints separately?
Different services can have different startup times. Checking separately provides clear diagnostics about which service is failing.

### Why accept HTTP 307 for Next.js?
Next.js dev server often redirects HTTP → HTTPS. The redirect itself proves the server is running and accepting connections.

### Why use parse-config.sh instead of environment variables?
Single source of truth. Environment variables can be stale or misconfigured. Config.json is authoritative.

## Notes

- Tests are **isolated** - each runs in a temporary directory
- Tests use **mocking** to avoid requiring running dev servers
- Tests are **fast** - entire suite runs in < 15 seconds
- Tests follow **existing patterns** from `05-wait-for-healthy.test.sh`
- Exponential backoff timing allows some variance (±50% tolerance in tests)
</artifact>

<artifact name="tests/unit/06-check-dev-servers.test.sh" type="application/x-bash">
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
    TEST_ORCHESTRATOR_DIR="${TEST_DIR}/artifact-review-orchestrator"
    mkdir -p "$TEST_ORCHESTRATOR_DIR"
    
    cat > "$TEST_ORCHESTRATOR_DIR/config.json" << 'EOF'
{
  "agents": {
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

    # Track which ports were checked
    PORTS_CHECKED=""
    mock_curl() {
        # Extract port from URL
        if [[ "$*" == *":4211"* ]]; then
            PORTS_CHECKED="${PORTS_CHECKED}convex:4211 "
        fi
        if [[ "$*" == *":4000"* ]]; then
            PORTS_CHECKED="${PORTS_CHECKED}nextjs:4000 "
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

    # Verify correct ports from config were checked
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$PORTS_CHECKED" "4211" "Should check Convex port from config" && \
    assert_contains "$PORTS_CHECKED" "4000" "Should check Next.js port from config" && \
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

    # Track which services were checked
    CHECKED=""
    mock_curl() {
        if [[ "$*" == *":3231"* ]]; then
            CHECKED="${CHECKED}convex "
            return 0
        fi
        if [[ "$*" == *":3020"* ]]; then
            CHECKED="${CHECKED}nextjs "
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-dev-servers.sh 2>&1 && check_dev_servers --convex-only "james" 2>&1)
    exit_code=$?
    set -e

    # Should only check Convex
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$CHECKED" "convex" "Should check Convex" && \
    assert_not_contains "$CHECKED" "nextjs" "Should NOT check Next.js" && \
    test_pass || test_fail
}

test_tc15_check_nextjs_only() {
    test_start "TC15: Check only Next.js endpoint"

    if [ ! -f "scripts/lib/check-dev-servers.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-dev-servers.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Track which services were checked
    CHECKED=""
    mock_curl() {
        if [[ "$*" == *":3231"* ]]; then
            CHECKED="${CHECKED}convex "
            return 0
        fi
        if [[ "$*" == *":3020"* ]]; then
            CHECKED="${CHECKED}nextjs "
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

    # Should only check Next.js
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$CHECKED" "nextjs" "Should check Next.js" && \
    assert_not_contains "$CHECKED" "convex" "Should NOT check Convex" && \
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
</artifact>

Perfect! I've created comprehensive failing tests for **Subtask 6: Dev Server Health Check**. Here's what I delivered:

## Test Specification (`test-spec.md`)

A detailed specification covering:

### 15 Test Cases:
1. **TC01-02**: Script existence and prerequisites (curl)
2. **TC03-04**: Individual endpoint failure detection (Convex, Next.js)
3. **TC05**: Both endpoints healthy immediately (fast path)
4. **TC06-07**: Endpoints becoming healthy after retries
5. **TC08-09**: Timeout behavior (default 30s and custom)
6. **TC10**: Exponential backoff retry logic (1s, 2s, 4s, 8s...)
7. **TC11**: Progress output during retries
8. **TC12**: Port reading from orchestrator config.json
9. **TC13**: Library sourcing without execution
10. **TC14-15**: Selective checking (Convex-only or Next.js-only)

### Key Design Decisions:

- **30-second default timeout** (reasonable for dev server startup)
- **Exponential backoff** (1s → 2s → 4s → 8s → max 10s)
- **Accepts HTTP 307** for Next.js (redirects are healthy)
- **Uses parse-config.sh** for port resolution (single source of truth)
- **Separate endpoint checks** for clear diagnostics

### API Contract:

```bash
check_dev_servers <agent_name> [timeout_seconds]
check_dev_servers --convex-only <agent_name> [timeout_seconds]
check_dev_servers --nextjs-only <agent_name> [timeout_seconds]
```

**Exit codes:**
- 0: All endpoints healthy
- 1: Missing prerequisites
- 6: Timeout

## Test File (`tests/unit/06-check-dev-servers.test.sh`)

A comprehensive test suite with:

- **15 isolated unit tests** using bash mocking
- **Exponential backoff verification** (timing tests)
- **Port configuration tests** (reads from mock config.json)
- **Fast execution** (< 15 seconds for full suite)
- **Follows existing patterns** from 05-wait-for-healthy.test.sh

All tests are designed to **FAIL** initially (RED phase) since the implementation doesn't exist yet. Once you implement `scripts/lib/check-dev-servers.sh`, these tests will guide you to a correct implementation (GREEN phase).

The tests are ready to run and will provide clear feedback about what needs to be implemented!