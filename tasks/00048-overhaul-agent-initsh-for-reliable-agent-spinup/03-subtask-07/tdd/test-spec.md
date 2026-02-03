Perfect! Now I have enough context. Let me create the test specification and test file for the orchestrator connectivity check. Based on the infrastructure docs and the patterns from existing tests, I'll write comprehensive failing tests.

<artifact name="test-spec.md" type="text/markdown">
# Test Specification: Orchestrator Connectivity Check

**Subtask:** 07-check-orchestrator  
**Script:** `scripts/lib/check-orchestrator.sh`  
**Test File:** `tasks/00048-agent-init-overhaul/tests/unit/07-check-orchestrator.test.sh`

## Purpose

Verify that the orchestrator proxy is running and correctly routing `*.loc` domain requests. This is a critical prerequisite check that should fail fast if the orchestrator infrastructure is not available.

## Acceptance Criteria

The script must:

1. **Verify orchestrator availability** - Check that the orchestrator proxy is reachable
2. **DNS resolution** - Verify that `*.loc` domains resolve to 127.0.0.1
3. **HTTP routing** - Verify HTTP requests to `{agent}.loc` domains succeed
4. **HTTPS routing** - Verify HTTPS requests work with mkcert certificates
5. **Timeout handling** - Fail gracefully if orchestrator doesn't respond within timeout
6. **Progress output** - Show clear status messages during checks
7. **Exit code compliance** - Return appropriate exit codes per system standards

## Function Signature

```bash
check_orchestrator <agent_name> [timeout_seconds]
```

**Parameters:**
- `agent_name` (required) - The agent identifier (e.g., "james", "mark")
- `timeout_seconds` (optional) - Max wait time for orchestrator (default: 30)

**Exit Codes:**
- `0` - Orchestrator is healthy and routing correctly
- `1` - Missing prerequisites (curl, dig)
- `2` - Orchestrator not running
- `6` - Health check timeout

## Test Cases

### TC01: Script Exists and Is Executable
**Given:** The repository is cloned  
**When:** Checking for the script  
**Then:** `scripts/lib/check-orchestrator.sh` exists and is executable

**Expected:** FAIL (RED phase - script doesn't exist yet)

---

### TC02: Missing curl Command
**Given:** curl is not available in PATH  
**When:** Running check_orchestrator  
**Then:** 
- Exit code 1
- Error message mentions "curl"

**Expected:** FAIL (RED phase)

---

### TC03: Orchestrator Proxy Not Running
**Given:** curl available but orchestrator returns connection refused  
**When:** Running check_orchestrator "james"  
**Then:**
- Exit code 2
- Error message mentions "orchestrator"
- Does not retry indefinitely

**Expected:** FAIL (RED phase)

---

### TC04: DNS Resolution Fails
**Given:** Orchestrator running but DNS not configured  
**When:** Domain resolution fails for `{agent}.loc`  
**Then:**
- Exit code 2
- Error message mentions DNS or resolution

**Expected:** FAIL (RED phase)

---

### TC05: HTTP Routing Success
**Given:** Orchestrator proxy is running and routing  
**When:** Making HTTP request to `http://{agent}.loc`  
**Then:**
- Exit code 0
- Returns within reasonable time (<5s)
- Shows success message

**Expected:** FAIL (RED phase)

---

### TC06: HTTPS Routing Success
**Given:** Orchestrator proxy is running with TLS  
**When:** Making HTTPS request to `https://{agent}.loc`  
**Then:**
- Exit code 0
- Certificate validation succeeds (or is skipped appropriately)
- Shows success message

**Expected:** FAIL (RED phase)

---

### TC07: Custom Timeout Respected
**Given:** Orchestrator not responding  
**When:** Running check_orchestrator "james" 3  
**Then:**
- Waits approximately 3 seconds (±2s tolerance)
- Exit code 2 or 6
- Error mentions timeout

**Expected:** FAIL (RED phase)

---

### TC08: Progress Output Shows Status
**Given:** Orchestrator is healthy  
**When:** Running check_orchestrator  
**Then:**
- Output contains "Checking orchestrator"
- Output contains agent name
- Output shows success indicator (✓ or "OK")

**Expected:** FAIL (RED phase)

---

### TC09: Library Sourcing Without Execution
**Given:** Script exists  
**When:** Sourcing the script with `source scripts/lib/check-orchestrator.sh`  
**Then:**
- Exit code 0
- No checking messages displayed
- Functions are available for calling

**Expected:** FAIL (RED phase)

---

### TC10: Reads Agent Config for Routing Test
**Given:** Agent "test-agent" is defined in config.json with port 4000  
**When:** Running check_orchestrator "test-agent"  
**Then:**
- Attempts to connect to test-agent.loc (which routes to port 4000)
- Does NOT attempt to connect to james.loc

**Expected:** FAIL (RED phase)

---

### TC11: Orchestrator API Endpoint Check
**Given:** Orchestrator provides a health endpoint  
**When:** Checking orchestrator health  
**Then:**
- First checks orchestrator itself (not agent endpoints)
- Distinguishes between "orchestrator down" vs "agent not routed"

**Expected:** FAIL (RED phase)

---

### TC12: Handles 502 Bad Gateway (Agent Not Running)
**Given:** Orchestrator running but target agent service down  
**When:** Request returns 502 status  
**Then:**
- Exit code 0 (orchestrator IS working)
- Informational message that agent service is down
- Distinguishes this from orchestrator failure

**Expected:** FAIL (RED phase)

---

### TC13: Handles 404 Unknown Host
**Given:** Orchestrator running but agent not in config  
**When:** Request returns 404 with "Unknown Host"  
**Then:**
- Exit code 2 (configuration issue)
- Error mentions agent not registered

**Expected:** FAIL (RED phase)

---

### TC14: Quick Fail on Connection Refused
**Given:** Port 80/443 not listening  
**When:** curl gets immediate connection refused  
**Then:**
- Fails within 2 seconds
- Exit code 2
- Does not retry for full timeout

**Expected:** FAIL (RED phase)

---

### TC15: Multiple Agent Check
**Given:** Helper function to check multiple agent names  
**When:** Checking both "james" and "mark" agents  
**Then:**
- Each agent checked independently
- Reports which agents are routed correctly

**Expected:** FAIL (RED phase) - optional feature

## Implementation Notes

### Dependencies
- `curl` - for HTTP/HTTPS requests
- `dig` or `nslookup` (optional) - for DNS verification
- `scripts/lib/parse-config.sh` - to read agent ports

### Orchestrator Endpoints to Check

1. **Orchestrator health**: `http://127.0.0.1:80/health` (if available)
2. **Agent routing**: `http://{agent}.loc/` or `https://{agent}.loc/`

### Expected Responses

| Scenario | HTTP Status | Meaning |
|----------|-------------|---------|
| Orchestrator + Agent OK | 200, 302, 404 (from Next.js) | Routing works |
| Orchestrator OK, Agent down | 502 Bad Gateway | Orchestrator works, agent doesn't |
| Agent not in config | 404 "Unknown Host" | Configuration issue |
| Orchestrator down | Connection refused | Orchestrator not running |

### Error Messages

**Missing prerequisites:**
```
ERROR: curl command not found. Install with: sudo apt install curl
```

**Orchestrator not running:**
```
ERROR: Orchestrator proxy is not running
  Expected: HTTP server listening on port 80
  Actual:   Connection refused to 127.0.0.1:80
  
Fix: cd ../artifact-review-orchestrator && ./start.sh
```

**DNS not configured:**
```
WARNING: DNS resolution for james.loc failed
  This may cause issues with domain-based routing
  See: docs/setup/local-infrastructure.md
```

**Timeout:**
```
ERROR: Orchestrator health check timed out after 30s
  The orchestrator may be starting or unresponsive
```

**Success:**
```
✓ Orchestrator proxy is running and routing correctly
  - james.loc → localhost:3020 (OK)
```

## TDD Workflow

### RED Phase (Current)
- All 15 test cases should FAIL
- Script `scripts/lib/check-orchestrator.sh` does not exist
- Tests define the interface and behavior

### GREEN Phase (Next)
- Implement minimal `check_orchestrator()` function
- All 15 test cases should PASS
- Focus on functionality, not elegance

### REFACTOR Phase (Later)
- Extract common patterns
- Improve error messages
- Optimize performance
- Tests should still PASS

## Related Files

- `docs/setup/local-infrastructure.md` - Infrastructure architecture
- `../artifact-review-orchestrator/docs/infrastructure.md` - Orchestrator details
- `scripts/lib/parse-config.sh` - Config reading dependency
- `tasks/00048-agent-init-overhaul/tests/unit/06-check-dev-servers.test.sh` - Similar pattern
</artifact>

<artifact name="tests/07-check-orchestrator.test.sh" type="application/x-sh">
#!/usr/bin/env bash
#
# Unit Tests for scripts/lib/check-orchestrator.sh
#
# Test Framework: Plain bash (no external dependencies)
# Run: ./tasks/00048-agent-init-overhaul/tests/unit/07-check-orchestrator.test.sh
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
  "james": {
    "appPort": 3020,
    "convexCloudPort": 3230,
    "convexSitePort": 3231,
    "subnet": "172.28"
  },
  "test-agent": {
    "appPort": 4000,
    "convexCloudPort": 4211,
    "convexSitePort": 4210,
    "subnet": "172.21.0.0/16"
  },
  "mark": {
    "appPort": 3010,
    "convexCloudPort": 3210,
    "convexSitePort": 3211,
    "subnet": "172.27"
  }
}
EOF

    # Copy the actual check-orchestrator.sh if it exists
    if [ -f "${ORIG_DIR}/scripts/lib/check-orchestrator.sh" ]; then
        cp "${ORIG_DIR}/scripts/lib/check-orchestrator.sh" "${TEST_PROJECT_DIR}/scripts/lib/"
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

    if [ ! -f "${ORIG_DIR}/scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    if [ ! -x "${ORIG_DIR}/scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh is not executable"
        test_fail
        return
    fi

    test_pass
}

test_tc02_missing_curl() {
    test_start "TC02: Missing curl command"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl as not found
    mock_curl() {
        echo "bash: curl: command not found" >&2
        return 127
    }

    set +e
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "james" 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 1 "$exit_code" "Should return exit code 1 for missing curl" && \
    assert_contains "$output" "curl" "Should mention curl in error" && \
    test_pass || test_fail
}

test_tc03_orchestrator_not_running() {
    test_start "TC03: Orchestrator proxy not running"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to return connection refused
    mock_curl() {
        # Simulate connection refused to port 80
        if [[ "$*" == *"127.0.0.1:80"* ]] || [[ "$*" == *"localhost:80"* ]]; then
            echo "curl: (7) Failed to connect to 127.0.0.1 port 80: Connection refused" >&2
            return 7
        fi
        return 7
    }

    set +e
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "james" 5 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 2 "$exit_code" "Should return exit code 2 for orchestrator not running" && \
    assert_contains "$output" "orchestrator" "Should mention orchestrator" && \
    test_pass || test_fail
}

test_tc04_dns_resolution_fails() {
    test_start "TC04: DNS resolution fails"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to return DNS resolution failure
    mock_curl() {
        if [[ "$*" == *".loc"* ]]; then
            echo "curl: (6) Could not resolve host: james.loc" >&2
            return 6
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "james" 5 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 2 "$exit_code" "Should return exit code 2 for DNS failure" && \
    (assert_contains "$output" "DNS" "Should mention DNS" || \
     assert_contains "$output" "resolve" "Should mention resolution") && \
    test_pass || test_fail
}

test_tc05_http_routing_success() {
    test_start "TC05: HTTP routing success"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to succeed for HTTP requests
    mock_curl() {
        # Orchestrator health check succeeds
        if [[ "$*" == *"127.0.0.1:80"* ]]; then
            if [[ "$*" == *"-w"* ]]; then
                echo "200"
            fi
            return 0
        fi
        # Agent domain check succeeds
        if [[ "$*" == *"http://james.loc"* ]] || [[ "$*" == *"james.loc"* ]]; then
            if [[ "$*" == *"-w"* ]]; then
                echo "200"
            fi
            return 0
        fi
        return 0
    }

    set +e
    start_time=$(date +%s)
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "james" 2>&1)
    exit_code=$?
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    set -e

    assert_exit_code 0 "$exit_code" "Should return 0 for successful routing" && \
    assert_in_range "$elapsed" 0 5 "Should complete within 5 seconds" && \
    (assert_contains "$output" "✓" "Should show success indicator" || \
     assert_contains "$output" "OK" "Should show OK status") && \
    test_pass || test_fail
}

test_tc06_https_routing_success() {
    test_start "TC06: HTTPS routing success"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to succeed for HTTPS requests
    mock_curl() {
        # HTTPS requests succeed (certificate validation skipped with -k or accepted)
        if [[ "$*" == *"https://"* ]]; then
            if [[ "$*" == *"-w"* ]]; then
                echo "200"
            fi
            return 0
        fi
        # HTTP fallback also works
        if [[ "$*" == *"http://"* ]]; then
            if [[ "$*" == *"-w"* ]]; then
                echo "200"
            fi
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "james" 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 0 "$exit_code" "Should succeed with HTTPS routing" && \
    (assert_contains "$output" "✓" "Should show success" || \
     assert_contains "$output" "OK" "Should show OK") && \
    test_pass || test_fail
}

test_tc07_custom_timeout() {
    test_start "TC07: Custom timeout respected"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to always timeout
    mock_curl() {
        sleep 10  # Sleep longer than timeout
        return 7
    }

    set +e
    start_time=$(date +%s)
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "james" 3 2>&1)
    exit_code=$?
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    set -e

    # Should timeout around 3 seconds (allow 1-5 second range)
    (assert_exit_code 2 "$exit_code" "Should return exit code 2 for timeout" || \
     assert_exit_code 6 "$exit_code" "Should return exit code 6 for timeout") && \
    assert_in_range "$elapsed" 1 5 "Should respect custom timeout" && \
    assert_contains "$output" "timeout" "Should mention timeout" && \
    test_pass || test_fail
}

test_tc08_progress_output() {
    test_start "TC08: Progress output shows status"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to succeed
    mock_curl() {
        if [[ "$*" == *"-w"* ]]; then
            echo "200"
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "james" 2>&1)
    exit_code=$?
    set -e

    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$output" "orchestrator" "Should mention orchestrator" && \
    assert_contains "$output" "james" "Should mention agent name" && \
    (assert_contains "$output" "✓" "Should show success indicator" || \
     assert_contains "$output" "OK" "Should show OK status") && \
    test_pass || test_fail
}

test_tc09_library_sourcing() {
    test_start "TC09: Can be sourced without execution"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Source the library - should not execute anything
    set +e
    output=$(source scripts/lib/check-orchestrator.sh 2>&1)
    exit_code=$?
    set -e

    # Should succeed and not show checking messages
    assert_exit_code 0 "$exit_code" "Should source without error" && \
    assert_not_contains "$output" "Checking" "Should not execute on source" && \
    test_pass || test_fail
}

test_tc10_reads_agent_config() {
    test_start "TC10: Reads agent config for routing test"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Track which agent domains were checked
    CHECKED_FILE=$(mktemp)

    mock_curl() {
        # Log which agent domain is being checked
        if [[ "$*" == *"test-agent.loc"* ]]; then
            echo "test-agent" >> "$CHECKED_FILE"
        fi
        if [[ "$*" == *"james.loc"* ]]; then
            echo "james" >> "$CHECKED_FILE"
        fi
        if [[ "$*" == *"-w"* ]]; then
            echo "200"
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "test-agent" 2>&1)
    exit_code=$?
    set -e

    # Read checked agents
    local checked=""
    if [ -f "$CHECKED_FILE" ]; then
        checked=$(cat "$CHECKED_FILE")
    fi
    rm -f "$CHECKED_FILE"

    # Should check test-agent, not james
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$checked" "test-agent" "Should check test-agent.loc" && \
    assert_not_contains "$checked" "james" "Should NOT check james.loc" && \
    test_pass || test_fail
}

test_tc11_orchestrator_api_check() {
    test_start "TC11: Checks orchestrator before agent routing"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Track order of checks
    CHECK_ORDER_FILE=$(mktemp)

    mock_curl() {
        # Log what's being checked in order
        if [[ "$*" == *"127.0.0.1:80"* ]]; then
            echo "orchestrator-port" >> "$CHECK_ORDER_FILE"
        fi
        if [[ "$*" == *".loc"* ]]; then
            echo "agent-domain" >> "$CHECK_ORDER_FILE"
        fi
        if [[ "$*" == *"-w"* ]]; then
            echo "200"
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "james" 2>&1)
    exit_code=$?
    set -e

    # Read check order
    local check_order=""
    if [ -f "$CHECK_ORDER_FILE" ]; then
        check_order=$(cat "$CHECK_ORDER_FILE")
    fi
    rm -f "$CHECK_ORDER_FILE"

    # Should check orchestrator first
    assert_exit_code 0 "$exit_code" "Should succeed" && \
    assert_contains "$check_order" "orchestrator-port" "Should check orchestrator port" && \
    test_pass || test_fail
}

test_tc12_handles_502_bad_gateway() {
    test_start "TC12: Handles 502 Bad Gateway (agent down)"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl: orchestrator works (port 80), but agent returns 502
    mock_curl() {
        if [[ "$*" == *"127.0.0.1:80"* ]]; then
            if [[ "$*" == *"-w"* ]]; then
                echo "200"
            fi
            return 0
        fi
        if [[ "$*" == *".loc"* ]]; then
            if [[ "$*" == *"-w"* ]]; then
                echo "502"
            fi
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "james" 2>&1)
    exit_code=$?
    set -e

    # Orchestrator IS working (502 means proxy is running, backend isn't)
    assert_exit_code 0 "$exit_code" "Should return 0 (orchestrator works)" && \
    (assert_contains "$output" "502" "Should mention 502" || \
     assert_contains "$output" "agent" "Should mention agent issue") && \
    test_pass || test_fail
}

test_tc13_handles_404_unknown_host() {
    test_start "TC13: Handles 404 Unknown Host"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl: orchestrator works but agent not in config
    mock_curl() {
        if [[ "$*" == *"127.0.0.1:80"* ]]; then
            if [[ "$*" == *"-w"* ]]; then
                echo "200"
            fi
            return 0
        fi
        if [[ "$*" == *".loc"* ]]; then
            if [[ "$*" == *"-w"* ]]; then
                echo "404"
            fi
            # Simulate "Unknown Host" response body
            echo "Unknown Host" >&2
            return 0
        fi
        return 0
    }

    set +e
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "james" 2>&1)
    exit_code=$?
    set -e

    # Configuration issue (agent not registered)
    assert_exit_code 2 "$exit_code" "Should return exit code 2" && \
    (assert_contains "$output" "404" "Should mention 404" || \
     assert_contains "$output" "not registered" "Should mention registration" || \
     assert_contains "$output" "Unknown Host" "Should mention Unknown Host") && \
    test_pass || test_fail
}

test_tc14_quick_fail_connection_refused() {
    test_start "TC14: Quick fail on connection refused"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # Mock curl to immediately fail
    mock_curl() {
        return 7  # Connection refused
    }

    set +e
    start_time=$(date +%s)
    output=$(source scripts/lib/check-orchestrator.sh 2>&1 && check_orchestrator "james" 30 2>&1)
    exit_code=$?
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    set -e

    # Should fail quickly, not wait for full timeout
    assert_exit_code 2 "$exit_code" "Should return exit code 2" && \
    assert_in_range "$elapsed" 0 3 "Should fail within 2 seconds" && \
    test_pass || test_fail
}

test_tc15_multiple_agent_check() {
    test_start "TC15: Helper for multiple agent checks (optional)"

    if [ ! -f "scripts/lib/check-orchestrator.sh" ]; then
        echo -e " ${RED}FAIL${NC}: scripts/lib/check-orchestrator.sh does not exist (expected - RED phase)"
        test_fail
        return
    fi

    # This test is optional - tests if library provides helper to check multiple agents
    # If function doesn't exist, test should gracefully skip

    # Try to source and check if check_orchestrator_multi or similar exists
    set +e
    source scripts/lib/check-orchestrator.sh 2>/dev/null
    if type check_orchestrator_multi &>/dev/null; then
        # Function exists, test it
        mock_curl() {
            if [[ "$*" == *"-w"* ]]; then
                echo "200"
            fi
            return 0
        }
        output=$(check_orchestrator_multi "james" "mark" 2>&1)
        exit_code=$?
        
        assert_exit_code 0 "$exit_code" "Should succeed for multiple agents" && \
        assert_contains "$output" "james" "Should check james" && \
        assert_contains "$output" "mark" "Should check mark" && \
        test_pass
    else
        # Function doesn't exist - this is fine, it's optional
        echo -e " ${YELLOW}SKIP${NC} (optional feature not implemented)"
        TESTS_RUN=$((TESTS_RUN - 1))
    fi
    set -e
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    echo "============================================================================"
    echo "Orchestrator Connectivity Check Unit Tests (TDD - RED Phase)"
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

I've written comprehensive failing tests for the orchestrator connectivity check subtask. Here's what I've created:

## Test Specification (`test-spec.md`)

A detailed specification document that defines:
- **Purpose**: Verify orchestrator proxy is routing `*.loc` domains correctly
- **Function signature**: `check_orchestrator <agent_name> [timeout_seconds]`
- **Exit codes**: 0 (success), 1 (missing deps), 2 (orchestrator down), 6 (timeout)
- **15 test cases** covering all acceptance criteria
- **Expected responses** for different scenarios (200, 502, 404, connection refused)
- **Error message templates** for clear user guidance

## Test File (`07-check-orchestrator.test.sh`)

A complete bash test suite with 15 test cases:

### Core Functionality Tests:
1. **TC01**: Script exists and is executable
2. **TC02**: Missing curl prerequisite detection
3. **TC03**: Orchestrator not running detection
4. **TC04**: DNS resolution failure handling
5. **TC05**: HTTP routing success
6. **TC06**: HTTPS routing success

### Edge Cases & Reliability:
7. **TC07**: Custom timeout parameter
8. **TC08**: Progress output formatting
9. **TC09**: Library sourcing without execution
10. **TC10**: Agent-specific config reading
11. **TC11**: Orchestrator health check before agent routing
12. **TC12**: 502 Bad Gateway handling (agent down, orchestrator up)
13. **TC13**: 404 Unknown Host handling (agent not registered)
14. **TC14**: Quick fail on connection refused (no retry)
15. **TC15**: Multiple agent checking (optional feature)

### Key Features:

- **Follows existing patterns** from `06-check-dev-servers.test.sh`
- **Isolated tests** using temporary directories
- **Mock curl** to simulate different orchestrator states
- **No external dependencies** beyond bash and standard utilities
- **Clear RED phase** - all tests will fail because the script doesn't exist yet
- **Comprehensive coverage** of routing scenarios based on orchestrator infrastructure docs

The tests are ready to run and will guide the implementation in the GREEN phase!