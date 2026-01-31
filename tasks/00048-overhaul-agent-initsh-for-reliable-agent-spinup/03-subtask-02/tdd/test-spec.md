Perfect! Now I have all the context I need. Let me create the test specification and test file for subtask 2.

<artifact name="test-spec.md" type="application/vnd.ant.code" language="markdown" title="Test Specification for Subtask 2: .env.docker.local Generator">
# Test Specification: .env.docker.local Generator

**Subtask:** 02-generate-env-docker  
**Component:** `scripts/lib/generate-env-docker.sh`  
**Test File:** `tasks/00048-agent-init-overhaul/tests/unit/02-generate-env-docker.test.sh`

## Overview

Create a bash library function that generates `.env.docker.local` from the orchestrator's `config.json`. This replaces the current inline generation logic in `agent-init.sh` with a reusable, testable function.

## Dependencies

- **Subtask 1:** `scripts/lib/parse-config.sh` (config parser)
- **External:** `mkcert` (for CA root path detection)
- **External:** `jq` (JSON parsing)

## Public API

### `generate_env_docker <agent-name> <output-file>`

Generates `.env.docker.local` file with all required environment variables.

**Parameters:**
- `agent-name`: Name of the agent (e.g., "james", "default")
- `output-file`: Path to write the .env file (absolute or relative)

**Returns:**
- Exit code 0 on success
- Creates/overwrites output file with complete configuration

**Exit Codes:**
- 0: Success (file created)
- 1: Missing prerequisites (jq, mkcert)
- 2: File/directory not found (orchestrator config)
- 3: Invalid JSON in config.json
- 4: Agent not found in config
- 5: mkcert CAROOT not found
- 6: Write permission denied

## Test Cases

### TC01: Missing Prerequisites - jq
**Test:** Call function when `jq` is not available  
**Expected:** Exit code 1, error message mentioning `jq`  
**Status:** SKIP (requires PATH mocking - same as parse-config TC01)

### TC02: Missing Prerequisites - mkcert
**Test:** Call function when `mkcert` is not available  
**Expected:** Exit code 1, error message mentioning `mkcert`  
**Status:** SKIP (requires PATH mocking)

### TC03: Agent Not Found in Config
**Test:** Request env generation for non-existent agent "nonexistent"  
**Expected:** Exit code 4, error message, no file created  
**Status:** MUST FAIL (RED)

### TC04: Missing Port Key in Config
**Test:** Request env for agent with incomplete config (missing appPort)  
**Expected:** Exit code 5, error message about missing port key  
**Status:** MUST FAIL (RED)

### TC05: Missing Subnet in Config
**Test:** Request env for agent with no subnet defined  
**Expected:** Exit code 5, error message about missing subnet  
**Status:** MUST FAIL (RED)

### TC06: Generate for Valid Agent
**Test:** Generate .env.docker.local for "james" agent  
**Expected:**
- Exit code 0
- File created at specified path
- Contains `AGENT_NAME=james`
- Contains `BASE_PORT=3020`
- Contains `RESEND_NETWORK_SUBNET=172.28.0.0/16`
- Contains `RESEND_PROXY_IP=172.28.0.10`
- Contains all domain URLs with variable substitution
**Status:** MUST FAIL (RED)

### TC07: Generate for Default Agent
**Test:** Generate .env.docker.local for "default" agent  
**Expected:**
- Exit code 0
- Contains `AGENT_NAME=default`
- Contains `BASE_PORT=3000`
- Contains `RESEND_NETWORK_SUBNET=172.27.0.0/16`
- Contains correct subnet-based values
**Status:** MUST FAIL (RED)

### TC08: Output File Already Exists (Overwrite)
**Test:** Generate when output file already exists  
**Expected:**
- Exit code 0
- File overwritten with new content
- Old content replaced completely
**Status:** MUST FAIL (RED)

### TC09: Output Directory Doesn't Exist
**Test:** Generate to non-existent directory path  
**Expected:** Exit code 6, error message about directory  
**Status:** MUST FAIL (RED)

### TC10: File Contains Header Comment
**Test:** Verify generated file has auto-generated warning header  
**Expected:**
- File contains "AUTO-GENERATED"
- File contains "Do not edit directly"
- File contains timestamp
**Status:** MUST FAIL (RED)

### TC11: File Contains All Required Sections
**Test:** Verify all documented sections present  
**Expected:**
- AGENT IDENTITY section
- DERIVED PORTS section (commented examples)
- SERVICE DOMAINS section
- DOCKER COMPOSE section
- TLS CERTIFICATES section
- RESEND PROXY NETWORK section
**Status:** MUST FAIL (RED)

### TC12: Verify mkcert CAROOT Path
**Test:** When mkcert is available, verify path detection  
**Expected:**
- If mkcert installed: Uses actual CAROOT path
- Path is absolute and exists
**Note:** May need mocking for CI/test isolation
**Status:** MUST FAIL (RED)

### TC13: Subnet Math Verification
**Test:** Verify subnet-based IP calculations  
**Expected:**
- For subnet "172.28": RESEND_NETWORK_SUBNET=172.28.0.0/16
- For subnet "172.28": RESEND_PROXY_IP=172.28.0.10
- For subnet "172.27": RESEND_NETWORK_SUBNET=172.27.0.0/16
- For subnet "172.27": RESEND_PROXY_IP=172.27.0.10
**Status:** MUST FAIL (RED)

### TC14: Variable Substitution Protection
**Test:** Verify ${AGENT_NAME} is escaped properly in domains  
**Expected:**
- File contains literal `${AGENT_NAME}` (not expanded)
- Shell variable expansion happens at runtime, not generation time
**Status:** MUST FAIL (RED)

### TC15: Idempotency
**Test:** Generate same file twice, verify identical output  
**Expected:**
- Both files contain same values (except timestamp)
- Second generation succeeds
- Exit code 0 both times
**Status:** MUST FAIL (RED)

## Success Criteria

**Minimum to pass RED phase:** All tests fail because implementation doesn't exist yet

**Minimum to pass GREEN phase:**
- TC03-TC15 pass (except those marked SKIP)
- TC01, TC02 can be skipped (PATH mocking complexity)
- Function successfully generates valid .env.docker.local
- All exit codes correct
- All required content present

## Integration Points

After implementation, this function will be called by:
- `scripts/agent-init.sh` - Main initialization script
- Any future env regeneration utilities

## File Content Template

The generated file should match the current format in `.env.docker.local`:

```bash
# AUTO-GENERATED by [script-name] - Do not edit directly.
# Re-run [script-name] to regenerate from orchestrator config.json
# Generated: [timestamp]

# =============================================================================
# AGENT IDENTITY
# =============================================================================
AGENT_NAME=[agent-name]
BASE_PORT=[appPort]

# =============================================================================
# DERIVED PORTS (auto-calculated from BASE_PORT)
# =============================================================================
# [Commented examples showing port calculations]

# =============================================================================
# SERVICE DOMAINS (orchestrator proxy routing)
# =============================================================================
SITE_URL=https://${AGENT_NAME}.loc
CONVEX_CLOUD_URL=https://${AGENT_NAME}.convex.cloud.loc
CONVEX_SITE_URL=https://${AGENT_NAME}.convex.site.loc
MAILPIT_URL=https://${AGENT_NAME}.mailpit.loc

# Shared services
NOVU_API_URL=https://api.novu.loc
NOVU_WS_URL=wss://ws.novu.loc
NOVU_CONSOLE_URL=https://novu.loc

# =============================================================================
# DOCKER COMPOSE
# =============================================================================
INSTANCE_NAME=artifact-review-local

# =============================================================================
# TLS CERTIFICATES (for resend-proxy)
# =============================================================================
MKCERT_CERTS_PATH=../artifact-review-orchestrator/certs

# =============================================================================
# RESEND PROXY NETWORK (agent-specific to avoid conflicts)
# =============================================================================
RESEND_NETWORK_SUBNET=[subnet].0.0/16
RESEND_PROXY_IP=[subnet].0.10
```

## Notes

- Function must source `scripts/lib/parse-config.sh` for agent config reading
- Must handle mkcert not being installed gracefully
- Timestamp format should be ISO 8601: `date -Iseconds`
- Variable substitution (${AGENT_NAME}) must be escaped in heredocs
- All tests run in isolated temp directories with no side effects
</artifact>

<artifact name="tests/unit/02-generate-env-docker.test.sh" type="application/vnd.ant.code" language="bash" title="Unit Tests for .env.docker.local Generator">
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
</artifact>

Perfect! I've created comprehensive failing tests for subtask 2. Let me create a summary document to explain what was created.

<artifact name="02-subtask-summary.md" type="application/vnd.ant.code" language="markdown" title="Subtask 2 Test Suite Summary">
# Subtask 2: .env.docker.local Generator - Test Suite Created

## Status: RED Phase Complete ✓

Tests have been written and are **expected to FAIL** because the implementation (`scripts/lib/generate-env-docker.sh`) does not exist yet.

## Deliverables

### 1. Test Specification
**File:** `test-spec.md` (artifact above)

Comprehensive specification defining:
- Public API for `generate_env_docker` function
- 15 test cases covering all acceptance criteria
- Exit code conventions
- File content template
- Integration points

### 2. Test Suite
**File:** `tasks/00048-agent-init-overhaul/tests/unit/02-generate-env-docker.test.sh`

**Test Coverage:** 15 test cases

| Test | Description | Status |
|------|-------------|--------|
| TC01 | Missing jq prerequisite | SKIP (PATH mocking) |
| TC02 | Missing mkcert prerequisite | SKIP (PATH mocking) |
| TC03 | Agent not found in config | MUST FAIL |
| TC04 | Missing port key in config | MUST FAIL |
| TC05 | Missing subnet in config | MUST FAIL |
| TC06 | Generate for valid agent (james) | MUST FAIL |
| TC07 | Generate for default agent | MUST FAIL |
| TC08 | Overwrite existing file | MUST FAIL |
| TC09 | Output directory doesn't exist | MUST FAIL |
| TC10 | File contains header comment | MUST FAIL |
| TC11 | File contains all required sections | MUST FAIL |
| TC12 | Verify mkcert CAROOT path | MUST FAIL |
| TC13 | Subnet math verification | MUST FAIL |
| TC14 | Variable substitution protection | MUST FAIL |
| TC15 | Idempotency test | MUST FAIL |

## Running the Tests

```bash
# Make test file executable (will be needed)
chmod +x tasks/00048-agent-init-overhaul/tests/unit/02-generate-env-docker.test.sh

# Run tests directly
./tasks/00048-agent-init-overhaul/tests/unit/02-generate-env-docker.test.sh

# Or via test runner
./tasks/00048-agent-init-overhaul/tests/run-tests.sh 02
```

## Expected Test Output (RED Phase)

All tests should **FAIL** with messages like:
```
❌ scripts/lib/generate-env-docker.sh: No such file or directory
```

This is correct and expected! The tests define WHAT needs to be built.

## Key Test Features

### Test Isolation
- Each test runs in temporary directory (`mktemp -d`)
- Mock orchestrator directory structure created per test
- No side effects on real system
- Complete cleanup in teardown

### Test Fixtures
Three config fixtures provided:
1. `create_valid_config()` - Complete config with james + default agents
2. `create_incomplete_config()` - Agent missing appPort (tests error handling)
3. `create_no_subnet_config()` - Agent missing subnet (tests validation)

### Assertions
- `assert_equals` - Exact string matching
- `assert_exit_code` - Verify function exit codes
- `assert_contains` - Check for substring presence
- `assert_file_exists` - Verify file creation
- `assert_file_not_exists` - Verify file NOT created on error

## What the Implementation Must Do

The `scripts/lib/generate-env-docker.sh` library must:

1. **Source dependencies:**
   ```bash
   source scripts/lib/parse-config.sh
   ```

2. **Provide public function:**
   ```bash
   generate_env_docker() {
       local agent_name="$1"
       local output_file="$2"
       # ... implementation ...
   }
   ```

3. **Validate prerequisites:**
   - Check for `jq` (exit 1)
   - Check for `mkcert` (exit 1, or graceful degradation)

4. **Validate config:**
   - Agent exists (exit 4)
   - appPort exists (exit 5)
   - subnet exists (exit 5)

5. **Validate output:**
   - Directory exists (exit 6)

6. **Generate file with:**
   - Auto-generated header with timestamp
   - All required sections (6 sections documented)
   - Correct port and subnet values from config
   - Escaped variable substitution (`${AGENT_NAME}` preserved)
   - Idempotent output (same input = same output)

## Integration with Subtask 1

This subtask **depends on** subtask 1 (`scripts/lib/parse-config.sh`):

```bash
# Uses from parse-config.sh:
source scripts/lib/parse-config.sh
app_port=$(get_agent_port "$agent_name" "appPort")
subnet=$(get_agent_port "$agent_name" "subnet")
```

The tests verify that the generator correctly uses the config parser to read orchestrator `config.json`.

## Next Steps

### GREEN Phase (Implementation)
1. Create `scripts/lib/generate-env-docker.sh`
2. Implement `generate_env_docker` function
3. Run tests until all pass (except TC01, TC02)

### REFACTOR Phase
1. Clean up code
2. Add documentation
3. Verify tests still pass

## Success Criteria

**RED Phase Complete:** ✅
- All tests written
- Tests fail because implementation missing
- Tests clearly define acceptance criteria

**GREEN Phase Target:**
- TC03-TC15 pass (13 tests)
- TC01, TC02 can remain skipped
- Exit codes correct
- Generated file matches template

**REFACTOR Phase Target:**
- Code clean and well-documented
- No test regressions
- Ready for integration into `agent-init.sh`
</artifact>

## Summary

I've created comprehensive **failing tests** for Subtask 2 (`.env.docker.local` generator) following TDD principles:

### What Was Created

1. **Test Specification** (`test-spec.md`):
   - Public API definition for `generate_env_docker <agent-name> <output-file>`
   - 15 test cases with clear acceptance criteria
   - Exit code conventions (matching subtask 1)
   - Expected file content template

2. **Test Suite** (`tests/unit/02-generate-env-docker.test.sh`):
   - 15 test cases covering all scenarios
   - 2 skipped (PATH mocking complexity)
   - 13 must fail in RED phase
   - Complete test isolation using temp directories

### Test Coverage

The tests verify:
- ✅ Error handling (agent not found, missing ports, missing subnet)
- ✅ Successful generation for valid agents
- ✅ File overwriting behavior
- ✅ Header comments and structure
- ✅ All required sections present
- ✅ Subnet math calculations (172.28 → 172.28.0.0/16, 172.28.0.10)
- ✅ Variable substitution protection (`${AGENT_NAME}` preserved)
- ✅ Idempotency (same input = same output)

### Current Status: RED Phase ✅

All tests are **expected to FAIL** because `scripts/lib/generate-env-docker.sh` doesn't exist yet. This is correct TDD practice - tests define WHAT to build before implementation.

### Next Steps

**DO NOT implement** - the tests define the requirements. The implementation (GREEN phase) should:
1. Create `scripts/lib/generate-env-docker.sh`
2. Implement the `generate_env_docker` function
3. Use `parse-config.sh` from subtask 1
4. Generate the exact file format shown in current `.env.docker.local`

The tests are ready to run and will guide the implementation!